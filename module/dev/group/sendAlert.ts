import { ChannelTypes, type MessageComponent, MessageComponentTypes, TextStyles } from '@discordeno';
import { getLang } from '../../../constants/lang.ts';
import { GroupBuilder } from '../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../lib/generic/initializable.ts';
import { KVC } from '../../../lib/kvc/kvc.ts';
import { Responses } from '../../../lib/util/helper/responses.ts';
import type { DevDefinition } from '../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      DevDefinition['send-alert'],
      DevDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'dev',
          componentTopLevel: 'component.dev',
          guidTopLevel: 'dev.send-alert',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          requireGuild: false,
          requireDeveloper: true,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: [],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args?.['send-alert'] === undefined,
            pick: args?.['send-alert'] ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return;

          // Respond
          await interaction.respond({
            customId: await assistant.makeComponentCallback({
              ref: 'alertDispatch',
              timeToLive: 900,
              userId: interaction.user.id,
              constants: [],
            }),
            title: 'Global Message Dispatch',
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.InputText,
                    customId: 'text',
                    label: 'Message Text',
                    style: TextStyles.Paragraph,
                    minLength: 1,
                    maxLength: 2000,
                    placeholder: 'Enter the message in this field with Markdown.',
                    required: true,
                  },
                ],
              },
            ],
          });
          return;
        },
      })
      .createGroupComponentHandler({
        ref: 'alertDispatch',
        handle: async ({ interaction, assistant }) => {
          await interaction.defer();

          // Get Component
          const component = assistant.parseModal<{
            text: string;
          }>(interaction.data!.components as MessageComponent[]);

          // Trim and Validate
          if (component.text === undefined || (component.text?.length ?? 0) === 0 || (component.text ?? '').trim() === '') {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('dev', 'send-alert', 'invalid.message')),
            });
            return;
          }

          // Assign to Dispatcher
          await KVC.persistd.dispatchedAlert.add({
            dispatchEventId: crypto.randomUUID(),
            message: component.text!,
          }, {
            expireIn: 60000,
          });

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('dev', 'send-alert', 'result')),
          });
        },
      });
  }
}
