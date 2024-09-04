import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";
import { EnterpriseData } from "../models/mongodb/UserModel";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.enterpriseInfo, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `enterpriseId`}
        );
        if (!data) return;

        const enterpriseId = data.enterpriseId;
        const enterprise = await DataBaseManager.getUserById(enterpriseId);

        const enterpriseData = enterprise.getEnterpriseData() ?? {} as EnterpriseData;
        if(enterpriseData.stripeData?.privateKey) {
            enterpriseData.stripeData.privateKey = null;
        }

        const result = {
            enterpriseId: enterprise.getId().toString(),
            email: enterprise.getEmail(),
            ...enterpriseData
        };

        return res.status(200).json(result);
    });
};