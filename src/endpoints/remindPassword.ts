import {Server, Request, Response} from "express";
import {UserModel} from "../models/mongodb/UserModel";
import DataBaseManager from "../managers/DataBaseManager";
import {EmailModel, EmailType} from "../models/mongodb/EmailModel";
import EmailManager from "../managers/EmailManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.remindPassword, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `email`},
        );
        if (!data) return;
        const {email} = data;

        const user: UserModel = await ApiManager.requireUserByEmail(res, email, false);
        if(!user) return;

        const newEmail = new EmailModel(email, user.getId(), EmailType.REMIND_PASSWORD);
        await DataBaseManager.add(EmailModel.asModelClass(), newEmail);
        await EmailManager.sendEmail(newEmail);

        return res.status(200).json({message: 'Email sent successfully'});
    });

}