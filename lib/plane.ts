import type { EventManager } from './manager/event.ts';
import { InjectionManager } from './util/injection.ts';

export class Plane {
  public static event: EventManager;
  public static injection: InjectionManager = new InjectionManager();
}
