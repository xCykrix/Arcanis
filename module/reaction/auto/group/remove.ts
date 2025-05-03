import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { hasChannelPermissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { AutoGroup } from '../definition/definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupHandler.builder<AutoGroup>({
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
        return args.auto?.remove === undefined;
      })
      .handle(async ({ interaction, args, guild, botMember }) => {
        // Permission Guard (Target Channel) - Bot Permissions
        const botPermissions: PermissionStrings[] = ['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'];
        if (!hasChannelPermissions(guild!, args.auto!.remove!.channel!.id, botMember!, botPermissions)) {
          await interaction.respond({
            embeds: Responses.error.makePermissionDenied(botPermissions),
          }, { isPrivate: true });
          return;
        }

        // Defer for Main Processing
        await interaction.defer();

        // Fetch Appd Reaction by Primary
        const guid = GUID.makeVersion1GUID({
          module: 'reaction.auto',
          guildId: args.auto!.remove!.channel!.guildId!.toString(),
          channelId: args.auto!.remove!.channel!.id!.toString(),
          data: [
            args.auto!.remove!.type!,
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

        // Delete
        await DatabaseConnector.appd.reaction.deleteByPrimaryIndex('guid', guid);

        // Respond
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Auto React Task Removed')
            .addField('Channel', `<#${args.auto!.remove!.channel.id}>`, true)
            .addField('Type', args.auto!.remove!.type, true),
        });
      }).build();
  }
}
