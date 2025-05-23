/** The Lock Model. */
export type Lock = {
  guid: string;
  locked: boolean;
  lockedAt: number;
  lockoutMutexId?: string;
};
