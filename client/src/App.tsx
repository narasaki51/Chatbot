import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { RotateCcw, PartyPopper, Sparkles, Zap, Trash2, Settings2, EyeOff, Eye, Users, Lock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// 접속한 호스트명을 유지하면서 포트만 변경하여 범용적인 서버 주소 생성
const IS_DEV = window.location.port === '5173';
const SOCKET_URL = IS_DEV ? `http://${window.location.hostname}:4000` : '';
const socket = io(SOCKET_URL);

interface UserAuth {
  name: string;
  role: 'admin' | 'host' | 'member' | 'guest';
  chnnelid?: string;
}

const LoginPage: React.FC<{ onSuccess: (user: UserAuth) => void }> = ({ onSuccess }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(`${SOCKET_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pw })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) onSuccess({ name: data.name, role: data.role, chnnelid: data.chnnelid });
        else alert(data.error);
      })
      .catch(() => alert('서버와의 연결 상태를 확인해주세요.'));
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: 'white' }}>
      <form onSubmit={handleLogin} style={{ background: '#111', padding: '40px', borderRadius: '20px', width: '350px', border: '1px solid #333', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ textAlign: 'center', color: '#00ffa3', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}><Lock /> 시스템 로그인</h2>
        <input placeholder="아이디" value={id} onChange={e => setId(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', outline: 'none' }} />
        <input type="password" placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', outline: 'none' }} />
        <button type="submit" style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#00ffa3', color: 'black', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', marginTop: '10px' }}>접속하기</button>
      </form>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserAuth | null>(null);
  const [view, setView] = useState<'dashboard' | 'ladder' | 'roulette' | 'group' | 'sentiment' | 'chatbot'>('dashboard');
  const [missions, setMissions] = useState<any[]>([]);
  const [isDonationOnly, setIsDonationOnly] = useState(true);
  const [isMissionDonationOnly, setIsMissionDonationOnly] = useState(false);

  useEffect(() => {
    fetch(`${SOCKET_URL}/missions`).then(res => res.json()).then(data => setMissions(data));
    fetch(`${SOCKET_URL}/donation-only`).then(res => res.json()).then(data => setIsDonationOnly(data.enabled));
    fetch(`${SOCKET_URL}/mission-donation-only`).then(res => res.json()).then(data => setIsMissionDonationOnly(data.enabled));

    const handleNew = (m: any) => setMissions(p => [...p, m]);
    const handleUpdate = (m: any) => setMissions(p => p.map(o => String(o.id) === String(m.id) ? m : o));
    const handleDel = (id: string) => {
      console.log('Socket deleting ID:', id);
      setMissions(p => p.filter(m => String(m.id) !== String(id)));
    };
    const handleDonationOnlyUpdate = (enabled: boolean) => setIsDonationOnly(enabled);
    const handleMissionDonationOnlyUpdate = (enabled: boolean) => setIsMissionDonationOnly(enabled);

    socket.on('newMission', handleNew);
    socket.on('updateMission', handleUpdate);
    socket.on('missionDeleted', handleDel);
    socket.on('donationOnlyUpdate', handleDonationOnlyUpdate);
    socket.on('missionDonationOnlyUpdate', handleMissionDonationOnlyUpdate);

    return () => {
      socket.off('newMission', handleNew);
      socket.off('updateMission', handleUpdate);
      socket.off('missionDeleted', handleDel);
      socket.off('donationOnlyUpdate', handleDonationOnlyUpdate);
      socket.off('missionDonationOnlyUpdate', handleMissionDonationOnlyUpdate);
    };
  }, [SOCKET_URL]);

  const toggleDonationOnly = () => {
    const nextVal = !isDonationOnly;
    fetch(`${SOCKET_URL}/donation-only`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextVal })
    });
  };

  const toggleMissionDonationOnly = () => {
    const nextVal = !isMissionDonationOnly;
    fetch(`${SOCKET_URL}/mission-donation-only`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextVal })
    });
  };

  const addTestMission = (content: string) => {
    console.log("[Test] Adding Mission Content:", content);
    fetch(`${SOCKET_URL}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator: '테스터', content })
    }).catch(err => console.error("Test fetch error:", err));
  };

  const addTestDonation = (content: string) => {
    console.log("[Test] Simulating Donation Command:", content);
    fetch(`${SOCKET_URL}/test-donation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator: '도네테스터', content })
    }).catch(err => console.error("Test donation error:", err));
  };

  const updateStatus = (id: string, status: string) => {
    fetch(`${SOCKET_URL}/missions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  };

  const deleteMission = (id: string) => {
    // 낙관적 UI 업데이트 (Optimistic UI)로 클릭 즉시 화면에서 빈 공간 제거
    setMissions(p => p.filter(m => String(m.id) !== String(id)));
    fetch(`${SOCKET_URL}/missions/${id}`, { method: 'DELETE' }).catch(err => console.error("Deletion error:", err));
  };

  if (!user) {
    return <LoginPage onSuccess={setUser} />;
  }

  // 1. 멤버가 로그인하면 로가다 탭으로 화면 고정
  if (user.role === 'member' && view !== 'group') {
    setView('group');
  }
  // 2. 게스트가 로그인하면 룰렛 탭으로 화면 고정
  if (user.role === 'guest' && view !== 'roulette') {
    setView('roulette');
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#050505', padding: '15px', color: 'white', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1.5px solid #111', paddingBottom: '15px', position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={24} color="#00ffa3" fill="#00ffa333" />
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#00ffa3', letterSpacing: '-1px' }}>찌모의 놀이터 <span style={{ fontSize: '0.8rem', color: '#888' }}>({user.name})</span></h1>
        </div>

        {user.role !== 'member' && user.role !== 'guest' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setView('dashboard')} style={{ background: view === 'dashboard' ? '#222' : 'transparent', color: view === 'dashboard' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'dashboard' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>메인대시보드</button>
            <button onClick={() => setView('group')} style={{ background: view === 'group' ? '#222' : 'transparent', color: view === 'group' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'group' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>로가다</button>
            <button onClick={() => setView('sentiment')} style={{ background: view === 'sentiment' ? '#222' : 'transparent', color: view === 'sentiment' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'sentiment' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>민심판독기</button>
            <div style={{ width: '1px', background: '#333', margin: '0 5px' }}></div>
            <button onClick={() => setView('ladder')} style={{ background: view === 'ladder' ? '#222' : 'transparent', color: view === 'ladder' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'ladder' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>사다리타기</button>
            <button onClick={() => setView('roulette')} style={{ background: view === 'roulette' ? '#222' : 'transparent', color: view === 'roulette' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'roulette' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>룰렛돌리기</button>
            <button onClick={() => setView('chatbot')} style={{ background: view === 'chatbot' ? '#222' : 'transparent', color: view === 'chatbot' ? '#ffbd2e' : '#666', border: '1px solid', borderColor: view === 'chatbot' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>🐹 찌모채팅봇</button>
          </div>
        )}

        {user.role === 'admin' && (
          <div style={{ display: 'flex', gap: '8px', background: '#111', padding: '8px 12px', borderRadius: '12px', border: '1px solid #333', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center' }}>[Test Panel]</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#ffbd2e', fontWeight: 900, cursor: 'pointer', borderRight: '1px solid #333', paddingRight: '10px', marginRight: '5px' }}>
              <input type="checkbox" checked={isDonationOnly} onChange={toggleDonationOnly} style={{ cursor: 'pointer' }} />
              도네 전용
            </label>
            <button onClick={() => addTestMission('테스트 미션입니다')} style={{ background: '#222', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>+ 미션 추가</button>
            <button onClick={() => addTestMission('의리사다리 벌칙!')} style={{ background: '#222', border: 'none', color: '#00d1ff', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>+ 사다리/룰렛 벌칙</button>
            <button onClick={() => addTestDonation('!룰렛추가 10스쿼트')} style={{ background: '#222', border: 'none', color: '#ffbd2e', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>+ 도네(룰렛옵션)</button>
            <button onClick={() => fetch(`${SOCKET_URL}/test-sentiment`, { method: 'POST' })} style={{ background: '#222', border: 'none', color: '#ff4b4b', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>+ 채팅(민심조작)</button>
          </div>
        )}
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        {view === 'dashboard' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(user.role === 'admin' || user.role === 'host') && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  background: isMissionDonationOnly ? '#ffbd2e22' : '#222', 
                  padding: '10px 20px', 
                  borderRadius: '15px', 
                  border: `1px solid ${isMissionDonationOnly ? '#ffbd2e' : '#333'}`,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  color: isMissionDonationOnly ? '#ffbd2e' : '#888',
                  transition: 'all 0.2s'
                }}>
                  <input type="checkbox" checked={isMissionDonationOnly} onChange={toggleMissionDonationOnly} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                  {isMissionDonationOnly ? '💰 도네이션 미션만 수신 중' : '💬 모든 채팅 미션 수신 중'}
                </label>
              </div>
            )}
            <AnimatePresence>
              {(() => {
                const mainMissions = missions.filter(m => m.type !== 'rogada');
                // 내용 기준 중복 그룹핑
                const grouped = new Map<string, any[]>();
                mainMissions.forEach(m => {
                  const key = (m.content.startsWith('!미션 ') ? m.content.replace('!미션 ', '') : m.content).trim().toLowerCase();
                  if (!grouped.has(key)) grouped.set(key, []);
                  grouped.get(key)!.push(m);
                });
                return Array.from(grouped.values()).map(group => (
                  <MissionCard key={group[0].id} mission={group[0]} count={group.length} onUpdate={updateStatus} onDelete={() => { group.forEach(m => deleteMission(m.id)); }} onGoLadder={() => setView('ladder')} />
                ));
              })()}
            </AnimatePresence>
          </div>
        ) : view === 'ladder' ? (
          <LadderGame key="lad-comp-last" />
        ) : view === 'group' ? (
          <GroupMissionBoard key="grp-board-last" missions={missions} onUpdate={updateStatus} onDelete={deleteMission} user={user!} />
        ) : view === 'sentiment' ? (
          <SentimentTracker key="senti-comp-last" />
        ) : view === 'chatbot' ? (
          <HamsterChatBot key="chatbot-comp-last" />
        ) : (
          <RouletteGame key="roul-comp-last" user={user!} />
        )}
      </div>
    </div>
  );
};

const SentimentTracker: React.FC = () => {
  const [gauge, setGauge] = useState(50);
  const [pulse, setPulse] = useState(false);
  const prev5Ref = useRef(10);

  useEffect(() => {
    fetch(`${SOCKET_URL}/sentiment`).then(res => res.json()).then(data => {
      setGauge(data.sentimentGauge);
      prev5Ref.current = Math.floor(data.sentimentGauge / 5);
    });

    const handleUpdate = (val: number) => {
      setGauge(val);
      const current5 = Math.floor(val / 5);
      if (current5 !== prev5Ref.current) {
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
        prev5Ref.current = current5;
      }
    };

    socket.on('sentimentUpdate', handleUpdate);
    return () => { socket.off('sentimentUpdate', handleUpdate); };
  }, []);

  const visualGauge = gauge;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '40px', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', borderRadius: '25px', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginBottom: '10px' }}>🔥 실시간 시청자 민심 판독기 🔥</h2>
      <p style={{ color: '#888', marginBottom: '40px' }}>긍정적인 채팅과 부정적인 채팅을 분석하여 현재 방송의 민심을 게이지로 보여줍니다.</p>

      <motion.div animate={pulse ? { scale: [1, 1.05, 1], boxShadow: ['inset 0 10px 20px rgba(0,0,0,0.5)', '0 0 40px rgba(255,255,255,0.4)', 'inset 0 10px 20px rgba(0,0,0,0.5)'] } : { scale: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} style={{ position: 'relative', width: '100%', height: '60px', background: '#222', borderRadius: '30px', overflow: 'hidden', boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.5)' }}>
        {/* 부정적 영역 (나락 - 왼쪽) */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${100 - visualGauge}%`, background: 'linear-gradient(90deg, #ff4b4b, #ff7e4b)', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        {/* 긍정적 영역 (극락 - 오른쪽) */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `${visualGauge}%`, background: 'linear-gradient(-90deg, #00ffa3, #00c8ff)', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />

        {/* 텍스트 렌더링 */}
        <div style={{ position: 'absolute', top: '50%', left: '20px', transform: 'translateY(-50%)', fontWeight: 900, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)', fontSize: '1.2rem', zIndex: 10 }}>나락 ({100 - visualGauge}%)</div>
        <div style={{ position: 'absolute', top: '50%', right: '20px', transform: 'translateY(-50%)', fontWeight: 900, color: 'black', textShadow: '0 2px 4px rgba(255,255,255,0.5)', fontSize: '1.2rem', zIndex: 10 }}>극락 ({visualGauge}%)</div>

        {/* 중앙 기준선 */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '4px', background: 'rgba(255,255,255,0.3)', zIndex: 5, transform: 'translateX(-50%)' }} />
      </motion.div>

      <div style={{ marginTop: '30px', fontSize: '1rem', color: '#666' }}>정밀도 데이터: 1% 단위 실시간 렌더링 (5% 지점 돌파 시 임팩트 발동)</div>
    </motion.div>
  );
};

const MissionCard: React.FC<{ mission: any, count?: number, onUpdate: (id: string, s: string) => void, onDelete: (id: string) => void, onGoLadder: () => void, isBlind?: boolean, canUseLadder?: boolean }> = ({ mission, count = 1, onUpdate, onDelete, onGoLadder, isBlind = false, canUseLadder = true }) => {
  const [effect, setEffect] = useState<string | null>(null);
  const triggerAction = (status: string) => {
    setEffect(status);
    setTimeout(() => {
      if (status === 'accepted') {
        onUpdate(mission.id, status);
        setEffect(null);
      } else {
        onDelete(mission.id);
      }
    }, status === 'accepted' ? 400 : 700);
  };
  const contentFixed = mission.content.startsWith('!미션 ') ? mission.content.replace('!미션 ', '') : mission.content;
  const isLadder = contentFixed.includes('의리사다리');

  if (isBlind) {
    return (
      <motion.div layout initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0, x: 50 }}
        style={{ minHeight: '65px', width: '100%', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#080808', borderRadius: '12px', boxSizing: 'border-box', border: '2px solid #2a2a2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '5px', background: '#1a1a1a', color: '#444', fontSize: '0.65rem', fontWeight: 900 }}>🔒</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 900, fontSize: '1rem', color: '#444' }}>비공개 미션</span>
            <span style={{ fontSize: '0.72rem', color: '#333', fontWeight: 600 }}>본인에게만 공개됩니다</span>
          </div>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div layout initial={{ x: -20, opacity: 0 }}
      animate={effect === 'success' ? { scale: 1.05, background: '#00ffa3', color: '#000' } : effect === 'failure' ? { x: [-5, 5, -5, 5, 0], backgroundColor: '#ff4b4b' } : effect === 'accepted' ? { scale: [1, 1.05, 1], borderColor: '#00ffa3' } : effect === 'rejected' ? { x: -100, opacity: 0 } : { x: 0, opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: 50 }}
      style={{ 
        minHeight: '65px', width: '100%', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#080808', borderRadius: '12px', boxSizing: 'border-box',
        border: (effect === 'accepted' || mission.status === 'accepted') ? '2px solid #00ffa3' : (isLadder ? '2px solid #ffbd2e' : '2px solid #222') 
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
        {/* WAIT/LIVE 백지 */}
        <div style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '5px', background: mission.status === 'accepted' ? '#00ffa3' : '#333', color: 'black', fontSize: '0.65rem', fontWeight: 900 }}>{mission.status === 'pending' ? 'WAIT' : 'LIVE'}</div>

        {/* 중복 카운터 및 네임 */}
        {count > 1 && (
          <div style={{ flexShrink: 0, background: '#ff4b4b', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>{count}</div>
        )}

        {/* 미션 내용 입력 현시 (primary) + 생성자 (secondary) */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <span style={{ fontWeight: 900, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isLadder ? '#ffbd2e' : 'white' }}>{contentFixed}</span>
          <span style={{ fontSize: '0.72rem', color: isLadder ? '#ffbd2e88' : '#00ffa388', fontWeight: 600 }}>@{mission.creator}{count > 1 ? ` 외 ${count - 1}명` : ''}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '10px', minWidth: mission.status === 'accepted' && isLadder ? '230px' : '150px', justifyContent: 'flex-end' }}>
        {mission.status === 'pending' ? (<><button onClick={() => triggerAction('accepted')} style={{ cursor: 'pointer', background: '#00ffa3', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: 'black', fontSize: '0.8rem' }}>수락</button><button onClick={() => triggerAction('rejected')} style={{ cursor: 'pointer', background: '#222', border: '1px solid #ff4b4b', padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: '#ff4b4b', fontSize: '0.8rem' }}>거절</button></>) :
          (<>{isLadder && <button onClick={() => { if (canUseLadder) { onGoLadder(); setTimeout(() => onDelete(mission.id), 100); } }} style={{ cursor: canUseLadder ? 'pointer' : 'not-allowed', background: canUseLadder ? '#ffbd2e' : '#2a2a2a', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: canUseLadder ? 'black' : '#555', fontSize: '0.8rem', display: 'flex', gap: '5px', opacity: canUseLadder ? 1 : 0.5 }}>사다리 <Sparkles size={14} /></button>}<button onClick={() => triggerAction('success')} style={{ cursor: 'pointer', background: 'white', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: 'black', fontSize: '0.8rem' }}>성공</button><button onClick={() => triggerAction('failure')} style={{ cursor: 'pointer', background: '#ff4b4b', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: 'white', fontSize: '0.8rem' }}>실패</button></>)}
      </div>
    </motion.div>
  );
};

// LadderGame, GroupMissionBoard, RouletteGame 컴포넌트는 동일하므로 생략하지 않고 최종 품질 유지
const LadderGame: React.FC = () => {
  const [count, setCount] = useState(4);
  const [starts, setStarts] = useState<string[]>(Array(12).fill(''));
  const [ends, setEnds] = useState<string[]>(Array(12).fill(''));
  const [bridges, setBridges] = useState<{ row: number, col: number }[]>([]);
  const [activePaths, setActivePaths] = useState<{ id: number, points: { x: number, y: number }[] }[]>([]);
  const [isBlind, setIsBlind] = useState(false);
  const [showResult, setShowResult] = useState<{ name: string, result: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const WIDTH = 1000; const HEIGHT = 800; const ROW_COUNT = 30;
  const generateBridges = () => { const newBridges: { row: number, col: number }[] = []; for (let r = 2; r < ROW_COUNT - 2; r++) { for (let c = 0; c < count - 1; c++) { if (Math.random() > 0.72) { if (!newBridges.some(b => b.row === r && (b.col === c - 1 || b.col === c + 1))) { newBridges.push({ row: r, col: c }); } } } } setBridges(newBridges); setActivePaths([]); setShowResult(null); };
  useEffect(() => generateBridges(), [count]);
  const runPath = (startIdx: number) => { if (activePaths.some(p => p.id === startIdx)) return; let currCol = startIdx; const pts = [{ x: startIdx, y: 0 }]; for (let r = 1; r < ROW_COUNT; r++) { const bR = bridges.find(b => b.row === r && b.col === currCol); const bL = bridges.find(b => b.row === r && b.col === currCol - 1); if (bR) { pts.push({ x: currCol, y: r }); currCol++; pts.push({ x: currCol, y: r }); } else if (bL) { pts.push({ x: currCol, y: r }); currCol--; pts.push({ x: currCol, y: r }); } } pts.push({ x: currCol, y: ROW_COUNT }); const sPts = pts.map(p => ({ x: (p.x / (count - 1)) * WIDTH, y: (p.y / ROW_COUNT) * HEIGHT })); setActivePaths(prev => [...prev, { id: startIdx, points: sPts }]); let startTime: number | null = null; const animate = (ts: number) => { if (!startTime) startTime = ts; const progress = Math.min((ts - startTime) / 3500, 1); if (scrollRef.current) scrollRef.current.scrollTop = progress * HEIGHT - 200; if (progress < 1) requestAnimationFrame(animate); else { setShowResult({ name: starts[startIdx] || `${startIdx + 1}번`, result: ends[currCol] || `${currCol + 1}번 결과` }); } }; requestAnimationFrame(animate); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px 20px', borderRadius: '15px', marginBottom: '15px', border: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={18} color="#ffbd2e" /><span style={{ fontWeight: 900, color: '#ffbd2e' }}>인원수</span> <input type="number" value={count} min={2} max={12} onChange={e => setCount(Number(e.target.value))} style={{ width: '50px', background: '#000', border: '1px solid #333', color: 'white', borderRadius: '5px', padding: '5px', textAlign: 'center' }} /></div>
          <button onClick={generateBridges} style={{ cursor: 'pointer', background: '#222', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 900, fontSize: '0.8rem' }}><RotateCcw size={14} style={{ marginRight: '5px' }} /> 새 판 짜기</button>
        </div>
        <button onClick={() => setIsBlind(!isBlind)} style={{ cursor: 'pointer', background: isBlind ? '#ffbd2e' : '#222', color: isBlind ? 'black' : '#ffbd2e', border: isBlind ? 'none' : '1px solid #ffbd2e44', padding: '8px 18px', borderRadius: '8px', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isBlind ? <EyeOff size={16} /> : <Eye size={16} />} BLIND PROGRESS
        </button>
      </div>
      <AnimatePresence>{showResult && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} style={{ background: '#050505', padding: '30px 50px', borderRadius: '30px', border: '4px solid #ffbd2e', textAlign: 'center', boxShadow: '0 0 50px rgba(255, 189, 46, 0.3)' }}><PartyPopper size={50} color="#ffbd2e" style={{ marginBottom: '15px' }} /><div style={{ fontSize: '1.8rem', color: 'white', fontWeight: 900 }}>{showResult.name}</div><div style={{ fontSize: '2rem', color: '#ffbd2e', fontWeight: 900, marginTop: '10px' }}>{showResult.result}</div><button style={{ cursor: 'pointer', marginTop: '25px', background: '#ffbd2e', border: 'none', padding: '12px 40px', borderRadius: '10px', fontWeight: 900 }} onClick={() => setShowResult(null)}>확인 완료</button></motion.div></motion.div>)}</AnimatePresence>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: '#020202', border: '1px solid #111', borderRadius: '15px', position: 'relative', padding: '40px 0' }}>
        <svg viewBox={`-120 -80 ${WIDTH + 240} ${HEIGHT + 350}`} style={{ width: '1000px', height: 'auto', margin: '0 auto', display: 'block', overflow: 'visible' }}>
          {Array.from({ length: count }).map((_, i) => (<g key={i}><line x1={(i / (count - 1)) * WIDTH} y1="0" x2={(i / (count - 1)) * WIDTH} y2={HEIGHT} stroke="#222" strokeWidth="6" strokeLinecap="round" /><circle cx={(i / (count - 1)) * WIDTH} cy="0" r="6" fill="#ffbd2e" /><circle cx={(i / (count - 1)) * WIDTH} cy={HEIGHT} r="6" fill="#ffbd2e" /></g>))}
          {!isBlind && bridges.map((b, i) => (<line key={i} x1={(b.col / (count - 1)) * WIDTH} y1={(b.row / ROW_COUNT) * HEIGHT} x2={((b.col + 1) / (count - 1)) * WIDTH} y2={(b.row / ROW_COUNT) * HEIGHT} stroke="#ffbd2e44" strokeWidth="4" strokeLinecap="round" />))}
          {!isBlind && activePaths.map((p) => (<motion.polyline key={p.id} points={p.points.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="none" stroke="#ffbd2e" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 3.5, ease: "easeInOut" }} />))}
          {Array.from({ length: count }).map((_, i) => (<foreignObject key={i} x={(i / (count - 1)) * WIDTH - 85} y="-95" width="170" height="85"><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', background: '#000', border: '2px solid #ffbd2e', padding: '4px', borderRadius: '8px' }}><input placeholder="이름" value={starts[i]} onChange={e => { const n = [...starts]; n[i] = e.target.value; setStarts(n); }} style={{ width: '100px', background: 'none', color: 'white', border: 'none', textAlign: 'center', fontWeight: 800 }} /><button onClick={() => runPath(i)} style={{ cursor: 'pointer', background: '#ffbd2e', border: 'none', width: '30px', borderRadius: '5px', height: '30px', fontWeight: 900 }}>▶</button></div></div></foreignObject>))}
          {Array.from({ length: count }).map((_, i) => (<foreignObject key={i} x={(i / (count - 1)) * WIDTH - 80} y={HEIGHT + 25} width="160" height="70"><div style={{ textAlign: 'center' }}><input placeholder="결과" value={ends[i]} onChange={e => { const n = [...ends]; n[i] = e.target.value; setEnds(n); }} style={{ width: '150px', background: '#000', border: '2px solid #222', color: '#ffbd2e', textAlign: 'center', padding: '12px', borderRadius: '10px', fontSize: '1rem', fontWeight: 800 }} /></div></foreignObject>))}
        </svg>
      </div>
    </div>
  );
};

const GroupMissionBoard: React.FC<{ missions: any[], onUpdate: (id: string, s: string) => void, onDelete: (id: string) => void, user: UserAuth }> = ({ missions, onUpdate, onDelete, user }) => {
  const rogadaMissions = missions.filter(m => m.type === 'rogada');
  const members = ['찌모', '미랑', '갱쥰', '서씨', '떠기', '말구⭐️'];

  const [connectedMembers, setConnectedMembers] = useState<string[]>([]);
  const [usersConfig, setUsersConfig] = useState<{ name: string, chnnelid: string }[]>([]);
  const [chatLogs, setChatLogs] = useState<{ member: string, sender: string, content: string, isDonation: boolean, timestamp: number }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${IS_DEV ? 'http://localhost:4000' : ''}/users-config`).then(res => res.json())
      .then(data => setUsersConfig(data)).catch(() => { });
    fetch(`${IS_DEV ? 'http://localhost:4000' : ''}/connected-members`).then(res => res.json())
      .then(data => setConnectedMembers(data)).catch(() => { });

    const onConnect = (data: any) => setConnectedMembers(p => [...p.filter(m => m !== data.member), data.member]);
    const onDisconnect = (member: string) => setConnectedMembers(p => p.filter(m => m !== member));
    const onChatLog = (log: any) => {
      setChatLogs(p => [...p.slice(-199), log]); // 최대 200개 유지
    };

    socket.on('memberConnected', onConnect);
    socket.on('memberDisconnected', onDisconnect);
    socket.on('memberChatLog', onChatLog);

    return () => {
      socket.off('memberConnected', onConnect);
      socket.off('memberDisconnected', onDisconnect);
      socket.off('memberChatLog', onChatLog);
    };
  }, []);

  const addRogadaTest = (member: string) => {
    fetch(`${IS_DEV ? 'http://localhost:4000' : ''}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator: '보드매니저', target: member.replace('⭐️', ''), content: '할당된 작업', type: 'rogada' })
    });
  };

  const connectMemberChannel = (member: string) => {
    const cleanName = member.replace('⭐️', '');
    const userConfig = usersConfig.find(u => u.name === cleanName);
    let channelId = userConfig?.chnnelid || '';

    if (!channelId) {
      const channelIdOrUrl = prompt(`[${member}] 연결할 치지직 채널 ID 또는 URL을 입력하세요:`, '');
      if (!channelIdOrUrl) return;
      channelId = channelIdOrUrl.match(/channel\/([^/?&]+)/)?.[1] || channelIdOrUrl;
    }

    fetch(`${IS_DEV ? 'http://localhost:4000' : ''}/connect-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member: cleanName, channelId })
    })
      .then(res => res.json())
      .catch(err => alert(`❌ 요청 에러: ${err.message}`));
  };

  const disconnectMemberChannel = (member: string) => {
    fetch(`${IS_DEV ? 'http://localhost:4000' : ''}/disconnect-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member: member.replace('⭐️', '') })
    }).catch(() => { });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' }}>
        {members.map(member => {
          const cleanName = member.replace('⭐️', '');
          const memberMissions = rogadaMissions.filter(m => m.target === cleanName);
          const isOwner = member === '찌모';

          return (
            <div key={member} style={{
              background: isOwner ? 'linear-gradient(180deg, #162a16 0%, #0a110a 100%)' : 'linear-gradient(180deg, #111 0%, #050505 100%)',
              borderRadius: '20px',
              padding: '25px',
              border: isOwner ? '2px solid #00ffa3' : '1px solid #333',
              boxShadow: isOwner ? '0 0 30px rgba(0, 255, 163, 0.4)' : '0 10px 30px rgba(0,0,0,0.5)',
              position: 'relative'
            }}>
              {isOwner && (
                <div style={{ position: 'absolute', top: '-15px', right: '30px', background: '#00ffa3', color: 'black', padding: '5px 15px', borderRadius: '20px', fontWeight: 900, fontSize: '0.8rem', boxShadow: '0 5px 15px rgba(0,255,163,0.5)', zIndex: 10 }}>
                  👑 주인장 (HOST)
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: isOwner ? '2px solid rgba(0,255,163,0.3)' : '2px solid #222', paddingBottom: '15px' }}>
                <h3 style={{ margin: 0, color: isOwner ? '#00ffa3' : member.includes('⭐️') ? '#ffbd2e' : '#2e96ff', fontSize: isOwner ? '1.9rem' : '1.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', textShadow: isOwner ? '0 0 15px rgba(0,255,163,0.5)' : 'none' }}>
                  <Users size={isOwner ? 26 : 22} /> {member}
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {!isOwner && (user.role === 'admin' || user.role === 'host' || user.name === cleanName) && (
                    connectedMembers.includes(cleanName) ? (
                      <button onClick={() => disconnectMemberChannel(member)} style={{ cursor: 'pointer', background: '#ff4b4b22', color: '#ff4b4b', border: '1px solid #ff4b4b', padding: '8px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '0.85rem' }}>- 종료</button>
                    ) : (
                      <button onClick={() => connectMemberChannel(member)} style={{ cursor: 'pointer', background: '#ffbd2e22', color: '#ffbd2e', border: '1px solid #ffbd2e', padding: '8px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '0.85rem' }}>+ 연결</button>
                    )
                  )}
                  {(user.role === 'admin' || user.role === 'host' || user.name === cleanName) && (
                    <button onClick={() => addRogadaTest(member)} style={{ cursor: 'pointer', background: '#2e96ff22', color: '#2e96ff', border: '1px solid #2e96ff', padding: '8px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '0.85rem' }}>+ 추가</button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '150px' }}>
                <AnimatePresence>
                  {memberMissions.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ margin: 'auto', color: '#555', fontSize: '1rem', fontWeight: 800 }}>할당된 미션이 없습니다.</motion.div>
                  ) : memberMissions.map(m => (
                    <MissionCard key={m.id} mission={m} onUpdate={onUpdate} onDelete={onDelete} onGoLadder={() => console.log('사다리 이동 클릭됨')}
                      isBlind={!!m.private && user.name !== cleanName && user.role !== 'admin'}
                      canUseLadder={user.role === 'admin' || user.role === 'host'} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* 멤버 채팅 로그 패널 */}
      {chatLogs.length > 0 && user.role !== 'member' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '30px', background: '#0a0a0a', border: '1px solid #222', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#888', fontSize: '0.95rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
            💬 연결된 채널 실시간 채팅 로그
            <span style={{ color: '#444', fontWeight: 400, fontSize: '0.8rem' }}>({chatLogs.length}개)</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
            {chatLogs.map((log, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', padding: '6px 10px', borderRadius: '8px', background: log.isDonation ? '#1a1200' : '#111', borderLeft: `3px solid ${log.isDonation ? '#ffbd2e' : '#333'}` }}>
                <span style={{ color: '#00ffa3', fontWeight: 900, minWidth: '50px' }}>[{log.member}]</span>
                <span style={{ color: log.isDonation ? '#ffbd2e' : '#aaa', fontWeight: 700 }}>{log.sender}</span>
                <span style={{ color: '#666' }}>:</span>
                <span style={{ color: 'white', flex: 1 }}>{log.content}</span>
                {log.isDonation && <span style={{ color: '#ffbd2e', fontSize: '0.75rem' }}>💰후원</span>}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </motion.div>
      )}
    </>
  );
};

// ─── 햄스터 채팅봇 ───────────────────────────────────────────────────────────

const HAMSTER_COLORS = ['original', 'black', 'gray', 'white'];

// 스프라이트 시트: 1836×2304px, 4열(열당 459px)
const SPRITE_W = 1836;
const SPRITE_H = 2304;
const SPRITE_CELL_W = 459;
const DISP_W = 80;
const SPRITE_SCALE = DISP_W / SPRITE_CELL_W;
const DISP_H = Math.round(346 * SPRITE_SCALE); // 모든 행 공통 고정 높이 (normal 기준)

const SPRITE_ROWS = {
  normal: { y: 43,   h: 346 }, // 기본
  angry:  { y: 421,  h: 322 }, // 화남
  sad:    { y: 765,  h: 293 }, // 슬픔
  happy:  { y: 1068, h: 304 }, // 행복
  wink:   { y: 1385, h: 303 }, // 윙크
  walkL:  { y: 1695, h: 299 }, // 왼쪽이동
  walkR:  { y: 2010, h: 294 }, // 오른쪽이동
} as const;

type SpriteRow = keyof typeof SPRITE_ROWS;

interface HamsterData {
  nickname: string;
  x: number;
  direction: 'left' | 'right' | 'front';
  isWalking: boolean;
  walkEndAt: number;
  message: string | null;
  messageTs: number;
  lastMessageTs: number;
  colorIdx: number;
  expression: 'normal' | 'angry' | 'sad' | 'happy' | 'wink';
  isDonation: boolean;
  sinking: boolean;
  emerging: boolean;
  joinedAt: number;
}

const HamsterSprite: React.FC<{ colorIdx: number; row: SpriteRow; frame: number }> = ({ colorIdx, row, frame }) => {
  const color = HAMSTER_COLORS[colorIdx % HAMSTER_COLORS.length];
  const { y, h } = SPRITE_ROWS[row];
  const rowDispH = Math.round(h * SPRITE_SCALE);
  return (
    <div style={{ width: DISP_W, height: DISP_H, position: 'relative' }}>
      <div style={{
        position: 'absolute',
        bottom: 0,
        width: DISP_W,
        height: rowDispH,
        backgroundImage: `url(/hamsters/${color}_t.png)`,
        backgroundSize: `${Math.round(SPRITE_W * SPRITE_SCALE)}px ${Math.round(SPRITE_H * SPRITE_SCALE)}px`,
        backgroundPosition: `${-(frame * DISP_W)}px ${-Math.round(y * SPRITE_SCALE)}px`,
        backgroundRepeat: 'no-repeat',
      }} />
    </div>
  );
};

const HamsterChatBot: React.FC = () => {
  const [hamsters, setHamsters] = useState<Map<string, HamsterData>>(new Map());
  const [walkFrame, setWalkFrame] = useState(0);
  const [chatLog, setChatLog] = useState<{ sender: string; content: string; isDonation: boolean }[]>([]);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const sinkTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const emergeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const STAGE_W = 860;
  const INACTIVE_MS = 60000;

  // 발걸음 프레임 토글
  useEffect(() => {
    const t = setInterval(() => setWalkFrame(f => f === 0 ? 1 : 0), 280);
    return () => clearInterval(t);
  }, []);

  // 랜덤 이동 + 표정 변화
  useEffect(() => {
    const IDLE_EXPRS: Array<'normal' | 'angry' | 'sad' | 'happy' | 'wink'> = ['normal', 'normal', 'happy', 'angry', 'sad', 'wink'];
    const t = setInterval(() => {
      setHamsters(prev => {
        const next = new Map(prev);
        next.forEach((h, key) => {
          if (h.sinking) return;
          if (Math.random() < 0.55) {
            const dx = (Math.random() - 0.5) * 220;
            const newX = Math.max(10, Math.min(STAGE_W - 70, h.x + dx));
            const reps = Math.floor(Math.random() * 4) + 1;
            next.set(key, { ...h, x: newX, direction: dx > 0 ? 'right' : 'left', isWalking: true, walkEndAt: Date.now() + 1700 * reps });
          } else {
            const expr = IDLE_EXPRS[Math.floor(Math.random() * IDLE_EXPRS.length)];
            next.set(key, { ...h, direction: 'front', isWalking: false, walkEndAt: 0, expression: expr });
          }
        });
        return next;
      });
    }, 2800);
    return () => clearInterval(t);
  }, []);

  // 말풍선 자동 제거 + 30초 비활성 시 땅속으로 사라짐
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setHamsters(prev => {
        let changed = false;
        const next = new Map(prev);
        next.forEach((h, key) => {
          if (h.isWalking && h.walkEndAt && now >= h.walkEndAt) {
            next.set(key, { ...h, isWalking: false, direction: 'front', walkEndAt: 0 }); changed = true;
          }
          if (h.message && now - h.messageTs > 5000) {
            next.set(key, { ...h, message: null }); changed = true;
          }
          if (!h.sinking && now - h.lastMessageTs > INACTIVE_MS) {
            next.set(key, { ...h, sinking: true, isWalking: false }); changed = true;
            // 애니메이션 완료 후 삭제
            const timer = setTimeout(() => {
              setHamsters(p => { const m = new Map(p); m.delete(key); return m; });
              sinkTimers.current.delete(key);
            }, 1400);
            sinkTimers.current.set(key, timer);
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => {
      clearInterval(t);
      sinkTimers.current.forEach(timer => clearTimeout(timer));
      emergeTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // 채팅 수신
  useEffect(() => {
    const handle = ({ sender, content, isDonation }: { sender: string; content: string; isDonation: boolean }) => {
      // {} 이모티콘 제거 후 텍스트만 남기고, 빈 메시지는 무시
      const cleaned = content.replace(/\{[^}]*\}/g, '').trim();
      if (!cleaned) return;
      // 말풍선용 25자 / 로그용 40자 제한
      const truncated = cleaned.length > 10 ? cleaned.slice(0, 10) + '…' : cleaned;
      const bubbleText = truncated.match(/.{1,5}/g)?.join('\n') ?? truncated;
      const logText = cleaned.length > 40 ? cleaned.slice(0, 40) + '…' : cleaned;
      const now = Date.now();
      setChatLog(p => [...p.slice(-99), { sender, content: logText, isDonation }]);
      setHamsters(prev => {
        const next = new Map(prev);
        const existing = next.get(sender);
        if (existing) {
          // 땅속에 있던 햄스터가 채팅 치면 다시 올라오게
          if (existing.sinking) {
            clearTimeout(sinkTimers.current.get(sender));
            sinkTimers.current.delete(sender);
          }
          next.set(sender, { ...existing, message: bubbleText, messageTs: now, lastMessageTs: now, isDonation, isWalking: false, walkEndAt: 0, direction: 'front', sinking: false, expression: isDonation ? 'wink' : 'normal' });
        } else {
          const newKey = sender;
          next.set(newKey, {
            nickname: sender, x: Math.random() * (STAGE_W - 80) + 20,
            direction: 'front', isWalking: false, walkEndAt: 0,
            message: bubbleText, messageTs: now, lastMessageTs: now,
            colorIdx: next.size % HAMSTER_COLORS.length,
            expression: isDonation ? 'wink' : 'normal',
            isDonation, sinking: false, emerging: true, joinedAt: now,
          });
          const et = setTimeout(() => {
            setHamsters(p => {
              const m = new Map(p);
              const h = m.get(newKey);
              if (h) m.set(newKey, { ...h, emerging: false });
              return m;
            });
            emergeTimers.current.delete(newKey);
          }, 600);
          emergeTimers.current.set(newKey, et);
        }
        return next;
      });
    };
    socket.on('mainChatLog', handle);
    return () => { socket.off('mainChatLog', handle); };
  }, []);

  useEffect(() => {
    if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [chatLog]);

  const hamsterList = Array.from(hamsters.values());
  const activeList = hamsterList.filter(h => !h.sinking);
  const kingNickname = activeList.length > 0
    ? activeList.reduce((a, b) => a.joinedAt < b.joinedAt ? a : b).nickname
    : null;

  return (
    <div style={{ background: 'transparent', borderRadius: '20px', border: 'none', overflow: 'hidden', padding: '20px' }}>
      <h2 style={{ color: '#ffbd2e', fontWeight: 900, margin: '0 0 16px 0', fontSize: '1.3rem' }}>🐹 찌모 채팅봇</h2>

      {/* 무대 */}
      <div style={{ position: 'relative', width: '100%', height: '360px', background: 'linear-gradient(180deg, transparent 0%, transparent 58%, #0e1a06 58%, #0e1a06 100%)', borderRadius: '15px', overflow: 'hidden', border: '1px solid transparent' }}>
        {/* 별 */}
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', width: i % 3 === 0 ? '3px' : '2px', height: i % 3 === 0 ? '3px' : '2px', background: 'white', borderRadius: '50%', left: `${(i * 43 + 7) % 100}%`, top: `${(i * 29 + 3) % 55}%`, opacity: 0.3 + (i % 4) * 0.15 }} />
        ))}

        {/* 햄스터 없을 때 */}
        {hamsterList.length === 0 && (
          <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%,-50%)', color: '#333', textAlign: 'center', fontWeight: 900 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🐹</div>
            <div style={{ fontSize: '0.9rem' }}>채팅이 오면 햄스터가 나타납니다!</div>
          </div>
        )}

        {/* 일반 햄스터 — 도네이션/왕보다 먼저, 잔디보다 먼저 렌더 */}
        {hamsterList.filter(h => h.nickname !== kingNickname && !h.isDonation).map(h => {
          const spriteRow: SpriteRow = h.sinking
            ? 'sad'
            : h.isWalking && h.direction === 'left'
              ? 'walkL'
              : h.isWalking && h.direction === 'right'
                ? 'walkR'
                : h.expression;
          return (
            <motion.div key={h.nickname}
              initial={{ x: h.x, opacity: 0, y: 40, scale: 0.6 }}
              animate={{ x: h.x, y: h.sinking ? 110 : 0, opacity: h.sinking ? 0 : 1, scale: 1 }}
              transition={{ x: { duration: 1.6, ease: 'easeInOut' }, y: { duration: 1.2, ease: 'easeIn' }, opacity: { duration: 0.4 }, scale: { duration: 0.35, ease: 'backOut' } }}
              style={{ position: 'absolute', bottom: '104px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${DISP_W}px`, transformOrigin: 'bottom center' }}>

              {/* 말풍선 */}
              <AnimatePresence>
                {h.message && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.85 }}
                    style={{ position: 'absolute', bottom: `${DISP_H + 30}px`, background: h.isDonation ? '#2a1800' : 'white', color: h.isDonation ? '#ffbd2e' : '#111', border: h.isDonation ? '1.5px solid #ffbd2e' : 'none', padding: '5px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, maxWidth: '220px', whiteSpace: 'pre-line', boxShadow: '0 3px 10px rgba(0,0,0,0.5)', zIndex: 10, lineHeight: 1.4, textAlign: 'center' }}>
                    {h.isDonation && <span style={{ marginRight: '4px' }}>💰</span>}{h.message}
                    <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `7px solid ${h.isDonation ? '#ffbd2e' : 'white'}` }} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 닉네임 — 스프라이트 위에 표시 */}
              <div style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 900, textShadow: '0 0 4px black, 0 0 8px black, 0 1px 2px black', whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', marginBottom: '4px', letterSpacing: '0.02em' }}>
                {h.nickname}
              </div>

              {/* 햄스터 스프라이트 */}
              <motion.div
                animate={{ y: h.isWalking ? [0, -3, 0, -3, 0] : 0, scale: spriteRow === 'normal' ? 0.88 : 1 }}
                transition={h.isWalking ? { duration: 0.72, repeat: Infinity } : { duration: 0.2 }}>
                <HamsterSprite colorIdx={h.colorIdx} row={spriteRow} frame={walkFrame} />
              </motion.div>
            </motion.div>
          );
        })}

        {/* 도네이션 햄스터 — 일반보다 앞, 왕관보다는 뒤 */}
        {hamsterList.filter(h => h.isDonation && h.nickname !== kingNickname).map(h => {
          const spriteRow: SpriteRow = h.sinking
            ? 'sad'
            : h.isWalking && h.direction === 'left'
              ? 'walkL'
              : h.isWalking && h.direction === 'right'
                ? 'walkR'
                : h.expression;
          return (
            <motion.div key={h.nickname}
              initial={{ x: h.x, opacity: 0, y: 40, scale: 0.6 }}
              animate={{ x: h.x, y: h.sinking ? 110 : 0, opacity: h.sinking ? 0 : 1, scale: 1 }}
              transition={{ x: { duration: 1.6, ease: 'easeInOut' }, y: { duration: 1.2, ease: 'easeIn' }, opacity: { duration: 0.4 }, scale: { duration: 0.35, ease: 'backOut' } }}
              style={{ position: 'absolute', bottom: '104px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${DISP_W}px`, transformOrigin: 'bottom center' }}>
              <AnimatePresence>
                {h.message && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.85 }}
                    style={{ position: 'absolute', bottom: `${DISP_H + 30}px`, background: '#2a1800', color: '#ffbd2e', border: '1.5px solid #ffbd2e', padding: '5px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, maxWidth: '220px', whiteSpace: 'pre-line', boxShadow: '0 3px 10px rgba(0,0,0,0.5)', zIndex: 10, lineHeight: 1.4, textAlign: 'center' }}>
                    <span style={{ marginRight: '4px' }}>💰</span>{h.message}
                    <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #ffbd2e' }} />
                  </motion.div>
                )}
              </AnimatePresence>
              <div style={{ color: '#ffbd2e', fontSize: '0.68rem', fontWeight: 900, textShadow: '0 0 4px black, 0 0 8px black, 0 1px 2px black', whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', marginBottom: '4px', letterSpacing: '0.02em' }}>
                💰 {h.nickname}
              </div>
              <motion.div
                animate={{ y: h.isWalking ? [0, -3, 0, -3, 0] : 0, scale: spriteRow === 'normal' ? 0.88 : 1 }}
                transition={h.isWalking ? { duration: 0.72, repeat: Infinity } : { duration: 0.2 }}>
                <HamsterSprite colorIdx={h.colorIdx} row={spriteRow} frame={walkFrame} />
              </motion.div>
            </motion.div>
          );
        })}

        {/* 왕관 햄스터 — 일반 햄스터보다 앞, 잔디보다는 뒤 */}
        {hamsterList.filter(h => h.nickname === kingNickname).map(h => {
          const spriteRow: SpriteRow = h.sinking
            ? 'sad'
            : h.isWalking && h.direction === 'left'
              ? 'walkL'
              : h.isWalking && h.direction === 'right'
                ? 'walkR'
                : h.expression;
          return (
            <motion.div key={h.nickname}
              initial={{ x: h.x, opacity: 0, y: 40, scale: 0.6 }}
              animate={{ x: h.x, y: h.sinking ? 110 : 0, opacity: h.sinking ? 0 : 1, scale: 1.5 }}
              transition={{ x: { duration: 1.6, ease: 'easeInOut' }, y: { duration: 1.2, ease: 'easeIn' }, opacity: { duration: 0.4 }, scale: { duration: 0.35, ease: 'backOut' } }}
              style={{ position: 'absolute', bottom: '104px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${DISP_W}px`, transformOrigin: 'bottom center' }}>
              <AnimatePresence>
                {h.message && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.85 }}
                    style={{ position: 'absolute', bottom: `${DISP_H + 30}px`, background: h.isDonation ? '#2a1800' : 'white', color: h.isDonation ? '#ffbd2e' : '#111', border: h.isDonation ? '1.5px solid #ffbd2e' : 'none', padding: '5px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, maxWidth: '220px', whiteSpace: 'pre-line', boxShadow: '0 3px 10px rgba(0,0,0,0.5)', zIndex: 10, lineHeight: 1.4, textAlign: 'center' }}>
                    {h.isDonation && <span style={{ marginRight: '4px' }}>💰</span>}{h.message}
                    <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `7px solid ${h.isDonation ? '#ffbd2e' : 'white'}` }} />
                  </motion.div>
                )}
              </AnimatePresence>
              <div style={{ color: '#ffdf00', fontSize: '0.68rem', fontWeight: 900, textShadow: '0 0 4px black, 0 0 8px black, 0 1px 2px black', whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', marginBottom: '4px', letterSpacing: '0.02em' }}>
                ⭐ {h.nickname}
              </div>
              <motion.div
                animate={{ y: h.isWalking ? [0, -3, 0, -3, 0] : 0, scale: spriteRow === 'normal' ? 0.88 : 1 }}
                transition={h.isWalking ? { duration: 0.72, repeat: Infinity } : { duration: 0.2 }}>
                <HamsterSprite colorIdx={h.colorIdx} row={spriteRow} frame={walkFrame} />
              </motion.div>
            </motion.div>
          );
        })}

        {/* 잔디 앞줄 — 굵고 짧은 풀 */}
        {Array.from({ length: 28 }, (_, i) => {
          const x = (i * 37 + 3) % 100;
          const h = 10 + (i % 5) * 4;
          const tilt = (i % 5 - 2) * 9;
          const color = ['#3d6b1a','#4a7a20','#56882a','#3a6018'][i % 4];
          return <div key={`f${i}`} style={{ position: 'absolute', bottom: '96px', left: `${x}%`, width: '5px', height: `${h}px`, background: color, borderRadius: '3px 3px 1px 1px', transform: `rotate(${tilt}deg)`, transformOrigin: 'bottom center' }} />;
        })}
        {/* 잔디 뒷줄 — 가늘고 긴 풀 */}
        {Array.from({ length: 22 }, (_, i) => {
          const x = (i * 47 + 18) % 100;
          const h = 14 + (i % 4) * 5;
          const tilt = (i % 5 - 2) * 14;
          const color = ['#2d5010','#345a14','#3a6618'][i % 3];
          return <div key={`b${i}`} style={{ position: 'absolute', bottom: '96px', left: `${x}%`, width: '3px', height: `${h}px`, background: color, borderRadius: '2px 2px 0 0', transform: `rotate(${tilt}deg)`, transformOrigin: 'bottom center' }} />;
        })}
        {/* 바닥 흙 — 부드러운 언덕 느낌 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(180deg, #2a4a10 0%, #1a3008 40%, #0e1a06 100%)' }} />
        {/* 바닥 상단 경계선 — 자연스러운 곡선 느낌 */}
        <div style={{ position: 'absolute', bottom: '96px', left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #3d6b1a 0%, #4a7a20 20%, #3a6018 40%, #56882a 60%, #4a7a20 80%, #3d6b1a 100%)', borderRadius: '3px 3px 0 0' }} />
      </div>

      {/* 채팅 로그 */}
      <div ref={chatLogRef} style={{ marginTop: '14px', background: '#0a0a0a', borderRadius: '10px', padding: '12px 14px', maxHeight: '160px', overflowY: 'auto', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {chatLog.length === 0
          ? <div style={{ color: '#333', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', padding: '10px 0' }}>채팅 로그가 여기에 표시됩니다</div>
          : chatLog.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', padding: '3px 0', borderBottom: '1px solid #111' }}>
              {c.isDonation && <span style={{ color: '#ffbd2e', fontSize: '0.7rem' }}>💰</span>}
              <span style={{ color: '#00ffa3', fontWeight: 900, flexShrink: 0 }}>{c.sender}</span>
              <span style={{ color: '#777' }}>:</span>
              <span style={{ color: c.isDonation ? '#ffbd2e' : '#bbb', flex: 1, wordBreak: 'break-all' }}>{c.content}</span>
            </div>
          ))
        }
      </div>

      {/* 햄스터 수 카운트 */}
      <div style={{ marginTop: '10px', color: '#444', fontSize: '0.75rem', fontWeight: 700, textAlign: 'right' }}>
        🐹 현재 {hamsterList.length}마리 활동 중
      </div>
    </div>
  );
};

const RouletteGame: React.FC<{ user: UserAuth }> = ({ user }) => {
  const STORAGE_KEY = `roulette_items_${user.name}`;
  const [items, setItems] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : ['치킨', '피자', '꽝', '별풍선', '애교', '랜덤박스', '벌칙'];
  });
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const [arrowWiggle, setArrowWiggle] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const lastTickCount = useRef(0);
  const tensionRef = useRef(0);
  const colors = ['#ff2eb4', '#00ffa3', '#2e96ff', '#ff8e2e', '#b42eff', '#ff4b4b', '#ffff00'];

  // 항목 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, STORAGE_KEY]);

  useEffect(() => {
    const handleAdd = (content: string) => { if (!isSpinning && content) { setItems(prev => [...prev, content]); } };
    socket.on('addRouletteItem', handleAdd);
    return () => { socket.off('addRouletteItem', handleAdd); };
  }, [isSpinning]);

  const connectChat = () => {
    if (!user.chnnelid) return alert('채널 ID가 설정되지 않은 계정입니다.');
    fetch(`${SOCKET_URL}/connect-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member: user.name, channelId: user.chnnelid })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        setIsConnected(true);
        alert(`${user.name} 채널 채팅 연결 성공! (도네이션 시 룰렛 자동 추가 활성화)`);
      } else {
        alert('연결 실패: ' + data.error);
      }
    });
  };

  const spinRoulette = () => {
    if (isSpinning || items.length === 0) return;
    setIsSpinning(true); setWinner(null);
    const spinCount = 10 + Math.random() * 5;
    const extraAngle = Math.random() * 360;
    const baseRotation = rotation;
    const finalTarget = rotation + spinCount * 360 + extraAngle;
    let startTime = Date.now();
    const duration = 8500;
    const step = 360 / items.length;
    lastTickCount.current = Math.floor((baseRotation + 0.5) / step);
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 5);
      const currentRotation = baseRotation + (finalTarget - baseRotation) * easeOut;
      setRotation(currentRotation);
      const currentTickCount = Math.floor((currentRotation + 0.5) / step);
      if (currentTickCount > lastTickCount.current) {
        tensionRef.current = Math.min(50, tensionRef.current + 38);
        lastTickCount.current = currentTickCount;
      }
      tensionRef.current *= 0.85;
      if (tensionRef.current < 0.1) tensionRef.current = 0;
      setArrowWiggle(-tensionRef.current);
      if (progress < 1) requestAnimationFrame(animate);
      else {
        setTimeout(() => {
          const finalAngle = currentRotation % 360;
          const index = Math.floor((360 - finalAngle) / step) % items.length;
          setWinner(items[index]); setIsSpinning(false);
        }, 500);
      }
    };
    requestAnimationFrame(animate);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {user.role === 'guest' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <button onClick={connectChat} disabled={isConnected} style={{
            cursor: isConnected ? 'default' : 'pointer',
            background: isConnected ? '#111' : '#ffbd2e22',
            color: isConnected ? '#00ffa3' : '#ffbd2e',
            border: `1px solid ${isConnected ? '#00ffa3' : '#ffbd2e'}`,
            padding: '12px 30px',
            borderRadius: '15px',
            fontWeight: 900,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {isConnected ? '✅ 채팅 연결됨' : '+ 내 채널 채팅 연결 (도네이션 연동)'}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', padding: '10px 30px 30px 30px' }}>
        <div style={{ position: 'relative', width: '560px', height: '560px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: rotation }} transition={{ duration: 0 }} style={{ width: '510px', height: '510px', position: 'relative' }}>
          <svg viewBox="-45 -45 590 590" style={{ width: '590px', height: '590px', position: 'absolute', top: '-40px', left: '-40px', overflow: 'visible' }}>
            <g id="pie-layer">{items.map((_it, i) => { const st = 360 / items.length; const a = i * st; const sR = (a - 90) * Math.PI / 180; const eR = (a + st - 90) * Math.PI / 180; return <path key={i} d={`M 250 250 L ${250 + 250 * Math.cos(sR)} ${250 + 250 * Math.sin(sR)} A 250 250 0 0 1 ${250 + 250 * Math.cos(eR)} ${250 + 250 * Math.sin(eR)} Z`} fill={colors[i % colors.length]} stroke="#000" strokeWidth="1" strokeOpacity="0.1" />; })}</g>
            <g id="labels-layer">{items.map((it, i) => { const st = 360 / items.length; const a = (i * st) + st / 2; return <text key={i} x={250 + 175 * Math.cos((a - 90) * Math.PI / 180)} y={255 + 175 * Math.sin((a - 90) * Math.PI / 180)} fill="white" fontSize="18" fontWeight="900" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${a}, ${250 + 175 * Math.cos((a - 90) * Math.PI / 180)}, ${255 + 175 * Math.sin((a - 90) * Math.PI / 180)})`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{it}</text>; })}</g>
            <g id="pins-layer">{items.map((_, i) => { const st = 360 / items.length; const r = ((i + 1) * st - 90) * Math.PI / 180; return <g key={i}><circle cx={250 + 248 * Math.cos(r)} cy={250 + 248 * Math.sin(r)} r="10" fill="#fff" filter="url(#p-shad-l)" /><circle cx={250 + 248 * Math.cos(r)} cy={250 + 248 * Math.sin(r)} r="6" fill="#ddd" /></g>; })}</g>
            <defs><filter id="p-shad-l"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.8" /></filter></defs>
          </svg>
        </motion.div>
        <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none' }}>
          <motion.svg animate={{ rotate: arrowWiggle }} transition={{ duration: 0 }} width="20" height="70" viewBox="0 0 20 70" style={{ overflow: 'visible', filter: 'drop-shadow(0 0 10px #ff2eb4)' }}>
            <path d="M 10 70 L 4 35 L 10 0 L 16 35 Z" fill="#ff2eb4" stroke="white" strokeWidth="1" />
            <circle cx="10" cy="35" r="2.5" fill="white" />
          </motion.svg>
        </div>
      </div>
      <div style={{ width: '380px', background: '#050505', border: '1px solid #111', padding: '30px', borderRadius: '25px', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#ff2eb4', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}><Settings2 /> SETTINGS</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}><input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyPress={e => e.key === 'Enter' && (setItems([...items, newItem]), setNewItem(''))} placeholder="Entry Item" style={{ flex: 1, background: '#000', border: '1px solid #222', color: 'white', padding: '12px', borderRadius: '10px' }} /><button onClick={() => { if (newItem) setItems([...items, newItem]); setNewItem(''); }} style={{ cursor: 'pointer', background: '#ff2eb4', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 900 }}>ADD</button></div>
        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>{items.map((it, idx) => (<div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#111', borderRadius: '8px', marginBottom: '8px', borderLeft: `4px solid ${colors[idx % colors.length]}` }}><span>{it}</span><Trash2 size={16} color="#444" style={{ cursor: 'pointer' }} onClick={() => setItems(items.filter((_, i) => i !== idx))} /></div>))}</div>
        <button onClick={spinRoulette} disabled={isSpinning} style={{ cursor: 'pointer', width: '100%', background: isSpinning ? '#222' : 'linear-gradient(45deg, #ff2eb4, #2e96ff)', padding: '18px', borderRadius: '15px', color: 'white', fontWeight: 900, border: 'none' }}>SPIN ROULETTE</button>
      </div>
      <AnimatePresence>{winner && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}><motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} style={{ background: '#050505', padding: '60px 100px', borderRadius: '40px', border: '5px solid #ff2eb4', textAlign: 'center', boxShadow: '0 0 100px rgba(255, 46, 180, 0.6)' }}><PartyPopper size={80} color="#ff2eb4" style={{ marginBottom: '25px' }} /><div style={{ color: 'white', fontSize: '4.8rem', fontWeight: 900, textShadow: '0 0 40px #ff2eb4' }}>{winner}</div><button onClick={() => setWinner(null)} style={{ cursor: 'pointer', marginTop: '40px', background: 'white', color: 'black', padding: '15px 70px', borderRadius: '15px', fontWeight: 900 }}>CLOSE</button></motion.div></motion.div>)}</AnimatePresence>
    </div>
    </div>
  );
};

export default App;
