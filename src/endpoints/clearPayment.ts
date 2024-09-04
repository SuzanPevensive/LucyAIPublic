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

    server.post(config.server.endpoints.cancelPayment, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;

            const stripeInstance = await StripeManager.getStripeInstance(user);
            if(!stripeInstance) {
                return res.status(400).json({error: `Stripe instance not found`});
            }

            const currentPayment = user.getCurrentPayment();
            if(!currentPayment) {
                return res.status(200).json({
                    status: `no_payment_session`
                });
            }
            
            const checkoutSession: any = await stripeInstance.checkPaymentStatus(currentPayment.paymentSessionId);
            if(checkoutSession.error) {
                return res.status(400).json({error: checkoutSession.error});
            } 

            const status = checkoutSession.status;
            if(status !== 'open') {
                return res.status(400).json({error: `Payment session isn't open`});
            }

            user.clearCurrentPayment();
            await DataBaseManager.rawUpdate(UserModel.asModelClass(), {_id: user.getId()}, {
                $set: {
                    currentPayment: user.getCurrentPayment(),
                }
            });

            await stripeInstance.cancelPaymentSession(currentPayment.paymentSessionId);
            if (checkoutSession.error) {
                return res.status(400).json({error: checkoutSession.error});
            }

            return res.status(200).json({ message: `Payment session cancelled` });

        })
    });
};