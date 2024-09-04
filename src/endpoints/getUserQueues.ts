import {Server, Request, Response} from "express";
import {UserRole} from "../models/mongodb/UserModel";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getUserQueues, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;

            const queues = await DataBaseManager.getQueues({userId: user.getId()});
            return res.status(200).json({queues});
        })
    });
};