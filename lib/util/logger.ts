import { ConsoleStream } from '@optic/consoleStream';
import { every, FileStream, of } from '@optic/fileStream';
import { JsonFormatter, TokenReplacer } from '@optic/formatters';
import { Level, Logger } from '@optic/logger';

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
await Deno.mkdir(new URL('./log/', Deno.mainModule), { recursive: true });
const fileStream = new FileStream('./log/optic.txt')
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
export const optic = new Logger()
  .withMinLogLevel(Level.Trace)
  .addStream(consoleStream)
  .addStream(fileStream);
