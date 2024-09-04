import {JobModel} from "../models/mongodb/JobModel";
import PlayHtManager from "../managers/PlayHtManager";

export default async (job: JobModel, model: any, prompt: any, data: any) => {
    return await PlayHtManager.speak(
        job.getUserId().toString(),
        job.getId().toString(),
        `speak`,
        model,
        prompt,
        data
    );
}