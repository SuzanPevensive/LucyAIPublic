import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    const response = await BaseApp.execute(job, model, _, data, {
        systemInfo: 
            `You are multilingual writer and expert of creating hashtags for existing texts. `,
        userMessage:
            `Create the appropriate number of hashtags for this text:\n`
            + `${data.prompt}\n`,
        resultType: `hashtag`,
        resultsNumber: 3,
        tokens: 3,
        enableSubMode: true
    });
    if(response.error) return response;
    return {
        result0: data.prompt,
        ...response
    };
}