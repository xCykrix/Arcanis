import {
  Sequelize,
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from '@sequelize/core'
import { Attribute, PrimaryKey, AutoIncrement, NotNull } from '@sequelize/core/decorators-legacy';


export class Orbit extends Model<InferAttributes<Orbit>, InferCreationAttributes<Orbit>> {
  @Attribute(DataTypes.STRING)
  @PrimaryKey
  declare applicationId: string;
}
