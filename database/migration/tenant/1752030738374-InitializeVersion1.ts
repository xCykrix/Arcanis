import { MigrationInterface, QueryRunner } from "typeorm";

export class InitializeVersion11752030738374 implements MigrationInterface {
    name = 'InitializeVersion11752030738374'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`tenant_options\` (\`guildId\` varchar(255) NOT NULL, \`alertChannelId\` varchar(255) NULL, PRIMARY KEY (\`guildId\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`tenant_options\``);
    }

}
