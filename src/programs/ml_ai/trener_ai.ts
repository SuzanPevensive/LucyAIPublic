import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    return BaseApp.execute(job, model, _, data, {
        systemInfo: 
            `You are multilingual writer and expert of creating courses plans `
            + `You always help writing professional course plan depending on `
            + `the user's request. Writing style and length also depend on `
            + `the user's request, but follow the rules you know about courses and plans.`,
        userMessage:
            `There are some informations about course:\n`
            + `${data.prompt}\n`
            + `Write plan for this course\n\n`,
        resultType: `plan`,
        resultsNumber: 1,
        tokens: 2,
        enableSubMode: true
    });
}