import type { Insertable, Selectable, Updateable } from 'kysely';

/** Orbit Table Structure */
export interface OrbiterTable {
  applicationId: string;
  clientSecret: string;
  publicKey: string;
  token: string;
}

export type Orbit = Selectable<OrbiterTable>;
export type InsertOrbit = Insertable<OrbiterTable>;
export type UpdateOrbit = Updateable<OrbiterTable>;
