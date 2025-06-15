import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { getLang } from '../../../../constants/lang.ts';
import { GroupBuilder } from '../../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../../lib/generic/initializable.ts';
import { GUID } from '../../../../lib/kvc/guid.ts';
import { KVC } from '../../../../lib/kvc/kvc.ts';
import { Emoji } from '../../../../lib/util/check/emoji.ts';
import { Permissions } from '../../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../../lib/util/helper/responses.ts';
import type { MessageDefinition } from '../../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      MessageDefinition['forward']['add'],
      MessageDefinition
    >()
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
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args.forward?.add === undefined,
            pick: args.forward?.add ?? null,
          };
        },
        handle: async ({ interaction, args, assistant, guild, botMember }) => {
          if (args === null) return; // Assertion
          await interaction.defer();

          // Permission Guard (Source Channel) - Bot Permissions
          const fromBotPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.from.id, botMember!, fromBotPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'channel', 'permission.bot.missing'))
                .addField('Channel', `<#${args.from.id}>`)
                .addField('Required', fromBotPermissions.join('\n')),
            });
            return;
          }

          // Permission Guard (Target Channel) - Bot Permissions
          const toBotPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'];
          if (!Permissions.hasChannelPermissions(guild!, args.to.id, botMember!, toBotPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'channel', 'permission.bot.missing'))
                .addField('Channel', `<#${args.to.id}>`)
                .addField('Required', toBotPermissions.join('\n')),
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

          // Validate Source and Origin Channel
          if (args.from.id === args.to.id) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'forward.add', 'same-channel')),
            });
            return;
          }

          // Verify Limiter
          const count = await KVC.appd.forward.countBySecondaryIndex('fromChannelId', args.from.id.toString());
          if (count >= 10) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('message', 'forward.add', 'exceed', [10])),
            });
            return;
          }

          // Write to Database
          const guid = GUID.make({
            moduleId: assistant['assurance'].guidTopLevel!,
            guildId: args.from.guildId!.toString(),
            channelId: args.from.id.toString(),
            constants: [
              args.reaction,
            ],
          });

          await KVC.appd.forward.upsertByPrimaryIndex({
            index: ['guid', guid],
            update: {
              toChannelId: args.to.id.toString(),
              threshold: args.threshold,
              within: args.within,
              alert: args.alert,
            },
            set: {
              guid,
              guildId: args.from.guildId!.toString(),
              fromChannelId: args.from.id.toString(),
              toChannelId: args.to.id.toString(),
              reaction: args.reaction,
              threshold: args.threshold,
              within: args.within,
              alert: args.alert,
            },
          });

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('message', 'forward.add', 'result'))
              .addField('From Channel', `<#${args.from.id}>`, true)
              .addField('To Channel', `<#${args.to.id}>`, true)
              .addField('Reaction', `${args.reaction}`)
              .addField('Threshold', `${args.threshold} Reactions`, true)
              .addField('Within', `${args.within} Seconds`, true),
          });
        },
      });
  }
}
