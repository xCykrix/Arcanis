import { EmbedsBuilder } from '@discordeno';
import { ConsoleStream } from '@optic/consoleStream';
import { every, FileStream, of } from '@optic/fileStream';
import { JsonFormatter, TokenReplacer } from '@optic/formatters';
import { Level, Logger } from '@optic/logger';
import { Bootstrap } from '../../../mod.ts';
import { isWebhookValid } from '../guard/webhook.ts';

/** Console Streaming */
const consoleStream = new ConsoleStream()
  .withMinLogLevel(Level.Debug)
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
  .withMinLogLevel(Level.Warn)
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

/** Export the Logger. */
interface InjectToOptic {
  fatal?: <T>(msg: () => T, ...metadata: unknown[]) => T | undefined;
}
export const optic: Logger & InjectToOptic = new Logger()
  .withMinLogLevel(Level.Trace)
  .addStream(consoleStream)
  .addStream(fileStream);
optic.fatal = optic.error;

export async function createIncidentEvent(incidentId: string, message: string, error?: Error): Promise<void> {
  const alertWebhookValid = await isWebhookValid(Deno.env.get('ALERT_WEBHOOK_ID')!, true);
  if (!alertWebhookValid) {
    optic.warn('Alert Webhook does not exist. Unable to fetch from API. Please investigate.');
  }
  if (!Deno.env.get('ALERT_WEBHOOK_TOKEN')) {
    optic.warn('Alert Webhook token is not configured. Please investigate.');
  }

  optic.warn(`Incident: ${incidentId}; Message: ${message}\n`, error);

  if (alertWebhookValid && Deno.env.get('ALERT_WEBHOOK_TOKEN') !== undefined) {
    Bootstrap.bot.helpers.executeWebhook(Deno.env.get('ALERT_WEBHOOK_ID')!, Deno.env.get('ALERT_WEBHOOK_TOKEN')!, {
      embeds: new EmbedsBuilder()
        .setTitle('Incident Report')
        .addField('Application', Bootstrap.bot.applicationId.toString())
        .addField('ID', incidentId)
        .addField('Message', message)
        .addField('Error', error?.message ?? 'Refer to Service Log'),
    }).catch((e: Error) => {
      optic.warn(`Failed to dispatch createIncidentEvent Webhook.\n`, e);
    });
  }
}

// /** */
// let lockout = false;
// export async function consume(identifier: string, error: Error): Promise<void> {
//   if (lockout) {
//     optic.warn('Failed to dispatch Webhook Alert. Webhook lockout was triggered and a restart is required.', identifier);
//     return;
//   }
//   const id = Deno.env.get('ALERT_WEBHOOK_ID');
//   const token = Deno.env.get('ALERT_WEBHOOK_TOKEN');
//   if (id === undefined || token === undefined) {
//     optic.warn(`Webhook ID '${id}' (or token) failed to resolve and triggered a lockout.`, identifier);
//     lockout = true;
//     return;
//   }
//   const webhook = await Bootstrap.bot.helpers.getWebhook(id).catch(() => null);
//   if (webhook === null) {
//     optic.warn(`Webhook ID '${id}' failed to resolve and triggered a lockout.`, identifier)
//     lockout = true;
//     return;
//   }
//   console.info(webhook);

// }
