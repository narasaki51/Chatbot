import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

const IS_DEV = window.location.port === '5173';
const SOCKET_URL = IS_DEV ? `http://${window.location.hostname}:4000` : '';
const socket = io(SOCKET_URL);

type QuizMode = 'ox' | 'choice';

interface QuizState {
  isActive: boolean;
  mode: QuizMode;
  question: string;
  correctAnswer: string;
  choice1: string;
  choice2: string;
  answers: { sender: string; answer: string; timestamp: number; channel: string }[];
  startedAt: string | null;
  endedAt: string | null;
  isConsecutiveMode: boolean;
}

const QuizOverlay: React.FC = () => {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetch(`${SOCKET_URL}/quiz/state`)
      .then(r => r.json())
      .then(data => setQuiz(data));

    const onUpdate = (state: QuizState) => {
      setQuiz(state);
      // 퀴즈가 시작되거나 종료되면 editing 상태 해제
      if (state.isActive || state.endedAt) setIsEditing(false);
    };
    const onEditing = () => setIsEditing(true);
    socket.on('quizUpdate', onUpdate);
    socket.on('quizEditing', onEditing);
    return () => {
      socket.off('quizUpdate', onUpdate);
      socket.off('quizEditing', onEditing);
    };
  }, []);

  // 상태 판단
  const isRevealed = quiz && !quiz.isActive && quiz.endedAt && quiz.correctAnswer;
  const isWaiting = isEditing || !quiz || (!quiz.isActive && !quiz.endedAt);
  const isLive = !isEditing && quiz?.isActive;

  const correctCount = isRevealed
    ? (quiz.mode === 'choice'
      ? quiz.answers.length
      : quiz.answers.filter(a => a.answer === quiz.correctAnswer).length)
    : 0;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      <AnimatePresence mode="wait">
        {/* 대기 중 */}
        {isWaiting && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            style={{
              background: 'rgba(10, 10, 20, 0.85)',
              border: '2px solid rgba(100, 116, 139, 0.4)',
              borderRadius: '24px',
              padding: '40px 60px',
              textAlign: 'center',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>⌨️</div>
            <div style={{ color: '#94a3b8', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.05em' }}>
              문제 입력 중...
            </div>
          </motion.div>
        )}

        {/* 진행 중 */}
        {isLive && (
          <motion.div
            key="live"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              background: 'rgba(8, 14, 28, 0.9)',
              border: `2px solid ${quiz.mode === 'ox' ? 'rgba(96, 165, 250, 0.6)' : 'rgba(167, 139, 250, 0.6)'}`,
              borderRadius: '28px',
              padding: '48px 70px',
              textAlign: 'center',
              backdropFilter: 'blur(16px)',
              boxShadow: `0 0 60px ${quiz.mode === 'ox' ? 'rgba(96,165,250,0.2)' : 'rgba(167,139,250,0.2)'}, 0 20px 60px rgba(0,0,0,0.8)`,
              maxWidth: '900px',
              width: '90vw',
            }}
          >
            {/* LIVE 배지 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{
                  background: '#1a3a1a',
                  color: '#4ade80',
                  padding: '4px 16px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                }}
              >
                ● LIVE
              </motion.div>
              <div style={{
                background: quiz.mode === 'ox' ? '#0f1f3d' : '#1e1030',
                color: quiz.mode === 'ox' ? '#60a5fa' : '#a78bfa',
                padding: '4px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 900,
              }}>
                {quiz.mode === 'ox' ? 'O / X 퀴즈' : '선착순 정답'}
              </div>
              {quiz.isConsecutiveMode && (
                <div style={{
                  background: '#3b0f0f',
                  color: '#f87171',
                  padding: '4px 16px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                }}>
                  🔥 연속체크
                </div>
              )}
            </div>

            {/* 문제 */}
            <div style={{
              fontSize: quiz.question ? '2.2rem' : '1.5rem',
              fontWeight: 900,
              color: quiz.question ? '#ffffff' : '#475569',
              lineHeight: 1.4,
              marginBottom: '24px',
              textShadow: '0 2px 10px rgba(0,0,0,0.6)',
            }}>
              {quiz.question || '퀴즈가 진행 중입니다...'}
            </div>

            {/* O/X 힌트 */}
            {quiz.mode === 'ox' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px' }}>
                {['O', 'X'].map(v => {
                  const count = quiz.answers.filter(a => a.answer === v).length;
                  const total = quiz.answers.length || 1;
                  const pct = Math.round(count / total * 100);
                  return (
                    <div key={v} style={{
                      background: v === 'O' ? '#0a2a1a' : '#2a0a0a',
                      border: `1px solid ${v === 'O' ? '#4ade8044' : '#f8717144'}`,
                      borderRadius: '14px',
                      padding: '14px 32px',
                      minWidth: '120px',
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: v === 'O' ? '#4ade80' : '#f87171' }}>
                        {v === 'O' ? '⭕ O' : '❌ X'}
                      </div>
                      <div style={{ color: v === 'O' ? '#4ade80' : '#f87171', fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}>
                        {count}명 ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 선착순 응답 수 (진행 중에는 명단 대신 숫자만) */}
            {quiz.mode === 'choice' && (
              <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: '1.2rem', marginTop: '16px' }}>
                🏆 현재 {quiz.answers.length}명 응답 중
              </div>
            )}
          </motion.div>
        )}

        {/* 정답 공개 */}
        {isRevealed && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: 'backOut' }}
            style={{
              background: 'rgba(5, 20, 10, 0.92)',
              border: '2px solid rgba(74, 222, 128, 0.6)',
              borderRadius: '28px',
              padding: '48px 70px',
              textAlign: 'center',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 80px rgba(74,222,128,0.25), 0 20px 60px rgba(0,0,0,0.8)',
              maxWidth: '900px',
              width: '90vw',
            }}
          >
            <div style={{ fontSize: '1rem', color: '#4ade80aa', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '10px' }}>
              ✅ 정답 공개
            </div>

            {/* 퀴즈 문제 (작게) */}
            {quiz.question && (
              <div style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                {quiz.question}
              </div>
            )}

            {/* 정답 */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: 'backOut' }}
              style={{
                fontSize: '3.5rem',
                fontWeight: 900,
                color: '#4ade80',
                textShadow: '0 0 30px rgba(74,222,128,0.6)',
                marginBottom: '20px',
              }}
            >
              {quiz.mode === 'ox'
                ? (quiz.correctAnswer === 'O' ? '⭕ O' : '❌ X')
                : quiz.correctAnswer
              }
            </motion.div>

            {/* 정답자 수 */}
            <div style={{
              display: 'inline-block',
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              borderRadius: '14px',
              padding: '10px 28px',
              color: '#4ade80',
              fontWeight: 900,
              fontSize: '1.2rem',
              marginBottom: '24px'
            }}>
              정답자 {correctCount}명
            </div>

            {/* 종료 후 정답자 명단 (최대 30명) */}
            {quiz.answers.length > 0 && (
              <div style={{ width: '100%', marginTop: '10px' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '10px', 
                  maxHeight: '400px', 
                  overflow: 'hidden',
                  padding: '0 10px'
                }}>
                  {(quiz.mode === 'choice' ? quiz.answers : quiz.answers.filter(a => a.answer === quiz.correctAnswer)).slice(0, 30).map((a, i) => {
                    const time = new Date(a.timestamp);
                    const timeStr = `${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}.${String(Math.floor(time.getMilliseconds() / 10)).padStart(2, '0')}`;
                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.03 }}
                        key={i} 
                        style={{ 
                          background: 'rgba(74, 222, 128, 0.1)', 
                          border: '1px solid rgba(74, 222, 128, 0.3)', 
                          borderRadius: '10px', 
                          padding: '8px 12px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          fontSize: '0.9rem'
                        }}
                      >
                        <span style={{ color: '#4ade80', fontWeight: 900, marginRight: '8px' }}>#{i + 1}</span>
                        <span style={{ color: '#fff', fontWeight: 700, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: '#ffffff88', fontSize: '0.8rem' }}>{a.channel}:</span>{a.sender}
                        </span>
                        <span style={{ color: 'rgba(74, 222, 128, 0.6)', fontSize: '0.7rem', fontWeight: 600 }}>{timeStr}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizOverlay;
