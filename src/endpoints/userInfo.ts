import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.userInfo, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;

            const result = {
                userId: user.getId().toString(),
                email: user.getEmail(),
                annonymous: user.isAnnonymous(),
                role: user.getRole(),
                products: user.getProducts(),
                costs: user.getCosts(),
                billing: user.getBilling()
            }

            return res.status(200).json(result);
        })
    });
};