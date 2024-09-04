import nodemailer, {Transporter} from "nodemailer";
import {EmailModel, EmailType} from "../models/mongodb/EmailModel";
import {EmailData, UserModel} from "../models/mongodb/UserModel";
import DataBaseManager from "./DataBaseManager";
import {ObjectId} from "mongodb";
import Mail from "nodemailer/lib/mailer";
import App from "../app";
import GlobalContext from "../GlobalContext";

class EmailManager {

    private defaultTransporter: Transporter;

    async init(){

        const config = App.getConfig();

        this.defaultTransporter = this.getTransporter(
            config.mailer.host,
            config.mailer.port,
            config.mailer.secure,
            config.mailer.tls,
            config.mailer.email,
            config.mailer.password
        );
    }

    public getTransporter(
        host: string,
        port: number,
        secure: boolean,
        tls: boolean,
        user: string,
        pass: string,
    ): Transporter {
        return nodemailer.createTransport({
            host, port, secure, requireTLS: tls,
            auth: {
                user: user,
                pass: pass
            },
        });
    }

    public getTypedTransporter(
        type: string,
        user: string,
        pass: string,
    ): Transporter {
        return nodemailer.createTransport({
            service: type,
            auth: {
                user: user,
                pass: pass
            },
        });
    }

    public getEmailSubjectAndContent(email: EmailModel, enterprise: UserModel): EmailData {
        const config = App.getConfig();
        if(email.getType() == EmailType.CHECKOUT) {
            return enterprise?.getEnterpriseData()?.smtpData?.emails?.checkout || config.mailer.emails.checkout;
        } else if(email.getType() == EmailType.REGISTER) {
            return enterprise?.getEnterpriseData()?.smtpData?.emails?.register || config.mailer.emails.register;
        } else if(email.getType() == EmailType.REMIND_PASSWORD) {
            return enterprise?.getEnterpriseData()?.smtpData?.emails?.remind_password || config.mailer.emails.remind_password;
        } else if(email.getType() == EmailType.CREATOR) {
            return config.mailer.emails.creator;
        }
    }

    private async sendRawEmail(
        transporter: Transporter,
        from: string,
        to: string,
        email: EmailData,
        code: string,
        data: any = null
    ){
        const config = App.getConfig();
        try {
            let content = email.content.replace(/{{code}}/g, code);
            if(data) {
                for (const key in data) {
                    content = content.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
                }
            }
            const mailOptions = {
                from, to,
                subject: email.subject,
                html: content,
            } as Mail.Options;
            const result = await transporter.sendMail(mailOptions);
            console.log('Email sent successfully:');
            console.log(result);
            return result;
        } catch (e) {
            console.log(`Error sending email`);
            console.log(e);
            return e;
        }
    }

    async sendEmail(email: EmailModel, data: any = null){
        const config = App.getConfig();
        const user: UserModel = await DataBaseManager.findOne(UserModel.asModelClass(), { _id: email.getUserId() }, false);
        if (!user) {
            console.log(`User not found`);
            return Error(`User not found`);
        }
        let transporter = this.defaultTransporter;
        let from = config.mailer.email;
        const enterpriseId = user.getEnterpriseId();
        let enterprise = null;
        if (enterpriseId) {
            enterprise = await DataBaseManager.findOne(UserModel.asModelClass(), { _id: enterpriseId });
            if (enterprise) {
                const enterpriseData = enterprise.getEnterpriseData();
                if (enterpriseData && enterpriseData.smtpData) {
                    console.log(`SMTP data:`, enterpriseData.smtpData);
                    transporter = this.getTransporter(
                        enterpriseData.smtpData.host,
                        enterpriseData.smtpData.port,
                        enterpriseData.smtpData.secure,
                        enterpriseData.smtpData.tls,
                        enterpriseData.smtpData.user,
                        enterpriseData.smtpData.pass
                    );
                    from = enterpriseData.smtpData.from ?? from;
                    const fromName = enterpriseData.smtpData.fromName;
                    if(fromName) {
                        from = `${fromName} <${from}>`;
                    }
                }
            }
        }
        const emailSubjectAndContent = this.getEmailSubjectAndContent(email, enterprise);
        const result = await this.sendRawEmail(
            transporter,
            from,
            email.getEmail(),
            emailSubjectAndContent,
            email.getCode(),
            data
        );
        return result;
    }

}

export default GlobalContext.register(EmailManager);