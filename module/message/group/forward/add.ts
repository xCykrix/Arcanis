import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { Permissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<Partial<MessageDefinition>>()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'message',
          componentTopLevel: 'message.forward.add',
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
          return args.forward?.add === undefined;
        },
        handle: async ({ interaction, args, assistant, guild, botMember }) => {
          if (args.forward?.add === undefined) return; // Assertion
          await interaction.defer();

          // Permission Guard (Source Channel) - Bot Permissions
          const fromBotPermissions: PermissionStrings[] = ['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.forward.add.from.id, botMember!, fromBotPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'permission.bot.cmissing')!)
                .addField('Channel', `<#${args.forward.add.from.id}>`)
                .addField('Missing', fromBotPermissions.join('\n')),
            });
            return;
          }

          // Permission Guard (Target Channel) - Bot Permissions
          const toBotPermissions: PermissionStrings[] = ['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.forward.add.to.id, botMember!, toBotPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'permission.bot.cmissing')!)
                .addField('Channel', `<#${args.forward.add.to.id}>`)
                .addField('Missing', toBotPermissions.join('\n')),
            });
            return;
          }
        },
      });
  }
}
