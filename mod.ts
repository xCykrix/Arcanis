import type { CreateSlashApplicationCommand } from '@discordeno';
import { type CacheBotType, createBotWithToken } from './lib/bot.ts';
import { DatabaseConnector } from './lib/database/database.ts';
import type { Application } from './lib/database/model/rconf/application.model.ts';
import { defaults } from './lib/defaults.ts';
import { EventManager } from './lib/manager/event.ts';
import { Loader } from './lib/util/loader.ts';
import { optic } from './lib/util/optic.ts';

/** Boostrap Class */
export class Bootstrap {
  // Internal Registers
  static application: Application | null = null;

  /** The Interaction Catalyst Index. */
  public static guildChatInputInteraction = new Set<Omit<CreateSlashApplicationCommand, 'nameLocalizations' | 'descriptionLocalizations' | 'dmPermission' | 'handler' | 'integrationTypes' | 'contexts'>>();
  public static globalChatInputInteraction = new Set<Omit<CreateSlashApplicationCommand, 'nameLocalizations' | 'descriptionLocalizations' | 'dmPermission' | 'handler'>>();

  /** The Internal CacheBot Application. */
  public static bot: CacheBotType;

  /** The Event Manager Registration Module. */
  public static event: EventManager;

  /** Main Boostrap Entrypoint. */
  private static async boot(connect: boolean = true): Promise<void> {
    // Fetch Data from Remote Configuration Server
    if (Deno.env.get('APPLICATION_ID') === undefined) throw new Deno.errors.NotFound(`Environment Variable 'APPLICATION_ID' is undefined.`);
    this.application = (await DatabaseConnector.rconf.application.findByPrimaryIndex('applicationId', Deno.env.get('APPLICATION_ID')!))?.value ?? null;

    // Check Remote Configuration Server Response
    if (this.application === null) throw new Deno.errors.InvalidData(`Application ID '${Deno.env.get('APPLICATION_ID')}' Not Found via Remote Configuration. Please validate.`);

    // Post Status
    optic.info(`Application ID: ${this.application?.applicationId} / ${this.application.publicKey}`);

    // Initialize Bot Application
    this.bot = createBotWithToken(this.application.token);
    this.bot.logger = optic as Pick<typeof Bootstrap.bot.logger, 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;

    // Setup Event Manager and Load Default Events
    this.event = new EventManager(this.bot);
    defaults();

    await Loader.load();

    // Connect to Discord Gateway.
    if (connect) await this.bot.start();
  }
}

// Initialize Application on Primary Entrypoint Interaction.
if (import.meta.main) {
  Bootstrap['boot'](true);
}
