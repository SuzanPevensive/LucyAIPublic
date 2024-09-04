import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    return BaseApp.execute(job, model, _, data, {
        systemInfo: 
            `You are multilingual writer and expert of creating product descriptions `
            + `for e-commerce websites. You always help writing professional descriptions `
            + `depending on the user's request. Writing style and length also depend on `
            + `the user's request, but follow the rules you know about e-commerce.`,
        userMessage:
            `There are some informations about product:\n`
            + `${data.prompt}\n`
            + `Write descripton for this product\n\n`,
        resultType: `description`,
        resultsNumber: 3, 
        tokens: 3,
        enableSubMode: true
    });
}