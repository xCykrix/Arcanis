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
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<Partial<MessageDefinition>>()
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
        inhibitor: ({ args }) => {
          return args.forward?.delete === undefined;
        },
        handle: async ({ interaction, args, assistant, guild, botMember }) => {
          if (args.forward?.delete === undefined) return; // Assertion
          await interaction.defer();

          // Permission Guard (Source Channel) - Bot Permissions
          const fromBotPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.forward.delete.from.id, botMember!, fromBotPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'permission.bot.cmissing')!)
                .addField('Channel', `<#${args.forward.delete.from.id}>`)
                .addField('Missing', fromBotPermissions.join('\n')),
            });
            return;
          }

          // Validate Reaction
          if (!Emoji.check(args.forward.delete.reaction)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('forward.delete', 'emoji.invalid')!),
            });
            return;
          }

          // Attempt Fetch
          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: args.forward.delete.from.guildId!.toString(),
            channelId: args.forward.delete.from.id.toString(),
            constants: [
              args.forward.delete.reaction,
            ],
          });
          const kvFind = await KVC.appd.forward.findByPrimaryIndex('guid', guid);

          // Verify Exists
          if (kvFind?.versionstamp === undefined) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('forward.delete', 'nonexistant')!),
            });
            return;
          }

          // Delete
          await KVC.appd.forward.deleteByPrimaryIndex('guid', guid);

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('forward.delete', 'result')!)
              .addField('From Channel', `<#${args.forward.delete.from.id}>`, true)
              .addField('To Channel', `<#${kvFind.value.toChannelId}>`, true)
              .addField('Reaction', `${args.forward.delete.reaction}`, false),
          });
        },
      });
  }
}
