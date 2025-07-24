import { Migrator } from 'kysely';
import { orbit } from './src/database/database.ts';
import { Optic } from './src/util/optic.ts';

import { DenoMigrationProvider } from './src/database/util/provider.ts';

async function mod(): Promise<void> {
  // Perform Application Migrations
  const migratorForOrbit = new Migrator({
    db: orbit,
    provider: new DenoMigrationProvider({
      migrationFolder: new URL('./src/database/migration/orbit', import.meta.url).pathname,
    }),
  });

  // Perform Migration to Latest for Orbit
  Optic.f.info('Starting Migration', new URL('./src/database/migration/orbit', import.meta.url).pathname);
  // TODO: Remove after development. This is for development only to rollback database preparation.
  await migratorForOrbit.migrateDown();
  await migratorForOrbit.migrateDown();
  await migratorForOrbit.migrateDown();
  const migratorForOrbitResultSet = await migratorForOrbit.migrateToLatest();
  Optic.f.info('Migration Result - Counted:', (migratorForOrbitResultSet.results ?? []).length);

  // Check Migrations
  for (const migration of migratorForOrbitResultSet.results ?? []) {
    Optic.f.info('Result: ', migration);
    if (migration.status === 'Error') {
      await Optic.incident({
        moduleId: 'mod.ts#mod()',
        message: 'Failed to handle Orbit Migration. Immediate attention required.',
      });
      Optic.f.error('Migration Critical Errors', migratorForOrbitResultSet.error);
    }
  }

  // Application logic goes here
}

// Initialize the Application
await mod().catch((e) => {
  Optic.incident({
    moduleId: 'mod.ts#mod()',
    message: 'Failed to handle Bootstrap mod() request.',
    err: e,
  });
});
