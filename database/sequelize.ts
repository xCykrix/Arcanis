import { Sequelize } from 'sequelize-typescript';

export const sequelizeOrbit = new Sequelize({
  models: [import.meta.dirname + '/orbitModal/**/*.modal.ts'],
  modelMatch: (filename, member) => {
    return filename.substring(0, filename.indexOf('.model')) === member.toLowerCase();
  },
  dialect: 'mariadb',
  host: Deno.env.get('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')),
  username: Deno.env.get('DB_USERNAME'),
  password: Deno.env.get('DB_PASSWORD'),
  database: Deno.env.get('DB_ORBIT_DATABASE'),
  dialectOptions: {
    connectTimeout: 15000,
  },
});

export const sequelizeTenant = new Sequelize({
  dialect: 'mariadb',
  host: Deno.env.get('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')),
  username: Deno.env.get('DB_USERNAME'),
  password: Deno.env.get('DB_PASSWORD'),
  database: Deno.env.get('DB_TENANT_DATABASE'),
  dialectOptions: {
    connectTimeout: 15000,
  },
});
