import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import { OrbitalSource } from './database/data-source/orbital.ts';
import { TenantSource } from './database/data-source/tenant.ts';
import { Orbiter } from './database/entity/orbital/orbiter.entity.ts';
import { type CacheBotType, createBotWithToken } from './lib/bot.ts';
import { EventManager } from './lib/manager/event.ts';
import { DynamicInjectionModule } from './lib/util/injection.ts';
import { Optic } from './lib/util/optic.ts';

/** Boostrap Class */
export class Bootstrap {
  /** The Internal Database Connections. */
  public static orbital: DataSource | null;
  public static tenant: DataSource | null;

  /** The Internal Stateful Controls. */
  public static orbiter: Orbiter | null;

  /** The Internal CacheBot Application. */
  public static bot: CacheBotType;

  /** The Event Manager Registration Module. */
  public static event: EventManager;
  public static dynamicInjection: DynamicInjectionModule;

  /** Main Boostrap Entrypoint. */
  private static async sequence(): Promise<void> {
    // Connect to Global Orbit Table
    this.orbital = await OrbitalSource.initialize().catch((e) => {
      Optic.incident({
        moduleId: 'Boostrap.startup.sequence',
        message: 'Failed to connect to Orbital Database. Please check your environment variables. Manual intervention is required.',
        err: e,
        dispatch: false,
      });
      return null;
    });
    if (this.orbital === null) return;

    // Migrate Orbital Database
    await OrbitalSource.runMigrations({
      transaction: 'each',
    }).catch((e) => {
      Optic.incident({
        moduleId: 'Boostrap.startup.sequence',
        message: 'Failed to run migrations on Orbital Database. Manual intervention is required. Critical Outage.',
        err: e,
        dispatch: false,
      });
      return;
    });

    // Fetch the Orbiter from the Orbital Database
    this.orbiter = await Orbiter.findOneBy({
      applicationId: Deno.env.get('APPLICATION_ID') ?? 'UNCONFIGURED',
    });

    // Check Orbiter Exists
    if (this.orbiter === null) {
      Optic.incident({
        moduleId: 'Boostrap.startup.sequence',
        message: 'Orbiter does not exist. Please create and configure this tenant in ORBIT_1. Manual intervention is required.',
        dispatch: false,
      });
      return;
    }
    Optic.f.info(`Bootstrapping Orbital with Application ID: ${this.orbiter.applicationId} / ${this.orbiter.publicKey}`);

    // Connect to Tenant Database
    this.tenant = await TenantSource.initialize().catch((e) => {
      Optic.incident({
        moduleId: 'Boostrap.startup.sequence',
        message: 'Failed to connect to Tenant Database. Please check your environment variables. Manual intervention is required.',
        err: e,
        dispatch: false,
      });
      return null;
    });
    if (this.tenant === null) return;

    // Migrate Tenant Database
    await TenantSource.runMigrations({
      transaction: 'each',
    }).catch((e) => {
      Optic.incident({
        moduleId: 'Boostrap.startup.sequence',
        message: 'Failed to run migrations on Tenant Database. Manual intervention is required. Critical Outage.',
        err: e,
        dispatch: false,
      });
      return;
    });

    // Initialize CacheBot Application
    this.bot = createBotWithToken(this.orbiter.token);
    this.bot.logger = Optic.f as Pick<typeof Bootstrap.bot.logger, 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;

    // Initialize Event Manager
    this.event = new EventManager(this.bot);

    // Trigger Dynamic Module Loader
    this.dynamicInjection = new DynamicInjectionModule();
    await this.dynamicInjection.initialize();
    console.info('Injected');

    // Connect to Discord API
    await this.bot.start();
  }
}

// Initialize Application on Primary Entrypoint Interaction.
if (import.meta.main) {
  await Bootstrap['sequence']().catch((e) => {
    console.error('Failed to initialize Internal Connection(s):', e);
    Deno.exit(1);
  });
}
