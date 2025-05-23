import * as dismoji from '@discord-emoji';

/** Utilize Discord Emoji to validate Emoji Characters. */
export class Emoji {
  private static index = new Set<string>();

  /**
   * Check an Emoji.
   *
   * @param value The stringified representation of the Emoji literal.
   * @returns If the Emoji is valid.
   */
  public static check(value: string): boolean {
    if (this.index.size === 0) {
      const indexed = [...Object.values(dismoji.activity), ...Object.values(dismoji.flags), ...Object.values(dismoji.food), ...Object.values(dismoji.nature), ...Object.values(dismoji.objects), ...Object.values(dismoji.people), ...Object.values(dismoji.symbols), ...Object.values(dismoji.travel)];
      indexed.forEach((v) => this.index.add(v));
    }
    return this.index.has(value);
  }

  /**
   * Check a List of Emoji(s).
   *
   * @param values A list of stringified representations(s) of Emoji literals.
   * @returns If the Emoji List is valid.
   */
  public static checkAll(values: string[]): boolean {
    for (const value of values) {
      if (!this.check(value)) return false;
    }
    return true;
  }
}
