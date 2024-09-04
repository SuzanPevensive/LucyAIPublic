import {Server, Request, Response} from "express";
import {UserModel} from "../models/mongodb/UserModel";
import DataBaseManager from "../managers/DataBaseManager";
import * as bcrypt from "bcryptjs";
import {SessionModel} from "../models/mongodb/SessionModel";
import TokenManager from "../managers/TokenManager";
import {ObjectId} from "mongodb";
import {ErrorResponse, ErrorResponseType} from "../models/ErrorResponse";
import ApiManager from "../managers/ApiManager";
import App from "../app";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.login, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            { name: `email` },
            { name: `password` },
        );
        if(!data) return;
        const {email, password} = data;

        const user: UserModel = await ApiManager.requireUserByEmail(res, email, true, true);
        if(!user) return;

        const passwordMatch = bcrypt.compareSync(password, user.getPassword());
        if (!passwordMatch) {
            return res.status(400).json({
                error: new ErrorResponse(ErrorResponseType.PASSWORD_INCORRECT, `Invalid password`)
            });
        }

        const session = new SessionModel(user.getId());
        const insertResult = await DataBaseManager.add(SessionModel.asModelClass(), session);

        const sessionId = insertResult.insertedId.toString();

        const csrfToken = TokenManager.generateCsrfToken();
        const jwtToken = TokenManager.generateJwtToken(sessionId, csrfToken);

        session.setCsrf(csrfToken);
        session.setJwtToken(jwtToken);
        session.setId(new ObjectId(sessionId));
        await DataBaseManager.update(SessionModel.asModelClass(), session);

        return res.status(200).json({message: `User logged in successfully`, session: session});
    });

}