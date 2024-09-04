import {Server, Request, Response} from "express";
import ApiManager from "../managers/ApiManager";
import DataBaseManager from "../managers/DataBaseManager";
import App from "../app";
import { getUserPackages } from "./getUserPackages";
import StripeManager from "../managers/StripeManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getPackageByName, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `enterpriseId`},
            {name: `packageName`}
        );
        if (!data) return;
        const {enterpriseId, packageName} = data;

        const enterprise = await DataBaseManager.getUserById(enterpriseId);
        if (!enterprise) {
            return res.status(404).json({error: `Enterprise not found`});
        }
        const enterprisePackages = enterprise.getEnterpriseData()?.packages ?? [];
        const packageModelName = enterprisePackages.find((_packageName) => _packageName === packageName);
        if (!packageModelName) {
            return res.status(404).json({error: `Package not found in enterprise`});
        }
        const stripeInstance = await StripeManager.getStripeInstance(enterprise);
        if (!stripeInstance) {
            return res.status(500).json({error: `Stripe instance not found`});
        }
        const packageModel = (await DataBaseManager.getPackages(stripeInstance, {name: packageName}))[0];
        if (!packageModel) {
            return res.status(404).json({error: `Package not found`});
        }

        return res.status(200).json({
            packageId: packageModel.getId().toString(),
            name: packageModel.getName(),
            groupName: packageModel.getGroupName(),
            video: packageModel.isVideo(),
            displayName: packageModel.getDisplayName(),
            price: packageModel.getPrice(),
            description: packageModel.getDescription(),
            apps: packageModel.getApps()
        });

    });
};