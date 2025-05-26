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
          const fromBotPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'];
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
          const toBotPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.forward.add.to.id, botMember!, toBotPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'permission.bot.cmissing')!)
                .addField('Channel', `<#${args.forward.add.to.id}>`)
                .addField('Missing', toBotPermissions.join('\n')),
            });
            return;
          }

          // Validate Reaction
          if (!Emoji.check(args.forward.add.reaction)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('forward.add', 'emoji.invalid')!),
            });
            return;
          }

          // Verify Limiter
          const count = await KVC.appd.forward.countBySecondaryIndex('fromChannelId', args.forward.add.from.id.toString());
          if (count >= 10) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('forward.add', 'result.exceed', [10])!),
            });
            return;
          }

          // Write to Database
          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: args.forward.add.from.guildId!.toString(),
            channelId: args.forward.add.from.id.toString(),
            constants: [
              args.forward.add.reaction,
            ],
          });

          await KVC.appd.forward.upsertByPrimaryIndex({
            index: ['guid', guid],
            update: {
              toChannelId: args.forward.add.to.id.toString(),
              threshold: args.forward.add.threshold,
              within: args.forward.add.within,
              alert: args.forward.add.alert,
            },
            set: {
              guid,
              guildId: args.forward.add.from.guildId!.toString(),
              fromChannelId: args.forward.add.from.id.toString(),
              toChannelId: args.forward.add.to.id.toString(),
              reaction: args.forward.add.reaction,
              threshold: args.forward.add.threshold,
              within: args.forward.add.within,
              alert: args.forward.add.alert,
            },
          });

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('forward.add', 'result')!)
              .addField('From Channel', `<#${args.forward.add.from.id}>`, true)
              .addField('To Channel', `<#${args.forward.add.to.id}>`, true)
              .addField('Reaction', `${args.forward.add.reaction}`)
              .addField('Threshold', `${args.forward.add.threshold} Reactions`, true)
              .addField('Within', `${args.forward.add.within} Seconds`, true),
          });
        },
      });
  }
}
