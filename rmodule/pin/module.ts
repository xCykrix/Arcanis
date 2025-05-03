import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Definition } from './definition.ts';
import { MessageCreateEvent } from './events/messageCreate.ts';
import { StickyCommandGroup } from './group/sticky.ts';
import { StickyPinSchedule } from './schedule/post.ts';

export default class PinModule extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    await (new Definition()).initialize();
    await (new StickyCommandGroup()).initialize();
    await (new StickyPinSchedule()).initialize();
    await (new MessageCreateEvent()).initialize();
  }
}
