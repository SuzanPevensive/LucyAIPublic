import {Server, Request, Response} from "express";
import {UserModel} from "../models/mongodb/UserModel";
import TokenManager from "../managers/TokenManager";
import StripeManager from "../managers/StripeManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";
import { ObjectId } from "mongodb";
import { PackageModel } from "../models/mongodb/PackageModel";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.createPayment, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                {name: `packageId`},
                {name: `returnUrl`},
                {name: `enterpriseId`, optional: true}
            );
            if (!data) return;
            const {packageId, returnUrl} = data;

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;

            const enterpriseId = data.enterpriseId || user.getEnterpriseId();
            const enterprise = await DataBaseManager.getUserById(enterpriseId.toString());

            const stripeInstance = await StripeManager.getStripeInstance(enterprise);
            if(!stripeInstance) {
                return res.status(400).json({error: `Stripe instance not found`});
            }

            const currentPayment = user.getCurrentPayment();
            if(currentPayment) {
                const checkoutSession: any = await stripeInstance.checkPaymentStatus(currentPayment.paymentSessionId);
                if(checkoutSession.error) {
                    return res.status(400).json({error: checkoutSession.error});
                } else if(checkoutSession.status === `open`) {
                    return res.status(400).json({error: `Previous payment session is still open`});
                }
            }

            const packageModels = await DataBaseManager.getPackages(stripeInstance, {_id: new ObjectId(packageId as string)});
            const packageModel = packageModels[0];
            if(!packageModel) {
                return res.status(400).json({error: `Package not found`});
            }

            const checkoutSession: any = await stripeInstance.createCheckoutSession(
                packageModel,
                returnUrl,
            );

            if(checkoutSession.error) {
                return res.status(400).json({error: checkoutSession.error});
            } else {
                if(!user.isAnnonymous()) {
                    user.setCurrentPayment(
                        checkoutSession.id,
                        packageModel.getId()
                    );
                    await DataBaseManager.rawUpdate(UserModel.asModelClass(), {_id: user.getId()}, {
                        $set: {
                            currentPayment: user.getCurrentPayment()
                        }
                    });
                }
                return res.status(200).json({
                    sessionId: checkoutSession.id,
                    clientSecret: checkoutSession.client_secret
                });
            }
        })
    });
};