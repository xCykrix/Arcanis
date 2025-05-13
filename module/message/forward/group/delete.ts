import { ChannelTypes } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import { Emoji } from '../../../../lib/util/validation/emoji.ts';
import type { MessageForwardDelete } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupHandler.builder<Required<MessageForwardDelete>>({
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
        return args.forward?.delete === undefined;
      })
      .handle(async ({ interaction, args }) => {
        const remove = args.forward!.delete!;

        // Defer for Main Processing
        await interaction.defer();

        // Parse Reactions
        if (!Emoji.validate(remove.reaction)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('An Invalid Reaction was specified. Please use the Discord Emoji Picker.')
              .addField('Data', remove.reaction),
          });
          return;
        }

        // Make GUID
        const guid = GUID.makeVersion1GUID({
          module: 'reaction.forward',
          guildId: remove.from.guildId!.toString(),
          channelId: remove.from.id!.toString(),
          data: [
            remove.reaction,
          ],
        });
        const fetchByPrimary = await DatabaseConnector.appd.forward.findByPrimaryIndex('guid', guid);

        // Exist Check
        if (fetchByPrimary?.versionstamp === undefined) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Unknown Reaction Forwarding Configuration. Please check the Channel and Reaction is correct.'),
          });
          return;
        }

        // Delete to Database
        await DatabaseConnector.appd.forward.deleteByPrimaryIndex('guid', guid);

        // Respond
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Reaction Forwarding Deleted.')
            .addField('From Channel', `<#${remove.from.id}>`, false)
            .addField('To Channel', `<#${fetchByPrimary.value.toChannelId}>`, false)
            .addField('Reaction', `${remove.reaction}`, false),
        });
      });
  }
}
