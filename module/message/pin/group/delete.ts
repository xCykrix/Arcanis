import { ChannelTypes } from '@discordeno';
import { DatabaseConnector } from '../../../../lib/database/database.ts';
import { GUID } from '../../../../lib/database/guid.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GroupHandler } from '../../../../lib/util/builder/group.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessagePinDelete } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupHandler.builder<MessagePinDelete>({
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
        return args.pin?.delete === undefined;
      })
      .handle(async ({ interaction, args }) => {
        const remove = args.pin!.delete!;

        // Fetch Appd Pin by Primary
        const guid = GUID.makeVersion1GUID({
          module: 'pin.sticky',
          guildId: remove.channel.guildId!.toString(),
          channelId: remove.channel.id.toString(),
        });
        const fetchByPrimary = await DatabaseConnector.appd.pin.findByPrimaryIndex('guid', guid);

        // Exists
        if (fetchByPrimary?.versionstamp === undefined) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription('Unknown Pinned Message. Please check the Channel and Reaction is correct.'),
          });
          return;
        }

        // Delete
        await DatabaseConnector.appd.pin.deleteByPrimaryIndex('guid', guid);

        // Respond
        await interaction.respond({
          embeds: Responses.success.make()
            .setDescription('Sticky Message Removed')
            .addField('Channel', `<#${remove!.channel.id}>`, true),
        });
      });
  }
}
