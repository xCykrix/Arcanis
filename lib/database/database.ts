import { collection, type Database, kvdex, type Model, model } from '@kvdex';
import type { Application } from './model/application.model.ts';
import type { ReactionModuleForwardConfiguration } from './model/forward.model.ts';
import type { ReactionModuleConfiguration } from './model/reaction.model.ts';

function createModel<T = { type: string }>(): Model<T> {
  return model();
}

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

const appdStaticSchema = {
  reactionModuleConfiguration: collection(createModel<ReactionModuleConfiguration>(), {
    indices: {
      guid: 'primary',
      guildId: 'secondary',
      channelId: 'secondary',
    },
  }),
  reactionModuleForwardConfiguration: collection(createModel<ReactionModuleForwardConfiguration>(), {
    indices: {
      guid: 'primary',
      guildId: 'secondary',
      fromChannelId: 'secondary',
      toChannelId: 'secondary',
    },
  }),
};

/**
 * DatabaseConnector for Remote Key Database.
 */
export class DatabaseConnector {
  static #rconf: Deno.Kv;
  static #appd: Deno.Kv;
  public static persist: Deno.Kv;
  public static rconf: Database<typeof rconfStaticSchema>;
  public static appd: Database<typeof appdStaticSchema>;

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
    if (rconf === undefined) throw new Deno.errors.NotFound(`Environment variable 'RCONF' must be defined.`);
    if (appd === undefined) throw new Deno.errors.NotFound(`Environment variable 'APPD' must be defined.`);

    // Initialize KV.
    this.#rconf = await Deno.openKv(rconf);
    this.#appd = await Deno.openKv(appd);
    this.persist = await Deno.openKv(persist);

    // Initialize Database Wrapper.
    this.rconf = kvdex({
      kv: this.#rconf,
      schema: rconfStaticSchema,
    });
    this.appd = kvdex({
      kv: this.#appd,
      schema: appdStaticSchema,
    });
  }
}

/** Setup DatabaseConnector. */
await DatabaseConnector['setup']();
