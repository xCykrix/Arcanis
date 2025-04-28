import type { Bootstrap } from '../../mod.ts';
import { asyncInterceptor, createIncidentEvent } from '../logging/optic.ts';

export type EventParameters<T extends keyof typeof Bootstrap.bot.events> = Parameters<NonNullable<typeof Bootstrap.bot.events[T]>>;

export class EventManager {
  private events: {
    // any[] is required to allow generic type inference.
    // deno-lint-ignore no-explicit-any
    [key in keyof typeof Bootstrap.bot.events]: Set<(...args: any[]) => Promise<void>>;
  } = {};

  public constructor(bot: typeof Bootstrap.bot) {
    for (const k of Object.keys(bot.events)) {
      const key = k as keyof typeof bot.events;
      this.events[key] = new Set();
    }
    for (const k of Object.keys(bot.events)) {
      const key = k as keyof typeof bot.events;
      bot.events[key] = (...args) => {
        for (const callback of this.events[key]!) {
          asyncInterceptor(key, async (...args) => {
            await callback(...args);
          }, ...args);
          callback(...args).catch((e: Error) => {
            createIncidentEvent(crypto.randomUUID(), `Unhandled EventManager Exception in '${key}'.`, e);
          });
        }
      };
    }
  }

  public add<T extends keyof typeof Bootstrap.bot.events>(event: T, callback: (...args: EventParameters<T>) => Promise<void>): void {
    this.events[event]?.add(callback);
  }
}
