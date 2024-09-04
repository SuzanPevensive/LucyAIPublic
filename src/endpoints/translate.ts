import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import TranslationsManager from "../managers/TranslationsManager";
import {randomUUID} from "crypto";
import dataBaseManager from "../managers/DataBaseManager";
import {TranslationModel} from "../models/mongodb/TranslationModel";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.translate, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `sentences`, optional: true},
            {name: `langFrom`, optional: true},
            {name: `generate`, optional: true},
            {name: `action`, optional: true},
            {name: `langTo`},
        );
        if (!data) return;

        const urlPath = ApiManager.getOriginHostAndPath(req);
        const langFrom = data.langFrom ?? `*`;
        const langTo = data.langTo.replace(/^.+?\((.+?)\).*$/g, `$1`);
        const sentences = data.sentences ?? [];
        const generate = data.generate;
        const action = data.action;

        const nextStep = async (userId: string = null, jobId: string = null) => {
            if (action === `empty-language` || action === `remove-language`) {
                await TranslationsManager.translate(userId, jobId, urlPath, langFrom, langTo, [], generate, action);
                res.send({});
                return;
            }
            try {
                const translatedSentences =
                        await TranslationsManager.translate(userId, jobId, urlPath, langFrom, langTo, sentences, generate, action);
                res.send({translatedSentences});
            } catch (e: any) {
                const error = `Connection error, please try again.`;
                res.status(500).send({error});
                return;
            }
        }

        if(generate || action){
            TokenManager.verifyToken(req, res, async (session) => {
                await nextStep(session.getUserId().toString(), randomUUID());
            });
        } else {
            await nextStep();
        }

    });

}