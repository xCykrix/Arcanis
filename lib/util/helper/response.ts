import { EmbedsBuilder, type InteractionCallbackData, type PermissionStrings } from '@discordeno';

export class ResponseGeneratorHelper {
  public result = new ResultResponseGenerator();
  public error = new ErrorResponseGenerator();
}

class ResultResponseGenerator {
  public generic(): EmbedsBuilder {
    return new EmbedsBuilder()
      .setTitle('Success')
      .setColor('#004412')
      .setTimestamp(new Date());
  }
}

class ErrorResponseGenerator {
  public generic(): EmbedsBuilder {
    return new EmbedsBuilder()
      .setTitle('Error')
      .setColor('#540000')
      .setTimestamp(new Date());
  }

  public getUnsupportedChannel(type: 'Guild Channels' | 'Direct Messages'): InteractionCallbackData {
    return {
      embeds: this.generic()
        .setDescription(`This interaction only supports ${type}.`),
    };
  }

  public getPermissionDenied(permission: PermissionStrings): InteractionCallbackData {
    return {
      embeds: this.generic()
        .setDescription(`Unauthorized Request. Permission '${permission.toString()}' is required.`),
    };
  }
}
