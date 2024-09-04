import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    return BaseApp.execute(job, model, _, data, {
        systemInfo: 
            `You are multilingual writer and expert of creating social media reels. `
            + `You always help writing professional content for social media reels`
            + `depending on the user's request. Writing style and length also depend on `
            + `the user's request, but follow the rules you know and adapt them accordingly `
            + `to the chosen social media platform.`,
        userMessage:
            `Write reel content for ${data.type} platform.\n`
            + `${data.prompt}\n\n`
            + `${data.additionalInformation}\n\n`,
        resultType: `reel`,
        resultsNumber: 1,
        tokens: 2,
        enableSubMode: true
    });
}