import {JobModel} from "../../models/mongodb/JobModel";
import fs from 'fs/promises';
import path from 'path';
import {randomUUID} from 'crypto';

export default async (job: JobModel, model: any, _: any, data: any) => {

    const questionsJson = await fs.readFile(path.join(process.cwd(), 'src', 'programs', 'said', 'data', 'questions.json'), 'utf-8');
    const questions = JSON.parse(questionsJson);
    const lang = data.lang;
    const question = data.question;
    
    // Find the relevant language data
    const langData = questions.find(data => data.lang === lang);
    if (!langData) {
        return null;
    }

    // Split the input question into words
    const inputWords = question.split(' ').map((word: string) => word.toLowerCase());

    //compre if the word have 80% of similarity
    const compareWords = (firstWord: string, secondWord: string) => {
        const minMatch = 0.75;
        return firstWord.split('').filter((char, index) => char === secondWord[index]).length >= firstWord.length * minMatch ||
        secondWord.split('').filter((char, index) => char === firstWord[index]).length >= secondWord.length * minMatch;
    }

    inputWords.forEach((word) => {
        for( const questionIndex in langData.questions) {
            const questionInstance = langData.questions[questionIndex];
            questionInstance.points = (questionInstance.points || 0) +
                questionInstance.tags.reduce((acc: number, tag: string) => acc + (compareWords(word, tag) ? 1 : 0), 0);
        }
    });
    
    const theBestQuestionScore = langData.questions.reduce((acc: number, question: any) => Math.max(acc, question.points), 0);
    if(theBestQuestionScore === 0) return null;
    const theBestSccoredQuestions = langData.questions.filter((question: any) => question.points === theBestQuestionScore);
    
    if (theBestSccoredQuestions.length > 1) {
        return theBestSccoredQuestions[Math.floor(Math.random() * theBestSccoredQuestions.length)];
    }
    return theBestSccoredQuestions.length === 1 ? theBestSccoredQuestions[0] : null;
    
}