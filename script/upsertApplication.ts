import { DatabaseConnector } from '../lib/database/database.ts';

// deno run --env-file=.env -A --unstable-kv ./script/upsertApplication.ts
const rconf = DatabaseConnector.rconf;

// Prompts
let mode: 'add' | 'update' = 'add';
const applicationId = prompt('Application ID:');
const publicKey = prompt('Public Key:');
const clientId = prompt('Client ID:');
const clientSecret = prompt('Client Secret:');
const token = prompt('Token:');

// Verify Application ID
if (applicationId === null || (applicationId?.trim() ?? '') === '') throw new Error('applicationId');

// Get Document
const document = await rconf.application.findByPrimaryIndex('applicationId', applicationId);
mode = document === null ? 'add' : 'update';

// Process Mode
switch (mode) {
  case 'add': {
    if (publicKey === null || (publicKey?.trim() ?? '') === '') throw new Error('publicKey');
    if (clientId === null || (clientId?.trim() ?? '') === '') throw new Error('clientId');
    if (clientSecret === null || (clientSecret?.trim() ?? '') === '') throw new Error('clientSecret');
    if (token === null || (token?.trim() ?? '') === '') throw new Error('token');

    const result = await rconf.application.add({
      applicationId,
      publicKey,
      clientId,
      clientSecret,
      token,
    });
    if (result.ok) {
      console.info('Inserted Document OK', result.ok, result.id);
      const q = await rconf.application.find(result.id);
      console.info(q);
    } else console.info('Insert Failed');
    break;
  }
  case 'update': {
    const update = {
      publicKey: (publicKey?.trim() ?? '') === '' ? undefined : publicKey!,
      clientId: (clientId?.trim() ?? '') === '' ? undefined : clientId!,
      clientSecret: (clientSecret?.trim() ?? '') === '' ? undefined : clientSecret!,
      token: (token?.trim() ?? '') === '' ? undefined : token!,
    };
    Object.keys(update).forEach((k) => (update as { [key: string]: string })[k] === undefined ? delete (update as { [key: string]: string })[k] : {});
    const result = await rconf.application.updateByPrimaryIndex('applicationId', applicationId, update, {
      strategy: 'merge',
    });
    if (result.ok) {
      console.info('Updated Document OK', result.ok, result.id);
      const q = await rconf.application.find(result.id);
      console.info(q);
    } else console.info('Update Failed');
    break;
  }
}
