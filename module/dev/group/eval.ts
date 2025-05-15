import { ChannelTypes, type MessageComponent, MessageComponentTypes, TextStyles } from '@discordeno';
import { getLang } from '../../../constants/lang.ts';
import { GroupBuilder } from '../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../lib/generic/initializable.ts';
import { stringify } from '../../../lib/util/helper/stringify.ts';
import { Optic } from '../../../lib/util/optic.ts';
import type { DevEval } from '../definition.ts';

export default class extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<DevEval>()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'dev',
          componentTopLevel: 'component.dev',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText, ChannelTypes.GuildForum, ChannelTypes.GuildMedia, ChannelTypes.DM],
          requireGuild: false,
          requireDeveloper: true,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: [],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        inhibitor: ({ args }) => {
          return args.eval === undefined;
        },
        handle: async ({ interaction, args, assistant }) => {
          await interaction.respond({
            customId: await assistant.makeComponentCallback({
              ref: 'eval.consume-modal',
              timeToLive: 10,
              userId: interaction.user.id,
              constants: [
                `${args.eval!.depth ?? 2}`,
              ],
            }),
            title: 'Evaluation Form',
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.InputText,
                    customId: 'typescript',
                    label: 'TypeScript',
                    style: TextStyles.Paragraph,
                    minLength: 1,
                    maxLength: 4000,
                    required: true,
                  },
                ],
              },
            ],
          });
        },
      }).createGroupComponentHandler({
        ref: 'eval.consume-modal',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.deferEdit();

          // Get Component Data
          const components = assistant.parseModal<{
            typescript: string;
          }>(interaction.data!.components as MessageComponent[]);

          let result = getLang('eval', 'result.default');
          try {
            // deno-lint-ignore no-eval
            result = await eval(`(async () => { ${components.typescript!} })();`);
          } catch (e) {
            Optic.incident({
              moduleId: 'eval.consume-modal',
              message: 'Failed to Evaludate',
              err: e as Error,
            });
          }

          let cleaned = await stringify(result, parseInt(constants[0]!));
          if (cleaned === 'undefined') cleaned = getLang('eval', 'result.undefined')!;
          await interaction.respond({
            content: ['```', `${cleaned}`, '```'].join('\n'),
          });
        },
      });
  }
}
