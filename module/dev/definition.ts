import { ApplicationCommandOptionTypes } from '@discordeno';
import { AsyncInitializable } from '../../lib/generic/initializable.ts';
import { Bootstrap } from '../../mod.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    Bootstrap.globalChatInputInteraction.add({
      name: 'dev',
      description: 'Developer Operations Module.',
      options: [
        {
          name: 'eval',
          description: 'Evaluate Arbitrary Code at Runtime. Uses a Modal. Secure.',
          type: ApplicationCommandOptionTypes.SubCommand,
          options: [
            {
              name: 'depth',
              description: 'The inspection depth of objects.',
              type: ApplicationCommandOptionTypes.Integer,
              minValue: 1,
              maxValue: 10,
              required: false,
            },
          ],
        },
      ],
    });
  }
}

export type DevEval = {
  eval?: {
    depth?: number;
  };
};
