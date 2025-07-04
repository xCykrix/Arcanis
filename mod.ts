import type { CreateSlashApplicationCommand } from '@discordeno';
import { type CacheBotType, createBotWithToken } from './lib/bot.ts';
import { Defaults } from './lib/defaults.ts';
import { KVC } from './lib/kvc/kvc.ts';
import type { Application } from './lib/kvc/model/rconf/application.model.ts';
import { EventManager } from './lib/manager/event.ts';
import { DynamicModuleLoader } from './lib/util/loader.ts';
import { Optic } from './lib/util/optic.ts';

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
  private static async boot(): Promise<void> {
    // Fetch Data from Remote Configuration Server
    if (Deno.env.get('APPLICATION_ID') === undefined) throw new Deno.errors.NotFound(`Environment Variable 'APPLICATION_ID' is undefined.`);
    this.application = (await KVC.rconf.application.findByPrimaryIndex('applicationId', Deno.env.get('APPLICATION_ID')!))?.value ?? null;

    // Check Remote Configuration Server Response
    if (this.application === null) throw new Deno.errors.InvalidData(`Application ID '${Deno.env.get('APPLICATION_ID')}' Not Found via Remote Configuration. Please validate.`);

    // Post Status
    Optic.f.info(`Application ID: ${this.application?.applicationId} / ${this.application.publicKey}`);

    // Initialize Bot Application
    this.bot = createBotWithToken(this.application.token);
    this.bot.logger = Optic.f as Pick<typeof Bootstrap.bot.logger, 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;

    // Setup Event Manager and Load Default Events
    this.event = new EventManager(this.bot);
    await (new Defaults()).initialize();

    // Trigger Dynamic Module Loader
    await (new DynamicModuleLoader()).initialize();

    // Connect to Discord Gateway.
    await this.bot.start();
  }
}

// Initialize Application on Primary Entrypoint Interaction.
if (import.meta.main) {
  Bootstrap['boot']();
}
