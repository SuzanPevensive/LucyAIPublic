import {Response, Server} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import {JobModel, JobState} from "../models/mongodb/JobModel";
import DataBaseManager from "../managers/DataBaseManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.clearQueue, async (req: any, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                {name: `queue`}
            );
            if (!data) return;

            const userId = session.getUserId();

            await DataBaseManager.rawUpdate(
                JobModel.asModelClass(),
                {userId, queue: data.queue, state: JobState.QUEUED},
                { $set: { state: JobState.CANCELLED } }
            );

            res.send({success: true});

        });

    });

}