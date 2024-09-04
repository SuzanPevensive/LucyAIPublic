import BaseModel, {ModelClass} from "./BaseModel";
import {Document, ObjectId, WithId, WithoutId} from "mongodb";
import App from "../../app";

export class SessionModel extends BaseModel{

    static get collectionName(){
        return App.getConfig().mongodb.collections.sessions;
    }

    static fromDocument(document: WithId<Document>){
        const instance = new SessionModel(document.userId, document.jwtToken, document.csrf);
        instance.fromDocument(document);
        return instance;
    }
    static asModelClass(){
        return this as ModelClass<SessionModel>
    }

    private jwtToken: string;
    private csrfToken: string;
    private readonly userId: ObjectId;

    toDocument(): WithoutId<Document> {
        const document = super.toDocument();
        document.jwtToken = this.jwtToken;
        document.csrfToken = this.csrfToken;
        document.userId = this.userId;
        return document;
    }

    constructor(userId: ObjectId, jwtToken?: string, csrf?: string) {
        super(true);
        this.jwtToken = jwtToken;
        this.csrfToken = csrf;
        this.userId = userId;
    }

    public getJwtToken(): string {
        return this.jwtToken;
    }

    public getCsrf(): string {
        return this.csrfToken;
    }

    public getUserId(): ObjectId {
        return this.userId;
    }

    public setJwtToken(jwtToken: string): void {
        this.jwtToken = jwtToken;
    }

    public setCsrf(csrf: string): void {
        this.csrfToken = csrf;
    }
}