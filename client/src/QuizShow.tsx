import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { PlayCircle, StopCircle, Trophy, Users, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

const IS_DEV = window.location.port === '5173';
const SOCKET_URL = IS_DEV ? `http://${window.location.hostname}:4000` : '';
const socket = io(SOCKET_URL);

interface UserAuth {
  name: string;
  role: 'admin' | 'host' | 'member' | 'guest';
}

type QuizMode = 'ox' | 'choice';

interface QuizState {
  isActive: boolean;
  mode: QuizMode;
  question: string;
  correctAnswer: string; // OX: 'O'|'X' / choice: '1'|'2'
  choice1: string;
  choice2: string;
  answers: { sender: string; answer: string; timestamp: number; channel: string }[];
  startedAt: string | null;
  endedAt: string | null;
  isConsecutiveMode: boolean;
  previousWinnerCount: number;
}

const EMPTY_STATE: QuizState = {
  isActive: false,
  mode: 'ox',
  question: '',
  correctAnswer: '',
  choice1: '1번',
  choice2: '2번',
  answers: [],
  startedAt: null,
  endedAt: null,
  isConsecutiveMode: false,
  previousWinnerCount: 0,
};

const QuizShow: React.FC<{ user: UserAuth }> = ({ user }) => {
  const [quiz, setQuiz] = useState<QuizState>(EMPTY_STATE);
  const [editMode, setEditMode] = useState<QuizMode>('ox');
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editConsecutive, setEditConsecutive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatLogs, setChatLogs] = useState<{ member?: string; sender: string; content: string; isDonation: boolean; timestamp: number }[]>([]);
  const answersContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 호스트 or 말구만 컨트롤 패널 표시
  const isController = user.role === 'admin' || user.role === 'host' || user.name === '말구';

  useEffect(() => {
    fetch(`${SOCKET_URL}/quiz/state`)
      .then(r => r.json())
      .then(data => setQuiz(data));

    const onUpdate = (state: QuizState) => setQuiz(state);
    const onChatLog = (log: any) => setChatLogs(p => [...p.slice(-99), log]);
    const onMainChatLog = (log: any) => setChatLogs(p => [...p.slice(-99), { ...log, member: '메인' }]);

    socket.on('quizUpdate', onUpdate);
    socket.on('memberChatLog', onChatLog);
    socket.on('mainChatLog', onMainChatLog);

    return () => {
      socket.off('quizUpdate', onUpdate);
      socket.off('memberChatLog', onChatLog);
      socket.off('mainChatLog', onMainChatLog);
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatLogs]);

  useEffect(() => {
    if (answersContainerRef.current) {
      answersContainerRef.current.scrollTop = answersContainerRef.current.scrollHeight;
    }
  }, [quiz.answers]);

  const startQuiz = async () => {
    if (!editAnswer) return alert('정답을 입력하세요');
    setIsLoading(true);
    await fetch(`${SOCKET_URL}/quiz/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: editMode,
        question: editQuestion,
        correctAnswer: editAnswer,
        isConsecutiveMode: editConsecutive,
      }),
    });
    setIsLoading(false);
  };

  const stopQuiz = async () => {
    setIsLoading(true);
    await fetch(`${SOCKET_URL}/quiz/stop`, { method: 'POST' });
    setIsLoading(false);
  };

  const resetQuiz = async () => {
    if (!confirm('퀴즈 기록을 초기화하시겠습니까?')) return;
    await fetch(`${SOCKET_URL}/quiz/reset`, { method: 'POST' });
  };

  const sendEditingSignal = async () => {
    await fetch(`${SOCKET_URL}/quiz/reset`, { method: 'POST' }).catch(() => {});
  };

  // 정답자 목록 (정답 공개 후)
  const correctAnswers = quiz.mode === 'choice' ? quiz.answers : quiz.answers.filter(a => a.answer === quiz.correctAnswer);
  const wrongAnswers = quiz.mode === 'choice' ? [] : quiz.answers.filter(a => a.answer !== quiz.correctAnswer);
  const isRevealed = !quiz.isActive && quiz.endedAt && quiz.correctAnswer;

  const modeColor = quiz.mode === 'ox' ? '#60a5fa' : '#a78bfa';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Trophy size={34} color="#f59e0b" fill="#f59e0b33" />
          로가다 퀴즈쇼
        </h2>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: '1rem' }}>실시간 채팅 참여형 퀴즈 · 채팅으로 정답 입력</p>
      </div>

      {/* 컨트롤 패널 (호스트 / 말구 전용) */}
      {isController && (
        <div style={{
          background: 'linear-gradient(135deg, #0f1520 0%, #070d18 100%)',
          border: '1px solid #1e3a5f',
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.8rem', background: '#1e3a5f', color: '#60a5fa', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
              🎙️ 호스트 패널
            </span>
            {quiz.isActive && (
              <span style={{ fontSize: '0.8rem', background: '#1a3a1a', color: '#4ade80', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
                ● LIVE
              </span>
            )}
          </div>

          {/* 모드 선택 */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              disabled={quiz.isActive}
              onClick={() => { setEditMode('ox'); setEditAnswer(''); }}
              style={{
                flex: 1, padding: '14px', borderRadius: '12px',
                border: `2px solid ${editMode === 'ox' ? '#60a5fa' : '#1e2a3a'}`,
                background: editMode === 'ox' ? '#0f1f3d' : '#0a0f1a',
                color: editMode === 'ox' ? '#60a5fa' : '#444',
                fontWeight: 900, fontSize: '1.1rem', cursor: quiz.isActive ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              ⭕❌ O/X 퀴즈
            </button>
            <button
              disabled={quiz.isActive}
              onClick={() => { setEditMode('choice'); setEditAnswer(''); }}
              style={{
                flex: 1, padding: '14px', borderRadius: '12px',
                border: `2px solid ${editMode === 'choice' ? '#a78bfa' : '#1e2a3a'}`,
                background: editMode === 'choice' ? '#1e1030' : '#0a0f1a',
                color: editMode === 'choice' ? '#a78bfa' : '#444',
                fontWeight: 900, fontSize: '1.1rem', cursor: quiz.isActive ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              🏆 선착순 정답
            </button>
          </div>
          {/* 연속체크 모드 설정 */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              onClick={() => !quiz.isActive && setEditConsecutive(!editConsecutive)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', cursor: quiz.isActive ? 'not-allowed' : 'pointer',
                background: editConsecutive ? '#3b0f0f' : '#0a0f1a',
                padding: '10px 16px', borderRadius: '10px', border: `1px solid ${editConsecutive ? '#f87171' : '#1e3a5f'}`,
                transition: 'all 0.2s', opacity: quiz.isActive ? 0.6 : 1,
              }}
            >
              <input 
                type="checkbox" 
                checked={editConsecutive}
                readOnly
                style={{ cursor: 'pointer' }}
              />
              <span style={{ color: editConsecutive ? '#f87171' : '#666', fontWeight: 900, fontSize: '0.9rem' }}>
                🔥 연속체크 모드 (이전 정답자만 참여)
              </span>
            </div>
            {quiz.previousWinnerCount > 0 && (
              <span style={{ color: '#555', fontSize: '0.8rem', fontWeight: 700 }}>
                이전 정답자: {quiz.previousWinnerCount}명
              </span>
            )}
          </div>

          {/* 문제 입력 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '6px', display: 'block', fontWeight: 700 }}>문제 내용 (선택)</label>
            <input
              disabled={quiz.isActive}
              value={editQuestion}
              onChange={e => setEditQuestion(e.target.value)}
              placeholder="퀴즈 문제를 입력하세요..."
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '10px',
                background: '#050a12', border: '1px solid #1e2a3a',
                color: '#fff', fontSize: '1rem', boxSizing: 'border-box',
                outline: 'none', opacity: quiz.isActive ? 0.5 : 1,
              }}
            />
          </div>

          {/* 선착순 모드: 정답 텍스트 입력 */}
          {editMode === 'choice' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', color: '#a78bfa', marginBottom: '6px', display: 'block', fontWeight: 700 }}>선착순 정답 단어</label>
              <input
                disabled={quiz.isActive}
                value={editAnswer}
                onChange={e => setEditAnswer(e.target.value)}
                placeholder="정답 단어를 입력하세요 (정확히 일치해야 집계됨)"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: '#050a12', border: '1px solid #2d1f5a',
                  color: '#fff', fontSize: '1rem', boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* 정답 입력 */}
          {editMode === 'ox' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px', display: 'block', fontWeight: 700 }}>
                정답 설정 (O 또는 X)
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['O', 'X'].map(v => (
                  <button
                    key={v}
                    disabled={quiz.isActive}
                    onClick={() => setEditAnswer(v)}
                    style={{
                      flex: 1, padding: '16px', borderRadius: '12px',
                      border: `2px solid ${editAnswer === v ? (v === 'O' ? '#4ade80' : '#f87171') : '#1e2a3a'}`,
                      background: editAnswer === v ? (v === 'O' ? '#0a2a1a' : '#2a0a0a') : '#0a0f1a',
                      color: editAnswer === v ? (v === 'O' ? '#4ade80' : '#f87171') : '#444',
                      fontWeight: 900, fontSize: '2rem', cursor: quiz.isActive ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {v === 'O' ? '⭕ O' : '❌ X'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 시작 / 종료 / 대기 버튼 */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {!quiz.isActive && !quiz.endedAt && (
              <button
                onClick={startQuiz}
                disabled={isLoading || !editAnswer}
                style={{
                  flex: 1, padding: '16px', borderRadius: '12px',
                  background: editAnswer ? 'linear-gradient(135deg, #059669, #047857)' : '#111',
                  border: `1px solid ${editAnswer ? '#059669' : '#222'}`,
                  color: editAnswer ? '#fff' : '#444',
                  fontWeight: 900, fontSize: '1.1rem', cursor: editAnswer ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <PlayCircle size={20} /> 퀴즈 시작
              </button>
            )}
            {quiz.isActive && (
              <button
                onClick={stopQuiz}
                disabled={isLoading}
                style={{
                  flex: 1, padding: '16px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  border: '1px solid #dc2626',
                  color: '#fff', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <StopCircle size={20} /> 퀴즈 종료 (정답 공개)
              </button>
            )}
            {/* 종료 후: 대기 화면으로 버튼 */}
            {!quiz.isActive && quiz.endedAt && (
              <button
                onClick={sendEditingSignal}
                style={{
                  flex: 1, padding: '16px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1e3a5f, #0f1f3d)',
                  border: '1px solid #60a5fa66',
                  color: '#60a5fa', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                ⏸ 대기 화면으로
              </button>
            )}
            <button
              onClick={resetQuiz}
              style={{
                padding: '16px 24px', borderRadius: '12px',
                background: '#0a0f1a', border: '1px solid #1e2a3a',
                color: '#555', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              }}
            >
              초기화
            </button>
          </div>
        </div>
      )}

      {/* 퀴즈 현황판 */}
      <div style={{
        background: '#0a0a0a', border: `1px solid ${modeColor}22`,
        borderRadius: '20px', overflow: 'hidden', marginBottom: '20px',
      }}>
        {/* 상태 헤더 */}
        <div style={{
          background: quiz.isActive
            ? `linear-gradient(90deg, ${modeColor}22 0%, transparent 100%)`
            : '#0d0d0d',
          padding: '20px 24px', borderBottom: `1px solid #1a1a1a`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{
                fontSize: '0.8rem', fontWeight: 700, padding: '2px 10px', borderRadius: '20px',
                background: quiz.isActive ? '#1a3a1a' : '#1a1a1a',
                color: quiz.isActive ? '#4ade80' : '#555',
              }}>
                {quiz.isActive ? '● LIVE' : quiz.endedAt ? '종료됨' : '대기 중'}
              </span>
              <span style={{
                fontSize: '0.8rem', fontWeight: 700, padding: '2px 10px', borderRadius: '20px',
                background: quiz.mode === 'ox' ? '#0f1f3d' : '#1e1030',
                color: modeColor,
              }}>
                {quiz.mode === 'ox' ? 'O/X 퀴즈' : '선착순 2개지'}
              </span>
              {quiz.isConsecutiveMode && (
                <span style={{
                  fontSize: '0.8rem', fontWeight: 700, padding: '2px 10px', borderRadius: '20px',
                  background: '#3b0f0f', color: '#f87171', border: '1px solid #f8717144'
                }}>
                  🔥 연속체크 중
                </span>
              )}
            </div>
            <div style={{ fontSize: quiz.question ? '1.2rem' : '1rem', color: quiz.question ? '#fff' : '#333', fontWeight: quiz.question ? 700 : 400 }}>
              {quiz.question || (quiz.isActive ? '퀴즈가 진행 중입니다...' : '퀴즈를 기다리는 중...')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: modeColor }}>{quiz.answers.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#444' }}>응답 수</div>
          </div>
        </div>

        {/* 선착순 모드: 정답자 현황 배너 */}
        {quiz.mode === 'choice' && (quiz.isActive || quiz.endedAt) && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #1a1a1a', background: '#0a0e14', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: '0.95rem' }}>🏆 선착순 정답 현황 (최대 30명)</span>
            <span style={{ fontSize: '0.8rem', color: '#444' }}>{quiz.answers.length}명 응답</span>
          </div>
        )}

        {/* O/X 모드: 현황 바 */}
        {quiz.mode === 'ox' && (quiz.isActive || quiz.endedAt) && (() => {
          const oCount = quiz.answers.filter(a => a.answer === 'O').length;
          const xCount = quiz.answers.filter(a => a.answer === 'X').length;
          const total = oCount + xCount || 1;
          const oPct = Math.round(oCount / total * 100);
          const xPct = 100 - oPct;
          const oCorrect = isRevealed && quiz.correctAnswer === 'O';
          const xCorrect = isRevealed && quiz.correctAnswer === 'X';
          return (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <div style={{ flex: oCount, background: oCorrect ? '#4ade80' : '#0a2a1a', borderRadius: '6px', padding: '10px', textAlign: 'center', minWidth: '60px' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.4rem', color: oCorrect ? '#000' : '#4ade80' }}>⭕ O</div>
                  <div style={{ fontWeight: 700, color: oCorrect ? '#000' : '#4ade80', fontSize: '0.95rem' }}>{oCount}명 ({oPct}%)</div>
                </div>
                <div style={{ flex: xCount, background: xCorrect ? '#f87171' : '#2a0a0a', borderRadius: '6px', padding: '10px', textAlign: 'center', minWidth: '60px' }}>
                  <div style={{ fontWeight: 900, fontSize: '1.4rem', color: xCorrect ? '#000' : '#f87171' }}>❌ X</div>
                  <div style={{ fontWeight: 700, color: xCorrect ? '#000' : '#f87171', fontSize: '0.95rem' }}>{xCount}명 ({xPct}%)</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 정답 공개 배너 */}
        {isRevealed && (
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #1a1a1a',
            background: 'linear-gradient(90deg, #05200e 0%, #0a0a0a 100%)',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <CheckCircle size={22} color="#4ade80" />
            <div>
              <div style={{ fontSize: '0.8rem', color: '#555' }}>정답</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#4ade80' }}>
                {quiz.mode === 'ox'
                  ? (quiz.correctAnswer === 'O' ? '⭕ O' : '❌ X')
                  : quiz.correctAnswer
                }
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#555' }}>정답자</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#4ade80' }}>{correctAnswers.length}명</div>
            </div>
          </div>
        )}

        {/* 응답자 목록 */}
        <div 
          ref={answersContainerRef}
          style={{ maxHeight: '360px', overflowY: 'auto', padding: '12px 16px' }}
        >
          {quiz.answers.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#333', padding: '40px 0', fontSize: '0.9rem' }}>
              {quiz.isActive ? '채팅에서 응답을 기다리는 중...' : '응답이 없습니다.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* 정답자 먼저 (정답 공개 후) */}
              {isRevealed && correctAnswers.length > 0 && (
                <>
                  <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, padding: '4px 0 2px' }}>
                    ✅ 정답자 ({correctAnswers.length}명)
                  </div>
                  {correctAnswers.map((a, i) => (
                    <AnswerRow key={`c-${i}`} answer={a} isCorrect={true} mode={quiz.mode} rank={i + 1} />
                  ))}
                  {wrongAnswers.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700, padding: '8px 0 2px' }}>
                      ❌ 오답자 ({wrongAnswers.length}명)
                    </div>
                  )}
                  {wrongAnswers.map((a, i) => (
                    <AnswerRow key={`w-${i}`} answer={a} isCorrect={false} mode={quiz.mode} rank={-1} />
                  ))}
                </>
              )}

              {/* 진행 중: 순서대로 (선착순은 상위 30명만) */}
              {!isRevealed && (quiz.mode === 'choice' ? quiz.answers.slice(0, 30) : quiz.answers).map((a, i) => (
                <AnswerRow key={i} answer={a} isCorrect={null} mode={quiz.mode} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 채팅 입력 안내 */}
      {quiz.isActive && (
        <div style={{
          background: '#0d0d0d', border: `1px solid ${modeColor}33`,
          borderRadius: '14px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <Users size={18} color={modeColor} />
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>채팅으로 참여하세요!</div>
            <div style={{ color: '#666', fontSize: '0.85rem', marginTop: '2px' }}>
              {quiz.mode === 'ox'
                ? '채팅창에 "O" 또는 "X" 를 입력하면 자동으로 응답됩니다'
                : '채팅창에 정확한 "정답 단어" 를 입력하면 선착순으로 집계됩니다 (Top 10)'
              }
              {quiz.isConsecutiveMode && (
                <div style={{ color: '#f87171', fontWeight: 700, marginTop: '4px' }}>
                  ⚠️ 연속체크 모드: 이전 퀴즈의 정답자만 참여할 수 있습니다!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 통합 채팅 로그 (관리자, 찌모, 말구 전용) */}
      {(user.role === 'admin' || user.name === '찌모' || user.name === '말구') && chatLogs.length > 0 && (
        <div style={{
          marginTop: '40px',
          background: '#0a0a0a',
          border: '1px solid #1e3a5f',
          borderRadius: '20px',
          padding: '24px',
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#60a5fa', fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} /> 실시간 통합 채팅 로그
          </h3>
          <div 
            ref={chatContainerRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '10px'
            }}
          >
            {chatLogs.map((log, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.9rem',
                padding: '8px 12px',
                borderRadius: '10px',
                background: log.isDonation ? 'rgba(245, 158, 11, 0.1)' : '#111',
                borderLeft: `4px solid ${log.isDonation ? '#f59e0b' : (log.member === '메인' ? '#60a5fa' : '#444')}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                  <span style={{ color: log.member === '메인' ? '#60a5fa' : '#888', fontWeight: 900, fontSize: '0.8rem' }}>
                    [{log.member || '알수없음'}]
                  </span>
                  <span style={{ color: log.isDonation ? '#f59e0b' : '#aaa', fontWeight: 700 }}>
                    {log.sender}
                  </span>
                </div>
                <span style={{ color: '#fff', flex: 1, wordBreak: 'break-all' }}>
                  {log.content}
                </span>
                {log.isDonation && <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 900 }}>💰 후원</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AnswerRow: React.FC<{
  answer: { sender: string; answer: string; timestamp: number; channel: string };
  isCorrect: boolean | null;
  mode: QuizMode;
  rank: number;
}> = ({ answer, isCorrect, mode, rank }) => {
  const time = new Date(answer.timestamp);
  const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}.${String(Math.floor(time.getMilliseconds() / 10)).padStart(2, '0')}`;

  const answerLabel = mode === 'ox'
    ? (answer.answer === 'O' ? '⭕ O' : '❌ X')
    : answer.answer;

  const rowBg = isCorrect === true ? '#051a0a' : isCorrect === false ? '#1a0505' : '#0d0d0d';
  const borderColor = isCorrect === true ? '#4ade8033' : isCorrect === false ? '#f8717133' : '#1e1e1e';
  const answerColor = answer.answer === 'O' || answer.answer === '1' ? '#60a5fa' : '#f87171';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: rowBg, border: `1px solid ${borderColor}`,
      borderRadius: '8px', padding: '8px 14px',
    }}>
      <span style={{ fontSize: '0.8rem', color: '#444', minWidth: '28px', fontWeight: 700 }}>
        {rank > 0 ? `#${rank}` : ''}
      </span>
      <span style={{ flex: 1, fontWeight: 700, color: '#ccc', fontSize: '0.9rem' }}>
        <span style={{ color: '#555', fontSize: '0.75rem', marginRight: '6px' }}>{answer.channel}:</span>
        {answer.sender}
      </span>
      <span style={{ fontWeight: 900, color: answerColor, fontSize: '0.9rem' }}>{answerLabel}</span>
      <span style={{ fontSize: '0.75rem', color: '#444' }}>{timeStr}</span>
      {isCorrect === true && <CheckCircle size={14} color="#4ade80" />}
      {isCorrect === false && <XCircle size={14} color="#f87171" />}
    </div>
  );
};

export default QuizShow;
