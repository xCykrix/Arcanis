import { DataSource } from 'typeorm';
import { DispatchedAlert, DispatchedAlertConsume } from '../entity/orbital/alert.entity.ts';
import { Orbiter } from '../entity/orbital/orbiter.entity.ts';

export const OrbitalSource = new DataSource({
  type: 'mariadb',
  host: Deno.env.get('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')),
  username: Deno.env.get('DB_USERNAME'),
  password: Deno.env.get('DB_PASSWORD'),
  database: Deno.env.get('DB_ORBIT_DATABASE'),
  migrationsRun: true,
  logging: false,
  entities: [
    Orbiter,
    DispatchedAlert,
    DispatchedAlertConsume,
  ],
  migrations: [
    import.meta.dirname + '/../migration/orbital/**/*.ts',
  ],
});
