import {Server, Request, Response} from "express";
import {UserModel} from "../models/mongodb/UserModel";
import DataBaseManager from "../managers/DataBaseManager";
import {EmailModel, EmailType} from "../models/mongodb/EmailModel";
import ApiManager from "../managers/ApiManager";
import {ErrorResponse, ErrorResponseType} from "../models/ErrorResponse";
import PasswordValidator from "../validators/PasswordValidator";
import * as bcrypt from "bcryptjs";
import App from "../app";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.useEmailCode, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `email`},
            {name: `code`},
            {name: `type`},
            {name: `newPassword`, optional: true},
            {name: `newPasswordRepeat`, optional: true},
        );
        if (!data) return;
        const {code, type} = data;
        const newPassword = data.newPassword;
        const newPasswordRepeat = data.newPasswordRepeat;
        
        const email: EmailModel = await ApiManager.requireEmailByData(res, data.email, code, type);
        if (!email) return;

        const user = await ApiManager.requireUser(res, email.getUserId().toString(), false);
        if (!user) return;

        if (email.getType() == EmailType.REGISTER) {

            if (user.isActive()) {
                ApiManager.userAlreadyActive(res);
                return
            }

            user.activate();
            await DataBaseManager.rawUpdate(UserModel.asModelClass(), {_id: user.getId()}, {$set: {active: true}});

            email.inactivate();
            await DataBaseManager.update(EmailModel.asModelClass(), email);

            return res.status(200).send(`Konto aktywowane!`);

        } else if (email.getType() == EmailType.REMIND_PASSWORD) {

            if (!newPassword || !newPasswordRepeat) {
                return res.status(400).json({
                    error: new ErrorResponse(ErrorResponseType.DATA_INVALID, `New password and repeat new password are required`)
                });
            }

            if (!PasswordValidator.validate(newPassword)) {
                return res.status(400).json({
                    error: new ErrorResponse(ErrorResponseType.PASSWORD_INCORRECT, `Password is too weak`)
                });
            }

            if (newPassword !== newPasswordRepeat) {
                return res.status(400).json({
                    error: new ErrorResponse(ErrorResponseType.PASSWORD_CONFIRM_INCORRECT, `New password and repeat new password must match`)
                });
            }

            const hashedPassword = bcrypt.hashSync(newPassword, bcrypt.genSaltSync());
            user.setPassword(hashedPassword);
            await DataBaseManager.update(UserModel.asModelClass(), user);

            email.inactivate();
            await DataBaseManager.update(EmailModel.asModelClass(), email);

            return res.status(200).json({message: 'Password changed successfully'});

        }
    });

}