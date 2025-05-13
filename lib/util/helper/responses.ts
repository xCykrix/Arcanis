import { type ChannelTypes, EmbedsBuilder, type PermissionStrings } from '@discordeno';
import { getLang } from '../../../lang.ts';

/**
 * A Successful Response Generator for EmbedsBuilder.
 */
class SuccessResponseGenerator {
  /**
   * Make a Generic Success Response.
   * @returns EmbedsBuilder
   */
  public make(): EmbedsBuilder {
    return new EmbedsBuilder()
      .setTitle('Success')
      .setColor('#004412')
      .setTimestamp(new Date());
  }
}

/**
 * A Error Response Generator for EmbedsBuilder.
 */
class ErrorResponseGenerator {
  /**
   * Make a Generic Error Response.
   * @returns EmbedsBuilder
   */
  public make(): EmbedsBuilder {
    return new EmbedsBuilder()
      .setTitle('Error')
      .setColor('#540000')
      .setTimestamp(new Date());
  }

  /**
   * Make a Unsupported Channel Error Response.
   * @param supported The Channel Type that SHOULD be used.
   * @returns EmbedsBuilder
   */
  public makeUnsupportedChannel(supported: ChannelTypes[]): EmbedsBuilder {
    return this.make()
      .setDescription(getLang('global', 'channel.unsupported')!)
      .addField('Supported', supported.join('\n'))
      ;
  }

  /**
   * Make a Permission Denied Error Response.
   * @param permission The required {@link PermissionStrings}.
   * @returns EmbedsBuilder
   */
  public makeBotPermissionDenied(permissions: PermissionStrings[]): EmbedsBuilder {
    return this.make()
      .setDescription(getLang('global', 'permission.bot.missing')!)
      .addField('Permissions', permissions.join('\n'));
  }
}

/**
 * A Response Generator Static Responses.
 */
export class Responses {
  public static success = new SuccessResponseGenerator();
  public static error = new ErrorResponseGenerator();
}
