import { GoogleGenAI } from "@google/genai";
import { BoardState, Player } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getStrategicAdvice = async (
  board: BoardState,
  currentPlayer: Player,
  turnCount: number
): Promise<string> => {
  try {
    // Simplify board representation for the AI to save tokens and reduce complexity
    const simplifiedBoard = board.map(row => 
      row.map(cell => {
        let symbol = '.';
        if (cell.campOwner === 1) symbol = 'c1';
        if (cell.campOwner === 2) symbol = 'c2';
        if (cell.heroOwner === 1) symbol = 'H1';
        if (cell.heroOwner === 2) symbol = 'H2';
        if (cell.heroOwner === 1 && cell.campOwner === 1) symbol = 'B1'; // Base/Both
        if (cell.heroOwner === 2 && cell.campOwner === 2) symbol = 'B2';
        return symbol;
      })
    );

    const prompt = `
      You are an expert AI game coach for a board game called "Camp Connect".
      
      **Game Rules:**
      - Board: 8x8 grid.
      - Players: P1 (starts Top-Left) vs P2 (starts Bottom-Right).
      - Goal: Move your Hero to a square adjacent to the Enemy Hero to win.
      - Movement: A Hero can move 1 square in any direction ONLY if they are currently adjacent to (or on) one of their own Camps.
      - Building: A Hero can spend a turn to build a Camp at their current location. This extends their range for future moves.
      
      **Current State:**
      - Turn: ${turnCount}
      - Current Player to move: Player ${currentPlayer}
      - Board Representation (H=Hero, c=Camp, B=Hero+Camp, .=Empty):
      ${JSON.stringify(simplifiedBoard)}

      **Task:**
      Analyze the position. Is the player safe? Are they extending towards the enemy? Is the enemy threatening a win?
      Provide 2-3 sentences of concise, strategic advice for Player ${currentPlayer}. Do not explain the rules, just give tactical advice.
      If a win is imminent (distance = 2 squares), warn them or encourage the attack.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate advice at this time.";
  } catch (error) {
    console.error("Error fetching Gemini advice:", error);
    return "The AI advisor is currently offline (Check API Key).";
  }
};
