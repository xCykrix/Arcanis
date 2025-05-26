/** Language Index */
export const lang = {
  'global': {
    'interaction.requireGuild': 'This interaction must be executed in a Guild and does not support Direct Message.',
    'channel.unsupported': 'This interaction does not support this type of channel for this request.',
    'permission.bot.gmissing': 'I am missing one or more required permissions for this request in this Guild.',
    'permission.bot.cmissing': 'I am missing one or more required permissions for this request in this Channel.',
    'permission.user.gmissing': 'You are missing one or more required permission for this request in this Guild.',
    'permission.user.cmissing': 'You are missing one or more required permission for this request in this Channel.',
    'permission.user.denied': 'You are not authorized for this request. A Security Incident has been tracked.',
    'component.timeout': 'I have timed out waiting on this request. I will no longer be able to reply to this action to you.',
  },
  'dev.eval': {
    'component.code': 'Unable to validate the input.',
    'result.default': 'Async Wrapper failed to evaluate.',
    'result.undefined': 'Async Wrapper did not have a returned value.',
  },
  'forward.add': {
    'emoji.invalid': 'The specified Emoji for the forwarder was invalid. Please ensure you use the built-in Emoji Picker and add one reaction only.',
    'result.exceed': 'You may only create up to {{0}} forwarders per channel. Please remove one before creating another.',
    'result': 'Reaction Forwarder Configured',
  },
  'forward.delete': {
    'emoji.invalid': 'The specified Emoji for the forwarder to delete was invalid. Please ensure you use the built-in Emoji Picker and add one reaction only.',
    'nonexistant': 'Unable to find the specified forwarder. Please check the provided information or issue the original request again.',
    'result': 'Reaction Forwarder Deleted',
  },
  'reaction.set': {
    'emoji.invalid': 'One ore more of the specified Emojis to react was invalid. Please ensure you use the built-in Emoji Picker and that each reaction is separated by one space.',
    'emoji.exceed': 'Discord limits us to 20 unique reactions per message. You currently have {{0}} reactions already configured, adding {{1}} more would exceed 20.',
    'exclusivity': 'The message type "{{0}}" is not compatible with "{{1}}". Please delete existing auto reactions and try again.',
    'result': 'Auto Reactions have been applied to the specified channel.',
  },
  'reaction.delete': {
    'nonexistant': 'Unable to find the specified auto reaction. Please check the provided information.',
    'result': 'The Auto Reaction has been removed from the specified channel.',
  },
  'reaction.list': {
    'nonexistant': 'Unable to find any specified auto reaction(s). Please check the provided information.',
    'result': 'The following Auto Reaction(s) are configured for the specified channel.',
  },
  'reaction.exclude': {
    'nonexistant': 'Unable to find the specified auto reaction. Please check the provided information or issue the original request again.',
    'follow-up.description': 'Please use the following drop-downs to configure the exclusions.',
    'follow-up.save': 'Auto reaction exclusions have been updated.',
  },
} as const;

// Deep Read Properties
type DeepReadonly<T> = T extends object ? {
    readonly [K in keyof T]: DeepReadonly<T[K]>;
  }
  : T;
type Lang = DeepReadonly<typeof lang>;

/**
 * Get a indexed language id.
 *
 * @param group The group.
 * @param key The key.
 * @returns A string or null.
 */
export function getLang<T extends keyof Lang, K extends keyof Lang[T]>(
  group: T,
  key: K,
  placeholders?: (string | number | boolean)[],
): Lang[T][K] | null {
  const groupValue = lang[group];
  if (groupValue && typeof groupValue === 'object' && key in groupValue) {
    let gv = groupValue[key] as string;
    for (let i = 0; i < (placeholders?.length ?? 0); i++) {
      gv = gv.replace(`{{${i}}}`, `${(placeholders ?? [])[i]!}`);
    }
    return gv as Lang[T][K];
  }
  return null as Lang[T][K];
}
