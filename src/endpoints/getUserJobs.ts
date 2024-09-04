import {Server, Request, Response} from "express";
import {UserRole} from "../models/mongodb/UserModel";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getUserJobs, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;

            const data = ApiManager.requireData(
                req,
                res,
                {name: `queue`, optional: true}
            );
            if (!data) return;

            const match = {userId: user.getId()};
            if(data.queue) match[`queue`] = data.queue;

            const jobs = await DataBaseManager.getJobs(match);
            return res.status(200).json({jobs});
        })
    });
};