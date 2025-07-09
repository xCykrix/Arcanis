import { MigrationInterface, QueryRunner } from "typeorm";

export class InitializeVersion11752030736622 implements MigrationInterface {
    name = 'InitializeVersion11752030736622'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`dispatched_alert\` (\`dispatchId\` varchar(255) NOT NULL, \`guildId\` varchar(255) NULL, \`message\` varchar(255) NOT NULL, \`createdAt\` datetime NOT NULL, PRIMARY KEY (\`dispatchId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`dispatched_alert_consume\` (\`dispatchId\` varchar(255) NOT NULL, \`guildId\` varchar(255) NOT NULL, \`consumedAt\` datetime NOT NULL, PRIMARY KEY (\`dispatchId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`orbiter\` (\`applicationId\` varchar(255) NOT NULL, \`clientSecret\` varchar(255) NOT NULL, \`publicKey\` varchar(255) NOT NULL, \`token\` varchar(255) NOT NULL, PRIMARY KEY (\`applicationId\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`orbiter\``);
        await queryRunner.query(`DROP TABLE \`dispatched_alert_consume\``);
        await queryRunner.query(`DROP TABLE \`dispatched_alert\``);
    }

}
