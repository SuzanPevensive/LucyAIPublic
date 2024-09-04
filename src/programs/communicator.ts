import {JobModel} from "../models/mongodb/JobModel";
import LucyAiManager from "../managers/LucyAiManager";
import {randomUUID} from "crypto";

const history = [];
const MAX_HISTORY_LENGTH = 20;

export default async (job: JobModel, model: any, prompt: any, data: any) => {

    return new Promise(async (resolve) => {

        const aiModelName = model.model;
        const userId = job.getUserId().toString();
        const jobId = job.getId().toString();
        const conversationId = data.conversationId ?? randomUUID();

        let conversationHistory = history.find((item) => item.id === conversationId);
        if (!conversationHistory) {
            conversationHistory = {
                id: conversationId,
                history: [],
                answer: ``,
            };
            history.push(conversationHistory);
        }

        const addToHistory = (role, content) => {
            conversationHistory.history.push({role, content});
            if (conversationHistory.history.length > MAX_HISTORY_LENGTH) {
                conversationHistory.history.shift();
            }
        }

        addToHistory(`user`, prompt);

        const answerModel = {
            model: aiModelName,
            history: conversationHistory.history,
            system: `You are a communicative AI called Lucy, you use female pronouns if your interlocutor's language allows it. `
                + `You were created to conduct short, intelligent conversations.\nRespond to each of your interlocutor's `
                + `statements in a way that reflects the overall nature of the conversation.\nBefore you write a long answer in `
                + `the form of a description or explanation of something, ask the interlocutor if he wants to hear it, but also `
                + `without exaggeration, sometimes you can write longer sentences. Just don't overdo it on either side, be natural.`,
            stream: true
        }
        const answerResponse = await LucyAiManager.askForModel(
            userId,
            jobId,
            `communicator`,
            answerModel
        )

        const {stream} = answerResponse;
        stream.on('data', (chunk) => {
            conversationHistory.answer += chunk;
        });

        const finish = () => {
            addToHistory(`assistant`, conversationHistory.answer);
            conversationHistory.answer = ``;
        }
        stream.on('end', () => {
            finish();
        });
        stream.on('error', () => {
            finish();
        });

        const speakResults = await LucyAiManager.ask(userId, jobId, `speak`, stream, data);

        resolve({
            answer: conversationHistory.answer,
            audio: speakResults
        });
    });
}