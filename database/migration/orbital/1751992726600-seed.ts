import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Seed1751992726600 implements MigrationInterface {
  name = 'Seed1751992726600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`orbiter\` (\`applicationId\` varchar(255) NOT NULL, \`clientSecret\` varchar(255) NOT NULL, \`publicKey\` varchar(255) NOT NULL, \`token\` varchar(255) NOT NULL, PRIMARY KEY (\`applicationId\`)) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`orbiter\``);
  }
}
