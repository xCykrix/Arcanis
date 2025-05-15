import { EmbedsBuilder } from '@discordeno';

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
}

/**
 * A Response Generator Static Responses.
 */
export class Responses {
  public static success = new SuccessResponseGenerator();
  public static error = new ErrorResponseGenerator();
}
