import {JobModel} from "../../models/mongodb/JobModel";
import * as BaseApp from "./BaseApp";

export default async (job: JobModel, model: any, _: any, data: any) => {
    const systemInfo = `You are multilingual writer and expert of creating Q&A. `
        + `Writing style and length depend on the user's request, `
        + `but follow the rules you know about Q&A.`;
    const onlyQuestions = data.onlyQuestions === true
        || data.onlyQuestions === `true`
        || data.onlyQuestions === `yes`
        || data.onlyQuestions === `1`;
    const questions = await BaseApp.execute(job, model, _, data, {
        systemInfo,
        userMessage:
            `Write ${data.number === 1 ? `only one question without answer` : `questions without answers`}  about:\n`
            + `${data.prompt}\n\n`,
        resultType: `question`,
        resultsNumber: data.number,
        tokens: data.number,
        enableSubMode: true
    });
    if (questions.error) return questions;
    if(!onlyQuestions) {
        const questionsStrings = Object.values(questions).join(`\n\n`);
        const answers = await BaseApp.execute(job, model, _, data, {
            systemInfo,
            userMessage:
                `Write answers for this questions:\n`
                + `${questionsStrings}\n\n`,
            resultType: `answer`,
            resultsNumber: data.number,
            enableSubMode: true
        });
        if (answers.error) return answers;
        for (const key in questions) {
            questions[key] = `<b>${questions[key]}</b><p></p>${answers[key]}`
        }
    }
    return questions;
}