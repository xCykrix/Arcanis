/** Language Index */
export const lang = {
  'global': {
    'internal.interaction.timeout': 'I have timed out waiting on this request. I will no longer be able to reply to this action.',
    'internal.interaction.authorRequired': 'I will not respond to this request unless you are the original author. Please attempt the original request first.',
    'permission.user.missing': 'You are missing one or more required permission for this request.',
    'permission.user.denied': 'You are not authorized for this request.',
    'permission.bot.missing': 'I am missing one or more required permissions for this request.',
    'channel.unsupported': 'This interaction does not support this type of channel.',
  },
  'eval': {
    'component.code': 'Unable to validate the input.',
    'result.default': 'Async Wrapper failed to evaluate.',
    'result.undefined': 'Async Wrapper did not have a returned value.',
    'unauthorized': 'Unauthorized Access Attempt. This has been reported.',
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
  return null as Lang[T][K]; // Or throw an error
}
