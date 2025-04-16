import { type Model, model } from '@kvdex';

/** The Application Model. */
export type Application = {
  applicationId: string;
  publicKey: string;
  clientId: string;
  clientSecret: string;
  token: string;
};

/** Initialized Application Model. */
export const applicationModel: Model<Application> = model<Application>();
