import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import {randomUUID} from "crypto";
import TranslationsManager from "../managers/TranslationsManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.translateEdit, async (req: Request, res: Response) => {

        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                {name: `sentence`, optional: true},
                {name: `generate`, optional: true},
                {name: `langFrom`, optional: true},
                {name: `langTo`},
                {name: `translation`},
            );
            if (!data) return;

            const urlPath = ApiManager.getOriginHostAndPath(req);
            const sentence = data.sentence ?? [];
            const generate = data.generate;
            const langFrom = data.langFrom ?? `*`;
            const {langTo, translation} = data;

            try {
                const translatedSentence = await TranslationsManager.editTranslation(
                    session.getUserId().toString(),
                    randomUUID(),
                    urlPath,
                    langFrom,
                    langTo,
                    sentence,
                    translation,
                    generate
                );
                res.send({translatedSentence});
            } catch (e: any) {
                const error = `Connection error, please try again.`;
                res.status(500).send({error});
                return;
            }

        });

    });

}