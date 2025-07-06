import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table
export class Orbit extends Model {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    unique: true,
  })
  public applicationId!: string;
}
