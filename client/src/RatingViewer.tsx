import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Zap, Swords } from 'lucide-react';

// 접속한 호스트명을 유지하면서 포트만 변경하여 범용적인 서버 주소 생성
const IS_DEV = window.location.port === '5173';
const SOCKET_URL = IS_DEV ? `http://${window.location.hostname}:4000` : '';
const socket = io(SOCKET_URL);

type RatingLeague = '4000' | '5000' | '6000' | 'extra';
interface RatingCharacter {
  id: string;
  memberName: string;
  characterName: string;
  jobName?: string;
  league: RatingLeague;
  score: number;
  rating: number;
  wins: number;
  losses: number;
  winStreak: number;
  registeredAt: string;
}

interface Battle {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerMember: string;
  defenderId: string;
  defenderName: string;
  defenderMember: string;
  intruderId?: string;
  intruderName?: string;
  intruderMember?: string;
  league: RatingLeague;
  status: string;
  winnerId?: string;
  loserId?: string;
  ratingChange: number;
  isTriple?: boolean;
  createdAt: string;
  updatedAt: string;
}

const LEAGUE_CONFIG: Record<RatingLeague, { label: string; color: string; bg: string; solidBg: string; minRating: number }> = {
  '4000': { label: '4000점 리그', color: '#60a5fa', bg: 'linear-gradient(135deg, #0f1f3d 0%, #050d1f 100%)', solidBg: '#0a1628', minRating: 4000 },
  '5000': { label: '5000점 리그', color: '#34d399', bg: 'linear-gradient(135deg, #0a2a1e 0%, #050f0a 100%)', solidBg: '#071a12', minRating: 5000 },
  '6000': { label: '6000점 리그', color: '#f59e0b', bg: 'linear-gradient(135deg, #2a1a00 0%, #0f0800 100%)', solidBg: '#1a1000', minRating: 6000 },
  'extra': { label: '번외 (4000점 이하)', color: '#a0a0a0', bg: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', solidBg: '#111111', minRating: 0 },
};

type TabType = 'ranking' | 'battles';

const RatingViewer: React.FC = () => {
  const [characters, setCharacters] = useState<RatingCharacter[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [activeLeague, setActiveLeague] = useState<RatingLeague>('4000');
  const [activeTab, setActiveTab] = useState<TabType>('ranking');

  const fetchRating = async () => {
    const res = await fetch(`${SOCKET_URL}/rating-viewer`);
    const data = await res.json();
    setCharacters(data.characters || []);
    setBattles(data.battles || []);
  };

  useEffect(() => {
    fetchRating();
    const onUpdate = (db: any) => {
      setCharacters(db.characters || []);
      setBattles(db.battles || []);
    };
    socket.on('ratingViewerUpdate', onUpdate);
    return () => { socket.off('ratingViewerUpdate', onUpdate); };
  }, []);

  const leagueChars = characters
    .filter(c => c.league === activeLeague)
    .sort((a, b) => b.rating - a.rating);

  // 현재 리그의 완료된 대전 기록 (최신순)
  const leagueBattles = battles
    .filter(b => b.league === activeLeague && b.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const cfg = LEAGUE_CONFIG[activeLeague];

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', position: 'relative', overflowX: 'hidden' }}>
      {/* 배경 장식 (로가다 보드와 동일한 스타일) */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '32vw', height: '100vh', zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(/login-bg.png)', backgroundSize: '200% 100%', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat', maskImage: 'linear-gradient(to bottom, transparent 150px, black 150px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 150px, black 150px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, width: '32vw', height: '100vh', zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(/login-bg.png)', backgroundSize: '200% 100%', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat', maskImage: 'linear-gradient(to bottom, transparent 150px, black 150px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 150px, black 150px)' }} />

      {/* 실시간 레이팅 컨텐츠 */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '60px 20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px', color: '#60a5fa' }}>
              <Zap size={40} fill="#60a5fa33" /> 레이팅 보드 (관전 모드)
            </h2>
            <p style={{ margin: '8px 0 0', color: '#888', fontWeight: 500, fontSize: '1.1rem' }}>실시간 랭킹 현황을 확인하세요 (읽기 전용)</p>
          </div>
        </div>

        {/* 리그 탭 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          {(['4000', '5000', '6000', 'extra'] as RatingLeague[]).map(lg => {
            const c = LEAGUE_CONFIG[lg];
            const isActive = activeLeague === lg;
            const count = characters.filter(ch => ch.league === lg).length;
            return (
              <button key={lg} onClick={() => setActiveLeague(lg)} style={{
                flex: 1, padding: '14px', borderRadius: '14px', border: `2px solid ${isActive ? c.color : '#222'}`,
                background: isActive ? c.bg : '#0a0a0a', color: isActive ? c.color : '#555',
                fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
              }}>
                <span>{c.label}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{count}명</span>
              </button>
            );
          })}
        </div>

        {/* 리그 헤더 */}
        <div style={{ background: cfg.solidBg, border: `1px solid ${cfg.color}55`, borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: cfg.color, fontWeight: 900, fontSize: '1.5rem' }}>🏆 {cfg.label}</h2>
          <p style={{ margin: '6px 0 0', color: '#888', fontSize: '0.9rem' }}>기준 레이팅: {cfg.minRating}점 · 랭킹 스냅샷 (자정 자동 갱신)</p>
        </div>

        {/* 상세 탭 (랭킹 / 대전기록) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('ranking')}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: `2px solid ${activeTab === 'ranking' ? cfg.color : '#222'}`,
              background: activeTab === 'ranking' ? cfg.solidBg : '#0a0a0a',
              color: activeTab === 'ranking' ? cfg.color : '#555',
              fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            🏅 랭킹
          </button>
          <button
            onClick={() => setActiveTab('battles')}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: `2px solid ${activeTab === 'battles' ? cfg.color : '#222'}`,
              background: activeTab === 'battles' ? cfg.solidBg : '#0a0a0a',
              color: activeTab === 'battles' ? cfg.color : '#555',
              fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            ⚔️ 대전기록
            {leagueBattles.length > 0 && (
              <span style={{ background: cfg.color, color: '#000', borderRadius: '999px', padding: '0 7px', fontSize: '0.8rem', fontWeight: 900 }}>
                {leagueBattles.length}
              </span>
            )}
          </button>
        </div>

        {/* ─── 랭킹 탭 ─── */}
        {activeTab === 'ranking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leagueChars.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#444', padding: '80px 0' }}>데이터가 없습니다.</div>
            ) : (
              leagueChars.map((char, idx) => {
                const rank = idx + 1;
                const winRate = char.wins + char.losses > 0 ? Math.round(char.wins / (char.wins + char.losses) * 100) : 0;
                return (
                  <div key={char.id} style={{
                    background: rank === 1 ? `${cfg.solidBg}` : '#0d0d0d',
                    border: `1px solid ${rank <= 3 ? cfg.color + '55' : '#1e1e1e'}`,
                    borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px'
                  }}>
                    <div style={{ minWidth: '45px', textAlign: 'center', fontSize: rank <= 3 ? '1.8rem' : '1.2rem', fontWeight: 900, color: rank <= 3 ? cfg.color : '#444' }}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        {rank === 1 && <span style={{ fontSize: '1.3rem', filter: 'drop-shadow(0 0 8px #ffd700aa)' }}>👑</span>}
                        <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>{char.characterName}</span>
                        {char.jobName && <span style={{ fontSize: '0.85rem', color: '#a78bfa', background: '#1e1030', padding: '1px 8px', borderRadius: '4px' }}>{char.jobName}</span>}
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>{char.memberName}</span>
                        {char.winStreak >= 2 && (
                          <span style={{ fontSize: '0.75rem', background: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed55', borderRadius: '4px', padding: '1px 7px' }}>
                            🔥 {char.winStreak}연승
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#555' }}>
                        <span style={{ color: '#4ade80' }}>{char.wins}승</span>
                        <span style={{ color: '#f87171' }}>{char.losses}패</span>
                        <span>승률 {winRate}%</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: '#444', marginBottom: '2px' }}>Rating</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: cfg.color }}>{char.rating.toLocaleString()}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── 대전기록 탭 ─── */}
        {activeTab === 'battles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leagueBattles.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#444', padding: '80px 0' }}>완료된 대전 기록이 없습니다.</div>
            ) : (
              leagueBattles.map((battle, idx) => {
                const isTriple = battle.isTriple;
                const winnerName = battle.winnerId === battle.challengerId
                  ? battle.challengerName
                  : battle.winnerId === battle.defenderId
                    ? battle.defenderName
                    : battle.intruderName || '?';
                const loserName = battle.loserId === battle.challengerId
                  ? battle.challengerName
                  : battle.loserId === battle.defenderId
                    ? battle.defenderName
                    : battle.intruderName || '?';

                const date = new Date(battle.updatedAt);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

                return (
                  <div key={battle.id} style={{
                    background: '#0d0d0d',
                    border: `1px solid ${idx === 0 ? cfg.color + '44' : '#1a1a1a'}`,
                    borderRadius: '12px', padding: '16px 20px',
                  }}>
                    {/* 타임라인 & 뱃지 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Swords size={14} color={cfg.color} />
                        {isTriple && (
                          <span style={{ fontSize: '0.75rem', background: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed55', borderRadius: '4px', padding: '1px 7px', fontWeight: 700 }}>
                            3자대결
                          </span>
                        )}
                        <span style={{ fontSize: '0.8rem', color: cfg.color, fontWeight: 700 }}>
                          +{battle.ratingChange} pt
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#444' }}>{dateStr}</span>
                    </div>

                    {/* 대전 내용 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {/* 참가자 전체 표시 */}
                      {isTriple ? (
                        <>
                          <PlayerChip name={battle.challengerName} member={battle.challengerMember} isWinner={battle.winnerId === battle.challengerId} color={cfg.color} />
                          <span style={{ color: '#333', fontSize: '1.2rem' }}>vs</span>
                          <PlayerChip name={battle.defenderName} member={battle.defenderMember} isWinner={battle.winnerId === battle.defenderId} color={cfg.color} />
                          <span style={{ color: '#333', fontSize: '1.2rem' }}>vs</span>
                          <PlayerChip name={battle.intruderName || '?'} member={battle.intruderMember || ''} isWinner={battle.winnerId === battle.intruderId} color={cfg.color} />
                        </>
                      ) : (
                        <>
                          <PlayerChip name={battle.challengerName} member={battle.challengerMember} isWinner={battle.winnerId === battle.challengerId} color={cfg.color} />
                          <span style={{ color: '#333', fontSize: '1.4rem', fontWeight: 900 }}>vs</span>
                          <PlayerChip name={battle.defenderName} member={battle.defenderMember} isWinner={battle.winnerId === battle.defenderId} color={cfg.color} />
                        </>
                      )}
                    </div>

                    {/* 결과 요약 */}
                    <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '0.82rem', color: '#555' }}>
                      <span style={{ color: '#4ade80', fontWeight: 700 }}>{winnerName}</span>
                      <span style={{ margin: '0 6px' }}>승</span>
                      {!isTriple && (
                        <>
                          <span style={{ color: '#f87171', fontWeight: 700 }}>{loserName}</span>
                          <span style={{ margin: '0 6px' }}>패</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 플레이어 칩 컴포넌트
const PlayerChip: React.FC<{ name: string; member: string; isWinner: boolean; color: string }> = ({ name, member, isWinner, color }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: isWinner ? `${color}15` : '#111',
    border: `1px solid ${isWinner ? color + '66' : '#222'}`,
    borderRadius: '10px', padding: '8px 14px', minWidth: '100px',
    transition: 'all 0.2s',
  }}>
    {isWinner && <span style={{ fontSize: '0.7rem', color: color, fontWeight: 700, marginBottom: '2px' }}>🏆 승리</span>}
    <span style={{ fontWeight: 800, fontSize: '1rem', color: isWinner ? '#fff' : '#888' }}>{name}</span>
    <span style={{ fontSize: '0.75rem', color: '#555' }}>{member}</span>
  </div>
);

export default RatingViewer;
