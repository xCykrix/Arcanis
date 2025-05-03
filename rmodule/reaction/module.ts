import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Definition } from './definition.ts';
import { MessageCreateEvent } from './events/messageCreate.ts';
import { ReactionAddEvent } from './events/reactionAdd.ts';
import { AutoCommandGroup } from './group/auto.ts';
import { ForwardCommandGroup } from './group/forward.ts';

export default class ReactionModule extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    await (new Definition()).initialize();
    await (new AutoCommandGroup()).initialize();
    await (new ForwardCommandGroup()).initialize();
    await (new MessageCreateEvent()).initialize();
    await (new ReactionAddEvent()).initialize();
  }
}
