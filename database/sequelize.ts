import { Sequelize } from '@sequelize/core';
import { MariaDbDialect } from '@sequelize/mariadb';

export const sequelizeOrbit = new Sequelize({
  // @ts-ignore This is valid. The dialect is set to MariaDB.
  dialect: MariaDbDialect,
  host: Deno.env.get('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')),
  user: Deno.env.get('DB_USERNAME'),
  password: Deno.env.get('DB_PASSWORD'),
  database: Deno.env.get('DB_ORBIT_DATABASE'),
  showWarnings: true,
  connectTimeout: 15000,
});

export const sequelizeTenant = new Sequelize({
  // @ts-ignore This is valid. The dialect is set to MariaDB.
  dialect: MariaDbDialect,
  host: Deno.env.get('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')),
  user: Deno.env.get('DB_USERNAME'),
  password: Deno.env.get('DB_PASSWORD'),
  database: Deno.env.get('DB_TENANT_DATABASE'),
  showWarnings: true,
  connectTimeout: 15000,
});
