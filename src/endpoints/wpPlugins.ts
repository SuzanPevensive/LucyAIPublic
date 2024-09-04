import {Server, Request, Response} from "express";
import TokenManager from "../managers/TokenManager";
import ApiManager from "../managers/ApiManager";
import App from "../app";
import fs from "fs";
import {replaceForTests} from "../utils";

export default (server: Server) => {

    const config = App.getConfig();

    server.post(config.server.endpoints.wpPlugins, async (req: Request, res: Response) => {

        console.log(`wpPlugins`);

        TokenManager.verifyToken(req, res, async (session) => {

            const user = await ApiManager.requireUserFromSession(req, res, session);
            if (!user) return;

            const data = ApiManager.requireData(
                req,
                res,
                {name: `plugins`, optional: true}
            );
            if (!data) return;

            const plugins = (data.plugins ?? ``).split('|');

            let code = `<?php`;
            const utilsFilePath = `${process.cwd()}/data/php/utils.php`;
            if (fs.existsSync(utilsFilePath)) {
                const utilsFileContent = fs.readFileSync(utilsFilePath, 'utf8');
                code += `\n\n${utilsFileContent.replace(/<\?php/, '')}`;
            }
            code += '\n\ntry {'
            for (let plugin of plugins) {
                if (user.getProducts().indexOf(plugin) === -1) continue;
                const pluginFolderPath = `${process.cwd()}/data/php/plugins/${plugin}`;
                if (fs.existsSync(pluginFolderPath)) {
                    const pluginFiles = fs.readdirSync(pluginFolderPath);
                    for (let file of pluginFiles) {
                        if (file.endsWith('.php')) {
                            const fileContent = fs.readFileSync(`${pluginFolderPath}/${file}`, 'utf8');
                            code += `\n\n${fileContent.replace(/<\?php/, '')}`;
                        }
                    }
                }
            }
            code += '\n\n} catch (Throwable $e) {\n\necho $e->getMessage();\n\n}\n\n?>';
            code = replaceForTests(config, code);
            res.send({code});
        });

    });

}