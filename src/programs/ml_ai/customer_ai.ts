import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    const systemInfo = `You are multilingual writer and expert of `
        + `creating uncomfortable customer questions.`
        + `Writing style and length depend on the user's request, `
        + `but follow the rules you know about average customers.`;
    return await BaseApp.execute(job, model, _, data, {
        systemInfo,
        userMessage:
            `Write potential customer questions about the product described here:\n`
            + `${data.prompt}\n\n`,
        resultType: `question`,
        resultsNumber: data.number,
        tokens: data.number,
        enableSubMode: true
    });
}