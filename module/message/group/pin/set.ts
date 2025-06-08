import { ButtonStyles, ChannelTypes, type MessageComponent, MessageComponentTypes, type PermissionStrings, type TextInputComponent, TextStyles } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Permissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Optic } from '../../../../lib/util/optic.ts';
import { Bootstrap } from '../../../../mod.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['pin']['set'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.pin.set',
          guidTopLevel: 'message.pin',
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
            inhibit: args.pin?.set === undefined,
            pick: args.pin?.set ?? null,
          };
        },
        handle: async ({ interaction, args, assistant, guild, botMember }) => {
          if (args === null) return; // Assertion

          // Permission Guard (Target Channel) - Bot Permissions
          const botPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.channel.id, botMember!, botPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'channel', 'permission.bot.missing'))
                .addField('Channel', `<#${args.channel.id}>`)
                .addField('Required', botPermissions.join('\n')),
            });
            return;
          }

          // Load Template or Existing Message
          if (args.template !== undefined) {
            const kvFind = await KVC.appd.pinTemplate.find(args.template);
            const secure = kvFind?.value.guildId === interaction.guildId?.toString();
            if (kvFind?.versionstamp === undefined || (kvFind?.value.guildId !== undefined && !secure)) {
              if ((kvFind?.value.guildId !== undefined && !secure)) {
                Optic.incident({
                  moduleId: 'message.pin.set',
                  message: `A valid database id was provided but did not match the tenant guildId. Spoofed access? ${interaction.guildId}/${interaction.user.id} ID: ${args.template}`,
                });
              }
              await interaction.respond({
                embeds: Responses.error.make()
                  .setDescription(getLang('message', 'pin.set', 'template.none-found')),
              });
              return;
            }

            await interaction.respond({
              content: kvFind?.value.message,
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
                          args.channel.guildId!.toString(),
                          args.channel.id.toString(),
                          `${args.every}`,
                          `${args.within}`,
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
                          args.channel.guildId!.toString(),
                          args.channel.id.toString(),
                          `${args.every}`,
                          `${args.within}`,
                          kvFind?.value.message,
                        ]),
                      }),
                      style: ButtonStyles.Secondary,
                      label: 'Edit',
                    },
                  ],
                },
              ],
            });
            return;
          } else {
            // Fetch Database
            const kvFind = await KVC.appd.pin.findByPrimaryIndex('channelId', args.channel.id.toString());
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

            if (kvFind?.value.message !== undefined) {
              input.value = kvFind.value.message;
              input.placeholder = undefined;
            }

            // Respond Modal
            await interaction.respond({
              customId: await assistant.makeComponentCallback({
                ref: 'consumeModal',
                timeToLive: 900,
                userId: interaction.user.id,
                constants: new Set([
                  args.channel.guildId!.toString(),
                  args.channel.id.toString(),
                  `${args.every}`,
                  `${args.within}`,
                ]),
              }),
              title: 'Pinned Message Editor',
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
          }
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
            await interaction[constants.values().toArray()[4] === 'editing' ? 'edit' : 'respond']({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'pin', 'invalid.message')),
            });
            return;
          }

          await interaction[constants.values().toArray()[4] === 'editing' ? 'edit' : 'respond']({
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
                      constants,
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
                        ...constants,
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

          const channel = await Bootstrap.bot.cache.channels.get(BigInt(constants.values().toArray()[1]));
          await KVC.appd.pin.upsertByPrimaryIndex({
            index: ['channelId', channel!.id.toString()],
            update: {
              message: interaction.message!.content!,
              every: parseInt(constants.values().toArray()[2]),
              within: parseInt(constants.values().toArray()[3]),
            },
            set: {
              guid: GUID.make({
                moduleId: assistant['assurance'].guidTopLevel!,
                guildId: channel!.guildId!.toString(),
                channelId: channel!.id.toString(),
              }),
              guildId: channel!.guildId!.toString(),
              channelId: channel!.id.toString(),
              message: interaction.message!.content!,
              every: parseInt(constants.values().toArray()[2]),
              within: parseInt(constants.values().toArray()[3]),
            },
          });

          await interaction.edit({
            content: '',
            embeds: Responses.success.make()
              .setDescription(getLang('message', 'pin.set', 'result'))
              .addField('Channel', `<#${constants.values().toArray()[1]}>`),
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
                constants.values().toArray()[1],
                constants.values().toArray()[2],
                constants.values().toArray()[3],
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
                    value: constants.values().toArray()[4],
                    required: true,
                  },
                ],
              },
            ],
          });
          return;
        },
      })
      .createAutoCompleteHandler({
        pick: ({ interaction, assistant }) => {
          return assistant.parseAutoComplete(interaction, ['pin', 'set', 'template']);
        },
        generate: async ({ interaction, pick }) => {
          if (pick === null) return [];

          // Query KVC
          const kvFind = await KVC.appd.pinTemplate.findBySecondaryIndex('guildId', interaction.guild!.id.toString(), {
            filter: (v) => v.value.name.toLowerCase().includes(`${pick.value?.toString().toLowerCase()}`) || v.value.message.toLowerCase().includes(`${pick.value?.toString().toLowerCase()}`),
          });
          if (kvFind.result.length === 0) return [];

          return kvFind.result?.map((v) => {
            return {
              name: `${v.value.name}`,
              value: v.id,
            };
          });
        },
      });
  }
}
