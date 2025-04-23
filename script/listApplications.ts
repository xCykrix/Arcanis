import { DatabaseConnector } from '../lib/database/database.ts';

// deno run --env-file=.env -A --unstable-kv ./script/upsertApplication.ts
const rconf = DatabaseConnector.rconf;

const documents = await rconf.application.getMany();
for (const doc of documents.result) {
  console.info(`[${doc.value.applicationId}] (${doc.value.clientId})\nPK=${doc.value.publicKey}\nCS=${doc.value.clientSecret}\nTK=${doc.value.token}`);
}
