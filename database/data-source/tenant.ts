import { DataSource } from 'typeorm';
import { TenantOptions } from '../entity/tenant/options.entity.ts';

export const TenantSource = new DataSource({
  type: 'mariadb',
  host: Deno.env.get('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')),
  username: Deno.env.get('DB_USERNAME'),
  password: Deno.env.get('DB_PASSWORD'),
  database: Deno.env.get('DB_TENANT_DATABASE'),

  // migrationsRun: true,
  logging: false,
  entities: [
    TenantOptions,
  ],
  // migrations: [],
});
