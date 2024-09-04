import {JobModel} from "../models/mongodb/JobModel";
import App from "../app";
import DeepGramManager from "../managers/DeepGramManager";

export default async (job: JobModel, model: any, prompt: any, data: any) => {

    const connectionOptions = data.connectionOptions ?? false;
    return connectionOptions ? await DeepGramManager.createTranscriptionConnection(
        job.getUserId().toString(),
        job.getId().toString(),
        `transcript`,
        model,
        data,
        connectionOptions
    ) : await DeepGramManager.transcript(
        job.getUserId().toString(),
        job.getId().toString(),
        `transcript`,
        model,
        data
    );

}