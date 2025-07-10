import type { ApplicationCommandOption, ChannelTypes, PermissionStrings } from '@discordeno';

export interface ModifiedApplicationCommandOption extends Omit<ApplicationCommandOption, 'nameLocalizations' | 'descriptionLocalizations'> {
  options?: ModifiedApplicationCommandOption[];
}

export interface CommandSchema {
  name: string;
  description: string;
  options?: ModifiedApplicationCommandOption[];

  // Public Flags
  requireGuild: boolean;
  supportedChannelType: ChannelTypes[];
  requireUserGuildPermissions: PermissionStrings[];
  requireUserChannelPermissions: PermissionStrings[];
  requireBotGuildPermissions: PermissionStrings[];
  requireBotChannelPermissions: PermissionStrings[];

  // Management Flags
  requireDeveloper: boolean;

  // Consumer
  execute: (ctx: unknown) => Promise<void>;
}
export const schema: CommandSchema[] = [];

// interface

/*

import type {
  Bot,
  Interaction,
  ApplicationCommandOption,
} from "https://deno.land/x/discordeno@next/mod.ts";
import {
  ApplicationCommandOptionType,
} from "https://deno.land/x/discordeno@next/mod.ts";
import { parseOptions } from "../utils/parseOptions.ts";

// Final schema pushed here
export interface SlashCommandSchema {
  name: string;
  description: string;
  options?: ApplicationCommandOption[];
  guildOnly?: boolean;
  execute: (ctx: {
    bot: Bot;
    interaction: Interaction;
    args: Record<string, unknown>;
  }) => Promise<void>;
}
export const slashCommands: SlashCommandSchema[] = [];

// Temporary metadata per class
interface MethodMeta {
  name: string;
  description: string;
  options?: ApplicationCommandOption[];
  methodName: string;
}
interface ClassMeta extends Partial<SlashCommandSchema> {
  subCommands?: MethodMeta[];
}
const metaStore = new Map<Function, ClassMeta>();

function getMeta(target: Function): ClassMeta {
  if (!metaStore.has(target)) metaStore.set(target, {});
  return metaStore.get(target)!;
}

/** Top‐level name */
export function Name(name: string) {
  return (ctor: Function) => {
    getMeta(ctor).name = name;
  };
}

/** Top‐level description */
export function Description(desc: string) {
  return (ctor: Function) => {
    getMeta(ctor).description = desc;
  };
}

/** Mark command guild only */
export function GuildOnly(ctor: Function) {
  getMeta(ctor).guildOnly = true;
}

/** Top‐level options (only for non‐subcommand args) */
export function Options(opts: ApplicationCommandOption[]) {
  return (ctor: Function) => {
    getMeta(ctor).options = opts;
  };
}

/** Define a subcommand on a method */
export function SubCommand(
  name: string,
  description: string,
  options?: ApplicationCommandOption[],
) {
  return (
    _target: any,
    propertyKey: string,
    _descriptor: PropertyDescriptor,
  ) => {
    const ctor = _target.constructor;
    const meta = getMeta(ctor);
    meta.subCommands ??= [];
    meta.subCommands.push({ name, description, options, methodName: propertyKey });
  };
}

/** Final decorator: builds options array and handler */
export function SlashCommand() {
  return (Ctor: new () => any) => {
    const m = getMeta(Ctor);
    if (!m.name || !m.description) {
      throw new Error(
        `@SlashCommand missing @Name or @Description on ${Ctor.name}`,
      );
    }

    const instance = new Ctor();
    // Build application-command options
    let cmdOptions: ApplicationCommandOption[] | undefined = m.options;
    if (m.subCommands?.length) {
      cmdOptions = m.subCommands.map((sc) => ({
        type: ApplicationCommandOptionType.SubCommand,
        name: sc.name,
        description: sc.description,
        options: sc.options,
      }));
    }

    // Root execute handles dispatch to subcommands if any
    const execute = async (ctx: {
      bot: Bot;
      interaction: Interaction;
      args: Record<string, unknown>;
    }) => {
      // If no subcommands defined, call default execute
      if (!m.subCommands?.length) {
        return instance.execute(ctx);
      }
      // Extract first option as subcommand
      const raw = ctx.interaction.data.options![0];
      const scMeta = m.subCommands.find((x) => x.name === raw.name);
      if (!scMeta) return;

      // Parse args for subcommand
      const args = parseOptions(raw.options);
      return instance[scMeta.methodName]({ ...ctx, args });
    };

    slashCommands.push({
      name: m.name,
      description: m.description,
      options: cmdOptions,
      guildOnly: m.guildOnly,
      execute,
    });
  };
}


*/
