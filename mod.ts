import type { CreateApplicationCommand } from '@discordeno';
import { type CacheBotType, createBotWithToken } from './lib/bot.ts';
import { DatabaseConnector } from './lib/database/database.ts';
import type { Application } from './lib/database/model/application.model.ts';
import { EventManager } from './lib/manager/event.ts';
import { loadRequiredEvents } from './lib/native/loadRequiredEvents.ts';
import { optic } from './lib/util/helper/optic.ts';
import ReactionModule from './module/reaction/module.ts';

export class Bootstrap {
  static #application: Application | null = null;
  public static interaction = new Set<CreateApplicationCommand>();
  public static bot: CacheBotType;
  public static event: EventManager;

  /** Main Boostrap Entrypoint. */
  private static async boot(): Promise<void> {
    const application = (await this.getApplicationConfiguration())!;
    optic.info(`Application ID: ${application?.applicationId} / ${application!.publicKey}`);

    // Initialize Bot Application
    this.bot = createBotWithToken(application.token);
    this.bot.logger = optic as Pick<typeof Bootstrap.bot.logger, 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;

    // Setup Event Manager and Load Default Events
    this.event = new EventManager(this.bot);
    loadRequiredEvents();

    // Register Module
    await (new ReactionModule()).initialize();

    // Connect
    this.bot.start();
  }

  /**
   * Fetch the Application from the Remote Configuration Database.
   *
   * @returns A {@link Application}.
   */
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
