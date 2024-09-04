import {Collection, Db, Document, Filter, MongoClient, ObjectId, Sort, SortDirection, UpdateFilter, WithId} from "mongodb";
import BaseModel, {ModelClass} from "../models/mongodb/BaseModel";
import GlobalContext from "../GlobalContext";
import App from "../app";
import {UserModel} from "../models/mongodb/UserModel";
import {RequestModel} from "../models/mongodb/RequestModel";
import {JobModel} from "../models/mongodb/JobModel";
import LucyAiManager from "./LucyAiManager";
import { PackageModel } from "../models/mongodb/PackageModel";
import StripeManager, { StripeInstance } from "./StripeManager";

export interface FindOptions {
    onlyActive?: boolean;
    sort?: Sort | string
    sortDirection?: SortDirection
}

class DataBaseManager {

    private dbClient: MongoClient | null = null;
    db: Db | null = null;

    async init() {

        const config = App.getConfig();
        const dataBase = config.server.testMode ? config.mongodb[`test-database`] : config.mongodb.database;

        try {
            this.dbClient = await MongoClient.connect(
                `${config.mongodb.protocol}://${config.mongodb.username}:${config.mongodb.password}@${config.mongodb.server}`
            );
            this.db = this.dbClient.db(dataBase);
            console.log(`Połączono z bazą danych: ${dataBase}.`);
        } catch (error) {
            console.error(`Błąd połączenia z bazą danych: ${dataBase}.`, error);
        }
        await this.createCollections();
    }

    async createCollections() {
        const config = App.getConfig();
        for (const collectionName of Object.values(config.mongodb.collections)) {
            const collectionExists = await this.db.listCollections({name: collectionName}).hasNext();
            if (!collectionExists) {
                const collection = await this.db.createCollection(collectionName.toString());
                console.log(`Collection '${collectionName}' created.`);
            } else {
                console.log(`Collection '${collectionName}' already exists.`);
            }
        }
    }

    private summaryDocumentCosts(document: Document) {
        return document.costs.reduce((acc, cost) => {
            acc.completion_tokens += cost.costs.completion_tokens;
            acc.prompt_tokens += cost.costs.prompt_tokens;
            acc.total_tokens += cost.costs.total_tokens;
            acc.milliseconds += cost.costs.milliseconds;
            acc.characters += cost.costs.characters;
            return acc;
        }, {
            completion_tokens: 0,
            prompt_tokens: 0,
            total_tokens: 0,
            milliseconds: 0,
            characters: 0
        });
    }

    private calculateDocuments(documents: Document[]) {
        for (const document of documents) {
            document.billing = 0;
            for (const costsIndex in document.costs) {
                let costs = document.costs[costsIndex];
                if (Array.isArray(costs)) {
                    costs = costs[0];
                    document.costs[costsIndex] = costs;
                }
                const pricingModel = costs.pricingModel;
                document.billing += LucyAiManager.calculateCosts(costs.modelName, pricingModel, costs.costs);
            }
            document.costs = this.summaryDocumentCosts(document);
        }
        return documents;
    }

    async getRequests(match: Filter<Document>, withAnswer = false) {
        const project = {
            _id: "$_id",
            createdAt: 1,
            modelName: 1,
            model: 1,
            state: 1,
            costs: [{
                modelName: "$model.model",
                pricingModel: "$pricingModel",
                costs: "$costs",
            }]
        }
        if (withAnswer) {
            project["answer"] = 1;
        }
        const documents = await this.db.collection(RequestModel.asModelClass().collectionName).aggregate([
            {$match: match},
            {
                $project: project
            }
        ]).toArray();
        return this.calculateDocuments(documents).map(
            (document) => RequestModel.fromDocument(document as WithId<Document>)
        );
    }

    async getJobById(jobId: string, fullData = false) {
        return (await this.getJobs({_id: new ObjectId(jobId)}, fullData))[0];
    }

    async getJobs(match: Filter<Document>, fullData = false) {
        const documents = await this.db.collection(JobModel.asModelClass().collectionName).aggregate(
            [
                {$match: match},
                {
                    $addFields: {
                        _updatedAt: { $ifNull: [ "$updatedAt", "$createdAt" ] }
                    }
                },
                { $sort: { _updatedAt: -1 } },
                { $limit: 300 },
                {
                    $lookup: {
                        from: RequestModel.asModelClass().collectionName,
                        localField: '_id',
                        foreignField: 'jobId',
                        as: 'jobRequests'
                    }
                },
                {
                    $unwind: {
                        path: "$jobRequests",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: {
                            id: "$_id",
                            modelName: "$jobRequests.model.model",
                            pricingModel: "$jobRequests.pricingModel"
                        },
                        createdAt: {$first: "$createdAt"},
                        updatedAt: {$first: "$updatedAt"},
                        active: {$first: "$active"},
                        inactivateDate: {$first: "$inactivateDate"},
                        userId: {$first: "$userId"},
                        modelName: {$first: "$modelName"},
                        prompt: {$first: "$prompt"},
                        data: {
                            $first: fullData ? "$data" : {
                                city: "$data.city",
                                templateId: {$ifNull: ["$data.templateId", ""]},
                                templateName: "$data.templateName",
                                host: "$data.host",
                                pageId: "$data.pageId"
                            }
                        },
                        state: {$first: "$state"},
                        queue: {$first: "$queue"},
                        completion_tokens: {$sum: {$ifNull: ["$jobRequests.costs.completion_tokens", 0]}},
                        prompt_tokens: {$sum: {$ifNull: ["$jobRequests.costs.prompt_tokens", 0]}},
                        total_tokens: {$sum: {$ifNull: ["$jobRequests.costs.total_tokens", 0]}},
                        milliseconds: {$sum: {$ifNull: ["$jobRequests.costs.milliseconds", 0]}},
                        characters: {$sum: {$ifNull: ["$jobRequests.costs.characters", 0]}}
                    }
                },
                {
                    $group: {
                        _id: "$_id.id",
                        createdAt: {$first: "$createdAt"},
                        updatedAt: {$first: "$updatedAt"},
                        active: {$first: "$active"},
                        inactivateDate: {$first: "$inactivateDate"},
                        userId: {$first: "$userId"},
                        modelName: {$first: "$modelName"},
                        prompt: {$first: "$prompt"},
                        data: {$first: "$data"},
                        state: {$first: "$state"},
                        queue: {$first: "$queue"},
                        modelCosts: {
                            $push: {
                                modelName: "$_id.modelName",
                                pricingModel: "$_id.pricingModel",
                                costs: {
                                    completion_tokens: "$completion_tokens",
                                    prompt_tokens: "$prompt_tokens",
                                    total_tokens: "$total_tokens",
                                    milliseconds: "$milliseconds",
                                    characters: "$characters"
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        active: 1,
                        inactivateDate: 1,
                        userId: 1,
                        modelName: 1,
                        prompt: 1,
                        data: 1,
                        state: 1,
                        queue: 1,
                        costs: "$modelCosts"
                    }
                }
            ]
        ).toArray();
        return this.calculateDocuments(documents as WithId<Document>[]).map(
            (document) => JobModel.fromDocument(document as WithId<Document>)
        );
    }

    async getQueueByName(queue: string) {
        return (await this.getQueues({queue: queue}))[0];
    }

    async getQueues(match: Filter<Document>) {
        const documents = await this.db.collection(JobModel.asModelClass().collectionName).aggregate([
            {$match: match},
            {
                $lookup: {
                    from: RequestModel.asModelClass().collectionName,
                    localField: '_id',
                    foreignField: 'jobId',
                    as: 'jobRequests'
                }
            },
            {
                $unwind: {
                    path: "$jobRequests",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: {
                        queue: "$queue",
                        modelName: "$jobRequests.model.model",
                        pricingModel: "$jobRequests.pricingModel"
                    },
                    createdAt: {$first: "$createdAt"},
                    completion_tokens: {$sum: {$ifNull: ["$jobRequests.costs.completion_tokens", 0]}},
                    prompt_tokens: {$sum: {$ifNull: ["$jobRequests.costs.prompt_tokens", 0]}},
                    total_tokens: {$sum: {$ifNull: ["$jobRequests.costs.total_tokens", 0]}},
                    milliseconds: {$sum: {$ifNull: ["$jobRequests.costs.milliseconds", 0]}},
                    characters: {$sum: {$ifNull: ["$jobRequests.costs.characters", 0]}}
                }
            },
            {
                $group: {
                    _id: "$_id.queue",
                    createdAt: {$first: "$createdAt"},
                    modelCosts: {
                        $push: {
                            modelName: "$_id.modelName",
                            pricingModel: "$_id.pricingModel",
                            costs: {
                                completion_tokens: "$completion_tokens",
                                prompt_tokens: "$prompt_tokens",
                                total_tokens: "$total_tokens",
                                milliseconds: "$milliseconds",
                                characters: "$characters"
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    queue: "$_id",
                    createdAt: 1,
                    costs: "$modelCosts"
                }
            }
        ]).toArray();
        return this.calculateDocuments(documents);
    }

    async getUserById(userId: string, onlyActive = true, withPassword = false) {
        return (await this.getUsers({_id: new ObjectId(userId)}, onlyActive))[0];
    }
    async getUsers(match: Filter<Document>, onlyActive = true, withPassword = false) {
        const fullMatch = onlyActive ? {
            $and: [
                match,
                {active: {$eq: true}}
            ]
        } : match;
        const documents = await this.db.collection(UserModel.asModelClass().collectionName).aggregate([
            {$match: fullMatch},
            {
                $lookup: {
                    from: RequestModel.asModelClass().collectionName,
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'userRequests'
                }
            },
            {
                $unwind: {
                    path: "$userRequests",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: {
                        userId: "$_id",
                        modelName: "$userRequests.model.model",
                        pricingModel: "$userRequests.pricingModel"
                    },
                    createdAt: {$first: "$createdAt"},
                    active: {$first: "$active"},
                    inactivateDate: {$first: "$inactivateDate"},
                    email: {$first: "$email"},
                    password: {$first: "$password"},
                    annonymous: {$first: "$annonymous"},
                    role: {$first: "$role"},
                    products: {$first: "$products"},
                    openAiData: {$first: "$openAiData"},
                    enterpriseId: {$first: "$enterpriseId"},
                    packages: {$first: "$packages"},
                    currentPayment: {$first: "$currentPayment"},
                    enterpriseData: {$first: "$enterpriseData"},
                    apps: {$first: "$apps"},
                    completion_tokens: {$sum: {$ifNull: ["$userRequests.costs.completion_tokens", 0]}},
                    prompt_tokens: {$sum: {$ifNull: ["$userRequests.costs.prompt_tokens", 0]}},
                    total_tokens: {$sum: {$ifNull: ["$userRequests.costs.total_tokens", 0]}},
                    milliseconds: {$sum: {$ifNull: ["$jobRequests.costs.milliseconds", 0]}},
                    characters: {$sum: {$ifNull: ["$jobRequests.costs.characters", 0]}}
                }
            },
            {
                $group: {
                    _id: "$_id.userId",
                    createdAt: {$first: "$createdAt"},
                    active: {$first: "$active"},
                    inactivateDate: {$first: "$inactivateDate"},
                    email: {$first: "$email"},
                    password: {$first: "$password"},
                    annonymous: {$first: "$annonymous"},
                    role: {$first: "$role"},
                    products: {$first: "$products"},
                    openAiData: {$first: "$openAiData"},
                    enterpriseId: {$first: "$enterpriseId"},
                    packages: {$first: "$packages"},
                    currentPayment: {$first: "$currentPayment"},
                    enterpriseData: {$first: "$enterpriseData"},
                    apps: {$first: "$apps"},
                    modelCosts: {
                        $push: {
                            modelName: "$_id.modelName",
                            pricingModel: "$_id.pricingModel",
                            costs: {
                                completion_tokens: "$completion_tokens",
                                prompt_tokens: "$prompt_tokens",
                                total_tokens: "$total_tokens",
                                milliseconds: "$milliseconds",
                                characters: "$characters"
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    createdAt: 1,
                    active: 1,
                    inactivateDate: 1,
                    email: 1,
                    password: withPassword ? 1 : null,
                    annonymous: 1,
                    role: 1,
                    products: 1,
                    openAiData: 1,
                    enterpriseId: 1,
                    packages: 1,
                    currentPayment: 1,
                    enterpriseData: 1,
                    apps: 1,
                    costs: "$modelCosts"
                }
            }
        ]).toArray();
        return this.calculateDocuments(documents as WithId<Document>[]).map(
            (document) => UserModel.fromDocument(document as WithId<Document>)
        );
    }

    async getUserMonthlyCosts(userId: string) {
        return await this.getMonthlyCosts({_id: new ObjectId(userId)});
    }

    async getMonthlyCosts(match: Filter<Document>) {

        const documents = await this.db.collection(UserModel.asModelClass().collectionName).aggregate([
            {$match: match},
            {
                $lookup: {
                    from: RequestModel.asModelClass().collectionName,
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'userRequests'
                }
            },
            {$unwind: {path: "$userRequests", preserveNullAndEmptyArrays: true}},
            {
                $group: {
                    _id: {
                        userId: "$_id",
                        pricingModel: "$userRequests.pricingModel",
                        modelName: "$userRequests.model.model",
                        year: {$year: {$toDate: "$userRequests.createdAt"}},
                        month: {$month: {$toDate: "$userRequests.createdAt"}}
                    },
                    completion_tokens: {$sum: {$ifNull: ["$userRequests.costs.completion_tokens", 0]}},
                    prompt_tokens: {$sum: {$ifNull: ["$userRequests.costs.prompt_tokens", 0]}},
                    total_tokens: {$sum: {$ifNull: ["$userRequests.costs.total_tokens", 0]}},
                    milliseconds: {$sum: {$ifNull: ["$jobRequests.costs.milliseconds", 0]}},
                    characters: {$sum: {$ifNull: ["$jobRequests.costs.characters", 0]}}
                }
            },
            {
                $group: {
                    _id: {
                        userId: "$_id.userId",
                        year: "$_id.year",
                        month: "$_id.month"
                    },
                    modelCosts: {
                        $push: {
                            modelName: "$_id.modelName",
                            pricingModel: "$_id.pricingModel",
                            costs: {
                                completion_tokens: "$completion_tokens",
                                prompt_tokens: "$prompt_tokens",
                                total_tokens: "$total_tokens",
                                milliseconds: "$milliseconds",
                                characters: "$characters"
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: "$_id.userId",
                    year: "$_id.year",
                    month: "$_id.month",
                    costs: "$modelCosts"
                }
            }
        ]).toArray();
        return this.calculateDocuments(documents);
    }

    async getPackages(stripeInstance: StripeInstance, match: Filter<Document>) {
        const documents = await this.find(PackageModel.asModelClass(), match);
        for (const document of documents) {
            const price = await stripeInstance.findPriceByPackageName(document.getName());
            if (price) {
                const dexcription = price.metadata?.description ?? ``;
                const type = price.type === "recurring" ? `${price.recurring.interval}ly` : `lifetime`
                document.updateStripeData(price.unit_amount, dexcription, price.currency, price.type);
            }
        }
        return documents;
    }

    async add<T extends BaseModel>(model: ModelClass<T>, collectionItem: T) {
        const collection: Collection = this.db.collection(model.collectionName);
        return await collection.insertOne(collectionItem.toDocument());
    }

    async find<T extends BaseModel>(model: ModelClass<T>, query: Filter<Document>, findOptions: FindOptions = {}) {
        const fullQuery = findOptions.onlyActive != false ? {
            $and: [
                query,
                {active: {$eq: true}}
            ]
        } : query
        const collection = this.db.collection(model.collectionName);
        let findCursor = await collection.find(fullQuery);
        if (findOptions.sort) {
            findCursor = findCursor.sort(findOptions.sort, findOptions.sortDirection);
        }
        const modelInstances: T[] = [];
        while (await findCursor.hasNext()) {
            const document = await findCursor.next();
            const modelInstance = model.fromDocument<T>(document);
            modelInstances.push(modelInstance);
        }
        return modelInstances
    }

    async findOne<T extends BaseModel>(model: ModelClass<T>, query: Filter<Document>, onlyActive = true) {
        const fullQuery = onlyActive ? {
            $and: [
                query,
                {active: {$eq: true}}
            ]
        } : query
        const collection = this.db.collection(model.collectionName);
        const document = await collection.findOne(fullQuery);
        return document ? model.fromDocument<T>(document) : null;
    }

    async aggregate<T extends BaseModel>(model: ModelClass<T>, pipeline: Document[]) {
        const collection = this.db.collection(model.collectionName);
        const aggregationCursor = await collection.aggregate(pipeline);
        const modelInstances: T[] = [];
        while (await aggregationCursor.hasNext()) {
            const document = await aggregationCursor.next();
            if (document._id) {
                const modelInstance = model.fromDocument<T>(document as WithId<Document>);
                modelInstances.push(modelInstance);
            }
        }
        return modelInstances
    }

    async update<T extends BaseModel>(model: ModelClass<T>, data: T) {
        const collection = this.db.collection(model.collectionName);
        return await collection.findOneAndReplace({_id: data.getId()}, data.toDocument());
    }

    async rawUpdate<T extends BaseModel>(model: ModelClass<T>, query: Filter<T>, data: UpdateFilter<T>) {
        const collection = this.db.collection(model.collectionName);
        return await collection.updateMany(query, data);
    }

    async delete<T extends BaseModel>(model: ModelClass<T>, data: T) {
        const collection = this.db.collection(model.collectionName);
        return await collection.deleteOne({_id: data.getId()});
    }

    async close() {
        if (this.dbClient) {
            await this.dbClient.close();
            console.log("Połączenie z bazą danych MongoDB zamknięte.");
        }
    }

    getDB(): Db | null {
        return this.db;
    }

}

export default GlobalContext.register(DataBaseManager);