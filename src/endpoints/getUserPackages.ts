import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";
import { PackageModel } from "../models/mongodb/PackageModel";
import { UserModel } from "../models/mongodb/UserModel";
import StripeManager from "../managers/StripeManager";

export async function getUserPackages(user: UserModel, onlyActive: boolean = true) {
    const stripeInstance = await StripeManager.getStripeInstance(user);
    if(!stripeInstance) return [];
    const packages: PackageModel[] = [];
    const now = Date.now();
    for(const packageData of user.getPackages()) {
        const packageModels = await DataBaseManager.getPackages(stripeInstance, {_id: packageData.packageId});
        const packageModel = packageModels[0];
        if(!packageModel) continue;
        if(onlyActive) {
            if(packageModel.getPaymentModel() === "monthly" && now - packageData.lastPayment > 30 * 24 * 60 * 60 * 1000) continue;
            if(packageModel.getPaymentModel() === "yearly" && now - packageData.lastPayment > 365 * 24 * 60 * 60 * 1000) continue;
        }
        packages.push(packageModel);
    }
    return packages;
}

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getUserPackages, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;
        
            const packages = await getUserPackages(user);
            return res.status(200).json({packages});
        })
    });
};