export type Component = {
  callbackId: string;
  userId: string | null;
  createdAt: number;
  constants: Set<string>;
};
