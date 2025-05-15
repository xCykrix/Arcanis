import { Bootstrap } from '../../../mod.ts';

export async function stringify(text: unknown, depth: number = 1): Promise<string> {
  if (text && text.constructor.name === 'Promise') {
    text = await text;
  }

  if (typeof text !== 'string') {
    text = Deno.inspect(text, {
      colors: false,
      depth,
      iterableLimit: 5,
      trailingComma: true,
    });
  }

  text = (text as string)
    .replace(/`/g, '`' + String.fromCharCode(8203))
    .replace(/@/g, '@' + String.fromCharCode(8203));
  text = (text as string)
    .replace(Deno.env.get('DENO_KV_ACCESS_TOKEN') ?? 'kv-access-token', 'KV_ACCESS_REDACTED')
    .replace(Bootstrap.application?.token ?? 'token-placeholder', 'TOKEN_REDACTED');

  return text as string;
}
