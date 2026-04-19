import React, { useEffect, useRef, useState } from 'react';
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
  winner: { sender: string; answer: string; timestamp: number; channel: string } | null;
}

const QuizOverlay: React.FC = () => {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 룰렛 상태
  const [rouletteEntry, setRouletteEntry] = useState<{ channel: string; sender: string } | null>(null);
  const [rouletteFlash, setRouletteFlash] = useState(0);
  const [rouletteDone, setRouletteDone] = useState(false);
  const prevEndedAt = useRef<string | null>(null);

  const fetchState = () => {
    fetch(`${SOCKET_URL}/quiz/state`)
      .then(r => r.json())
      .then((data: QuizState) => {
        setQuiz(data);
        if (data.endedAt && data.winner) {
          setRouletteEntry({ channel: data.winner.channel, sender: data.winner.sender });
          setRouletteDone(true);
          prevEndedAt.current = data.endedAt;
        }
      });
  };

  useEffect(() => {
    fetchState();

    const onUpdate = (state: QuizState) => {
      setQuiz(state);
      if (state.isActive || state.endedAt) setIsEditing(false);
    };
    const onEditing = () => setIsEditing(true);
    // 재연결 시 최신 상태 재조회 (놓친 quizUpdate 복구)
    const onReconnect = () => fetchState();

    socket.on('quizUpdate', onUpdate);
    socket.on('quizEditing', onEditing);
    socket.on('connect', onReconnect);
    return () => {
      socket.off('quizUpdate', onUpdate);
      socket.off('quizEditing', onEditing);
      socket.off('connect', onReconnect);
    };
  }, []);

  // 퀴즈 종료 감지 → 룰렛 시작
  useEffect(() => {
    if (!quiz || !quiz.endedAt || !quiz.correctAnswer) return;
    if (quiz.endedAt === prevEndedAt.current) return; // 이미 처리한 종료

    prevEndedAt.current = quiz.endedAt;
    setRouletteDone(false);
    setRouletteEntry(null);

    const pool = quiz.mode === 'ox'
      ? quiz.answers.filter(a => a.answer === quiz.correctAnswer)
      : quiz.answers;

    if (!quiz.winner || pool.length === 0) {
      setRouletteDone(true);
      return;
    }

    if (pool.length === 1) {
      setRouletteEntry({ channel: quiz.winner.channel, sender: quiz.winner.sender });
      setTimeout(() => setRouletteDone(true), 800);
      return;
    }

    const winner = quiz.winner;
    // 스핀 중엔 당첨자 제외 풀에서 뽑기
    const spinPool = pool.filter(a => a.sender !== winner.sender);
    const pickSpin = () => {
      const src = spinPool.length > 0 ? spinPool : pool;
      return src[Math.floor(Math.random() * src.length)];
    };

    // 구간별 스텝 설계: 빠름(20) → 감속(15) → 긴장 슬로우(8) → 확정(1)
    const FAST = 20, SLOW = 15, CRAWL = 8, TOTAL = FAST + SLOW + CRAWL + 1;
    let step = 0;

    const runStep = () => {
      step++;
      const isFinal = step === TOTAL;
      const entry = isFinal ? winner : pickSpin();
      setRouletteEntry({ channel: entry.channel, sender: entry.sender });
      setRouletteFlash(f => f + 1);

      if (!isFinal) {
        let delay: number;
        if (step <= FAST) {
          // 빠른 구간: 50→120ms
          delay = 50 + 70 * (step / FAST);
        } else if (step <= FAST + SLOW) {
          // 감속 구간: 120→400ms
          const t = (step - FAST) / SLOW;
          delay = 120 + 280 * (t * t);
        } else {
          // 긴장 구간: 400→900ms, 한 칸씩 느리게
          const t = (step - FAST - SLOW) / CRAWL;
          delay = 400 + 500 * t;
        }
        setTimeout(runStep, delay);
      } else {
        setTimeout(() => setRouletteDone(true), 700);
      }
    };

    setTimeout(runStep, 300);
  }, [quiz?.endedAt]);

  // 퀴즈 리셋 시 룰렛 초기화
  useEffect(() => {
    if (quiz?.isActive) {
      setRouletteDone(false);
      setRouletteEntry(null);
      prevEndedAt.current = null;
    }
  }, [quiz?.isActive]);

  const isRevealed = quiz && !quiz.isActive && quiz.endedAt && quiz.correctAnswer;
  const isWaiting = isEditing || !quiz || (!quiz.isActive && !quiz.endedAt);
  const isLive = !isEditing && quiz?.isActive;

  const correctCount = isRevealed
    ? (quiz.mode === 'choice'
      ? quiz.answers.length
      : quiz.answers.filter(a => a.answer === quiz.correctAnswer).length)
    : 0;

  const winnerData = quiz?.winner ?? null;

  return (
    <>
    <style>{`
      @keyframes rouletteFlip {
        from { opacity: 0; transform: translateY(-10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
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

            {/* 선착순 응답 수 */}
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

            {/* 퀴즈 문제 */}
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
              marginBottom: '28px'
            }}>
              정답자 {correctCount}명
            </div>

            {/* 룰렛 / 당첨자 영역 */}
            {(rouletteEntry || winnerData) && (
              <div style={{
                marginTop: '4px',
                background: rouletteDone
                  ? 'rgba(74, 222, 128, 0.15)'
                  : 'rgba(30, 30, 50, 0.6)',
                border: `2px solid ${rouletteDone ? 'rgba(74, 222, 128, 0.7)' : 'rgba(148, 163, 184, 0.3)'}`,
                borderRadius: '18px',
                padding: '22px 48px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                transition: 'background 0.4s, border-color 0.4s',
                boxShadow: rouletteDone ? '0 0 30px rgba(74,222,128,0.2)' : 'none',
              }}>
                <span style={{
                  color: rouletteDone ? 'rgba(74, 222, 128, 0.8)' : '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  transition: 'color 0.4s',
                }}>
                  {rouletteDone ? '🎉 당첨자' : '🎰 추첨 중...'}
                </span>

                {/* 이름 표시 */}
                <div style={{ position: 'relative', height: '3.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {rouletteDone ? (
                    <motion.span
                      key="winner-final"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: [1.3, 0.95, 1.05, 1], opacity: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '2.4rem',
                        textShadow: '0 0 20px rgba(74,222,128,0.5)',
                        position: 'absolute',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: '#ffffff55', fontSize: '1.1rem' }}>
                        {winnerData?.channel}:
                      </span>
                      {winnerData?.sender}
                    </motion.span>
                  ) : (
                    /* AnimatePresence 없이 key만 바꿔서 즉시 교체 — exit 대기 없음 */
                    <span
                      key={rouletteFlash}
                      style={{
                        color: '#cbd5e1',
                        fontWeight: 900,
                        fontSize: '2.4rem',
                        position: 'absolute',
                        animation: 'rouletteFlip 0.07s ease-out',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: '#ffffff44', fontSize: '1.1rem' }}>
                        {rouletteEntry?.channel}:
                      </span>
                      {rouletteEntry?.sender}
                    </span>
                  )}
                </div>

                {/* 당첨 후 응답 시간 */}
                {rouletteDone && winnerData && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    style={{ color: 'rgba(74, 222, 128, 0.5)', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    {(() => {
                      const t = new Date(winnerData.timestamp);
                      return `${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}.${String(Math.floor(t.getMilliseconds() / 10)).padStart(2, '0')}`;
                    })()}
                  </motion.span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

export default QuizOverlay;
