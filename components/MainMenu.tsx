import React, { useState, useEffect } from 'react';
import { Search, Users, Loader2 } from 'lucide-react';
import { wsService } from '../services/websocketService';

interface MainMenuProps {
  onGameStart: (playerNumber: 1 | 2, gameId: string) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onGameStart }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const handleMatched = (data: { gameId: string; playerNumber: 1 | 2 }) => {
      setIsSearching(false);
      setStatus(`Matched! You are Player ${data.playerNumber}`);
      setTimeout(() => {
        onGameStart(data.playerNumber, data.gameId);
      }, 1000);
    };

    const handleMatching = (data: { message: string }) => {
      setStatus(data.message);
    };

    wsService.on('MATCHED', handleMatched);
    wsService.on('MATCHING', handleMatching);

    return () => {
      wsService.off('MATCHED', handleMatched);
      wsService.off('MATCHING', handleMatching);
    };
  }, [onGameStart]);

  const handleSearch = async () => {
    if (!wsService.isConnected()) {
      try {
        await wsService.connect();
      } catch (error) {
        setStatus('Failed to connect to server. Please ensure the server is running.');
        return;
      }
    }

    setIsSearching(true);
    setStatus('Searching for opponent...');
    wsService.send({ type: 'SEARCH_GAME' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-slate-800 mb-2">Camp Connect</h1>
          <p className="text-slate-600">Multiplayer Strategy Game</p>
        </div>

        <div className="space-y-6">
          {!isSearching ? (
            <button
              onClick={handleSearch}
              className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <Search className="w-6 h-6" />
              Search for Game
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 py-4 px-6 bg-indigo-50 rounded-xl">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-indigo-700 font-medium">{status || 'Searching...'}</span>
              </div>
              <button
                onClick={() => {
                  setIsSearching(false);
                  setStatus('');
                }}
                className="w-full py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {status && !isSearching && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg text-green-700 font-medium">
              {status}
            </div>
          )}

          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Users className="w-4 h-4" />
              <span>Find an opponent to start playing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

