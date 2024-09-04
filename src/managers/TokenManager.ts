import {Request, Response} from 'express';
import jwt, {JwtPayload} from 'jsonwebtoken';
import {randomUUID, UUID} from "crypto";
import {ObjectId, WithId} from "mongodb";
import {SessionModel} from "../models/mongodb/SessionModel";
import DataBaseManager from "./DataBaseManager";
import {ErrorResponseType} from "../models/ErrorResponse";
import GlobalContext from "../GlobalContext";
import App from "../app";

class TokenManager {

    generateJwtToken(sessionId: string, csrfToken: string): string {

        const config = App.getConfig();

        const payload = {
            sessionId,
            csrfToken
        };

        return jwt.sign(payload, config.crypto.secretKey, {
            expiresIn: '30d',
        });
    }

    generateCsrfToken(): UUID {
        return randomUUID();
    }

    async verifyToken(req: Request, res: Response, next: (session: SessionModel) => void) {

        const config = App.getConfig();

        const jwtToken = req.headers.authorization?.split(' ')[1];
        const csrfToken = req.headers['x-csrf-token'];

        if (!jwtToken || !csrfToken) {
            return res.status(401).json({error: {type: ErrorResponseType.SESSION_NOT_FOUND, message: 'Missing token'}});
        }

        try {
            const decoded = jwt.verify(jwtToken, config.crypto.secretKey) as JwtPayload;
            if (csrfToken !== decoded.csrfToken) {
                return res.status(401).json({error: {type: ErrorResponseType.SESSION_NOT_FOUND, message: 'Invalid CSRF token'}});
            }
            const session: SessionModel =
                await DataBaseManager.findOne(SessionModel.asModelClass(), { _id: { $eq: new ObjectId(decoded.sessionId) } });
            if (!session) {
                return res.status(401).json({error: {type: ErrorResponseType.SESSION_NOT_FOUND, message: 'Invalid session'}});
            }
            next(session);
        } catch (err) {
            return res.status(401).json({error: {type: ErrorResponseType.SESSION_NOT_FOUND, message: 'Invalid token'}});
        }
    }
}

export default GlobalContext.register(TokenManager);