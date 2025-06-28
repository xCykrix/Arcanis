import { Optic } from '../../../../lib/util/optic.ts';

const regex = /[+-]([\w\d\s$&,:;=?@#|'<>.^*()%!]{1,})/g;

export function parseKeyword(input: string): string[] | null {
  return input.match(regex)?.filter((v) => v.length > 0).map((v) => v.trim().replaceAll(/\s/g, ' ')) ?? null;
}

export function runKeywordStateMachine(keywords: string[], texts: string[]): boolean {
  let state = false;
  const text = texts.join(' ').normalize('NFKC').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const keyword of keywords) {
    if (keyword === '-all') {
      state = false;
      continue;
    }
    if (keyword === '+all') {
      state = true;
      continue;
    }

    const check = keyword.substring(1);
    if (text.includes(check)) {
      if (keyword.startsWith('+')) state = true;
      else if (keyword.startsWith('-')) state = false;
      else {
        Optic.f.warn(`Invalid keyword "${keyword}" found in state machine. Expected format: +-keyword or phrase.`);
        state = false;
      }
    }
  }
  return state;
}
