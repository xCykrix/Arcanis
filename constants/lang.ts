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
    'autocomplete.notfound': 'Search returned no results.',
    'autocomplete.toomany': 'Further specify your search terms to show additional results.',
  },
  'dev.eval': {
    'component.code': 'Unable to validate the input.',
    'result.default': 'Async Wrapper failed to evaluate.',
    'result.undefined': 'Async Wrapper did not have a returned value.',
  },
  'forward.add': {
    'emoji.invalid': 'The specified Emoji for the forwarder was invalid. Please ensure you use the built-in emoji picker and add one reaction only.',
    'result.same-channel': 'You cannot forward from and to the same channel.',
    'result.exceed': 'You may only create up to {{0}} forwarders per channel. Please remove one before creating another.',
    'result': 'The forwarder has been applied to the specified channel.',
  },
  'forward.delete': {
    'emoji.invalid': 'The specified emoji for the forwarder to delete was invalid. Please ensure you use the built-in emoji picker and add one reaction only.',
    'nonexistant': 'Unable to find the specified forwarder. Please check the provided information or issue the original request again.',
    'result': 'The forwarder has been removed from the specified channel.',
  },
  'forward.list': {
    'nonexistant': 'Unable to find any specified forwarder(s). Please check the provided information.',
    'result': 'Reaction Forward List',
  },
  'pin.set': {
    'text.invalid': 'Unable to validate the input message. It must not be empty or blank space. Please try again later.',
    'result': 'The pinned message has been applied to the specified channel. It will appear or be updated shortly.',
  },
  'pin.delete': {
    'nonexistant': 'Unable to find the specified pinned message. Please check the provided information or issue the original request again.',
    'result': 'The pinned message has been removed from the specified channel.',
  },
  'reaction.set': {
    'emoji.invalid': 'One ore more of the specified Emojis to react was invalid. Please ensure you use the built-in emoji picker and that each reaction is separated by one space.',
    'emoji.exceed': 'Discord limits us to 20 unique reactions per message. You currently have {{0}} reactions already configured, adding {{1}} more would exceed 20.',
    'exclusivity': 'The message type "{{0}}" is not compatible with "{{1}}". Please delete existing auto reactions and try again.',
    'result': 'The auto reaction(s) have been applied to the specified channel.',
  },
  'reaction.delete': {
    'nonexistant': 'Unable to find the specified auto reaction. Please check the provided information.',
    'result': 'The auto reaction(s) has been removed from the specified channel.',
  },
  'reaction.list': {
    'nonexistant': 'Unable to find any specified auto reaction(s). Please check the provided information.',
    'result': 'The following auto reaction(s) are configured for the specified channel.',
  },
  'reaction.exclude': {
    'nonexistant': 'Unable to find the specified auto reaction. Please check the provided information or issue the original request again.',
    'follow-up.description': 'Please use the following drop-downs to configure the exclusions.',
    'follow-up.save': 'The auto reaction exclusions have been updated.',
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
