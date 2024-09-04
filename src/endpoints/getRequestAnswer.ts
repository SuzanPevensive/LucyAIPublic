import {Server, Request, Response} from "express";
import {UserRole} from "../models/mongodb/UserModel";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";
import {ObjectId} from "mongodb";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getRequestAnswer, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                {name: `requestId`}
            );
            if (!data) return;

            const {requestId} = data;

            const requests = await DataBaseManager.getRequests({_id: new ObjectId(requestId)}, true);
            return res.status(200).json({answer: requests[0]?.getAnswer() ?? ``});
        })
    });
};