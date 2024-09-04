import { Stripe } from 'stripe';
import GlobalContext from '../GlobalContext';
import { PackageModel } from '../models/mongodb/PackageModel';
import { UserModel } from '../models/mongodb/UserModel';
import DataBaseManager from './DataBaseManager';

interface PackageAndSessionPair {
    packageId: string;
    sessionId: string;
}

class StripeInstanceData {
    privateKey: string
    instance: StripeInstance
}

export class StripeInstance {

    private stripe: Stripe;

    constructor(privateKey: string) {
        this.stripe = new Stripe(privateKey);
    }

    async findPriceByPackageName(packageName: string) {
        const prices = await this.stripe.prices.search({
            query: `metadata["packageName"]:"${packageName}"`,
        });
        return prices.data[0];
    }

    async createCheckoutSession(
        packageModel: PackageModel,
        returnUrl: string,
    ) {
        try {
            const price = await this.findPriceByPackageName(packageModel.getName());
            const session = await this.stripe.checkout.sessions.create({
                ui_mode: 'embedded',
                line_items: [
                    {
                        price: price.id,
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                return_url: returnUrl,
            });
            return session;
        } catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    async checkPaymentStatus(sessionId: string) {
        try {
            return await this.stripe.checkout.sessions.retrieve(sessionId);
        } catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

    async cancelPaymentSession(sessionId: string) {
        try {
            return await this.stripe.checkout.sessions.expire(sessionId);
        } catch (e) {
            console.error(e);
            return {error: e.message};
        }
    }

}

class StripeManager {

    private stripeInstances: StripeInstanceData[] = [];

    async getStripeInstance(userModel: UserModel) {
        let enterpriseData = userModel.getEnterpriseData();
        if(!enterpriseData || !enterpriseData.stripeData) {
            const enterprise = await DataBaseManager.getUserById(userModel.getEnterpriseId().toString());
            enterpriseData = enterprise.getEnterpriseData();
        }
        if(enterpriseData && enterpriseData.stripeData) {
            const stripeData = enterpriseData.stripeData;
            if(stripeData.privateKey && stripeData.publicKey) {
                const instance = this.stripeInstances.find((instance) => instance.privateKey === stripeData.privateKey);
                if(instance) {
                    return instance.instance;
                }
                const newInstance = new StripeInstance(stripeData.privateKey);
                this.stripeInstances.push({privateKey: stripeData.privateKey, instance: newInstance});
                return newInstance;
            }
        }
        return null;
    }

}

export default GlobalContext.register(StripeManager);