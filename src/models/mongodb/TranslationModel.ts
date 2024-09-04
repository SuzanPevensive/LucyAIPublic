import BaseModel, {ModelClass} from "./BaseModel";
import {Document, WithId, WithoutId} from "mongodb";
import App from "../../app";

export class TranslationModel extends BaseModel{

    static get collectionName(){
        return App.getConfig().mongodb.collections.translations;
    }

    static fromDocument(document: WithId<Document>){
        const instance = new TranslationModel(document.url, document.from, document.to, document.sentences);
        instance.fromDocument(document);
        return instance;
    }
    static asModelClass(){
        return this as ModelClass<TranslationModel>
    }

    private url: string;
    private from: string;
    private to: string;
    private sentences: { [key: string]: string };

    toDocument(): WithoutId<Document> {
        const document = super.toDocument();
        document.url = this.url;
        document.from = this.from;
        document.to = this.to;
        document.sentences = this.sentences;
        return document;
    }

    constructor(url: string, from: string, to: string, sentences: { [key: string]: string }) {
        super(true);
        this.url = url;
        this.from = from;
        this.to = to;
        this.sentences = sentences;
    }

    getUrl(){
        return this.url;
    }

    getFrom(){
        return this.from;
    }

    getTo(){
        return this.to;
    }

    getSentences(){
        return this.sentences;
    }

    setSentences(sentences: { [key: string]: string }){
        this.sentences = sentences;
    }

    setSentence(sentence: string, translation: string){
        this.sentences[sentence] = translation;
    }

}