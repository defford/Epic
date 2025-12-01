import React from 'react';
import { CellState } from '../types';
import { Tent, User, Clock, Trash2 } from 'lucide-react';

interface BoardCellProps {
  cell: CellState;
  isCurrentPlayerHero: boolean;
  isValidMoveTarget: boolean;
  isValidBuildTarget: boolean;
  isValidDestroyTarget?: boolean;
  isExhausted?: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const BoardCell: React.FC<BoardCellProps> = ({ 
  cell, 
  isCurrentPlayerHero, 
  isValidMoveTarget, 
  isValidBuildTarget,
  isValidDestroyTarget,
  isExhausted,
  onClick,
  onContextMenu
}) => {
  const isP1Hero = cell.heroOwner === 1;
  const isP2Hero = cell.heroOwner === 2;
  const isP1Camp = cell.campOwner === 1;
  const isP2Camp = cell.campOwner === 2;

  let bgColor = 'bg-slate-100'; // Default
  if (isValidMoveTarget) bgColor = 'bg-green-100 cursor-pointer hover:bg-green-200 ring-2 ring-green-400 ring-inset';
  else if (isValidBuildTarget) bgColor = 'bg-orange-50 cursor-crosshair hover:bg-orange-100'; // Hint for buildable
  else if (isValidDestroyTarget) bgColor = 'bg-red-100 cursor-crosshair hover:bg-red-200 ring-2 ring-red-400 ring-inset'; // Hint for destroyable
  else if (cell.campOwner === 1) bgColor = 'bg-red-50';
  else if (cell.campOwner === 2) bgColor = 'bg-blue-50';

  // Highlight current hero slightly
  if (isCurrentPlayerHero && !isExhausted) {
    bgColor += ' ring-4 ring-yellow-400/50 hover:ring-yellow-500/50';
  }

  // Grey out exhausted hero
  if (isExhausted) {
    bgColor += ' grayscale opacity-90';
  }

  return (
    <div 
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`
        w-full h-full aspect-square border border-slate-300 relative 
        flex items-center justify-center transition-all duration-200
        ${bgColor}
      `}
    >
      {/* Camp Layer */}
      {isP1Camp && (
        <div className={`absolute inset-0 flex items-center justify-center ${isValidDestroyTarget ? 'opacity-50' : 'opacity-30'}`}>
          <Tent className={`w-3/4 h-3/4 ${isValidDestroyTarget ? 'text-red-900' : 'text-red-600'}`} />
        </div>
      )}
      {isP2Camp && (
        <div className={`absolute inset-0 flex items-center justify-center ${isValidDestroyTarget ? 'opacity-50' : 'opacity-30'}`}>
          <Tent className={`w-3/4 h-3/4 ${isValidDestroyTarget ? 'text-blue-900' : 'text-blue-600'}`} />
        </div>
      )}

      {/* Hero Layer */}
      {isP1Hero && (
        <div className={`relative z-10 w-4/5 h-4/5 ${isExhausted ? 'bg-red-300' : 'bg-red-500'} rounded-full flex items-center justify-center shadow-lg transform transition-transform ${!isExhausted && 'hover:scale-105'} pointer-events-none`}>
           {isExhausted ? <Clock className="text-white w-2/3 h-2/3 animate-pulse" /> : <User className="text-white w-2/3 h-2/3" />}
        </div>
      )}
      {isP2Hero && (
        <div className={`relative z-10 w-4/5 h-4/5 ${isExhausted ? 'bg-blue-300' : 'bg-blue-500'} rounded-full flex items-center justify-center shadow-lg transform transition-transform ${!isExhausted && 'hover:scale-105'} pointer-events-none`}>
           {isExhausted ? <Clock className="text-white w-2/3 h-2/3 animate-pulse" /> : <User className="text-white w-2/3 h-2/3" />}
        </div>
      )}

      {/* Move Marker */}
      {isValidMoveTarget && !cell.heroOwner && (
        <div className="absolute z-20 w-3 h-3 bg-green-500 rounded-full opacity-50 animate-pulse pointer-events-none"></div>
      )}

      {/* Destroy Marker (On Hover essentially, via class) */}
      {isValidDestroyTarget && (
        <div className="absolute z-30 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in">
           <Trash2 className="w-6 h-6 text-red-600 drop-shadow-md" />
        </div>
      )}
    </div>
  );
};