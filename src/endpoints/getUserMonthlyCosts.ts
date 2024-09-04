import {Server, Request, Response} from "express";
import {UserRole} from "../models/mongodb/UserModel";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";
import {randomUUID} from "crypto";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getUserMonthlyCosts, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;

            const monthlyCosts = await DataBaseManager.getUserMonthlyCosts(user.getId().toString());
            for (const monthlyCost of monthlyCosts) {
                monthlyCost.uuid = randomUUID();
            }
            return res.status(200).json({monthlyCosts});
        })
    });
};