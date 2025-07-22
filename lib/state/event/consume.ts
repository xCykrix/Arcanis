import { ApplicationCommandOptionTypes, ChannelTypes, commandOptionsParser, InteractionTypes } from '@discordeno';
import { Bootstrap } from '../../../mod.ts';
import { AsyncInitializable } from '../../generic/initializable.ts';
import { Plane } from '../../plane.ts';
import { Permissions } from '../../util/helper/permissions.ts';
import { Optic } from '../../util/optic.ts';

const developers = ['100737000973275136'];

export default class extends AsyncInitializable {
  private getFirstInteractionPath(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction): string | null {
    if (!interaction?.data?.name) return null;

    let path = interaction.data.name;
    let options = interaction.data.options;

    while (Array.isArray(options) && options.length > 0) {
      const option = options[0];
      if (
        option.type === ApplicationCommandOptionTypes.SubCommand ||
        option.type === ApplicationCommandOptionTypes.SubCommandGroup
      ) {
        path += `.${option.name}`;
        options = option.options;
      } else {
        break;
      }
    }

    return path;
  }

  // deno-lint-ignore require-await
  public override async initialize(): Promise<void> {
    // deno-lint-ignore require-await
    Plane.event.add('interactionCreate', async (interaction) => {
      // Validate State
      if (interaction.type !== InteractionTypes.ApplicationCommand) return;

      // Path Extraction
      const path = this.getFirstInteractionPath(interaction) ?? null;
      if (path === null) return;

      // Late Validate State
      if (interaction.data?.name !== path.split('.')[0]) return;

      // Extract Options
      const options = Plane.injection.options.get(path);

      // Enforce Options (Guild Required)
      if (options?.guildRequired && (interaction.guildId === undefined || interaction.member?.id === undefined)) {
        await interaction.respond({
          embeds: [{
            title: 'Invalid Context',
            description: 'This interaction requires a guild context. Please use this command in a guild channel.',
          }],
        }, {
          isPrivate: true,
        });
        return;
      }

      // Enforce Options (Developer Required)
      if (options?.developerRequired && !developers.includes(interaction.user.id.toString())) {
        await interaction.respond({
          embeds: [{
            title: 'Access Denied',
            description: 'You are not authorized to use this interaction. Please contact the developer for assistance.',
          }],
        }, {
          isPrivate: true,
        });
        Optic.incident({
          moduleId: 'RuntimeSecurityException',
          message: `RuntimeSecurityException: '${path}' by user ${interaction.user.id} (UN:${interaction.user.username} GN:${interaction.user.globalName}).`,
          dispatch: true,
        });
        return;
      }

      // Extract Handler and Parse Arguments for Processing
      const handler = Plane.injection.handlers.get(path);
      const args = commandOptionsParser(interaction);
      if (handler === undefined) return;
      if (options === undefined) {
        Optic.incident({
          moduleId: 'DynamicModuleLoader',
          message: `Failed to find options associated to '${path}'.`,
          dispatch: true,
        });
        return;
      }

      // Enforce Options (Channel Types and Permission Enforcement)
      const channelTypes: ChannelTypes[] = options?.channelTypesRequired ?? [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText, ChannelTypes.GuildForum, ChannelTypes.DM];
      if (interaction.channel.type === undefined || !channelTypes.includes(interaction.channel.type)) {
        await interaction.respond({
          embeds: [{
            title: 'Invalid Channel Type',
            description: `This interaction can only be used in the following channel types: ${channelTypes.map((type) => ChannelTypes[type]).join('\n')}.`,
          }],
        }, {
          isPrivate: true,
        });
        return;
      }

      if (options?.guildRequired && !(interaction.guildId === undefined || interaction.member?.id === undefined)) {
        const guild = (await Bootstrap.bot.cache.guilds.get(interaction.guildId))!;
        const member = (await Bootstrap.bot.cache.members.get(interaction.guildId, interaction.member.id))!;

        // User Guild Permissions
        if (options.userRequiredGuildPermissions.length > 0 && !Permissions.hasGuildPermissions(guild, interaction.member, options.userRequiredGuildPermissions)) {
          await interaction.respond({
            embeds: [{
              title: 'Insufficient Permissions',
              description: 'You do not have the required permissions to use this interaction in the guild.',
              
            }],
          }, {
            isPrivate: true,
          });
          return;
        }

        // User Channel Permissions
        if (options.userRequiredChannelPermissions.length > 0 && !Permissions.hasChannelPermissions(guild, interaction.channelId!, interaction.member, options.userRequiredChannelPermissions)) {
        }

        // Bot Guild Permissions
        if (options.botRequiredGuildPermissions.length > 0 && !Permissions.hasGuildPermissions(guild, member, options.botRequiredGuildPermissions)) {
        }

        // Bot Channel Permissions
        if (options.botRequiredChannelPermissions.length > 0 && !Permissions.hasChannelPermissions(guild, interaction.channelId!, member, options.botRequiredChannelPermissions)) {
        }
      }
    });
  }
}
