import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Trophy, Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Types
interface Mission {
  id: string;
  content: string;
  time: number | null; // minutes (null means no time limit)
  createdAt: number;
  creator: string;
  count: number;
}

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:4000' : '';

const App: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    // Initial fetch
    fetch(`${SOCKET_URL}/missions`)
      .then(res => res.json())
      .then(data => setMissions(data))
      .catch(err => console.error('API Fetch error:', err));

    // Socket setup
    const newSocket = io(SOCKET_URL);

    newSocket.on('newMission', (mission: Mission) => {
      setMissions(prev => [...prev, mission]);
    });

    newSocket.on('updateMission', (updatedMission: Mission) => {
      setMissions(prev => prev.map(m => m.id === updatedMission.id ? updatedMission : m));
    });

    newSocket.on('missionDeleted', (id: string) => {
      setMissions(prev => prev.filter(m => m.id !== id));
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const deleteMission = async (id: string) => {
    try {
      await fetch(`${SOCKET_URL}/missions/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <>
      <header className="title">
        <Trophy size={20} />
        CHZZK MISSION BOARD
      </header>

      <div className="mission-list">
        <AnimatePresence>
          {missions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="empty-state"
            >
              No active missions...
            </motion.div>
          ) : (
            missions.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onDelete={() => deleteMission(mission.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

interface MissionCardProps {
  mission: Mission;
  onDelete: () => void;
}

const MissionCard: React.FC<MissionCardProps> = ({ mission, onDelete }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const totalDurationSeconds = mission.time ? mission.time * 60 : null;

  useEffect(() => {
    if (!totalDurationSeconds) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - mission.createdAt) / 1000);
      const remaining = Math.max(0, totalDurationSeconds - elapsed);
      setTimeLeft(remaining);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [mission, totalDurationSeconds]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft !== null && totalDurationSeconds !== null) 
    ? (timeLeft / totalDurationSeconds) * 100 
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`mission-card glass ${mission.count > 1 ? 'is-duplicate' : ''}`}
      style={{
        boxShadow: mission.count > 5 ? '0 0 15px rgba(0, 255, 163, 0.4)' : undefined
      }}
    >
      {/* 중복 횟수 배지 */}
      <AnimatePresence mode="wait">
        {mission.count > 1 && (
          <motion.div
            key={mission.count}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="count-badge"
          >
            ×{mission.count}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p className="mission-content">{mission.content}</p>
        <button 
          onClick={onDelete}
          style={{ 
            background: 'none', border: 'none', color: '#ff4b4b', cursor: 'pointer',
            opacity: 0.5, transition: 'opacity 0.2s', zIndex: 1
          }}
          className="delete-btn"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      {mission.time !== null && timeLeft !== null && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="mission-time">
              <Clock size={16} style={{ marginRight: '8px', verticalAlign: 'middle', marginTop: '-4px', opacity: 0.7 }} />
              {formatTime(timeLeft)}
            </div>
            {timeLeft === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffbd2e', fontWeight: 700, fontSize: '0.8rem' }}
              >
                <CheckCircle2 size={14} /> TIME UP!
              </motion.div>
            )}
          </div>

          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${progress}%`,
                background: timeLeft < 60 ? 'linear-gradient(90deg, #ff4b4b, #ff8c00)' : 'linear-gradient(90deg, #00ffa3, #00d1ff)'
              }}
            />
          </div>
        </>
      )}

      {mission.time === null && (
        <div style={{ display: 'flex', alignItems: 'center', color: '#ffbd2e', fontSize: '0.8rem', gap: '5px' }}>
          <Trophy size={14} style={{ opacity: 0.7 }} />
          NO TIME LIMIT
        </div>
      )}

      {/* 최초 등록자 정보 */}
      <div style={{ 
        marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-sub)', 
        display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 
      }}>
        <motion.span style={{ color: 'var(--primary-color)' }}>@{mission.creator}</motion.span> 가 처음 등록함
      </div>
    </motion.div>
  );
};

export default App;
