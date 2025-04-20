import { Initializable } from '../../lib/generic/initializable.ts';
import { ReactionModuleDefinition } from './definition.ts';
import { ReactionModuleGroupAuto } from './group/auto.ts';

export default class ReactionModule extends Initializable {
  public override async initialize(): Promise<void> {
    await (new ReactionModuleDefinition()).initialize();
    await (new ReactionModuleGroupAuto()).initialize();
  }
}
