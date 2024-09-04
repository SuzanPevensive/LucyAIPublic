import {Server, Request, Response} from "express";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import TranslationsManager from "../managers/TranslationsManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.translateLanguages, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `lang`, optional: true}
        );
        if (!data) return;

        const urlPath = ApiManager.getOriginHostAndPath(req);
        const lang = data.lang ?? `*`;
        const languagesShortcuts = TranslationsManager.getLanguagesShortcuts();

        try {
            const languages = await TranslationsManager.getTranslateLanguages(urlPath, lang);
            res.send({languages, shortcuts: languagesShortcuts});
        } catch (e: any) {
            const error = `Connection error, please try again.`;
            res.status(500).send({error});
            return;
        }

    });

}