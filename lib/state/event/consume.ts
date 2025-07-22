import { commandOptionsParser } from '@discordeno';
import { AsyncInitializable } from '../../generic/initializable.ts';
import { Plane } from '../../plane.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Plane.event.add('interactionCreate', async (interaction) => {
      const args = commandOptionsParser(interaction);
      // TODO: Build path based on Plane.injection.handlers key.
      // TODO: Read the handler from path and execute after confirmations.
    });
  }
}
