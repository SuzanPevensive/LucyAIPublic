import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import LucyAiManager from "../managers/LucyAiManager";
import {JobModel} from "../models/mongodb/JobModel";
import {SessionModel} from "../models/mongodb/SessionModel";
import DataBaseManager from "../managers/DataBaseManager";
import {ObjectId} from "mongodb";
import {PassThrough} from "stream";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.ask, async (req: any, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `annonymous`, optional: true},
            {name: `prompt`, optional: true},
            {name: `question`, optional: true},
            {name: `data`, optional: true},
            {name: `model`},
            {name: `imageUrl`, optional: true},
            {name: `queue`, optional: true}
        );
        if (!data) return;

        const postMethod = async (session: SessionModel = null) => {
            
            let dataJson = data.data;
            if(typeof dataJson !== `object`) {
                try {
                    dataJson = JSON.parse(dataJson);
                } catch(e) {
                    dataJson = null;
                }
            }

            const queue = data.queue ?? `main`;
            let prompt = data.prompt ?? data.question;

            let userId = session ? session.getUserId().toString() : null;
            if(!userId) {
                const annonymousUser = (await DataBaseManager.getUsers({annonymous: true}))[0];
                if(!annonymousUser) {
                    res.status(500);
                    res.send({error: `Annonymous user not found`});
                    return;
                }
                userId = annonymousUser.getId().toString();
            }
            const job = new JobModel(userId, data.model, prompt, dataJson, queue);
            const insertResult = await DataBaseManager.add(JobModel.asModelClass(), job);
            if(!insertResult) {
                res.status(500);
                res.send({error: `Internal error`});
                return;
            }
            const jobId = insertResult.insertedId.toString();
            job.setId(new ObjectId(jobId));

            const {imageUrl} = data;
            const model = data.model ?? '';

            let answer: any = null;
            try {
                if (imageUrl) {
                    const imageDescription =
                        (await LucyAiManager.ask(userId, `${jobId}_image`, `image`, imageUrl)).toString();
                    prompt = `${prompt}\n\nImage description:\n${imageDescription}`;
                    job.setPrompt(prompt);
                    await DataBaseManager.update(JobModel.asModelClass(), job);
                }
                answer = await LucyAiManager.ask(userId, jobId, model, prompt, dataJson);
            } catch (e: any) {
                const data = (e.response && e.response.data) ? e.response.data : null;
                if (data === null) {
                    console.error(e);
                } else if (data instanceof require('stream').Readable) {
                    let rawData = '';
                    data.on('data', (chunk: string) => {
                        rawData += chunk;
                    });
                    data.on('end', () => {
                        try {
                            const parsedData = JSON.parse(rawData);
                            console.log(parsedData);
                        } catch (e) {
                            console.error(e.message);
                        }
                    });
                } else {
                    console.log(data);
                }
                answer = `Wystąpił błąd połączenia, przepraszamy, spróbuj ponownie.`
                res.status(500);
            }
            if(answer.stream) {
                res.setHeader('Content-Type', answer.mimeType ?? 'application/octet-stream');
                answer.stream.pipe(res);
            } else {
                res.send({answer, jobId});
            }
        }

        if(data.annonymous) {
            postMethod();
        } else {
            TokenManager.verifyToken(req, res, async (session) => {
                postMethod(session);
            });
        }

    });

}