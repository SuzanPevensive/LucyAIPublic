import BaseModel, {ModelClass} from "./BaseModel";
import {Document, ObjectId, WithId, WithoutId} from "mongodb";
import App from "../../app";

export enum RequestState {
    IN_PROGRESS = `in_progress`,
    COMPLETED = `completed`,
    FAILED = `failed`,

}

export class RequestModel extends BaseModel{

    static get collectionName(){
        return App.getConfig().mongodb.collections.requests;
    }

    static fromDocument(document: WithId<Document>){
        const instance =
            new RequestModel(document.userId, document.jobId, document.modelName, document.model, document.prompt, document.data);
        instance.answer = document.answer;
        instance.state = document.state;
        instance.costs = document.costs;
        instance.billing = document.billing;
        instance.pricingModel = document.pricingModel;
        instance.fromDocument(document);
        return instance;
    }
    static asModelClass(){
        return this as ModelClass<RequestModel>
    }

    private readonly userId: ObjectId;
    private jobId: ObjectId;
    private modelName: string;
    private model: any;
    private pricingModel: string;
    private prompt: string;
    private data: string;
    private answer: any = null;
    private state = RequestState.IN_PROGRESS;
    private costs: any = {};

    private billing: number;

    toDocument(): WithoutId<Document> {
        const document = super.toDocument();
        document.userId = this.userId;
        document.jobId = this.jobId;
        document.modelName = this.modelName;
        document.model = this.model;
        document.pricingModel = this.pricingModel;
        document.prompt = this.prompt;
        document.data = this.data;
        document.answer = this.answer;
        document.state = this.state;
        document.costs = this.costs;
        return document;
    }

    constructor(userId: ObjectId, jobId: ObjectId, modelName: string, model: any, prompt: string, data: string) {
        super(true);
        this.userId = userId;
        this.jobId = jobId;
        this.modelName = modelName;
        this.model = model;
        this.prompt = prompt;
        this.data = data;
    }

    public getUserId(): ObjectId {
        return this.userId;
    }

    public getJobId(): ObjectId {
        return this.jobId;
    }

    public getModelName(): string {
        return this.modelName;
    }

    public getModel(): any {
        return this.model;
    }

    public getPricingModel(): string {
        return this.pricingModel;
    }

    public getPrompt(): string {
        return this.prompt;
    }

    public getData(): string {
        return this.data;
    }

    public getAnswer(): any {
        return this.answer;
    }

    public getState(): RequestState {
        return this.state;
    }

    public getCosts(): any {
        return this.costs;
    }

    public getBilling(): number {
        return this.billing;
    }

    public setJobId(jobId: ObjectId) {
        this.jobId = jobId;
    }

    public setModelName(modelName: string) {
        this.modelName = modelName;
    }

    public setModel(model: any) {
        this.model = model;
    }

    public setPricingModel(pricingModel: string) {
        this.pricingModel = pricingModel;
    }

    public setPrompt(prompt: string) {
        this.prompt = prompt;
    }

    public setData(data: string) {
        this.data = data;
    }

    public setAnswer(answer: any) {
        this.answer = answer;
    }

    public setState(state: RequestState) {
        this.state = state;
    }

    public setCosts(costs: any) {
        this.costs = costs;
    }

}