import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";
import { PackageModel } from "../models/mongodb/PackageModel";
import { getUserPackages } from "./getUserPackages";
import StripeManager from "../managers/StripeManager";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getAvailablePackages, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                {name: `enterpriseId`, optional: true}
            );

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;

            const userPackages = user.isAnnonymous() ? [] : (await getUserPackages(user));
        
            const packages = [];
            const enterpriseId = data.enterpriseId || user.getEnterpriseId();
            if(enterpriseId){
                const enterprise = await DataBaseManager.getUserById(enterpriseId.toString());
                const stripeInstance = await StripeManager.getStripeInstance(enterprise);
                if(stripeInstance) {
                    const enterprisePackages = enterprise.getEnterpriseData()?.packages ?? [];
                    if(enterprisePackages.length > 0) {
                        const packagesNames = enterprisePackages.filter((packageName) => {
                            return !userPackages.find((userPackage) => {
                                return userPackage.getName() === packageName;
                            });
                        });
                        const groups = [];
                        for(const packageName of packagesNames) {
                            const packageModels = await DataBaseManager.getPackages(stripeInstance, {name: packageName});
                            const packageModel = packageModels[0];
                            if(packageModel) {
                                packages.push(packageModel);
                                const group = packageModel.getGroupName();
                                if(group && !groups.includes(group)) {
                                    groups.push(group);
                                }
                            }
                        }
                        for(const group of groups) {
                            const groupPackages = packages.filter((packageModel) => {
                                return packageModel.getGroupName() === group;
                            });
                            const userGroupPackages = userPackages.filter((userPackage) => {
                                return userPackage.getGroupName() === group;
                            });
                            if(userGroupPackages.length === 0) continue;
                            const mostExpensivePackage = userGroupPackages.reduce((prev, current) => {
                                return prev.getPrice() > current.getPrice() ? prev : current;
                            });
                            for(const packageModel of groupPackages) {
                                if(packageModel.getPrice() < mostExpensivePackage.getPrice()) {
                                    const index = packages.indexOf(packageModel);
                                    if(index >= 0) {
                                        packages.splice(index, 1);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return res.status(200).json({packages});
        })
    });
};