import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    return BaseApp.execute(job, model, _, data, {
        systemInfo: 
            `You are multilingual expert in preparing personal action plans. `
            + `Generated plan, it's style and length depend on the user's request, `
            + `but follow the rules you know about writing actions plans.\n\n`,
        userMessage:
            + `There are some instructions about activity:\n`
            + `${data.prompt}\n\n`
            + `User may spend ${data.time}${data.timeUnit} performing this activity\n\n`
            + `Bold each important infromation or word in generated text by <b> html tag\n\n`,
        resultType: `plan`,
        resultsNumber: 1,
        tokens: 2,
        enableSubMode: true
    });
}