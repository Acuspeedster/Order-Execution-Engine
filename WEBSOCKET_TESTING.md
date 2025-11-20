# WebSocket Testing Guide

## Using wscat (Command Line)

Install wscat globally:
```bash
npm install -g wscat
```

### Connect and Send Order

```bash
# Connect to WebSocket endpoint
wscat -c "ws://localhost:3000/api/orders/execute" \
  -H "Content-Type: application/json" \
  --wait 30
```

Then send the order JSON:
```json
{
  "type": "market",
  "fromToken": "SOL",
  "toToken": "USDC",
  "amount": 10,
  "slippageTolerance": 0.01
}
```

## Using Node.js Script

Create a file `test-websocket.js`:

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/api/orders/execute');

ws.on('open', function open() {
  console.log('Connected to WebSocket');
  
  // Send order
  const order = {
    type: 'market',
    fromToken: 'SOL',
    toToken: 'USDC',
    amount: 10,
    slippageTolerance: 0.01
  };
  
  ws.send(JSON.stringify(order));
  console.log('Order sent:', order);
});

ws.on('message', function message(data) {
  const update = JSON.parse(data.toString());
  console.log('Status Update:', update);
  
  // Close connection after final status
  if (update.status === 'confirmed' || update.status === 'failed') {
    setTimeout(() => ws.close(), 5000);
  }
});

ws.on('close', function close() {
  console.log('Disconnected from WebSocket');
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});
```

Run with: `node test-websocket.js`

## Using Postman

1. Open Postman
2. Click "New" → "WebSocket Request"
3. Enter URL: `ws://localhost:3000/api/orders/execute`
4. Click "Connect"
5. In the message box, send:
```json
{
  "type": "market",
  "fromToken": "SOL",
  "toToken": "USDC",
  "amount": 10,
  "slippageTolerance": 0.01
}
```
6. Watch real-time status updates in the message panel

## Expected Status Flow

```
1. pending → Order received and queued
2. routing → Comparing DEX prices (Raydium vs Meteora)
3. building → Creating transaction
4. submitted → Transaction sent to network
5. confirmed → Transaction successful ✅
   OR
   failed → Execution failed ❌
```

## Testing Multiple Concurrent Orders

Use the following script to test concurrent processing:

```javascript
const WebSocket = require('ws');

function createOrder(id, amount) {
  const ws = new WebSocket('ws://localhost:3000/api/orders/execute');
  
  ws.on('open', () => {
    console.log(`Order ${id}: Connected`);
    ws.send(JSON.stringify({
      type: 'market',
      fromToken: 'SOL',
      toToken: 'USDC',
      amount: amount,
      slippageTolerance: 0.01
    }));
  });
  
  ws.on('message', (data) => {
    const update = JSON.parse(data.toString());
    console.log(`Order ${id} [${update.status}]:`, update.message);
    
    if (update.status === 'confirmed' || update.status === 'failed') {
      setTimeout(() => ws.close(), 3000);
    }
  });
}

// Submit 5 concurrent orders
for (let i = 1; i <= 5; i++) {
  createOrder(i, 5 + i);
}
```

## Browser Testing (HTML)

Create `test.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Order Execution WebSocket Test</title>
</head>
<body>
  <h1>Order Execution Engine - WebSocket Test</h1>
  <button onclick="submitOrder()">Submit Market Order</button>
  <div id="status"></div>
  
  <script>
    function submitOrder() {
      const ws = new WebSocket('ws://localhost:3000/api/orders/execute');
      const statusDiv = document.getElementById('status');
      
      ws.onopen = () => {
        statusDiv.innerHTML += '<p>✅ Connected to server</p>';
        
        const order = {
          type: 'market',
          fromToken: 'SOL',
          toToken: 'USDC',
          amount: 10,
          slippageTolerance: 0.01
        };
        
        ws.send(JSON.stringify(order));
        statusDiv.innerHTML += '<p>📤 Order submitted</p>';
      };
      
      ws.onmessage = (event) => {
        const update = JSON.parse(event.data);
        const emoji = update.status === 'confirmed' ? '✅' : 
                      update.status === 'failed' ? '❌' : '⏳';
        
        statusDiv.innerHTML += `<p>${emoji} [${update.status}] ${update.message}</p>`;
        
        if (update.data) {
          statusDiv.innerHTML += `<pre>${JSON.stringify(update.data, null, 2)}</pre>`;
        }
      };
      
      ws.onerror = (error) => {
        statusDiv.innerHTML += '<p>❌ Error: ' + error + '</p>';
      };
      
      ws.onclose = () => {
        statusDiv.innerHTML += '<p>🔌 Connection closed</p>';
      };
    }
  </script>
</body>
</html>
```

Open in browser and test!

## Expected Output Example

```
Order received:
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order received and queued",
  "timestamp": 1234567890
}

Status Update:
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "message": "Comparing DEX prices",
  "timestamp": 1234567892
}

Status Update:
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "routing",
  "message": "Best DEX selected",
  "data": {
    "selectedDex": "raydium",
    "raydiumPrice": 100.5,
    "meteoraPrice": 98.3
  },
  "timestamp": 1234567895
}

Status Update:
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "building",
  "message": "Creating transaction",
  "timestamp": 1234567896
}

Status Update:
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted",
  "message": "Transaction sent to network",
  "timestamp": 1234567897
}

Status Update:
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "confirmed",
  "message": "Transaction successful",
  "data": {
    "txHash": "5d8b9c7e3f2a1b4c6d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    "executionPrice": 100.5
  },
  "timestamp": 1234567900
}
```
