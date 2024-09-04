import {Document, ObjectId, WithId, WithoutId} from "mongodb";

export interface ModelClass<T extends BaseModel> {
    collectionName: string
    fromDocument: <T extends BaseModel>(document: WithId<Document>) => T
}

abstract class BaseModel {

    protected _id: ObjectId = null;
    protected active: boolean;
    protected createdAt: number = null;
    protected updatedAt: number = null;
    protected inactivateDate: number = null;

    protected fromDocument(document: WithId<Document>){
        this._id = document._id;
        this.active = document.active;
        this.createdAt = document.createdAt;
        this.updatedAt = document.updatedAt || this.createdAt;
        this.inactivateDate = document.inactivateDate;
    }
    public toDocument(): WithoutId<Document>{
        return {
            active: this.active,
            createdAt: this.createdAt,
            updatedAt: Date.now(),
            inactivateDate: this.inactivateDate
        }
    }

    protected constructor(active: boolean = true) {
        this.active = active;
        this.createdAt = Date.now();
    }

    public isActive(): boolean {
        return this.active;
    }

    public setId(_id: ObjectId) {
        this._id = _id;
    }


    public getId(): ObjectId {
        return this._id;
    }

    getCreatedAt(): number {
        return this.createdAt;
    }

    public getInactivateDate(): number {
        return this.inactivateDate;
    }

    public activate(): void {
        this.active = true;
        this.inactivateDate = null;
    }

    public inactivate(): void {
        this.active = false;
        this.inactivateDate = Date.now();
    }
}

export default BaseModel