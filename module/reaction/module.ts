import { Initializable } from '../../lib/generic/initializable.ts';
import { ReactionModuleMessageCreateReaction } from './callback/messageCreate.ts';
import { ReactionModuleReactionAddForwarder } from './callback/reactionAdd.ts';
import { ReactionModuleDefinition } from './definition.ts';
import { ReactionModuleGroupAuto } from './group/auto.ts';
import { ReactionModuleGroupForward } from './group/forward.ts';

export default class ReactionModule extends Initializable {
  public override async initialize(): Promise<void> {
    await (new ReactionModuleDefinition()).initialize();
    await (new ReactionModuleGroupAuto()).initialize();
    await (new ReactionModuleGroupForward()).initialize();
    await (new ReactionModuleMessageCreateReaction()).initialize();
    await (new ReactionModuleReactionAddForwarder()).initialize();
  }
}
