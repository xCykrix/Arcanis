import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Emoji } from '../../../../lib/util/guard/emoji.ts';
import { Permissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['forward']['delete'],
      MessageDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.forward.delete',
          guidTopLevel: 'message.forward',
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
            inhibit: args.forward?.delete === undefined,
            pick: args.forward?.delete ?? null,
          };
        },
        handle: async ({ interaction, args, assistant, guild, botMember }) => {
          if (args === null) return; // Assertion
          await interaction.defer();

          // Permission Guard (Source Channel) - Bot Permissions
          const fromBotPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.from.id as bigint, botMember!, fromBotPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'channel', 'permission.bot.missing'))
                .addField('Channel', `<#${args.from.id}>`)
                .addField('Missing', fromBotPermissions.join('\n')),
            });
            return;
          }

          // Validate Reaction
          if (!Emoji.check(args.reaction)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'emoji.invalid.single')),
            });
            return;
          }

          // Attempt Fetch
          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: args.from.guildId!.toString(),
            channelId: args.from.id.toString(),
            constants: [
              args.reaction,
            ],
          });
          const kvFind = await KVC.appd.forward.findByPrimaryIndex('guid', guid);

          // Verify Exists
          if (kvFind?.versionstamp === undefined) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'forward', 'none-found')),
            });
            return;
          }

          // Delete
          await KVC.appd.forward.deleteByPrimaryIndex('guid', guid);

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('message', 'forward.delete', 'result'))
              .addField('From Channel', `<#${args.from.id}>`, true)
              .addField('To Channel', `<#${kvFind.value.toChannelId}>`, true)
              .addField('Reaction', `${args.reaction}`, false),
          });
        },
      });
  }
}
