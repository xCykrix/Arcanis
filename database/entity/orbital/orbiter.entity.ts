import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({
  database: Deno.env.get('DB_ORBIT_DATABASE'),
})
export class Orbiter extends BaseEntity {
  @PrimaryColumn()
  declare applicationId: string;

  @Column()
  declare clientSecret: string;

  @Column()
  declare publicKey: string;

  @Column()
  declare token: string;
}
