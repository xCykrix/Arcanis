import type { Bootstrap } from '../../mod.ts';
import { PermissionsHelper } from '../util/helper/permissions.ts';
import { ResponseGeneratorHelper } from '../util/helper/response.ts';
import { Initializable } from './initializable.ts';

export abstract class CommandComponentHandler extends Initializable {
  protected generator: ResponseGeneratorHelper = new ResponseGeneratorHelper();
  protected permissions: PermissionsHelper = new PermissionsHelper();

  /** Expect a Interaction Command of Specified Name. */
  public expect(firstChunk: string, interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction, allowBotUser = false): boolean {
    if (interaction.data === undefined) return false;
    if (interaction.data.customId === undefined) return false;
    if (interaction.data.customId.split('/')[0] !== firstChunk) return false;
    if (!allowBotUser && interaction.user.bot) return false;
    return true;
  }

  /** Expect Original Reaction within Seconds */
  public checkIfExpired(message: number, within: number): boolean {
    return message < Date.now() - (within * 1000);
  }
}
