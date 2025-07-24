import { Kysely, sql } from 'kysely';
import { OrbitDatabase } from '../../database.ts';

export async function up(database: Kysely<OrbitDatabase>): Promise<void> {
  await database.schema
    .createTable('orbiter')
    .addColumn('applicationId', 'varchar(255)', (col) => col.primaryKey().notNull())
    .addColumn('clientSecret', 'varchar(255)', (col) => col.notNull())
    .addColumn('publicKey', 'varchar(255)', (col) => col.notNull())
    .addColumn('token', 'varchar(255)', (col) => col.notNull())
    .addColumn('createdAt', 'timestamp', (col) => col.defaultTo(sql`NOW()`).notNull())
    .execute();
}

export async function down(database: Kysely<OrbitDatabase>): Promise<void> {
  await database.schema.dropTable('orbiter').execute();
}
