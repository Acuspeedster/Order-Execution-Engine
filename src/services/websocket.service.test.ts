import { WebSocketService } from '../services/websocket.service';
import { OrderStatus } from '../types/order.types';

describe('WebSocketService', () => {
  let wsService: WebSocketService;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    wsService = new WebSocketService(mockLogger);
  });

  describe('registerConnection', () => {
    it('should register a new WebSocket connection', () => {
      const mockSocket = createMockSocket();
      const orderId = 'test-order-123';

      wsService.registerConnection(orderId, mockSocket as any);

      expect(wsService.getOrderConnections(orderId)).toBe(1);
    });

    it('should register multiple connections for same order', () => {
      const mockSocket1 = createMockSocket();
      const mockSocket2 = createMockSocket();
      const orderId = 'test-order-123';

      wsService.registerConnection(orderId, mockSocket1 as any);
      wsService.registerConnection(orderId, mockSocket2 as any);

      expect(wsService.getOrderConnections(orderId)).toBe(2);
    });
  });

  describe('unregisterConnection', () => {
    it('should unregister a WebSocket connection', () => {
      const mockSocket = createMockSocket();
      const orderId = 'test-order-123';

      wsService.registerConnection(orderId, mockSocket as any);
      expect(wsService.getOrderConnections(orderId)).toBe(1);

      wsService.unregisterConnection(orderId, mockSocket as any);
      expect(wsService.getOrderConnections(orderId)).toBe(0);
    });
  });

  describe('broadcastStatusUpdate', () => {
    it('should broadcast status update to all connections', () => {
      const mockSocket1 = createMockSocket();
      const mockSocket2 = createMockSocket();
      const orderId = 'test-order-123';

      wsService.registerConnection(orderId, mockSocket1 as any);
      wsService.registerConnection(orderId, mockSocket2 as any);

      const update = {
        orderId,
        status: OrderStatus.ROUTING,
        message: 'Comparing DEX prices',
        timestamp: Date.now(),
      };

      wsService.broadcastStatusUpdate(update);

      expect(mockSocket1.socket.send).toHaveBeenCalledWith(
        JSON.stringify(update)
      );
      expect(mockSocket2.socket.send).toHaveBeenCalledWith(
        JSON.stringify(update)
      );
    });

    it('should handle broadcast to order with no connections', () => {
      const update = {
        orderId: 'non-existent-order',
        status: OrderStatus.PENDING,
        message: 'Order received',
        timestamp: Date.now(),
      };

      // Should not throw
      expect(() => wsService.broadcastStatusUpdate(update)).not.toThrow();
    });

    it('should handle failed send gracefully', () => {
      const mockSocket = createMockSocket();
      mockSocket.socket.send = jest.fn().mockImplementation(() => {
        throw new Error('Send failed');
      });

      const orderId = 'test-order-123';
      wsService.registerConnection(orderId, mockSocket as any);

      const update = {
        orderId,
        status: OrderStatus.ROUTING,
        message: 'Comparing DEX prices',
        timestamp: Date.now(),
      };

      // Should not throw
      expect(() => wsService.broadcastStatusUpdate(update)).not.toThrow();
    });
  });

  describe('closeOrderConnections', () => {
    it('should close all connections for an order', () => {
      const mockSocket1 = createMockSocket();
      const mockSocket2 = createMockSocket();
      const orderId = 'test-order-123';

      wsService.registerConnection(orderId, mockSocket1 as any);
      wsService.registerConnection(orderId, mockSocket2 as any);

      wsService.closeOrderConnections(orderId);

      expect(mockSocket1.socket.close).toHaveBeenCalled();
      expect(mockSocket2.socket.close).toHaveBeenCalled();
      expect(wsService.getOrderConnections(orderId)).toBe(0);
    });
  });

  describe('getActiveConnections', () => {
    it('should return total number of active connections', () => {
      const mockSocket1 = createMockSocket();
      const mockSocket2 = createMockSocket();
      const mockSocket3 = createMockSocket();

      wsService.registerConnection('order-1', mockSocket1 as any);
      wsService.registerConnection('order-1', mockSocket2 as any);
      wsService.registerConnection('order-2', mockSocket3 as any);

      expect(wsService.getActiveConnections()).toBe(3);
    });
  });

  describe('sendError', () => {
    it('should send error message to connections', () => {
      const mockSocket = createMockSocket();
      const orderId = 'test-order-123';

      wsService.registerConnection(orderId, mockSocket as any);

      wsService.sendError(orderId, 'Test error message');

      expect(mockSocket.socket.send).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
      expect(mockSocket.socket.send).toHaveBeenCalledWith(
        expect.stringContaining('Test error message')
      );
    });
  });
});

function createMockSocket() {
  return {
    socket: {
      readyState: 1, // OPEN
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    },
  };
}
