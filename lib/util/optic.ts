import { EmbedsBuilder } from '@discordeno';
import { ConsoleStream } from '@optic/consoleStream';
import { every, FileStream, of } from '@optic/fileStream';
import { JsonFormatter, TokenReplacer } from '@optic/formatters';
import { Level, Logger } from '@optic/logger';
import { Bootstrap } from '../../mod.ts';
import { APIWebhookGuard } from './guard/apiWebhookGuard.ts';

/** Console Streaming */
const consoleStream = new ConsoleStream()
  .withMinLogLevel(Level.Trace)
  .withFormat(
    new TokenReplacer()
      .withFormat('{dateTime} {level} {msg} {metadata}')
      .withDateTimeFormat('YYYY.MM.DD hh:mm:ss')
      .withLevelPadding(10)
      .withColor(),
  )
  .withLogHeader(false)
  .withLogFooter(false);

/** File Streaming */
await Deno.mkdir(new URL('./optical/', Deno.mainModule), { recursive: true });
const fileStream = new FileStream('./optical/optic.txt')
  .withMinLogLevel(Level.Trace)
  .withFormat(
    new JsonFormatter()
      .withPrettyPrintIndentation(2)
      .withDateTimeFormat('YYYY.MM.DD hh:mm:ss'),
  )
  .withBufferSize(8192)
  .withLogFileInitMode('append')
  .withLogFileRotation(
    every(20).mb().withLogFileRetentionPolicy(of(7).days()),
  )
  .withLogHeader(true)
  .withLogFooter(true);

type DefinedLogger = Logger & {
  fatal: <T>(msg: () => T, ...metadata: unknown[]) => T | undefined;
};

export class Optic {
  public static f: DefinedLogger = new Logger()
    .withMinLogLevel(Level.Trace)
    .addStream(consoleStream)
    .addStream(fileStream) as DefinedLogger;

  static {
    this.f.fatal = this.f.error;
  }

  public static async incident(chunk: {
    moduleId: string;
    message: string;
    err?: Error;
  }): Promise<void> {
    const incidentId = crypto.randomUUID();
    this.f.warn(`Incident: ${incidentId}; Module: ${chunk.moduleId}; Message: ${chunk.message}\n`, chunk.err);

    if (!Deno.env.get('ALERT_WEBHOOK_TOKEN')) {
      this.f.warn('Alert Webhook token is not configured. Please investigate.');
      return;
    }
    const alertWebhookValid = await APIWebhookGuard.valid(Deno.env.get('ALERT_WEBHOOK_ID')!, Deno.env.get('ALERT_WEBHOOK_TOKEN')!);
    if (!alertWebhookValid) {
      this.f.warn('Alert Webhook does not exist. Unable to fetch from API. Please investigate.');
      return;
    }

    Bootstrap.bot.helpers.executeWebhook(Deno.env.get('ALERT_WEBHOOK_ID')!, Deno.env.get('ALERT_WEBHOOK_TOKEN')!, {
      embeds: new EmbedsBuilder()
        .setTitle('Incident Report')
        .addField('Application', `${Bootstrap.bot.applicationId.toString()}`)
        .addField('Module', chunk.moduleId)
        .addField('ID', incidentId, true)
        .addField('Message', chunk.message)
        .addField('Error', chunk.err?.message ?? 'Refer to Service Log'),
    }).catch((e: Error) => {
      this.f.warn(`Failed to dispatch createIncidentEvent Webhook.\n`, e);
    });
  }

  public static intercept(id: string, callback: (...args: unknown[]) => Promise<void> | void, ...args: unknown[]): void {
    try {
      callback(...args)?.catch((e: unknown) => {
        if (e instanceof Error) {
          this.incident({
            moduleId: `Internal Interceptor - ${id}`,
            message: `Unhandled Exception (Promise) in '${id}'.`,
            err: e,
          });
        } else {
          this.incident({
            moduleId: `Internal Interceptor - ${id}`,
            message: `Unhandled Exception (Sync) in '${id}'. V=${
              Deno.inspect(e, {
                colors: false,
                compact: true,
                depth: 2,
                showHidden: false,
              })
            }`,
          });
        }
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.incident({
          moduleId: `Internal Interceptor - ${id}`,
          message: `Unhandled Exception (Sync) in '${id}'.`,
          err: e,
        });
      } else {
        this.incident({
          moduleId: `Internal Interceptor - ${id}`,
          message: `Unhandled Exception (Sync) in '${id}'. V=${
            Deno.inspect(e, {
              colors: false,
              compact: true,
              depth: 2,
              showHidden: false,
            })
          }`,
        });
      }
    }
  }
}
