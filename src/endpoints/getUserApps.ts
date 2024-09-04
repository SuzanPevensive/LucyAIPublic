import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import { getUserPackages } from "./getUserPackages";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getUserApps, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;
            const packages = await getUserPackages(user);
            const apps = packages.map((packageModel) => {
                return packageModel.getApps();
            }).flat();
            return res.status(200).json({apps});
        })
    });
};