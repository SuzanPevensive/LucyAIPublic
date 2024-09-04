import {JobModel} from "../../models/mongodb/JobModel";
import LucyAiManager from "../../managers/LucyAiManager";
import fs from "fs";
import path from "path";
import DataBaseManager from "../../managers/DataBaseManager";
import {getUserPackages} from "../../endpoints/getUserPackages";
import { UserModel, PackageData } from "../../models/mongodb/UserModel";
import { PackageModel } from "../../models/mongodb/PackageModel";

const packegeName = "ml_ai";

export async function execute(job: JobModel, model: any, _: any, data: any, config: any) {

    const aiModelName = data.algorithm ?? model.model;

    const jobId = job.getId().toString();
    const userId = job.getUserId().toString();

    const user = await DataBaseManager.getUserById(userId);
    const userPackages = await getUserPackages(user);
    const targetPackage = userPackages.find((packageModel: PackageModel) => packageModel.getGroupName() === packegeName);
    if (!targetPackage) {
        return { error: `User does not have the required package: ${packegeName}` };
    }

    const userPackageData = user.getPackages().find(
        (packageData: PackageData) => packageData.packageId.toString() === targetPackage.getId().toString()
    );
    if (!userPackageData) {
        return { error: `User does not have the required package: ${packegeName}` };
    }
    userPackageData.tokens = (userPackageData.tokens ?? 0) + parseInt((config.tokens ?? `1`));
    if(userPackageData.tokens > targetPackage.getTokens()) {
        return { error: `User does not have enough tokens: ${packegeName}`, tokensError: true};
    }
    await DataBaseManager.rawUpdate(UserModel.asModelClass(), { _id: user.getId() }, { 
        $set: { packages: user.getPackages() }
    });

    let subModePrompt = ``;
    if (config.enableSubMode) {
        const subModeId = data.style;
        const modesJson = await fs.promises.readFile(path.join(process.cwd(), `data`, `submodes.json`), `utf8`);
        const modes = JSON.parse(modesJson);
        const subModes = modes[`page-templater`] ?? modes[`default`];
        const subMode = subModes.find((subMode: { id: string }) => subMode.id === subModeId) ?? subModes[0];
        subModePrompt = subMode.prompt;
    }

    const resultsNumber = config.resultsNumber ?? 3;

    const requestModel = {
        model: aiModelName,
        system: `${config.systemInfo}\n${subModePrompt}`,
        json: true,
        maxTokens: config.maxTokens ?? null,
        user:
            `${config.userMessage}\n\n`
            + `Write generated content in the ${data.language} language.\n\n`
            + ( config.jsonPrompt || ( config.resultsNumber == 1 
                    ? (`The result should be a json object, contains a ${config.resultType}, like the following example:\n`
                        + (config.getJsonIterationPrompt ? config.getJsonIterationPrompt(0) : `{\n   "result": "[Generated content]"\n}`)
                    )
                    : (`The result should be a json object, contains ${config.resultsNumber} different ${config.resultType}s, `
                        + `like the following example:\n`
                        + `{
                            ${
                                Array.from(
                                    {length: config.resultsNumber}, 
                                    (_, i) => (config.getJsonIterationPrompt
                                        ? config.getJsonIterationPrompt(i)
                                        : `"result${i + 1}": "[Generated content for ${config.resultType} ${i + 1}]"`
                                    )
                                ).join(",\n")
                            }
                        }`
                    )
                )
            )
    }

    console.log(requestModel);

    const contentJsonString = await LucyAiManager.askForModel(
        userId,
        jobId,
        job.getModelName(),
        requestModel
    );
    return JSON.parse(contentJsonString);
}