import {Server, Request, Response} from "express";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import fs from "fs";
import path from "path";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.getSubModes, async (req: Request, res: Response) => {

        const data = ApiManager.requireData(
            req,
            res,
            {name: `mode`, optional: true}
        );
        if (!data) return;

        const mode = data.mode;

        try {
            const modesJson = await fs.promises.readFile(path.join(process.cwd(), `data`, `submodes.json`), `utf8`);
            const modes = JSON.parse(modesJson);
            const subModes = modes[mode] ?? modes[`default`];
            res.send({subModes});
        } catch (e: any) {
            console.error(e);
            const error = `Connection error, please try again.`;
            res.status(500).send({error});
            return;
        }

    });

}