import { Kysely, MysqlDialect, type MysqlPool } from 'kysely';
import { createPool } from 'mysql2';
import type { OrbiterTable } from './model/orbit/orbiter.ts';

export interface OrbitDatabase {
  orbiter: OrbiterTable;
}

export interface OrbiterDatabase {
}

const orbitDatabaseDialect = new MysqlDialect({
  pool: createPool({
    uri: Deno.env.get('DB_ORBIT')!,
    connectionLimit: 10,
  }) as unknown as MysqlPool,
});

const orbiterTenantDialect = new MysqlDialect({
  pool: createPool({
    uri: Deno.env.get('DB_TENANT')!,
    connectionLimit: 10,
  }) as unknown as MysqlPool,
});

export const orbit = new Kysely<OrbitDatabase>({
  dialect: orbitDatabaseDialect,
});

export const orbiter = new Kysely<OrbiterDatabase>({
  dialect: orbiterTenantDialect,
});
