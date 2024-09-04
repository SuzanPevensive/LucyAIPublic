import {Server, Request, Response} from "express";
import EmailValidator from "../validators/EmailValidator";
import PasswordValidator from "../validators/PasswordValidator";
import {UserModel, UserRole} from "../models/mongodb/UserModel";
import DataBaseManager from "../managers/DataBaseManager";
import * as bcrypt from "bcryptjs";
import {ErrorResponse, ErrorResponseType} from "../models/ErrorResponse";
import ApiManager from "../managers/ApiManager";
import {EmailModel, EmailType} from "../models/mongodb/EmailModel";
import EmailManager from "../managers/EmailManager";
import StripeManager from "../managers/StripeManager";
import {ObjectId} from "mongodb";
import App from "../app";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.register, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `email`},
            {name: `password`},
            {name: `confirmPassword`},
            {name: `enterpriseId`, optional: true}
        );
        if (!data) return;
        const {email, password, confirmPassword, enterpriseId} = data;

        if (!EmailValidator.validate(email)) {
            return res.status(400).json({
                error: new ErrorResponse(ErrorResponseType.EMAIL_INCORRECT, `Email is incorrect`)
            });
        }

        if (!PasswordValidator.validate(password)) {
            return res.status(400).json({
                error: new ErrorResponse(ErrorResponseType.PASSWORD_INCORRECT, `Password is too weak`)
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                error: new ErrorResponse(ErrorResponseType.PASSWORD_CONFIRM_INCORRECT, `Password and confirm password must match`)
            });
        }

        const user: UserModel = await DataBaseManager.findOne(UserModel.asModelClass(), {email: {$eq: email}}, false);
        if (user) {
            return ApiManager.userAlreadyExists(res);
        }

        const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());

        const newUser = new UserModel(email, hashedPassword, UserRole.USER);
        if(enterpriseId) {
            const enterprise = await DataBaseManager.getUserById(enterpriseId as string);
            newUser.setEnterpriseId(enterprise.getId());
            const enterpriseData = enterprise.getEnterpriseData();
            const freePackages = enterpriseData.freePackages || [];
            if(freePackages.length > 0) {
                const stripeInstance = await StripeManager.getStripeInstance(enterprise);
                for (const packageName of freePackages) {
                    const packageModel = (await DataBaseManager.getPackages(stripeInstance, {name: packageName}))[0];
                    if (packageModel) {
                        newUser.updatePackage(packageModel.getId(), Date.now());
                    }
                }
            }
        }
        const insertResult = await DataBaseManager.add(UserModel.asModelClass(), newUser);

        const newEmail = new EmailModel(email, insertResult.insertedId, EmailType.REGISTER);
        await DataBaseManager.add(EmailModel.asModelClass(), newEmail);
        await EmailManager.sendEmail(newEmail);

        return res.status(200).json({message: `User registered successfully`});
    });

}