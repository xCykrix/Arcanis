import { type ApplicationCommandOptionChoice, type ApplicationCommandOptionTypes, type Camelize, ChannelTypes, commandOptionsParser, type DiscordApplicationCommandOption, type InteractionDataOption, InteractionTypes, type MessageComponent, type PermissionStrings } from '@discordeno';
import type { DenoKvCommitError, DenoKvCommitResult } from '@kvdex';
import { ulid } from '@ulid';
import { developerAuthorizationConst, supportAuthorizationConst } from '../../constants/const.ts';
import { getLang } from '../../constants/lang.ts';
import { Bootstrap } from '../../mod.ts';
import { KVC } from '../kvc/kvc.ts';
import { Permissions } from '../util/helper/permissions.ts';
import { Responses } from '../util/helper/responses.ts';
import { Optic } from '../util/optic.ts';

/**
 * Create a ChatInput Group Command Builder.
 */
export class GroupBuilder<Packet, RawPacket> {
  private assistant!: InteractionHandlerAssistant<RawPacket>;

  /** The Assurances of the Builder */
  private assurance: GroupAssurance = {
    interactionTopLevel: null,
    componentTopLevel: null,
    guidTopLevel: null,
    supportedChannelTypes: [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText, ChannelTypes.GuildForum, ChannelTypes.GuildMedia],
    requireGuild: true,
    requireDeveloper: false,
    componentRequireAuthor: true,
    botRequiredGuildPermissions: [],
    botRequiredChannelPermissions: [],
    userRequiredGuildPermissions: [],
    userRequiredChannelPermissions: [],
  };

  /**
   * Create a Builder Instance.
   *
   * @returns A {@link GroupBuilder}
   */
  public static builder<BuilderContext, RawPacket>(): GroupBuilder<BuilderContext, RawPacket> {
    return new GroupBuilder();
  }

  /**
   * Set the Inhibitor and Handlers
   *
   * @param inhibitor
   * @param handle
   */
  public createGroupHandler(handler: {
    assurance: GroupAssurance;
    /** Inhibits the Execution if true is returned. */
    pickAndInhibit: (passthrough: {
      interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction;
      args: Partial<RawPacket>;
      assistant: InteractionHandlerAssistant<RawPacket>;
    }) => {
      inhibit: boolean;
      pick: Packet | null;
    };
    /** Consumes the Interaction. */
    handle: (passthrough: {
      interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction;
      args: Packet | null;
      assistant: InteractionHandlerAssistant<RawPacket>;
      // Optionals
      guild?: typeof Bootstrap.bot.cache.$inferredTypes.guild;
      botMember?: typeof Bootstrap.bot.cache.$inferredTypes.member;
    }) => Promise<void>;
  }): Omit<GroupBuilder<Packet, RawPacket>, 'createGroupHandler'> {
    // Set Assistant
    this.assurance = handler.assurance;
    this.assistant = new InteractionHandlerAssistant<RawPacket>(this.assurance);

    // Verify Assurance
    if (this.assurance.interactionTopLevel === null) throw new Deno.errors.InvalidData('interactionTopLevel cannot be null.');

    // Register Event
    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (interaction.type !== InteractionTypes.ApplicationCommand) return;
      if (interaction.data?.name !== this.assurance.interactionTopLevel) return;
      if (interaction.channelId === undefined) return;

      // Run Inhibitor
      const pickAndInhibit = handler.pickAndInhibit({
        interaction,
        args: this.assistant.getPacket(interaction),
        assistant: this.assistant,
      });
      if (pickAndInhibit.inhibit) return;

      // Strict Enforce Developer
      if (
        this.assurance.requireDeveloper &&
        !developerAuthorizationConst.includes(interaction.user.id)
      ) {
        await interaction.respond({
          embeds: Responses.error.make()
            .setDescription(getLang('global', 'interaction', 'user.denied')),
        }, {
          isPrivate: true,
        });
        Optic.incident({
          moduleId: 'GroupBuilder.interactionCreate',
          message: `Security Incident Event - Unauthorized Access Attempt. ${interaction.user.id} ${interaction.user.username} - ${this.assurance.interactionTopLevel}`,
        });
        return;
      }

      // Strict Enforce Guild w/ Member
      if (this.assurance.requireGuild && (interaction.guildId === undefined || interaction.member?.id === undefined)) {
        await interaction.respond({
          embeds: Responses.error.make().setDescription(getLang('global', 'interaction', 'guild.required')),
        });
        return;
      }

      // Enforce Type Restrictions
      const channelTypes: ChannelTypes[] = this.assurance.supportedChannelTypes ?? [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText, ChannelTypes.GuildForum, ChannelTypes.GuildMedia];
      if (interaction.channel.type === undefined || !channelTypes.includes(interaction.channel.type)) {
        await interaction.respond({
          embeds: Responses.error.make()
            .setDescription(getLang('global', 'channel', 'unsupported'))
            .addField('Supported', channelTypes.map((v) => ChannelTypes[v.valueOf()] as keyof typeof ChannelTypes).join('\n')),
        }, {
          isPrivate: true,
        }).catch(() => {});
        return;
      }

      // Hit Permission Cache w/ Guild Check. Bypass from Developer.
      if (this.assurance.requireGuild && !(interaction.guildId === undefined || interaction.member?.id === undefined)) {
        // Get Guild & Member
        const isUserSupport = supportAuthorizationConst.includes(interaction.user.id);
        const guild = (await Bootstrap.bot.cache.guilds.get(interaction.guildId))!;
        const member = (await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, interaction.guildId))!;

        if (!isUserSupport && this.assurance.userRequiredGuildPermissions.length > 0 && !Permissions.hasGuildPermissions(guild, interaction.member, this.assurance.userRequiredGuildPermissions)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(getLang('global', 'guild', 'permission.user.missing'))
              .addField('Permissions', this.assurance.userRequiredGuildPermissions.join('\n')),
          }, {
            isPrivate: true,
          }).catch(() => {});
          return;
        }

        if (!isUserSupport && this.assurance.userRequiredChannelPermissions.length > 0 && !Permissions.hasChannelPermissions(guild, interaction.channelId, interaction.member, this.assurance.userRequiredChannelPermissions)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(getLang('global', 'channel', 'permission.user.missing'))
              .addField('Permissions', this.assurance.userRequiredChannelPermissions.join('\n')),
          }, {
            isPrivate: true,
          });
          return;
        }

        if (this.assurance.botRequiredGuildPermissions.length > 0 && !Permissions.hasGuildPermissions(guild, member, this.assurance.botRequiredGuildPermissions)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(getLang('global', 'guild', 'permission.bot.missing'))
              .addField('Permissions', this.assurance.botRequiredGuildPermissions.join('\n')),
          }, {
            isPrivate: true,
          });
          return;
        }

        if (this.assurance.botRequiredChannelPermissions.length > 0 && !Permissions.hasChannelPermissions(guild, interaction.channelId, member, this.assurance.botRequiredChannelPermissions)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(getLang('global', 'channel', 'permission.bot.missing'))
              .addField('Permissions', this.assurance.botRequiredChannelPermissions.join('\n')),
          }, {
            isPrivate: true,
          });
          return;
        }
      }

      // Run Handle
      await handler.handle({
        interaction,
        args: pickAndInhibit.pick as Packet,
        assistant: this.assistant,
        guild: interaction.guildId !== undefined ? (await Bootstrap.bot.cache.guilds.get(interaction.guildId)) : undefined,
        botMember: interaction.guildId !== undefined ? (await Bootstrap.bot.cache.members.get(Bootstrap.bot.id, interaction.guildId)) : undefined,
      }).catch((e) => {
        Optic.incident({
          moduleId: this.assurance.interactionTopLevel!,
          message: 'Failed to process handler.',
          err: e,
        });
      });
    });

    return this;
  }

  /** */
  public createGroupComponentHandler(handler: {
    ref: string;
    handle: (passthrough: {
      interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction;
      constants: string[];
      assistant: InteractionHandlerAssistant<RawPacket>;
    }) => Promise<void>;
  }): Omit<GroupBuilder<Packet, RawPacket>, 'createGroupHandler'> {
    if (this.assurance.componentTopLevel === null) throw new Deno.errors.InvalidData('componentTopLevel cannot be null.');

    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (![InteractionTypes.MessageComponent, InteractionTypes.ModalSubmit].includes(interaction.type)) return;
      if (interaction.data?.customId === undefined) return;
      if (!interaction.data.customId.startsWith(`${this.assurance.componentTopLevel}.${handler.ref}`)) return;

      // Get Callback (Enforces User)
      const callback = await this.assistant.getComponentCallback(interaction.data.customId, interaction.user.id);
      if (callback === null) {
        interaction.respond({
          embeds: Responses.error.make().setDescription(getLang('global', 'component', 'expire')),
        }, {
          isPrivate: true,
        });
        return;
      }

      // Run Handle
      await handler.handle({
        interaction,
        constants: callback.constants,
        assistant: this.assistant,
      }).catch((e) => {
        Optic.incident({
          moduleId: this.assurance.interactionTopLevel!,
          message: 'Failed to process component handler.',
          err: e,
        });
      });
    });

    return this;
  }

  public createAutoCompleteHandler(handler: {
    /** Inhibits the Execution if true is returned. */
    pick: (passthrough: {
      interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction;
      assistant: InteractionHandlerAssistant<RawPacket>;
    }) => InteractionDataOption | null;
    generate: (passthrough: {
      interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction;
      pick: InteractionDataOption | null;
    }) => Promise<ApplicationCommandOptionChoice[]>;
  }): Omit<GroupBuilder<Packet, RawPacket>, 'createGroupHandler'> {
    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (interaction.type !== InteractionTypes.ApplicationCommandAutocomplete) return;

      // Run Picker
      const pick = handler.pick({
        interaction,
        assistant: this.assistant,
      });
      if (pick === null) return;

      // Run Handle
      const choices = await handler.generate({
        interaction,
        pick,
      }).catch((e) => {
        Optic.incident({
          moduleId: this.assurance.interactionTopLevel!,
          message: 'Failed to process auto complete handler.',
          err: e,
        });
        return null;
      });

      if (choices === null || choices.length === 0) {
        await interaction.respond({
          choices: [
            {
              name: getLang('global', 'autocomplete', 'lt-1-found'),
              value: 'autocomplete.notfound',
            },
          ],
        });
        return;
      }

      await interaction.respond({
        choices: [
          ...choices.slice(0, 9),
          {
            name: getLang('global', 'autocomplete', 'gt-10-found'),
            value: 'autocomplete.toomany',
          },
        ],
      });
    });

    return this;
  }
}

class InteractionHandlerAssistant<RawPacket> {
  private assurance: GroupAssurance;

  public constructor(assurance: GroupAssurance) {
    this.assurance = assurance;
  }

  /** Fetch the Raw Packet Context of a Interaction. Helper Function. */
  public getPacket(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction): RawPacket {
    return commandOptionsParser(interaction) as RawPacket;
  }

  public parseAutoComplete(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction, path: string[]): InteractionDataOption | null {
    let focus: InteractionDataOption | null = null;

    // Get Focused
    for (const a of interaction.data?.options ?? []) {
      if (a.focused && a.name === (path[0] ?? '0xA1')) {
        focus = a;
        break;
      }
      for (const b of a.options ?? []) {
        if (b.focused && b.name === (path[1] ?? '0xA2')) {
          focus = b;
          break;
        }
        for (const c of b.options ?? []) {
          if (c.focused && c.name === (path[2] ?? '0xA3')) {
            focus = c;
            break;
          }
        }
      }
    }

    console.info(focus);

    return focus;
  }

  public parseModal<T extends Record<string, string>>(components?: MessageComponent[]): Partial<T> {
    const records: Record<string, string | undefined> = {};

    for (const component of components ?? []) {
      if (component.type === 1) {
        for (const subcomponent of component.components) {
          if (subcomponent.type === 4) {
            if (subcomponent.customId === undefined) continue;
            records[subcomponent.customId] = subcomponent.value;
          }
        }
      }
    }

    return records as Partial<T>;
  }

  /** */
  public async makeComponentCallback(partition: {
    ref: string;
    /** Time to Live, in Seconds. */
    timeToLive: number;
    userId: string | bigint;
    constants: string[];
  }): Promise<string> {
    let culid: string | null = null;
    let result: DenoKvCommitResult | DenoKvCommitError | null = null;
    while (result === null || result.ok === false) {
      culid = `${this.assurance.componentTopLevel}.${partition.ref}.${ulid()}`;
      result = await KVC.persistd.component.add({
        callbackId: culid,
        userId: partition.userId.toString(),
        constants: partition.constants,
        createdAt: Date.now(),
      }, {
        expireIn: partition.timeToLive * 1000,
      });
    }
    return culid!;
  }

  /** */
  public async getComponentCallback(cluid: string, userId: string | bigint): Promise<
    {
      constants: string[];
    } | null
  > {
    const fbpi = await KVC.persistd.component.findByPrimaryIndex('callbackId', cluid);
    if (fbpi?.versionstamp === undefined) return null;
    if (this.assurance.componentRequireAuthor && fbpi.value.userId !== userId.toString()) return null;

    return {
      constants: fbpi.value.constants,
    };
  }
}

interface GroupAssurance {
  interactionTopLevel: string | null;
  componentTopLevel: string | null;
  guidTopLevel: string | null;
  supportedChannelTypes: (ChannelTypes.GuildAnnouncement | ChannelTypes.GuildText | ChannelTypes.GuildForum | ChannelTypes.GuildMedia | ChannelTypes.DM | ChannelTypes.GroupDm)[];

  // Guild Specific
  requireGuild: boolean;
  requireDeveloper: boolean;
  componentRequireAuthor: boolean;

  // Bot Permissions
  botRequiredGuildPermissions: PermissionStrings[];
  botRequiredChannelPermissions: PermissionStrings[];

  // User Permissions
  userRequiredGuildPermissions: PermissionStrings[];
  userRequiredChannelPermissions: PermissionStrings[];
}

export type CommandOptions<T extends Camelize<DiscordApplicationCommandOption>[]> = {
  [K in T[number] as K['name']]: K['type'] extends ApplicationCommandOptionTypes.Boolean ? boolean
    : K['type'] extends ApplicationCommandOptionTypes.Integer ? number
    : K['type'] extends ApplicationCommandOptionTypes.Number ? number
    : K['type'] extends ApplicationCommandOptionTypes.String ? string
    : K['type'] extends ApplicationCommandOptionTypes.User ? typeof Bootstrap.bot.transformers.$inferredTypes.user
    : K['type'] extends ApplicationCommandOptionTypes.Channel ? typeof Bootstrap.bot.transformers.$inferredTypes.channel
    : K['type'] extends ApplicationCommandOptionTypes.Role ? typeof Bootstrap.bot.transformers.$inferredTypes.role
    : K['type'] extends ApplicationCommandOptionTypes.Mentionable ? string
    : K['type'] extends ApplicationCommandOptionTypes.Attachment ? string
    : K['type'] extends ApplicationCommandOptionTypes.SubCommandGroup ? CommandOptions<Extract<K, { options: Camelize<DiscordApplicationCommandOption>[] }>['options']>
    : K['type'] extends ApplicationCommandOptionTypes.SubCommand ? CommandOptions<Extract<K, { options: Camelize<DiscordApplicationCommandOption>[] }>['options']>
    : never;
};
