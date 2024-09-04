import ApiManager from "./managers/ApiManager";
import DataBaseManager from "./managers/DataBaseManager";
import EmailManager from "./managers/EmailManager";
import TranslationsManager from "./managers/TranslationsManager";
import GlobalContext from "./GlobalContext";
import * as fs from "fs";
import path from "path";
import {JsonFile} from "./models/JsonFile";
import JobsManager from "./managers/JobsManager";
import PlayHtManager from "./managers/PlayHtManager";
import DeepGramManager from "./managers/DeepGramManager";
import StripeManager from "./managers/StripeManager";
const jsonFiles: JsonFile[] = [];

class App {

    async init() {
        await ApiManager.init();
        await DataBaseManager.init();
        await EmailManager.init();
        await JobsManager.init();
        await DeepGramManager.init();
        await PlayHtManager.init();
    }

    getJsonFile(path: string){
        const newConfigTimestamp = fs.statSync(path).mtimeMs;
        let jsonFile = jsonFiles.find(jf => jf.path === path);
        if(!jsonFile || newConfigTimestamp !== jsonFile.timestamp){
            if(!jsonFile) {
                jsonFile = {path, timestamp: 0, data: null};
                jsonFiles.push(jsonFile);
            }
            jsonFile.timestamp = newConfigTimestamp;
            jsonFile.data = JSON.parse(fs.readFileSync(path, {encoding: `utf-8`}));
        }
        return jsonFile.data;
    }

    getConfig(){
        return this.getJsonFile(path.join(process.cwd(), `config.json`));
    }

    async getTranslateLanguages(req: any, res: any) {
        const wpKey = req.header(`wpKey`);
        const lang = req.body.lang ?? `*`;
        const languagesShortcuts = TranslationsManager.getLanguagesShortcuts();
        try {
            const languages = await TranslationsManager.getTranslateLanguages(wpKey, lang);
            res.send({languages, shortcuts: languagesShortcuts});
        } catch (e: any) {
            const error = `Wystąpił błąd połączenia, przepraszamy, spróbuj ponownie.`
            res.status(500).send({error});
            return;
        }
    }

}

export default GlobalContext.register(App);
