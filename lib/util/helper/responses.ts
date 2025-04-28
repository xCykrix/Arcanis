import { EmbedsBuilder, type PermissionStrings } from '@discordeno';

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
  public makeUnsupportedChannel(supported: 'Guild Channels' | 'Direct Messages'): EmbedsBuilder {
    return this.make()
      .setDescription(`This interaction only supports ${supported}.`);
  }

  /**
   * Make a Permission Denied Error Response.
   * @param permission The required {@link PermissionStrings}.
   * @returns EmbedsBuilder
   */
  public makePermissionDenied(permission: PermissionStrings): EmbedsBuilder {
    return this.make()
      .setDescription(`Unauthorized Request. Permission '${permission.toString()}' is required.`);
  }
}

/**
 * A Response Generator Static Responses.
 */
export class Responses {
  public static success = new SuccessResponseGenerator();
  public static error = new ErrorResponseGenerator();
}
