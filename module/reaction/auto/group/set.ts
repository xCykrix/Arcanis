import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { hasChannelPermissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Emoji } from '../../../../lib/util/validation/emoji.ts';
import type { ReactionAutoSet } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupHandler.builder<ReactionAutoSet>({
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
        return args.auto?.set === undefined;
      })
      .handle(async ({ interaction, args, guild, botMember }) => {
        const set = args.auto!.set!;

        // Parse Reactions
        const reaction = set.reactions.split('\u0020').filter((v) => v.trim().length !== 0);

        // Check Payload of Reactions
        if (reaction.length === 0 || reaction.length > 10) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Invalid Reaction(s). You must specify between 1 and 10 Emojis to react from the Discord Emoji Picker.'),
          });
          return;
        }

        // Validate Reactions
        for (const v of reaction) {
          if (Emoji.validate(v)) continue;
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Invalid Emoji Data in Reaction List.')
              .addField('Data', v),
          });
          return;
        }

        // Permission Guard (Target Channel) - Bot Permissions
        const botPermissions: PermissionStrings[] = ['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'];
        if (!hasChannelPermissions(guild!, set.channel!.id, botMember!, botPermissions)) {
          await interaction.respond({
            embeds: Responses.error.makeBotPermissionDenied(botPermissions),
          }, { isPrivate: true });
          return;
        }

        // Defer for Main Processing
        await interaction.defer();

        // Fetch Appd Reaction by Secondaries
        const fetchBySecondary = await DatabaseConnector.appd.reaction.findBySecondaryIndex('channelId', set.channel.id.toString());
        let hasConfigurationForAll = false;
        let hasConfigurationForSpecific = false;
        for (const fetched of fetchBySecondary.result) {
          if (fetched.value.type === 'all') hasConfigurationForAll = true;
          if (fetched.value.type !== 'all') hasConfigurationForSpecific = true;
        }

        // Cross Comparisons
        if (set.type === 'all' && hasConfigurationForSpecific) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(`Type '${set.type}' is not compatible to 'Message with' types.`),
          });
          return;
        }
        if (set.type !== 'all' && hasConfigurationForAll) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(`Type '${set.type}' is not compatible to 'All Messages'.`),
          });
          return;
        }

        // Upsert the Appd Reaction by Primary
        const guid = GUID.makeVersion1GUID({
          module: 'reaction.auto',
          guildId: set.channel!.guildId!.toString(),
          channelId: set.channel!.id!.toString(),
          data: [
            set.type!,
          ],
        });
        await DatabaseConnector.appd.reaction.upsertByPrimaryIndex({
          index: ['guid', guid],
          update: {
            reaction,
            self: set.self ?? false,
          },
          set: {
            guid,
            guildId: set.channel.guildId!.toString(),
            channelId: set.channel.id.toString(),
            reaction,
            type: set.type,
            self: set.self ?? false,
          },
        }, {
          strategy: 'merge-shallow',
        });

        // Respond
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Auto React Task Updated')
            .addField('Channel', `<#${set.channel.id}>`, true)
            .addField('Type', set.type, true)
            .addField('Reactions', reaction.join(' '), false),
        });
      }).build();
  }
}
