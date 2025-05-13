import { ButtonStyles, ChannelTypes, type InputTextComponent, type MessageComponent, MessageComponentTypes, TextStyles } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { ComponentHandler } from '../../../../lib/util/builder/components.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { hasChannelPermissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Bootstrap } from '../../../../mod.ts';
import type { MessagePinSet } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const preview = ComponentHandler.builder({
      moduleId: 'message.pin.callback.preview',
      requireAuthor: true,
      within: 300,
    }).handle(async (interaction, self) => {
      await interaction.deferEdit();
      const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

      const channel = await Bootstrap.bot.cache.channels.get(BigInt(constants[1]));
      if (channel?.id.toString() === undefined) {
        await interaction.respond({
          embeds: Responses.error.make()
            .setDescription('Unknown Channel for Reaction Forwarding. Please try again. (Cache Miss)'),
        }, { isPrivate: true });
        return;
      }

      const guid = GUID.makeVersion1GUID({
        module: 'pin.sticky',
        guildId: constants[0]!,
        channelId: constants[1]!,
      });
      await DatabaseConnector.appd.pin.upsertByPrimaryIndex({
        index: ['guid', guid],
        update: {
          message: interaction.message!.content!,
        },
        set: {
          guid,
          guildId: constants[0]!,
          channelId: constants[1]!,
          message: interaction.message!.content!,
          every: parseInt(constants[2]!),
          within: parseInt(constants[3]!),
        },
      });

      await interaction.edit({
        embeds: Responses.success.make()
          .setDescription('The Sticky Message has been applied. It will appear in specified the channel soon.')
          .addField('Channel', `<#${constants[1]}>`),
        components: [],
      });
    });

    const returnToModal = ComponentHandler.builder({
      moduleId: 'message.pin.callback.returnToModal',
      requireAuthor: true,
      within: 300,
    }).handle(async (interaction, self) => {
      const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

      // Upsert the Appd Reaction by Primary
      await interaction.respond({
        customId: await modal.makeId({
          userId: interaction.user.id.toString(),
          constants: [
            constants[0]!,
            constants[1]!,
            constants[2]!,
            constants[3]!,
          ],
        }),
        title: 'Set Sticky Message',
        components: [
          {
            type: MessageComponentTypes.ActionRow,
            components: [
              {
                type: MessageComponentTypes.InputText,
                customId: 'text',
                label: 'Message Content',
                style: TextStyles.Paragraph,
                minLength: 1,
                maxLength: 2000,
                placeholder: 'Type your message you want pinned here! Markdown supported.',
                value: constants[4],
                required: true,
              },
            ],
          },
        ],
      });
      await interaction.delete();
    });

    const modal = ComponentHandler.builder({
      moduleId: 'message.pin.callback.modal',
      requireAuthor: true,
      within: 300,
    }).handle(async (interaction, self) => {
      await interaction.deferEdit();

      const components = ComponentHandler.parseModal<{
        text: string;
      }>(interaction.data!.components as MessageComponent[]);
      const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

      // Trim and Validate
      if ((components.text?.length ?? 0) === 0 || (components.text ?? '').trim() === '') {
        await interaction.respond({
          embeds: Responses.error.make()
            .setDescription('Unable to validate Text Input. It must not be empty.'),
        }, {
          isPrivate: true,
        });
        return;
      }

      // Respond
      await interaction.respond({
        content: components!.text,
        components: [
          {
            type: MessageComponentTypes.ActionRow,
            components: [
              {
                type: MessageComponentTypes.Button,
                customId: await preview.makeId({
                  userId: interaction.user.id.toString(),
                  constants,
                }),
                style: ButtonStyles.Primary,
                label: 'Accept Preview',
              },
              {
                type: MessageComponentTypes.Button,
                customId: await returnToModal.makeId({
                  userId: interaction.user.id.toString(),
                  constants: [
                    ...constants,
                    components.text ?? '',
                  ],
                }),
                style: ButtonStyles.Primary,
                label: 'Return to Editor',
              },
            ],
          },
        ],
      });
    });

    GroupHandler.builder<MessagePinSet>({
      interaction: 'message',
      requireGuild: true,
      supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
      userRequiredGuildPermissions: ['MANAGE_MESSAGES'],
      userRequiredChannelPermissions: [],
      applicationRequiredGuildPermissions: [],
      applicationRequiredChannelPermissions: [],
    })
      // deno-lint-ignore require-await
      .inhibitor(async ({ args }) => {
        return args.pin?.set === undefined;
      })
      .handle(async ({ interaction, args, guild, botMember }) => {
        const set = args.pin!.set!;

        // Permission Guard (Target Channel) - Bot Permissions
        if (!hasChannelPermissions(guild!, set.channel!.id, botMember!, ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'])) {
          await interaction.respond({
            embeds: Responses.error.makeBotPermissionDenied(['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']),
          });
          return;
        }

        // Fetch Database Entry
        const guid = GUID.makeVersion1GUID({
          module: 'pin.sticky',
          guildId: set.channel.guildId!.toString(),
          channelId: set.channel.id.toString(),
        });
        const fetchByPrimary = await DatabaseConnector.appd.pin.findByPrimaryIndex('guid', guid);

        // Build Component with Dynamic Placeholder Fill.
        const inputTextComponent: InputTextComponent = {
          type: MessageComponentTypes.InputText,
          customId: 'text',
          label: 'Message Text',
          style: TextStyles.Paragraph,
          minLength: 1,
          maxLength: 2000,
          placeholder: 'Enter the Message in this field. Markdown Supported.',
          required: true,
        };
        if (fetchByPrimary?.value.message !== undefined) {
          inputTextComponent.value = fetchByPrimary.value.message;
          inputTextComponent.placeholder = undefined;
        }

        // Respond Modal
        await interaction.respond({
          customId: await modal.makeId({
            userId: interaction.user.id.toString(),
            constants: [
              set.channel.guildId!.toString(),
              set.channel.id.toString(),
              `${set.every}`,
              `${set.within}`,
            ],
          }),
          title: 'Pinned Message Editor',
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                inputTextComponent,
              ],
            },
          ],
        });
      });
  }
}
