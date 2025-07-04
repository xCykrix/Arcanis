import { ButtonStyles, ChannelTypes, type MessageComponent, MessageComponentTypes, type TextInputComponent, TextStyles } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['pin']['add-template'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.pin.template-add',
          guidTopLevel: 'message.template-pin',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          requireGuild: true,
          requireDeveloper: false,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: ['MANAGE_MESSAGES'],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args?.pin?.['add-template'] === undefined,
            pick: args?.pin?.['add-template'] ?? null,
          };
        },
        handle: async ({ interaction, args, assistant }) => {
          if (args === null) return; // Assertion

          // Fetch Database
          const input: TextInputComponent = {
            type: MessageComponentTypes.TextInput,
            customId: 'text',
            label: 'Message Text',
            style: TextStyles.Paragraph,
            minLength: 1,
            maxLength: 2000,
            placeholder: 'Enter the message in this field with Markdown.',
            required: true,
          };

          // Respond Modal
          await interaction.respond({
            customId: await assistant.makeComponentCallback({
              ref: 'consumeModal',
              timeToLive: 900,
              userId: interaction.user.id,
              constants: new Set([
                args.name,
              ]),
            }),
            title: 'Pinned Message Template Editor',
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  input,
                ],
              },
            ],
          });
          return;
        },
      }).createGroupComponentHandler({
        ref: 'consumeModal',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.deferEdit();

          // Get Component
          const component = assistant.parseModal<{
            text: string;
          }>(interaction.data!.components as MessageComponent[]);

          // Trim and Validate
          if (component.text === undefined || (component.text?.length ?? 0) === 0 || (component.text ?? '').trim() === '') {
            await interaction[constants.values().toArray()[1] === 'editing' ? 'edit' : 'respond']({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'pin', 'invalid.message')),
            });
            return;
          }

          await interaction[constants.values().toArray()[1] === 'editing' ? 'edit' : 'respond']({
            content: component.text,
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.Button,
                    customId: await assistant.makeComponentCallback({
                      ref: 'modalConfirm',
                      timeToLive: 300,
                      userId: interaction.user.id.toString(),
                      constants: new Set([
                        constants.values().toArray()[0],
                        component.text,
                      ]),
                    }),
                    style: ButtonStyles.Primary,
                    label: 'Save',
                  },
                  {
                    type: MessageComponentTypes.Button,
                    customId: await assistant.makeComponentCallback({
                      ref: 'modalEdit',
                      timeToLive: 300,
                      userId: interaction.user.id.toString(),
                      constants: new Set([
                        constants.values().toArray()[0],
                        component.text,
                      ]),
                    }),
                    style: ButtonStyles.Secondary,
                    label: 'Edit',
                  },
                ],
              },
            ],
          });
        },
      })
      .createGroupComponentHandler({
        ref: 'modalConfirm',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.deferEdit();

          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: interaction.guildId!.toString(),
            constants: [
              constants.values().toArray()[0],
            ],
          });
          await KVC.appd.pinTemplate.upsertByPrimaryIndex({
            index: ['guid', guid],
            update: {
              message: constants.values().toArray()[1],
            },
            set: {
              guid,
              guildId: interaction.guildId!.toString(),
              name: constants.values().toArray()[0],
              message: constants.values().toArray()[1],
            },
          });

          await interaction.edit({
            content: '',
            embeds: Responses.success.make()
              .setDescription(getLang('message', 'pin.add-template', 'result', [constants.values().toArray()[0]])),
            components: [],
          });
        },
      })
      .createGroupComponentHandler({
        ref: 'modalEdit',
        handle: async ({ interaction, constants, assistant }) => {
          await interaction.respond({
            customId: await assistant.makeComponentCallback({
              ref: 'consumeModal',
              timeToLive: 900,
              userId: interaction.user.id,
              constants: new Set([
                constants.values().toArray()[0],
                'editing',
              ]),
            }),
            title: 'Pinned Message Editor',
            components: [
              {
                type: MessageComponentTypes.ActionRow,
                components: [
                  {
                    type: MessageComponentTypes.TextInput,
                    customId: 'text',
                    label: 'Message Text',
                    style: TextStyles.Paragraph,
                    minLength: 1,
                    maxLength: 2000,
                    value: constants.values().toArray()[1],
                    required: true,
                  },
                ],
              },
            ],
          });
          return;
        },
      });
  }
}
