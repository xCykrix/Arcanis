/** Language Index */
export const lang = {
  // Global messaging.
  'global': {
    'interaction': {
      'guild.required': 'This interaction must be executed in a Guild and does not support Direct Message.',
      'user.denied': 'You are not authorized to initiate this request. An incident has been tracked for this request.',
    },
    'component': {
      'expire': 'This request has expired. Please issue the original request again.',
    },
    'autocomplete': {
      'lt-1-found': 'Search returned no results. Please verify your search criteria.',
      'gt-10-found': 'Search returned several results. Please further specify your search criteria.',
    },
    'guild': {
      'permission.bot.missing': 'I am missing one or more required permissions for this request in this Guild.',
      'permission.user.missing': 'You are missing one or more required permission for this request in this Guild.',
    },
    'channel': {
      'unsupported': 'This interaction does not support this type of channel for this request.',
      'permission.bot.missing': 'I am missing one or more required permissions for this request in this Channel.',
      'permission.user.missing': 'You are missing one or more required permission for this request in this Channel.',
    },
  },
  // Module: dev
  'dev': {
    // Alert
    'alert': {
      'result': 'The channel, {{0}}, has been set to receive alerts and notifications.',
    },
    'send-alert': {
      'invalid.message': 'Unable to validate the input message. It must not be blank or contain empty space. Please try again.',
      'result': 'Dispatching message to all guilds configured for alerts. Delivery will begin shortly.',
    },
    // Eval
    'eval': {
      'invalid.code': 'Unable to validate the inputted code.',
      'default': 'The async wrapper failed to evaluate.',
      'undefined': 'The async wrapper did not return a value.',
    },
  },
  // Module: message
  'message': {
    // Common
    'emoji.invalid.single': 'The specified emoji was invalid. Please ensure you use the built-in emoji picker. Custom emojis are not supported',
    'emoji.invalid.multi': 'The specified emoji(s) were invalid. Please ensure you use the built-in emoji picker and that each reaction is separated by a space. Custom emojis are not supported.',

    // Forward
    'forward': {
      'none-found': 'The specified forwarder(s) were not found. Please check the provided information and try again.',
    },
    'forward.add': {
      'same-channel': 'You cannot forward from and to the same channel.',
      'exceed': 'You may only create up to {{0}} forwarders per channel. Please remove one before creating another.',
      'result': 'The forwarder has been applied to the specified channel.',
    },
    'forward.delete': {
      'result': 'The forwarder has been deleted from the specified channel.',
    },
    'forward.list': {
      'result': 'The following forwarder(s) are currently configured.',
    },

    // Pin
    'pin': {
      'none-found': 'The specified pinned message was not found. Please check the provided information and try again.',
      'invalid.message': 'Unable to validate the input message. It must not be blank or contain empty space. Please try again.',
    },
    'pin.set': {
      'template.none-found': 'The specified template was not found. Please check the provided information and try again.',
      'result': 'The pinned message has been applied to the specified channel. It will appear or be updated on next send.',
    },
    'pin.delete': {
      'result': 'The pinned message has been deleted from the specified channel.',
    },
    'pin.add-template': {
      'result': 'The template, {{0}}, has been saved successfully.',
    },
    'pin.get-template': {},
    'pin.delete-template': {
      'result': 'The template, {{0}}, has been deleted successfully.',
    },

    // Reaction
    'reaction': {
      'none-found': 'The specified auto reaction was not found. Please check the provided information and try again.',
    },
    'reaction.set': {
      'exceed': 'Discord has a limit of 20 unique reactions per message. You currently have {{0}} reactions already configured, adding {{1}} would cause this us exceed 20.',
      'exclusive': `The message type '{{0}}' is not compatible with '{{1}}'. Please delete the existing auto reaction and try again.`,
      'result': 'The auto reaction(s) have been applied to the specified channel.',
    },
    'reaction.delete': {
      'result': 'The auto reaction(s) have been deleted from the specified channel.',
    },
    'reaction.list': {
      'result': 'The following auto reaction(s) are currently configured.',
    },
    'reaction.exclude': {
      'result': 'Please use the following drop-downs to configure the exclusion.',
      'submit': 'The auto reaction exclusions have been updated for the specified channel',
    },
  },
} as const;

// Deep Read Properties (User's original type is good)
type DeepReadonly<T> = T extends object ? {
    readonly [K in keyof T]: DeepReadonly<T[K]>;
  }
  : T;

// Infer the Lang type with deep readonly properties
type Lang = DeepReadonly<typeof lang>;

// --- Overloads for getLang ---

/**
 * Get an indexed language string using two keys.
 * e.g., getLang('global', 'interaction.requireGuild')
 *
 * @param key1 The first-level key.
 * @param key2 The second-level key.
 * @param placeholders Optional array of values to replace {{0}}, {{1}}, etc.
 * @returns The language string or null if not found.
 */
export function getLang<
  TKey1 extends keyof Lang,
  TKey2 extends keyof Lang[TKey1],
>(
  key1: TKey1,
  key2: TKey2,
  placeholders?: ReadonlyArray<string | number | boolean>,
): Lang[TKey1][TKey2] extends string ? Lang[TKey1][TKey2] : null;

/**
 * Get an indexed language string using three keys.
 * e.g., getLang('userProfile', 'settings', 'notifications', ['enabled'])
 *
 * @param key1 The first-level key.
 * @param key2 The second-level key (must lead to an object).
 * @param key3 The third-level key (must lead to a string).
 * @param placeholders Optional array of values to replace {{0}}, {{1}}, etc.
 * @returns The language string or null if not found.
 */
export function getLang<
  TKey1 extends keyof Lang,
  TKey2 extends keyof Lang[TKey1],
  TSubObject extends Lang[TKey1][TKey2], // Represents the object at lang[key1][key2]
  // deno-lint-ignore no-explicit-any
  TKey3 extends TSubObject extends Readonly<Record<string, any>> ? keyof TSubObject : never,
>(
  key1: TKey1,
  key2: TKey2,
  key3: TKey3,
  placeholders?: ReadonlyArray<string | number | boolean>,
): TSubObject[TKey3] extends string ? TSubObject[TKey3] : null;

// --- Implementation of getLang ---
/**
 * Get an indexed language id.
 * Supports 2 or 3 levels of keys.
 *
 * @param args Keys followed by an optional array of placeholders.
 * @returns A string or null.
 */
export function getLang(
  // deno-lint-ignore no-explicit-any
  ...args: any[]
): string | null {
  let pathKeys: string[];
  let pList: ReadonlyArray<string | number | boolean> | undefined;

  // Check if the last argument is an array of placeholders
  const lastArg = args[args.length - 1];
  if (args.length > 1 && Array.isArray(lastArg)) {
    // Basic check to see if it's likely a placeholder array vs a key that is an array
    // (keys are expected to be strings)
    const isPlaceholdersArray = lastArg.length === 0 ||
      ['string', 'number', 'boolean'].includes(typeof lastArg[0]);
    if (isPlaceholdersArray) {
      pathKeys = args.slice(0, -1) as string[];
      pList = lastArg as ReadonlyArray<string | number | boolean>;
    } else {
      pathKeys = args as string[];
      pList = undefined;
    }
  } else {
    pathKeys = args as string[];
    pList = undefined;
  }

  // Validate number of keys (2 for 2-level access, 3 for 3-level access)
  if (pathKeys.length < 2 || pathKeys.length > 3) {
    // console.warn(`getLang: Expected 2 or 3 keys, but received ${pathKeys.length}. Keys: ${pathKeys.join('.')}`);
    return null;
  }

  // deno-lint-ignore no-explicit-any
  let current: any = lang;
  for (const key of pathKeys) {
    if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, key)) {
      current = current[key];
    } else {
      // console.warn(`getLang: Path not found. Failed at key "${key}" in path "${pathKeys.join('.')}"`);
      return null; // Path is invalid or key does not exist
    }
  }

  if (typeof current === 'string') {
    let resultString = current;
    if (pList) {
      for (let i = 0; i < pList.length; i++) {
        // Replace all occurrences of {{i}}
        const placeholderRegex = new RegExp(`\\{\\{${i}\\}\\}`, 'g');
        resultString = resultString.replace(placeholderRegex, String(pList[i]));
      }
    }
    return resultString as string; // Cast is safe due to typeof check and overload return types
  } else {
    // console.warn(`getLang: Path "${pathKeys.join('.')}" did not resolve to a string. Resolved to:`, current);
    return null; // The final path did not lead to a string
  }
}
