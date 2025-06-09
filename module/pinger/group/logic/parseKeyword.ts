const regex = /[+-]([\w\d\s]{1,})/g;

export function parseKeyword(input: string): string[] | null {
  return input.match(regex)?.filter((v) => v.length > 0).map((v) => v.trim().replaceAll(/\s/g, ' ')) ?? null;
}
