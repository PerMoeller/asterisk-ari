/**
 * Example: Originate a call and play audio
 */

import { connect } from '../src/index.js';

async function main() {
  // Connect to Asterisk
  const client = await connect({
    url: 'http://localhost:8088',
    username: 'asterisk',
    password: 'asterisk',
    app: 'test-app',
  });

  console.log('Connected to', client.version.toString());

  // Create a channel instance before originating
  // This allows us to register event listeners before the channel exists
  const channel = client.Channel();

  // Set up event listeners
  channel.on('StasisStart', async (event, ch) => {
    console.log('Channel started:', ch.name);
    console.log('Args:', event.args);

    // Answer the channel
    await ch.answer();
    console.log('Channel answered');

    // Play audio
    const playback = await ch.play({ media: 'sound:hello-world' });

    playback.on('PlaybackFinished', async () => {
      console.log('Playback finished');
      // Hang up after playback
      await ch.hangup();
    });
  });

  channel.on('ChannelStateChange', (event, ch) => {
    console.log('Channel state changed:', ch.state);
  });

  channel.on('StasisEnd', () => {
    console.log('Channel left Stasis');
    // Disconnect after call ends
    client.stop();
    console.log('Disconnected');
  });

  // Originate the call
  console.log('Originating call...');
  await channel.originate({
    endpoint: 'PJSIP/1000',
    app: 'test-app',
    callerId: 'Test <1234>',
  });

  console.log('Call originated with channel ID:', channel.id);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
