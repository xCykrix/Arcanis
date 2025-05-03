import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { hasChannelPermissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Emoji } from '../../../../lib/util/validation/emoji.ts';
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
        return args.auto?.set === undefined;
      })
      .handle(async ({ interaction, args, guild, botMember }) => {
        // Parse Reactions
        const reaction = args.auto!.set!.reactions.split('\u0020').filter((v) => v.trim().length !== 0);

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
        if (!hasChannelPermissions(guild!, args.auto!.set!.channel!.id, botMember!, botPermissions)) {
          await interaction.respond({
            embeds: Responses.error.makePermissionDenied(botPermissions),
          }, { isPrivate: true });
          return;
        }

        // Defer for Main Processing
        await interaction.defer();

        // Fetch Appd Reaction by Secondaries
        const appdReactionBySecondary = await DatabaseConnector.appd.reaction.findBySecondaryIndex('channelId', args.auto!.set!.channel.id.toString());
        let hasConfigurationForAll = false;
        let hasConfigurationForSpecific = false;
        for (const fetched of appdReactionBySecondary.result) {
          if (fetched.value.type === 'all') hasConfigurationForAll = true;
          if (fetched.value.type !== 'all') hasConfigurationForSpecific = true;
        }

        // Cross Comparisons
        if (args.auto!.set!.type === 'all' && hasConfigurationForSpecific) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(`Type '${args.auto!.set!.type}' is not compatible to 'Message with' types.`),
          });
          return;
        }
        if (args.auto!.set!.type !== 'all' && hasConfigurationForAll) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(`Type '${args.auto!.set!.type}' is not compatible to 'All Messages'.`),
          });
          return;
        }

        // Upsert the Appd Reaction by Primary
        const guid = GUID.makeVersion1GUID({
          module: 'reaction.auto',
          guildId: args.auto!.set!.channel!.guildId!.toString(),
          channelId: args.auto!.set!.channel!.id!.toString(),
          data: [
            args.auto!.set!.type!,
          ],
        });
        await DatabaseConnector.appd.reaction.upsertByPrimaryIndex({
          index: ['guid', guid],
          update: {
            reaction,
          },
          set: {
            guid,
            guildId: args.auto!.set!.channel.guildId!.toString(),
            channelId: args.auto!.set!.channel.id.toString(),
            reaction,
            type: args.auto!.set!.type,
          },
        }, {
          strategy: 'merge-shallow',
        });

        // Respond
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Auto React Task Updated')
            .addField('Channel', `<#${args.auto!.set!.channel.id}>`, true)
            .addField('Type', args.auto!.set!.type, true)
            .addField('Reactions', reaction.join(' '), false),
        });
      }).build();
  }
}
