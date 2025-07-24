import type { Migration, MigrationProvider } from 'kysely';

export class DenoMigrationProvider implements MigrationProvider {
  readonly #props: {
    migrationFolder: string;
  };

  constructor(props: {
    migrationFolder: string;
  }) {
    this.#props = props;
  }

  isMigrationFile = (filename: string): boolean => {
    const regex = /.*migration.ts$/;
    return regex.test(filename);
  };

  async getMigrations(): Promise<Record<string, Migration>> {
    const files: Deno.DirEntry[] = [];
    for await (const f of Deno.readDir(this.#props.migrationFolder)) {
      f.isFile && this.isMigrationFile(f.name) && files.push(f);
    }

    const migrations: Record<string, Migration> = {};

    for (const f of files) {
      const filePath = new URL(this.#props.migrationFolder + '/' + f.name, import.meta.url).pathname;
      const migration = await import(filePath);
      const migrationKey = f.name.match(/(\d+-.*).migration.ts/)![1];
      migrations[migrationKey] = migration;
    }

    return migrations;
  }
}
