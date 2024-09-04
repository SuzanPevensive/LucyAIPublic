import BaseModel, {ModelClass} from "./BaseModel";
import {Document, WithId, WithoutId, ObjectId} from "mongodb";
import App from "../../app";

export enum UserRole {
    ADMIN = "admin",
    ENTERPRISE = "enterprise",
    DEVELOPER = "developer",
    USER = "user"
}

export interface StripeData {
    privateKey: string,
    publicKey: string,
}

export interface EmailData {
    subject: string,
    content: string,
}

export interface NamedEmailData {
    [key: string]: EmailData
}

export interface SmtpData {
    host: string,
    port: number,
    secure: boolean,
    tls: boolean,
    user: string,
    pass: string,
    from: string,
    fromName: string,
    emails: NamedEmailData
}

export interface PackageData {
    packageId: ObjectId,
    tokens: number,
    lastPayment: number,
}

export interface EnterpriseData {
    nip: string,
    regon: string,
    name: string,
    displayName: string,
    address: string,
    stripeData: StripeData,
    smtpData: SmtpData,
    packages: string[],
    freePackages: string[]
}

export interface CurrentPaymentData {
    paymentSessionId: string,
    packageId: ObjectId,
}

export class UserModel extends BaseModel{

    static get collectionName(){
        return App.getConfig().mongodb.collections.users;
    }

    static fromDocument(document: WithId<Document>){
        const instance = new UserModel(document.email, document.password, document.role);
        instance.products = document.products || [];
        instance.annonymous = document.annonymous;
        instance.costs = document.costs;
        instance.billing = document.billing;
        instance.openAiData = document.openAiData;
        instance.enterpriseId = document.enterpriseId;
        instance.enterpriseData = document.enterpriseData;
        instance.packages = document.packages || [];
        instance.currentPayment = document.currentPayment;
        instance.fromDocument(document);
        return instance;
    }
    static asModelClass(){
        return this as ModelClass<UserModel>
    }

    private email: string;
    private password: string;
    private annonymous: boolean;
    private role: UserRole;
    private products: string[];
    private enterpriseId: ObjectId;
    private packages: PackageData[];
    private currentPayment: CurrentPaymentData;
    
    private openAiData: any;
    private enterpriseData: EnterpriseData;

    private costs: any;
    private billing: number;

    toDocument(): WithoutId<Document> {
        const document = super.toDocument();
        document.email = this.email;
        document.password = this.password;
        document.role = this.role;
        document.products = this.products;
        document.enterpriseId = this.enterpriseId;
        document.packages = this.packages;
        document.currentPayment = this.currentPayment;
        return document;
    }

    constructor(email: string, password: string, role: UserRole) {
        super(false);
        this.email = email;
        this.password = password;
        this.role = role;
        this.products = [];
        this.packages = [];
    }

    public getEmail(): string {
        return this.email;
    }

    public getPassword(): string {
        return this.password;
    }

    public isAnnonymous(): boolean {
        return this.annonymous === true;
    }

    public getRole(): UserRole {
        return this.role;
    }

    public getProducts(): string[] {
        return this.products;
    }

    public getEnterpriseId(): ObjectId {
        return this.enterpriseId;
    }

    public getOpenAiData(): any {
        return this.openAiData;
    }

    public getPackages(): PackageData[] {
        return this.packages;
    }

    public getCurrentPayment(): CurrentPaymentData {
        return this.currentPayment;
    }

    public getEnterpriseData(): EnterpriseData {
        return this.enterpriseData;
    }

    public getCosts(): any {
        return this.costs;
    }

    public getBilling(): number {
        return this.billing;
    }

    public setPassword(password: string) {
        this.password = password;
    }

    public setRole(role: UserRole) {
        this.role = role;
    }

    public setEnterpriseId(enterpriseId: ObjectId) {
        this.enterpriseId = enterpriseId;
    }

    public setProducts(products: string[]) {
        this.products = products;
    }

    public addProduct(product: string) {
        this.products.push(product);
    }

    public updatePackage(packageId: ObjectId, lastPayment: number) {
        const packageData = this.packages.find((packageData) => packageData.packageId.equals(packageId));
        if(packageData) {
            packageData.lastPayment = lastPayment;
            packageData.tokens = 0;
        } else {
            this.packages.push({packageId, lastPayment, tokens: 0});
        }
    }

    public setCurrentPayment(paymentSessionId: string, packageId: ObjectId) {
        this.currentPayment = {paymentSessionId, packageId};
    }

    public clearCurrentPayment() {
        this.currentPayment = null;
    }
}