import React, { useState } from 'react';
import api from './api';

const ARCHETYPES = [
  { id: 'Tech Unicorn', desc: 'High Growth, High Volatility', icon: '🦄' },
  { id: 'Pharma Corp', desc: 'Regulatory Heavy, Ethics Focus', icon: '💊' },
  { id: 'FinTech Bro', desc: 'Aggressive, Market Sensitive', icon: '📉' },
  { id: 'Legacy Titan', desc: 'Stable, Slow Moving', icon: '🏭' },
];

const ACTIONS = [
  { id: 'No Comment', label: 'No Comment', desc: 'Maintain silence. (+Neutrality, -Transparency)', color: 'bg-slate-600' },
  { id: 'Public Apology', label: 'Issue Apology', desc: 'Admit fault. (+Reputation, -Price)', color: 'bg-blue-700' },
  { id: 'Deny Responsibility', label: 'Deny Responsibility', desc: 'Fight the claim. (+Price, -Reputation)', color: 'bg-red-700' },
  { id: 'Advise Buyback', label: 'Advise Buyback', desc: 'Company buys shares. (+Price, -Reputation)', color: 'bg-emerald-700' },
  { id: 'Advise Dilution', label: 'Advise Dilution', desc: 'Sell shares for cash. (-Price, +Reputation)', color: 'bg-orange-700' },
  { id: 'Leadership Shakeup', label: 'Leadership Shakeup', desc: 'Replace executives. (High Volatility)', color: 'bg-purple-700' },
];

const App = () => {
  const [view, setView] = useState('new'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState(null);
  const [statement, setStatement] = useState('');
  const [prevPrice, setPrevPrice] = useState(100);

  const startGame = async (type) => {
    setLoading(true);
    try {
      const res = await api.post('/api/start', { archetype: type });
      setGameState(res.data);
      setPrevPrice(res.data.share_price);
      setRound(1);
      setView('game');
    } catch (err) {
      setError('Connection failed. Check backend.');
    } finally {
      setLoading(false);
    }
  };

  const submitTurn = async (actionId) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post('/api/turn', {
        statement: actionId === 'No Comment' ? '[NO COMMENT]' : statement,
        action_id: actionId,
        current_state: { ...gameState, round }
      });
      
      setPrevPrice(gameState.share_price);
      setGameState(res.data);
      setRound(prev => prev + 1);
      setStatement('');

      // End Game Logic: Round 12 or Bankruptcy
      if (res.data.share_price < 10 || res.data.reputation < 5 || round >= 12) {
        setView('over');
      }
    } catch (err) {
      setError('Simulation error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'new') return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-2 tracking-tight text-white">DAMAGE CONTROL</h1>
        <p className="mb-8 text-slate-400">Corporate Events Simulator v1.0</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARCHETYPES.map(a => (
            <button 
              key={a.id} 
              onClick={() => startGame(a.id)}
              className="p-6 bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-lg transition-all text-left group"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs text-slate-500 group-hover:text-emerald-500 uppercase tracking-widest">Select</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-200">{a.id}</h3>
              <p className="text-sm text-slate-500 mt-1">{a.desc}</p>
            </button>
          ))}
        </div>
        {loading && <div className="mt-6 text-center text-emerald-500 font-mono text-sm animate-pulse">INITIALIZING MARKET DATA...</div>}
      </div>
    </div>
  );

  if (view === 'over') return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl text-center">
        <h2 className="text-3xl font-bold mb-6 text-white uppercase tracking-widest">Fiscal Year End</h2>
        
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="p-4 bg-slate-950 rounded-lg">
            <div className="text-xs text-slate-500 uppercase mb-1">Final Valuation</div>
            <div className={`text-3xl font-mono ${gameState.share_price * 1000 >= 100000 ? 'text-emerald-400' : 'text-red-400'}`}>
              £{(gameState.share_price * 1000).toLocaleString()}
            </div>
            <div className="text-xs text-slate-600 mt-2">Target: £100,000</div>
          </div>
          <div className="p-4 bg-slate-950 rounded-lg">
            <div className="text-xs text-slate-500 uppercase mb-1">Final Reputation</div>
            <div className={`text-3xl font-mono ${gameState.reputation >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
              {gameState.reputation}%
            </div>
            <div className="text-xs text-slate-600 mt-2">Target: 50%</div>
          </div>
        </div>

        <div className="mb-8 text-slate-400 italic">
          "{gameState.share_price * 1000 >= 100000 && gameState.reputation >= 50 
            ? "The board is impressed. Your contract has been renewed." 
            : "Performance targets missed. The board has requested your resignation."}"
        </div>

        <button 
          onClick={() => { setView('new'); setGameState(null); }}
          className="px-8 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors"
        >
          NEW FISCAL YEAR
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-4 font-sans">
      {/* HEADER / DASHBOARD */}
      <div className="max-w-7xl mx-auto mb-6 bg-slate-900 border-b border-slate-800 p-4 rounded-lg flex flex-wrap justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-800 rounded flex items-center justify-center text-xl">
                {ARCHETYPES.find(a => a.id === gameState?.archetype)?.icon || '🏢'}
            </div>
            <div>
                <h1 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Damage Control</h1>
                <div className="text-white font-bold">Round {round} / 12</div>
            </div>
        </div>

        <div className="flex gap-8 text-right">
             <div>
                <div className="text-xs text-slate-500 uppercase font-bold">Share Price</div>
                <div className={`text-2xl font-mono ${gameState?.share_price >= prevPrice ? 'text-emerald-400' : 'text-red-400'}`}>
                    £{gameState?.share_price.toFixed(2)}
                </div>
            </div>
            <div>
                <div className="text-xs text-slate-500 uppercase font-bold">Valuation</div>
                <div className="text-2xl font-mono text-slate-200">
                    £{(gameState?.share_price * 1000).toLocaleString()}
                </div>
            </div>
            <div>
                <div className="text-xs text-slate-500 uppercase font-bold">Reputation</div>
                <div className="text-2xl font-mono text-blue-400">{gameState?.reputation}%</div>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Event & Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* Event Card (Toned down) */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-lg shadow-sm">
             <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Event</span>
             </div>
             <h2 className="text-2xl font-bold text-white mb-4">{gameState?.headline}</h2>
             <p className="text-lg text-slate-300 leading-relaxed">{gameState?.narrative}</p>
             
             {gameState?.next_event && round > 0 && (
                 <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2 text-sm text-slate-500">
                    <span className="font-bold">FORECAST:</span> {gameState.next_event}
                 </div>
             )}
          </div>

          {/* Controls */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
            <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Public Statement</label>
                <textarea 
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Draft your statement here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-200 focus:border-emerald-500 focus:outline-none h-24 resize-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ACTIONS.map(act => (
                    <button
                        key={act.id}
                        onClick={() => submitTurn(act.id)}
                        disabled={loading}
                        className={`${act.color} hover:brightness-110 p-3 rounded text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <div className="font-bold text-white text-sm">{act.label}</div>
                        <div className="text-xs text-white/70 mt-1">{act.desc}</div>
                    </button>
                ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Stakeholder Feed */}
        <div className="lg:col-span-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full max-h-[600px]">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Stakeholder Wire</h3>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    {gameState?.stakeholder_feed?.map((post, i) => (
                        <div key={i} className="flex gap-3">
                            <div className={`h-8 w-8 min-w-[2rem] rounded-full flex items-center justify-center text-xs font-bold ${
                                post.role === 'Public' ? 'bg-blue-900 text-blue-300' :
                                post.role === 'Investor' ? 'bg-emerald-900 text-emerald-300' :
                                'bg-purple-900 text-purple-300'
                            }`}>
                                {post.role[0]}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-slate-200">{post.name}</span>
                                    <span className="text-xs text-slate-500 border border-slate-700 px-1 rounded">
                                        {post.role}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 leading-snug">"{post.text}"</p>
                            </div>
                        </div>
                    ))}
                    {!gameState?.stakeholder_feed && (
                        <div className="text-center text-slate-600 text-sm mt-10">Awaiting market data...</div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;