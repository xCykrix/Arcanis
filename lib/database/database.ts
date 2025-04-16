import { collection, Database, kvdex } from '@kvdex';
import { applicationModel } from './model/application.model.ts';

const rconfStaticSchema = {
  application: collection(applicationModel, {
    history: true,
    indices: {
      applicationId: 'primary',
      publicKey: 'primary',
      token: 'secondary',
    },
  }),
};

const appdStaticSchema = {};

export class DatabaseConnector {
  static #rconf: Deno.Kv;
  static #appd: Deno.Kv;
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

    // Verify Environment Variables.
    if (rconf === undefined) throw new Deno.errors.NotFound(`Environment variable 'RCONF' must be defined.`);
    if (appd === undefined) throw new Deno.errors.NotFound(`Environment variable 'APPD' must be defined.`);

    // Initialize KV.
    this.#rconf = await Deno.openKv(rconf);
    this.#appd = await Deno.openKv(rconf);

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

await DatabaseConnector['setup']();
