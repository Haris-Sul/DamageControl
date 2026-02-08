import React, { useState } from 'react';
import api from './api';

const ARCHETYPES = [
  { id: 'Tech Unicorn', desc: 'High Growth, High Volatility', icon: '🦄' },
  { id: 'Pharma Corp', desc: 'Regulatory Heavy, Ethics Focus', icon: '💊' },
  { id: 'FinTech Bro', desc: 'Aggressive, Market Sensitive', icon: '📉' },
  { id: 'Legacy Titan', desc: 'Stable, Slow Moving', icon: '🏭' },
];

const ACTIONS = [
  { id: 'Monitor Situation', label: 'Monitor Situation', desc: 'Observe market. Issue statement if needed.', color: 'bg-slate-600' },
  { id: 'Public Apology', label: 'Issue Apology', desc: 'Formal admission of fault.', color: 'bg-blue-700' },
  { id: 'Deny Responsibility', label: 'Deny Responsibility', desc: 'Contest the narrative.', color: 'bg-red-700' },
  { id: 'Advise Buyback', label: 'Advise Buyback', desc: 'Buy back shares. Boosts Price, lowers Share Count.', color: 'bg-emerald-700' },
  { id: 'Advise Dilution', label: 'Advise Dilution', desc: 'Issue new shares. Lowers Price, raises Cash/Rep.', color: 'bg-orange-700' },
  { id: 'Leadership Shakeup', label: 'Leadership Shakeup', desc: 'Replace key executives. High volatility.', color: 'bg-purple-700' },
];

const App = () => {
  const [view, setView] = useState('new'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState(null);
  const [statement, setStatement] = useState('');
  
  // Track previous state for Deltas
  const [prevStats, setPrevStats] = useState({ price: 100, rep: 50, shares: 1000 });

  const startGame = async (type) => {
    if (loading) return; // Prevent double-clicks
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/start', { archetype: type });
      if (res.data.error) throw new Error(res.data.error);
      
      setGameState(res.data);
      setPrevStats({ 
        price: res.data.share_price || 100, 
        rep: res.data.reputation || 50,
        shares: res.data.total_shares || 1000 
      });
      setRound(1);
      setView('game');
    } catch (err) {
      setError('System Overload. Please try again in 1 minute.');
    } finally {
      setLoading(false);
    }
  };

  const submitTurn = async (actionId) => {
    if (loading) return;
    setLoading(true);
    
    let finalStatement = statement;
    if (actionId === 'Monitor Situation' && statement.trim() === '') {
        finalStatement = ''; 
    }

    try {
      // Save prev stats before update
      setPrevStats({ 
        price: gameState.share_price, 
        rep: gameState.reputation,
        shares: gameState.total_shares
      });

      const res = await api.post('/api/turn', {
        statement: finalStatement,
        action_id: actionId,
        current_state: { ...gameState, round }
      });
      
      setGameState(res.data);
      setRound(prev => prev + 1);
      setStatement('');

      const marketCap = res.data.share_price * res.data.total_shares;
      if (res.data.share_price < 10 || marketCap < 10000 || res.data.reputation < 5 || round >= 12) {
        setView('over');
      }
    } catch (err) {
      setError('Connection lost. Please retry the turn.');
    } finally {
      setLoading(false);
    }
  };

  // Helper for Delta rendering
  const Delta = ({ current, prev, isPercent = false, invertColor = false }) => {
    const diff = (current || 0) - (prev || 0);
    if (Math.abs(diff) < 0.01) return <div className="text-slate-600 text-xs mt-1 font-mono">-</div>;
    
    let color = diff > 0 ? 'text-emerald-400' : 'text-red-400';
    if (invertColor) color = diff > 0 ? 'text-red-400' : 'text-emerald-400';
    
    const sign = diff > 0 ? '+' : '';
    return (
        <div className={`${color} text-xs font-mono mt-1`}>
            {sign}{isPercent ? diff.toFixed(0) : diff.toFixed(2)}{isPercent ? '%' : ''}
        </div>
    );
  };

  const getRatingColor = (rating) => {
      const r = rating?.toLowerCase() || '';
      if (r.includes('buy')) return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
      if (r.includes('sell')) return 'text-red-400 border-red-500/50 bg-red-500/10';
      return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10'; 
  };

  if (view === 'new') return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full">
        <h1 className="text-5xl font-bold mb-2 tracking-tight text-white">DAMAGE CONTROL</h1>
        <p className="mb-8 text-slate-400">Corporate Strategy Simulator v3.0 (Gemma Powered)</p>
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8 flex gap-8">
            <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Strategy Guide</h3>
                <ul className="text-sm text-slate-300 space-y-2">
                    <li>• <span className="text-emerald-400 font-bold">Buybacks:</span> Spend cash to lower share count & boost price.</li>
                    <li>• <span className="text-orange-400 font-bold">Dilution:</span> Issue shares to raise cash (sacrifices price).</li>
                    <li>• <span className="text-blue-400 font-bold">Communication:</span> Silence is risky. Spin is necessary.</li>
                </ul>
            </div>
            <div className="flex-1 border-l border-slate-800 pl-8">
                <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Victory Criteria</h3>
                <ul className="text-sm text-slate-300 space-y-2 font-mono">
                    <li>VALUATION  &gt; £100,000</li>
                    <li>REPUTATION &gt; 50%</li>
                </ul>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARCHETYPES.map(a => (
            <button 
              key={a.id} 
              onClick={() => startGame(a.id)}
              className="p-6 bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800 rounded-lg transition-all text-left group"
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
        {loading && <div className="mt-6 text-center text-emerald-500 font-mono text-sm animate-pulse">CONNECTING TO MARKET FEED...</div>}
        {error && <div className="mt-4 text-center text-red-500 font-bold bg-red-900/20 p-2 rounded border border-red-500/50">{error}</div>}
      </div>
    </div>
  );

  if (view === 'over') {
    const finalCap = (gameState?.share_price || 0) * (gameState?.total_shares || 0);
    const won = finalCap >= 100000 && (gameState?.reputation || 0) >= 50;
    
    return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl text-center">
        <h2 className="text-3xl font-bold mb-2 text-white uppercase tracking-widest">Fiscal Year End</h2>
        <h3 className={`text-xl font-bold mb-8 ${won ? 'text-emerald-500' : 'text-red-500'}`}>
            {won ? 'CONTRACT RENEWED' : 'TERMINATED'}
        </h3>
        
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="p-4 bg-slate-950 rounded-lg">
            <div className="text-xs text-slate-500 uppercase mb-1">Final Valuation</div>
            <div className={`text-3xl font-mono ${finalCap >= 100000 ? 'text-emerald-400' : 'text-red-400'}`}>
              £{finalCap.toLocaleString()}
            </div>
          </div>
          <div className="p-4 bg-slate-950 rounded-lg">
            <div className="text-xs text-slate-500 uppercase mb-1">Final Reputation</div>
            <div className={`text-3xl font-mono ${gameState?.reputation >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
              {gameState?.reputation}%
            </div>
          </div>
        </div>

        <button 
          onClick={() => { setView('new'); setGameState(null); }}
          className="px-8 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors"
        >
          START NEW YEAR
        </button>
      </div>
    </div>
  );
  }

  // Calculate Market Cap for Display
  const currentMarketCap = (gameState?.share_price || 0) * (gameState?.total_shares || 0);
  const prevMarketCap = (prevStats.price || 0) * (prevStats.shares || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-4 font-sans">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-6 bg-slate-900 border-b border-slate-800 p-4 rounded-lg flex flex-wrap gap-6 justify-between items-center shadow-lg">
        
        <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-slate-800 rounded flex items-center justify-center text-2xl shadow-inner">
                {ARCHETYPES.find(a => a.id === gameState?.archetype)?.icon || '🏢'}
            </div>
            <div>
                <h1 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Damage Control</h1>
                <div className="text-white font-bold text-lg">Round {round} / 12</div>
            </div>
        </div>

        <div className="flex gap-6 lg:gap-8 text-right items-start">
             
             {/* Analyst Rating */}
             <div className="flex flex-col justify-center items-end border-r border-slate-800 pr-6 mr-2 self-center">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Analyst Rating</div>
                <div className={`text-sm font-bold px-3 py-1 rounded border uppercase tracking-wider ${getRatingColor(gameState?.analyst_rating)}`}>
                    {gameState?.analyst_rating || 'N/A'}
                </div>
             </div>

             {/* Share Price */}
             <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Share Price</div>
                <div className={`text-2xl font-mono ${gameState?.share_price >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                    £{gameState?.share_price?.toFixed(2)}
                </div>
                <Delta current={gameState?.share_price} prev={prevStats.price} />
            </div>

            {/* Total Shares */}
            <div className="hidden md:block">
                <div className="text-[10px] text-slate-500 uppercase font-bold group relative cursor-help">
                    Total Shares <span className="opacity-50 underline decoration-dotted">(?)</span>
                    <div className="absolute top-full right-0 mt-2 w-32 bg-black text-xs p-2 rounded hidden group-hover:block z-50 border border-slate-700">
                        Shares Outstanding.
                    </div>
                </div>
                <div className="text-2xl font-mono text-slate-400">
                    {gameState?.total_shares?.toLocaleString()}
                </div>
                <Delta current={gameState?.total_shares} prev={prevStats.shares} invertColor={true} />
            </div>

            {/* Valuation */}
            <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Valuation</div>
                <div className={`text-2xl font-mono ${currentMarketCap >= 100000 ? 'text-emerald-400' : 'text-red-400'}`}>
                    £{currentMarketCap.toLocaleString()}
                </div>
                <Delta current={currentMarketCap} prev={prevMarketCap} />
            </div>

            {/* Reputation */}
            <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold">Reputation</div>
                <div className={`text-2xl font-mono ${gameState?.reputation >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {gameState?.reputation}%
                </div>
                <Delta current={gameState?.reputation} prev={prevStats.rep} isPercent={true} />
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Event & Controls */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-lg shadow-sm">
             <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Situation</span>
             </div>
             <h2 className="text-2xl font-bold text-white mb-4">{gameState?.headline}</h2>
             <p className="text-lg text-slate-300 leading-relaxed">{gameState?.narrative}</p>
             
             {gameState?.market_rumor && (
                 <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2 text-sm text-slate-500 items-start">
                    <span className="font-bold text-indigo-400 shrink-0">MARKET CHATTER:</span> 
                    <span className="italic">"{gameState.market_rumor}"</span>
                 </div>
             )}
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
            <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Public Statement / Press Release</label>
                <textarea 
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Draft your statement here. Leave blank to remain silent."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-slate-200 focus:border-emerald-500 focus:outline-none h-24 resize-none placeholder:text-slate-600"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ACTIONS.map(act => (
                    <button
                        key={act.id}
                        onClick={() => submitTurn(act.id)}
                        disabled={loading}
                        className={`${act.color} hover:brightness-110 p-3 rounded text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed group`}
                    >
                        <div className="font-bold text-white text-sm">{act.label}</div>
                        <div className="text-xs text-white/70 mt-1 opacity-80 group-hover:opacity-100">{act.desc}</div>
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
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;