import { BoardState, Player } from '../types';

export type WebSocketMessage =
  | { type: 'SEARCH_GAME' }
  | { type: 'GAME_ACTION'; action: GameAction }
  | { type: 'MATCHING'; message: string }
  | { type: 'MATCHED'; gameId: string; playerNumber: Player }
  | { type: 'GAME_STATE'; gameId: string; board: BoardState; currentPlayer: Player; turnCount: number; winner: Player | null; skips: { 1: boolean; 2: boolean }; yourPlayerNumber: Player }
  | { type: 'OPPONENT_DISCONNECTED' };

export type GameAction =
  | { type: 'MOVE'; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: 'BUILD'; position: { x: number; y: number } }
  | { type: 'DESTROY'; position: { x: number; y: number } };

export class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private getWebSocketUrl(): string {
    // Check for environment variable first (useful for deployments where frontend/backend are separate)
    if (typeof window !== 'undefined' && (window as any).__WS_URL__) {
      return (window as any).__WS_URL__;
    }

    // In production, use the same hostname with wss:// protocol
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // If localhost, use default local port
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'ws://localhost:3001';
      }
      
      // In production, use the same hostname and port (or default to 443 for wss)
      const port = window.location.port ? `:${window.location.port}` : '';
      const wsUrl = `${protocol}//${hostname}${port}`;
      console.log(`Connecting to WebSocket at: ${wsUrl}`);
      return wsUrl;
    }
    
    // Fallback for SSR or non-browser environments
    return 'ws://localhost:3001';
  }

  connect(url?: string): Promise<void> {
    const wsUrl = url || this.getWebSocketUrl();
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.emit(message.type, message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.ws = null;
          this.attemptReconnect(wsUrl);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(url: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect(url).catch(() => {});
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();

