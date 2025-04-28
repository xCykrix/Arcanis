import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Definition } from './definition.ts';
import { StickyCommandGroup } from './group/sticky.ts';

export default class PinModule extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    await (new Definition()).initialize();
    await (new StickyCommandGroup()).initialize();
  }
}
