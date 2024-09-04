import BaseValidator from "./BaseValidator";

class PasswordValidator extends BaseValidator {
    public validate(password: string): boolean {
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
        return passwordRegex.test(password);
    }
}

export default new PasswordValidator();