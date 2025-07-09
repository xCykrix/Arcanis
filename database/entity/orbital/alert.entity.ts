import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ database: Deno.env.get('DB_ORBIT_DATABASE') })
export class DispatchedAlert extends BaseEntity {
  @PrimaryColumn()
  declare dispatchId: string;

  @Column({
    nullable: true,
  })
  declare guildId: string;

  @Column()
  declare message: string;

  @Column()
  declare createdAt: Date;
}

@Entity({ database: Deno.env.get('DB_ORBIT_DATABASE') })
export class DispatchedAlertConsume extends BaseEntity {
  @PrimaryColumn()
  declare dispatchId: string;

  @Column()
  declare guildId: string;

  @Column()
  declare consumedAt: Date;
}
