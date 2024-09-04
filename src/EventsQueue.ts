interface EventsQueueEvent {
    name: string,
    call: (...any: any) => Promise<void>,
    args?: any[],
    minDelay?: number,
    lastCallTime?: number,
}

const EventsQueue = new (
    class EventsQueue {

        private events: EventsQueueEvent[] = [];

        constructor() {
            this.tick();
        }

        getEvent(name: string) {
            return this.events.find((event) => {
                return event.name == name
            });
        }

        setEvent(name: string, call: (...any: any) => Promise<void>, args?: any[], minDelay?: number) {
            const matchedEvent = this.getEvent(name);
            const indexAppend = matchedEvent ? this.events.indexOf(matchedEvent) : -1;
            const event = {name, call, args, minDelay};
            if (indexAppend != -1) {
                this.events[indexAppend] = event;
            } else {
                this.events.push(event);
            }
        }

        removeEvent(name: string) {
            const matchedEvent = this.getEvent(name);
            const indexAppend = matchedEvent ? this.events.indexOf(matchedEvent) : -1;
            if (indexAppend != -1) {
                this.events.splice(indexAppend, 1);
            }
        }

        private tick = async () => {
            for (let event of this.events) {
                const now = Date.now();
                const lastCallTime = event.lastCallTime ?? 0;
                const minDelay = event.minDelay ?? 0;
                if(now - lastCallTime >= minDelay){
                    event.lastCallTime = now;
                    const args = event.args ?? [];
                    await event.call(...args);
                }
            }
            setTimeout(this.tick, 0);
        }

    }
);