import {Server, Request, Response} from "express";
import {UserModel, UserRole} from "../models/mongodb/UserModel";
import DataBaseManager from "../managers/DataBaseManager";
import TokenManager from "../managers/TokenManager";
import * as bcrypt from "bcryptjs";
import {ErrorResponse, ErrorResponseType} from "../models/ErrorResponse";
import ApiManager from "../managers/ApiManager";
import App from "../app";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.changePassword, async (req: Request, res: Response) => {

        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                { name: `password`},
                { name: `confirmPassword` },
                { name: `userId`, optional: true },
            );
            if(!data) return;
            const {userId, password, confirmPassword} = data;

            const admin = await ApiManager.requireUserFromSession(req, res, session);
            if(!admin) return;

            let user = admin;
            if(userId){
                user = await ApiManager.requireUser(res, userId, false, false, admin);
                if(!user) return;
            }

            if (password !== confirmPassword) {
                return res.status(400).json({
                    error: new ErrorResponse(ErrorResponseType.PASSWORD_CONFIRM_INCORRECT, `Password and repeat password must match`)
                });
            }

            const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());
            user.setPassword(hashedPassword);
            await DataBaseManager.update(UserModel.asModelClass(), user);

            return res.status(200).json({message: 'Password changed successfully'});

        });

    });

}