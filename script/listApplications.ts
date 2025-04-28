import { DatabaseConnector } from '../lib/database/database.ts';

// deno run --env-file=.env -A --unstable-kv ./script/listApplications.ts
const rconf = DatabaseConnector.rconf;

const documents = await rconf.application.getMany();
for (const doc of documents.result) {
  console.info(`[ID: ${doc.value.applicationId}] (Client: ${doc.value.clientId})\nPublic Key=${doc.value.publicKey}\nClient Secret=${doc.value.clientSecret}\nToken=${doc.value.token}\n=-=-=-=-=`);
}
