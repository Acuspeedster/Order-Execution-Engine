import { FastifyInstance } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { OrderStatusUpdate } from '../types/order.types';

interface SocketStream {
  socket: WebSocket;
}

export class WebSocketService {
  private connections: Map<string, Set<SocketStream>>;
  private logger: any;

  constructor(logger: any) {
    this.connections = new Map();
    this.logger = logger;
  }

  /**
   * Register a WebSocket connection for an order
   */
  registerConnection(orderId: string, socket: SocketStream): void {
    if (!this.connections.has(orderId)) {
      this.connections.set(orderId, new Set());
    }

    this.connections.get(orderId)!.add(socket);

    this.logger.info({ orderId }, 'WebSocket connection registered');

    // Handle connection close
    socket.socket.on('close', () => {
      this.unregisterConnection(orderId, socket);
    });

    socket.socket.on('error', (error: Error) => {
      this.logger.error({ orderId, error }, 'WebSocket error');
      this.unregisterConnection(orderId, socket);
    });
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterConnection(orderId: string, socket: SocketStream): void {
    const connections = this.connections.get(orderId);
    if (connections) {
      connections.delete(socket);
      if (connections.size === 0) {
        this.connections.delete(orderId);
      }
    }

    this.logger.info({ orderId }, 'WebSocket connection unregistered');
  }

  /**
   * Broadcast status update to all connections for an order
   */
  broadcastStatusUpdate(update: OrderStatusUpdate): void {
    const connections = this.connections.get(update.orderId);

    if (!connections || connections.size === 0) {
      this.logger.debug({ orderId: update.orderId }, 'No active connections for order');
      return;
    }

    const message = JSON.stringify(update);

    connections.forEach((socket) => {
      try {
        if (socket.socket.readyState === 1) { // OPEN
          socket.socket.send(message);
          this.logger.debug({ orderId: update.orderId, status: update.status }, 'Status update sent');
        }
      } catch (error: any) {
        this.logger.error({ orderId: update.orderId, error: error.message }, 'Failed to send status update');
        this.unregisterConnection(update.orderId, socket);
      }
    });

    // Close connections if order is completed or failed
    if (update.status === 'confirmed' || update.status === 'failed') {
      setTimeout(() => {
        this.closeOrderConnections(update.orderId);
      }, 5000); // Close after 5 seconds
    }
  }

  /**
   * Close all connections for an order
   */
  closeOrderConnections(orderId: string): void {
    const connections = this.connections.get(orderId);

    if (connections) {
      connections.forEach((socket) => {
        try {
          socket.socket.close();
        } catch (error: any) {
          this.logger.error({ orderId, error: error.message }, 'Error closing connection');
        }
      });

      this.connections.delete(orderId);
      this.logger.info({ orderId }, 'All connections closed for order');
    }
  }

  /**
   * Get number of active connections
   */
  getActiveConnections(): number {
    let total = 0;
    this.connections.forEach((connections) => {
      total += connections.size;
    });
    return total;
  }

  /**
   * Get connections for a specific order
   */
  getOrderConnections(orderId: string): number {
    return this.connections.get(orderId)?.size || 0;
  }

  /**
   * Send error message to connections
   */
  sendError(orderId: string, error: string): void {
    const connections = this.connections.get(orderId);

    if (connections) {
      const message = JSON.stringify({
        type: 'error',
        orderId,
        error,
        timestamp: Date.now(),
      });

      connections.forEach((socket) => {
        try {
          if (socket.socket.readyState === 1) {
            socket.socket.send(message);
          }
        } catch (err: any) {
          this.logger.error({ orderId, error: err.message }, 'Failed to send error');
        }
      });
    }
  }
}
