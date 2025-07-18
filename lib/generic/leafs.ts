import type { ApplicationCommandOptionTypes, ApplicationCommandTypes } from '@discordeno';

/** Base shape for any option */
interface BaseOption<T extends ApplicationCommandOptionTypes> {
  type: T;
  name: string;
  description: string;
  required?: boolean;
  choices?: Array<{ name: string; value: string | number }>;
}

/** Subcommand (1) */
export interface SubCommandOption extends BaseOption<ApplicationCommandOptionTypes.SubCommand> {
  options?: Option[];
}

/** Subcommand Group (2) */
export interface SubCommandGroupOption extends BaseOption<ApplicationCommandOptionTypes.SubCommandGroup> {
  options: SubCommandOption[];
}

/** Leaf option types */
export interface StringOption extends BaseOption<ApplicationCommandOptionTypes.String> {}
export interface IntegerOption extends BaseOption<ApplicationCommandOptionTypes.Integer> {}
export interface NumberOption extends BaseOption<ApplicationCommandOptionTypes.Number> {}
export interface BooleanOption extends BaseOption<ApplicationCommandOptionTypes.Boolean> {}
export interface UserOption extends BaseOption<ApplicationCommandOptionTypes.User> {}
export interface ChannelOption extends BaseOption<ApplicationCommandOptionTypes.Channel> {}
export interface RoleOption extends BaseOption<ApplicationCommandOptionTypes.Role> {}
export interface MentionableOption extends BaseOption<ApplicationCommandOptionTypes.Mentionable> {}

/** Union of every possible Option */
export type Option =
  | SubCommandGroupOption
  | SubCommandOption
  | StringOption
  | IntegerOption
  | NumberOption
  | BooleanOption
  | UserOption
  | ChannelOption
  | RoleOption
  | MentionableOption;

/** Map Discord option types to TS primitives */
export type LeafTypeMap = {
  [ApplicationCommandOptionTypes.String]: string;
  [ApplicationCommandOptionTypes.Integer]: number;
  [ApplicationCommandOptionTypes.Boolean]: boolean;
  [ApplicationCommandOptionTypes.User]: string; // user ID
  [ApplicationCommandOptionTypes.Channel]: string; // channel ID
  [ApplicationCommandOptionTypes.Role]: string; // role ID
  [ApplicationCommandOptionTypes.Mentionable]: string; // user or role ID
  [ApplicationCommandOptionTypes.Number]: number;
};

/** Recursively extract `{ name: value }` from an options array */
export type ExtractArgsFromOptions<
  T extends readonly Option[] | undefined,
> = T extends readonly Option[] ? {
    [O in T[number] as O['name']]: O extends SubCommandGroupOption ? {
        [G in O['options'][number] as G['name']]: ExtractArgsFromOptions<G['options']>;
      }
      : O extends SubCommandOption ? ExtractArgsFromOptions<O['options']>
      : O extends { type: infer U } ? U extends keyof LeafTypeMap ? O['required'] extends true ? LeafTypeMap[U]
          : LeafTypeMap[U] | undefined
        : never
      : never;
  }
  : {};

/** Full ChatInput Command JSON shape */
export interface ChatInputCommandJSON {
  type: ApplicationCommandTypes.ChatInput;
  name: string;
  description: string;
  options?: readonly Option[];
}

/** Final argument type for a given command definition */
export type ChatInputArgs<C extends ChatInputCommandJSON> = ExtractArgsFromOptions<C['options']>;
