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

  // URL 매개변수 확인 (?noBg=true)
  const params = new URLSearchParams(window.location.search);
  const noBg = params.get('noBg') === 'true';

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
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: noBg ? '#050505' : 'url(/login-bg.png) center bottom / 100% 100% no-repeat',
      color: 'white',
      position: 'relative'
    }}>
      {!noBg && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />}
      <form onSubmit={handleLogin} style={{ position: 'relative', zIndex: 1, background: 'rgba(10,10,10,0.85)', padding: '40px', borderRadius: '20px', width: '350px', border: '1px solid #333', boxShadow: '0 10px 40px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: '20px', backdropFilter: 'blur(6px)' }}>
        <h2 style={{ textAlign: 'center', color: '#00ffa3', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}><Lock /> 시스템 로그인</h2>
        <input placeholder="아이디" value={id} onChange={e => setId(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', outline: 'none' }} />
        <input type="password" placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', outline: 'none' }} />
        <button type="submit" style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#00ffa3', color: 'black', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', marginTop: '10px' }}>접속하기</button>
      </form>
    </div>
  );
};

const AppMain: React.FC = () => {
  const [user, setUser] = useState<UserAuth | null>(() => {
    try {
      const saved = localStorage.getItem('userSession');
      if (saved) return JSON.parse(saved) as UserAuth;
    } catch { }
    return null;
  });
  const [view, setView] = useState<'dashboard' | 'ladder' | 'roulette' | 'group' | 'sentiment' | 'chatbot' | 'pinball' | 'rating' | 'pok_roulette' | 'feedback'>('dashboard');
  const [missions, setMissions] = useState<any[]>([]);
  const [isDonationOnly, setIsDonationOnly] = useState(true);
  const [isMissionDonationOnly, setIsMissionDonationOnly] = useState(false);
  const [isCheeseEnabled, setIsCheeseEnabled] = useState(false);
  const [isAutoAccept, setIsAutoAccept] = useState(false);

  useEffect(() => {
    fetch(`${SOCKET_URL}/missions`).then(res => res.json()).then(data => setMissions(data));
    fetch(`${SOCKET_URL}/donation-only`).then(res => res.json()).then(data => setIsDonationOnly(data.enabled));
    fetch(`${SOCKET_URL}/mission-donation-only`).then(res => res.json()).then(data => setIsMissionDonationOnly(data.enabled));
    fetch(`${SOCKET_URL}/cheese-enabled`).then(res => res.json()).then(data => setIsCheeseEnabled(data.enabled));
    fetch(`${SOCKET_URL}/auto-accept`).then(res => res.json()).then(data => setIsAutoAccept(data.enabled));

    const handleNew = (m: any) => setMissions(p => [...p, m]);
    const handleUpdate = (m: any) => setMissions(p => p.map(o => String(o.id) === String(m.id) ? m : o));
    const handleDel = (id: string) => {
      console.log('Socket deleting ID:', id);
      setMissions(p => p.filter(m => String(m.id) !== String(id)));
    };
    const handleDonationOnlyUpdate = (enabled: boolean) => setIsDonationOnly(enabled);
    const handleMissionDonationOnlyUpdate = (enabled: boolean) => setIsMissionDonationOnly(enabled);
    const handleCheeseEnabledUpdate = (enabled: boolean) => setIsCheeseEnabled(enabled);
    const handleAutoAcceptUpdate = (enabled: boolean) => setIsAutoAccept(enabled);

    socket.on('newMission', handleNew);
    socket.on('updateMission', handleUpdate);
    socket.on('missionDeleted', handleDel);
    socket.on('donationOnlyUpdate', handleDonationOnlyUpdate);
    socket.on('missionDonationOnlyUpdate', handleMissionDonationOnlyUpdate);
    socket.on('cheeseEnabledUpdate', handleCheeseEnabledUpdate);
    socket.on('autoAcceptUpdate', handleAutoAcceptUpdate);

    return () => {
      socket.off('newMission', handleNew);
      socket.off('updateMission', handleUpdate);
      socket.off('missionDeleted', handleDel);
      socket.off('donationOnlyUpdate', handleDonationOnlyUpdate);
      socket.off('missionDonationOnlyUpdate', handleMissionDonationOnlyUpdate);
      socket.off('cheeseEnabledUpdate', handleCheeseEnabledUpdate);
      socket.off('autoAcceptUpdate', handleAutoAcceptUpdate);
    };
  }, [SOCKET_URL]);

  const toggleCheeseEnabled = () => {
    const nextVal = !isCheeseEnabled;
    setIsCheeseEnabled(nextVal);
    fetch(`${SOCKET_URL}/cheese-enabled`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: nextVal }) });
  };
  const testCheese = () => {
    fetch(`${SOCKET_URL}/test-cheese`, { method: 'POST' });
  };

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
    setIsMissionDonationOnly(nextVal);
    fetch(`${SOCKET_URL}/mission-donation-only`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: nextVal })
    });
  };
  const toggleAutoAccept = () => {
    const nextVal = !isAutoAccept;
    setIsAutoAccept(nextVal);
    fetch(`${SOCKET_URL}/auto-accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: nextVal }) });
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

  const testChat = (content: string) => {
    console.log("[Test] Simulating Chat Message:", content);
    fetch(`${SOCKET_URL}/test-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator: '채팅테스터', content })
    }).catch(err => console.error("Test chat error:", err));
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
    return <LoginPage onSuccess={(u) => { localStorage.setItem('userSession', JSON.stringify(u)); setUser(u); }} />;
  }

  // 1. 멤버가 로그인하면 로가다 탭으로 화면 고정 (사다리/룰렛은 허용)
  if (user.role === 'member' && view !== 'group' && view !== 'ladder' && view !== 'roulette' && view !== 'rating' && view !== 'pok_roulette' && view !== 'feedback') {
    setView('group');
  }
  // 2. 게스트가 로그인하면 룰렛 탭으로 화면 고정 (사다리 허용)
  if (user.role === 'guest' && view !== 'roulette' && view !== 'ladder' && view !== 'pok_roulette') {
    setView('roulette');
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#050505', padding: '15px', paddingTop: '80px', color: 'white', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1.5px solid #111', paddingBottom: '15px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#050505', padding: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={24} color={user.name === '폭병' ? '#ff2eb4' : '#00ffa3'} fill={user.name === '폭병' ? '#ff2eb433' : '#00ffa333'} />
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: user.name === '폭병' ? '#ff2eb4' : '#00ffa3', letterSpacing: '-1px' }}>
            {user.name !== '폭병' && '찌모의 놀이터 '}
            <span style={{ fontSize: '0.8rem', color: '#888' }}>({user.name})</span>
          </h1>
        </div>

        {user.role === 'member' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setView('group')} style={{ background: view === 'group' ? '#222' : 'transparent', color: view === 'group' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'group' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>로가다</button>
            <button onClick={() => setView('rating')} style={{ background: view === 'rating' ? '#222' : 'transparent', color: view === 'rating' ? '#a78bfa' : '#666', border: '1px solid', borderColor: view === 'rating' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>🏆 레이팅보드</button>
            <button onClick={() => setView('ladder')} style={{ background: view === 'ladder' ? '#222' : 'transparent', color: view === 'ladder' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'ladder' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>사다리타기</button>
            <button onClick={() => setView('roulette')} style={{ background: view === 'roulette' ? '#222' : 'transparent', color: view === 'roulette' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'roulette' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>룰렛돌리기</button>
            <button onClick={() => setView('feedback')} style={{ background: view === 'feedback' ? '#222' : 'transparent', color: view === 'feedback' ? '#ff6a00' : '#666', border: '1px solid', borderColor: view === 'feedback' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>💡 피드백&건의</button>
            {user.name === '폭병' && (
              <button onClick={() => setView('pok_roulette')} style={{ background: view === 'pok_roulette' ? '#222' : 'transparent', color: view === 'pok_roulette' ? '#ff2eb4' : '#666', border: '1px solid', borderColor: view === 'pok_roulette' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>폭병특수룰렛</button>
            )}
          </div>
        )}

        {user.role === 'guest' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setView('ladder')} style={{ background: view === 'ladder' ? '#222' : 'transparent', color: view === 'ladder' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'ladder' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>사다리타기</button>
            <button onClick={() => setView('roulette')} style={{ background: view === 'roulette' ? '#222' : 'transparent', color: view === 'roulette' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'roulette' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>룰렛돌리기</button>
            {user.name === '폭병' && (
              <button onClick={() => setView('pok_roulette')} style={{ background: view === 'pok_roulette' ? '#222' : 'transparent', color: view === 'pok_roulette' ? '#ff2eb4' : '#666', border: '1px solid', borderColor: view === 'pok_roulette' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>폭병특수룰렛</button>
            )}
          </div>
        )}

        {user.role !== 'member' && user.role !== 'guest' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setView('dashboard')} style={{ background: view === 'dashboard' ? '#222' : 'transparent', color: view === 'dashboard' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'dashboard' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>메인대시보드</button>
            <button onClick={() => setView('group')} style={{ background: view === 'group' ? '#222' : 'transparent', color: view === 'group' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'group' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>로가다</button>
            <button onClick={() => setView('sentiment')} style={{ background: view === 'sentiment' ? '#222' : 'transparent', color: view === 'sentiment' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'sentiment' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>민심판독기</button>
            <div style={{ width: '1px', background: '#333', margin: '0 5px' }}></div>
            <button onClick={() => setView('ladder')} style={{ background: view === 'ladder' ? '#222' : 'transparent', color: view === 'ladder' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'ladder' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>사다리타기</button>
            <button onClick={() => setView('roulette')} style={{ background: view === 'roulette' ? '#222' : 'transparent', color: view === 'roulette' ? '#00ffa3' : '#666', border: '1px solid', borderColor: view === 'roulette' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>룰렛돌리기</button>
            {(user.name === '폭병' || user.role === 'admin') && (
              <button onClick={() => setView('pok_roulette')} style={{ background: view === 'pok_roulette' ? '#222' : 'transparent', color: view === 'pok_roulette' ? '#ff2eb4' : '#666', border: '1px solid', borderColor: view === 'pok_roulette' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>폭병특수룰렛</button>
            )}
            <button onClick={() => setView('rating')} style={{ background: view === 'rating' ? '#222' : 'transparent', color: view === 'rating' ? '#a78bfa' : '#666', border: '1px solid', borderColor: view === 'rating' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>🏆 레이팅보드</button>
            <button onClick={() => setView('feedback')} style={{ background: view === 'feedback' ? '#222' : 'transparent', color: view === 'feedback' ? '#ff6a00' : '#666', border: '1px solid', borderColor: view === 'feedback' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>💡 피드백&건의</button>
            <button onClick={() => setView('chatbot')} style={{ background: view === 'chatbot' ? '#222' : 'transparent', color: view === 'chatbot' ? '#ffbd2e' : '#666', border: '1px solid', borderColor: view === 'chatbot' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>🐹 찌모채팅봇</button>
            <button onClick={() => setView('pinball')} style={{ background: view === 'pinball' ? '#222' : 'transparent', color: view === 'pinball' ? '#ff6b6b' : '#666', border: '1px solid', borderColor: view === 'pinball' ? '#333' : 'transparent', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 900 }}>🎯 핀볼</button>
          </div>
        )}

        <button onClick={() => { localStorage.removeItem('userSession'); setUser(null); }} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '6px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>로그아웃</button>

        {user.role === 'admin' && (
          <div style={{ display: 'flex', gap: '8px', background: '#111', padding: '8px 12px', borderRadius: '12px', border: '1px solid #333', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center' }}>[Test Panel]</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#ffbd2e', fontWeight: 900, cursor: 'pointer', borderRight: '1px solid #333', paddingRight: '10px', marginRight: '5px' }}>
              <input type="checkbox" checked={isDonationOnly} onChange={toggleDonationOnly} style={{ cursor: 'pointer' }} />
              도네 전용
            </label>
            <button onClick={() => {
              if (user.role === 'admin') {
                const val = prompt('테스트할 채팅 내용을 입력하세요 (예: !미션 물마시기)');
                if (val) testChat(val);
              } else {
                addTestMission('테스트 미션입니다');
              }
            }} style={{ background: '#222', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>+ 미션 추가</button>
            <button onClick={() => {
              if (user.role === 'admin') {
                const val = prompt('테스트할 사다리/룰렛 벌칙 채팅을 입력하세요 (예: !미션 의리사다리 벌칙!)');
                if (val) testChat(val);
              } else {
                addTestMission('의리사다리 벌칙!');
              }
            }} style={{ background: '#222', border: 'none', color: '#00d1ff', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>+ 사다리/룰렛 벌칙</button>
            <button onClick={() => {
              if (user.role === 'admin') {
                const val = prompt('테스트할 후원 채팅을 입력하세요 (예: !룰렛추가 초코우유)');
                if (val) addTestDonation(val);
              } else {
                addTestDonation('!룰렛추가 10스쿼트');
              }
            }} style={{ background: '#222', border: 'none', color: '#ffbd2e', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>+ 도네(룰렛옵션)</button>
            <button onClick={() => fetch(`${SOCKET_URL}/test-sentiment`, { method: 'POST' })} style={{ background: '#222', border: 'none', color: '#ff4b4b', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>+ 채팅(민심조작)</button>
            <div style={{ width: '1px', background: '#333', margin: '0 4px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: isCheeseEnabled ? '#f5c542' : '#555', fontWeight: 900, cursor: 'pointer' }}>
              <input type="checkbox" checked={isCheeseEnabled} onChange={toggleCheeseEnabled} style={{ cursor: 'pointer' }} />
              🧀 치즈
            </label>
            <button onClick={testCheese} disabled={!isCheeseEnabled} style={{ background: isCheeseEnabled ? '#2a2000' : '#1a1a1a', border: `1px solid ${isCheeseEnabled ? '#f5c542' : '#333'}`, color: isCheeseEnabled ? '#f5c542' : '#444', cursor: isCheeseEnabled ? 'pointer' : 'not-allowed', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s' }}>🧀 테스트</button>
          </div>
        )}
      </header>

      {view === 'rating' && (
        <div style={{ position: 'fixed', top: '150px', left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'space-between' }}>
          {/* 왼쪽 사이드바: 18vw로 축축소하여 중앙 가독성 극대화 */}
          <div style={{ width: '18vw', height: '100%', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(/rating.png)',
              backgroundSize: '556% 100%', /* 1327 / (331-offset) */
              backgroundPosition: 'left -38.5% center'
            }} />
            {MEMBER_IMAGES[user.name] && (
              <img src={`/${MEMBER_IMAGES[user.name]}`} alt={user.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />
            )}
          </div>

          {/* 오른쪽 사이드바: 28vw로 축소화하여 중앙 가독성 극대화 */}
          <div style={{ width: '28vw', height: '100%', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(/rating.png)',
              backgroundSize: '350% 100%', /* 1327 / 513 scaled down */
              backgroundPosition: 'right -14.5% center'
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 33.33%)',
              gridTemplateRows: 'repeat(2, 50%)',
              height: '100%',
              width: '100%'
            }}>
              {['1.png', '2.png', '3.png', '4.png', '5.png', '6.png'].map((name, idx) => (
                <img
                  key={name}
                  src={`/${name}`}
                  alt={`member-${idx}`}
                  style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', minHeight: 0 }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {view === 'group' && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, width: '32vw', height: '100vh', zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(/login-bg.png)', backgroundSize: '200% 100%', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat', maskImage: 'linear-gradient(to bottom, transparent 150px, black 150px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 150px, black 150px)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, width: '32vw', height: '100vh', zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(/login-bg.png)', backgroundSize: '200% 100%', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat', maskImage: 'linear-gradient(to bottom, transparent 150px, black 150px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 150px, black 150px)' }} />
        </>
      )}

      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {view === 'dashboard' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(user.role === 'admin' || user.role === 'host') && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '10px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: isAutoAccept ? '#00ffa322' : '#222',
                    padding: '10px 20px',
                    borderRadius: '15px',
                    border: `1px solid ${isAutoAccept ? '#00ffa3' : '#333'}`,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 900,
                    color: isAutoAccept ? '#00ffa3' : '#888',
                    transition: 'all 0.2s'
                  }}>
                    <input type="checkbox" checked={isAutoAccept} onChange={toggleAutoAccept} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                    {isAutoAccept ? '⚡️ 미션 자동 수락 모드 ON' : '⏸️ 미션 수동 수락 모드'}
                  </label>
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
            <GroupMissionBoard key="grp-board-last" missions={missions} onUpdate={updateStatus} onDelete={deleteMission} user={user!} isAutoAccept={isAutoAccept} onToggleAutoAccept={toggleAutoAccept} isMissionDonationOnly={isMissionDonationOnly} onToggleMissionDonationOnly={toggleMissionDonationOnly} />
          ) : view === 'sentiment' ? (
            <SentimentTracker key="senti-comp-last" />
          ) : view === 'chatbot' ? (
            <HamsterChatBot key="chatbot-comp-last" />
          ) : view === 'pinball' ? (
            <PinballGame key="pinball-comp-last" />
          ) : view === 'rating' ? (
            <RatingBoard key="rating-comp-last" user={user!} />
          ) : view === 'pok_roulette' ? (
            <RouletteGame key="pok-roul-comp-last" user={user!} isPokMode={true} />
          ) : view === 'feedback' ? (
            <FeedbackBoard user={user!} />
          ) : (
            <RouletteGame key="roul-comp-last" user={user!} />
          )}
        </div>
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

const highlightMissionText = (text: string, baseColor: string) => {
  const regex = /((?:\d+[\d,.]*|[일이삼사오육칠팔구십백천만억조]+)\s*[만억조]?\s*(?:만골|골드|원|치즈))/g;
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <span key={i} style={{ color: '#ffbd2e', fontWeight: 900, textShadow: '0 0 8px rgba(255,189,46,0.6)' }}>{part}</span>
      : <span key={i} style={{ color: baseColor }}>{part}</span>
  );
};

const MissionCard: React.FC<{ mission: any, count?: number, onUpdate: (id: string, s: string) => void, onDelete: (id: string) => void, onGoLadder: () => void, isBlind?: boolean, canUseLadder?: boolean, canInteract?: boolean }> = ({ mission, count = 1, onUpdate, onDelete, onGoLadder, isBlind = false, canUseLadder = true, canInteract = true }) => {
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
          <span style={{ fontWeight: 900, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{highlightMissionText(contentFixed, isLadder ? '#ffbd2e' : 'white')}</span>
          <span style={{ fontSize: '0.72rem', color: isLadder ? '#ffbd2e88' : '#00ffa388', fontWeight: 600 }}>@{mission.creator}{count > 1 ? ` 외 ${count - 1}명` : ''}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '10px', minWidth: mission.status === 'accepted' && isLadder ? '230px' : '150px', justifyContent: 'flex-end' }}>
        {mission.status === 'pending' ? (<><button onClick={() => canInteract && triggerAction('accepted')} style={{ cursor: canInteract ? 'pointer' : 'not-allowed', background: canInteract ? '#00ffa3' : '#1a1a1a', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: canInteract ? 'black' : '#444', fontSize: '0.8rem', opacity: canInteract ? 1 : 0.4 }}>수락</button><button onClick={() => canInteract && triggerAction('rejected')} style={{ cursor: canInteract ? 'pointer' : 'not-allowed', background: '#222', border: `1px solid ${canInteract ? '#ff4b4b' : '#333'}`, padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: canInteract ? '#ff4b4b' : '#444', fontSize: '0.8rem', opacity: canInteract ? 1 : 0.4 }}>거절</button></>) :
          (<>{isLadder && <button onClick={() => { if (canUseLadder && canInteract) { onGoLadder(); setTimeout(() => onDelete(mission.id), 100); } }} style={{ cursor: canUseLadder && canInteract ? 'pointer' : 'not-allowed', background: canUseLadder && canInteract ? '#ffbd2e' : '#2a2a2a', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: canUseLadder && canInteract ? 'black' : '#555', fontSize: '0.8rem', display: 'flex', gap: '5px', opacity: canUseLadder && canInteract ? 1 : 0.5 }}>사다리 <Sparkles size={14} /></button>}<button onClick={() => canInteract && triggerAction('success')} style={{ cursor: canInteract ? 'pointer' : 'not-allowed', background: canInteract ? 'white' : '#1a1a1a', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: canInteract ? 'black' : '#444', fontSize: '0.8rem', opacity: canInteract ? 1 : 0.4 }}>성공</button><button onClick={() => canInteract && triggerAction('failure')} style={{ cursor: canInteract ? 'pointer' : 'not-allowed', background: canInteract ? '#ff4b4b' : '#1a1a1a', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 900, color: canInteract ? 'white' : '#444', fontSize: '0.8rem', opacity: canInteract ? 1 : 0.4 }}>실패</button></>)}
      </div>
    </motion.div>
  );
};

const AllResultsModal: React.FC<{ results: { name: string, result: string, color: string }[], totalAmount: string, onClose: () => void }> = ({ results, totalAmount, onClose }) => {
  const sorted = [...results].sort((a, b) => Number(a.result) - Number(b.result));
  const total = Number(totalAmount) || 0;
  const [payments, setPayments] = useState<string[]>(sorted.map(() => ''));
  const paid = payments.reduce((s, v) => s + (Number(v) || 0), 0);
  const remaining = total - paid;
  const setPayment = (i: number, val: string) => {
    const num = Number(val) || 0;
    const otherPaid = payments.reduce((s, v, idx) => idx === i ? s : s + (Number(v) || 0), 0);
    if (num > 0 && otherPaid + num > total) return;
    const n = [...payments]; n[i] = val; setPayments(n);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} style={{ background: '#050505', padding: '42px 56px', borderRadius: '30px', border: '6px solid #00ffa3', textAlign: 'center', boxShadow: '0 0 70px rgba(0,255,163,0.3)', minWidth: '476px', maxWidth: '90vw' }}>
        <PartyPopper size={56} color="#00ffa3" style={{ marginBottom: '17px' }} />
        <div style={{ fontSize: '1.7rem', color: '#00ffa3', fontWeight: 900, marginBottom: '11px' }}>⚡ 동시 진행 결과</div>
        {total > 0 && (
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '2.1rem', color: '#ffbd2e', fontWeight: 900 }}>{total.toLocaleString()}</div>
            <div style={{ fontSize: '1.2rem', color: remaining <= 0 ? '#ff4d4d' : '#888', marginTop: '6px', fontWeight: 700 }}>
              남은 금액: {remaining.toLocaleString()}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sorted.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '17px', background: '#111', borderRadius: '11px', padding: '14px 22px', border: `3px solid ${r.color}44` }}>
              <span style={{ color: r.color, fontWeight: 900, fontSize: '1.55rem', minWidth: '34px', textAlign: 'center' }}>{r.result}</span>
              <span style={{ color: 'white', fontWeight: 900, fontSize: '1.4rem', flex: 1, textAlign: 'left' }}>{r.name}</span>
              {total > 0 && (
                <input
                  type="text"
                  value={payments[i]}
                  disabled={remaining <= 0 && !payments[i]}
                  onChange={e => setPayment(i, e.target.value)}
                  placeholder=""
                  style={{ width: '126px', background: '#000', border: `2px solid ${r.color}66`, color: r.color, borderRadius: '7px', padding: '7px 11px', textAlign: 'center', fontWeight: 900, fontSize: '1.2rem', opacity: remaining <= 0 && !payments[i] ? 0.4 : 1 }}
                />
              )}
            </div>
          ))}
        </div>
        <button style={{ cursor: 'pointer', marginTop: '35px', background: '#00ffa3', color: '#000', border: 'none', padding: '17px 56px', borderRadius: '11px', fontWeight: 900, fontSize: '1rem' }} onClick={onClose}>확인 완료</button>
      </motion.div>
    </motion.div>
  );
};

// LadderGame, GroupMissionBoard, RouletteGame 컴포넌트는 동일하므로 생략하지 않고 최종 품질 유지
const LadderGame: React.FC = () => {
  const [count, setCount] = useState(4);
  const [starts, setStarts] = useState<string[]>(Array(12).fill(''));
  const [ends, setEnds] = useState<string[]>(Array(12).fill(''));
  const [bridges, setBridges] = useState<{ row: number, col: number }[]>([]);
  const [activePaths, setActivePaths] = useState<{ id: number, points: { x: number, y: number }[], color: string }[]>([]);
  const [isBlind, setIsBlind] = useState(true);
  const [isUiri, setIsUiri] = useState(false);
  const [uiriAmount, setUiriAmount] = useState('');
  const [showResult, setShowResult] = useState<{ name: string, result: string } | null>(null);
  const [showAllResults, setShowAllResults] = useState<{ name: string, result: string, color: string }[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const WIDTH = 1200; const HEIGHT = 960; const ROW_COUNT = 30;
  const PATH_COLORS = ['#ff4d4d', '#4d9fff', '#00ffa3', '#ff9f4d', '#c44dff', '#ffee4d', '#ff4dab', '#4dffd6', '#ff6b4d', '#4dffb8', '#a04dff', '#ffbd2e'];
  const generateBridges = () => { const newBridges: { row: number, col: number }[] = []; for (let r = 2; r < ROW_COUNT - 2; r++) { for (let c = 0; c < count - 1; c++) { if (Math.random() > 0.72) { if (!newBridges.some(b => b.row === r && (b.col === c - 1 || b.col === c + 1))) { newBridges.push({ row: r, col: c }); } } } } setBridges(newBridges); setActivePaths([]); setShowResult(null); setShowAllResults(null); };
  useEffect(() => generateBridges(), [count]);
  useEffect(() => {
    if (isUiri) {
      const n = [...ends];
      for (let i = 0; i < count; i++) n[i] = `${i + 1}`;
      setEnds(n);
    }
  }, [isUiri, count]);
  const calcPath = (startIdx: number, bridgesSnap: { row: number, col: number }[]) => { let currCol = startIdx; const pts = [{ x: startIdx, y: 0 }]; for (let r = 1; r < ROW_COUNT; r++) { const bR = bridgesSnap.find(b => b.row === r && b.col === currCol); const bL = bridgesSnap.find(b => b.row === r && b.col === currCol - 1); if (bR) { pts.push({ x: currCol, y: r }); currCol++; pts.push({ x: currCol, y: r }); } else if (bL) { pts.push({ x: currCol, y: r }); currCol--; pts.push({ x: currCol, y: r }); } } pts.push({ x: currCol, y: ROW_COUNT }); return { sPts: pts.map(p => ({ x: (p.x / (count - 1)) * WIDTH, y: (p.y / ROW_COUNT) * HEIGHT })), endCol: currCol }; };
  const runPath = (startIdx: number, color?: string) => { if (activePaths.some(p => p.id === startIdx)) return; const pathColor = color || PATH_COLORS[startIdx % PATH_COLORS.length]; const { sPts, endCol } = calcPath(startIdx, bridges); setActivePaths(prev => [...prev, { id: startIdx, points: sPts, color: pathColor }]); let startTime: number | null = null; const animate = (ts: number) => { if (!startTime) startTime = ts; const progress = Math.min((ts - startTime) / 3500, 1); if (scrollRef.current) scrollRef.current.scrollTop = progress * HEIGHT - 200; if (progress < 1) requestAnimationFrame(animate); else { setShowResult({ name: starts[startIdx] || `${startIdx + 1}번`, result: ends[endCol] || `${endCol + 1}번 결과` }); } }; requestAnimationFrame(animate); };
  const runAll = () => { if (isRunning) return; setIsRunning(true); setActivePaths([]); setShowResult(null); setShowAllResults(null); const results: { name: string, result: string, color: string }[] = []; const newPaths = Array.from({ length: count }).map((_, i) => { const color = PATH_COLORS[i % PATH_COLORS.length]; const { sPts, endCol } = calcPath(i, bridges); results.push({ name: starts[i] || `${i + 1}번`, result: ends[endCol] || `${endCol + 1}번 결과`, color }); return { id: i, points: sPts, color }; }); setActivePaths(newPaths); let startTime: number | null = null; const animate = (ts: number) => { if (!startTime) startTime = ts; const progress = Math.min((ts - startTime) / 3500, 1); if (scrollRef.current) scrollRef.current.scrollTop = progress * HEIGHT - 200; if (progress < 1) requestAnimationFrame(animate); else { setShowAllResults(results); setIsRunning(false); } }; requestAnimationFrame(animate); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px 20px', borderRadius: '15px', marginBottom: '15px', border: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={18} color="#ffbd2e" /><span style={{ fontWeight: 900, color: '#ffbd2e' }}>인원수</span> <input type="number" value={count} min={2} max={12} onChange={e => setCount(Number(e.target.value))} style={{ width: '50px', background: '#000', border: '1px solid #333', color: 'white', borderRadius: '5px', padding: '5px', textAlign: 'center' }} /></div>
          <button onClick={generateBridges} style={{ cursor: 'pointer', background: '#222', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 900, fontSize: '0.8rem' }}><RotateCcw size={14} style={{ marginRight: '5px' }} /> 새 판 짜기</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={isUiri} onChange={e => setIsUiri(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#00ffa3', cursor: 'pointer' }} />
            <span style={{ fontWeight: 900, color: isUiri ? '#00ffa3' : '#888', fontSize: '0.85rem', transition: 'color 0.2s' }}>의리사다리</span>
          </label>
          {isUiri && (
            <>
              <input type="text" value={uiriAmount} onChange={e => setUiriAmount(e.target.value)} placeholder="금액" style={{ width: '90px', background: '#000', border: '1px solid #00ffa344', color: '#00ffa3', borderRadius: '5px', padding: '5px 8px', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem' }} />
              <button onClick={runAll} disabled={isRunning} style={{ cursor: isRunning ? 'not-allowed' : 'pointer', background: isRunning ? '#1a1a1a' : '#00ffa3', color: isRunning ? '#444' : '#000', border: 'none', padding: '7px 14px', borderRadius: '8px', fontWeight: 900, fontSize: '0.85rem', opacity: isRunning ? 0.5 : 1 }}>⚡ 동시 진행</button>
            </>
          )}
        </div>
        <button onClick={() => setIsBlind(!isBlind)} style={{ cursor: 'pointer', background: isBlind ? '#ffbd2e' : '#222', color: isBlind ? 'black' : '#ffbd2e', border: isBlind ? 'none' : '1px solid #ffbd2e44', padding: '8px 18px', borderRadius: '8px', fontWeight: 900, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isBlind ? <EyeOff size={16} /> : <Eye size={16} />} BLIND PROGRESS
        </button>
      </div>
      <AnimatePresence>{showResult && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} style={{ background: '#050505', padding: '60px 100px', borderRadius: '40px', border: '8px solid #ffbd2e', textAlign: 'center', boxShadow: '0 0 100px rgba(255, 189, 46, 0.3)' }}><PartyPopper size={100} color="#ffbd2e" style={{ marginBottom: '30px' }} /><div style={{ fontSize: '3.6rem', color: 'white', fontWeight: 900 }}>{showResult.name}</div><div style={{ fontSize: '4rem', color: '#ffbd2e', fontWeight: 900, marginTop: '20px' }}>{showResult.result}</div><button style={{ cursor: 'pointer', marginTop: '50px', background: '#ffbd2e', border: 'none', padding: '24px 80px', borderRadius: '15px', fontWeight: 900, fontSize: '1.2rem' }} onClick={() => setShowResult(null)}>확인 완료</button></motion.div></motion.div>)}</AnimatePresence>
      <AnimatePresence>{showAllResults && <AllResultsModal results={showAllResults} totalAmount={uiriAmount} onClose={() => setShowAllResults(null)} />}</AnimatePresence>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: '#020202', border: '1px solid #111', borderRadius: '15px', position: 'relative', padding: '40px 0' }}>
        <svg viewBox={`-120 -80 ${WIDTH + 240} ${HEIGHT + 350}`} style={{ width: '100%', minWidth: `${Math.max(count, 5) / 5 * 100}%`, height: 'auto', display: 'block', overflow: 'visible' }}>
          {Array.from({ length: count }).map((_, i) => (<g key={i}><line x1={(i / (count - 1)) * WIDTH} y1="0" x2={(i / (count - 1)) * WIDTH} y2={HEIGHT} stroke="#222" strokeWidth="9" strokeLinecap="round" /><circle cx={(i / (count - 1)) * WIDTH} cy="0" r="9" fill="#ffbd2e" /><circle cx={(i / (count - 1)) * WIDTH} cy={HEIGHT} r="9" fill="#ffbd2e" /></g>))}
          {!isBlind && bridges.map((b, i) => (<line key={i} x1={(b.col / (count - 1)) * WIDTH} y1={(b.row / ROW_COUNT) * HEIGHT} x2={((b.col + 1) / (count - 1)) * WIDTH} y2={(b.row / ROW_COUNT) * HEIGHT} stroke="#ffbd2e66" strokeWidth="7" strokeLinecap="round" />))}
          {!isBlind && activePaths.map((p) => (<motion.polyline key={p.id} points={p.points.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="none" stroke={p.color} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 3.5, ease: "easeInOut" }} />))}
          {Array.from({ length: count }).map((_, i) => (<foreignObject key={i} x={(i / (count - 1)) * WIDTH - 85} y="-95" width="170" height="85"><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', background: '#000', border: '2px solid #ffbd2e', padding: '4px', borderRadius: '8px' }}><input placeholder="이름" value={starts[i]} onChange={e => { const n = [...starts]; n[i] = e.target.value; setStarts(n); }} style={{ width: '100px', background: 'none', color: 'white', border: 'none', textAlign: 'center', fontWeight: 800 }} /><button onClick={() => runPath(i)} style={{ cursor: 'pointer', background: '#ffbd2e', border: 'none', width: '30px', borderRadius: '5px', height: '30px', fontWeight: 900 }}>▶</button></div></div></foreignObject>))}
          {Array.from({ length: count }).map((_, i) => (<foreignObject key={i} x={(i / (count - 1)) * WIDTH - 80} y={HEIGHT + 25} width="160" height="70"><div style={{ textAlign: 'center' }}><input placeholder="결과" value={ends[i]} readOnly={isUiri} onChange={e => { if (isUiri) return; const n = [...ends]; n[i] = e.target.value; setEnds(n); }} style={{ width: '150px', background: '#000', border: `2px solid ${isUiri ? '#00ffa344' : '#222'}`, color: '#ffbd2e', textAlign: 'center', padding: '12px', borderRadius: '10px', fontSize: '1rem', fontWeight: 800, opacity: isUiri ? 0.7 : 1 }} /></div></foreignObject>))}
        </svg>
      </div>
    </div>
  );
};

const GroupMissionBoard: React.FC<{ missions: any[], onUpdate: (id: string, s: string) => void, onDelete: (id: string) => void, user: UserAuth, isAutoAccept: boolean, onToggleAutoAccept: () => void, isMissionDonationOnly: boolean, onToggleMissionDonationOnly: () => void }> = ({ missions, onUpdate, onDelete, user, isAutoAccept, onToggleAutoAccept, isMissionDonationOnly, onToggleMissionDonationOnly }) => {
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
    const cleanName = member.replace('⭐️', '');
    if (user.role === 'admin') {
      const val = prompt(`[${cleanName}] 테스트할 채팅 내용을 입력하세요 (예: !${cleanName} 사과 10개 먹기)`);
      if (val) {
        fetch(`${IS_DEV ? 'http://localhost:4000' : ''}/test-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creator: '보드매니저', content: val })
        });
        return;
      }
    }
    fetch(`${IS_DEV ? 'http://localhost:4000' : ''}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator: '보드매니저', target: cleanName, content: '할당된 작업', type: 'rogada' })
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
      {(user.role === 'admin' || user.name === '찌모') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '10px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: isAutoAccept ? '#00ffa322' : '#222',
            padding: '10px 20px', borderRadius: '15px',
            border: `1px solid ${isAutoAccept ? '#00ffa3' : '#333'}`,
            cursor: 'pointer', fontSize: '0.9rem', fontWeight: 900,
            color: isAutoAccept ? '#00ffa3' : '#888', transition: 'all 0.2s'
          }}>
            <input type="checkbox" checked={isAutoAccept} onChange={onToggleAutoAccept} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
            {isAutoAccept ? '⚡️ 미션 자동 수락 모드 ON' : '⏸️ 미션 수동 수락 모드'}
          </label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: isMissionDonationOnly ? '#ffbd2e22' : '#222',
            padding: '10px 20px', borderRadius: '15px',
            border: `1px solid ${isMissionDonationOnly ? '#ffbd2e' : '#333'}`,
            cursor: 'pointer', fontSize: '0.9rem', fontWeight: 900,
            color: isMissionDonationOnly ? '#ffbd2e' : '#888', transition: 'all 0.2s'
          }}>
            <input type="checkbox" checked={isMissionDonationOnly} onChange={onToggleMissionDonationOnly} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
            {isMissionDonationOnly ? '💰 도네이션 미션만 수신 중' : '💬 모든 채팅 미션 수신 중'}
          </label>
        </div>
      )}
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
                  {user.role === 'admin' && (
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
                      canUseLadder={user.role === 'admin' || user.role === 'host'}
                      canInteract={user.role === 'admin' || user.role === 'host' || user.name === cleanName} />
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
  normal: { y: 43, h: 346 }, // 기본
  angry: { y: 421, h: 322 }, // 화남
  sad: { y: 765, h: 293 }, // 슬픔
  happy: { y: 1068, h: 304 }, // 행복
  wink: { y: 1385, h: 303 }, // 윙크
  walkL: { y: 1695, h: 299 }, // 왼쪽이동
  walkR: { y: 2010, h: 294 }, // 오른쪽이동
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
  happyUntil: number;
  isDonation: boolean;
  sinking: boolean;
  emerging: boolean;
  joinedAt: number;
  isJumping: boolean;
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

// ─────────────────────────────────────────────
// 🎥 OBS 오버레이 — 햄스터 무대만 (투명 배경)
// ?overlay=true 로 접근
// ─────────────────────────────────────────────
const HamsterOverlay: React.FC = () => {
  const [hamsters, setHamsters] = useState<Map<string, HamsterData>>(new Map());
  const [walkFrame, setWalkFrame] = useState(0);
  const [stageW, setStageW] = useState(window.innerWidth);
  const [cheeseTargets, setCheeseTargets] = useState<Set<string>>(new Set());
  const sinkTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cheeseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cheeseRandoms = useRef<Map<string, { x: number; rotate: number; size: number; icon: string }>>(new Map());
  const hamstersRef = useRef<Map<string, HamsterData>>(new Map());
  const cheeseEnabledRef = useRef(false);
  const INACTIVE_MS = 60000;

  const triggerCheeseRef = useRef((_nickname: string) => { });
  triggerCheeseRef.current = (nickname: string) => {
    const rnd = { x: (Math.random() - 0.5) * 80, rotate: (Math.random() - 0.5) * 140, size: 0.8 + Math.random() * 0.2, icon: '🧀' };
    cheeseRandoms.current.set(nickname, rnd);
    if (cheeseTimers.current.has(nickname)) clearTimeout(cheeseTimers.current.get(nickname)!);
    setCheeseTargets(prev => new Set([...prev, nickname]));
    cheeseTimers.current.set(nickname, setTimeout(() => {
      setCheeseTargets(prev => { const s = new Set(prev); s.delete(nickname); return s; });
    }, 1600));
    setHamsters(prev => {
      const h = prev.get(nickname);
      if (!h) return prev;
      const next = new Map(prev);
      next.set(nickname, { ...h, expression: 'happy', happyUntil: Date.now() + 3000 });
      return next;
    });
  };

  useEffect(() => {
    fetch(`${SOCKET_URL}/cheese-enabled`).then(r => r.json()).then(d => { cheeseEnabledRef.current = d.enabled; });
    const onCheeseUpdate = (enabled: boolean) => { cheeseEnabledRef.current = enabled; };
    const onCheeseTest = () => {
      const active = Array.from(hamstersRef.current.values()).filter(h => !h.sinking);
      if (active.length === 0) return;
      const target = active[Math.floor(Math.random() * active.length)];
      triggerCheeseRef.current(target.nickname);
    };
    socket.on('cheeseEnabledUpdate', onCheeseUpdate);
    socket.on('cheeseTest', onCheeseTest);
    return () => { socket.off('cheeseEnabledUpdate', onCheeseUpdate); socket.off('cheeseTest', onCheeseTest); };
  }, []);

  useEffect(() => { hamstersRef.current = hamsters; }, [hamsters]);

  useEffect(() => {
    const onResize = () => setStageW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const STAGE_W = stageW;

  // 발걸음 프레임
  useEffect(() => {
    const t = setInterval(() => setWalkFrame(f => f === 0 ? 1 : 0), 280);
    return () => clearInterval(t);
  }, []);

  // 랜덤 이동 + 표정
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
            const walkExpr = Date.now() < h.happyUntil ? 'happy' : h.expression;
            next.set(key, { ...h, x: newX, direction: dx > 0 ? 'right' : 'left', isWalking: true, walkEndAt: Date.now() + 1700 * reps, expression: walkExpr });
          } else {
            const expr = Date.now() < h.happyUntil ? 'happy' : IDLE_EXPRS[Math.floor(Math.random() * IDLE_EXPRS.length)];
            next.set(key, { ...h, direction: 'front', isWalking: false, walkEndAt: 0, expression: expr });
          }
        });
        return next;
      });
    }, 2800);
    return () => clearInterval(t);
  }, []);

  // 말풍선 자동 제거 + 비활성 제거 + 걸음 종료
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
          if (h.message && now - h.lastMessageTs > 6000) {
            next.set(key, { ...h, message: null }); changed = true;
          }
          if (!h.sinking && now - h.lastMessageTs > INACTIVE_MS) {
            next.set(key, { ...h, sinking: true }); changed = true;
            const st = setTimeout(() => setHamsters(p => { const m = new Map(p); m.delete(key); return m; }), 1400);
            sinkTimers.current.set(key, st);
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 소켓 이벤트 — HamsterChatBot과 동일하게 mainChatLog 사용
  useEffect(() => {
    const handleChat = (data: { sender: string; content: string; isDonation: boolean }) => {
      const { sender, content, isDonation } = data;
      const cleaned = content.replace(/^!(도네이션|donation)\s*/i, '').trim();
      if (!cleaned && !isDonation) return;
      const now = Date.now();

      // !점프 명령 — 해당 햄스터만 점프 (필터링, 표시 안 함, 없으면 등장 후 점프)
      if (cleaned.startsWith('!점프')) {
        const jumpRaw = cleaned.slice(3).trim();
        const jumpMsg = jumpRaw.length > 15 ? jumpRaw.slice(0, 15) + '…' : (jumpRaw || '점프!');
        setHamsters(prev => {
          const next = new Map(prev);
          const h = next.get(sender);
          if (h && !h.sinking) {
            // 이미 존재 — 바로 점프
            next.set(sender, { ...h, isJumping: true, message: jumpMsg, messageTs: now, lastMessageTs: now, expression: 'happy' });
          } else if (!h || h.sinking) {
            // 없거나 사라지는 중 — 새로 등장시키고 점프
            if (sinkTimers.current.has(sender)) { clearTimeout(sinkTimers.current.get(sender)!); sinkTimers.current.delete(sender); }
            const colorIdx = h?.colorIdx ?? (next.size % HAMSTER_COLORS.length);
            const x = 40 + Math.random() * (STAGE_W - 120);
            next.set(sender, { nickname: sender, x, colorIdx, expression: 'happy', happyUntil: 0, isWalking: false, direction: 'front', walkEndAt: 0, message: jumpMsg, messageTs: now, lastMessageTs: now, sinking: false, isDonation: false, emerging: true, joinedAt: h?.joinedAt ?? now, isJumping: true });
            setTimeout(() => {
              setHamsters(p => { const m = new Map(p); const hh = m.get(sender); if (hh) m.set(sender, { ...hh, emerging: false }); return m; });
            }, 600);
          }
          return next;
        });
        setTimeout(() => {
          setHamsters(prev => {
            const next = new Map(prev);
            const h = next.get(sender);
            if (h?.isJumping) next.set(sender, { ...h, isJumping: false });
            return next;
          });
        }, 1200);
        return;
      }

      const truncated = cleaned.length > 15 ? cleaned.slice(0, 15) + '…' : cleaned;
      setHamsters(prev => {
        const next = new Map(prev);
        const existing = next.get(sender);
        if (existing) {
          if (sinkTimers.current.has(sender)) { clearTimeout(sinkTimers.current.get(sender)!); sinkTimers.current.delete(sender); }
          next.set(sender, { ...existing, message: isDonation ? `💰 ${truncated}` : truncated, messageTs: now, lastMessageTs: now, sinking: false, isDonation: isDonation || existing.isDonation, expression: isDonation ? 'happy' : existing.expression });
        } else {
          const colorIdx = next.size % HAMSTER_COLORS.length;
          const x = 40 + Math.random() * (STAGE_W - 120);
          next.set(sender, { nickname: sender, x, colorIdx, expression: isDonation ? 'happy' : 'normal', happyUntil: 0, isWalking: false, direction: 'front', walkEndAt: 0, message: isDonation ? `💰 ${truncated}` : truncated, messageTs: now, lastMessageTs: now, sinking: false, isDonation, emerging: true, joinedAt: now, isJumping: false });
          setTimeout(() => {
            setHamsters(p => { const m = new Map(p); const h = m.get(sender); if (h) m.set(sender, { ...h, emerging: false }); return m; });
          }, 600);
        }
        return next;
      });
      if (isDonation && cheeseEnabledRef.current) {
        const active = Array.from(hamstersRef.current.values()).filter(h => !h.sinking);
        if (active.length > 0) {
          const target = active[Math.floor(Math.random() * active.length)];
          triggerCheeseRef.current(target.nickname);
        }
      }
    };
    socket.on('mainChatLog', handleChat);
    return () => {
      socket.off('mainChatLog', handleChat);
    };
  }, []);

  const hamsterList = Array.from(hamsters.values());
  // const activeList  = hamsterList.filter(h => !h.sinking);
  // const kingNickname = activeList.length > 0
  //   ? activeList.reduce((a, b) => a.joinedAt < b.joinedAt ? a : b).nickname
  //   : null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'transparent',
      overflow: 'hidden',
    }}>
      {/* 무대 — 하단 고정 */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '260px' }}>

        {/* 별 */}
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', width: i % 3 === 0 ? '3px' : '2px', height: i % 3 === 0 ? '3px' : '2px', background: 'white', borderRadius: '50%', left: `${(i * 43 + 7) % 100}%`, top: `${(i * 29 + 3) % 45}%`, opacity: 0.25 + (i % 4) * 0.1 }} />
        ))}

        {/* 일반 햄스터 */}
        {hamsterList.filter(h => /*!h.nickname !== kingNickname &&*/ !h.isDonation).map(h => {
          const spriteRow: SpriteRow = h.sinking ? 'sad' : h.isWalking && h.expression !== 'happy' && h.direction === 'left' ? 'walkL' : h.isWalking && h.expression !== 'happy' && h.direction === 'right' ? 'walkR' : h.expression;
          return (
            <motion.div key={h.nickname}
              initial={{ x: h.x, opacity: 0, y: 40, scale: 0.6 }}
              animate={{ x: h.x, y: h.sinking ? 110 : h.isJumping ? [0, -130, 0, -70, 0] : 0, opacity: h.sinking ? 0 : 1, scale: 1 }}
              transition={{ x: { duration: 1.6, ease: 'easeInOut' }, y: h.isJumping ? { duration: 1.0, times: [0, 0.3, 0.6, 0.8, 1] } : { duration: 1.2 }, opacity: { duration: 0.4 }, scale: { duration: 0.35, ease: 'backOut' } }}
              style={{ position: 'absolute', bottom: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${DISP_W}px`, transformOrigin: 'bottom center' }}>
              <AnimatePresence>
                {h.message && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.85 }}
                    style={{ position: 'absolute', bottom: `${DISP_H + 30}px`, background: h.isDonation ? '#2a1800' : 'white', color: h.isDonation ? '#ffbd2e' : '#111', border: h.isDonation ? '1.5px solid #ffbd2e' : 'none', padding: '5px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, maxWidth: '220px', whiteSpace: 'pre-line', boxShadow: '0 3px 10px rgba(0,0,0,0.5)', zIndex: 10, lineHeight: 1.4, textAlign: 'center' }}>
                    {h.isDonation && <span style={{ marginRight: '4px' }}>💰</span>}{h.message}
                    <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `7px solid ${h.isDonation ? '#ffbd2e' : 'white'}` }} />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* 치즈 낙하 아이콘 */}
              {cheeseTargets.has(h.nickname) && (() => {
                const r = cheeseRandoms.current.get(h.nickname) ?? { x: 0, rotate: 0, size: 1, icon: '🧀' }; return (
                  <motion.div
                    key={h.nickname + '-cheese'}
                    initial={{ x: r.x, y: -150, rotate: r.rotate, opacity: 1, scale: 1.3 }}
                    animate={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0 }}
                    transition={{ duration: 1.36, ease: 'easeIn', opacity: { duration: 0.1, delay: 1.26, ease: 'linear' }, scale: { duration: 0.1, delay: 1.26, ease: 'linear' } }}
                    style={{ position: 'absolute', bottom: `${Math.round(DISP_H * 0.6) - 20}px`, left: '50%', marginLeft: '-0.65rem', fontSize: `${r.size * 1.3}rem`, lineHeight: 1, zIndex: 20, pointerEvents: 'none' }}>
                    {r.icon}
                  </motion.div>
                );
              })()}
              <div style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 900, textShadow: '0 0 4px black, 0 0 8px black', whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', marginBottom: '4px' }}>
                {h.nickname}
              </div>
              <motion.div animate={{ y: h.isWalking ? [0, -3, 0, -3, 0] : 0, scale: spriteRow === 'normal' ? 0.9 : 1 }} transition={h.isWalking ? { duration: 0.72, repeat: Infinity, scale: { duration: 0 } } : { duration: 0.2, scale: { duration: 0 } }}>
                <HamsterSprite colorIdx={h.colorIdx} row={spriteRow} frame={walkFrame} />
              </motion.div>
            </motion.div>
          );
        })}

        {/* 도네이션 햄스터 */}
        {hamsterList.filter(h => /*!h.nickname !== kingNickname &&*/ h.isDonation).map(h => {
          const spriteRow: SpriteRow = h.sinking ? 'sad' : h.isWalking && h.expression !== 'happy' && h.direction === 'left' ? 'walkL' : h.isWalking && h.expression !== 'happy' && h.direction === 'right' ? 'walkR' : h.expression;
          return (
            <motion.div key={h.nickname}
              initial={{ x: h.x, opacity: 0, y: 40, scale: 0.6 }}
              animate={{ x: h.x, y: h.sinking ? 110 : h.isJumping ? [0, -130, 0, -70, 0] : 0, opacity: h.sinking ? 0 : 1, scale: 1 }}
              transition={{ x: { duration: 1.6, ease: 'easeInOut' }, y: h.isJumping ? { duration: 1.0, times: [0, 0.3, 0.6, 0.8, 1] } : { duration: 1.2 }, opacity: { duration: 0.4 }, scale: { duration: 0.35, ease: 'backOut' } }}
              style={{ position: 'absolute', bottom: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${DISP_W}px`, transformOrigin: 'bottom center' }}>
              {/* 도네이션 말풍선 (주석): background '#2a1800', color '#ffbd2e', border '1.5px solid #ffbd2e', 💰 아이콘 */}
              <AnimatePresence>
                {h.message && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.85 }}
                    style={{ position: 'absolute', bottom: `${DISP_H + 30}px`, background: 'white', color: '#111', padding: '5px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, maxWidth: '220px', whiteSpace: 'pre-line', boxShadow: '0 3px 10px rgba(0,0,0,0.5)', zIndex: 10, lineHeight: 1.4, textAlign: 'center' }}>
                    {h.message}
                    <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid white' }} />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* 치즈 낙하 아이콘 */}
              {cheeseTargets.has(h.nickname) && (() => {
                const r = cheeseRandoms.current.get(h.nickname) ?? { x: 0, rotate: 0, size: 1, icon: '🧀' }; return (
                  <motion.div
                    key={h.nickname + '-cheese'}
                    initial={{ x: r.x, y: -150, rotate: r.rotate, opacity: 1, scale: 1.3 }}
                    animate={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0 }}
                    transition={{ duration: 1.36, ease: 'easeIn', opacity: { duration: 0.1, delay: 1.26, ease: 'linear' }, scale: { duration: 0.1, delay: 1.26, ease: 'linear' } }}
                    style={{ position: 'absolute', bottom: `${Math.round(DISP_H * 0.6) - 20}px`, left: '50%', marginLeft: '-0.65rem', fontSize: `${r.size * 1.3}rem`, lineHeight: 1, zIndex: 20, pointerEvents: 'none' }}>
                    {r.icon}
                  </motion.div>
                );
              })()}
              {/* 도네이션 닉네임 (주석): color '#ffbd2e', 💰 {h.nickname} */}
              <div style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 900, textShadow: '0 0 4px black, 0 0 8px black', whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', marginBottom: '4px' }}>
                {h.nickname}
              </div>
              <motion.div animate={{ y: h.isWalking ? [0, -3, 0, -3, 0] : 0, scale: spriteRow === 'normal' ? 0.9 : 1 }} transition={h.isWalking ? { duration: 0.72, repeat: Infinity, scale: { duration: 0 } } : { duration: 0.2, scale: { duration: 0 } }}>
                <HamsterSprite colorIdx={h.colorIdx} row={spriteRow} frame={walkFrame} />
              </motion.div>
            </motion.div>
          );
        })}

        {/* 왕관 햄스터 */}
        {/*hamsterList.filter(h => h.nickname === kingNickname).map(h => {
          const spriteRow: SpriteRow = h.sinking ? 'sad' : h.isWalking && h.expression !== 'happy' && h.direction === 'left' ? 'walkL' : h.isWalking && h.expression !== 'happy' && h.direction === 'right' ? 'walkR' : h.expression;
          return (
            <motion.div key={h.nickname}
              initial={{ x: h.x, opacity: 0, y: 40, scale: 0.6 }}
              animate={{ x: h.x, y: h.sinking ? 110 : h.isJumping ? [0, -130, 0, -70, 0] : 0, opacity: h.sinking ? 0 : 1, scale: 1.5 }}
              transition={{ x: { duration: 1.6, ease: 'easeInOut' }, y: h.isJumping ? { duration: 1.0, times: [0, 0.3, 0.6, 0.8, 1] } : { duration: 1.2 }, opacity: { duration: 0.4 }, scale: { duration: 0.35, ease: 'backOut' } }}
              style={{ position: 'absolute', bottom: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${DISP_W}px`, transformOrigin: 'bottom center' }}>
              <AnimatePresence>
                {h.message && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.85 }}
                    style={{ position: 'absolute', bottom: `${DISP_H + 30}px`, background: h.isDonation ? '#2a1800' : 'white', color: h.isDonation ? '#ffbd2e' : '#111', border: h.isDonation ? '1.5px solid #ffbd2e' : 'none', padding: '5px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, maxWidth: '220px', whiteSpace: 'pre-line', boxShadow: '0 3px 10px rgba(0,0,0,0.5)', zIndex: 10, lineHeight: 1.4, textAlign: 'center' }}>
                    {h.isDonation && <span style={{ marginRight: '4px' }}>💰</span>}{h.message}
                    <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `7px solid ${h.isDonation ? '#ffbd2e' : 'white'}` }} />
                  </motion.div>
                )}
              </AnimatePresence>
              <div style={{ color: '#ffdf00', fontSize: '0.68rem', fontWeight: 900, textShadow: '0 0 4px black, 0 0 8px black', whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', marginBottom: '4px' }}>
                ⭐ {h.nickname}
              </div>
              <motion.div animate={{ y: h.isWalking ? [0,-3,0,-3,0] : 0 }} transition={h.isWalking ? { duration: 0.72, repeat: Infinity } : { duration: 0.2 }}>
                <HamsterSprite colorIdx={h.colorIdx} row={spriteRow} frame={walkFrame} />
              </motion.div>
            </motion.div>
          );
        })*/}

      </div>
    </div>
  );
};

const HamsterChatBot: React.FC = () => {
  const [hamsters, setHamsters] = useState<Map<string, HamsterData>>(new Map());
  const [walkFrame, setWalkFrame] = useState(0);
  const [chatLog, setChatLog] = useState<{ sender: string; content: string; isDonation: boolean }[]>([]);
  const [cheeseTargets, setCheeseTargets] = useState<Set<string>>(new Set());
  const chatLogRef = useRef<HTMLDivElement>(null);
  const sinkTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const emergeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cheeseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cheeseRandoms = useRef<Map<string, { x: number; rotate: number; size: number; icon: string }>>(new Map());
  const hamstersRef = useRef<Map<string, HamsterData>>(new Map());
  const cheeseEnabledRef = useRef(false);
  const STAGE_W = 860;
  const INACTIVE_MS = 60000;

  const triggerCheeseRef = useRef((_nickname: string) => { });
  triggerCheeseRef.current = (nickname: string) => {
    const rnd = { x: (Math.random() - 0.5) * 80, rotate: (Math.random() - 0.5) * 140, size: 0.8 + Math.random() * 0.2, icon: '🧀' };
    cheeseRandoms.current.set(nickname, rnd);
    if (cheeseTimers.current.has(nickname)) clearTimeout(cheeseTimers.current.get(nickname)!);
    setCheeseTargets(prev => new Set([...prev, nickname]));
    cheeseTimers.current.set(nickname, setTimeout(() => {
      setCheeseTargets(prev => { const s = new Set(prev); s.delete(nickname); return s; });
    }, 1600));
    setHamsters(prev => {
      const h = prev.get(nickname);
      if (!h) return prev;
      const next = new Map(prev);
      next.set(nickname, { ...h, expression: 'happy', happyUntil: Date.now() + 3000 });
      return next;
    });
  };

  useEffect(() => {
    fetch(`${SOCKET_URL}/cheese-enabled`).then(r => r.json()).then(d => { cheeseEnabledRef.current = d.enabled; });
    const onCheeseUpdate = (enabled: boolean) => { cheeseEnabledRef.current = enabled; };
    const onCheeseTest = () => {
      const active = Array.from(hamstersRef.current.values()).filter(h => !h.sinking);
      if (active.length === 0) return;
      const target = active[Math.floor(Math.random() * active.length)];
      triggerCheeseRef.current(target.nickname);
    };
    socket.on('cheeseEnabledUpdate', onCheeseUpdate);
    socket.on('cheeseTest', onCheeseTest);
    return () => { socket.off('cheeseEnabledUpdate', onCheeseUpdate); socket.off('cheeseTest', onCheeseTest); };
  }, []);

  // 발걸음 프레임 토글
  useEffect(() => {
    const t = setInterval(() => setWalkFrame(f => f === 0 ? 1 : 0), 280);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { hamstersRef.current = hamsters; }, [hamsters]);

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
            const walkExpr = Date.now() < h.happyUntil ? 'happy' : h.expression;
            next.set(key, { ...h, x: newX, direction: dx > 0 ? 'right' : 'left', isWalking: true, walkEndAt: Date.now() + 1700 * reps, expression: walkExpr });
          } else {
            const expr = Date.now() < h.happyUntil ? 'happy' : IDLE_EXPRS[Math.floor(Math.random() * IDLE_EXPRS.length)];
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
      if (!cleaned && !isDonation) return;
      const now = Date.now();

      // !점프 명령 — 해당 햄스터만 점프 (채팅 로그 미표시, 없으면 등장 후 점프)
      if (cleaned.startsWith('!점프')) {
        const jumpRaw = cleaned.slice(3).trim();
        const jumpMsg = jumpRaw.length > 15 ? jumpRaw.slice(0, 15) + '…' : (jumpRaw || '점프!');
        const bubbleJump = jumpMsg.match(/.{1,5}/g)?.join('\n') ?? jumpMsg;
        setHamsters(prev => {
          const next = new Map(prev);
          const h = next.get(sender);
          if (h && !h.sinking) {
            // 이미 존재 — 바로 점프
            next.set(sender, { ...h, isJumping: true, message: bubbleJump, messageTs: now, lastMessageTs: now, expression: 'happy' });
          } else if (!h || h.sinking) {
            // 없거나 사라지는 중 — 새로 등장시키고 점프
            if (h?.sinking) { clearTimeout(sinkTimers.current.get(sender)); sinkTimers.current.delete(sender); }
            next.set(sender, {
              nickname: sender, x: Math.random() * (STAGE_W - 80) + 20,
              direction: 'front', isWalking: false, walkEndAt: 0,
              message: bubbleJump, messageTs: now, lastMessageTs: now,
              colorIdx: (h?.colorIdx ?? next.size) % HAMSTER_COLORS.length,
              expression: 'happy', happyUntil: 0, isDonation: false,
              sinking: false, emerging: true, joinedAt: h?.joinedAt ?? now,
              isJumping: true,
            });
            setTimeout(() => {
              setHamsters(p => { const m = new Map(p); const hh = m.get(sender); if (hh) m.set(sender, { ...hh, emerging: false }); return m; });
            }, 600);
          }
          return next;
        });
        setTimeout(() => {
          setHamsters(prev => {
            const next = new Map(prev);
            const h = next.get(sender);
            if (h?.isJumping) next.set(sender, { ...h, isJumping: false });
            return next;
          });
        }, 1200);
        return;
      }

      // 말풍선용 25자 / 로그용 40자 제한
      const truncated = cleaned.length > 15 ? cleaned.slice(0, 15) + '…' : cleaned;
      const bubbleText = truncated.match(/.{1,5}/g)?.join('\n') ?? truncated;
      const logText = cleaned.length > 40 ? cleaned.slice(0, 40) + '…' : cleaned;
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
          next.set(sender, {
            nickname: sender, x: Math.random() * (STAGE_W - 80) + 20,
            direction: 'front', isWalking: false, walkEndAt: 0,
            message: bubbleText, messageTs: now, lastMessageTs: now,
            colorIdx: next.size % HAMSTER_COLORS.length,
            expression: isDonation ? 'wink' : 'normal', happyUntil: 0,
            isDonation, sinking: false, emerging: true, joinedAt: now, isJumping: false,
          });
          const et = setTimeout(() => {
            setHamsters(p => {
              const m = new Map(p);
              const h = m.get(sender);
              if (h) m.set(sender, { ...h, emerging: false });
              return m;
            });
            emergeTimers.current.delete(sender);
          }, 600);
          emergeTimers.current.set(sender, et);
        }
        return next;
      });
      if (isDonation && cheeseEnabledRef.current) {
        const active = Array.from(hamstersRef.current.values()).filter(h => !h.sinking);
        if (active.length > 0) {
          const target = active[Math.floor(Math.random() * active.length)];
          triggerCheeseRef.current(target.nickname);
        }
      }
    };
    socket.on('mainChatLog', handle);
    return () => {
      socket.off('mainChatLog', handle);
    };
  }, []);

  useEffect(() => {
    if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [chatLog]);

  const hamsterList = Array.from(hamsters.values());
  // const activeList = hamsterList.filter(h => !h.sinking);
  // const kingNickname = activeList.length > 0
  //   ? activeList.reduce((a, b) => a.joinedAt < b.joinedAt ? a : b).nickname
  //   : null;

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
        {hamsterList.filter(h => /*!h.nickname !== kingNickname &&*/ !h.isDonation).map(h => {
          const spriteRow: SpriteRow = h.sinking
            ? 'sad'
            : h.isWalking && h.expression !== 'happy' && h.direction === 'left'
              ? 'walkL'
              : h.isWalking && h.expression !== 'happy' && h.direction === 'right'
                ? 'walkR'
                : h.expression;
          return (
            <motion.div key={h.nickname}
              initial={{ x: h.x, opacity: 0, y: 40, scale: 0.6 }}
              animate={{ x: h.x, y: h.sinking ? 110 : h.isJumping ? [0, -130, 0, -70, 0] : 0, opacity: h.sinking ? 0 : 1, scale: 1 }}
              transition={{ x: { duration: 1.6, ease: 'easeInOut' }, y: h.isJumping ? { duration: 1.0, times: [0, 0.3, 0.6, 0.8, 1] } : { duration: 1.2, ease: 'easeIn' }, opacity: { duration: 0.4 }, scale: { duration: 0.35, ease: 'backOut' } }}
              style={{ position: 'absolute', bottom: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${DISP_W}px`, transformOrigin: 'bottom center' }}>

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

              {/* 치즈 낙하 아이콘 */}
              {cheeseTargets.has(h.nickname) && (() => {
                const r = cheeseRandoms.current.get(h.nickname) ?? { x: 0, rotate: 0, size: 1, icon: '🧀' }; return (
                  <motion.div
                    key={h.nickname + '-cheese'}
                    initial={{ x: r.x, y: -150, rotate: r.rotate, opacity: 1, scale: 1.3 }}
                    animate={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0 }}
                    transition={{ duration: 1.36, ease: 'easeIn', opacity: { duration: 0.1, delay: 1.26, ease: 'linear' }, scale: { duration: 0.1, delay: 1.26, ease: 'linear' } }}
                    style={{ position: 'absolute', bottom: `${Math.round(DISP_H * 0.6) - 20}px`, left: '50%', marginLeft: '-0.65rem', fontSize: `${r.size * 1.3}rem`, lineHeight: 1, zIndex: 20, pointerEvents: 'none' }}>
                    {r.icon}
                  </motion.div>
                );
              })()}
              {/* 닉네임 — 스프라이트 위에 표시 */}
              <div style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 900, textShadow: '0 0 4px black, 0 0 8px black, 0 1px 2px black', whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', marginBottom: '4px', letterSpacing: '0.02em' }}>
                {h.nickname}
              </div>

              {/* 햄스터 스프라이트 */}
              <motion.div
                animate={{ y: h.isWalking ? [0, -3, 0, -3, 0] : 0, scale: spriteRow === 'normal' ? 0.9 : 1 }}
                transition={h.isWalking ? { duration: 0.72, repeat: Infinity, scale: { duration: 0 } } : { duration: 0.2, scale: { duration: 0 } }}>
                <HamsterSprite colorIdx={h.colorIdx} row={spriteRow} frame={walkFrame} />
              </motion.div>
            </motion.div>
          );
        })}

        {/* 도네이션 햄스터 — 일반보다 앞, 왕관보다는 뒤 */}
        {hamsterList.filter(h => h.isDonation /*&& h.nickname !== kingNickname*/).map(h => {
          const spriteRow: SpriteRow = h.sinking
            ? 'sad'
            : h.isWalking && h.expression !== 'happy' && h.direction === 'left'
              ? 'walkL'
              : h.isWalking && h.expression !== 'happy' && h.direction === 'right'
                ? 'walkR'
                : h.expression;
          return (
            <motion.div key={h.nickname}
              initial={{ x: h.x, opacity: 0, y: 40, scale: 0.6 }}
              animate={{ x: h.x, y: h.sinking ? 110 : h.isJumping ? [0, -130, 0, -70, 0] : 0, opacity: h.sinking ? 0 : 1, scale: 1 }}
              transition={{ x: { duration: 1.6, ease: 'easeInOut' }, y: h.isJumping ? { duration: 1.0, times: [0, 0.3, 0.6, 0.8, 1] } : { duration: 1.2, ease: 'easeIn' }, opacity: { duration: 0.4 }, scale: { duration: 0.35, ease: 'backOut' } }}
              style={{ position: 'absolute', bottom: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${DISP_W}px`, transformOrigin: 'bottom center' }}>
              {/* 도네이션 말풍선 (주석): background '#2a1800', color '#ffbd2e', border '1.5px solid #ffbd2e', 💰 아이콘 */}
              <AnimatePresence>
                {h.message && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.85 }}
                    style={{ position: 'absolute', bottom: `${DISP_H + 30}px`, background: 'white', color: '#111', padding: '5px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, maxWidth: '220px', whiteSpace: 'pre-line', boxShadow: '0 3px 10px rgba(0,0,0,0.5)', zIndex: 10, lineHeight: 1.4, textAlign: 'center' }}>
                    {h.message}
                    <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid white' }} />
                  </motion.div>
                )}
              </AnimatePresence>
              {/* 치즈 낙하 아이콘 */}
              {cheeseTargets.has(h.nickname) && (() => {
                const r = cheeseRandoms.current.get(h.nickname) ?? { x: 0, rotate: 0, size: 1, icon: '🧀' }; return (
                  <motion.div
                    key={h.nickname + '-cheese'}
                    initial={{ x: r.x, y: -150, rotate: r.rotate, opacity: 1, scale: 1.3 }}
                    animate={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0 }}
                    transition={{ duration: 1.36, ease: 'easeIn', opacity: { duration: 0.1, delay: 1.26, ease: 'linear' }, scale: { duration: 0.1, delay: 1.26, ease: 'linear' } }}
                    style={{ position: 'absolute', bottom: `${Math.round(DISP_H * 0.6) - 20}px`, left: '50%', marginLeft: '-0.65rem', fontSize: `${r.size * 1.3}rem`, lineHeight: 1, zIndex: 20, pointerEvents: 'none' }}>
                    {r.icon}
                  </motion.div>
                );
              })()}
              {/* 도네이션 닉네임 (주석): color '#ffbd2e', 💰 {h.nickname} */}
              <div style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 900, textShadow: '0 0 4px black, 0 0 8px black, 0 1px 2px black', whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', marginBottom: '4px', letterSpacing: '0.02em' }}>
                {h.nickname}
              </div>
              <motion.div
                animate={{ y: h.isWalking ? [0, -3, 0, -3, 0] : 0, scale: spriteRow === 'normal' ? 0.9 : 1 }}
                transition={h.isWalking ? { duration: 0.72, repeat: Infinity, scale: { duration: 0 } } : { duration: 0.2, scale: { duration: 0 } }}>
                <HamsterSprite colorIdx={h.colorIdx} row={spriteRow} frame={walkFrame} />
              </motion.div>
            </motion.div>
          );
        })}

        {/* 왕관 햄스터 — 일반 햄스터보다 앞, 잔디보다는 뒤 */}
        {/*hamsterList.filter(h => h.nickname === kingNickname).map(h => {
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
              animate={{ x: h.x, y: h.sinking ? 110 : h.isJumping ? [0, -130, 0, -70, 0] : 0, opacity: h.sinking ? 0 : 1, scale: 1.5 }}
              transition={{ x: { duration: 1.6, ease: 'easeInOut' }, y: h.isJumping ? { duration: 1.0, times: [0, 0.3, 0.6, 0.8, 1] } : { duration: 1.2, ease: 'easeIn' }, opacity: { duration: 0.4 }, scale: { duration: 0.35, ease: 'backOut' } }}
              style={{ position: 'absolute', bottom: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${DISP_W}px`, transformOrigin: 'bottom center' }}>
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
                animate={{ y: h.isWalking ? [0, -3, 0, -3, 0] : 0 }}
                transition={h.isWalking ? { duration: 0.72, repeat: Infinity } : { duration: 0.2 }}>
                <HamsterSprite colorIdx={h.colorIdx} row={spriteRow} frame={walkFrame} />
              </motion.div>
            </motion.div>
          );
        })*/}

        {/* 바닥 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)' }} />
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

const RouletteGame: React.FC<{ user: UserAuth, isPokMode?: boolean }> = ({ user, isPokMode = false }) => {
  type RItem = { label: string; weight: number };
  const STORAGE_KEY = `roulette_items_v2_${user.name}${isPokMode ? '_pok' : ''}`;
  const colors = ['#ff2eb4', '#00ffa3', '#2e96ff', '#ff8e2e', '#b42eff', '#ff4b4b', '#ffff00'];

  const defaultItems: RItem[] = isPokMode
    ? ['가나', '기공', '슬레', '건슬', '발키리', '바드'].map(l => ({ label: l, weight: 1 }))
    : ['치킨', '피자', '꽝', '별풍선', '애교', '랜덤박스', '벌칙'].map(l => ({ label: l, weight: 1 }));
  const defaultItems2: RItem[] = ['4막', '종막', '세르카', '종탑'].map(l => ({ label: l, weight: 1 }));

  const [items, setItems] = useState<RItem[]>(defaultItems);
  const [personPools, setPersonPools] = useState<Record<string, RItem[]>>({});
  const [items2, setItems2] = useState<RItem[]>(defaultItems2);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [rotation2, setRotation2] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [winner2, setWinner2] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const [arrowWiggle, setArrowWiggle] = useState(0);
  const [arrowWiggle2, setArrowWiggle2] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const lastTickCount = useRef(0);
  const lastTickCount2 = useRef(0);
  const tensionRef = useRef(0);
  const tensionRef2 = useRef(0);
  const isPok = isPokMode;

  const itemsRef = useRef<RItem[]>(items);
  const items2Ref = useRef<RItem[]>(items2);
  const personPoolsRef = useRef<Record<string, RItem[]>>(personPools);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { items2Ref.current = items2; }, [items2]);
  useEffect(() => { personPoolsRef.current = personPools; }, [personPools]);

  useEffect(() => {
    if (isPokMode) {
      fetch(`${SOCKET_URL}/pok-roulette-state`)
        .then(res => res.json())
        .then(data => {
          if (data.items1 && data.items1.length > 0) setItems(data.items1);
          if (data.personPools) setPersonPools(data.personPools);
          setIsLoaded(true);
        })
        .catch(() => setIsLoaded(true));
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setItems(JSON.parse(saved));
      } catch { }
      setIsLoaded(true);
    }
  }, [isPokMode, SOCKET_URL, STORAGE_KEY]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isPokMode) {
      fetch(`${SOCKET_URL}/pok-roulette-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items1: items, personPools })
      });
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, personPools, isLoaded, isPokMode, SOCKET_URL, STORAGE_KEY]);

  // items2(휠 표시용) 동기화 - personPools 로드 또는 winner 변경 시 대응
  useEffect(() => {
    if (isPok) {
      const pool = winner ? (personPools[winner] || defaultItems2) : defaultItems2;
      setItems2(pool);
    }
  }, [personPools, winner, isPok]);

  // "내용x숫자" 파싱 → { label, weight }
  const parseRaw = (raw: string): RItem => {
    const m = raw.trim().match(/^(.+?)x(\d+)$/i);
    if (m) return { label: m[1].trim(), weight: Math.min(Number(m[2]), 100) };
    return { label: raw.trim(), weight: 1 };
  };

  // 중복이면 weight 누적, 없으면 신규 추가
  const mergeItem = (prev: RItem[], incoming: RItem): RItem[] => {
    const idx = prev.findIndex(it => it.label === incoming.label);
    if (idx >= 0) return prev.map((it, i) => i === idx ? { ...it, weight: it.weight + incoming.weight } : it);
    return [...prev, incoming];
  };

  const addItem = (raw: string) => {
    if (!raw.trim()) return;
    const parsed = parseRaw(raw);
    setItems(prev => mergeItem(prev, parsed));
    setNewItem('');
  };

  useEffect(() => {
    const handleAdd = ({ member, content }: { member: string; content: string }) => {
      if (!isSpinning && content && member === user.name) {
        const parsed = parseRaw(content);
        setItems(prev => mergeItem(prev, parsed));
      }
    };
    socket.on('addRouletteItem', handleAdd);
    return () => { socket.off('addRouletteItem', handleAdd); };
  }, [isSpinning]);

  const connectChat = () => {
    if (!user.chnnelid) return alert('채널 ID가 설정되지 않은 계정입니다.');
    fetch(`${SOCKET_URL}/connect-member`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member: user.name, channelId: user.chnnelid }) })
      .then(r => r.json())
      .then(data => { if (data.success) { setIsConnected(true); alert(`${user.name} 채널 채팅 연결 성공!`); } else alert('연결 실패: ' + data.error); });
  };

  // 비율 기반 슬라이스 각도 계산
  const totalWeight = items.reduce((s, it) => s + it.weight, 0);
  const slices = (() => {
    let cum = 0;
    return items.map(it => {
      const sweep = totalWeight > 0 ? (it.weight / totalWeight) * 360 : 0;
      const start = cum;
      cum += sweep;
      return { label: it.label, weight: it.weight, startDeg: start, sweepDeg: sweep };
    });
  })();

  const totalWeight2 = items2.reduce((s, it) => s + it.weight, 0);
  const slices2 = (() => {
    let cum = 0;
    return items2.map(it => {
      const sweep = totalWeight2 > 0 ? (it.weight / totalWeight2) * 360 : 0;
      const start = cum;
      cum += sweep;
      return { label: it.label, weight: it.weight, startDeg: start, sweepDeg: sweep };
    });
  })();

  const spinRoulette = () => {
    if (isSpinning || items.length === 0) return;
    setIsSpinning(true); setWinner(null); setWinner2(null);
    const duration = isPok ? 5000 : 8500;

    const spinTwo = (targetPool: RItem[], firstWinner: string) => {
      const baseRotation2 = rotation2;
      const finalTarget2 = baseRotation2 + (10 + Math.random() * 5) * 360 + Math.random() * 360;

      let cum = 0;
      const tWeight = targetPool.reduce((s, it) => s + it.weight, 0);
      const tempSlices2 = targetPool.map(it => {
        const sweep = tWeight > 0 ? (it.weight / tWeight) * 360 : 0;
        const start = cum; cum += sweep;
        return { label: it.label, weight: it.weight, startDeg: start, sweepDeg: sweep };
      });

      const tickStep2 = 360 / Math.max(1, targetPool.length);
      const start = Date.now();
      lastTickCount2.current = Math.floor((baseRotation2 + 0.5) / tickStep2);

      const animate2 = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 5);
        const cur2 = baseRotation2 + (finalTarget2 - baseRotation2) * easeOut;
        setRotation2(cur2);

        const tick2 = Math.floor((cur2 + 0.5) / tickStep2);
        if (tick2 > lastTickCount2.current) { tensionRef2.current = Math.min(50, tensionRef2.current + 38); lastTickCount2.current = tick2; }
        tensionRef2.current *= 0.85;
        if (tensionRef2.current < 0.1) tensionRef2.current = 0;
        setArrowWiggle2(-tensionRef2.current);

        if (progress < 1) {
          requestAnimationFrame(animate2);
        } else {
          const effective2 = ((360 - (cur2 % 360)) + 360) % 360;
          const hit2 = tempSlices2.find(s => effective2 >= s.startDeg && effective2 < s.startDeg + s.sweepDeg) ?? tempSlices2[0];
          const secondWinner = hit2.label;
          setWinner2(secondWinner);
          setIsSpinning(false);

          if (isPok) {
            setPersonPools(prev => {
              const currentPool = prev[firstWinner] || defaultItems2;
              const nextPool = currentPool.filter(it => it.label.trim() !== secondWinner.trim());
              if (nextPool.length === 0) {
                setItems(p1 => p1.filter(it => it.label.trim() !== firstWinner.trim()));
                const nextPersonPools = { ...prev };
                delete nextPersonPools[firstWinner];
                return nextPersonPools;
              } else {
                return { ...prev, [firstWinner]: nextPool };
              }
            });
          }
        }
      };
      requestAnimationFrame(animate2);
    };

    // spinOne 내부 finish 로직 수정
    const spinOne = () => {
      const baseRotation = rotation;
      const finalTarget = baseRotation + (10 + Math.random() * 5) * 360 + Math.random() * 360;
      const tickStep = 360 / Math.max(1, items.length);
      const start = Date.now();
      lastTickCount.current = Math.floor((baseRotation + 0.5) / tickStep);

      const animate1 = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 5);
        const cur = baseRotation + (finalTarget - baseRotation) * easeOut;
        setRotation(cur);

        const tick = Math.floor((cur + 0.5) / tickStep);
        if (tick > lastTickCount.current) {
          tensionRef.current = Math.min(50, tensionRef.current + 38);
          lastTickCount.current = tick;
        }
        tensionRef.current *= 0.85;
        if (tensionRef.current < 0.1) tensionRef.current = 0;
        setArrowWiggle(-tensionRef.current);

        if (progress < 1) {
          requestAnimationFrame(animate1);
        } else {
          const effective = ((360 - (cur % 360)) + 360) % 360;
          const hit = slices.find(s => effective >= s.startDeg && effective < s.startDeg + s.sweepDeg) ?? slices[0];
          setWinner(hit.label);
          if (isPok) {
            // 당첨된 사람의 최신 풀을 즉시 가져와서 spinTwo에 전달
            const latestPool = personPoolsRef.current[hit.label] || defaultItems2;
            setItems2(latestPool);
            setTimeout(() => spinTwo(latestPool, hit.label), 600);
          } else {
            setIsSpinning(false);
          }
        }
      };
      requestAnimationFrame(animate1);
    };

    spinOne();
  };

  // SVG arc path 헬퍼
  const arcPath = (cx: number, cy: number, r: number, startDeg: number, sweepDeg: number) => {
    const s = (startDeg - 90) * Math.PI / 180;
    const e = (startDeg + sweepDeg - 90) * Math.PI / 180;
    const lg = sweepDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${lg} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)} Z`;
  };

  const renderWheel = (rot: number, wiggle: number, targetSlices: typeof slices) => (
    <div style={{ position: 'relative', width: '560px', height: '560px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ rotate: rot }} transition={{ duration: 0 }} style={{ width: '510px', height: '510px', position: 'relative' }}>
        <svg viewBox="-45 -45 590 590" style={{ width: '590px', height: '590px', position: 'absolute', top: '-40px', left: '-40px', overflow: 'visible' }}>
          <g id="pie-layer">
            {targetSlices.map((s, i) => <path key={i} d={arcPath(250, 250, 250, s.startDeg, s.sweepDeg)} fill={colors[i % colors.length]} stroke="#000" strokeWidth="1" strokeOpacity="0.15" />)}
          </g>
          <g id="labels-layer">
            {targetSlices.map((s, i) => {
              const midDeg = s.startDeg + s.sweepDeg / 2;
              const rad = (midDeg - 90) * Math.PI / 180;
              const lx = 250 + 175 * Math.cos(rad), ly = 255 + 175 * Math.sin(rad);
              const fontSize = s.sweepDeg < 15 ? 10 : s.sweepDeg < 25 ? 13 : 18;
              return (
                <text key={i} x={lx} y={ly} fill="white" fontSize={fontSize} fontWeight="900" textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${midDeg}, ${lx}, ${ly})`}>
                  {s.label}{s.weight > 1 ? ` ×${s.weight}` : ''}
                </text>
              );
            })}
          </g>
          <g id="pins-layer">
            {targetSlices.map((s, i) => { const r = (s.startDeg + s.sweepDeg - 90) * Math.PI / 180; return <g key={i}><circle cx={250 + 248 * Math.cos(r)} cy={250 + 248 * Math.sin(r)} r="10" fill="#fff" filter="url(#p-shad-l)" /><circle cx={250 + 248 * Math.cos(r)} cy={250 + 248 * Math.sin(r)} r="6" fill="#ddd" /></g>; })}
          </g>
          <defs><filter id="p-shad-l"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.8" /></filter></defs>
        </svg>
      </motion.div>
      <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none' }}>
        <motion.svg animate={{ rotate: wiggle }} transition={{ duration: 0 }} width="20" height="70" viewBox="0 0 20 70" style={{ overflow: 'visible', filter: 'drop-shadow(0 0 10px #ff2eb4)' }}>
          <path d="M 10 70 L 4 35 L 10 0 L 16 35 Z" fill="#ff2eb4" stroke="white" strokeWidth="1" />
          <circle cx="10" cy="35" r="2.5" fill="white" />
        </motion.svg>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {!isPok && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <button onClick={connectChat} disabled={isConnected} style={{ cursor: isConnected ? 'default' : 'pointer', background: isConnected ? '#111' : '#ffbd2e22', color: isConnected ? '#00ffa3' : '#ffbd2e', border: `1px solid ${isConnected ? '#00ffa3' : '#ffbd2e'}`, padding: '12px 30px', borderRadius: '15px', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isConnected ? '✅ 채팅 연결됨' : '+ 내 채널 채팅 연결 (도네이션 연동)'}
          </button>
        </div>
      )}

      {/* 리셋 버튼 추가 */}
      {isPok && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => {
            setItems(defaultItems);
            setItems2(defaultItems2);
            setPersonPools({});
            setWinner(null);
            setWinner2(null);
            setRotation(0);
            setRotation2(0);
            fetch(`${SOCKET_URL}/pok-roulette-state`, { method: 'DELETE' });
          }} style={{ background: '#333', color: 'white', padding: '10px 20px', borderRadius: '10px', fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>🔄 룰렛 초기화</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', padding: '10px 30px 30px 30px' }}>
        {/* 룰렛 휠 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {renderWheel(rotation, arrowWiggle, slices)}
            {isPok && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                {renderWheel(rotation2, arrowWiggle2, slices2)}
              </div>
            )}
          </div>
          {isPok && (winner || winner2) && (
            <div style={{ display: 'flex', gap: '100px', background: '#000', padding: '20px 60px', borderRadius: '20px', border: '2px solid #ff2eb4', boxShadow: '0 0 30px rgba(255, 46, 180, 0.3)' }}>
              {winner && <div style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, textShadow: '0 0 10px #ff2eb4' }}>{winner}</div>}
              {winner2 && <div style={{ color: '#00ffa3', fontSize: '2.5rem', fontWeight: 900, textShadow: '0 0 10px #00ffa3' }}>{winner2}</div>}
            </div>
          )}
        </div>

        {/* 설정 패널 */}
        <div style={{ width: '380px', background: '#050505', border: '1px solid #111', padding: '30px', borderRadius: '25px', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
          <h2 style={{ color: '#ff2eb4', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}><Settings2 /> SETTINGS</h2>
          {!isPok && (
            <>
              <div style={{ color: '#555', fontSize: '0.75rem', marginBottom: '12px' }}>※ "항목x숫자" 형식으로 비율 지정 (예: 치킨x3)</div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyPress={e => e.key === 'Enter' && addItem(newItem)} placeholder="항목명 또는 항목x3" style={{ flex: 1, background: '#000', border: '1px solid #222', color: 'white', padding: '12px', borderRadius: '10px' }} />
                <button onClick={() => addItem(newItem)} style={{ cursor: 'pointer', background: '#ff2eb4', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 900 }}>ADD</button>
              </div>
            </>
          )}
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#111', borderRadius: '8px', marginBottom: '8px', borderLeft: `4px solid ${colors[idx % colors.length]}` }}>
                <span style={{ flex: 1 }}>{it.label}</span>
                {/* weight 조절 */}
                {isPok ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '8px' }}>
                    <span style={{ color: colors[idx % colors.length], fontWeight: 900, minWidth: '28px', textAlign: 'center', fontSize: '0.85rem' }}>×{it.weight}</span>
                    <Trash2 size={16} color="#ff4b4b" style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => setItems(items.filter((_, i) => i !== idx))} />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                      <button onClick={() => setItems(prev => prev.map((x, i) => i === idx && x.weight > 1 ? { ...x, weight: x.weight - 1 } : x))} style={{ background: '#222', border: 'none', color: '#aaa', cursor: 'pointer', width: '22px', height: '22px', borderRadius: '4px', fontWeight: 900, fontSize: '1rem' }}>−</button>
                      <span style={{ color: colors[idx % colors.length], fontWeight: 900, minWidth: '28px', textAlign: 'center', fontSize: '0.85rem' }}>×{it.weight}</span>
                      <button onClick={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, weight: x.weight + 1 } : x))} style={{ background: '#222', border: 'none', color: '#aaa', cursor: 'pointer', width: '22px', height: '22px', borderRadius: '4px', fontWeight: 900, fontSize: '1rem' }}>+</button>
                    </div>
                    <Trash2 size={16} color="#ff4b4b" style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => setItems(items.filter((_, i) => i !== idx))} />
                  </>
                )}
              </div>
            ))}
          </div>
          <button onClick={spinRoulette} disabled={isSpinning} style={{ cursor: 'pointer', width: '100%', background: isSpinning ? '#222' : 'linear-gradient(45deg, #ff2eb4, #2e96ff)', padding: '18px', borderRadius: '15px', color: 'white', fontWeight: 900, border: 'none' }}>SPIN ROULETTE</button>
        </div>

        <AnimatePresence>{(!isPok && winner) && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}><motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} style={{ background: '#050505', padding: '60px 100px', borderRadius: '40px', border: '5px solid #ff2eb4', textAlign: 'center', boxShadow: '0 0 100px rgba(255, 46, 180, 0.6)' }}><PartyPopper size={80} color="#ff2eb4" style={{ marginBottom: '25px' }} />{winner && <div style={{ color: 'white', fontSize: '4.8rem', fontWeight: 900, textShadow: '0 0 40px #ff2eb4' }}>{winner}</div>}{winner2 && <div style={{ color: '#00ffa3', fontSize: '4.8rem', fontWeight: 900, textShadow: '0 0 40px #00ffa3', marginTop: winner ? '20px' : '0' }}>{winner2}</div>}<button onClick={() => { setWinner(null); setWinner2(null); }} style={{ cursor: 'pointer', marginTop: '40px', background: 'white', color: 'black', padding: '15px 70px', borderRadius: '15px', fontWeight: 900 }}>CLOSE</button></motion.div></motion.div>)}</AnimatePresence>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 💡 피드백 & 건의 게시판
// ─────────────────────────────────────────────
interface Feedback {
  id: string;
  sender: string;
  content: string;
  role: string;
  status: 'pending' | 'applied';
  createdAt: string;
}

const FeedbackBoard: React.FC<{ user: UserAuth }> = ({ user }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/feedbacks`);
      const data = await res.json();
      setFeedbacks(data);
    } catch { }
  };

  useEffect(() => {
    fetchFeedbacks();
    const onUpdate = (data: Feedback[]) => setFeedbacks(data);
    socket.on('feedbackUpdate', onUpdate);
    return () => { socket.off('feedbackUpdate', onUpdate); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setLoading(true);
    await fetch(`${SOCKET_URL}/feedbacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: user.name, content: newContent, role: user.role })
    });
    setNewContent('');
    setLoading(false);
    fetchFeedbacks();
  };

  const handleApply = async (id: string) => {
    await fetch(`${SOCKET_URL}/feedbacks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'applied' })
    });
    fetchFeedbacks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await fetch(`${SOCKET_URL}/feedbacks/${id}`, { method: 'DELETE' });
    fetchFeedbacks();
  };

  // 일반 멤버는 본인 글만, 어드민은 전체
  const isAdmin = user.role === 'admin' || user.role === 'host';
  const displayList = isAdmin
    ? feedbacks
    : feedbacks.filter(f => f.sender === user.name);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '10px 0' }}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', borderRadius: '20px', padding: '30px', border: '1px solid #333', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#ff6a00', fontWeight: 900, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sparkles size={28} /> 피드백 & 건의
        </h2>
        <p style={{ color: '#888', fontSize: '1rem', marginBottom: '25px' }}>방송 시스템 개선을 위한 제안이나 버그 제보를 자유롭게 남겨주세요.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="여기에 내용을 입력하세요..."
            style={{ width: '100%', height: '120px', background: '#050505', border: '1px solid #222', borderRadius: '15px', padding: '20px', color: 'white', fontSize: '1rem', outline: 'none', resize: 'none', transition: 'border-color 0.2s' }}
            onFocus={(e) => e.target.style.borderColor = '#ff6a00'}
            onBlur={(e) => e.target.style.borderColor = '#222'}
          />
          <button
            type="submit"
            disabled={loading || !newContent.trim()}
            style={{ alignSelf: 'flex-end', background: '#ff6a00', color: 'black', border: 'none', padding: '12px 35px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 5px 15px rgba(255, 106, 0, 0.3)', opacity: loading ? 0.5 : 1, transition: 'all 0.2s' }}
          >
            {loading ? '전송 중...' : '작성하기 ✉️'}
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {displayList.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', padding: '60px 0', fontSize: '1.1rem', fontWeight: 700 }}>작성된 피드백이 없습니다.</div>
        ) : (
          displayList.sort((a, b) => b.id.localeCompare(a.id)).map(f => (
            <div key={f.id} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '18px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', transition: 'transform 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#ff6a00' }}>{f.sender}</span>
                    <span style={{ fontSize: '0.75rem', color: '#555', background: '#1a1a1a', padding: '2px 8px', borderRadius: '6px' }}>{f.role}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#444' }}>{new Date(Number(f.id)).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {f.status === 'applied' && <span style={{ background: 'rgba(0, 255, 163, 0.1)', color: '#00ffa3', border: '1px solid #00ffa3', padding: '4px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>✓ 반영됨</span>}
                  {user.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {f.status !== 'applied' && (
                        <button onClick={() => handleApply(f.id)} style={{ background: '#00ffa3', color: 'black', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 900 }}>반영</button>
                      )}
                      <button onClick={() => handleDelete(f.id)} style={{ background: '#222', color: '#ff4b4b', border: '1px solid #ff4b4b', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 900 }}>삭제</button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ color: '#eee', fontSize: '1rem', whiteSpace: 'pre-line', lineHeight: '1.6', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>{f.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// 🏆 레이팅 보드
// ─────────────────────────────────────────────
type RatingLeague = '4000' | '5000' | '6000' | 'extra';
interface RatingCharacter {
  id: string;
  memberName: string;
  characterName: string;
  jobName?: string;
  league: RatingLeague;
  score: number;   // 등록 시 입력한 고정 점수
  rating: number;  // 대결로 변동되는 레이팅 (1000 시작)
  wins: number;
  losses: number;
  winStreak: number;
  registeredAt: string;
}

const LEAGUE_CONFIG: Record<RatingLeague, { label: string; color: string; bg: string; minRating: number }> = {
  '4000': { label: '4000점 리그', color: '#60a5fa', bg: 'linear-gradient(135deg, #0f1f3d 0%, #050d1f 100%)', minRating: 4000 },
  '5000': { label: '5000점 리그', color: '#34d399', bg: 'linear-gradient(135deg, #0a2a1e 0%, #050f0a 100%)', minRating: 5000 },
  '6000': { label: '6000점 리그', color: '#f59e0b', bg: 'linear-gradient(135deg, #2a1a00 0%, #0f0800 100%)', minRating: 6000 },
  'extra': { label: '번외 (4000점 이하)', color: '#a0a0a0', bg: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)', minRating: 0 },
};

const MEMBERS = ['찌모', '미랑', '갱쥰', '서씨', '떠기', '말구', '핸탄'];

const MEMBER_IMAGES: Record<string, string> = {
  '말구': '1.png',
  '서씨': '2.png',
  '갱쥰': '3.png',
  '미랑': '4.png',
  '찌모': '5.png',
  '핸탄': '6.png'
};

const RatingBoard: React.FC<{ user: UserAuth }> = ({ user }) => {
  const [characters, setCharacters] = useState<RatingCharacter[]>([]);
  const [battles, setBattles] = useState<any[]>([]);
  const [activeLeague, setActiveLeague] = useState<RatingLeague>('4000');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({ memberName: '', characterName: '', jobName: '', league: '4000' as RatingLeague, initialRating: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState('');
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState('');
  const [challengeTargetId, setChallengeTargetId] = useState<string | null>(null);
  const [battleListOpen, setBattleListOpen] = useState(true);
  const [submittingBattleId, setSubmittingBattleId] = useState<string | null>(null);

  const API = SOCKET_URL;

  const fetchRating = async () => {
    const res = await fetch(`${API}/rating`);
    const data = await res.json();
    setCharacters(data.characters || []);
    setBattles(data.battles || []);
  };

  useEffect(() => {
    fetchRating();
    // Socket.IO 실시간 업데이트 (전역 socket 재사용)
    const onRatingUpdate = (db: any) => { setCharacters(db.characters || []); setBattles(db.battles || []); };
    socket.on('ratingUpdate', onRatingUpdate);
    return () => { socket.off('ratingUpdate', onRatingUpdate); };
  }, []);

  const leagueChars = characters
    .filter(c => c.league === activeLeague)
    .sort((a, b) => b.rating - a.rating);

  const handleRegister = async () => {
    setErrorMsg('');
    if (!regForm.memberName || !regForm.characterName) { setErrorMsg('멤버와 캐릭터명을 입력하세요'); return; }
    const ratingNum = parseInt(regForm.initialRating);
    if (!regForm.initialRating || isNaN(ratingNum) || ratingNum < 0) { setErrorMsg('올바른 점수를 입력하세요'); return; }
    setLoading(true);
    const res = await fetch(`${API}/rating/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...regForm, initialRating: ratingNum })
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setShowRegisterModal(false);
      setRegForm({ memberName: '', characterName: '', jobName: '', league: '4000', initialRating: '' });
      fetchRating();
    } else {
      setErrorMsg(data.message || '등록 실패');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('캐릭터를 삭제하시겠습니까?')) return;
    await fetch(`${API}/rating/${id}`, { method: 'DELETE' });
    fetchRating();
  };

  const handleEditRating = async (id: string) => {
    const val = parseInt(editRating);
    if (isNaN(val) || val < 0) return;
    await fetch(`${API}/rating/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setRating: val })
    });
    setEditingId(null);
    setEditRating('');
    fetchRating();
  };

  const handleEditScore = async (id: string) => {
    const val = parseInt(editScore);
    if (isNaN(val) || val < 0) return;
    await fetch(`${API}/rating/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setScore: val })
    });
    setEditingScoreId(null);
    setEditScore('');
    fetchRating();
  };

  // 대결 신청
  const handleChallenge = async (challengerId: string, defenderId: string) => {
    const res = await fetch(`${API}/rating/battle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengerId, defenderId })
    });
    const data = await res.json();
    if (!data.success) alert(data.message);
    setChallengeTargetId(null);
    fetchRating();
  };

  // 대결 수락/거절
  const handleBattleAction = async (battleId: string, action: string, extra?: object) => {
    await fetch(`${API}/rating/battle/${battleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra })
    });
    fetchRating();
  };

  // 난입 신청
  const handleIntrude = async (battleId: string, intruderId: string) => {
    await fetch(`${API}/rating/battle/${battleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'intrude', intruderId })
    });
    fetchRating();
  };

  // 결과 입력
  const handleBattleResult = async (battleId: string, winnerId: string) => {
    if (submittingBattleId) return;
    setSubmittingBattleId(battleId);
    await fetch(`${API}/rating/battle/${battleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'result', winnerId })
    });
    await fetchRating();
    setSubmittingBattleId(null);
  };

  // 대결 삭제
  const handleBattleDelete = async (battleId: string) => {
    if (!confirm('대결 기록을 삭제하시겠습니까?')) return;
    await fetch(`${API}/rating/battle/${battleId}`, { method: 'DELETE' });
    fetchRating();
  };

  const cfg = LEAGUE_CONFIG[activeLeague];
  const isAdmin = user.role === 'admin' || user.role === 'host';
  const isMember = MEMBERS.includes(user.name);
  const canRegister = isAdmin || isMember;
  // 현재 리그에서 본인 캐릭터
  const myLeagueChar = characters.find(c => c.memberName === user.name && c.league === activeLeague) || null;
  // 현재 리그 대결 목록
  const leagueBattles = battles.filter(b => b.league === activeLeague);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '10px 0' }}>
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
              fontWeight: 900, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
            }}>
              <span>{c.label}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{count}명 참가</span>
            </button>
          );
        })}
      </div>

      {/* 리그 헤더 */}
      <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: '16px', padding: '20px 24px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: cfg.color, fontWeight: 900, fontSize: '1.4rem' }}>🏆 {cfg.label}</h2>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: '0.85rem' }}>기준 레이팅: {cfg.minRating}점 · 승 +20 / 패 -20</p>
        </div>
        {canRegister && (
          <button onClick={() => {
            setShowRegisterModal(true);
            // 멤버면 자동으로 본인 이름 세팅
            setRegForm({ memberName: isMember && !isAdmin ? user.name : '', characterName: '', jobName: '', league: activeLeague, initialRating: '' });
          }} style={{
            background: cfg.color, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem'
          }}>+ 캐릭터 등록</button>
        )}
      </div>

      {/* 순위표 */}
      {leagueChars.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#444', padding: '60px 0', fontSize: '1rem' }}>
          등록된 캐릭터가 없습니다.<br />
          <span style={{ fontSize: '0.85rem', color: '#333' }}>관리자가 캐릭터를 등록하면 여기에 표시됩니다.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {leagueChars.map((char, idx) => {
            const rank = idx + 1;
            const winRate = char.wins + char.losses > 0 ? Math.round(char.wins / (char.wins + char.losses) * 100) : 0;
            const isOnFire = (char.winStreak || 0) >= 5;
            const isGangJunActive = char.memberName === '갱쥰' && battles.some(b =>
              ['pending', 'accepted'].includes(b.status) &&
              (b.challengerId === char.id || b.defenderId === char.id)
            );
            return (
              <div key={char.id} className={isGangJunActive ? 'blue-fire-streak' : isOnFire ? 'fire-streak' : ''} style={{
                background: rank === 1 ? `${cfg.bg}, linear-gradient(90deg, ${cfg.color}11 0%, transparent 100%)` : '#0d0d0d',
                border: `1px solid ${rank <= 3 ? cfg.color + '44' : '#1a1a1a'}`,
                borderRadius: '12px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: '16px',
                transition: 'all 0.2s'
              }}>
                {/* 순위 */}
                <div style={{ minWidth: '40px', textAlign: 'center', fontSize: rank <= 3 ? '1.5rem' : '1rem', fontWeight: 900, color: rank <= 3 ? cfg.color : '#555' }}>
                  {getRankIcon(rank)}
                </div>
                {/* 캐릭터 정보 */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#fff' }}>{char.characterName}</span>
                    {char.jobName && <span style={{ fontSize: '0.82rem', color: '#a78bfa', background: '#1e1030', padding: '1px 8px', borderRadius: '4px', border: '1px solid #4c1d95' }}>{char.jobName}</span>}
                    {isOnFire && (
                      <span title={`${char.winStreak}연승 중!`} style={{ fontSize: '1.1rem', lineHeight: 1, filter: 'drop-shadow(0 0 6px #ff6a00)' }}>
                        {'🔥'.repeat(Math.min(Math.floor((char.winStreak || 0) / 5), 3))}
                      </span>
                    )}
                    <span style={{ fontSize: '0.78rem', color: '#666', background: '#1a1a1a', padding: '2px 8px', borderRadius: '20px' }}>{char.memberName}</span>
                    <a
                      href={`https://lopec.kr/character/specPoint/${encodeURIComponent(char.characterName)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '0.72rem',
                        color: '#a78bfa',
                        background: 'rgba(167, 139, 250, 0.1)',
                        border: '1px solid rgba(167, 139, 250, 0.3)',
                        padding: '2px 10px',
                        borderRadius: '20px',
                        textDecoration: 'none',
                        fontWeight: 900,
                        marginLeft: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      로펙 🔗
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#666' }}>
                    <span style={{ color: '#4ade80' }}>▲ {char.wins}승</span>
                    <span style={{ color: '#f87171' }}>▼ {char.losses}패</span>
                    <span>승률 {winRate}%</span>
                    {isOnFire && <span style={{ color: '#ff6a00', fontWeight: 900 }}>🔥 {char.winStreak}연승</span>}
                  </div>
                  {isGangJunActive && (
                    <div style={{ marginTop: '6px', fontSize: '0.72rem', fontWeight: 900, color: '#00cfff', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                      <span>🔥</span>
                      <span>주의! 어둠의 갱맨은 점수를 500점 이상 내려주세요. 너무 강력한 상대입니다.</span>
                      <span>🔥</span>
                    </div>
                  )}
                </div>
                {/* 점수(고정) + 레이팅 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', minWidth: '130px' }}>
                  {/* 고정 점수 */}
                  {(() => {
                    const canEditScore = isAdmin || char.memberName === user.name;
                    return editingScoreId === char.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editScore}
                          onChange={e => setEditScore(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleEditScore(char.id); if (e.key === 'Escape') { setEditingScoreId(null); setEditScore(''); } }}
                          autoFocus
                          style={{ width: '90px', padding: '5px 8px', borderRadius: '6px', border: `1px solid ${cfg.color}`, background: '#0a0a0a', color: cfg.color, fontSize: '0.95rem', fontWeight: 900, textAlign: 'right' }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleEditScore(char.id)} style={{ background: cfg.color, color: '#000', border: 'none', padding: '3px 8px', borderRadius: '5px', fontWeight: 900, cursor: 'pointer', fontSize: '0.75rem' }}>저장</button>
                          <button onClick={() => { setEditingScoreId(null); setEditScore(''); }} style={{ background: '#1a1a1a', color: '#888', border: '1px solid #333', padding: '3px 6px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => canEditScore ? (setEditingScoreId(char.id), setEditScore(String(char.score ?? char.rating))) : null}
                        title={canEditScore ? '클릭해서 점수 수정' : ''}
                        style={{ textAlign: 'right', cursor: canEditScore ? 'pointer' : 'default' }}
                      >
                        <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '1px' }}>점수 (고정)</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: cfg.color }}>{(char.score ?? char.rating).toLocaleString()}<span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#555', marginLeft: '3px' }}>점</span></div>
                      </div>
                    );
                  })()}
                  {/* 레이팅 (대결 변동) */}
                  {editingId === char.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editRating}
                        onChange={e => setEditRating(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEditRating(char.id); if (e.key === 'Escape') { setEditingId(null); setEditRating(''); } }}
                        autoFocus
                        style={{ width: '90px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #a78bfa', background: '#0a0a0a', color: '#a78bfa', fontSize: '0.95rem', fontWeight: 900, textAlign: 'right' }}
                      />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleEditRating(char.id)} style={{ background: '#a78bfa', color: '#000', border: 'none', padding: '3px 8px', borderRadius: '5px', fontWeight: 900, cursor: 'pointer', fontSize: '0.75rem' }}>저장</button>
                        <button onClick={() => { setEditingId(null); setEditRating(''); }} style={{ background: '#1a1a1a', color: '#888', border: '1px solid #333', padding: '3px 6px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => isAdmin ? (setEditingId(char.id), setEditRating(String(char.rating))) : null}
                      title={isAdmin ? '클릭해서 레이팅 수정' : ''}
                      style={{ textAlign: 'right', cursor: isAdmin ? 'pointer' : 'default' }}
                    >
                      <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '1px' }}>레이팅</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#a78bfa' }}>{char.rating.toLocaleString()}<span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#555', marginLeft: '3px' }}>점</span></div>
                    </div>
                  )}
                </div>
                {/* 대결 신청 버튼 (본인 캐릭터 아닌 경우) */}
                {char.memberName !== user.name && myLeagueChar && char.id !== myLeagueChar.id && (() => {
                  const hasOngoing = battles.some(b =>
                    ['pending', 'accepted'].includes(b.status) &&
                    ([b.challengerId, b.defenderId].includes(myLeagueChar.id)) &&
                    ([b.challengerId, b.defenderId].includes(char.id))
                  );
                  return !hasOngoing ? (
                    challengeTargetId === char.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'center' }}>대결 신청?</span>
                        <button onClick={() => handleChallenge(myLeagueChar.id, char.id)} style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem' }}>확인 ⚔️</button>
                        <button onClick={() => setChallengeTargetId(null)} style={{ background: '#1a1a1a', color: '#666', border: '1px solid #333', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>취소</button>
                      </div>
                    ) : (
                      <button onClick={() => setChallengeTargetId(char.id)} style={{ background: '#2d1b6e', color: '#a78bfa', border: '1px solid #4c1d95', padding: '8px 14px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>⚔️ 대결 신청</button>
                    )
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#555', padding: '8px', whiteSpace: 'nowrap' }}>대결 중</span>
                  );
                })()}
                {/* 관리자 버튼 */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                    <button onClick={() => handleDelete(char.id)} style={{ background: '#1a1a1a', color: '#555', border: '1px solid #333', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>삭제</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 대결 목록 */}
      {leagueBattles.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <div
            onClick={() => setBattleListOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer', userSelect: 'none', padding: '10px 14px', borderRadius: '10px', background: '#111', border: '1px solid #2a2a2a' }}
          >
            <span style={{ color: '#e2e8f0', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.5px' }}>⚔️ 대결 현황</span>
            <span style={{ fontSize: '0.8rem', color: '#a78bfa', background: '#1e1030', border: '1px solid #4c1d95', borderRadius: '20px', padding: '2px 10px', fontWeight: 700 }}>{leagueBattles.length}건</span>
            <span style={{ marginLeft: 'auto', fontSize: '1rem', color: '#a78bfa', fontWeight: 900, transition: 'transform 0.2s', display: 'inline-block', transform: battleListOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
          </div>
          {battleListOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leagueBattles.map(b => {
              const isPending = b.status === 'pending';
              const isIntrusionPending = b.status === 'intrusion_pending';
              const isTripleAccepted = b.status === 'triple_accepted';
              const isAccepted = b.status === 'accepted';
              const isCompleted = b.status === 'completed';
              const isDefender = b.defenderMember === user.name;
              const isChallenger = b.challengerMember === user.name;
              const isIntruder = b.intruderMember === user.name;
              const isParticipant = isChallenger || isDefender || isIntruder;

              // 난입 가능 여부: pending 상태이고, 내 캐릭터가 있고, 이미 참여 중이 아닌 경우
              const canIntrude = isPending && myLeagueChar &&
                myLeagueChar.memberName !== b.challengerMember &&
                myLeagueChar.memberName !== b.defenderMember;

              const statusColor =
                isPending ? '#f59e0b' :
                  isIntrusionPending ? '#f97316' :
                    isTripleAccepted ? '#a78bfa' :
                      isAccepted ? '#60a5fa' :
                        isCompleted ? '#4ade80' : '#555';
              const statusLabel =
                isPending ? '신청 중' :
                  isIntrusionPending ? '⚡ 난입 신청' :
                    isTripleAccepted ? '⚡ 3자 대결' :
                      isAccepted ? '대결 수락됨' :
                        isCompleted ? '완료' : '거절됨';

              const winnerName = b.winnerId === b.challengerId ? b.challengerName
                : b.winnerId === b.defenderId ? b.defenderName
                  : b.intruderName;

              const isSubmitting = submittingBattleId === b.id;

              return (
                <div key={b.id} style={{ background: '#0d0d0d', border: `1px solid ${statusColor}33`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* 상태 뱃지 */}
                  <span style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}55`, borderRadius: '20px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 900, whiteSpace: 'nowrap' }}>{statusLabel}</span>

                  {/* 대결 정보 */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { id: b.challengerId, name: b.challengerName, member: b.challengerMember },
                      { id: b.defenderId, name: b.defenderName, member: b.defenderMember },
                      ...(b.intruderId ? [{ id: b.intruderId, name: b.intruderName, member: b.intruderMember }] : [])
                    ].map((p, i) => {
                      const isWinner = b.winnerId === p.id;
                      const isLoser = b.loserIds ? b.loserIds.includes(p.id) : b.loserId === p.id;
                      return (
                        <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {i > 0 && <span style={{ color: '#444', fontWeight: 900, margin: '0 2px' }}>vs</span>}
                          <span style={{ fontWeight: 900, color: isWinner ? '#4ade80' : isLoser ? '#f87171' : '#fff' }}>{p.name}</span>
                          <span style={{ fontSize: '0.78rem', color: '#555' }}>({p.member})</span>
                          {i === 2 && !isCompleted && <span style={{ fontSize: '0.7rem', color: '#f97316', background: '#2a1500', border: '1px solid #f97316', borderRadius: '8px', padding: '1px 6px', marginLeft: '2px' }}>난입</span>}
                        </span>
                      );
                    })}
                    {isCompleted && (
                      <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 900 }}>
                        🏆 {winnerName} 승리 · {b.isTriple ? '승+50 / 패-20' : `±${b.ratingChange}점`}
                      </span>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>

                    {/* 1:1 수락/거절 */}
                    {isPending && (isDefender || isAdmin) && (
                      <>
                        <button onClick={() => handleBattleAction(b.id, 'accept')} style={{ background: '#1e3a5f', color: '#60a5fa', border: '1px solid #1d4ed8', padding: '6px 12px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem' }}>✅ 수락</button>
                        <button onClick={() => handleBattleAction(b.id, 'reject')} style={{ background: '#2a1515', color: '#f87171', border: '1px solid #7f1d1d', padding: '6px 12px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem' }}>❌ 거절</button>
                      </>
                    )}

                    {/* 난입 신청 버튼 */}
                    {canIntrude && (
                      <button onClick={() => handleIntrude(b.id, myLeagueChar!.id)} style={{ background: '#2a1500', color: '#f97316', border: '1px solid #f97316', padding: '6px 12px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem' }}>⚡ 난입</button>
                    )}

                    {/* 난입 수락/거절 - 원래 참여자(challenger/defender) or admin */}
                    {isIntrusionPending && (isChallenger || isDefender || isAdmin) && (
                      <>
                        <button onClick={() => handleBattleAction(b.id, 'accept_intrusion')} style={{ background: '#1e1a3f', color: '#a78bfa', border: '1px solid #7c3aed', padding: '6px 12px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem' }}>⚡ 난입 수락</button>
                        <button onClick={() => handleBattleAction(b.id, 'reject_intrusion')} style={{ background: '#2a1515', color: '#f87171', border: '1px solid #7f1d1d', padding: '6px 12px', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem' }}>❌ 난입 거절</button>
                      </>
                    )}

                    {/* 3자 대결 결과 입력 */}
                    {isTripleAccepted && (isAdmin || isParticipant) && (
                      <>
                        {[
                          { id: b.challengerId, name: b.challengerName },
                          { id: b.defenderId, name: b.defenderName },
                          { id: b.intruderId, name: b.intruderName },
                        ].map(p => (
                          <button key={p.id} disabled={isSubmitting} onClick={() => handleBattleResult(b.id, p.id)} style={{ background: isSubmitting ? '#1a1a1a' : '#1e1a3f', color: isSubmitting ? '#444' : '#a78bfa', border: '1px solid #7c3aed', padding: '6px 10px', borderRadius: '8px', fontWeight: 900, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: isSubmitting ? 0.5 : 1 }}>
                            {isSubmitting ? '...' : `🏆 ${p.name} 승`}
                          </button>
                        ))}
                      </>
                    )}

                    {/* 1:1 결과 입력 */}
                    {isAccepted && (isAdmin || isChallenger || isDefender) && (
                      <>
                        <button disabled={isSubmitting} onClick={() => handleBattleResult(b.id, b.challengerId)} style={{ background: isSubmitting ? '#1a1a1a' : '#14532d', color: isSubmitting ? '#444' : '#4ade80', border: '1px solid #166534', padding: '6px 12px', borderRadius: '8px', fontWeight: 900, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: isSubmitting ? 0.5 : 1 }}>{isSubmitting ? '처리 중...' : `🏆 ${b.challengerName} 승`}</button>
                        <button disabled={isSubmitting} onClick={() => handleBattleResult(b.id, b.defenderId)} style={{ background: isSubmitting ? '#1a1a1a' : '#14532d', color: isSubmitting ? '#444' : '#4ade80', border: '1px solid #166534', padding: '6px 12px', borderRadius: '8px', fontWeight: 900, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.8rem', opacity: isSubmitting ? 0.5 : 1 }}>{isSubmitting ? '처리 중...' : `🏆 ${b.defenderName} 승`}</button>
                      </>
                    )}

                    {/* 삭제 - admin만 */}
                    {isAdmin && (
                      <button onClick={() => handleBattleDelete(b.id)} style={{ background: '#2a1515', color: '#f87171', border: '1px solid #7f1d1d', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>🗑 삭제</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
      )}

      {/* 등록 모달 */}
      {showRegisterModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '20px', padding: '32px', width: '380px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 20px', color: '#fff', fontWeight: 900 }}>🏆 캐릭터 등록</h3>

            <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '6px' }}>리그 선택</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['4000', '5000', '6000', 'extra'] as RatingLeague[]).map(lg => (
                <button key={lg} onClick={() => setRegForm(f => ({ ...f, league: lg }))} style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${regForm.league === lg ? LEAGUE_CONFIG[lg].color : '#333'}`,
                  background: regForm.league === lg ? LEAGUE_CONFIG[lg].bg : 'transparent',
                  color: regForm.league === lg ? LEAGUE_CONFIG[lg].color : '#555',
                  fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem'
                }}>{lg}점</button>
              ))}
            </div>

            <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '6px' }}>멤버</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: isAdmin ? '8px' : '16px' }}>
              {(isAdmin ? MEMBERS : [user.name]).map(m => (
                <button key={m} onClick={() => isAdmin && setRegForm(f => ({ ...f, memberName: m }))} style={{
                  padding: '7px 14px', borderRadius: '20px', border: `1px solid ${regForm.memberName === m ? '#00ffa3' : '#333'}`,
                  background: regForm.memberName === m ? '#0a2a1e' : 'transparent',
                  color: regForm.memberName === m ? '#00ffa3' : '#666',
                  fontWeight: 700, cursor: isAdmin ? 'pointer' : 'default', fontSize: '0.85rem'
                }}>{m} {!isAdmin && <span style={{ color: '#555', fontSize: '0.75rem' }}>(나)</span>}</button>
              ))}
            </div>
            {/* 게스트 옵션 - admin/host만 */}
            {isAdmin && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ width: '100%', height: '1px', background: '#1a1a1a', margin: '0 0 8px' }} />
                <button onClick={() => setRegForm(f => ({ ...f, memberName: '게스트' }))} style={{
                  padding: '7px 14px', borderRadius: '20px', border: `1px solid ${regForm.memberName === '게스트' ? '#f59e0b' : '#333'}`,
                  background: regForm.memberName === '게스트' ? '#2a1a00' : 'transparent',
                  color: regForm.memberName === '게스트' ? '#f59e0b' : '#666',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
                }}>👤 게스트 <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>(여러 캐릭 가능)</span></button>
              </div>
            )}

            <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '6px' }}>캐릭터명</label>
            <input
              value={regForm.characterName}
              onChange={e => setRegForm(f => ({ ...f, characterName: e.target.value }))}
              placeholder="캐릭터명 입력"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #333', background: '#0a0a0a', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '12px' }}
            />

            <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '6px' }}>직업명</label>
            <input
              value={regForm.jobName}
              onChange={e => setRegForm(f => ({ ...f, jobName: e.target.value }))}
              placeholder="직업명 입력"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #333', background: '#0a0a0a', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '12px' }}
            />

            <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '6px' }}>현재 점수</label>
            <input
              type="text"
              inputMode="numeric"
              value={regForm.initialRating}
              onChange={e => setRegForm(f => ({ ...f, initialRating: e.target.value }))}
              placeholder={`점수 입력 (예: ${regForm.league})`}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${LEAGUE_CONFIG[regForm.league].color}55`, background: '#0a0a0a', color: LEAGUE_CONFIG[regForm.league].color, fontSize: '1rem', fontWeight: 900, boxSizing: 'border-box', marginBottom: '12px' }}
            />

            {errorMsg && <p style={{ color: '#f87171', fontSize: '0.85rem', margin: '0 0 12px' }}>{errorMsg}</p>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowRegisterModal(false); setErrorMsg(''); }} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: '#888', fontWeight: 700, cursor: 'pointer' }}>취소</button>
              <button onClick={handleRegister} disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: LEAGUE_CONFIG[regForm.league].color, color: '#000', fontWeight: 900, cursor: 'pointer' }}>
                {loading ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// 🎯 핀볼 게임
// ─────────────────────────────────────────────
const PinballGame: React.FC = () => {
  const CW = 560, CH = 2800;
  const GRAVITY = 0.18;
  const BALL_R = 10;
  const BALL_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#f06595', '#00ffa3'];

  type Ball = { x: number; y: number; vx: number; vy: number; r: number; color: string; active: boolean; trail: { x: number; y: number }[]; name: string; slowFrames: number };
  type PendingBall = { name: string; color: string };
  type PegObs = { kind: 'peg'; x: number; y: number; r: number };
  type BumperObs = { kind: 'bumper'; x: number; y: number; r: number; label: string; pts: number; hitTime: number };
  type RampObs = { kind: 'ramp'; x1: number; y1: number; x2: number; y2: number };
  type SpinnerObs = { kind: 'spinner'; cx: number; cy: number; len: number; angle: number; speed: number };
  type Obstacle = PegObs | BumperObs | RampObs | SpinnerObs;
  type GoalSlot = { x: number; w: number; label: string; color: string; pts: number; count: number };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const obsRef = useRef<Obstacle[]>([]);
  const pendingRef = useRef<PendingBall[]>([]);
  const [pending, setPending] = useState<PendingBall[]>([]);
  const [newBallName, setNewBallName] = useState('');
  const [totalScore, setTotalScore] = useState(0);
  const [ballCount, setBallCount] = useState(0);
  const totalScoreRef = useRef(0);
  const [lastArrival, setLastArrival] = useState<{ name: string; color: string; slotLabel: string; isJackpot: boolean } | null>(null);
  const lastArrivedRef = useRef<{ name: string; color: string; slotLabel: string; isJackpot: boolean } | null>(null);
  const lastArrivalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 6 슬롯 — 가운데 JACKPOT
  const SLOT_W = Math.floor(CW / 6);
  const INIT_GOALS: GoalSlot[] = [
    { x: 0, w: SLOT_W, label: '꽝', color: '#555', pts: 0, count: 0 },
    { x: SLOT_W, w: SLOT_W, label: '꽝', color: '#555', pts: 0, count: 0 },
    { x: SLOT_W * 2, w: SLOT_W, label: '꽝', color: '#555', pts: 0, count: 0 },
    { x: SLOT_W * 3, w: SLOT_W, label: '💎JACKPOT', color: '#ffd700', pts: 1, count: 0 },
    { x: SLOT_W * 4, w: SLOT_W, label: '꽝', color: '#555', pts: 0, count: 0 },
    { x: SLOT_W * 5, w: CW - SLOT_W * 5, label: '꽝', color: '#555', pts: 0, count: 0 },
  ];
  const goalsRef = useRef<GoalSlot[]>(INIT_GOALS.map(g => ({ ...g })));
  const [goals, setGoals] = useState<GoalSlot[]>(INIT_GOALS);

  // Build obstacles once
  useEffect(() => {
    const obs: Obstacle[] = [];
    const wideXs = [45, 125, 205, 285, 365, 445, 515];  // 7 pegs
    const narrowXs = [85, 165, 245, 325, 405, 480];       // 6 pegs

    // 구역별 장애물 구성
    // ── Zone 0: 진입 램프 (y 80~180) ──
    obs.push({ kind: 'ramp', x1: 0, y1: 80, x2: 100, y2: 170 });
    obs.push({ kind: 'ramp', x1: CW, y1: 80, x2: CW - 100, y2: 170 });

    // ── Zone 1: 첫 번째 핀 구역 (y 190~430) ──
    const z1rows = [190, 235, 280, 325, 370, 415];
    z1rows.forEach((y, i) => {
      const xs = i % 2 === 0 ? wideXs : narrowXs;
      xs.forEach(x => obs.push({ kind: 'peg', x, y, r: 7 }));
    });
    obs.push({ kind: 'spinner', cx: 140, cy: 253, len: 38, angle: 0, speed: 0.04 });
    obs.push({ kind: 'spinner', cx: 420, cy: 253, len: 38, angle: Math.PI / 2, speed: -0.04 });

    // ── Zone 2: 범퍼 구역 1 (y 460~640) ──
    obs.push({ kind: 'bumper', x: 140, y: 530, r: 28, label: 'BOOM', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 280, y: 490, r: 32, label: '💎', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 420, y: 530, r: 28, label: 'BOOM', pts: 0, hitTime: 0 });
    obs.push({ kind: 'ramp', x1: 0, y1: 460, x2: 80, y2: 500 });
    obs.push({ kind: 'ramp', x1: CW, y1: 460, x2: CW - 80, y2: 500 });
    [590, 635].forEach((y, i) => {
      const xs = i % 2 === 0 ? narrowXs : wideXs;
      xs.forEach(x => obs.push({ kind: 'peg', x, y, r: 7 }));
    });

    // ── Zone 3: 두 번째 핀 구역 (y 680~950) ──
    const z3rows = [680, 725, 770, 815, 860, 905, 950];
    z3rows.forEach((y, i) => {
      const xs = i % 2 === 0 ? wideXs : narrowXs;
      xs.forEach(x => obs.push({ kind: 'peg', x, y, r: 7 }));
    });

    // ── Zone 4: 스피너 구역 (y 980~1150) ──
    obs.push({ kind: 'spinner', cx: 100, cy: 1040, len: 45, angle: 0, speed: 0.05 });
    obs.push({ kind: 'spinner', cx: 280, cy: 1010, len: 45, angle: Math.PI / 3, speed: -0.05 });
    obs.push({ kind: 'spinner', cx: 460, cy: 1040, len: 45, angle: Math.PI * 0.7, speed: 0.05 });
    [1090, 1135].forEach((y, i) => {
      const xs = i % 2 === 0 ? narrowXs : wideXs;
      xs.forEach(x => obs.push({ kind: 'peg', x, y, r: 7 }));
    });

    // ── Zone 5: 세 번째 핀 구역 (y 1175~1490) ──
    const z5rows = [1175, 1220, 1265, 1310, 1355, 1400, 1445, 1490];
    z5rows.forEach((y, i) => {
      const xs = i % 2 === 0 ? wideXs : narrowXs;
      xs.forEach(x => obs.push({ kind: 'peg', x, y, r: 7 }));
    });
    // Zone 5 중간 스피너 (속도 다양)
    obs.push({ kind: 'spinner', cx: 80, cy: 1290, len: 36, angle: 0, speed: 0.09 });
    obs.push({ kind: 'spinner', cx: 280, cy: 1330, len: 50, angle: Math.PI * 0.5, speed: -0.03 });
    obs.push({ kind: 'spinner', cx: 480, cy: 1290, len: 36, angle: Math.PI * 0.8, speed: 0.12 });

    // ── Zone 6: 범퍼 구역 2 (y 1530~1720) ──
    obs.push({ kind: 'bumper', x: 80, y: 1590, r: 26, label: 'BOOM', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 185, y: 1555, r: 26, label: 'BOOM', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 280, y: 1590, r: 30, label: '💎', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 375, y: 1555, r: 26, label: 'BOOM', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 480, y: 1590, r: 26, label: 'BOOM', pts: 0, hitTime: 0 });
    obs.push({ kind: 'ramp', x1: 0, y1: 1530, x2: 55, y2: 1570 });
    obs.push({ kind: 'ramp', x1: CW, y1: 1530, x2: CW - 55, y2: 1570 });
    [1660, 1710].forEach((y, i) => {
      const xs = i % 2 === 0 ? narrowXs : wideXs;
      xs.forEach(x => obs.push({ kind: 'peg', x, y, r: 7 }));
    });

    // ── Zone 7: 네 번째 핀 구역 (y 1755~2020) ──
    const z7rows = [1755, 1800, 1845, 1890, 1935, 1980, 2025];
    z7rows.forEach((y, i) => {
      const xs = i % 2 === 0 ? wideXs : narrowXs;
      xs.forEach(x => obs.push({ kind: 'peg', x, y, r: 7 }));
    });
    obs.push({ kind: 'spinner', cx: 180, cy: 1867, len: 40, angle: 0, speed: -0.04 });
    obs.push({ kind: 'spinner', cx: 380, cy: 1867, len: 40, angle: Math.PI / 2, speed: 0.04 });
    // Zone 7 추가 스피너 (빠른 것 / 느린 것 혼합)
    obs.push({ kind: 'spinner', cx: 280, cy: 1960, len: 55, angle: Math.PI * 0.3, speed: -0.10 });
    obs.push({ kind: 'spinner', cx: 60, cy: 2000, len: 32, angle: Math.PI * 0.7, speed: 0.15 });
    obs.push({ kind: 'spinner', cx: 500, cy: 2000, len: 32, angle: Math.PI * 1.2, speed: -0.07 });

    // ── Zone 8: 다섯 번째 핀 구역 (y 2065~2330) ──
    const z8rows = [2065, 2110, 2155, 2200, 2245, 2290, 2335];
    z8rows.forEach((y, i) => {
      const xs = i % 2 === 0 ? wideXs : narrowXs;
      xs.forEach(x => obs.push({ kind: 'peg', x, y, r: 7 }));
    });
    // Zone 8 중간 스피너 (속도 다양)
    obs.push({ kind: 'spinner', cx: 140, cy: 2170, len: 42, angle: Math.PI * 0.2, speed: 0.08 });
    obs.push({ kind: 'spinner', cx: 420, cy: 2170, len: 42, angle: Math.PI * 1.1, speed: -0.13 });
    obs.push({ kind: 'spinner', cx: 280, cy: 2260, len: 48, angle: Math.PI * 0.6, speed: 0.05 });

    // ── Zone 9: 범퍼 구역 3 + 마지막 핀 (y 2360~2600) ──
    obs.push({ kind: 'bumper', x: 100, y: 2390, r: 26, label: 'BOOM', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 210, y: 2360, r: 26, label: 'BOOM', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 280, y: 2400, r: 30, label: '💎', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 350, y: 2360, r: 26, label: 'BOOM', pts: 0, hitTime: 0 });
    obs.push({ kind: 'bumper', x: 460, y: 2390, r: 26, label: 'BOOM', pts: 0, hitTime: 0 });
    const z9rows = [2450, 2495, 2540, 2585, 2630];
    z9rows.forEach((y, i) => {
      const xs = i % 2 === 0 ? wideXs : narrowXs;
      xs.forEach(x => obs.push({ kind: 'peg', x, y, r: 7 }));
    });

    // ── 골 근처 대형 스피너 2개 (좌/우) ──
    obs.push({ kind: 'spinner', cx: 185, cy: 2700, len: 110, angle: 0, speed: -0.06 });
    obs.push({ kind: 'spinner', cx: 430, cy: 2700, len: 110, angle: Math.PI / 2, speed: 0.06 });

    // ── 최종 깔때기 램프 (y 2670~2750) ──
    obs.push({ kind: 'ramp', x1: 0, y1: 2660, x2: SLOT_W * 3, y2: 2740 });
    obs.push({ kind: 'ramp', x1: CW, y1: 2660, x2: SLOT_W * 3 + SLOT_W, y2: 2740 });

    obsRef.current = obs;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;

    // ─── Collision helpers ───
    const collideBallCircle = (ball: Ball, cx: number, cy: number, cr: number, restitution: number, boost = 0): boolean => {
      const dx = ball.x - cx, dy = ball.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minD = ball.r + cr;
      if (dist < minD && dist > 0.001) {
        const nx = dx / dist, ny = dy / dist;
        ball.x += nx * (minD - dist);
        ball.y += ny * (minD - dist);
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * dot * nx) * restitution + nx * boost;
        ball.vy = (ball.vy - 2 * dot * ny) * restitution + ny * boost;
        return true;
      }
      return false;
    };

    const collideBallSegment = (ball: Ball, x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return;
      const t = Math.max(0, Math.min(1, ((ball.x - x1) * dx + (ball.y - y1) * dy) / len2));
      const cx = x1 + t * dx, cy = y1 + t * dy;
      const ex = ball.x - cx, ey = ball.y - cy;
      const dist = Math.sqrt(ex * ex + ey * ey);
      if (dist < ball.r && dist > 0.001) {
        const nx = ex / dist, ny = ey / dist;
        ball.x += nx * (ball.r - dist);
        ball.y += ny * (ball.r - dist);
        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * dot * nx) * 0.55;
        ball.vy = (ball.vy - 2 * dot * ny) * 0.55;
      }
    };

    // ─── Update physics ───
    const MAX_SPEED = 15;
    const SUBSTEPS = 2;
    const update = () => {
      const now = Date.now();
      // Rotate spinners (1회만)
      for (const obs of obsRef.current) {
        if (obs.kind === 'spinner') obs.angle += obs.speed;
      }

      for (const ball of ballsRef.current) {
        if (!ball.active) continue;

        // Trail (서브스텝 전 한 번)
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 10) ball.trail.shift();

        // 서브스텝: 속도를 잘게 나눠 충돌 검사 → 터널링 방지
        for (let step = 0; step < SUBSTEPS; step++) {
          ball.vy += GRAVITY / SUBSTEPS;
          ball.vx *= Math.pow(0.999, 1 / SUBSTEPS);
          ball.x += ball.vx / SUBSTEPS;
          ball.y += ball.vy / SUBSTEPS;

          // 최대 속도 제한
          const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          if (spd > MAX_SPEED) { ball.vx = ball.vx / spd * MAX_SPEED; ball.vy = ball.vy / spd * MAX_SPEED; }

          // Wall bounce
          if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.65; }
          if (ball.x + ball.r > CW) { ball.x = CW - ball.r; ball.vx = -Math.abs(ball.vx) * 0.65; }

          // Obstacles
          for (const obs of obsRef.current) {
            if (obs.kind === 'peg') {
              collideBallCircle(ball, obs.x, obs.y, obs.r, 0.62);
            } else if (obs.kind === 'bumper') {
              const hit = collideBallCircle(ball, obs.x, obs.y, obs.r, 0.92, 6);
              if (hit) { obs.hitTime = now; }
            } else if (obs.kind === 'ramp') {
              collideBallSegment(ball, obs.x1, obs.y1, obs.x2, obs.y2);
            } else if (obs.kind === 'spinner') {
              const cos = Math.cos(obs.angle), sin = Math.sin(obs.angle);
              collideBallSegment(ball,
                obs.cx - cos * obs.len, obs.cy - sin * obs.len,
                obs.cx + cos * obs.len, obs.cy + sin * obs.len
              );
            }
          }
        } // end substep

        // Slow-frame 정체 감지 → 랜덤 탈출 점프
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed < 0.6) {
          ball.slowFrames = (ball.slowFrames || 0) + 1;
          if (ball.slowFrames > 90) {
            ball.vx += (Math.random() - 0.5) * 6;
            ball.vy -= 3 + Math.random() * 4;
            ball.slowFrames = 0;
          }
        } else {
          ball.slowFrames = 0;
        }

        // Goal detection
        if (ball.y + ball.r > CH - 45 && ball.active) {
          ball.active = false;
          const gIdx = goalsRef.current.findIndex(g => ball.x >= g.x && ball.x < g.x + g.w);
          const slot = gIdx >= 0 ? goalsRef.current[gIdx] : null;
          if (slot) {
            const updated = goalsRef.current.map((g, i) => i === gIdx ? { ...g, count: g.count + 1 } : g);
            goalsRef.current = updated;
            setGoals([...updated]);
            if (slot.pts > 0) { totalScoreRef.current += 1; setTotalScore(totalScoreRef.current); }
            lastArrivedRef.current = { name: ball.name, color: ball.color, slotLabel: slot.label, isJackpot: slot.pts > 0 };
          }
        }
      }

      // 공끼리 충돌 (O(n²))
      const activeBalls = ballsRef.current.filter(b => b.active);
      for (let i = 0; i < activeBalls.length; i++) {
        for (let j = i + 1; j < activeBalls.length; j++) {
          const a = activeBalls[i], b = activeBalls[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minD = a.r + b.r;
          if (dist < minD && dist > 0.001) {
            const nx = dx / dist, ny = dy / dist;
            const overlap = (minD - dist) / 2;
            a.x -= nx * overlap; a.y -= ny * overlap;
            b.x += nx * overlap; b.y += ny * overlap;
            const relVx = a.vx - b.vx, relVy = a.vy - b.vy;
            const dot = relVx * nx + relVy * ny;
            if (dot > 0) {
              const impulse = dot * 0.85;
              a.vx -= impulse * nx; a.vy -= impulse * ny;
              b.vx += impulse * nx; b.vy += impulse * ny;
            }
          }
        }
      }

      ballsRef.current = ballsRef.current.filter(b => b.active || b.y < CH + 80);

      // 모든 공 골인 완료 시 마지막 이름 표시
      if (ballsRef.current.length === 0 && lastArrivedRef.current) {
        const info = lastArrivedRef.current;
        lastArrivedRef.current = null;
        if (lastArrivalTimer.current) clearTimeout(lastArrivalTimer.current);
        setLastArrival(info);
        lastArrivalTimer.current = setTimeout(() => setLastArrival(null), 6000);
      }
    };

    // ─── Render ───
    const render = () => {
      const now = Date.now();
      ctx.clearRect(0, 0, CW, CH);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, '#080818');
      bg.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CW, CH);

      // Border
      ctx.strokeStyle = '#1a1a3a';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, CW - 3, CH - 3);

      // ─── Ramps ───
      for (const obs of obsRef.current) {
        if (obs.kind !== 'ramp') continue;
        ctx.save();
        ctx.shadowColor = '#00ffa3';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#00ffa3';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(obs.x1, obs.y1);
        ctx.lineTo(obs.x2, obs.y2);
        ctx.stroke();
        ctx.restore();
      }

      // ─── Spinners ───
      for (const obs of obsRef.current) {
        if (obs.kind !== 'spinner') continue;
        const cos = Math.cos(obs.angle), sin = Math.sin(obs.angle);
        ctx.save();
        ctx.shadowColor = '#cc5de8';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#cc5de8';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(obs.cx - cos * obs.len, obs.cy - sin * obs.len);
        ctx.lineTo(obs.cx + cos * obs.len, obs.cy + sin * obs.len);
        ctx.stroke();
        // Center pivot
        ctx.beginPath();
        ctx.arc(obs.cx, obs.cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#cc5de8';
        ctx.fill();
        ctx.restore();
      }

      // ─── Pegs ───
      for (const obs of obsRef.current) {
        if (obs.kind !== 'peg') continue;
        ctx.save();
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
        const pg = ctx.createRadialGradient(obs.x - 2, obs.y - 2, 1, obs.x, obs.y, obs.r);
        pg.addColorStop(0, '#e0e8ff');
        pg.addColorStop(1, '#8090c0');
        ctx.fillStyle = pg;
        ctx.shadowColor = '#6080ff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      // ─── Bumpers ───
      for (const obs of obsRef.current) {
        if (obs.kind !== 'bumper') continue;
        const isHit = now - obs.hitTime < 250;
        const baseCol = obs.label === '💎' ? '#ffd700' : '#ff6b6b';
        ctx.save();
        const grd = ctx.createRadialGradient(obs.x, obs.y, 2, obs.x, obs.y, obs.r);
        grd.addColorStop(0, isHit ? '#ffffff' : baseCol);
        grd.addColorStop(0.6, isHit ? baseCol : baseCol + '99');
        grd.addColorStop(1, baseCol + '22');
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.shadowColor = baseCol;
        ctx.shadowBlur = isHit ? 40 : 18;
        ctx.fill();
        ctx.strokeStyle = isHit ? '#fff' : baseCol;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = isHit ? '#000' : '#fff';
        ctx.font = `bold ${obs.label === '💎' ? 16 : 10}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(obs.label, obs.x, obs.y);
        ctx.restore();
      }

      // ─── Balls (trail + sphere) ───
      for (const ball of ballsRef.current) {
        if (!ball.active && ball.y > CH) continue;
        // Trail
        for (let i = 0; i < ball.trail.length; i++) {
          const alpha = (i / ball.trail.length) * 0.35;
          const trailR = ball.r * ((i + 1) / ball.trail.length) * 0.75;
          ctx.beginPath();
          ctx.arc(ball.trail[i].x, ball.trail[i].y, trailR, 0, Math.PI * 2);
          const hex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
          ctx.fillStyle = ball.color + hex;
          ctx.fill();
        }
        // Sphere gradient
        const sg = ctx.createRadialGradient(ball.x - ball.r * 0.3, ball.y - ball.r * 0.35, ball.r * 0.1, ball.x, ball.y, ball.r);
        sg.addColorStop(0, '#ffffff');
        sg.addColorStop(0.35, ball.color);
        sg.addColorStop(1, ball.color + '66');
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fillStyle = sg;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.restore();
        // 공 이름
        ctx.save();
        ctx.shadowBlur = 3; ctx.shadowColor = '#000';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(ball.name.slice(0, 6), ball.x, ball.y - ball.r - 1);
        ctx.restore();
      }

      // ─── Goal slots ───
      const gY = CH - 48;
      // Divider pins
      for (const g of goalsRef.current) {
        ctx.fillStyle = '#888';
        ctx.fillRect(g.x, gY - 14, 3, 62);
      }
      ctx.fillStyle = '#888';
      ctx.fillRect(CW - 3, gY - 14, 3, 62);

      for (const g of goalsRef.current) {
        ctx.save();
        ctx.fillStyle = g.color + '44';
        ctx.fillRect(g.x + 3, gY, g.w - 3, 48);
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = g.color;
        ctx.shadowColor = g.color;
        ctx.shadowBlur = g.pts >= 100 ? 12 : 0;
        ctx.fillText(g.label, g.x + g.w / 2, gY + 15);
        ctx.shadowBlur = 0;
        if (g.count > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`×${g.count}`, g.x + g.w / 2, gY + 34);
        }
        ctx.restore();
      }

      // ─── Launch zone marker ───
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#ffffff18';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(CW, 30);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    const loop = () => { update(); render(); animId = requestAnimationFrame(loop); };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const enqueueBall = (name: string) => {
    if (!name.trim()) return;
    const color = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
    const next = [...pendingRef.current, { name: name.trim(), color }];
    pendingRef.current = next;
    setPending([...next]);
    setNewBallName('');
  };

  const removePending = (idx: number) => {
    const next = pendingRef.current.filter((_, i) => i !== idx);
    pendingRef.current = next;
    setPending([...next]);
  };

  const launchAll = () => {
    if (pendingRef.current.length === 0) return;
    const pb = pendingRef.current;
    const spacing = Math.min(60, (CW - 40) / pb.length);
    const totalW = spacing * (pb.length - 1);
    const startX = (CW - totalW) / 2;
    pb.forEach((p, i) => {
      const x = startX + i * spacing;
      ballsRef.current.push({ x, y: 20, vx: (Math.random() - 0.5) * 3, vy: 0, r: BALL_R, color: p.color, active: true, trail: [], name: p.name, slowFrames: 0 });
    });
    setBallCount(c => c + pb.length);
    pendingRef.current = [];
    setPending([]);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const resetGame = () => {
    ballsRef.current = [];
    pendingRef.current = [];
    setPending([]);
    lastArrivedRef.current = null;
    setLastArrival(null);
    const fresh = INIT_GOALS.map(g => ({ ...g }));
    goalsRef.current = fresh;
    setGoals(fresh);
    totalScoreRef.current = 0;
    setTotalScore(0);
    setBallCount(0);
  };

  const btnStyle = (color: string): React.CSSProperties => ({
    cursor: 'pointer', width: '100%', padding: '12px', borderRadius: '12px',
    border: `1px solid ${color}44`, background: color + '22', color,
    fontWeight: 900, fontSize: '0.9rem',
  });

  return (
    <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', justifyContent: 'center', padding: '10px 0', position: 'relative' }}>
      {/* 마지막 도착 오버레이 */}
      {lastArrival && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 9999, textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ background: lastArrival.isJackpot ? 'radial-gradient(circle, #ffd70044, #00000088)' : 'radial-gradient(circle, #33333388, #00000088)', borderRadius: '24px', padding: '36px 56px', border: `2px solid ${lastArrival.isJackpot ? '#ffd700' : '#555'}`, boxShadow: lastArrival.isJackpot ? '0 0 80px #ffd700aa' : '0 0 30px #00000088' }}>
            {lastArrival.isJackpot && <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>}
            <div style={{ color: lastArrival.color, fontSize: '2.4rem', fontWeight: 900, textShadow: `0 0 20px ${lastArrival.color}` }}>{lastArrival.name}</div>
            <div style={{ color: lastArrival.isJackpot ? '#ffd700' : '#aaa', fontSize: '1.1rem', marginTop: '8px', fontWeight: 700 }}>{lastArrival.slotLabel}</div>
          </div>
        </div>
      )}

      {/* Canvas — 스크롤 가능 */}
      <div ref={scrollRef} style={{ height: '720px', overflowY: 'scroll', borderRadius: '12px', border: '2px solid #1a1a3a', boxShadow: '0 0 40px rgba(0,100,255,0.15)', scrollbarWidth: 'thin', scrollbarColor: '#333 #111' }}>
        <canvas ref={canvasRef} width={CW} height={CH} style={{ display: 'block' }} />
      </div>

      {/* Control panel */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Score */}
        <div style={{ background: '#111', borderRadius: '16px', padding: '18px', textAlign: 'center', border: '1px solid #ffd70033' }}>
          <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 700 }}>💎 JACKPOT</div>
          <div style={{ color: '#ffd700', fontSize: '2.6rem', fontWeight: 900, textShadow: '0 0 24px #ffd700aa' }}>{totalScore}</div>
          <div style={{ color: '#555', fontSize: '0.72rem', marginTop: '4px' }}>공 {ballCount}개 발사됨</div>
        </div>

        {/* 공 이름 입력 */}
        <div style={{ background: '#111', borderRadius: '12px', padding: '12px', border: '1px solid #333' }}>
          <div style={{ color: '#aaa', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px' }}>🎱 공 추가</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={newBallName}
              onChange={e => setNewBallName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enqueueBall(newBallName)}
              placeholder="이름 입력"
              style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '6px 8px', fontSize: '0.8rem', outline: 'none' }}
            />
            <button onClick={() => enqueueBall(newBallName)} style={{ background: '#00ffa322', border: '1px solid #00ffa344', color: '#00ffa3', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 900 }}>+</button>
          </div>
        </div>

        {/* 대기 목록 */}
        {pending.length > 0 && (
          <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '10px', border: '1px solid #222', maxHeight: '180px', overflowY: 'auto' }}>
            <div style={{ color: '#666', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px' }}>대기 중 ({pending.length})</div>
            {pending.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
                  <span style={{ color: '#ccc', fontSize: '0.78rem' }}>{p.name}</span>
                </div>
                <button onClick={() => removePending(i)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.75rem', padding: '0 4px' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* 출발 버튼 */}
        <button onClick={launchAll} disabled={pending.length === 0}
          style={{ cursor: pending.length > 0 ? 'pointer' : 'default', width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: pending.length > 0 ? 'linear-gradient(90deg,#ff6b6b,#ff922b)' : '#222', color: pending.length > 0 ? 'white' : '#444', fontWeight: 900, fontSize: '1rem', transition: 'all 0.2s' }}>
          🚀 출발하기 {pending.length > 0 ? `(${pending.length}개)` : ''}
        </button>

        <button onClick={resetGame} style={btnStyle('#ff4b4b')}>🔄 초기화</button>

        {/* Legend */}
        <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '12px', border: '1px solid #1a1a1a', fontSize: '0.75rem' }}>
          <div style={{ color: '#666', fontWeight: 900, marginBottom: '8px' }}>장애물 종류</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ color: '#8090c0' }}>⚪ 핀 — 기본 튕김</div>
            <div style={{ color: '#ff6b6b' }}>🔴 범퍼 — 강한 반발</div>
            <div style={{ color: '#00ffa3' }}>📐 램프 — 방향 유도</div>
            <div style={{ color: '#cc5de8' }}>🌀 스피너 — 회전 막대</div>
          </div>
        </div>

        {/* Jackpot count */}
        <div style={{ background: '#ffd70011', borderRadius: '12px', padding: '12px', border: '1px solid #ffd70033', textAlign: 'center' }}>
          <div style={{ color: '#ffd700', fontSize: '0.75rem', fontWeight: 900, marginBottom: '4px' }}>JACKPOT 횟수</div>
          <div style={{ color: '#ffd700', fontSize: '1.8rem', fontWeight: 900 }}>{goals.find(g => g.pts > 0)?.count ?? 0}</div>
          <div style={{ color: '#555', fontSize: '0.7rem', marginTop: '4px' }}>꽝: {goals.filter(g => g.pts === 0).reduce((s, g) => s + g.count, 0)}회</div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// OBS 오버레이용 사운드 재생 (AudioContext — autoplay 정책 우회)
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
const audioBufferCache = new Map<string, AudioBuffer>();
async function playOverlaySfx(url: string) {
  try {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    if (!audioBufferCache.has(url)) {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      audioBufferCache.set(url, await audioCtx.decodeAudioData(arr));
    }
    const src = audioCtx.createBufferSource();
    src.buffer = audioBufferCache.get(url)!;
    src.connect(audioCtx.destination);
    src.start(0);
  } catch (e) { console.warn('sfx error', e); }
}

// 🎥 OBS 오버레이 — 미션보드 (투명 배경)
// ?overlay=mission 으로 접근
// ?w=500&h=720 으로 사이즈 조절 (기본 500×720)
// ─────────────────────────────────────────────
const MissionBoardOverlay: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const W = parseInt(params.get('w') || '500', 10);
  const H = parseInt(params.get('h') || '720', 10);

  const [missions, setMissions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${SOCKET_URL}/missions`).then(r => r.json()).then(data => setMissions(data));
    const handleNew = (m: any) => {
      if (m.type !== 'rogada') playOverlaySfx('/squeaky_mission_sound.mp3');
      setMissions(p => [...p, m]);
    };
    const handleUpdate = (m: any) => setMissions(p => p.map(o => String(o.id) === String(m.id) ? m : o));
    const handleDel = (id: string) => setMissions(p => p.filter(m => String(m.id) !== String(id)));
    socket.on('newMission', handleNew);
    socket.on('updateMission', handleUpdate);
    socket.on('missionDeleted', handleDel);
    return () => {
      socket.off('newMission', handleNew);
      socket.off('updateMission', handleUpdate);
      socket.off('missionDeleted', handleDel);
    };
  }, []);

  const mainMissions = missions.filter(m => m.type !== 'rogada');
  const grouped = new Map<string, any[]>();
  mainMissions.forEach(m => {
    const key = (m.content.startsWith('!미션 ') ? m.content.replace('!미션 ', '') : m.content).trim().toLowerCase();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  });
  const groups = Array.from(grouped.values());

  return (
    <div style={{ width: `${W}px`, height: `${H}px`, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', boxSizing: 'border-box', background: 'transparent' }}>
      {groups.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1rem', fontWeight: 700 }}>미션 없음</span>
        </div>
      ) : (
        <AnimatePresence>
          {groups.map(group => {
            const mission = group[0];
            const count = group.length;
            const contentFixed = mission.content.startsWith('!미션 ') ? mission.content.replace('!미션 ', '') : mission.content;
            const isLadder = contentFixed.includes('의리사다리');
            const isLive = mission.status === 'accepted';
            return (
              <motion.div
                key={mission.id}
                layout
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: '#0a0a0a',
                  border: `2px solid ${isLive ? '#00ffa3' : isLadder ? '#ffbd2e' : '#2a2a2a'}`,
                  boxSizing: 'border-box', width: '100%', flexShrink: 0,
                  boxShadow: isLadder ? '0 0 12px rgba(255,189,46,0.2)' : 'none',
                }}
              >
                <div style={{ flexShrink: 0, padding: '3px 8px', borderRadius: '5px', background: isLive ? '#00ffa3' : '#333', color: isLive ? 'black' : '#888', fontSize: '0.6rem', fontWeight: 900 }}>
                  {isLive ? 'LIVE' : 'WAIT'}
                </div>
                {count > 1 && (
                  <div style={{ flexShrink: 0, background: '#ff4b4b', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>
                    {count}
                  </div>
                )}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                    {highlightMissionText(contentFixed, isLadder ? '#ffbd2e' : 'white')}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: isLadder ? '#ffbd2e88' : '#00ffa388', fontWeight: 600 }}>
                    @{mission.creator}{count > 1 ? ` 외 ${count - 1}명` : ''}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};

// ?overlay=rogada&member=찌모 으로 접근
// ?w=500&h=720 으로 사이즈 조절 (기본 500×720)
// ─────────────────────────────────────────────
const RogadaBoardOverlay: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const W = parseInt(params.get('w') || '500', 10);
  const H = parseInt(params.get('h') || '720', 10);
  const memberParam = params.get('member') || '';

  const [missions, setMissions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${SOCKET_URL}/missions`).then(r => r.json()).then(data => setMissions(data));
    const handleNew = (m: any) => {
      if (m.type === 'rogada' && m.target === memberParam) playOverlaySfx('/ttiring_ttirring.mp3');
      setMissions(p => [...p, m]);
    };
    const handleUpdate = (m: any) => {
      if (m.status === 'completed' || m.status === 'rejected') {
        setMissions(p => p.filter(o => String(o.id) !== String(m.id)));
      } else {
        setMissions(p => p.map(o => String(o.id) === String(m.id) ? m : o));
      }
    };
    const handleDel = (id: string) => setMissions(p => p.filter(m => String(m.id) !== String(id)));
    socket.on('newMission', handleNew);
    socket.on('updateMission', handleUpdate);
    socket.on('missionDeleted', handleDel);
    return () => {
      socket.off('newMission', handleNew);
      socket.off('updateMission', handleUpdate);
      socket.off('missionDeleted', handleDel);
    };
  }, []);

  const memberMissions = missions.filter(m => m.type === 'rogada' && m.target === memberParam && m.status !== 'completed');

  return (
    <div style={{ width: `${W}px`, height: `${H}px`, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', boxSizing: 'border-box', background: 'transparent' }}>
      {memberMissions.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1rem', fontWeight: 700 }}>미션 없음</span>
        </div>
      ) : (
        <AnimatePresence>
          {memberMissions.map(mission => {
            const isLive = mission.status === 'accepted';
            const isPrivate = !!mission.private;
            return (
              <motion.div
                key={mission.id}
                layout
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: '#0a0a0a',
                  border: `2px solid ${isLive ? '#00ffa3' : '#2a2a2a'}`,
                  boxSizing: 'border-box', width: '100%', flexShrink: 0,
                  boxShadow: 'none',
                }}
              >
                <div style={{ flexShrink: 0, padding: '3px 8px', borderRadius: '5px', background: isLive ? '#00ffa3' : '#333', color: isLive ? 'black' : '#888', fontSize: '0.6rem', fontWeight: 900 }}>
                  {isLive ? 'LIVE' : 'WAIT'}
                </div>
                {isPrivate && (
                  <div style={{ flexShrink: 0, padding: '3px 7px', borderRadius: '5px', background: '#2a1a3a', color: '#bb88ff', fontSize: '0.6rem', fontWeight: 900 }}>
                    🔒 비공개
                  </div>
                )}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                    {highlightMissionText(mission.content, 'white')}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#00ffa388', fontWeight: 600 }}>
                    @{mission.creator}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};

// OBS 오버레이 진입점 — 모든 컴포넌트 정의 후 마지막에 위치
const App: React.FC = () => {
  const overlayParam = new URLSearchParams(window.location.search).get('overlay');
  const isOverlay = overlayParam === 'true' || overlayParam === 'mission' || overlayParam === 'rogada';

  useEffect(() => {
    if (isOverlay) {
      document.body.classList.add('overlay-mode');
      document.body.style.backgroundColor = 'transparent';
      document.body.style.background = 'transparent';
      document.getElementById('root')?.classList.add('overlay-root');
    }
    return () => {
      document.body.classList.remove('overlay-mode');
      document.body.style.backgroundColor = '';
      document.body.style.background = '';
      document.getElementById('root')?.classList.remove('overlay-root');
    };
  }, [isOverlay]);

  if (overlayParam === 'rogada') return <RogadaBoardOverlay />;
  if (overlayParam === 'mission') return <MissionBoardOverlay />;
  if (overlayParam === 'true') return <HamsterOverlay />;
  return <AppMain />;
};

export default App;
