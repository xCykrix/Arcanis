import { ChannelTypes } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageReactionList } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupHandler.builder<MessageReactionList>({
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
        return args.reaction?.list === undefined;
      })
      .handle(async ({ interaction, args }) => {
        const list = args.reaction!.list!;

        // Defer for Main Processing
        await interaction.defer();

        // Fetch Appd Reaction by Secondaries
        const fetchBySecondary = await DatabaseConnector.appd.reaction.findBySecondaryIndex('channelId', list.channel.id.toString());

        // Exists
        if (fetchBySecondary.result.length === 0) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Unable to find Auto Reaction Task(s). Please check the Channel specified.'),
          });
          return;
        }

        // Build Embed
        const embeds = Responses.success.make()
          .setTitle('Auto Reaction Task List')
          .addField('Channel', `<#${list.channel.id}>`, true);

        // Create Lookup Index
        const lookup = {
          'all': 'All Messages',
          'embed-only': 'Messages with Embed',
          'media-only': 'Messages with Attachments',
          'url-only': 'Messages with URL',
          'text-only': 'Messages with Text',
        };

        // Consolidate
        for (const result of fetchBySecondary.result) {
          embeds.addField(`Type: ${lookup[result.value.type]}`, `${result.value.reaction.join(' ')} | ${result.value.exclusion?.user?.length ?? 0} User(s) and ${result.value.exclusion?.role?.length ?? 0} Role(s) Excluded. React to Self: ${result.value.self ?? false}`, false);
        }

        // Respond
        await interaction.respond({
          embeds,
        });
      });
  }
}
