import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Orbiter {
  @PrimaryColumn()
  declare applicationId: string;

  @Column()
  declare clientSecret: string;

  @Column()
  declare publicKey: string;

  @Column()
  declare token: string;
}
