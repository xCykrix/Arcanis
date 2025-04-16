import { DatabaseConnector } from './lib/database/database.ts';
import type { Application } from './lib/database/model/application.model.ts';
import { optic } from './lib/util/logger.ts';

class Bootstrap {
  static #application: Application | null = null;

  /** Main Boostrap Entrypoint. */
  private static async boot(): Promise<void> {
    const application = await this.getApplicationConfiguration();
    optic.info(`Fetched Remote Application ID: ${application?.applicationId} / ${application!.publicKey}`);

    // Initialize Application
    // TODO: LEFT OFF HERE
  }

  private static async getApplicationConfiguration(): Promise<Application | null> {
    if (Deno.env.get('APPLICATION_ID') === undefined) throw new Deno.errors.NotFound(`Environment variable 'APPLICATION_ID' must be defined.`);
    if (this.#application) return this.#application;
    const application = await DatabaseConnector.rconf.application.findByPrimaryIndex('applicationId', Deno.env.get('APPLICATION_ID')!);
    if (application === null || application.value === null) throw new Deno.errors.InvalidData(`Application ID '${Deno.env.get('APPLICATION_ID')}' was not found in rconf. Please validate.`);
    return application.value;
  }
}

if (import.meta.main) {
  Bootstrap['boot']();
}
