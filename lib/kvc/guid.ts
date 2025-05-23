type GUIDv1 = {
  moduleId: string;
  guildId?: string;
  channelId?: string;
  messageId?: string;
  constants?: string[];
};

export class GUID {
  public static make(partitions: GUIDv1): string {
    return [
      partitions.moduleId,
      partitions.guildId ?? '',
      partitions.channelId ?? '',
      partitions.messageId ?? '',
      partitions.constants?.join('\u200b') ?? '',
    ].join('/');
  }

  public static get(guid: string): GUIDv1 {
    const chunk = guid.split('/');
    return {
      moduleId: chunk[0]!,
      guildId: chunk[1]!,
      channelId: chunk[2]!,
      messageId: chunk[3]!,
      constants: chunk[4]?.split('\u200b') ?? [],
    };
  }
}
