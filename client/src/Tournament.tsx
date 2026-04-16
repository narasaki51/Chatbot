import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Shuffle, ExternalLink, History as HistoryIcon, Search } from 'lucide-react';

interface TournamentProps {
  user: {
    name: string;
    role: 'admin' | 'host' | 'member' | 'guest';
  };
}

type TournamentLeague = 'bronze' | 'silver' | 'gold' | 'master';
type BracketSize = 8 | 16;

interface Participant {
  id: string;
  name: string;
}

interface Match {
  id: string;
  p1?: Participant;
  p2?: Participant;
  winnerId?: string;
}

interface LeagueData {
  matches: Match[];
  participants: Participant[];
  bracketSize: BracketSize;
  isStarted: boolean;
}

interface TournamentHistory {
  id: string;
  league: string;
  winnerName: string;
  date: string;
  participantsCount: number;
}

const LEAGUES: Record<TournamentLeague, { label: string; score: string; color: string; bg: string }> = {
  bronze: { label: '브론즈리그', score: '4000점', color: '#cd7f32', bg: 'linear-gradient(135deg, #3d2b1f 0%, #1a120b 100%)' },
  silver: { label: '실버리그', score: '5000점', color: '#c0c0c0', bg: 'linear-gradient(135deg, #2f2f2f 0%, #0f0f0f 100%)' },
  gold: { label: '골드리그', score: '6000점', color: '#ffd700', bg: 'linear-gradient(135deg, #3d3400 0%, #1a1600 100%)' },
  master: { label: '마스터리그', score: '7000점+', color: '#a78bfa', bg: 'linear-gradient(135deg, #1e1030 0%, #0a0510 100%)' },
};

const Tournament: React.FC<TournamentProps> = ({ user }) => {
  const [activeLeague, setActiveLeague] = useState<TournamentLeague>('bronze');
  const [tab, setTab] = useState<'bracket' | 'history'>('bracket');

  const initialMatches = (size: BracketSize): Match[] => Array.from({ length: size === 16 ? 15 : 7 }, (_, i) => ({ id: `m${i}` }));

  const [tournamentData, setTournamentData] = useState<Record<TournamentLeague, LeagueData>>(() => {
    const saved = localStorage.getItem('tournament_data_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      bronze: { matches: initialMatches(8), participants: [], bracketSize: 8, isStarted: false },
      silver: { matches: initialMatches(8), participants: [], bracketSize: 8, isStarted: false },
      gold: { matches: initialMatches(8), participants: [], bracketSize: 8, isStarted: false },
      master: { matches: initialMatches(8), participants: [], bracketSize: 8, isStarted: false },
    };
  });

  const [history, setHistory] = useState<TournamentHistory[]>(() => {
    const saved = localStorage.getItem('tournament_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [newPlayerName, setNewPlayerName] = useState('');
  const isAdmin = user.role === 'admin' || user.role === 'host';
  const currentData = tournamentData[activeLeague];

  useEffect(() => {
    localStorage.setItem('tournament_data_v1', JSON.stringify(tournamentData));
  }, [tournamentData]);

  useEffect(() => {
    localStorage.setItem('tournament_history', JSON.stringify(history));
  }, [history]);

  const openLopec = (name: string) => {
    if (!name.trim()) return;
    window.open(`https://lopec.kr/character/specPoint/${encodeURIComponent(name.trim())}`, '_blank');
  };

  const handleSizeChange = (size: BracketSize) => {
    if (currentData.isStarted) return;
    if (currentData.participants.length > 0) {
      if (!confirm('인원수를 변경하면 대진표가 초기화됩니다.')) return;
    }
    setTournamentData(prev => ({
      ...prev,
      [activeLeague]: { matches: initialMatches(size), participants: [], bracketSize: size, isStarted: false }
    }));
  };

  const addParticipant = () => {
    if (currentData.isStarted) return;
    const name = newPlayerName.trim();
    if (!name || currentData.participants.length >= currentData.bracketSize) return;
    
    const newP = { id: `p_${Date.now()}`, name };
    setTournamentData(prev => {
      const league = prev[activeLeague];
      const updatedParticipants = [...league.participants, newP];
      const updatedMatches = league.matches.map(m => ({ ...m }));
      const firstRoundCount = league.bracketSize / 2;
      for (let i = 0; i < firstRoundCount; i++) {
        if (!updatedMatches[i].p1) { updatedMatches[i].p1 = newP; break; }
        if (!updatedMatches[i].p2) { updatedMatches[i].p2 = newP; break; }
      }
      return { ...prev, [activeLeague]: { ...league, participants: updatedParticipants, matches: updatedMatches } };
    });
    setNewPlayerName('');
  };

  const shuffleParticipants = () => {
    if (currentData.isStarted || currentData.participants.length < 2) return;
    setTournamentData(prev => {
      const league = prev[activeLeague];
      const shuffled = [...league.participants].sort(() => Math.random() - 0.5);
      const updatedMatches = initialMatches(league.bracketSize);
      shuffled.forEach((p, idx) => {
        const matchIdx = Math.floor(idx / 2);
        if (idx % 2 === 0) updatedMatches[matchIdx].p1 = p;
        else updatedMatches[matchIdx].p2 = p;
      });
      return { ...prev, [activeLeague]: { ...league, matches: updatedMatches } };
    });
  };

  const setWinner = (matchIdx: number, winner: Participant) => {
    if (!isAdmin || !currentData.isStarted) return;
    setTournamentData(prev => {
      const league = { ...prev[activeLeague] };
      const matches = league.matches.map(m => ({ ...m }));
      matches[matchIdx].winnerId = winner.id;

      let nextMatchIdx = -1;
      let isP1 = false;

      if (league.bracketSize === 16) {
        if (matchIdx < 8) { nextMatchIdx = 8 + Math.floor(matchIdx / 2); isP1 = matchIdx % 2 === 0; }
        else if (matchIdx < 12) { nextMatchIdx = 12 + Math.floor((matchIdx - 8) / 2); isP1 = matchIdx % 2 === 0; }
        else if (matchIdx < 14) { nextMatchIdx = 14; isP1 = matchIdx % 2 === 0; }
      } else {
        if (matchIdx < 4) { nextMatchIdx = 4 + Math.floor(matchIdx / 2); isP1 = matchIdx % 2 === 0; }
        else if (matchIdx < 6) { nextMatchIdx = 6; isP1 = matchIdx % 2 === 0; }
      }

      if (nextMatchIdx !== -1) {
        if (isP1) matches[nextMatchIdx].p1 = winner;
        else matches[nextMatchIdx].p2 = winner;
      }
      return { ...prev, [activeLeague]: { ...league, matches } };
    });
  };

  const finalizeHistory = () => {
    const finalIdx = currentData.bracketSize === 16 ? 14 : 6;
    const winnerId = currentData.matches[finalIdx].winnerId;
    const winner = [currentData.matches[finalIdx].p1, currentData.matches[finalIdx].p2].find(p => p?.id === winnerId);
    
    if (!winner) { alert('최종 우승자가 결정되지 않았습니다.'); return; }
    if (!confirm(`${winner.name} 선수의 우승으로 종료하시겠습니까?`)) return;

    setHistory(prev => [{
      id: `h_${Date.now()}`,
      league: LEAGUES[activeLeague].label,
      winnerName: winner.name,
      date: new Date().toLocaleDateString(),
      participantsCount: currentData.participants.length
    }, ...prev]);
    
    setTournamentData(prev => ({
      ...prev,
      [activeLeague]: { matches: initialMatches(currentData.bracketSize), participants: [], bracketSize: currentData.bracketSize, isStarted: false }
    }));
  };

  const resetTournament = () => {
    if (!confirm('초기화하시겠습니까?')) return;
    setTournamentData(prev => ({
      ...prev,
      [activeLeague]: { matches: initialMatches(currentData.bracketSize), participants: [], bracketSize: currentData.bracketSize, isStarted: false }
    }));
  };

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Trophy color="#ffd700" size={40} /> 천하제일 무도회
        </h1>
        <div style={{ display: 'flex', background: '#111', padding: '4px', borderRadius: '12px' }}>
          <button onClick={() => setTab('bracket')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: tab === 'bracket' ? '#222' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 900 }}>대진표</button>
          <button onClick={() => setTab('history')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: tab === 'history' ? '#222' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 900 }}>히스토리</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'bracket' ? (
          <motion.div key="bracket">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
              {(Object.keys(LEAGUES) as TournamentLeague[]).map(lg => (
                <button key={lg} onClick={() => setActiveLeague(lg)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: `2px solid ${activeLeague === lg ? LEAGUES[lg].color : '#222'}`, background: activeLeague === lg ? LEAGUES[lg].bg : '#0a0a0a', color: 'white', fontWeight: 900, cursor: 'pointer' }}>
                  {LEAGUES[lg].label} <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6 }}>{LEAGUES[lg].score}</span>
                </button>
              ))}
            </div>

            {isAdmin && (
              <div style={{ background: '#111', padding: '20px', borderRadius: '16px', border: '1px solid #222', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: '#888', fontWeight: 900 }}>인원수:</span>
                  {[8, 16].map(s => <button key={s} disabled={currentData.isStarted} onClick={() => handleSizeChange(s as BracketSize)} style={{ background: currentData.bracketSize === s ? LEAGUES[activeLeague].color : '#222', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 900 }}>{s}인</button>)}
                  <input value={newPlayerName} disabled={currentData.isStarted} 
                    onChange={e => setNewPlayerName(e.target.value)} 
                    onKeyDown={e => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === 'Enter') addParticipant();
                    }} placeholder="참가자 추가" style={{ flex: 1, background: '#050505', border: '1px solid #333', borderRadius: '100px', padding: '10px 20px', color: 'white', fontSize: '0.9rem' }} />
                  <button onClick={() => openLopec(newPlayerName)} style={{ background: '#222', color: '#00ffa3', border: '1px solid #00ffa344', padding: '9px 18px', borderRadius: '100px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <Search size={14} /> 로팩체크
                  </button>
                  <button onClick={addParticipant} disabled={currentData.isStarted} style={{ background: LEAGUES[activeLeague].color, color: 'black', border: 'none', padding: '9px 25px', borderRadius: '100px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>등록</button>
                  <button onClick={shuffleParticipants} disabled={currentData.isStarted} style={{ background: '#222', color: 'white', border: '1px solid #444', padding: '9px 18px', borderRadius: '100px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <Shuffle size={14} /> 섞기
                  </button>
                  <button onClick={() => setTournamentData(prev => ({ ...prev, [activeLeague]: { ...prev[activeLeague], isStarted: true } }))} style={{ background: '#4ade80', color: 'black', border: 'none', padding: '9px 25px', borderRadius: '100px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>시작</button>
                  <button onClick={resetTournament} style={{ border: '1px solid #4b1515', color: '#ff4b4b', background: 'transparent', padding: '9px 18px', borderRadius: '100px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>초기화</button>
                  <button onClick={finalizeHistory} style={{ background: '#4ade80', color: 'black', border: 'none', padding: '9px 25px', borderRadius: '100px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <HistoryIcon size={14} /> 종료 & 기록
                  </button>
                </div>
              </div>
            )}

            <div className="style-scrollbar" style={{ border: '1px solid #222', borderRadius: '24px', background: '#050505', padding: '40px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: '60px', width: 'max-content' }}>
                {currentData.bracketSize === 16 && (
                  <BracketColumn title="16강" color="#666">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <MatchNode key={i} match={currentData.matches[i]} onWinner={(p) => setWinner(i, p)} isAdmin={isAdmin} isStarted={currentData.isStarted} onLopec={openLopec} themeColor={LEAGUES[activeLeague].color} />)}
                  </BracketColumn>
                )}
                <BracketColumn title="8강" color={LEAGUES[activeLeague].color}>
                  {currentData.bracketSize === 16 
                    ? [8, 9, 10, 11].map(i => <MatchNode key={i} match={currentData.matches[i]} onWinner={(p) => setWinner(i, p)} isAdmin={isAdmin} isStarted={currentData.isStarted} onLopec={openLopec} themeColor={LEAGUES[activeLeague].color} />)
                    : [0, 1, 2, 3].map(i => <MatchNode key={i} match={currentData.matches[i]} onWinner={(p) => setWinner(i, p)} isAdmin={isAdmin} isStarted={currentData.isStarted} onLopec={openLopec} themeColor={LEAGUES[activeLeague].color} />)
                  }
                </BracketColumn>
                <BracketColumn title="4강" color="#a78bfa">
                  {currentData.bracketSize === 16
                    ? [12, 13].map(i => <MatchNode key={i} match={currentData.matches[i]} onWinner={(p) => setWinner(i, p)} isAdmin={isAdmin} isStarted={currentData.isStarted} onLopec={openLopec} themeColor={LEAGUES[activeLeague].color} />)
                    : [4, 5].map(i => <MatchNode key={i} match={currentData.matches[i]} onWinner={(p) => setWinner(i, p)} isAdmin={isAdmin} isStarted={currentData.isStarted} onLopec={openLopec} themeColor={LEAGUES[activeLeague].color} />)
                  }
                </BracketColumn>
                <BracketColumn title="결승" color="#ffd700">
                   <MatchNode match={currentData.matches[currentData.bracketSize === 16 ? 14 : 6]} onWinner={(p) => setWinner(currentData.bracketSize === 16 ? 14 : 6, p)} isAdmin={isAdmin} isStarted={currentData.isStarted} isFinal onLopec={openLopec} themeColor={LEAGUES[activeLeague].color} />
                </BracketColumn>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="history">
            {/* 히스토리 생략 (데이터 호환 가능) */}
            <div style={{ background: '#111', padding: '30px', borderRadius: '20px' }}>
              <h2 style={{ color: 'white', fontWeight: 900, marginBottom: '20px' }}>기록실</h2>
              {history.map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #222' }}>
                  <span style={{ color: '#a78bfa', fontWeight: 700 }}>{h.league}</span>
                  <span style={{ color: '#fff' }}>{h.winnerName} 우승</span>
                  <span style={{ color: '#666' }}>{h.date}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BracketColumn: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
     <h3 style={{ color, fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>{title}</h3>
     <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', flex: 1, gap: '20px' }}>
       {children}
     </div>
  </div>
);

const MatchNode: React.FC<{ match?: Match; onWinner: (p: Participant) => void; isAdmin: boolean; isStarted: boolean; isFinal?: boolean; onLopec: (n: string) => void; themeColor: string }> = ({ match, onWinner, isAdmin, isStarted, isFinal, onLopec, themeColor }) => {
  if (!match) return null;
  return (
    <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '1px', background: `${themeColor}22`, borderRadius: '10px', overflow: 'hidden', border: `2px solid ${themeColor}`, position: 'relative', boxShadow: `0 0 15px ${themeColor}33` }}>
      <PlayerRow participant={match.p1} isWinner={match.winnerId === match.p1?.id} isLoser={!!match.winnerId && match.winnerId !== match.p1?.id} onWin={() => match.p1 && onWinner(match.p1)} canWin={isAdmin && isStarted && !!match.p2 && !match.winnerId} onLopec={onLopec} themeColor={themeColor} />
      <div style={{ height: '1px', background: `${themeColor}44` }} />
      <PlayerRow participant={match.p2} isWinner={match.winnerId === match.p2?.id} isLoser={!!match.winnerId && match.winnerId !== match.p2?.id} onWin={() => match.p2 && onWinner(match.p2)} canWin={isAdmin && isStarted && !!match.p1 && !match.winnerId} onLopec={onLopec} themeColor={themeColor} />
      {isFinal && match.winnerId && (
        <div style={{ position: 'absolute', right: '-45px', top: '50%', transform: 'translateY(-50%)' }}>
          <Trophy size={35} color="#ffd700" style={{ filter: 'drop-shadow(0 0 8px #ffd700)' }} />
        </div>
      )}
    </div>
  );
};

const PlayerRow: React.FC<{ participant?: Participant; isWinner: boolean; isLoser: boolean; onWin: () => void; canWin: boolean; onLopec: (n: string) => void; themeColor: string }> = ({ participant, isWinner, isLoser, onWin, canWin, onLopec, themeColor }) => (
  <div style={{ height: '42px', display: 'flex', alignItems: 'center', padding: '0 12px', background: isWinner ? `${themeColor}44` : 'transparent', opacity: isLoser ? 0.3 : 1, transition: 'all 0.3s' }}>
    <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px', overflow: 'hidden' }}>
      {participant && <button onClick={() => onLopec(participant.name)} style={{ background: 'transparent', border: 'none', color: '#00ffa3', cursor: 'pointer', padding: 0 }}><ExternalLink size={12} /></button>}
      <span style={{ color: isWinner ? '#ffd700' : 'white', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
        {participant ? participant.name : '대기중'}
      </span>
      {isWinner && <Crown size={12} color="#ffd700" />}
    </div>
    {canWin && participant && (
      <button onClick={onWin} style={{ background: '#ffd700', color: 'black', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}>승</button>
    )}
  </div>
);

export default Tournament;
