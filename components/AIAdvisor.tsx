import React, { useState } from 'react';
import { Sparkles, Loader2, Bot } from 'lucide-react';
import { BoardState, Player } from '../types';
import { getStrategicAdvice } from '../services/geminiService';

interface AIAdvisorProps {
  board: BoardState;
  currentPlayer: Player;
  turnCount: number;
  winner: Player | null;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ board, currentPlayer, turnCount, winner }) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAskAI = async () => {
    setLoading(true);
    setAdvice(null);
    try {
      const text = await getStrategicAdvice(board, currentPlayer, turnCount);
      setAdvice(text);
    } catch (e) {
      setAdvice("Sorry, I couldn't analyze the board right now.");
    } finally {
      setLoading(false);
    }
  };

  if (winner) return null;

  return (
    <div className="mt-6 bg-white rounded-xl shadow-lg p-6 border border-indigo-100 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          Gemini Assistant
        </h3>
        <button
          onClick={handleAskAI}
          disabled={loading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${loading 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'}
          `}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Thinking...' : 'Analyze Board'}
        </button>
      </div>

      {advice && (
        <div className="bg-indigo-50 p-4 rounded-lg text-slate-700 text-sm leading-relaxed animate-in fade-in duration-300 border border-indigo-100">
          <p className="font-medium text-indigo-900 mb-1">Coach says:</p>
          {advice}
        </div>
      )}
      
      {!advice && !loading && (
        <p className="text-slate-500 text-sm italic">
          Stuck? Ask Gemini for a strategic tip based on the current board state.
        </p>
      )}
    </div>
  );
};
