/** Language Index */
export const lang = {
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
      'gt-10-found': 'Search returned 10+ results. Type to further specify.',
    },
    'guild': {
      'permission.bot.missing': 'I am missing one or more required permissions for this request in this Guild.',
      'permission.user.missing': 'You are missing one or more required permission for this request in this Guild.',
    },
    'channel': {
      'unsupported': 'This interaction does not support this type of channel for this request.',
      'permission.bot.missing': 'I am missing one or more required permissions for this request in this Channel.',
      'permission.user.missing': 'You are missing one or more required permission for this request in this Channel.'
    },
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
  'pin.add-template': {
    'text.invalid': 'Unable to validate the input message. It must not be empty or blank space. Please try again later.',
    'result': 'The template has been saved to the server shared template index.',
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

// --- Example Usage (for testing type inference and functionality) ---
/*
// These would typically be in a .ts file to see type checking in an IDE

// 2-level access
const globalInteraction: string | null = getLang('global', 'interaction.requireGuild');
const globalPermUser: string | null = getLang('global', 'permission.user.denied', ['user123']);
const userGreeting: string | null = getLang('userProfile', 'greeting', ['Alice']);

// 3-level access
const userNotificationSetting: string | null = getLang('userProfile', 'settings', 'notifications', ['enabled']);
const userPrivacySetting: string | null = getLang('userProfile', 'settings', 'privacy', ['private']);
const forwardWarning: string | null = getLang('forward.add', 'warnings', 'rateLimit');


console.log(globalInteraction);
console.log(globalPermUser);
console.log(userGreeting);
console.log(userNotificationSetting);
console.log(userPrivacySetting);
console.log(forwardWarning);

// Examples of invalid paths or types (should ideally show errors in IDE)
// const invalidPath1 = getLang('global', 'nonExistentKey'); // Error: Argument of type '"nonExistentKey"'...
// const invalidPath2 = getLang('userProfile', 'settings'); // null, because 'settings' is an object, not a string
// console.log('Invalid path 2 (settings object):', invalidPath2); // Expected: null

// const invalidPath3 = getLang('userProfile', 'greeting', 'extraKey'); // Error: overload mismatch or too many arguments
// const invalidPath4 = getLang('userProfile', 'nonExistentSubGroup', 'someKey'); // Error: Argument of type '"nonExistentSubGroup"'...
// const invalidPath5 = getLang('userProfile', 'settings', 'nonExistentFinalKey'); // Error: Argument of type '"nonExistentFinalKey"'...

// Test case where key exists but is not a string
const devEvalResult = getLang('dev.eval', 'result'); // This path leads to an object in the original structure.
                                                    // With the updated lang, 'dev.eval.result' is not defined.
                                                    // Let's use a valid example for this test.
                                                    // If 'lang.userProfile.settings' was called with 2 keys:
const settingsObject = getLang('userProfile', 'settings'); // This will return null because 'settings' is an object.
console.log("Accessing 'userProfile.settings' with 2 keys:", settingsObject); // Expected: null

const missingPlaceholders = getLang('userProfile', 'greeting'); // "Hello, {{0}}!"
console.log("Missing placeholders:", missingPlaceholders);

const tooManyPlaceholders = getLang('global', 'interaction.requireGuild', ['p1', 'p2']); // "This interaction must be executed..." (placeholders ignored)
console.log("Too many placeholders:", tooManyPlaceholders);
*/
