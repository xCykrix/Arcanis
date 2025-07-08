import { DataSource } from 'typeorm';
import { OrbitalSource } from './database/data-source.ts';
import { Orbiter } from './database/entity/orbit/orbiter.entity.ts';
import { type CacheBotType } from './lib/bot.ts';
import { EventManager } from './lib/manager/event.ts';
import { Optic } from './lib/util/optic.ts';

/** Boostrap Class */
export class Bootstrap {
  /** The Internal Database Connections. */
  public static orbital: DataSource;

  /** The Internal Stateful Controls. */
  public static orbiter: Orbiter | null;

  /** The Internal CacheBot Application. */
  public static bot: CacheBotType;

  /** The Event Manager Registration Module. */
  public static event: EventManager;

  /** Main Boostrap Entrypoint. */
  private static async sequence(): Promise<void> {
    // Connect to Global Orbit Table
    this.orbital = await OrbitalSource.initialize();

    this.orbiter = await this.orbital.manager.findOneBy(Orbiter, {
      applicationId: Deno.env.get('APPLICATION_ID') ?? 'UNCONFIGURED',
    });

    // Check Orbiter Exists
    if (this.orbiter === null) {
      throw new Error('Orbiter does not exist. Please create and configure this tenant in ORBIT_1.');
    }
    Optic.f.info(`Bootstrap Sequence Called Orbital with Application ID: ${this.orbiter.applicationId} / ${this.orbiter.publicKey}`);

    // ... Initialize Bot Application? this.orbiter is application.
  }

  private static async connect(): Promise<void> {
  }
}

// Initialize Application on Primary Entrypoint Interaction.
if (import.meta.main) {
  await Bootstrap['sequence']().catch((e) => {
    console.error('Failed to initialize Internal Connection(s):', e);
    Deno.exit(1);
  });
  await Bootstrap['connect']().catch((e) => {
    console.error('Failed to initialize Discord API Connection:', e);
    Deno.exit(1);
  });
}
