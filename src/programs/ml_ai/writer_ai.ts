import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    const time = parseFloat(data.time);
    const iterations = Math.ceil(time);
    let response: any = {};
    for (let i = 0; i < iterations; i++) {
        const systemInfo = `You are multilingual expert in writing articles, stories and books chapters. `
            + `Generated text, it's style and length depend on the user's request, `
            + `but follow the rules you know about writing.\n\n`;
        const partNumber = i + 1;
        let userMessage = `Write a ${
            iterations == 1 ? `` : `${partNumber} part of`
        } ${data.type} of minimum 400 words`
            + ` with a title "${data.prompt}"\n\n`;
        const partsKeys = Object.keys(response);
        for (let partIndex = 0; partIndex < partsKeys.length; partIndex++) {
            const partKey = partsKeys[partIndex];
            const part = response[partKey];
            userMessage += `Content of the part ${partIndex + 1}:\n${part}\n\n`;
        }
        response = await BaseApp.execute(job, model, _, data, {
            systemInfo,
            userMessage,
            resultType: `text`,
            resultsNumber: 1,
            tokens: 2,
            enableSubMode: true,
            jsonPrompt: `The result should be a json object, contains a generated parts, like the following example:\n{\n${
                    Array.from(
                        {length: Object.keys(response).length},
                        (_, _i) => `   "part${_i + 1}": "[Copied content of part ${_i + 1}]"`
                    ).join(",\n") + `,`
                    + `   "part${partNumber}": [Generated content of part ${partNumber}]`
                }\n}`
        });
        if(response.error) return response;
    }
    const headersRegExp = /^(\s|\t)*(Część|Part|Rozdział|Chapter) .+:\s*\n*/gi;
    console.log(response);
    return {
        "result": Object.values(response).map((part) => {
            return part.toString().replace(headersRegExp, ``);
        }).join(`\n\n`)
    };
}