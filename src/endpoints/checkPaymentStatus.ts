import {Server, Request, Response} from "express";
import {UserModel, UserRole} from "../models/mongodb/UserModel";
import TokenManager from "../managers/TokenManager";
import StripeManager from "../managers/StripeManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import DataBaseManager from "../managers/DataBaseManager";
import bcrypt from "bcryptjs";
import EmailManager from "../managers/EmailManager";
import { ObjectId } from "mongodb";
import {EmailModel, EmailType} from "../models/mongodb/EmailModel";
import {CurrentPaymentData} from "../models/mongodb/UserModel";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.checkPaymentStatus, async (req: Request, res: Response) => {
        TokenManager.verifyToken(req, res, async (session) => {

            const data = ApiManager.requireData(
                req,
                res,
                {name: `sessionId`, optional: true},
                {name: `packageId`, optional: true},
                {name: `enterpriseId`, optional: true}
            );

            let user = await ApiManager.requireUserFromSession(req, res, session);
            if(!user) return;

            const enterpriseId = data.enterpriseId || user.getEnterpriseId();
            const {sessionId, packageId} = data;
            const enterprise = await DataBaseManager.getUserById(enterpriseId.toString());

            const stripeInstance = await StripeManager.getStripeInstance(enterprise);
            if(!stripeInstance) {
                return res.status(400).json({error: `Stripe instance not found`});
            }

            let currentPayment = user.getCurrentPayment();
            if(!currentPayment) {
                if(sessionId && packageId) {
                    currentPayment = {
                        paymentSessionId: sessionId,
                        packageId: new ObjectId(packageId as string)
                    } as CurrentPaymentData;
                } else {
                    return res.status(200).json({
                        status: `no_payment_session`
                    });
                }
            }
            
            const checkoutSession: any = await stripeInstance.checkPaymentStatus(currentPayment.paymentSessionId);
            if(checkoutSession.error) {
                return res.status(400).json({error: checkoutSession.error});
            } else {
                let email = null;
                let tempPassword = null;
                const status = checkoutSession.status;
                if(status !== 'open') {
                    user.clearCurrentPayment();
                }
                if(status === 'complete') {
                    await DataBaseManager.rawUpdate(UserModel.asModelClass(), {_id: user.getId()}, {
                        $set: {
                            currentPayment: null
                        }
                    });
                    if(user.isAnnonymous()) {
                        email = checkoutSession.customer_details.email;
                        tempPassword = Math.random().toString(36).slice(-8);
                        const hashedPassword = bcrypt.hashSync(tempPassword, bcrypt.genSaltSync());
                        user = new UserModel(email, hashedPassword, UserRole.USER);
                        user.setEnterpriseId(enterprise.getId());
                        user.activate();
                        const enterpriseData = enterprise.getEnterpriseData();
                        const freePackages = enterpriseData.freePackages || [];
                        if(freePackages.length > 0) {
                            const stripeInstance = await StripeManager.getStripeInstance(enterprise);
                            for (const packageName of freePackages) {
                                const packageModel = (await DataBaseManager.getPackages(stripeInstance, {name: packageName}))[0];
                                if (packageModel) {
                                    user.updatePackage(packageModel.getId(), Date.now());
                                }
                            }
                        }
                        const insertResult = await DataBaseManager.add(UserModel.asModelClass(), user);
                        user.setId(insertResult.insertedId);
                        const newEmail = new EmailModel(email, insertResult.insertedId, EmailType.CHECKOUT);
                        await DataBaseManager.add(EmailModel.asModelClass(), newEmail);
                        await EmailManager.sendEmail(newEmail, {password: tempPassword});
                    }
                    user.updatePackage(currentPayment.packageId, Date.now());
                    await DataBaseManager.rawUpdate(UserModel.asModelClass(), {_id: user.getId()}, {
                        $set: {
                            packages: user.getPackages()
                        }
                    });
                }
                return res.status(200).json({ status, email, tempPassword });
            }
        })
    });
};