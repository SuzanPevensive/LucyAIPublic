export default (prompt: string) => {
    return {
        model: `gpt-4o`,
        json: false,
        system: `You are a professional analyst and creator of image descriptions.`,
        user: [
            {
                "type": "text",
                "text": "Describe the attached picture in great detail"
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": prompt
                }
            }
        ]
    }
}