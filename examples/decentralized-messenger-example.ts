/**
 * Example usage of the Decentralized E2E-encrypted Messenger
 * 
 * This demonstrates how to:
 * 1. Initialize the messenger
 * 2. Bootstrap with Signal Protocol
 * 3. Establish sessions with peers
 * 4. Send and receive encrypted messages
 * 
 * To run this example:
 * - First terminal:  tsx examples/decentralized-messenger-example.ts
 * - Second terminal: tsx examples/decentralized-messenger-example.ts <db_address_from_first>
 */

import { createMessenger, Contact } from '../src/messenger/decentralized_messenger';

async function main() {
  console.log('🚀 Starting Decentralized E2E Messenger Example...');
  
  try {
    // Create and bootstrap messenger
    const messenger = await createMessenger();
    
    console.log('📦 Bootstrapping messenger...');
    await messenger.bootstrap();
    
    console.log('✅ Messenger initialized successfully!');
    console.log('💬 Ready to send and receive encrypted messages');
    
    // Set up message handler
    messenger.onMessage((msg) => {
      console.log(`📨 New message received!`);
      console.log(`   From: ${msg.from}`);
      console.log(`   To: ${msg.to}`);
      console.log(`   Timestamp: ${new Date(msg.timestamp).toLocaleString()}`);
    });
    
    // Example: If you want to send a message to another peer
    // Uncomment and modify these lines:
    /*
    const peerContact: Contact = {
      id: 'peer_id_here'
    };
    
    await messenger.ensureSession(peerContact);
    const messageId = await messenger.sendText('peer_id_here', 'Hello from the decentralized messenger!');
    console.log(`✅ Message sent with ID: ${messageId}`);
    */
    
    // Keep the process running to receive messages
    console.log('⏳ Listening for messages... (Press Ctrl+C to exit)');
    
    // Keep alive
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error running messenger example:', error);
    process.exit(1);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
