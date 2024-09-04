import BaseModel, {ModelClass} from "./BaseModel";
import {Document, ObjectId, WithId, WithoutId} from "mongodb";
import App from "../../app";
import {RequestModel} from "./RequestModel";

export enum JobState {
    QUEUED = `queued`,
    IN_PROGRESS = `in_progress`,
    COMPLETED = `completed`,
    FAILED = `failed`,
    CANCELLED = `cancelled`
}

export class JobModel extends BaseModel{

    static get collectionName(){
        return App.getConfig().mongodb.collections.jobs;
    }

    static fromDocument(document: WithId<Document>){
        const instance =
            new JobModel(document.userId, document.modelName, document.prompt, document.data, document.queue);
        instance.isProgram = document.isProgram;
        instance.state = document.state;
        instance.requests = (document.requests ?? []).map((request: any) => RequestModel.fromDocument(request));
        instance.answer = document.answer;
        instance.costs = document.costs;
        instance.billing = document.billing;
        instance.fromDocument(document);
        return instance;
    }
    static asModelClass(){
        return this as ModelClass<JobModel>
    }

    private readonly userId: ObjectId;
    private isProgram: boolean = false;
    private modelName: string;
    private prompt: string;
    private data: any;
    private queue: string;
    private state: JobState = JobState.QUEUED;

    private requests: RequestModel[];
    private answer: string;
    private costs: any;
    private billing: number;

    toDocument(): WithoutId<Document> {
        const document = super.toDocument();
        document.userId = this.userId;
        document.isProgram = this.isProgram;
        document.modelName = this.modelName;
        document.prompt = this.prompt;
        document.data = this.data;
        document.state = this.state;
        document.queue = this.queue;
        return document;
    }

    constructor(userId: string, modelName: string, prompt: string, data: string, queue: string) {
        super(true);
        this.userId = new ObjectId(userId);
        this.modelName = modelName;
        this.prompt = prompt;
        this.data = data;
        this.queue = queue;
    }

    public getUserId(): ObjectId {
        return this.userId;
    }

    public isNotProgram(): boolean {
        return !this.isProgram;
    }

    public getModelName(): string {
        return this.modelName;
    }

    public getPrompt(): string {
        return this.prompt;
    }

    public getData(): any {
        return this.data;
    }

    public getQueue(): string {
        return this.queue;
    }

    public getState(): JobState {
        return this.state;
    }

    public getRequests(): any[] {
        return this.requests;
    }

    public getAnswer(): string {
        return this.answer;
    }

    public getCosts(): any {
        return this.costs;
    }

    public getBilling(): number {
        return this.billing;
    }

    public markAsProgram() {
        this.isProgram = true;
    }

    public setModelName(modelName: string) {
        this.modelName = modelName;
    }

    public setPrompt(prompt: string) {
        this.prompt = prompt;
    }

    public setData(data: any) {
        this.data = data;
    }

    public setQueue(queue: string) {
        this.queue = queue;
    }

    public setState(state: JobState) {
        this.state = state;
    }

}