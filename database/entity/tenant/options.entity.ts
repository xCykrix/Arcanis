import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ database: Deno.env.get('DB_TENANT_DATABASE') })
export class TenantOptions extends BaseEntity {
  @PrimaryColumn()
  declare guildId: string;

  @Column({
    nullable: true,
  })
  declare alertChannelId: string;
}
