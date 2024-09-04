import LucyAiManager from "./LucyAiManager";
import * as fs from "fs";
import GlobalContext from "../GlobalContext";
import dataBaseManager from "./DataBaseManager";
import {TranslationModel} from "../models/mongodb/TranslationModel";
import DataBaseManager from "./DataBaseManager";
import path from "path";
import App from "../app";
import { replaceForTests } from "../utils";

const defaultTranslationPath = path.join(process.cwd(), `data`, `default-translations.json`);
let defaultTranslation: any = null;
let defaultTranslationTimestamp = 0;

class TranslationsManager {


    private languagesShortcuts = JSON.parse(
        fs.readFileSync(`${process.cwd()}/data/languages-shortcuts.json`, {encoding: `utf-8`})
    );

    private async getTranslations(urlPath: string, langFrom: string, langTo: string, generate = false){
        let translationModel =
            await dataBaseManager.findOne(TranslationModel.asModelClass(), {url: urlPath, from: langFrom, to: langTo});
        if (!translationModel && generate) {
            translationModel = new TranslationModel(urlPath, langFrom, langTo, {
                "[__wildcard__]": "*"
            });
            const insertResult =
                await dataBaseManager.add(TranslationModel.asModelClass(), translationModel);
            translationModel.setId(insertResult.insertedId);
        }
        return translationModel;
    }

    async getDefTranslations(langTo: string){
        const newConfigTimestamp = fs.statSync(defaultTranslationPath).mtimeMs;
        if(!defaultTranslation || newConfigTimestamp !== defaultTranslationTimestamp){
            defaultTranslationTimestamp = newConfigTimestamp;
            defaultTranslation = JSON.parse(fs.readFileSync(defaultTranslationPath, {encoding: `utf-8`}));
        }
        const _defaultTranslationForLang = defaultTranslation[langTo];
        if(_defaultTranslationForLang) {
            const defaultTranslationForLang = {};
            const config = App.getConfig()
            for (const _key in _defaultTranslationForLang) {
                const key = replaceForTests(config, _key);
                const value = replaceForTests(config, _defaultTranslationForLang[_key]);
                defaultTranslationForLang[key] = value;
            }
            return defaultTranslationForLang;
        }
        return null;
    }

    async getTranslateLanguages(urlPath: string, langFrom: string){
        const translationsSets =
            await dataBaseManager.find(TranslationModel.asModelClass(), {url: urlPath, from: langFrom});
        return translationsSets.map(translationsSet => translationsSet.getTo());
    }

    getLanguagesShortcuts(){
        return this.languagesShortcuts;
    }

    async editTranslation(userId: string, jobId: string, urlPath: string, langFrom: string, langTo: string, sentence: string, translation: string, generate: boolean) {
        const translationsModel = await this.getTranslations(urlPath, langFrom, langTo, true);
        let translatedSentence = translation;
        if (generate) {
            const newTranslationJson =
                (await LucyAiManager.ask(userId, jobId, `translator`, sentence, {langFrom, langTo})).toString();
            const newTranslations = JSON.parse(newTranslationJson);
            translatedSentence = newTranslations.translation;
        }
        translationsModel.setSentence(sentence, translatedSentence);
        await DataBaseManager.update(TranslationModel.asModelClass(), translationsModel);
        return translatedSentence;
    }

    async translate(userId: string, jobId: string, urlPath: string, langFrom: string, langTo: string, sentences: string[], generate: boolean, action: string) {
        let translationsModel: TranslationModel;
        if (action === `empty-language`) {
            await this.getTranslations(urlPath, langFrom, langTo, true);
            return {};
        } else if (action === `remove-language`) {
            translationsModel = await dataBaseManager.findOne(TranslationModel.asModelClass(), {url: urlPath, from: langFrom, to: langTo});
            if (translationsModel) {
                await DataBaseManager.delete(TranslationModel.asModelClass(), translationsModel);
            }
            return {};
        } else {
            translationsModel = await this.getTranslations(urlPath, langFrom, langTo, generate);
        }
        if (generate) {
            for (const sentence of sentences) {
                const newTranslationJson =
                    (await LucyAiManager.ask(userId, jobId, `translator`, sentence, { langFrom, langTo})).toString();
                const newTranslations = JSON.parse(newTranslationJson);
                translationsModel.setSentence(sentence, newTranslations.translation);
                await DataBaseManager.update(TranslationModel.asModelClass(), translationsModel);
            }
        }
        const def = await this.getDefTranslations(langTo);
        const defSentences = def ? def: {};
        const sentencesForUrl = translationsModel ? translationsModel.getSentences() : {};
        return {...defSentences, ...sentencesForUrl};
    }

}
export default GlobalContext.register(TranslationsManager);