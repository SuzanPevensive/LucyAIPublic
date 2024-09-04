import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.answer, async (req: Request, res: Response) => {

        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                {name: `jobId`},
            );
            if (!data) return;
            const {jobId} = data;

            const job = await DataBaseManager.getJobById(jobId);
            if (!job) {
                res.status(404).send({error: `Job not found.`});
                return;
            }

            const answer = job.getAnswer() ?? ``;
            res.send({answer});
        });

    });

}