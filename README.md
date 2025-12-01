<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1V19gClvDAEWuN4eIuan0VOHSnMXL8lRK

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (optional, only needed for AI advisor)

3. Run the app:
   - **For multiplayer (recommended):** Run both the frontend and WebSocket server:
     ```bash
     npm run dev:all
     ```
   - **Frontend only:** 
     ```bash
     npm run dev
     ```
   - **Server only:**
     ```bash
     npm run server
     ```

## Multiplayer Setup

The game now supports online multiplayer through WebSocket:

1. Start the WebSocket server on port 3001 (default)
2. Open the app in your browser (runs on port 3000 by default)
3. Click "Search for Game" to enter the matching pool
4. When another player searches, you'll be automatically paired
5. Play in real-time with live updates!

The server handles:
- Player matching and pairing
- Game state synchronization
- Turn validation and enforcement
- Win condition detection
