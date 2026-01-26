/**
 * Example: Connection pool for high-throughput scenarios
 */

import { createPool } from '../src/index.js';

async function main() {
  // Create a connection pool with 3 connections
  const pool = await createPool({
    url: 'http://localhost:8088',
    username: 'asterisk',
    password: 'asterisk',
    app: 'pool-app',
    poolSize: 3,
  });

  console.log(`Pool initialized with ${pool.size} connections`);
  console.log(`Connected: ${pool.connectedCount}`);

  // Use connections from the pool
  async function makeCall(endpoint: string) {
    // Get a connection using round-robin
    const client = pool.getConnection();

    const channel = client.Channel();

    channel.on('StasisStart', async (_event, ch) => {
      console.log(`[${client.app}] Channel started: ${ch.name}`);
      await ch.answer();

      const playback = await ch.play({ media: 'sound:hello-world' });

      playback.on('PlaybackFinished', async () => {
        await ch.hangup();
      });
    });

    channel.on('StasisEnd', () => {
      console.log(`[${client.app}] Channel ended`);
    });

    await channel.originate({
      endpoint,
      app: 'pool-app',
    });

    return channel;
  }

  // Make multiple calls using the pool
  console.log('Making 5 concurrent calls...');

  const endpoints = [
    'PJSIP/1001',
    'PJSIP/1002',
    'PJSIP/1003',
    'PJSIP/1004',
    'PJSIP/1005',
  ];

  const calls = await Promise.allSettled(
    endpoints.map((endpoint) => makeCall(endpoint))
  );

  console.log('Call results:');
  calls.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`  ${endpoints[i]}: Success (${result.value.id})`);
    } else {
      console.log(`  ${endpoints[i]}: Failed (${result.reason})`);
    }
  });

  // Wait for calls to complete
  console.log('Waiting for calls to complete...');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Cleanup
  console.log('Stopping pool...');
  await pool.stop();
  console.log('Pool stopped');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
