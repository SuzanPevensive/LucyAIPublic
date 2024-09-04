export function shuffle(originArray: any[]) {
    if(!Array.isArray(originArray)) return [];
    const array = [...originArray];
    let currentIndex = array.length;
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

export async function replaceAsync(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (...matches: any[]) => {
        promises.push(asyncFn(matches));
        return matches[0];
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}

export function replaceForTests(config: any, _code: string){
    let code = _code
        .replace(/\{\{test-name-postfix}}/g, config.server.testMode ? `- Test` : ``)
        .replace(/\{\{test-url-prefix}}/g, config.server.testMode ? `test.` : ``)
        .replace(/\{\{test-prefix}}/g, config.server.testMode ? `test-` : ``);
    if (config.server.testMode) {
        code = code
            .replace(/said_/g, `test_said_`)
            .replace(/SAID_/g, `TEST_SAID_`)
            .replace(/https:\/\/api./g, `https://test.api.`)
            .replace(/https:\/\/gui.api./g, `https://test.gui.api.`)
            .replace(/said-/g, `test-said-`)
            .replace(/Said([A-Z])/g, `TestSaid$1`);
    }
    code = code
        .replace(/said\|/g, `said`)
        .replace(/SAID\|/g, `SAID`);
    return code;
}

export async function wait(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}