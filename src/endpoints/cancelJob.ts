import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import {JobModel, JobState} from "../models/mongodb/JobModel";
import DataBaseManager from "../managers/DataBaseManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.cancelJob, async (req: any, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                {name: `jobId`}
            );
            if (!data) return;

            const jobId = data.jobId;
            const job = await DataBaseManager.getJobById(jobId);
            if (!job) {
                res.status(404);
                res.send({error: `Job not found`});
                return;
            }

            job.setState(JobState.CANCELLED);
            await DataBaseManager.update(JobModel.asModelClass(), job);

            res.send({success: true});

        });

    });

}