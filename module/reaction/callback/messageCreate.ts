import { Initializable } from '../../../lib/generic/initializable.ts';
import { Bootstrap } from '../../../mod.ts';

export class ReactionInteractionComponentHandler extends Initializable {
  public override initialize(): Promise<void> | void {
    Bootstrap.event.add('messageCreate', async () => {
    });
  }
}
