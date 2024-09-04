import {Server, Request, Response} from "express";
import {EnterpriseData, UserModel, UserRole} from "../models/mongodb/UserModel";
import DataBaseManager from "../managers/DataBaseManager";
import TokenManager from "../managers/TokenManager";
import * as bcrypt from "bcryptjs";
import {ErrorResponse, ErrorResponseType} from "../models/ErrorResponse";
import ApiManager from "../managers/ApiManager";
import App from "../app";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.updateEnterpriseData, async (req: Request, res: Response) => {

        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                { name: `userId`, optional: true },
                { name: `name`, optional: true },
                { name: `nip`, optional: true },
                { name: `regon`, optional: true },
                { name: `address`, optional: true },
            );
            if(!data) return;
            const {userId, name, nip, regon, address} = data;

            const admin = await ApiManager.requireUserFromSession(req, res, session);
            if(!admin) return;

            let user = admin;
            if(userId){
                user = await ApiManager.requireUser(res, userId, false, false, admin);
                if(!user) return;
            }

            const enterpriseData = user.getEnterpriseData() || {} as EnterpriseData;
            if(name) enterpriseData.name = name;
            if(nip) enterpriseData.nip = nip;
            if(regon) enterpriseData.regon = regon;
            if(address) enterpriseData.address = address;

            await DataBaseManager.rawUpdate(UserModel.asModelClass(), {
                _id: user.getId()
            }, {
                $set: {
                    enterpriseData
                }
            });

            return res.status(200).json({message: 'Enterprise data updated'});

        });

    });

}