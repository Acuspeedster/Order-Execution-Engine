const WebSocket = require('ws');

function submitOrder(id) {
  const ws = new WebSocket('ws://127.0.0.1:3000/api/orders/execute');
  
  ws.on('open', () => {
    console.log(`Order ${id}: Connected`);
    ws.send(JSON.stringify({
      type: 'market',
      fromToken: 'SOL',
      toToken: 'USDC',
      amount: 5 + id,
      slippageTolerance: 0.01
    }));
  });
  
  ws.on('message', (data) => {
    const update = JSON.parse(data.toString());
    console.log(`Order ${id} [${update.status}]: ${update.message}`);
    if (update.data) console.log(`  Data:`, update.data);
  });
}

// Submit 5 orders simultaneously
for (let i = 1; i <= 5; i++) {
  submitOrder(i);
}