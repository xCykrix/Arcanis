import type { ApplicationCommandOption, ApplicationCommandOptionTypes, ApplicationCommandTypes } from '@discordeno';

/** Base Shape for any Option */
interface BaseOption<T extends ApplicationCommandOptionTypes> extends Omit<ApplicationCommandOption, 'nameLocalizations' | 'descriptionLocalizations'> {
  type: T;
}

/** SubCommand */
export interface SubCommandOption extends BaseOption<ApplicationCommandOptionTypes.SubCommand> {
  options?: Option[];
}

/** SubCommand Group */
export interface SubCommandGroupOption extends BaseOption<ApplicationCommandOptionTypes.SubCommandGroup> {
  options: SubCommandOption[];
}

/** Leaf Option Types */
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
  [ApplicationCommandOptionTypes.User]: string;
  [ApplicationCommandOptionTypes.Channel]: string;
  [ApplicationCommandOptionTypes.Role]: string;
  [ApplicationCommandOptionTypes.Mentionable]: string;
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

/** Dynamic handler type for processing. */
export type DynamicInjectedHander<V extends ChatInputCommandJSON> = {
  callback<T extends ChatInputArgs<V>>(passthrough: {
    args: T;
  }): Promise<void>;
};
