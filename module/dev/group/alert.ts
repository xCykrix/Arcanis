import { ChannelTypes, type PermissionStrings } from '@discordeno';
import { getLang } from '../../../constants/lang.ts';
import { GroupBuilder } from '../../../lib/builder/group.ts';
import { AsyncInitializable } from '../../../lib/generic/initializable.ts';
import { KVC } from '../../../lib/kvc/kvc.ts';
import { Permissions } from '../../../lib/util/helper/permissions.ts';
import { Responses } from '../../../lib/util/helper/responses.ts';
import type { DevDefinition } from '../definition.ts';

export default class extends AsyncInitializable {
  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    GroupBuilder.builder<
      DevDefinition['alert'],
      DevDefinition
    >()
      .createGroupHandler({
        assurance: {
          interactionTopLevel: 'dev',
          componentTopLevel: 'component.dev',
          guidTopLevel: 'dev.alert',
          supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText],
          requireGuild: true,
          requireDeveloper: false,
          componentRequireAuthor: true,
          userRequiredGuildPermissions: ['MANAGE_GUILD', 'MANAGE_MESSAGES'],
          userRequiredChannelPermissions: [],
          botRequiredGuildPermissions: [],
          botRequiredChannelPermissions: [],
        },
        pickAndInhibit: ({ args }) => {
          return {
            inhibit: args?.alert === undefined,
            pick: args?.alert ?? null,
          };
        },
        handle: async ({ interaction, args, guild, botMember }) => {
          if (args === null) return;

          // Permission Guard (Target Channel) - Bot Permissions
          const toBotPermissions: PermissionStrings[] = ['VIEW_CHANNEL', 'SEND_MESSAGES'];
          if (!Permissions.hasChannelPermissions(guild!, args.channel.id, botMember!, toBotPermissions)) {
            await interaction.respond({
              embeds: Responses.error.make()
                .setDescription(getLang('global', 'channel', 'permission.bot.missing'))
                .addField('Channel', `<#${args.channel.id}>`)
                .addField('Required', toBotPermissions.join('\n')),
            });
            return;
          }

          // Write Database
          await KVC.persistd.alert.upsertByPrimaryIndex({
            index: ['guildId', interaction.guildId!.toString()],
            update: {
              toChannelId: args.channel.id.toString(),
            },
            set: {
              guildId: interaction.guildId!.toString(),
              toChannelId: args.channel.id.toString(),
            },
          });

          // Respond
          await interaction.respond({
            embeds: Responses.success.make()
              .setDescription(getLang('dev', 'alert', 'result', [`<#${args.channel.id.toString()}>`])),
          });
        },
      });
  }
}
