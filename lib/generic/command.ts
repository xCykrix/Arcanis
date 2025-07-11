import { ApplicationCommandOptionTypes, commandOptionsParser, Interaction, type ApplicationCommandOption, type ChannelTypes, type PermissionStrings } from '@discordeno';
import { Bootstrap } from '../../mod.ts';

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

interface MethodMeta {
  name: string;
  description: string;
  options?: ModifiedApplicationCommandOption[];
  methodName: string;
}

interface ClassMeta extends Partial<CommandSchema> {
  subCommands?: MethodMeta[];
}
// deno-lint-ignore ban-types
const metaStore = new Map<Function, ClassMeta>();

// deno-lint-ignore ban-types
function getMeta(target: Function): ClassMeta {
  if (!metaStore.has(target)) metaStore.set(target, {});
  return metaStore.get(target)!;
}

export function SubCommand(props: {
  name: string;
  description: string;
  options?: ApplicationCommandOption[];
  guildOnly?: boolean;
}): (target: any, methodName: string, _desc: PropertyDescriptor) => void {
  return (
    target: any,
    methodName: string,
    _desc: PropertyDescriptor,
  ) => {
    const ctor = target.constructor;
    const meta = getMeta(ctor);
    meta.subCommands ??= [];
    meta.subCommands.push({
      ...props,
      methodName,
    });
  };
}

// 🎯 Final decorator to bind and register
export function SlashCommand(name: string, description: string): (Ctor: new () => any) => void {
  return (Ctor: new () => any) => {
    const meta = getMeta(Ctor);
    const instance = new Ctor();

    const options = meta.subCommands?.map((sc) => ({
      type: ApplicationCommandOptionTypes.SubCommand,
      name: sc.name,
      description: sc.description,
      options: sc.options,
    }));

    const execute = async (ctx: {
      bot: typeof Bootstrap.bot;
      interaction: Interaction;
      args: Record<string, unknown>;
    }) => {
      const raw = ctx.interaction.data?.options?.[0];
      const sc = meta.subCommands?.find((x) => x.name === raw?.name);
      if (!sc) return;

      const args = commandOptionsParser(ctx.interaction as typeof Bootstrap.bot.transformers.$inferredTypes));
      return instance[sc.methodName]({ ...ctx, args });
    };

    schema.push({
      name,
      description,
      options,
      guildOnly: meta.subCommands?.some((x) => x.),
      execute,
    });
  };
}

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
// export function Name(name: string) {
//   return (ctor: Function) => {
//     getMeta(ctor).name = name;
//   };
// }

// /** Top‐level description */
// export function Description(desc: string) {
//   return (ctor: Function) => {
//     getMeta(ctor).description = desc;
//   };
// }

// /** Mark command guild only */
// export function GuildOnly(ctor: Function) {
//   getMeta(ctor).guildOnly = true;
// }

// /** Top‐level options (only for non‐subcommand args) */
// export function Options(opts: ApplicationCommandOption[]) {
//   return (ctor: Function) => {
//     getMeta(ctor).options = opts;
//   };
// }

// /** Define a subcommand on a method */
// export function SubCommand(
//   name: string,
//   description: string,
//   options?: ApplicationCommandOption[],
// ) {
//   return (
//     _target: any,
//     propertyKey: string,
//     _descriptor: PropertyDescriptor,
//   ) => {
//     const ctor = _target.constructor;
//     const meta = getMeta(ctor);
//     meta.subCommands ??= [];
//     meta.subCommands.push({ name, description, options, methodName: propertyKey });
//   };
// }

// /** Final decorator: builds options array and handler */
// export function SlashCommand() {
//   return (Ctor: new () => any) => {
//     const m = getMeta(Ctor);
//     if (!m.name || !m.description) {
//       throw new Error(
//         `@SlashCommand missing @Name or @Description on ${Ctor.name}`,
//       );
//     }

//     const instance = new Ctor();
//     // Build application-command options
//     let cmdOptions: ApplicationCommandOption[] | undefined = m.options;
//     if (m.subCommands?.length) {
//       cmdOptions = m.subCommands.map((sc) => ({
//         type: ApplicationCommandOptionType.SubCommand,
//         name: sc.name,
//         description: sc.description,
//         options: sc.options,
//       }));
//     }

//     // Root execute handles dispatch to subcommands if any
//     const execute = async (ctx: {
//       bot: Bot;
//       interaction: Interaction;
//       args: Record<string, unknown>;
//     }) => {
//       // If no subcommands defined, call default execute
//       if (!m.subCommands?.length) {
//         return instance.execute(ctx);
//       }
//       // Extract first option as subcommand
//       const raw = ctx.interaction.data.options![0];
//       const scMeta = m.subCommands.find((x) => x.name === raw.name);
//       if (!scMeta) return;

//       // Parse args for subcommand
//       const args = parseOptions(raw.options);
//       return instance[scMeta.methodName]({ ...ctx, args });
//     };

//     slashCommands.push({
//       name: m.name,
//       description: m.description,
//       options: cmdOptions,
//       guildOnly: m.guildOnly,
//       execute,
//     });
//   };
// }

// */


// import type { Bot, Interaction } from "https://deno.land/x/discordeno@next/mod.ts";
// import {
//   Name,
//   Description,
//   GuildOnly,
//   SubCommand,
//   SlashCommand,
// } from "../decorators/command.ts";

// @Name("admin")
// @Description("Administrative utilities")
// @GuildOnly
// @SlashCommand()
// export class AdminCommand {
//   // /admin kick <user> [reason]
//   @SubCommand(
//     "kick",
//     "Kick a user",
//     [
//       { name: "user", description: "User to kick", type: 6, required: true },
//       { name: "reason", description: "Reason", type: 3 },
//     ],
//   )
//   async kick({
//     bot,
//     interaction,
//     args,
//   }: {
//     bot: Bot;
//     interaction: Interaction;
//     args: Record<string, unknown>;
//   }) {
//     const userId = BigInt(args.user as string);
//     const reason = (args.reason as string) || "No reason";
//     await bot.helpers.kickMember(interaction.guildId!, userId);
//     await bot.helpers.sendInteractionResponse(
//       interaction.id,
//       interaction.token,
//       {
//         type: 4,
//         data: { content: `Kicked <@${userId}> (${reason})` },
//       },
//     );
//   }

//   // /admin ban <user> [reason]
//   @SubCommand(
//     "ban",
//     "Ban a user",
//     [
//       { name: "user", description: "User to ban", type: 6, required: true },
//       { name: "reason", description: "Reason", type: 3 },
//     ],
//   )
//   async ban({
//     bot,
//     interaction,
//     args,
//   }: {
//     bot: Bot;
//     interaction: Interaction;
//     args: Record<string, unknown>;
//   }) {
//     const userId = BigInt(args.user as string);
//     const reason = (args.reason as string) || "No reason";
//     await bot.helpers.createGuildBan(interaction.guildId!, userId, 0, reason);
//     await bot.helpers.sendInteractionResponse(
//       interaction.id,
//       interaction.token,
//       {
//         type: 4,
//         data: { content: `Banned <@${userId}> (${reason})` },
//       },
//     );
//   }
// }

// import {
//   startBot,
//   registerApplicationCommands,
//   isApplicationCommand,
//   Bot,
//   Interaction,
// } from "https://deno.land/x/discordeno@next/mod.ts";
// import { expandGlob } from "https://deno.land/std@0.140.0/fs/mod.ts";

// import { slashCommands } from "./decorators/command.ts";
// import { parseOptions } from "./utils/parseOptions.ts";

// const TOKEN = Deno.env.get("DISCORD_TOKEN")!;
// const GUILD_ID = BigInt(Deno.env.get("DEV_GUILD_ID")!);

// const bot = new Bot({
//   token: TOKEN,
//   intents: [],
//   events: {
//     ready() {
//       console.log(`Logged in as ${bot.id}`);
//     },
//     async interactionCreate(bot, interaction) {
//       if (!isApplicationCommand(interaction)) return;

//       const name = interaction.data.name;
//       const cmd = slashCommands.find((c) => c.name === name);
//       if (!cmd) return;
//       if (cmd.guildOnly && !interaction.guildId) return;

//       const args = parseOptions(interaction.data.options);
//       try {
//         await cmd.execute({ bot, interaction, args });
//       } catch (err) {
//         console.error(`Error on /${name}:`, err);
//       }
//     },
//   },
// });

// // Fire decorators by loading all command files
// for await (const file of expandGlob("./commands/*.ts")) {
//   await import(file.path);
// }

// await startBot(bot);

// // Register decorated commands to your DEV guild
// await registerApplicationCommands(
//   bot,
//   slashCommands.map(({ name, description, options }) => ({
//     name,
//     description,
//     options,
//   })),
//   { guildId: GUILD_ID },
// );

// console.log("Registered:", slashCommands.map((c) => c.name));

// https://copilot.microsoft.com/chats/cephxur9zhLbBoBSznuxd
