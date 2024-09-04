const globalContext = global as any;

class GlobalContext {
    get(name: string): any {
        return globalContext[name];
    }

    set(name: string, value: any): void {
        globalContext[name] = value;
    }

    static register<T>(clazz: { new(): T }): T {
        if (!globalContext[clazz.name]) {
            globalContext[clazz.name] = new clazz();
        }
        return globalContext[clazz.name];
    }

    register<T>(clazz: { new(): T }): T {
        return GlobalContext.register(clazz);
    }

    remove(name: string): void {
        delete globalContext[name];
    }

    has(name: string): boolean {
        return globalContext[name] !== undefined;
    }

    clear(): void {
        for (const name in globalContext) {
            delete globalContext[name];
        }
    }

    getKeys(): string[] {
        return Object.keys(globalContext);
    }

    getValues(): any[] {
        return Object.values(globalContext);
    }
}

export default GlobalContext.register(GlobalContext);