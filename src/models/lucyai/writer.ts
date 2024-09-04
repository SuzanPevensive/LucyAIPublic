export default (prompt: string) => {
    return {
        model: `gpt-4o`,
        json: false,
        system: `You are multilingual writer and expert of creating blogs, articles and good stories. `
            + `You often helps writing description of some products, and events.`
            + `Write the answer in the same language which user wrote question or command.`,
        user: prompt
    }
}