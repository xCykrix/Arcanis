import { OrbitalSource } from '../database/data-source/orbital.ts';
import { Orbiter } from '../database/entity/orbit/orbiter.entity.ts';

const orbital = await OrbitalSource.initialize();

// Collect Prompts
const applicationId = prompt('Enter Application ID:');
const clientSecret = prompt('Enter Client Secret:');
const publicKey = prompt('Enter Public Key:');
const token = prompt('Enter Token:');

// Display Values
console.log(`Application ID: ${applicationId}`);
console.log(`Client Secret: ${clientSecret}`);
console.log(`Public Key: ${publicKey}`);
console.log(`Token: ${token}`);

// Confirm Prompt
if (confirm('Is this information correct?')) {
  // Create and Save Orbit
  Orbiter.create({
    applicationId: applicationId!,
    clientSecret: clientSecret!,
    publicKey: publicKey!,
    token: token!,
  }).save();
  await orbital.destroy();

  console.log('Orbiter created successfully.');
}
