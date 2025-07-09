import { DataSource } from 'typeorm';

export const TenantSource = new DataSource({
  type: 'mariadb',
  host: Deno.env.get('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')),
  username: Deno.env.get('DB_USERNAME'),
  password: Deno.env.get('DB_PASSWORD'),
  database: Deno.env.get('DB_TENANT_DATABASE'),
  migrationsRun: true,
  logging: false,
  entities: [
    import.meta.dirname + '/../entity/tenant/**/*.ts',
  ],
  migrations: [
    import.meta.dirname + '/../migration/tenant/**/*.ts',
  ],
});
