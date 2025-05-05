import { ChannelTypes } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { ReactionAutoRemove } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupHandler.builder<ReactionAutoRemove>({
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
      .handle(async ({ interaction, args }) => {
        const remove = args.auto!.remove!;

        // Defer for Main Processing
        await interaction.defer();

        // Fetch Appd Reaction by Primary
        const guid = GUID.makeVersion1GUID({
          module: 'reaction.auto',
          guildId: remove.channel!.guildId!.toString(),
          channelId: remove.channel!.id!.toString(),
          data: [
            remove.type!,
          ],
        });
        const fetch = await DatabaseConnector.appd.reaction.findByPrimaryIndex('guid', guid);

        // Exists
        if (fetch?.versionstamp === undefined) {
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
            .addField('Type', remove.type, true),
        });
      }).build();
  }
}
