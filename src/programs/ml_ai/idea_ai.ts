import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    return BaseApp.execute(job, model, _, data, {
        systemInfo: 
            `You are multilingual expert of creating ideas for different purposes. `
            + `Generated text, it's style and length depend on the user's request.\n\n`
            + `Generate only ideas, never generate content itself, even if the user asks for it.`,
        userMessage:
            `Write the ideas for ${data.type}\n`
            + `There are some instructions:\n`
            + `${data.prompt}\n\n`,
        resultType: `idea`,
        resultsNumber: 3,
        tokens: 3,
        enableSubMode: true
    });
}