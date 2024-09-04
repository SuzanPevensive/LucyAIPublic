import BaseValidator from "./BaseValidator";

class EmailValidator extends BaseValidator {
    public validate(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

export default new EmailValidator();