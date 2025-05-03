type v1GUID = {
  module: string;
  guildId?: string;
  channelId?: string;
  messageId?: string;
  data?: string[];
};

export class GUID {
  public static makeVersion1GUID(partitions: v1GUID): string {
    return [
      partitions.module,
      partitions.guildId ?? '',
      partitions.channelId ?? '',
      partitions.messageId ?? '',
      partitions.data?.join('|') ?? '',
    ].join('/');
  }

  public static getVersion1GUID(guid: string): v1GUID {
    const chunk = guid.split('/');
    return {
      module: chunk[0]!,
      guildId: chunk[1]!,
      channelId: chunk[2]!,
      messageId: chunk[3]!,
      data: chunk[4]?.split('|') ?? [],
    };
  }
}
