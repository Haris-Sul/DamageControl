import React, { useState, useEffect } from 'react';
import api from './api';

const ARCHETYPES = [
  { id: 'Tech Unicorn', desc: 'High Growth, Fragile Reputation', icon: '🦄' },
  { id: 'Pharma Corp', desc: 'High Ethics, Extreme Volatility', icon: '💊' },
  { id: 'FinTech Bro', desc: 'High-Risk, Regulatory-Heavy', icon: '📉' },
  { id: 'Industrial Titan', desc: 'High Stability, Low Trust', icon: '🏭' },
];

const ACTIONS = [
  { id: 'deny', label: 'Deny Everything', color: 'bg-slate-700' },
  { id: 'apologize', label: 'Public Apology', color: 'bg-blue-600' },
  { id: 'bribe', label: 'Quiet Settlement', color: 'bg-emerald-700' },
  { id: 'charity', label: 'Large Donation', color: 'bg-purple-600' },
  { id: 'fire_ceo', label: 'Fire the CEO', color: 'bg-red-600' },
  { id: 'ignore', label: 'No Comment', color: 'bg-gray-500' },
];

const App = () => {
  const [view, setView] = useState('new'); // new, game, over
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [round, setRound] = useState(1);
  const [archetype, setArchetype] = useState(null);
  const [statement, setStatement] = useState('');
  const [prevStock, setPrevStock] = useState(0);
  const [gameState, setGameState] = useState(null);

  const loadingMessages = [
    'Simulating Public Outrage...',
    'Consulting Board of Directors...',
    'Briefing Legal Team...',
    'Watching Stock Tickers...',
    'Calculating Stakeholder Fury...'
  ];

  const startGame = async (type) => {
    setLoading(true);
    setArchetype(type);
    try {
      const res = await api.post('/api/start', { archetype: type });
      setGameState(res.data);
      setPrevStock(res.data.stock_val);
      setView('game');
    } catch (err) {
      setError('failed to start game. check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const submitTurn = async (actionId) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post('/api/turn', {
        statement,
        action_id: actionId,
        current_state: { ...gameState, round }
      });
      
      setPrevStock(gameState.stock_val);
      setGameState(res.data);
      setRound(prev => prev + 1);
      setStatement('');

      // check win/loss
      if (res.data.stock_val < 1000 || res.data.rep_val < 5 || round >= 12) {
        setView('over');
      }
    } catch (err) {
      setError('the simulation crashed. please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setRound(1);
    setView('new');
    setGameState(null);
    setError(null);
  };

  if (view === 'new') return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-5xl font-black mb-4 tracking-tighter italic">DAMAGE CONTROL</h1>
      <p className="mb-8 text-slate-400">select your corporate vessel</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
        {ARCHETYPES.map(a => (
          <button 
            key={a.id} 
            onClick={() => startGame(a.id)}
            className="p-6 bg-slate-800 border-2 border-slate-700 hover:border-blue-500 rounded-xl transition-all text-left"
          >
            <span className="text-3xl mb-2 block">{a.icon}</span>
            <h3 className="text-xl font-bold">{a.id}</h3>
            <p className="text-sm text-slate-400">{a.desc}</p>
          </button>
        ))}
      </div>
      {loading && <div className="mt-8 animate-pulse text-blue-400">Initializing Crisis...</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* status bar */}
      <div className="max-w-5xl mx-auto flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-6 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-xs uppercase text-slate-500 font-bold">Stock Price</span>
          <span className={`text-2xl font-mono font-bold ${gameState?.stock_val >= prevStock ? 'text-emerald-400' : 'text-red-500'}`}>
            ${gameState?.stock_val.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase text-slate-500 font-bold">Reputation</span>
          <div className="w-32 h-3 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${gameState?.rep_val}%` }} />
          </div>
          <span className="text-xs mt-1">{gameState?.rep_val}%</span>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase text-slate-500 font-bold tracking-widest">Round</span>
          <div className="text-2xl font-black">{round}/12</div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* main theater */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
            <span className="bg-red-600 text-white px-2 py-1 text-xs font-bold rounded mb-4 inline-block italic">BREAKING NEWS</span>
            <h2 className="text-3xl font-black mb-4 uppercase leading-tight">{gameState?.headline}</h2>
            <p className="text-lg leading-relaxed text-slate-700 italic">"{gameState?.next_crisis || gameState?.narrative}"</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <textarea 
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Draft your official response statement..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 h-32 resize-none"
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ACTIONS.map(act => (
                <button
                  key={act.id}
                  onClick={() => submitTurn(act.id)}
                  disabled={loading}
                  className={`${act.color} hover:brightness-125 transition-all p-3 rounded-lg font-bold text-sm uppercase tracking-tighter disabled:opacity-50`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* stakeholder feed */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Stakeholder Reactions</h3>
          {gameState?.comments.map((c, i) => (
            <div key={i} className="bg-slate-900 p-4 rounded-xl border-l-4 border-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-blue-400 text-sm">{c.role}</span>
                <span className={`text-xs ${c.sentiment >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {c.sentiment > 0 ? '+' : ''}{c.sentiment} sentiment
                </span>
              </div>
              <p className="text-sm text-slate-300 italic">"{c.text}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xl font-bold animate-pulse">{loadingMessages[Math.floor(Math.random() * loadingMessages.length)]}</p>
          </div>
        </div>
      )}

      {/* error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 p-4 rounded-lg shadow-xl animate-bounce">
          {error}
        </div>
      )}

      {/* game over overlay */}
      {view === 'over' && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[60] p-6 text-center">
          <div className="max-w-2xl">
            <h2 className="text-6xl font-black text-red-600 mb-6 uppercase tracking-tighter italic">
              {gameState?.stock_val > 100000 && gameState?.rep_val > 50 ? 'SURVIVED' : 'TERMINATED'}
            </h2>
            <div className="bg-white text-black p-8 rounded-2xl mb-8">
              <h3 className="text-4xl font-black mb-4 uppercase underline">{gameState?.headline}</h3>
              <p className="text-xl text-slate-800 italic">{gameState?.narrative}</p>
            </div>
            <div className="flex justify-center gap-8 mb-12">
              <div>
                <div className="text-slate-500 uppercase text-xs">Final Stock</div>
                <div className="text-3xl font-mono">${gameState?.stock_val.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500 uppercase text-xs">Final Rep</div>
                <div className="text-3xl font-mono">{gameState?.rep_val}%</div>
              </div>
            </div>
            <button 
              onClick={resetGame}
              className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-full text-2xl font-black transition-all"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;