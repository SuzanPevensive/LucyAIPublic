import GlobalContext from "../GlobalContext";
import * as PlayHT from 'playht';
import LucyAiManager from "./LucyAiManager";
import {Readable} from "stream";

const PLAY_HT_USER_ID = '...';
const PLAY_HT_API_KEY = '...';

class PlayHtManager {

    async init() {
        PlayHT.init({
            userId: PLAY_HT_USER_ID,
            apiKey: PLAY_HT_API_KEY
        });
    }

    async speak(
        userId: string,
        jobId: string,
        modelName: string,
        model: any,
        _prompt: any,
        data: any
    ) {
        return new Promise(async (resolve) => {
            const requestModel = await LucyAiManager.createRequest(userId, jobId, modelName, model, _prompt, data);
            const streamingOptions = {
                voiceEngine: data.engine ?? "Standard",
                voiceId:  data.voiceId ?? "pl-PL-AgnieszkaNeural",
                quality: data.quality ?? 'premium',
                inputType: data.inputType ?? 'plain',
                speed: data.speed ?? 1,
            };
            await LucyAiManager.continueOrWaitForModel(model.model, requestModel);
            const prompt = typeof _prompt === 'string' ? Readable.from([_prompt]) : _prompt;
            prompt.on('data', (chunk) => {
                LucyAiManager.addCmpForModel(model.model, requestModel, chunk.length);
            });
            let stream = await PlayHT.stream(prompt, streamingOptions);
            let chunks = [];
            stream.on('data', function(chunk){ chunks.push(chunk); });
            stream.on('end', function(){
                const buffer = Buffer.concat(chunks);
                resolve(buffer);
            });
        });
    }

}

export default GlobalContext.register(PlayHtManager);