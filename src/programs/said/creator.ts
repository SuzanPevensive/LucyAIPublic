import {JobModel} from "../../models/mongodb/JobModel";
import DataBaseManager from "../../managers/DataBaseManager";
import EmailManager from "../../managers/EmailManager";
import {EmailModel, EmailType} from "../../models/mongodb/EmailModel";

export default async (job: JobModel, model: any, _: any, data: any) => {

    const newEmail = new EmailModel(`zuzanna.kowaliszyn@gmail.com`, job.getUserId(), EmailType.CREATOR);
    await DataBaseManager.add(EmailModel.asModelClass(), newEmail);
    await EmailManager.sendEmail(newEmail, data);

    return {
        success: true
    }
    
}