//

import { ChannelTypes, commandOptionsParser, InteractionTypes, MessageComponent, type PermissionStrings } from '@discordeno';
import type { DenoKvCommitError, DenoKvCommitResult } from '@kvdex';
import { ulid } from '@ulid';
import { developerAuthorizationConst, supportAuthorizationConst } from '../../constants/const.ts';
import { getLang } from '../../constants/lang.ts';
import { Bootstrap } from '../../mod.ts';
import { DatabaseConnector } from '../database/database.ts';
import { Permissions } from '../util/helper/permissions.ts';
import { Responses } from '../util/helper/responses.ts';
import { Optic } from '../util/optic.ts';

/**
 * Create a ChatInput Group Command Builder.
 */
export class GroupBuilder<Context> {
  private assistant!: InteractionHandlerAssistant<Context>;

  /** The Assurances of the Builder */
  private assurance: GroupAssurance = {
    interactionTopLevel: null,
    componentTopLevel: null,
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
  public static builder<BuilderContext>(): GroupBuilder<BuilderContext> {
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
    inhibitor: (passthrough: {
      interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction;
      args: Context;
      assistant: InteractionHandlerAssistant<Context>;
    }) => boolean;
    /** Consumes the Interaction. */
    handle: (passthrough: {
      interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction;
      args: Context;
      assistant: InteractionHandlerAssistant<Context>;
      // Optionals
      guild?: typeof Bootstrap.bot.cache.$inferredTypes.guild;
      botMember?: typeof Bootstrap.bot.cache.$inferredTypes.member;
    }) => Promise<void>;
  }): Omit<GroupBuilder<Context>, 'createGroupHandler'> {
    // Set Assistant
    this.assurance = handler.assurance;
    this.assistant = new InteractionHandlerAssistant<Context>(this.assurance);

    // Verify Assurance
    if (this.assurance.interactionTopLevel === null) throw new Deno.errors.InvalidData('interactionTopLevel cannot be null.');

    // Register Event
    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (interaction.type !== InteractionTypes.ApplicationCommand) return;
      if (interaction.data?.name !== this.assurance.interactionTopLevel) return;
      if (interaction.channelId === undefined) return;

      // Strict Enforce Developer
      if (
        this.assurance.requireDeveloper &&
        !developerAuthorizationConst.includes(interaction.user.id)
      ) {
        await interaction.respond({
          embeds: Responses.error.make()
            .setDescription(getLang('global', 'permission.user.denied')!),
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
          embeds: Responses.error.make().setDescription(getLang('global', 'interaction.requireGuild')!),
        });
        return;
      }

      // Run Inhibitor
      if (
        handler.inhibitor({
          interaction,
          args: this.assistant.context(interaction),
          assistant: this.assistant,
        })
      ) return;

      // Enforce Type Restrictions
      const channelTypes: ChannelTypes[] = this.assurance.supportedChannelTypes ?? [ChannelTypes.GuildAnnouncement, ChannelTypes.GuildText, ChannelTypes.GuildForum, ChannelTypes.GuildMedia];
      if (interaction.channel.type === undefined || !channelTypes.includes(interaction.channel.type)) {
        await interaction.respond({
          embeds: Responses.error.make()
            .setDescription(getLang('global', 'channel.unsupported')!)
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
              .setDescription(getLang('global', 'permission.user.gmissing')!)
              .addField('Permissions', this.assurance.userRequiredGuildPermissions.join('\n')),
          }, {
            isPrivate: true,
          }).catch(() => {});
          return;
        }

        if (!isUserSupport && this.assurance.userRequiredChannelPermissions.length > 0 && !Permissions.hasChannelPermissions(guild, interaction.channelId, interaction.member, this.assurance.userRequiredChannelPermissions)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(getLang('global', 'permission.user.cmissing')!)
              .addField('Permissions', this.assurance.userRequiredChannelPermissions.join('\n')),
          }, {
            isPrivate: true,
          });
          return;
        }

        if (this.assurance.botRequiredGuildPermissions.length > 0 && !Permissions.hasGuildPermissions(guild, member, this.assurance.botRequiredGuildPermissions)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(getLang('global', 'permission.bot.gmissing')!)
              .addField('Permissions', this.assurance.botRequiredGuildPermissions.join('\n')),
          }, {
            isPrivate: true,
          });
          return;
        }

        if (this.assurance.botRequiredChannelPermissions.length > 0 && !Permissions.hasChannelPermissions(guild, interaction.channelId, member, this.assurance.botRequiredChannelPermissions)) {
          await interaction.respond({
            embeds: Responses.error.make()
              .setDescription(getLang('global', 'permission.bot.cmissing')!)
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
        args: this.assistant.context(interaction),
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
      assistant: InteractionHandlerAssistant<Context>;
    }) => Promise<void>;
  }): Omit<GroupBuilder<Context>, 'createGroupHandler'> {
    if (this.assurance.componentTopLevel === null) throw new Deno.errors.InvalidData('componentTopLevel cannot be null.');

    Bootstrap.event.add('interactionCreate', async (interaction) => {
      if (interaction.data?.customId === undefined) return;
      if (!interaction.data.customId.startsWith(`${this.assurance.componentTopLevel}.${handler.ref}`)) return;

      // Get Callback (Enforces User)
      const callback = await this.assistant.getComponentCallback(interaction.data.customId, interaction.user.id);
      if (callback === null) {
        interaction.respond({
          embeds: Responses.error.make().setDescription(getLang('global', 'component.timeout')!),
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
}

class InteractionHandlerAssistant<Context> {
  private assurance: GroupAssurance;

  public constructor(assurance: GroupAssurance) {
    this.assurance = assurance;
  }

  /** Fetch the Context of a Interaction. Helper Function. */
  public context(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction): Context {
    return commandOptionsParser(interaction) as Context;
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
      result = await DatabaseConnector.appd.component.add({
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
    const fbpi = await DatabaseConnector.appd.component.findByPrimaryIndex('callbackId', cluid);
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
