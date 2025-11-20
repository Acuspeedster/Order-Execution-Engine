const WebSocket = require('ws');

// Use 127.0.0.1 instead of localhost to force IPv4
const ws = new WebSocket('ws://127.0.0.1:3000/api/orders/execute');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket');
  
  // Send order
  const order = {
    type: 'market',
    fromToken: 'SOL',
    toToken: 'USDC',
    amount: 10,
    slippageTolerance: 0.01
  };
  
  ws.send(JSON.stringify(order));
  console.log('📤 Order sent:', order);
});

ws.on('message', function message(data) {
  const update = JSON.parse(data.toString());
  console.log('📨 Status Update:', update);
  
  if (update.status === 'confirmed' || update.status === 'failed') {
    setTimeout(() => ws.close(), 2000);
  }
});

ws.on('close', function close() {
  console.log('🔌 Disconnected');
});

ws.on('error', function error(err) {
  console.error('❌ Error:', err.message);
});