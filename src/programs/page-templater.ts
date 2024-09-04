import axios from "axios";
import {replaceAsync, shuffle} from "../utils";
import {JobModel} from "../models/mongodb/JobModel";
import LucyAiManager from "../managers/LucyAiManager";
import path from "path";
import App from "../app";
import fs from "fs";

const showdown = require("showdown");
const converter = new showdown.Converter();

const clearHtmlArtifacts = (text: string) => {
    return `${text}`
        .replace(/((p|b|i|u|div|span|font|img)?&gt;|&lt;(p|b|i|u|div|span|font|img)?)/g, ``);
}
const stripHtml = (html: string) => {
    return clearHtmlArtifacts(converter.makeHtml(`${html}`).replace(/((<|&lt;)([^>]+?)(>|&gt;))/gi, ``));
}

const makeHtml = (text: string) => {
    return clearHtmlArtifacts(
        converter.makeHtml(
            `${text}`
                .replace(/<h\d/g, `<h2`)
                .replace(/^\s*(#|###+)/gm, `##`)
        )
    );
}

export default async (job: JobModel, model: any, prompt: any, data: any) => {

    const config = App.getConfig();

    const action = data.action;
    const aiModelName = data.algorithm ?? model.model;
    const isTheSameLanguage = data.pageLanguage === data.language;
    const host = data.host;
    const pageId = data.pageId;
    const secretKey = data.secretKey;
    const subModeId = data.mode;
    const modesJson = await fs.promises.readFile(path.join(process.cwd(), `data`, `submodes.json`), `utf8`);
    const modes = JSON.parse(modesJson);
    const subModes = modes[`page-templater`] ?? modes[`default`];
    const subMode = subModes.find((subMode: { id: string }) => subMode.id === subModeId) ?? subModes[0];
    const subModePrompt = subMode.prompt;

    const hostPath = `${host}/wp-json/${config.server.testMode ? `test-` : ``}said-plugins/page-templater`

    const jobId = job.getId().toString();
    const userId = job.getUserId().toString();

    const tokens: { prev: string, type?: string, openTag?: string, closeTag?: string }[] = [];

    let questionsGroups = (data.questionsGroups ?? []).map(group => {
        group.index = 0;
        group.questions = shuffle(group.questions);
        return group;
    });
    const openTag = '(\\[|`\\{`)';
    const closeTag = '(\\]|`\\}`)';

    let pageContent = data.pageContent;
    pageContent = pageContent.replace(new RegExp(`${openTag}city${closeTag}`, `g`), data.city);

    pageContent =
        pageContent.replace(/\[rand](.+?)\[\/rand]/g, (match: string, randValuesString: string) => {
            const randValues = randValuesString.split(`/`);
            return shuffle(randValues)[0] ?? ``;
        });

    while (1) {
        const tokenRegExp = new RegExp(`${openTag}said_(.+?)${closeTag}`);
        const tokenMatch = tokenRegExp.exec(pageContent);
        if (tokenMatch) {
            const token = tokenMatch[0];
            const type = tokenMatch[2];
            const openTag = tokenMatch[1];
            const closeTag = tokenMatch[3];
            const tokenIndex = tokenMatch.index;
            const prev = pageContent.substring(0, tokenIndex);
            tokens.push({prev, type, openTag, closeTag});
            pageContent = pageContent.substring(tokenIndex + token.length);
        } else {
            tokens.push({prev: pageContent});
            break;
        }
    }

    const modelSystem =
        `You are multilingual writer and expert of creating articles and websites content. `
        + `You always help website owners in writing professional articles.\n`
        + `Sometimes you only write short texts of a few sentences, if the website owner wants it.\n`
        + `${subModePrompt}\n\n`
        + `Don't add \`\`\` section separators for example: "\`\`\`html" - don't add it\n\n`
    let lastHeader = null;
    let lastQuestion = null;

    let resultHtml = ``;

    while (tokens.length > 0) {
        const token = tokens[0];
        const nextToken = tokens[1];
        if (!nextToken) {
            resultHtml += token.prev;
            break;
        }
        if (token.type !== `header` && token.type !== `content`) {
            lastHeader = null;
        }
        if (token.type !== `question` && token.type !== `answer`) {
            lastQuestion = null;
        }
        if (token.type === `text` || token.type === `raw_text`) {
            const textTokenCloseRegExp = new RegExp(`${openTag}/said_${token.type}${closeTag}`);
            const textTokenCloseIndex = nextToken.prev.search(textTokenCloseRegExp);
            if (textTokenCloseIndex !== -1) {
                let textInstructions = nextToken.prev.substring(0, textTokenCloseIndex);
                nextToken.prev = nextToken.prev.substring(textTokenCloseIndex);
                nextToken.prev = nextToken.prev.replace(textTokenCloseRegExp, ``);
                if (!isTheSameLanguage) {
                    const translatedTextInstructionsJsonString = await LucyAiManager.ask(
                        userId,
                        jobId,
                        `translator`,
                        textInstructions,
                        {langFrom: `*`, langTo: data.language}
                    );
                    textInstructions = JSON.parse(translatedTextInstructionsJsonString).translation ?? textInstructions;
                }
                if(action !== `translate`) {
                    const textModel = {
                        model: aiModelName,
                        system: modelSystem,
                        user: `Write the text according to the instructions:\n\n`
                            + `${textInstructions}\n\n`
                            + (token.type === `text` ? `Instructions apply to the city: ${data.city}\n\n` : ``)
                            + `Write the text in the ${data.language} language.\n\n`
                    }
                    let result = ``;
                    while (result === `` || result === `This is custom heading element`) {
                        result = stripHtml(await LucyAiManager.askForModel(
                            userId,
                            jobId,
                            `page-templater`,
                            textModel
                        ));
                    }
                    resultHtml += token.prev + result;
                } else {
                    const translatedTextPrevString = await LucyAiManager.ask(
                        userId,
                        jobId,
                        `translator`,
                        token.prev,
                        {langFrom: data.pageLanguage, langTo: data.language}
                    );
                    token.prev = JSON.parse(translatedTextPrevString).translation ?? token.prev;
                    resultHtml += token.prev + token.openTag + `said_text` + token.closeTag
                        + textInstructions
                        + token.openTag + `/said_text` + token.closeTag;
                }
            }
        } else if (token.type === `header` || token.type === `random_line` || token.type.indexOf(`shuffle_lines`) === 0) {
            const isHeader = token.type === `header`;
            const isShuffle = token.type.indexOf(`shuffle_lines`) === 0;
            const closeTagType = isShuffle ? `shuffle_lines` : token.type;
            const headerTokenCloseRegExp = new RegExp(`${openTag}/said_${closeTagType}${closeTag}`);
            const headerTokenCloseIndex = nextToken.prev.search(headerTokenCloseRegExp);
            if (headerTokenCloseIndex !== -1) {
                let headerInstructions: string = nextToken.prev.substring(0, headerTokenCloseIndex);
                nextToken.prev = nextToken.prev.substring(headerTokenCloseIndex);
                nextToken.prev = nextToken.prev.replace(headerTokenCloseRegExp, ``);
                if(action === `translate`) {
                    const translatedHeaderInstructionsJsonString = await LucyAiManager.ask(
                        userId,
                        jobId,
                        `translator`,
                        headerInstructions,
                        {langFrom: data.pageLanguage, langTo: data.language}
                    );
                    headerInstructions = JSON.parse(translatedHeaderInstructionsJsonString).translation ?? headerInstructions;
                    const translatedHeaderPrevString = await LucyAiManager.ask(
                        userId,
                        jobId,
                        `translator`,
                        token.prev,
                        {langFrom: data.pageLanguage, langTo: data.language}
                    );
                    token.prev = JSON.parse(translatedHeaderPrevString).translation ?? token.prev;
                    resultHtml += token.prev + token.openTag + `said_${token.type}` + token.closeTag
                        + headerInstructions
                        + token.openTag + `/said_${closeTagType}` + token.closeTag;
                } else {
                    const possibleHeaders: string[] = [];
                    let headerTemplate = isHeader ? `[header]` : `[random_line]`;
                    const headerRegExp =
                        new RegExp(`${openTag}${isHeader ? `header` : `random_line`}${closeTag}`, `g`);
                    headerInstructions = isShuffle ? headerInstructions : headerInstructions.replace(/(^|\/|$)/g, `\n`);
                    headerInstructions.replace(/^(.+?)$/gm, (match: string, _header: string) => {
                        const header = _header.replace(/\/$/g, ``).trim();
                        if (headerRegExp.test(header)) {
                            headerTemplate = header;
                        } else if (header) {
                            possibleHeaders.push(header);
                        }
                        return match;
                    });
                    if (isShuffle) {
                        const numberOfLines = parseInt(token.type.split(`-`)[1]);
                        const firstLine = possibleHeaders[0].trim();
                        const isList = firstLine === `<ul>` || firstLine === `<ol>`;
                        if (isList) {
                            possibleHeaders.shift();
                            possibleHeaders.pop();
                        }
                        let shuffledLines: any = shuffle(possibleHeaders);
                        if (!isNaN(numberOfLines) && numberOfLines > 0) {
                            shuffledLines = shuffledLines.slice(0, numberOfLines);
                        }
                        shuffledLines = shuffledLines.join(`\n`);
                        if (!isTheSameLanguage) {
                            const translatedRandomHeaderJsonString =
                                await LucyAiManager.ask(
                                    userId,
                                    jobId,
                                    `translator`,
                                    shuffledLines,
                                    {langFrom: `*`, langTo: data.language}
                                );
                            const translatedRandomHeaderJson = JSON.parse(translatedRandomHeaderJsonString);
                            shuffledLines = translatedRandomHeaderJson.translation ?? shuffledLines;
                        }
                        shuffledLines = isList ? `<ul>\n${shuffledLines}\n</ul>` : shuffledLines;
                        resultHtml += token.prev + shuffledLines;
                    } else {
                        let randomHeader = shuffle(possibleHeaders)[0];
                        if (!isTheSameLanguage) {
                            const translatedRandomHeaderJsonString =
                                await LucyAiManager.ask(
                                    userId,
                                    jobId,
                                    `translator`,
                                    randomHeader,
                                    {langFrom: `*`, langTo: data.language}
                                );
                            const translatedRandomHeaderJson = JSON.parse(translatedRandomHeaderJsonString);
                            randomHeader = translatedRandomHeaderJson.translation ?? randomHeader;
                        }
                        lastHeader = headerTemplate.replace(headerRegExp, randomHeader);
                        lastHeader = stripHtml(lastHeader);
                        lastHeader = isHeader ? `<h2>${lastHeader}</h2>` : lastHeader;
                        resultHtml += token.prev + lastHeader;
                        if (!isHeader) lastHeader = null;
                    }
                }
            }
        } else if (token.type === `content`) {
            const contentTokenCloseRegExp = new RegExp(`${openTag}/said_content${closeTag}`);
            const contentTokenCloseIndex = nextToken.prev.search(contentTokenCloseRegExp);
            if (contentTokenCloseIndex !== -1) {
                let contentInstructions = nextToken.prev.substring(0, contentTokenCloseIndex);
                nextToken.prev = nextToken.prev.substring(contentTokenCloseIndex);
                nextToken.prev = nextToken.prev.replace(contentTokenCloseRegExp, ``);
                if (!isTheSameLanguage) {
                    const translatedContentInstructionsJsonString =
                        await LucyAiManager.ask(
                            userId,
                            jobId,
                            `translator`,
                            contentInstructions,
                            {langFrom: `*`, langTo: data.language}
                        );
                    const translatedContentInstructionJson = JSON.parse(translatedContentInstructionsJsonString);
                    contentInstructions = translatedContentInstructionJson.translation ?? contentInstructions;
                }
                if (action !== `translate`) {
                    const contentModel = {
                        model: aiModelName,
                        system: modelSystem,
                        user: `Write the content according to the instructions:\n\n`
                            + `${contentInstructions}\n\n`
                            + `Instructions apply to the city: ${data.city}\n\n`
                            + (lastHeader ?
                                `The title of the article is:\n${stripHtml(lastHeader)}\n`
                                + `but it's only information for better cquestionModelResultsJsonStringontext, `
                                + `you shouldn't to include it in the content.\n\n` : ``)
                            + `Write the content in the ${data.language} language.`
                    }
                    resultHtml += token.prev + makeHtml(
                        await LucyAiManager.askForModel(
                            userId,
                            jobId,
                            `page-templater`,
                            contentModel,
                            null,
                            null
                        )
                    );
                } else {
                    const translatedContentPrevString = await LucyAiManager.ask(
                        userId,
                        jobId,
                        `translator`,
                        token.prev,
                        {langFrom: data.pageLanguage, langTo: data.language}
                    );
                    token.prev = JSON.parse(translatedContentPrevString).translation ?? token.prev;
                    resultHtml += token.prev + token.openTag + `said_content` + token.closeTag
                        + contentInstructions
                        + token.openTag + `/said_content` + token.closeTag;
                }
            }
        } else if (token.type.indexOf(`question`) === 0 && action !== `translate`) {
            if (nextToken.type === `answer`) {
                const questionGroupName = token.type.split(`-`)[1] ?? `all`;
                const questionGroup = questionsGroups.find(group => group.name === questionGroupName);
                if(!questionGroup) {
                    resultHtml += token.prev;
                    tokens.shift();
                    continue;
                }
                lastQuestion = questionGroup.questions[questionGroup.index];
                if (lastQuestion) {
                    questionGroup.index += 1;
                    if(questionGroup.index >= questionGroup.questions.length) {
                        questionGroup.index = 0;
                        questionGroup.questions = shuffle(questionGroup.questions);
                        if(questionGroup.questions.length > 1){
                            while (questionGroup.questions[0].id === lastQuestion.id) {
                                questionGroup.questions = shuffle(questionGroup.questions);
                            }
                        }
                    }
                    let questionInstructions = stripHtml(lastQuestion.question);
                    let answerInstructions = stripHtml(lastQuestion.answer);
                    if (!isTheSameLanguage) {
                        const translatedQuestionInstructionsJsonString = await LucyAiManager.ask(
                            userId,
                            jobId,
                            `translator`,
                            `${questionInstructions}\n\n${answerInstructions}`,
                            {langFrom: `*`, langTo: data.language}
                        );
                        const translatedInstructionsJson = JSON.parse(translatedQuestionInstructionsJsonString);
                        const translatedInstructions = translatedInstructionsJson.translation ?? ``;
                        const translatedInstructionsParts = translatedInstructions.split(`\n\n`);
                        questionInstructions = translatedInstructionsParts[0] ?? questionInstructions;
                        answerInstructions = translatedInstructionsParts.slice(1).join(`\n\n`) ?? answerInstructions;

                    }
                    const questionModel = {
                        model: aiModelName,
                        system: modelSystem,
                        json: true,
                        user: `Rewrite this question keeping its meaning:\n`
                            + `${questionInstructions}\n\n`
                            + `and then write the answer to this question according to the instructions:\n`
                            + `${answerInstructions}\n\n`
                            + `Question and answer should to apply to the city: ${data.city}\n\n`
                            + `Write in the ${data.language} language.\n\n`
                            + `The result should be a json object like the following:\n`
                            + `{"question": "[Generated question]", "answer": "[Generated answer]"}`
                    }
                    const questionModelResultsJsonString = await LucyAiManager.askForModel(
                        userId,
                        jobId,
                        `page-templater`,
                        questionModel,
                        null,
                        null
                    )
                    const questionModelResultsJson = JSON.parse(questionModelResultsJsonString);
                    lastQuestion.question = questionModelResultsJson.question ?? lastQuestion.question;
                    lastQuestion.answer = questionModelResultsJson.answer ?? lastQuestion.answer;
                    resultHtml += token.prev + lastQuestion.question;
                } else {
                    resultHtml += token.prev;
                }
            } else {
                resultHtml += token.prev;
            }
        } else if (token.type === `answer` && action !== `translate`) {
            if (lastQuestion) {
                resultHtml += token.prev + lastQuestion.answer;
            } else {
                resultHtml += token.prev;
            }
        } else {
            resultHtml += token.prev + token.openTag + `said_${token.type}` + token.closeTag;
        }
        tokens.shift();
    }

    if(action !== `translate`) {

        const groups = data.imagesGroups.map(group => {
            group.images = shuffle(
                group.images.filter(
                    (image: { id: string }) => image && image.id !== ''
                )
            );
            group.index = 0;
            return group;
        });

        for (const group of groups) {

            const name = group.name;
            const saidPageTemplaterImageToken = `said-page-templater-image-${name}`;

            const replaceSrc = async () => {
                const selectedImage = group.images[group.index];
                if (group.index < group.images.length - 1) {
                    group.index += 1;
                } else {
                    group.index = 0;
                    group.images = shuffle(group.images);
                    if (group.images.length > 1) {
                        while (group.images[0].id === selectedImage.id) {
                            group.images = shuffle(group.images);
                        }
                    }
                }
                const selectedImageId = selectedImage.id;
                const getImageResponse = await axios.post(`${hostPath}/get-image`, {
                    image_id: selectedImageId
                });
                return getImageResponse.data.image_url;
            };

            resultHtml = await replaceAsync(
                resultHtml,
                new RegExp(`${openTag}${saidPageTemplaterImageToken}${closeTag}`, `g`),
                replaceSrc
            );
        }
    }

    await axios.post(`${hostPath}/update`, {
        page_id: pageId,
        secret_key: secretKey,
        page_content: resultHtml
    });
}