import { ChannelTypes } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { hasChannelPermissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Emoji } from '../../../../lib/util/validation/emoji.ts';
import type { MessageForwardSet } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupHandler.builder<Required<MessageForwardSet>>({
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
        return args.forward?.add === undefined;
      })
      .handle(async ({ interaction, args, guild, botMember }) => {
        const add = args.forward!.add!;

        // Permission Guard (Target Channel) - Bot Permissions
        if (!hasChannelPermissions(guild!, add.to!.id, botMember!, ['VIEW_CHANNEL', 'SEND_MESSAGES'])) {
          await interaction.respond({
            embeds: Responses.error.makeBotPermissionDenied(['VIEW_CHANNEL', 'SEND_MESSAGES']),
          }, { isPrivate: true });
          return;
        }

        // Permission Guard (Source Channel) - Bot Permissions
        if (!hasChannelPermissions(guild!, add.from!.id, botMember!, ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'])) {
          await interaction.respond({
            embeds: Responses.error.makeBotPermissionDenied(['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY']),
          }, { isPrivate: true });
          return;
        }

        // Defer for Main Processing
        await interaction.defer();

        // Parse Reactions
        if (!Emoji.validate(add.reaction)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('An Invalid Reaction was specified. Please use the Discord Emoji Picker.')
              .addField('Data', add.reaction),
          });
          return;
        }

        // Verify Limit
        const fetchBySecondary = await DatabaseConnector.appd.forward.countBySecondaryIndex('fromChannelId', add.from.id.toString());
        if (fetchBySecondary >= 10) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('You may only create up to 10 Reaction Forwarders in the specified Source Channel. This Reaction Forwarder would exceed the limitation and has been rejected.'),
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
            .setDescription('Reaction Forwarding Added.')
            .addField('From Channel', `<#${add.from.id}>`, false)
            .addField('To Channel', `<#${add.to.id}>`, false)
            .addField('Reaction', `${add.reaction}`, false)
            .addField('Threshold', `${add.threshold} Reactions`, false),
        });
      });
  }
}
