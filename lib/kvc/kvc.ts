import { collection, type Database, kvdex, type Model, model } from '@kvdex';
import type { ReactionModuleForwardConfiguration } from './model/appd/forward.ts';
import type { PinModuleConfiguration, PinModuleTemplate } from './model/appd/pin.ts';
import type { ReactionModuleConfiguration, ReactionModuleExclusionConfiguration } from './model/appd/reaction.ts';
import type { Component } from './model/persistd/component.ts';
import type { Lock } from './model/persistd/lock.ts';
import type { Application } from './model/rconf/application.model.ts';

function createModel<T = { type: string }>(): Model<T> {
  return model();
}

/** rconfStaticSchema */
const rconfStaticSchema = {
  application: collection(createModel<Application>(), {
    history: true,
    indices: {
      applicationId: 'primary',
      publicKey: 'primary',
      token: 'secondary',
    },
  }),
};

/** appdStaticSchema */
const appdStaticSchema = {
  forward: collection(createModel<ReactionModuleForwardConfiguration>(), {
    indices: {
      guid: 'primary',
      guildId: 'secondary',
      fromChannelId: 'secondary',
      toChannelId: 'secondary',
    },
  }),

  // Message: Pin Collections
  pin: collection(createModel<PinModuleConfiguration>(), {
    indices: {
      channelId: 'primary',
      guildId: 'secondary',
    },
  }),
  pinTemplate: collection(createModel<PinModuleTemplate>(), {
    indices: {
      guid: 'primary',
      channelId: 'secondary',
    },
  }),

  // Message: Reaction Collections
  reaction: collection(createModel<ReactionModuleConfiguration>(), {
    indices: {
      guid: 'primary',
      guildId: 'secondary',
      channelId: 'secondary',
    },
  }),
  reactionExclusion: collection(createModel<ReactionModuleExclusionConfiguration>(), {
    indices: {
      channelId: 'primary',
      guildId: 'secondary',
    },
  }),
};

/** persistdStaticSchema */
const persistdStaticSchema = {
  component: collection(createModel<Component>(), {
    indices: {
      callbackId: 'primary',
    },
  }),
  locks: collection(createModel<Lock>(), {
    indices: {
      guid: 'primary',
    },
  }),
};

/**
 * DatabaseConnector for Remote Key Database.
 */
export class KVC {
  static #rconf: Deno.Kv;
  static #appd: Deno.Kv;
  static #persistd: Deno.Kv;
  public static rconf: Database<typeof rconfStaticSchema>;
  public static appd: Database<typeof appdStaticSchema>;
  public static persistd: Database<typeof persistdStaticSchema>;

  /**
   * Initialize the Database Connectors.
   *
   * @private This is an internal call. Please do not call this directly.
   */
  private static async setup(): Promise<void> {
    if (this.#rconf !== undefined && this.#appd === undefined) return;

    // Get Environment Variables.
    const rconf = Deno.env.get('RCONF');
    const appd = Deno.env.get('APPD');
    const persist = Deno.env.get('PERSIST');

    // Verify Environment Variables.
    if (rconf === undefined) throw new Deno.errors.NotFound(`Environment Variable 'RCONF' is undefined.`);
    if (appd === undefined) throw new Deno.errors.NotFound(`Environment Variable 'APPD' is undefined.`);
    if (persist === undefined) throw new Deno.errors.NotFound(`Environment Variable 'PERSIST' is undefined.`);

    // Initialize KV.
    this.#rconf = await Deno.openKv(rconf);
    this.#appd = await Deno.openKv(appd);
    this.#persistd = await Deno.openKv(persist);

    // Initialize Database Wrapper.
    this.rconf = kvdex({
      kv: this.#rconf,
      schema: rconfStaticSchema,
    });
    this.appd = kvdex({
      kv: this.#appd,
      schema: appdStaticSchema,
    });
    this.persistd = kvdex({
      kv: this.#persistd,
      schema: persistdStaticSchema,
    });
  }
}

/** Setup DatabaseConnector. */
await KVC['setup']();
