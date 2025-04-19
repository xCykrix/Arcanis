import { Initializable } from '../../lib/generic/initializable.ts';
import { ReactionModuleGroupAuto } from './group/auto.ts';
import { ReactionModuleDefinition } from './definition.ts';

export default class ReactionModule extends Initializable {
  public override async initialize(): Promise<void> {
    await (new ReactionModuleDefinition()).initialize();
    await (new ReactionModuleGroupAuto()).initialize();
  }
}
