import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    const emotIcons = data.emotIcons === true || data.emotIcons === `true` || data.emotIcons === `yes` || data.emotIcons === `1`;
    return BaseApp.execute(job, model, _, data, {
        systemInfo: 
            `You are multilingual writer and expert of creating comments for social media. `
            + `You always help writing professional comments depending on the user's request.\n`
            + `Writing style and length also depend on the user's request, but follow the rules `
            + `you know and adapt them accordingly to the chosen social media platform.`,
        userMessage:
            `Write a comment for post from ${data.type} platform.\n`
            + `Post content:\n${data.prompt}\n\n`
            + (emotIcons ? `Use emoticons in the comment.\n\n` : `Do not use emoticons in the comment.\n\n`),
        resultType: `comment`,
        resultsNumber: 3,
        tokens: 3,
        enableSubMode: true
    });
}