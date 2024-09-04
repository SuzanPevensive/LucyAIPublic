import GlobalContext from "../GlobalContext";
import {createClient, DeepgramClient, LiveClient, LiveTranscriptionEvents} from "@deepgram/sdk";
import App from "../app";
import path from "path";
import LucyAiManager from "./LucyAiManager";
import {RequestModel, RequestState} from "../models/mongodb/RequestModel";
import DataBaseManager from "./DataBaseManager";
import fs from "fs";
import {Readable, Writable} from "stream";

const DEEP_GRAM_API_KEY = '...';

class DeepGramManager {

    deepgram: DeepgramClient;

    async init() {
        this.deepgram = createClient(DEEP_GRAM_API_KEY);
    }

    async transcript(
        userId: string,
        jobId: string,
        modelName: string,
        model: any,
        data: any
    ) {
        return new Promise(async (resolve) => {
            let fullTranscription = ``;
            const audio = typeof data.audio === `string` ? JSON.parse(data.audio) : data.audio;
            const audioBuffer = Buffer.from(audio);
            const connection = await this.createTranscriptionConnection(
                userId,
                jobId,
                modelName,
                model,
                data,
                {
                    onTranscript: async (transcription) => {
                        fullTranscription += transcription;
                    },
                    onEnd: async () => {
                        resolve(fullTranscription);
                    },
                    onError: async (error) => {
                        resolve(error);
                    }
                }
            );
            connection.send(audioBuffer);
            connection.finish();
        });
    }

    async createTranscriptionConnection(
        userId: string,
        jobId: string,
        modelName: string,
        model: any,
        data: any,
        options: any = {}
    ): Promise<LiveClient> {
        return new Promise(async (resolve) => {
            const requestModel = await LucyAiManager.createRequest(userId, jobId, modelName, model, null, data);
            await LucyAiManager.continueOrWaitForModel(model.model, requestModel);
            const connection = this.deepgram.listen.live(
                {
                    model: 'nova-2',
                    language: data.language ?? 'pl'
                },
            );
            let fullTranscription = ``;
            connection.on(LiveTranscriptionEvents.Open, () => {
                connection.on(LiveTranscriptionEvents.Close, async () => {
                    LucyAiManager.endRequestForModel(model.model, requestModel);
                    requestModel.setState(RequestState.COMPLETED);
                    requestModel.setAnswer(fullTranscription);
                    await DataBaseManager.update(RequestModel.asModelClass(), requestModel);
                    if(options.onEnd) options.onEnd();
                });
                connection.on(LiveTranscriptionEvents.Transcript, async (data) => {
                    const transcription = data.channel.alternatives[0].transcript;
                    fullTranscription += transcription;
                    if(options.onTranscript) options.onTranscript(transcription);
                });
                connection.on(LiveTranscriptionEvents.Metadata, async (data) => {
                    const duration = data.metadata?.duration ?? data.duration;
                    const costs = requestModel.getCosts();
                    requestModel.setCosts({
                        milliseconds: (costs.milliseconds ?? 0) + duration * 1000
                    });
                    await DataBaseManager.update(RequestModel.asModelClass(), requestModel);
                    if (options.onMetadata) options.onMetadata(data);
                });
                connection.on(LiveTranscriptionEvents.Error, async (error) => {
                    console.error(error);
                    requestModel.setState(RequestState.FAILED);
                    await DataBaseManager.update(RequestModel.asModelClass(), requestModel);
                    if(options.onError) options.onError(error);
                });
                resolve(connection);
            });
        });
    }
}

export default GlobalContext.register(DeepGramManager);