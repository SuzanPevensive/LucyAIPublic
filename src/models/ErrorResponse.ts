export enum ErrorResponseType {
    DATA_INVALID = `data-empty`,
    EMAIL_INCORRECT = `email-incorrect`,
    PASSWORD_INCORRECT = `password-incorrect`,
    PASSWORD_CONFIRM_INCORRECT = `password-confirm-incorrect`,
    USER_ALREADY_EXISTS = `user-already-exists`,
    USER_NOT_FOUND = `user-not-found`,
    USER_NOT_ACTIVE = `user-not-active`,
    USER_ALREADY_ACTIVE = `user-already-active`,
    SESSION_NOT_FOUND = `session-not-found`,
    WRONG_ACCOUNT_PERMISSIONS = `wrong-account-permissions`,
    EMAIL_NOT_FOUND = `email-not-found`,
}

export class ErrorResponse{
    type: ErrorResponseType
    message: string
    constructor(type: ErrorResponseType, message: string) {
        this.type = type;
        this.message = message;
    }
}