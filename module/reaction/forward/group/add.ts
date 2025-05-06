import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { hasChannelPermissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Emoji } from '../../../../lib/util/validation/emoji.ts';
import type { ReactionForwardAdd } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupHandler.builder<Required<ReactionForwardAdd>>({
      interaction: 'reaction',
      requireGuild: true,
      supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
      userRequiredGuildPermissions: ['MANAGE_MESSAGES'],
      userRequiredChannelPermissions: [],
      applicationRequiredGuildPermissions: [],
      applicationRequiredChannelPermissions: [],
    })
      // deno-lint-ignore require-await
      .inhibitor(async ({ args }) => {
        return args.forward?.add === undefined;
      })
      .handle(async ({ interaction, args, guild, botMember }) => {
        const add = args.forward!.add!;

        // Permission Guard (Target Channel) - Bot Permissions
        const botPermissions: PermissionStrings[] = ['SEND_MESSAGES'];
        if (!hasChannelPermissions(guild!, add.to!.id, botMember!, botPermissions)) {
          await interaction.respond({
            embeds: Responses.error.makeBotPermissionDenied(botPermissions),
          }, { isPrivate: true });
          return;
        }

        // Defer for Main Processing
        await interaction.defer();

        // Parse Reactions
        if (!Emoji.validate(add.reaction)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Invalid Emoji Data in Reaction Field.')
              .addField('Data', add.reaction),
          });
          return;
        }

        // Verify Limit
        const fetchBySecondary = await DatabaseConnector.appd.forward.countBySecondaryIndex('fromChannelId', add.from.id.toString());
        if (fetchBySecondary >= 10) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('You may only create up to 10 forwarders in a source (from) channel.'),
          });
          return;
        }

        // Make GUID
        const guid = GUID.makeVersion1GUID({
          module: 'reaction.forward',
          guildId: add.from.guildId!.toString(),
          channelId: add.from.id!.toString(),
          data: [
            add.reaction,
          ],
        });

        // Write to Database
        await DatabaseConnector.appd.forward.upsertByPrimaryIndex({
          index: ['guid', guid],
          update: {
            toChannelId: add.to.id.toString(),
            reaction: add.reaction,
            within: add.within,
            alert: add.alert ?? undefined,
          },
          set: {
            guid,
            guildId: add.from.guildId!.toString(),
            fromChannelId: add.from.id.toString(),
            toChannelId: add.to.id.toString(),
            reaction: add.reaction,
            threshold: add.threshold,
            within: add.within,
            alert: add.alert ?? undefined,
          },
        }, {
          strategy: 'merge-shallow',
        });

        // Respond
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Forwarding has been set for the specified channel.')
            .addField('From Channel', `<#${add.from.id}>`, false)
            .addField('To Channel', `<#${add.to.id}>`, false)
            .addField('Reaction', `${add.reaction}`, false)
            .addField('Threshold', `${add.threshold} Reactions`, false),
        });
      }).build();
  }
}
