# Epic Strategy Game - Multiplayer Setup

A 2-player strategy game built with Three.js and Socket.io.

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Server

1. Start the server:
```bash
npm start
```

The server will run on port 3000 by default (or the port specified in the PORT environment variable).

## Exposing via ngrok

1. Install ngrok (if not already installed):
```bash
npm install -g ngrok
# OR
brew install ngrok  # macOS
```

2. In a new terminal, expose your local server:
```bash
npx ngrok http 3000
```

3. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

4. Share the URL with other players!

## How to Play

### Host (Player 1)
1. Start the server: `npm start`
2. Expose via ngrok: `npx ngrok http 3000`
3. Open your browser to `http://localhost:3000` (or the ngrok URL)
4. Click "Create Room"
5. Share the room code or ngrok URL with the other player
6. Wait for the other player to join
7. Click "Ready" when both players are connected
8. Game starts!

### Joining Player (Player 2)
1. Get the ngrok URL or room code from the host
2. If you have the URL with room code: Open the URL directly
3. If you only have the room code: Open the ngrok URL and click "Join Existing Room", then enter the room code
4. Click "Ready" when ready
5. Game starts!

## Features

- **Room System**: Create or join rooms with 6-character codes
- **Random Player Assignment**: Players are randomly assigned as Player 1 or Player 2
- **Real-time Synchronization**: Game state is synchronized between players
- **Turn-based**: Only the current player can make moves
- **Local Play Option**: Can also play locally on the same device

## Development

- Server: Node.js with Express and Socket.io
- Client: Three.js for 3D graphics
- Port: Default 3000 (configurable via PORT environment variable)

## Notes

- The game requires 2 players to start
- Players are randomly assigned as Player 1 or Player 2
- All game actions are synchronized in real-time
- The server handles room management and player matching


