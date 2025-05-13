import { ChannelTypes, type Collection, MessageComponentTypes, type SelectMenuDefaultValue } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { ComponentHandler } from '../../../../lib/util/builder/components.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { Bootstrap } from '../../../../mod.ts';
import type { MessageReactionExclude } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    const userCallback = ComponentHandler.builder({
      moduleId: 'reaction.callback.user',
      requireAuthor: true,
      within: 300,
    }).handle(async (interaction, self) => {
      await interaction.deferEdit();
      const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

      // Resolve Data
      const resolved = interaction.data!.resolved! as {
        members?: Collection<bigint, typeof Bootstrap.bot.transformers.$inferredTypes.member>;
      };
      const members = resolved?.members?.map((v) => v.id.toString()) ?? null;

      // Get Database
      const fetchById = await DatabaseConnector.appd.reaction.find(constants[0]);
      if (fetchById === null) {
        await interaction.edit({
          embeds: Responses.error.make()
            .setDescription('Unable to find the specified Auto Reaction Task. Please check the Channel and Type specified.'),
        });
        return;
      }

      // Update Database
      await DatabaseConnector.appd.reaction.update(constants[0], {
        exclusion: {
          user: (members === null ? [] : members) ?? fetchById.value.exclusion?.user ?? [],
          role: fetchById.value.exclusion?.role ?? [],
        },
      }, {
        strategy: 'merge-shallow',
      });

      // Get Updated and Respond
      const fetchUpdatedById = await DatabaseConnector.appd.reaction.find(constants[0]);
      await interaction.respond({
        embeds: Responses.success.make()
          .setDescription('Auto Reaction Exclusions Updated')
          .addField('Channel', `<#${fetchById.value.channelId}>`, true)
          .addField('Users', ((fetchUpdatedById?.value.exclusion?.user?.length ?? 0) === 0) ? 'None' : (fetchUpdatedById?.value.exclusion?.user ?? null)?.map((v) => `<@${v}>`).join(' ') ?? 'None')
          .addField('Roles', ((fetchUpdatedById?.value.exclusion?.role?.length ?? 0) === 0) ? 'None' : (fetchUpdatedById?.value.exclusion?.role ?? null)?.map((v) => `<@&${v}>`).join(' ') ?? 'None'),
      });
      return;
    });

    const roleCallback = ComponentHandler.builder({
      moduleId: 'reaction.callback.role',
      requireAuthor: true,
      within: 300,
    }).handle(async (interaction, self) => {
      await interaction.deferEdit();
      const { constants } = (await self.getCallbackId(interaction.data!.customId!))!;

      // Resolve Data
      const resolved = interaction.data!.resolved! as {
        roles?: Collection<bigint, typeof Bootstrap.bot.transformers.$inferredTypes.role>;
      };
      const roles = resolved?.roles?.map((v) => v.id.toString()) ?? null;

      // Get Database
      const fetchById = await DatabaseConnector.appd.reaction.find(constants[0]);
      if (fetchById === null) {
        await interaction.edit({
          embeds: Responses.error.make()
            .setDescription('Unable to find the specified Auto Reaction Task. Please check the Channel and Type specified.'),
        });
        return;
      }

      // Update Database
      await DatabaseConnector.appd.reaction.update(constants[0], {
        exclusion: {
          user: fetchById.value.exclusion?.user ?? [],
          role: (roles === null ? [] : roles) ?? fetchById.value.exclusion?.role ?? [],
        },
      }, {
        strategy: 'merge-shallow',
      });

      // Get Updated and Respond
      const fetchUpdatedById = await DatabaseConnector.appd.reaction.find(constants[0]);
      await interaction.respond({
        embeds: Responses.success.make()
          .setDescription('Auto Reaction Exclusions Updated')
          .addField('Channel', `<#${fetchById.value.channelId}>`, true)
          .addField('Users', ((fetchUpdatedById?.value.exclusion?.user?.length ?? 0) === 0) ? 'None' : (fetchUpdatedById?.value.exclusion?.user ?? null)?.map((v) => `<@${v}>`).join(' ') ?? 'None')
          .addField('Roles', ((fetchUpdatedById?.value.exclusion?.role?.length ?? 0) === 0) ? 'None' : (fetchUpdatedById?.value.exclusion?.role ?? null)?.map((v) => `<@&${v}>`).join(' ') ?? 'None'),
      });
      return;
    });

    GroupHandler.builder<MessageReactionExclude>({
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
        return args.reaction?.exclude === undefined;
      })
      .handle(async ({ interaction, args }) => {
        const exclude = args.reaction!.exclude!;

        // Defer for Main Processing
        await interaction.defer();

        // Fetch Appd Reaction by Primary
        const guid = GUID.makeVersion1GUID({
          module: 'reaction.auto',
          guildId: exclude.channel!.guildId!.toString(),
          channelId: exclude.channel!.id!.toString(),
          data: [
            exclude.type!,
          ],
        });

        // Check Exists
        const appdReactionByPrimary = await DatabaseConnector.appd.reaction.findByPrimaryIndex('guid', guid);
        if (appdReactionByPrimary?.versionstamp === undefined) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Unable to find the specified Auto Reaction Task. Please check the Channel and Type specified.'),
          });
          return;
        }

        // Load Defaults
        const defaultRole: SelectMenuDefaultValue[] = [];
        const defaultUser: SelectMenuDefaultValue[] = [];
        appdReactionByPrimary.value.exclusion?.role?.forEach((v) =>
          defaultRole.push({
            type: 'role',
            id: BigInt(v),
          })
        );
        appdReactionByPrimary.value?.exclusion?.user?.forEach((v) =>
          defaultUser.push({
            type: 'user',
            id: BigInt(v),
          })
        );

        // Respond
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Please use the following')
            .addField('Channel', `<#${exclude.channel.id}>`, true)
            .addField('Type', exclude.type, true),
          components: [
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.SelectMenuUsers,
                  customId: await userCallback.makeId({
                    userId: interaction.user.id.toString(),
                    constants: [
                      `${appdReactionByPrimary.id}`,
                      'user',
                    ],
                  }),
                  placeholder: 'Select up to 25 Users',
                  minValues: 0,
                  maxValues: 25,
                  defaultValues: defaultUser,
                },
              ],
            },
            {
              type: MessageComponentTypes.ActionRow,
              components: [
                {
                  type: MessageComponentTypes.SelectMenuRoles,
                  customId: await roleCallback.makeId({
                    userId: interaction.user.id.toString(),
                    constants: [
                      `${appdReactionByPrimary.id}`,
                      'role',
                    ],
                  }),
                  placeholder: 'Select up to 25 Roles',
                  minValues: 0,
                  maxValues: 25,
                  defaultValues: defaultRole,
                },
              ],
            },
          ],
        });
      });
  }
}
