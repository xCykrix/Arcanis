import { ButtonStyles, ChannelTypes, InputTextComponent, type MessageComponent, MessageComponentTypes, type PermissionStrings, TextStyles } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { ComponentHandler } from '../../../../lib/util/builder/components.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { hasChannelPermissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Bootstrap } from '../../../../mod.ts';
import type { PinStickySet } from '../../definition.ts';
export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const preview = ComponentHandler.builder({
      moduleId: 'pin.stick.callback.preview',
      requireAuthor: true,
      within: 300,
    }).handle(async (interaction, self) => {
      await interaction.deferEdit();
      const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

      const channel = await Bootstrap.bot.cache.channels.get(BigInt(constants[1]));
      if (channel?.id.toString() === undefined) {
        await interaction.respond({
          embeds: Responses.error.make()
            .setDescription('Unable to locate channel via cache. Please try again later.'),
        });
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
    preview.build();

    const returnToModal = ComponentHandler.builder({
      moduleId: 'pin.stick.callback.returnToModal',
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
      }, {
        isPrivate: true,
      });
    });
    returnToModal.build();

    const modal = ComponentHandler.builder({
      moduleId: 'pin.sticky.callback.modal',
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
      }, {
        isPrivate: true,
      });
    });
    modal.build();

    GroupHandler.builder<PinStickySet>({
      interaction: 'pin',
      requireGuild: true,
      supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
      userRequiredGuildPermissions: ['MANAGE_MESSAGES'],
      userRequiredChannelPermissions: [],
      applicationRequiredGuildPermissions: [],
      applicationRequiredChannelPermissions: [],
    })
      // deno-lint-ignore require-await
      .inhibitor(async ({ args }) => {
        return args.sticky?.set === undefined;
      })
      .handle(async ({ interaction, args, guild, botMember }) => {
        const set = args.sticky!.set!;

        // Permission Guard (Target Channel) - Bot Permissions
        const botPermissions: PermissionStrings[] = ['SEND_MESSAGES'];
        if (!hasChannelPermissions(guild!, set.channel!.id, botMember!, botPermissions)) {
          await interaction.respond({
            embeds: Responses.error.makeBotPermissionDenied(botPermissions),
          }, { isPrivate: true });
          return;
        }

        // Fetch Database Entry
        const guid = GUID.makeVersion1GUID({
          module: 'pin.sticky',
          guildId: set.channel.guildId!.toString(),
          channelId: set.channel.id.toString(),
        });
        const fetchByPrimary = await DatabaseConnector.appd.pin.findByPrimaryIndex('guid', guid);

        const inputTextComponent: InputTextComponent = {
          type: MessageComponentTypes.InputText,
          customId: 'text',
          label: 'Message Content',
          style: TextStyles.Paragraph,
          minLength: 1,
          maxLength: 2000,
          placeholder: 'Type your message you want pinned here! Markdown supported.',
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
          title: 'Set Sticky Message',
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                inputTextComponent,
              ],
            },
          ],
        }, {
          isPrivate: true,
        });
      }).build();
  }
}
