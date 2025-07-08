import { DataSource } from 'typeorm';
import { Orbiter } from '../entity/orbit/orbiter.entity.ts';
import { Seed1751992726600 } from '../migration/orbital/1751992726600-seed.ts';

export const OrbitalSource = new DataSource({
  type: 'mariadb',
  host: Deno.env.get('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')),
  username: Deno.env.get('DB_USERNAME'),
  password: Deno.env.get('DB_PASSWORD'),
  database: Deno.env.get('DB_ORBIT_DATABASE'),
  // synchronize: true,

  migrationsRun: true,
  logging: false,
  entities: [Orbiter],
  migrations: [
    Seed1751992726600,
  ],
});
