import {Server, Request, Response} from "express";
import {EmailModel, EmailType} from "../models/mongodb/EmailModel";
import ApiManager from "../managers/ApiManager";
import App from "../app";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.verifyEmail, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `emailValue`, propertyName: `email`},
            {name: `code`},
            {name: `type`},
        );
        if (!data) return;
        const {emailValue, code, type} = data;

        const email: EmailModel = await ApiManager.requireEmailByData(res, emailValue, code, type);
        if(!email) return;

        return res.status(200).json({message: 'Email successfully verified'});
    });

}