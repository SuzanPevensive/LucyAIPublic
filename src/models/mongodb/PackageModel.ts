import BaseModel, {ModelClass} from "./BaseModel";
import {Document, WithId, WithoutId, ObjectId} from "mongodb";
import App from "../../app";

export class PackageModel extends BaseModel{

    static get collectionName(){
        return App.getConfig().mongodb.collections.packages;
    }

    static fromDocument(document: WithId<Document>){
        const instance = 
            new PackageModel(document.name, document.groupName, document.displayName, document.image, document.tokens);
        instance.video = document.video;
        instance.apps = document.apps;
        instance.fromDocument(document);
        return instance;
    }
    static asModelClass(){
        return this as ModelClass<PackageModel>
    }

    private name: string;
    private groupName: string;
    private video: boolean;
    private displayName: string;
    private image: string;
    private tokens: number;
    private apps: string[];

    private price: number;
    private description: string;
    private currency: string;
    private paymentModel: string;

    updateStripeData(price: number, description: string, currency: string, paymentModel: string){
        this.price = price;
        this.description = description;
        this.currency = currency;
        this.paymentModel = paymentModel;
    }

    toDocument(): WithoutId<Document> {
        const document = super.toDocument();
        document.name = this.name;
        document.groupName = this.groupName;
        document.video = this.video;
        document.displayName = this.displayName;
        document.image = this.image;
        document.tokens = this.tokens;
        document.apps = this.apps;
        return document;
    }

    constructor(name: string, groupName: string, displayName: string, image: string, tokens: number){
        super(true);
        this.name = name;
        this.groupName = groupName;
        this.displayName = displayName;
        this.image = image;
        this.tokens = tokens;
        this.apps = [];
    }

    getName(){
        return this.name;
    }

    getGroupName(){
        return this.groupName || ``;
    }

    isVideo(){
        return this.video === true;
    }

    getDisplayName(){
        return this.displayName;
    }

    getImage(){
        return this.image;
    }

    getTokens(){
        return this.tokens;
    }

    getApps(){
        return this.apps;
    }

    getPrice(){
        return this.price;
    }

    getDescription(){
        return this.description;
    }

    getCurrency(){
        return this.currency;
    }

    getPaymentModel(){
        return this.paymentModel;
    }

}