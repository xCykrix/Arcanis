import { OrbitalSource } from '../database/data-source/orbital.ts';
import { Orbiter } from '../database/entity/orbital/orbiter.entity.ts';

const orbital = await OrbitalSource.initialize();

// Collect Prompts
const applicationId = prompt('Enter Application ID:')?.trim();
const clientSecret = prompt('Enter Client Secret:')?.trim();
const publicKey = prompt('Enter Public Key:')?.trim();
const token = prompt('Enter Token:')?.trim();

// Display Values
console.log(`Application ID: ${applicationId}`);
console.log(`Client Secret: ${clientSecret}`);
console.log(`Public Key: ${publicKey}`);
console.log(`Token: ${token}`);

// Confirm Prompt
if (confirm('Is this information correct?')) {
  // Create and Save Orbit
  await Orbiter.create({
    applicationId: applicationId!,
    clientSecret: clientSecret!,
    publicKey: publicKey!,
    token: token!,
  }).save();
  console.log('Orbiter created successfully.');
}

await orbital.destroy();
