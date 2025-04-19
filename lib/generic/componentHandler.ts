import { commandOptionsParser } from '@discordeno';
import type { Bootstrap } from '../../mod.ts';
import { optic } from '../util/helper/optic.ts';
import { PermissionsHelper } from '../util/helper/permissions.ts';
import { ResponseGeneratorHelper } from '../util/helper/response.ts';
import { Initializable } from './initializable.ts';

export abstract class CommandComponentHandler extends Initializable {
  protected generator: ResponseGeneratorHelper = new ResponseGeneratorHelper();
  protected permissions: PermissionsHelper = new PermissionsHelper();

  /** Expect a Interaction Command of Specified Name. */
  public expect(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction, allowBotUser = false): boolean {
    optic.info(interaction.data);
    if (interaction.data === undefined) return false;
    if (interaction.data.customId === undefined) return false;
    if (!allowBotUser && interaction.user.bot) return false;
    return true;
  }

  /** Parse Interaction Command Parameters. */
  public parse<T>(interaction: typeof Bootstrap.bot.transformers.$inferredTypes.interaction): T {
    return commandOptionsParser(interaction) as T;
  }

  /** Expect Original Reaction within Seconds */
  public checkIfExpired(message: number, within: number): boolean {
    return message < Date.now() - (within * 1000);
  }
}
