import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    const emotIcons = data.emotIcons === true || data.emotIcons === `true` || data.emotIcons === `yes` || data.emotIcons === `1`;
    return BaseApp.execute(job, model, _, data, {
        systemInfo: 
            `You are multilingual writer and expert of creating post for social media. `
            + `You always help writing professional posts, comments or description `
            + `depending on the user's request. Writing style and length also depend on `
            + `the user's request, but follow the rules you know and adapt them accordingly `
            + `to the chosen social media platform.`,
        userMessage:
            `Write for ${data.type} platform.\n`
            + `${data.prompt}\n\n`
            + (emotIcons ? `Use emoticons in the text.\n\n` : `Do not use emoticons in the text.\n\n`),
        resultType: `post`,
        resultsNumber: 3,
        tokens: 3,
        enableSubMode: true
    });
}