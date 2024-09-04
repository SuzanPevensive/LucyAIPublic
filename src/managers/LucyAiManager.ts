// @ts-ignore
import OpenAI from "openai";
import GlobalContext from "../GlobalContext";
import path from "path";
import fs from "fs";
import DataBaseManager from "./DataBaseManager";
import {RequestModel, RequestState} from "../models/mongodb/RequestModel";
import {ObjectId} from "mongodb";
import App from "../app";
import {JobModel, JobState} from "../models/mongodb/JobModel";
import {Readable, Transform, Writable} from "stream";
import {wait} from "../utils";

class LucyAiManager {

    openai: any;
    usersOpenai: any[] = [];
    usageLimits: any = {};

    private get limits() {
        return App.getJsonFile(path.join(process.cwd(), `data`, `limits.json`));
    }

    private get prices() {
        return App.getJsonFile(path.join(process.cwd(), `data`, `prices.json`));
    }

    constructor() {
        this.openai = new OpenAI({
            apiKey: "...",
            organization: "...",
            project: "...",
        });
    }

    private clearUsageLimit = (usageLimit: any) => {
        usageLimit.tpm = 0;
        usageLimit.rpm = 0;
        usageLimit.tpd = 0;
        usageLimit.cpm = 0;
    }

    private getLimitForModel(model: string, requestModel: RequestModel) {
        const pricingModel = requestModel.getPricingModel();
        const modelName = pricingModel ? `${pricingModel}:${model}` : model;
        return this.limits.find(limit => limit.model === modelName) ?? this.limits.find(limit => limit.model === model);
    }

    private getUsageLimitForModel(model: string, requestModel: RequestModel) {
        const pricingModel = requestModel.getPricingModel();
        const modelName = pricingModel ? `${pricingModel}:${model}` : model;
        let usageLimit = this.usageLimits[modelName];
        if (!usageLimit) {
            usageLimit = {};
            this.usageLimits[modelName] = usageLimit;
            usageLimit.cr = 0;
            this.clearUsageLimit(usageLimit);
        }
        return usageLimit;
    }

    async addCmpForModel(model: string, requestModel: RequestModel, cpm: number) {
        const usageLimit = this.getUsageLimitForModel(model, requestModel);
        usageLimit.cpm += cpm;
    }

    async continueOrWaitForModel(model: string, requestModel: RequestModel) {
        const limit = this.getLimitForModel(model, requestModel);
        if (!limit) return;
        const usageLimit = this.getUsageLimitForModel(model, requestModel);
        const now = new Date();
        const dayOfTheYear =
            Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
        const minuteOfTheDay = now.getHours() * 60 + now.getMinutes();
        if (!usageLimit.day || dayOfTheYear !== usageLimit.day) {
            usageLimit.day = dayOfTheYear
            this.clearUsageLimit(usageLimit);
        }
        if (!usageLimit.minute || minuteOfTheDay !== usageLimit.minute) {
            usageLimit.minute = minuteOfTheDay;
            this.clearUsageLimit(usageLimit);
        }
        const waitToNextMinute = async (secondsToNextMinute) => {
            return new Promise(resolve => {
                console.log(`Waiting for next minute`);
                setTimeout(resolve, secondsToNextMinute);
            });
        }
        if (limit.tpm && usageLimit.tpm >= limit.tpm) {
            const secondsToNextMinute = 60 - now.getSeconds() + 1;
            await waitToNextMinute(secondsToNextMinute);
            this.clearUsageLimit(usageLimit);
        }
        if (limit.rpm && usageLimit.rpm >= limit.rpm) {
            const secondsToNextMinute = 60 - now.getSeconds() + 1;
            await waitToNextMinute(secondsToNextMinute);
            this.clearUsageLimit(usageLimit);
        }
        if (limit.cpm && usageLimit.cpm >= limit.cpm) {
            const secondsToNextMinute = 60 - now.getSeconds() + 1;
            await waitToNextMinute(secondsToNextMinute);
            this.clearUsageLimit(usageLimit);
        }
        usageLimit.cr += 1;
        if (limit.cr && usageLimit.cr >= limit.cr) {
            while(usageLimit.cr >= limit.cr) {
                await wait(200);
            }
            usageLimit.cr  = 0;
        }
        // a co z tpd ??
        // a co z cpm ?? :O
    }

    endRequestForModel(model: string, requestModel: RequestModel) {
        let usageLimit = this.getUsageLimitForModel(model, requestModel);
        usageLimit.cr -= 1;
    }

    private addTokensUsageForModel(model: string, requestModel: RequestModel, tokens: number) {
        const pricingModel = requestModel.getPricingModel();
        const modelName = pricingModel ? `${pricingModel}:${model}` : model;
        const usageLimit = this.usageLimits[modelName];
        if (!usageLimit) return;
        usageLimit.rpm += 1;
        usageLimit.tpm += tokens;
        usageLimit.tpd += tokens;
    }

    getModel(modelName: string, prompt: string = ``, data: any = null, userId: string = null, jobId: string = null) {
        let modelPath = path.join(process.cwd(), `dist`, `models`, `lucyai`, `${modelName}.js`);
        if (!fs.existsSync(modelPath)) {
            modelPath = path.join(process.cwd(), `dist`, `models`, `lucyai`, `writer.js`);
        }
        return require(modelPath).default(prompt, data, userId, jobId);
    }

    getProgramModel(programName: string) {
        const modelPath = path.join(process.cwd(), `dist`, `programs`, `${programName}.js`);
        return require(modelPath).default;
    }

    calculateCosts(_modelName: string, pricingModel: string, costs: any) {
        const modelName = pricingModel ? `${pricingModel}:${_modelName}` : _modelName;
        const price = this.prices.find(price => price.model === modelName) ?? this.prices.find(price => price.model === _modelName);
        if (!price || !costs) return null;
        const unitName = price[`unit-name`];
        if (unitName === `request`) {
            return price.price;
        }
        if (unitName === `token`) {
            const unitCount = price[`unit-count`];
            const inputPrice = price[`input-price`];
            const inputAlgorithmPrice = price[`input-algorithm-price`];
            const outputPrice = price[`output-price`];
            const outputAlgorithmPrice = price[`output-algorithm-price`];
            const inputCost = costs.prompt_tokens / unitCount * (inputPrice + inputAlgorithmPrice);
            const outputCost = costs.completion_tokens / unitCount * (outputPrice + outputAlgorithmPrice);
            return inputCost + outputCost;
        }
        if (unitName === `minutes`) {
            const unitCount = price[`unit-count`];
            const unitCountInMillis = unitCount * 60 * 1000;
            const inputPrice = price[`input-price`];
            const inputAlgorithmPrice = price[`input-algorithm-price`];
            return costs.milliseconds / unitCountInMillis * (inputPrice + inputAlgorithmPrice);
        }
        if (unitName === `character`) {
            const unitCount = price[`unit-count`];
            const inputPrice = price[`input-price`];
            const inputAlgorithmPrice = price[`input-algorithm-price`];
            return costs.characters / unitCount * (inputPrice + inputAlgorithmPrice);
        }
        return null;
    }

    async createRequest(userId: string, jobId: string, modelName: string, model: any, prompt: any, data: any = null) {

        const user = await DataBaseManager.getUserById(userId);
        const job = await DataBaseManager.getJobById(jobId, true);

        const requestModel =
            new RequestModel(new ObjectId(userId), new ObjectId(jobId), modelName, model, prompt?.toString(), data);
        const insertResult = await DataBaseManager.add(RequestModel.asModelClass(), requestModel);
        requestModel.setId(insertResult.insertedId);
        if (job.isNotProgram()) {
            job.setState(JobState.IN_PROGRESS);
            await DataBaseManager.update(JobModel.asModelClass(), job);
        }

        let openAiData = user.getOpenAiData();
        if(!openAiData && user.getRole() === `user`) {
            const enterpriseId = user.getEnterpriseId();
            if (enterpriseId) {
                const enterprise = await DataBaseManager.getUserById(enterpriseId.toString());
                if (enterprise) {
                    openAiData = enterprise.getOpenAiData();
                }
            }
        }
        if (openAiData && openAiData.pricingModel) {
            requestModel.setPricingModel(openAiData.pricingModel);
            await DataBaseManager.update(RequestModel.asModelClass(), requestModel);
        }

        return requestModel;
    }

    async ask(
        userId: string,
        jobId: string,
        modelName: string,
        prompt: any,
        data: any = null
    ): Promise<any> {
        const job = await DataBaseManager.getJobById(jobId, true);
        const model = this.getModel(modelName, prompt, data, userId, jobId);
        const user = await DataBaseManager.getUserById(userId);
        if(user.isAnnonymous() && !model.annonymous) {
            console.log(`User is not authenticated`);
            return `User is not authenticated`;
        }
        if (model.queued && job.isNotProgram()) {
            const otherJobInProgress = await DataBaseManager.findOne(
                JobModel.asModelClass(),
                {
                    queue: job.getQueue(),
                    state: JobState.IN_PROGRESS,
                    _id: {$ne: new ObjectId(jobId)}
                }
            );
            if (otherJobInProgress) {
                console.log(`Job is queued`);
                return `Job is queued`;
            }
        }
        if (model.program) {
            const program = this.getProgramModel(modelName);
            if (program) {
                return new Promise(async (resolve) => {
                    job.markAsProgram();
                    program(job, model, prompt, data).then(async (data: any) => {
                        job.setState(JobState.COMPLETED);
                        await DataBaseManager.update(JobModel.asModelClass(), job);
                        if (model.sync) resolve(data);
                    }).catch(async (error: Error) => {
                        console.error(error);
                        job.setState(JobState.FAILED);
                        await DataBaseManager.update(JobModel.asModelClass(), job);
                        if (model.sync) resolve(error);
                    });
                    job.setState(JobState.IN_PROGRESS);
                    await DataBaseManager.update(JobModel.asModelClass(), job);
                    console.log(`Program executed`);
                    if (!model.sync) resolve(`Program executed`);
                });
            }
        }
        return this.askForModel(userId, jobId, modelName, model, prompt, data);
    }

    async askForModel(
        userId: string,
        jobId: string,
        modelName: string,
        model: any,
        prompt: any = null,
        data: any = null
    ): Promise<any> {
        return new Promise(async (resolve) => {

            const user = await DataBaseManager.getUserById(userId);
            const job = await DataBaseManager.getJobById(jobId, true);

            let maxTokens = model.maxTokens ?? null;
            if (maxTokens) {
                maxTokens = Math.min(maxTokens, 4096);
            }

            const requestModel = await this.createRequest(userId, jobId, modelName, model, prompt, data);

            const history = model.history ?? [];
            const userMessage = model.user ?? prompt;
            if(userMessage) history.push({role: `user`, content: userMessage});

            const request: any = {
                model: model.model,
                messages: [
                    {role: `system`, content: model.system},
                    ...history
                ],
                max_tokens: maxTokens,
                stream: true,
                stream_options: {include_usage: true}
            }
            if (model.tools) {
                request.tools = model.tools;
            }
            if (model.json) {
                request.response_format = {"type": "json_object"};
            }

            let openai = this.openai;

            const openAiData = user.getOpenAiData();
            if (openAiData) {
                if (openAiData.apiKey && openAiData.orgId && openAiData.projectId) {
                    openai = this.usersOpenai.find(
                        openai => openai.apiKey === openAiData.apiKey
                            && openai.organization === openAiData.orgId
                            && openai.project === openAiData.projectId
                    );
                    if (!openai) {
                        openai = new OpenAI({
                            apiKey: openAiData.apiKey,
                            organization: openAiData.orgId,
                            project: openAiData.projectId,
                        });
                        this.usersOpenai.push(openai);
                    }
                }
            }

            await this.continueOrWaitForModel(model.model, requestModel);
            console.log(request);
            try {
                const openAiStream = await openai.chat.completions.create(request);
                let stream: Transform;
                if(model.stream) {
                    stream = new Transform({
                        transform(chunk, encoding, callback) {
                            const message = chunk.choices[0]?.delta?.content || "";
                            callback(null, message);
                        }
                    });
                    openAiStream.pipe(stream);
                    resolve({stream, mimeType: model.mimeType});
                }
                let result: any = ``;
                for await (const chunk of openAiStream) {
                    const message = chunk.choices[0]?.delta?.content || "";
                    const costs = chunk.usage;
                    result += message;
                    requestModel.setAnswer(result);
                    if (costs) {
                        this.addTokensUsageForModel(model.model, requestModel, costs.total_tokens);
                        requestModel.setCosts(costs);
                    }
                    await DataBaseManager.update(RequestModel.asModelClass(), requestModel);
                }
                requestModel.setState(RequestState.COMPLETED);
                await DataBaseManager.update(RequestModel.asModelClass(), requestModel);
                if (job.isNotProgram()) {
                    job.setState(JobState.COMPLETED);
                    await DataBaseManager.update(JobModel.asModelClass(), job);
                }
                if(!model.stream) resolve(result);
            } catch (error) {
                requestModel.setState(RequestState.FAILED);
                await DataBaseManager.update(RequestModel.asModelClass(), requestModel);
                if (job.isNotProgram()) {
                    job.setState(JobState.FAILED);
                    await DataBaseManager.update(JobModel.asModelClass(), job);
                }
                if(!model.stream) resolve({error});
            }
        });
    }

}

export default GlobalContext.register(LucyAiManager);