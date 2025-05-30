import { ChannelTypes } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['pin']['delete'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.pin.delete',
          guidTopLevel: 'message.pin',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          requireGuild: true,
          requireDeveloper: false,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: ['MANAGE_MESSAGES'],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args.pin?.delete === undefined,
            pick: args.pin?.delete ?? null,
          };
        },
        handle: async ({ interaction, args }) => {
          if (args === null) return; // Assertion

          // Exists
          const kvFind = await KVC.appd.pin.findByPrimaryIndex('channelId', args.channel.id.toString());
          if (kvFind?.versionstamp === undefined) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'pin', 'none-found')!),
            });
            return;
          }

          // Delete
          await KVC.appd.pin.deleteByPrimaryIndex('channelId', args.channel.id.toString());

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('message', 'pin.delete', 'result')!)
              .addField('Channel', `<#${args.channel.id}>`),
          });
        },
      });
  }
}
