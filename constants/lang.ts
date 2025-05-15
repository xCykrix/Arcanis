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
  'eval': {
    'component.code': 'Unable to validate the input.',
    'result.default': 'Async Wrapper failed to evaluate.',
    'result.undefined': 'Async Wrapper did not have a returned value.',
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
): Lang[T][K] | null {
  const groupValue = lang[group];
  if (groupValue && typeof groupValue === 'object' && key in groupValue) {
    return groupValue[key];
  }
  return null as Lang[T][K];
}
