import BaseModel, {ModelClass} from "./BaseModel";
import {Document, ObjectId, WithId, WithoutId} from "mongodb";
import App from "../../app";


export enum EmailType{
    CHECKOUT = "checkout", REGISTER = "register", REMIND_PASSWORD = "remind_password", CREATOR = "creator"
}
export type EmailCode = `${number}${number}${number}${number}${number}${number}${number}${number}`

export class EmailModel extends BaseModel{

    static get collectionName(){
        return App.getConfig().mongodb.collections.emails;
    }

    private readonly email: string;
    private readonly userId: ObjectId;
    private readonly type: EmailType;
    private code: EmailCode;

    static fromDocument(document: WithId<Document>){
        const instance = new EmailModel(document.email, document.userId, document.type);
        instance.code = document.code;
        instance.fromDocument(document);
        return instance;
    }
    static asModelClass(){
        return this as ModelClass<EmailModel>
    }

    toDocument(): WithoutId<Document> {
        const document = super.toDocument();
        document.email = this.email;
        document.userId = this.userId;
        document.type = this.type;
        document.code = this.code;
        return document;
    }

    constructor(email: string, userId: ObjectId, type: EmailType) {
        super(true);
        this.email = email;
        this.userId = userId;
        this.type = type;
        const randomDigit = () => Math.floor(Math.random() * 9.99);
        this.code = Array.from({length: 8}, randomDigit).join(``) as EmailCode;
    }

    public getEmail(): string {
        return this.email;
    }

    public getUserId(): ObjectId {
        return this.userId;
    }

    public getType(): EmailType {
        return this.type;
    }

    public getCode(): EmailCode {
        return this.code;
    }
}