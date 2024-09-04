import express, {Server, NextFunction, Request, Response} from 'express';
import path from 'path';
import sharp from 'sharp';
import cors from 'cors';
import bodyParser from "body-parser";
import http from 'http';
import {Server as SocketServer} from "socket.io";
import fs from "fs";
import multer, {FileFilterCallback} from 'multer'
import {randomUUID} from "crypto";
import {UserModel, UserRole} from "../models/mongodb/UserModel";
import DataBaseManager from "./DataBaseManager";
import {ErrorResponse, ErrorResponseType} from "../models/ErrorResponse";
import {SessionModel} from "../models/mongodb/SessionModel";
import {EmailCode, EmailModel, EmailType} from "../models/mongodb/EmailModel";
import {ObjectId} from "mongodb";
import GlobalContext from "../GlobalContext";
import App from "../app";
import {replaceForTests} from "../utils";

export interface RequestPropertyGetter {
    name: string
    propertyName?: string,
    from?: string,
    optional?: boolean
}

class APIManager {

    private server: Server;
    public socket: SocketServer;

    private storage = multer.memoryStorage();

    private upload = multer({
        storage: this.storage,
        fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
            if (file.mimetype.startsWith("image")) {
                cb(null, true);
            } else {
                cb(new Error("Please upload only images."));
            }
        }
    });

    private async resizeImages(req: any, res: Response, next: () => void) {
        if (!req.files) return next();
        req.body.images = [];
        const files = req.files;
        if (Array.isArray(files)) {
            await Promise.all(
                files.map(async (file) => {
                    const newFileName = randomUUID();
                    const newFileExt = `png`;
                    const newFilePath = path.join(process.cwd(), `data`, `images`, `${newFileName}.${newFileExt}`);
                    const maxFileWidth = 1024;
                    try {
                        let image = sharp(file.buffer);
                        const meta = await image.metadata();
                        if (meta.width > maxFileWidth) {
                            image = image.resize(maxFileWidth);
                        }
                        const buffer = await image.png({ quality: 90 }).toBuffer();
                        await fs.promises.writeFile(newFilePath, buffer);
                        req.body.images.push(newFileName);
                    } catch (err) {
                    }
                })
            );
        }
        next();
    }

    async init() {

        const config = App.getConfig();

        this.server = express();
        this.server.use((req: any, res: any, next: any) => {
            const targetEndpointPrefix =
                req.originalUrl.split(`-`)[0].replace(/^\//, ``);
            const isTargetEndpointLocale = targetEndpointPrefix === `locale`;
            const apiKey = req.header(`api-key`);
            const corsOptions = {
                origin: function (origin: any, callback: any) {
                    const config = App.getConfig();
                    if (config.debug && !origin) {
                        return callback(null, true);
                    }
                    const allowedDomainsSet = config.server.whitelist.find((it: any) => it.key === `locale`);
                    if (!isTargetEndpointLocale) {
                        const allowedDomainsSetDefault = config.server.whitelist.find((it: any) => it.key === `default`);
                        allowedDomainsSet.domains.push(...allowedDomainsSetDefault.domains);
                    }
                    if (apiKey) {
                        const apiKeySet = config.server.whitelist.find((it: any) => it.key === apiKey);
                        if (apiKeySet) allowedDomainsSet.domains.push(...apiKeySet.domains);
                    }
                    if (allowedDomainsSet.domains.indexOf(origin) !== -1) {
                        callback(null, true);
                    } else {
                        callback(new Error('Not allowed by CORS'))
                    }
                }
            }
            cors(corsOptions)(req, res, next);
        });
        this.server.use(this.upload.array(`__images`, 10));
        this.server.use(this.resizeImages);
        this.server.use(bodyParser.json({limit: '50mb'}));
        this.server.use(bodyParser.urlencoded({extended: false, limit: '50mb'}));
        this.server.use((error: any, request: Request, response: Response, next: NextFunction) => {
            console.error(`-- Error --`);
            console.error(error);
        });

        const scriptOrStyleExtensions = [`js`, `json`, `html`, `css`];
        const imageExtensions = [`png`, `jpg`, `jpeg`, `gif`, `webp`];
        const videoExtensions = [`mp4`];
        const fontExtensions = [`woff`, `woff2`, `ttf`, `otf`, `eot`];

        const checkFile = async (filePath: string) => {
            if (fs.existsSync(filePath)) {
                const fileExt = path.extname(filePath).replace(/^\./, ``);
                return scriptOrStyleExtensions.includes(fileExt) 
                    || imageExtensions.includes(fileExt)
                    || videoExtensions.includes(fileExt)
                    || fontExtensions.includes(fileExt);
            } else {
                return false;
            }
        }

        this.server.get(`/page-info/:site/:page`, async (req: Request, res: Response) => {
            const site = req.params.site;
            const page = req.params.page;
            const pageDirPath = path.join(process.cwd(), `data`, `php`, `plugins`, `quick-pager`, `sites`, site, `pages`, page);
            if (fs.existsSync(pageDirPath)) {
                const walk = async (dir: string, list: any[]) => {
                    const files = await fs.promises.readdir(dir);
                    for (let file of files) {
                        const filePath = path.join(dir, file);
                        const stats = await fs.promises.stat(filePath);
                        if (stats.isDirectory()) {
                            const newList = {
                                name: file,
                                files: []
                            }
                            list.push(newList);
                            await walk(filePath, newList.files);
                        } else if (checkFile(filePath)) {
                            list.push(file);
                        }
                    }
                };
                const files: any[] = [];
                await walk(pageDirPath, files);
                res.send({
                    files,
                    scriptOrStyleExtensions,
                    imageExtensions,
                    videoExtensions,
                    fontExtensions,
                    allowedExtensions: [...scriptOrStyleExtensions, ...imageExtensions, ...videoExtensions, ...fontExtensions]
                });
            } else {
                res.status(404).send(`Not found`);
            }
        });

        this.server.get(`/php/*`, async (req: Request, res: Response) => {
            const resPath = req.params[0].split(`?`)[0].replace(/^\//, ``);
            const filePath =
                path.join(process.cwd(), `data`, `php`, resPath);
            const fileExt = path.extname(filePath).replace(/^\./, ``);
            if (fs.existsSync(filePath) && fileExt !== `php`) {
                const rotate = req.query?.rotate ? parseInt(req.query.rotate) : null;
                if(scriptOrStyleExtensions.includes(fileExt)){
                    let fileContent = fs.readFileSync(filePath, {encoding: `utf8`});
                    const resParentDirPath = resPath.split(`/`).slice(0, -1).join(`/`);
                    const host = App.getConfig().server.host;
                    const pageUrl = `${host}/php/${resParentDirPath}`;
                    fileContent = fileContent.replace(/{{page-url}}/g, pageUrl);
                    fileContent = replaceForTests(config, fileContent);
                    let contentType = ``;
                    if(fileExt === `js`) contentType = `application/javascript`;
                    if(fileExt === `json`) contentType = `application/json`;
                    if(fileExt === `html`) contentType = `text/html`;
                    if(fileExt === `css`) contentType = `text/css`;
                    res.setHeader(`Content-Type`, contentType);
                    res.send(fileContent);
                } else if(imageExtensions.includes(fileExt) && rotate) {
                    let image = sharp(filePath);
                    image = image.rotate(rotate);
                    if (fileExt === `jpg` || fileExt === `jpeg`) image = image.jpeg({ quality: 100 });
                    else if (fileExt === `gif`) image = image.gif();
                    else if (fileExt === `webp`) image = image.webp({ quality: 100 });
                    else image = image.png({ quality: 100 });
                    const buffer = await image.toBuffer();
                    const mimeType = `image/${fileExt}`;
                    res.setHeader(`Content-Type`, mimeType);
                    res.send(buffer);
                } else if (checkFile(filePath)) {
                    res.sendFile(filePath);
                } else {
                    res.status(404).send(`Not found`);
                }
            } else {
                res.status(404).send(`Not found`);
            }
        });

        const httpServer = http.createServer(this.server);
        await this.initEndpoints();

        this.socket = new SocketServer(httpServer);

        const port = config.server.testMode ? config.server[`test-port`] : config.server.port;
        httpServer.listen(port, () => {
            console.log(`Serwer nasłuchuje na porcie ${port}`);
        });
    }

    async initEndpoints() {
        const endpointsFolderPath = path.join(process.cwd(), `dist`, 'endpoints');
        const endpointFiles = await fs.promises.readdir(endpointsFolderPath);
        for (let endpointFile of endpointFiles) {
            const endpointPath = path.join(endpointsFolderPath, endpointFile);
            const stats = await fs.promises.stat(endpointPath);
            if (stats.isFile() && stats) {
                const fileExtension = path.extname(endpointFile).replace(/^\./, ``);
                if (fileExtension == `js`) {
                    try {
                        const endpoint = require(endpointPath).default;
                        endpoint(this.server);
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        }
    }

    getOriginHostAndPath(req: Request) {
        return req.headers[`said-origin-host`] as string + req.headers[`said-origin-path`] as string;
    }

    dataNotFound(res: Response, from: string, propertyName: string) {
        res.status(400).json({
            error: new ErrorResponse(ErrorResponseType.DATA_INVALID, `Wrong request data!\n Missing ${propertyName} in ${from}`)
        });
    }

    private userNotFound(res: Response) {
        res.status(400).json({
            error: new ErrorResponse(ErrorResponseType.USER_NOT_FOUND, `User not found`)
        });
    }

    private userNotFoundForSession(res: Response) {
        res.status(400).json({
            error: new ErrorResponse(ErrorResponseType.USER_NOT_FOUND, `User not found for session`)
        });
    }

    private wrongAccountPermissions(res: Response) {
        res.status(400).json({
            error: new ErrorResponse(ErrorResponseType.WRONG_ACCOUNT_PERMISSIONS, `Wrong account permissions`)
        });
    }

    private emailNotFound(res: Response) {
        res.status(400).json({
            error: new ErrorResponse(ErrorResponseType.EMAIL_NOT_FOUND, `Email not found`)
        });
    }

    private userNotActive(res: Response) {
        res.status(400).json({
            error: new ErrorResponse(ErrorResponseType.USER_NOT_ACTIVE, `User is not active`)
        });
    }

    userAlreadyActive(res: Response) {
        res.status(400).json({
            error: new ErrorResponse(ErrorResponseType.USER_ALREADY_ACTIVE, `User is already active`)
        });
    }

    userAlreadyExists(res: Response) {
        return res.status(400).json({
            error: new ErrorResponse(ErrorResponseType.USER_ALREADY_EXISTS, `User with this email already exists`)
        });
    }

    requireData(req: Request, res: Response, ...keysGetters: RequestPropertyGetter[]) {
        const result: any = {};
        for (let keysGetter of keysGetters) {
            const from = keysGetter.from ?? `body`;
            const optional = keysGetter.optional ?? false;
            const name = keysGetter.name;
            const propertyName = keysGetter.propertyName ?? name;
            const value = (req as any)[from][propertyName];
            if (!value && !optional) {
                this.dataNotFound(res, from, propertyName);
                return null;
            }
            result[name] = value;
        }
        return result;
    }

    async requireUserFromSession(
        req: Request,
        res: Response,
        session: SessionModel,
        role?: UserRole,
        onlyActive: boolean = true,
        withPassword = false
    ) {
        let user: UserModel = await DataBaseManager.getUserById(session.getUserId().toString(), onlyActive, withPassword);
        if (!user) {
            this.userNotFoundForSession(res);
            return null;
        }
        if (role) {
            if (user.getRole() != role) {
                this.wrongAccountPermissions(res);
                return null;
            }
        }
        if(user.getRole() != UserRole.USER) {
            const data = this.requireData(
                req,
                res,
                { name: `userId`, optional: true },
            );
            if(data) {
                const {userId} = data;
                if (userId) {
                    user = await this.requireUser(res, userId, onlyActive, withPassword, user);
                }
            }
        }
        return user;
    }

    private async handleUser(res: Response, user: UserModel, onlyActive: boolean, owner?: UserModel) {
        if (!user) {
            this.userNotFound(res);
            return null;
        }
        if (onlyActive && !user.isActive()) {
            this.userNotActive(res);
            return null;
        }
        if (owner) {
            if (owner.getRole() == UserRole.USER && !user.getId().equals(owner.getId())) {
                this.wrongAccountPermissions(res);
                return null;
            }
        }
        return user;
    }

    async requireUser(res: Response, userId: string, onlyActive: boolean = true, withPassword = false, owner?: UserModel) {
        const user: UserModel = await DataBaseManager.getUserById(userId, false, withPassword);
        return await this.handleUser(res, user, onlyActive, owner);
    }

    async requireUserByEmail(res: Response, email: string, onlyActive: boolean = true, withPassword = false, owner?: UserModel) {
        const user: UserModel = (await DataBaseManager.getUsers({email}, false, withPassword))[0];
        return await this.handleUser(res, user, onlyActive, owner);
    }

    async requireEmail(res: Response, emailId: string, owner?: UserModel) {
        const email: EmailModel = await DataBaseManager.findOne(EmailModel.asModelClass(), {_id: new ObjectId(emailId)});
        if (!email) {
            this.emailNotFound(res);
            return null;
        }
        if (owner) {
            if (owner.getRole() != UserRole.ADMIN && !email.getUserId().equals(owner.getId())) {
                this.wrongAccountPermissions(res);
                return null;
            }
        }
        return email;
    }

    async requireEmailByData(res: Response, _email: string, code: EmailCode, type: EmailType) {
        const email: EmailModel = await DataBaseManager.findOne(EmailModel.asModelClass(), {email: _email, code, type});
        if (!email) {
            this.emailNotFound(res);
            return null;
        }
        return email;
    }

}

export default GlobalContext.register(APIManager);