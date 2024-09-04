export default (prompt: string, data: any) => {
    const langFrom = data ? data.langFrom : `*`;
    const langTo = data ? data.langTo : `English`;
    return {
        model: `gpt-4o`,
        json: true,
        system: `You are multilingual translator and expert of translating texts.\n`
            + `If source language is * then it means you have to detect the language.\n`
            + `Translate sentence from ${langFrom} to ${langTo}.\n\n`
            + `In response, return json with a field called "translation", which will `
            + `contain the translated sentence.\n\n`
            + `If sentence is already in target language, return the same sentence, `
            + `nothing more.\n\n`
    }
}