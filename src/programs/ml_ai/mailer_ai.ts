import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    return BaseApp.execute(job, model, _, data, {
        systemInfo: 
            `You are multilingual expert of writing emails in many forms and styles. `
            + `Generated text, it's style and length depend on the user's request, `
            + `but follow the rules you know about writing emails.\n\n`,
        userMessage:
            + `There are some instructions about email topic:\n`
            + `${data.prompt}\n\n`
            + (data.targetForm ? `Use the form ${data.targetForm} in the email.\n\n` : `Avoid formal phrases in the email.\n\n`),
        resultType: `email`,
        resultsNumber: 2,
        tokens: 2,
        enableSubMode: true
    });
}