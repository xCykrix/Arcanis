import { ChannelTypes, commandOptionsParser, InteractionTypes, type PermissionStrings } from '@discordeno';
import { Bootstrap } from '../../../mod.ts';
import { hasChannelPermissions, hasGuildPermissions } from '../helper/permissions.ts';
import { Responses } from '../helper/responses.ts';

type OmittedProperties = 'context';
type OmittedCallbackProperties = 'handle' | 'filter' | 'build';

interface FilterPassthroughType<Context> {
  interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction;
  args: Context;
  self: Omit<GroupHandler<Context>, OmittedCallbackProperties>;
}

interface HandlePassthroughType<Context> {
  interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction;
  args: Context;
  self: Omit<GroupHandler<Context>, OmittedCallbackProperties>;
  // Optionals
  guild?: typeof Bootstrap.bot.cache.$inferredTypes.guild;
  botMember?: typeof Bootstrap.bot.cache.$inferredTypes.member;
}

export class GroupHandler<Context> {
  #initialized = false;
  #assurances: Assurances | null = null;
  #inbibitor: (passthrough: FilterPassthroughType<Context>) => Promise<boolean> = async () => true;
  #handle: (passthrough: HandlePassthroughType<Context>) => Promise<void> = async () => {};

  public static builder<T>(assurances: Assurances): Omit<GroupHandler<T>, OmittedProperties> {
    const state = new GroupHandler<T>();
    state.#assurances = assurances;
    if (state.#assurances.userRequiredGuildPermissions.length > 0) state.#assurances.requireGuild = true;
    if (state.#assurances.applicationRequiredGuildPermissions.length > 0) state.#assurances.requireGuild = true;
    return state;
  }

  /**
   * Filter-based Function to Inhibit Execution. Return TRUE to block and FALSE to proceed.
   *
   * @param inhibitor
   * @returns
   */
  public inhibitor(
    inhibitor: (passthrough: FilterPassthroughType<Context>) => Promise<boolean>,
  ): Omit<GroupHandler<Context>, OmittedProperties> {
    this.#inbibitor = inhibitor;
    return this;
  }

  /**
   * Context Handler Function. Called once inhibitor and assurances are complete.
   *
   * @param handle
   * @returns
   */
  public handle(
    handle: (passthrough: HandlePassthroughType<Context>) => Promise<void>,
  ): Omit<GroupHandler<Context>, OmittedProperties> {
    this.#handle = handle;
    return this;
  }

  public context(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction): Context {
    return commandOptionsParser(interaction) as Context;
  }

  public build(): void {
    if (this.#initialized) return;
    this.#initialized = true;

    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (!(await this.enforce(interaction))) return;
      await this.#handle({
        interaction,
        args: this.context(interaction),
        self: this,
        guild: interaction.guildId === undefined ? undefined : (await Bootstrap.bot.cache.guilds.get(interaction.guildId!)),
        botMember: interaction.guildId === undefined ? undefined : (await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, interaction.guildId!)),
      });
    });
  }

  private async enforce(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction): Promise<boolean> {
    if (interaction.type !== InteractionTypes.ApplicationCommand) return false;
    if (interaction.channelId === undefined) return false;
    if (interaction.data?.name !== this.#assurances?.interaction) return false;
    if (
      (await this.#inbibitor({
        interaction,
        args: this.context(interaction),
        self: this,
      }))
    ) return false;

    // Enforce Guild-only Restriction
    if (this.#assurances?.requireGuild && (interaction.guildId === undefined || interaction.member?.id === undefined)) {
      await interaction.respond({
        embeds: Responses.error.makeUnsupportedChannel([ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText]),
      }, {
        isPrivate: true,
      });
      return false;
    }

    // Enforce Channel Types
    if (interaction.channel.type === undefined || !((this.#assurances?.supportedChannelTypes ?? [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText]) as ChannelTypes[]).includes(interaction.channel.type)) {
      await interaction.respond({
        embeds: Responses.error.makeUnsupportedChannel(this.#assurances?.supportedChannelTypes ?? [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText]),
      }, {
        isPrivate: true,
      });
      return false;
    }

    // Get Guild from Cache
    const response = (permissions: PermissionStrings[], userType: 'bot' | 'member', permissionType: 'guild' | 'channel') => {
      const embed = Responses.error.make();
      if (userType === 'bot') {
        if (permissionType === 'guild') embed.setDescription('Unable to process this request. I am not authorized with the required permissions for this Guild.');
        else embed.setDescription('Unable to process this request. I am not authorized with the required permissions for this Channel.');
      } else {
        if (permissionType === 'guild') embed.setDescription('Unable to process this request. You are not authorized with the required permissions for this Guild.');
        else embed.setDescription('Unable to process this request. You are not authorized with the required permissions for this Channel.');
      }
      embed.addField('Permissions', permissions.join('\n'));
      return embed;
    };

    // Enforce Bot Permissions. Exclude System Override User.
    if (interaction.user.id !== 100737000973275136n) {
      if (this.#assurances?.requireGuild) {
        const guild = (await Bootstrap.bot.cache.guilds.get(interaction.guildId!))!;
        const member = (await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, interaction.guildId!))!;
        // Enforce User Permissions
        if (this.#assurances?.userRequiredGuildPermissions?.length > 0 && !hasGuildPermissions(guild, interaction.member!, this.#assurances?.userRequiredGuildPermissions)) {
          await interaction.respond({ embeds: response(this.#assurances!.userRequiredGuildPermissions, 'member', 'guild') }, { isPrivate: true });
          return false;
        }
        if (this.#assurances?.userRequiredChannelPermissions?.length > 0 && !hasChannelPermissions(guild, interaction.channelId, interaction.member!, this.#assurances?.userRequiredChannelPermissions)) {
          await interaction.respond({ embeds: response(this.#assurances!.userRequiredChannelPermissions, 'member', 'channel') }, { isPrivate: true });
          return false;
        }

        // Enforce Bot Permissions
        if (this.#assurances?.applicationRequiredGuildPermissions?.length > 0 && !hasGuildPermissions(guild, member, this.#assurances?.applicationRequiredGuildPermissions)) {
          await interaction.respond({ embeds: response(this.#assurances!.applicationRequiredGuildPermissions, 'bot', 'guild') }, { isPrivate: true });
          return false;
        }
        if (this.#assurances?.applicationRequiredChannelPermissions?.length > 0 && !hasChannelPermissions(guild, interaction.channelId, member, this.#assurances?.applicationRequiredChannelPermissions)) {
          await interaction.respond({ embeds: response(this.#assurances!.applicationRequiredChannelPermissions, 'bot', 'channel') }, { isPrivate: true });
          return false;
        }
      }
    }

    // Passed Enforcement
    return true;
  }
}

export interface Assurances {
  interaction: string;
  supportedChannelTypes: (ChannelTypes.GuildAnnouncement | ChannelTypes.GuildText | ChannelTypes.DM | ChannelTypes.GroupDm)[];
  requireGuild: boolean;
  userRequiredGuildPermissions: PermissionStrings[];
  userRequiredChannelPermissions: PermissionStrings[];
  applicationRequiredGuildPermissions: PermissionStrings[];
  applicationRequiredChannelPermissions: PermissionStrings[];
}
