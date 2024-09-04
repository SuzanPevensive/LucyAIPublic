import {Server, Request, Response} from "express";
import {UserRole} from "../models/mongodb/UserModel";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";
import {ObjectId} from "mongodb";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getJobRequests, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                {name: `jobId`}
            );
            if (!data) return;

            const {jobId} = data;

            const requests = await DataBaseManager.getRequests({jobId: new ObjectId(jobId)});
            return res.status(200).json({requests});
        })
    });
};