import type { CreateSlashApplicationCommand } from '@discordeno';
import { sequelizeOrbit, sequelizeTenant } from './database/sequelize.ts';
import { type CacheBotType } from './lib/bot.ts';
import { EventManager } from './lib/manager/event.ts';

/** Boostrap Class */
export class Bootstrap {
  // Internal Registers
  // static application: Application | null = null;

  /** The Interaction Catalyst Index. */
  public static guildChatInputInteraction = new Set<Omit<CreateSlashApplicationCommand, 'nameLocalizations' | 'descriptionLocalizations' | 'dmPermission' | 'handler' | 'integrationTypes' | 'contexts'>>();
  public static globalChatInputInteraction = new Set<Omit<CreateSlashApplicationCommand, 'nameLocalizations' | 'descriptionLocalizations' | 'dmPermission' | 'handler'>>();

  /** The Internal CacheBot Application. */
  public static bot: CacheBotType;

  /** The Event Manager Registration Module. */
  public static event: EventManager;

  /** Main Boostrap Entrypoint. */
  private static async boot(): Promise<void> {
    // Connect Database
    await sequelizeOrbit.authenticate();
    console.info('authenticated?');



    
    await sequelizeTenant.authenticate();
  }
}

// Initialize Application on Primary Entrypoint Interaction.
if (import.meta.main) {
  Bootstrap['boot']().catch((e) => {
    console.error('Failed to bootstrap the application:', e);
    Deno.exit(1);
  });
}
