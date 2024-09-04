import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getEnterpriseUsers, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;

            const users = await DataBaseManager.getUsers({enterpriseId: user.getId()});
            return res.status(200).json({
                users: users.map((_user) => {
                    return {
                        userId: _user.getId().toString(),
                        email: _user.getEmail(),
                        role: _user.getRole(),
                        products: _user.getProducts(),
                        costs: _user.getCosts(),
                        billing: _user.getBilling(),
                    }
                })
            });
        })
    });
};