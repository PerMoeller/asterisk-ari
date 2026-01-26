/**
 * Example: Create a bridge and add channels
 */

import { connect } from '../src/index.js';

async function main() {
  const client = await connect({
    url: 'http://localhost:8088',
    username: 'asterisk',
    password: 'asterisk',
    app: 'conference-app',
  });

  console.log('Connected to', client.version.toString());

  // Create a mixing bridge
  const bridge = client.Bridge();

  bridge.on('BridgeCreated', (_event, br) => {
    console.log('Bridge created:', br.id);
  });

  bridge.on('ChannelEnteredBridge', (event, br) => {
    console.log('Channel entered bridge:', event.channel.name);
    console.log('Channels in bridge:', br.channels.length);
  });

  bridge.on('ChannelLeftBridge', (event, br) => {
    console.log('Channel left bridge:', event.channel.name);
    console.log('Channels remaining:', br.channels.length);

    // Destroy bridge when empty
    if (br.channels.length === 0) {
      console.log('Bridge empty, destroying...');
      br.destroy().catch(console.error);
    }
  });

  bridge.on('BridgeDestroyed', () => {
    console.log('Bridge destroyed');
    client.stop();
  });

  // Create the bridge
  await bridge.create({ type: 'mixing', name: 'my-conference' });
  console.log('Bridge created with ID:', bridge.id);

  // Listen for incoming calls
  client.on('StasisStart', async (event) => {
    const channel = client.Channel(event.channel.id, event.channel);
    console.log('Incoming call:', channel.name);

    channel.on('StasisEnd', () => {
      console.log('Channel ended:', channel.name);
    });

    // Answer and add to bridge
    await channel.answer();
    await bridge.addChannel({ channel: channel.id });
    console.log('Added', channel.name, 'to bridge');
  });

  console.log('Waiting for incoming calls...');
  console.log('Press Ctrl+C to exit');

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    try {
      await bridge.destroy();
    } catch {
      // Bridge might already be destroyed
    }
    client.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
