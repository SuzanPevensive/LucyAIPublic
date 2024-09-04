import {Server, Request, Response} from "express";
import {UserModel, UserRole} from "../models/mongodb/UserModel";
import DataBaseManager from "../managers/DataBaseManager";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.usersList, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            const user = await ApiManager.requireUserFromSession(req, res, session, UserRole.ADMIN);
            if (!user) return;

            const usersModels: UserModel[] = await DataBaseManager.find(UserModel.asModelClass(), {}, {onlyActive: false});
            const users = usersModels.map((usersModel) => {
                return {
                    userId: usersModel.getId().toString(),
                    email: usersModel.getEmail(),
                    role: usersModel.getRole(),
                }
            })

            return res.status(200).json({users});
        })
    });
};