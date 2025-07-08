import { type InferAttributes, type InferCreationAttributes, Model } from '@sequelize/core';
import { Table } from '@sequelize/core/decorators-legacy';

@Table
export class Orbit extends Model<InferAttributes<Orbit>, InferCreationAttributes<Orbit>> {
  // @Attribute(DataTypes.STRING())
  // @PrimaryKey
  // declare applicationId: string;

  // @Attribute(DataTypes.STRING)
  // @NotNull
  // declare clientSecret: string;

  // @Attribute(DataTypes.STRING)
  // @NotNull
  // declare publicKey: string;

  // @Attribute(DataTypes.STRING)
  // @NotNull
  // declare token: string;

  // @Attribute(DataTypes.DATE)
  // @Default(DataTypes.NOW)
  // declare createdAt: CreationOptional<Date>;
}
