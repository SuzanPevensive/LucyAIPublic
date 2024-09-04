import DataBaseManager from "./DataBaseManager";
import GlobalContext from "../GlobalContext";
import {JobModel, JobState} from "../models/mongodb/JobModel";
import LucyAiManager from "./LucyAiManager";

const CHECKER_INTERVAL = 10 * 1000;

class JobsManager {

    async init(){
        await this.checkerIteration(true);
        setInterval(() => {
            this.checkerIteration();
        }, CHECKER_INTERVAL);
    }

    async checkerIteration(firstRun = false){

        const allQueuesJobModels = await DataBaseManager.aggregate(
            JobModel.asModelClass(),
            [
                {
                    $group: {
                        _id: "$queue",
                        queue: {$first: "$queue"}
                    }
                }
            ]
        );
        const allQueues = allQueuesJobModels.map((jobModel: JobModel) => jobModel.getQueue());

        for(const queue of allQueues){
            const jobInProgress = await DataBaseManager.findOne(
                JobModel.asModelClass(),
                {
                    state: JobState.IN_PROGRESS,
                    queue
                }
            );
            if (!jobInProgress) {
                const nextJob = await DataBaseManager.findOne(
                    JobModel.asModelClass(),
                    {
                        state: JobState.QUEUED,
                        queue
                    }
                );
                if (nextJob) {
                    LucyAiManager.ask(
                        nextJob.getUserId().toString(),
                        nextJob.getId().toString(),
                        nextJob.getModelName(),
                        nextJob.getPrompt(),
                        nextJob.getData()
                    );
                }
            } else if(firstRun) {
                LucyAiManager.ask(
                    jobInProgress.getUserId().toString(),
                    jobInProgress.getId().toString(),
                    jobInProgress.getModelName(),
                    jobInProgress.getPrompt(),
                    jobInProgress.getData()
                );
            }
        }

    }

}

export default GlobalContext.register(JobsManager);