import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ChzzkClient } from 'chzzk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import cors from 'cors'; // CORS 미들웨어 추가

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// [중요] 모든 도메인에서의 통신 허용 설정 (테스트 버튼 동작의 핵심)
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

const io = new Server(httpServer, { 
  cors: { origin: "*", methods: ["GET", "POST", "PATCH", "DELETE"] }
});

const DB_PATH = path.join(__dirname, 'missions_db.json');
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([]));
const FEEDBACK_DB_PATH = path.join(__dirname, 'feedback_db.json');
if (!fs.existsSync(FEEDBACK_DB_PATH)) fs.writeFileSync(FEEDBACK_DB_PATH, JSON.stringify([]));

const getMissions = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const saveMissions = (missions: any) => fs.writeFileSync(DB_PATH, JSON.stringify(missions));
const getFeedbacks = () => JSON.parse(fs.readFileSync(FEEDBACK_DB_PATH, 'utf-8'));
const saveFeedbacks = (data: any) => fs.writeFileSync(FEEDBACK_DB_PATH, JSON.stringify(data, null, 2));

// 접속 기록 로그 저장 기능
const ACCESS_LOG_PATH = path.join(__dirname, 'access_log.txt');
const logAccess = (name: string, type: 'login' | 'access', ip: string) => {
  try {
    const now = new Date();
    // KST 시간 포맷 (YYYY-MM-DD HH:mm:ss)
    const timestamp = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const logMessage = `[${timestamp}] ${name} - ${type === 'login' ? '로그인' : '자동접속'} (IP: ${ip})\n`;
    fs.appendFileSync(ACCESS_LOG_PATH, logMessage);
  } catch (error) {
    console.error('❌ [Log Error]', error);
  }
};



const client = new ChzzkClient();

// 룰렛 추가를 후원자에게만 허용할지 여부
let isDonationOnly = true;
// 메인 미션 등록을 후원자에게만 허용할지 여부
let isMissionDonationOnly = false;
// 미션 자동 수락 여부
let isAutoAccept = false;

// 민심판독기 상태 (기본 50%)
let posMatchCount = 0;
let negMatchCount = 0;
let sentimentGauge = 50;
const posWords = (process.env.POSITIVE_WORDS || 'ㅋㅋㅋ,좋다,최고,나이스,갓,꿀잼').split(',').map(s => s.trim()).filter(Boolean);
const negWords = (process.env.NEGATIVE_WORDS || 'ㅠㅠ,노잼,별로,최악,하아,에바,못해,버스,다라이').split(',').map(s => s.trim()).filter(Boolean);

const analyzeSentiment = (content: string) => {
  let matchedPos = 0;
  let matchedNeg = 0;
  posWords.forEach(w => { if (content.includes(w)) matchedPos++; });
  negWords.forEach(w => { if (content.includes(w)) matchedNeg++; });

  if (matchedPos > 0 || matchedNeg > 0) {
    posMatchCount += matchedPos;
    negMatchCount += matchedNeg;
    let changed = false;

    while (posMatchCount >= 10) {
      posMatchCount -= 10;
      sentimentGauge = Math.min(100, sentimentGauge + 1);
      changed = true;
    }
    while (negMatchCount >= 10) {
      negMatchCount -= 10;
      sentimentGauge = Math.max(0, sentimentGauge - 1);
      changed = true;
    }

    // 단어 감지 시 무조건 로그 출력
    console.log(`📡 [Sentiment Detected] 긍정+${matchedPos} / 부정+${matchedNeg} | 🌟현재 민심: ${sentimentGauge}% | 누적스택(긍/부): ${posMatchCount}/10, ${negMatchCount}/10`);

    if (changed) {
      io.emit('sentimentUpdate', sentimentGauge);
      console.log(`🔥 [Sentiment Update] 10스택 도달! 게이지 변동 반영됨 -> ${sentimentGauge}%`);
    }
  }
};

// ==================== 퀴즈쇼 상태 (processMessage 위에 선언) ====================
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
  previousWinnerCount: number;
  winner: { sender: string; answer: string; timestamp: number; channel: string } | null;
}

let quizState: QuizState = {
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
  winner: null,
};

let previousWinners: string[] = [];

// 퀴즈 응답 공통 처리 함수
const handleQuizResponse = (sender: string, content: string, channel: string) => {
  if (!quizState.isActive) return;

  // 연속체크 모드: 이전 정답자 명단에 있는 사람만 허용
  if (quizState.isConsecutiveMode && previousWinners.length > 0) {
    if (!previousWinners.includes(sender)) return;
  }

  const trimmed = content.trim().toUpperCase();
  const validOX = ['O', 'X', '오', '엑스'];
  const normalizedOX = trimmed === '오' ? 'O' : trimmed === '엑스' ? 'X' : trimmed;

  if (quizState.mode === 'ox') {
    const isOXAnswer = (validOX.includes(trimmed) || normalizedOX === 'X' || normalizedOX === 'O');
    if (isOXAnswer) {
      const answerVal = (trimmed === '오' ? 'O' : trimmed === '엑스' ? 'X' : normalizedOX);
      if (!quizState.answers.find((a: any) => a.sender === sender)) {
        quizState.answers.push({ sender, answer: answerVal, timestamp: Date.now(), channel });
        io.emit('quizUpdate', quizState);
        console.log(`🎯 [Quiz OX] ${sender} (${channel}): ${answerVal}`);
      }
    }
  } else if (quizState.mode === 'choice') {
    // 선착순 텍스트 정답 모드 (정확히 일치해야 함)
    const isCorrect = trimmed === quizState.correctAnswer.trim().toUpperCase();
    if (isCorrect) {
      if (!quizState.answers.find((a: any) => a.sender === sender)) {
        quizState.answers.push({ sender, answer: content.trim(), timestamp: Date.now(), channel });
        io.emit('quizUpdate', quizState);
        console.log(`🏆 [Quiz Correct] ${sender} (${channel}): ${content.trim()}`);
      }
    }
  }
};

const processMessage = (sender: string, content: string, isDonation: boolean = false) => {
  // 민심 분석 실행 (모든 메시지 대상)
  analyzeSentiment(content);

  // 일반 미션 등록 (!미션) - 미션 도네이션 전용 모드에 따라 분기
  if (content.startsWith('!미션 ')) {
    if (isMissionDonationOnly && !isDonation) {
      console.log(`🚫 [Mission Blocked] General chat mission ignored. (User: ${sender})`);
      return; 
    }
    const missionContent = content.replace('!미션 ', '').trim();
    if (missionContent) {
      const newMission = {
        id: Date.now().toString(),
        creator: sender,
        content: missionContent,
        status: isAutoAccept ? 'accepted' : 'pending',
        timestamp: new Date().toISOString(),
        type: 'main'
      };
      const rogadaMission = {
        id: (Date.now() + 1).toString(),
        creator: sender,
        target: '찌모',
        content: missionContent,
        status: isAutoAccept ? 'accepted' : 'pending',
        timestamp: new Date().toISOString(),
        type: 'rogada'
      };
      const missions = getMissions();
      missions.push(newMission, rogadaMission);
      saveMissions(missions);
      io.emit('newMission', newMission);
      io.emit('newMission', rogadaMission);
      console.log(`✨ [New Mission] ${sender}: ${missionContent} (Donation: ${isDonation})`);
    }
  }

  // 로가다 개인 보드 미션 등록 (!(이름) 내용)
  const groupMembers = ['찌모', '미랑', '갱쥰', '서씨', '떠기', '말구'];

  for (const member of groupMembers) {
    if (content.startsWith(`!${member} `)) {
      const missionContent = content.replace(`!${member} `, '').trim();
      const newMission = {
        id: Date.now().toString(),
        creator: sender,
        target: member,
        content: missionContent,
        status: isAutoAccept ? 'accepted' : 'pending',
        timestamp: new Date().toISOString(),
        type: 'rogada'
      };
      const missions = getMissions();
      missions.push(newMission);
      saveMissions(missions);
      io.emit('newMission', newMission);
      console.log(`🛠️ [Rogada Mission] ${sender} -> ${member}: ${missionContent}`);
      break; // 한 명에게만 매핑되면 종료
    }
  }

  // 개인 미션 등록 (!개인) - 찌모 보드에 비공개로 추가
  if (content.startsWith('!개인 ')) {
    const missionContent = content.replace('!개인 ', '').trim();
    const newMission = {
      id: Date.now().toString(),
      creator: sender,
      target: '찌모',
      content: missionContent,
      status: isAutoAccept ? 'accepted' : 'pending',
      timestamp: new Date().toISOString(),
      type: 'rogada',
      private: true
    };
    const missions = getMissions();
    missions.push(newMission);
    saveMissions(missions);
    io.emit('newMission', newMission);
    console.log(`🔒 [Private Mission - 찌모] ${sender}: ${missionContent}`);
  }

  // 룰렛 추가 명령어 (!룰렛추가) - 도네이션 전용 모드에 따라 분기
  if ((isDonation || !isDonationOnly) && content.startsWith('!룰렛추가 ')) {
    const rouletteContent = content.replace('!룰렛추가 ', '').trim();
    if (rouletteContent) {
      io.emit('addRouletteItem', { member: '찌모', content: rouletteContent });
      console.log(`🎡 [Roulette Item Added] ${sender} -> ${rouletteContent} (Mode: ${isDonationOnly ? 'DonationOnly' : 'AllChat'})`);
    }
  }

  // 퀴즈 응답 처리
  handleQuizResponse(sender, content, '찌모');
};


// [멤버별 개별 채팅 연결 관리를 위한 Map 객체]
const memberChats = new Map<string, any>();

// [개별 멤버 채널 메시지 처리 함수]
const processMemberSpecificMessage = (member: string, sender: string, content: string, isDonation: boolean = false) => {
  // 모든 채팅/후원을 클라이언트 채팅 로그로 전송
  io.emit('memberChatLog', { member, sender, content, isDonation, timestamp: Date.now() });

  // 개별 채널에서 `!미션 내용` 을 치면, 해당 멤버의 로가다 미션으로 자동 꽂히게 처리!
  if (content.startsWith('!미션 ')) {
    const missionContent = content.replace('!미션 ', '').trim();
    const newMission = {
      id: Date.now().toString(),
      creator: sender,
      target: member,
      content: missionContent,
      status: isAutoAccept ? 'accepted' : 'pending',
      timestamp: new Date().toISOString(),
      type: 'rogada'
    };
    const missions = getMissions();
    missions.push(newMission);
    saveMissions(missions);
    io.emit('newMission', newMission);
    console.log(`📡 [${member} 채널 전용 미션] ${sender} -> ${missionContent}`);
  }

  // 개별 채널에서 `!개인 내용` 을 치면, 해당 멤버의 비공개 로가다 미션으로 처리
  if (content.startsWith('!개인 ')) {
    const missionContent = content.replace('!개인 ', '').trim();
    const newMission = {
      id: Date.now().toString(),
      creator: sender,
      target: member,
      content: missionContent,
      status: isAutoAccept ? 'accepted' : 'pending',
      timestamp: new Date().toISOString(),
      type: 'rogada',
      private: true
    };
    const missions = getMissions();
    missions.push(newMission);
    saveMissions(missions);
    io.emit('newMission', newMission);
    console.log(`🔒 [Private Mission - ${member}] ${sender}: ${missionContent}`);
  }

  // 개별 채널에서 `!룰렛추가 내용` 처리 — 해당 멤버 룰렛에만 추가
  if ((isDonation || !isDonationOnly) && content.startsWith('!룰렛추가 ')) {
    const rouletteContent = content.replace('!룰렛추가 ', '').trim();
    if (rouletteContent) {
      io.emit('addRouletteItem', { member, content: rouletteContent });
      console.log(`🎡 [Member Roulette] ${member} <- ${sender}: ${rouletteContent}`);
    }
  }

  // 퀴즈 응답 처리 (모든 멤버 채널 통합 집계)
  handleQuizResponse(sender, content, member);
};

const CHANNEL_ID = process.env.CHZZK_CHANNEL_ID || '82c0b64d12c823f66810c97d62234e4f';
let mainChat: any = null;
let mainChatRetryTimer: ReturnType<typeof setTimeout> | null = null;

const connectMainChat = async () => {
  if (mainChatRetryTimer) { clearTimeout(mainChatRetryTimer); mainChatRetryTimer = null; }
  try {
    console.log("🔄 [Chzzk] 메인 채널 연결 시도...");
    const chat = client.chat({ channelId: CHANNEL_ID });

    chat.on('connect', () => {
      console.log('✅ [Chzzk] 메인 채널 연결 성공.');
      mainChat = chat;
    });

    chat.on('disconnect', () => {
      console.warn('⚠️ [Chzzk] 연결 끊김. 30초 후 재시도...');
      mainChat = null;
      mainChatRetryTimer = setTimeout(connectMainChat, 30000);
    });

    chat.on('chat', (message) => {
      const sender = message.profile.nickname;
      const content = message.message;
      console.log(`💬 [Chat] ${sender}: ${content}`);
      io.emit('mainChatLog', { sender, content, isDonation: false, timestamp: Date.now() });
      processMessage(sender, content, false);
    });

    chat.on('donation', (donation) => {
      const sender = donation.profile?.nickname || '익명후원자';
      const content = donation.message || '';
      console.log(`💰 [Donation] ${sender}: ${content}`);
      io.emit('mainChatLog', { sender, content, isDonation: true, timestamp: Date.now() });
      processMessage(sender, content, true);
    });

    await chat.connect();
  } catch (e) {
    console.error("❌ [Chzzk] 연결 오류 (방송 중이 아닐 수 있음):", (e as Error).message);
    console.log("⏳ 30초 후 재시도합니다...");
    mainChatRetryTimer = setTimeout(connectMainChat, 30000);
  }
};

connectMainChat();

// API 리스트
const USERS_PATH = path.join(__dirname, 'users.json');

app.post('/login', async (req, res) => {
  const { id, pw } = req.body;
  if (!fs.existsSync(USERS_PATH)) return res.status(500).json({ error: 'DB Error' });
  const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  const user = users.find((u: any) => u.id === id);
  if (!user) return res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 틀렸습니다.' });

  // bcrypt 해시 여부에 따라 분기 (마이그레이션 전 평문 호환 포함)
  let isValid = false;
  if (user.pw.startsWith('$2b$') || user.pw.startsWith('$2a$')) {
    isValid = await bcrypt.compare(pw, user.pw);
  } else {
    // 아직 해시화 안 된 경우 평문 비교 (마이그레이션 전 임시 호환)
    isValid = user.pw === pw;
  }

  if (isValid) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    logAccess(user.name, 'login', String(ip));
    res.json({ success: true, role: user.role, name: user.name, chnnelid: user.chnnelid });
  } else {
    res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 틀렸습니다.' });
  }
});

app.post('/log-access', (req, res) => {
  const { name } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (name) {
    logAccess(name, 'access', String(ip));
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Name required' });
  }
});



app.get('/users-config', (req, res) => {
  if (!fs.existsSync(USERS_PATH)) return res.json([]);
  const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  res.json(users.map((u: any) => ({ name: u.name, chnnelid: u.chnnelid })));
});

app.get('/missions', (req, res) => res.json(getMissions()));

app.get('/sentiment', (req, res) => res.json({ sentimentGauge }));

app.post('/test-sentiment', (req, res) => {
  const delta = Math.floor(Math.random() * 11) - 5; // -5 ~ +5 랜덤
  sentimentGauge = Math.min(100, Math.max(0, sentimentGauge + delta));
  io.emit('sentimentUpdate', sentimentGauge);
  const sign = delta >= 0 ? `+${delta}` : `${delta}`;
  console.log(`🧪 [Test 민심조작] ${sign} → 현재 민심: ${sentimentGauge}%`);
  res.json({ sentimentGauge, delta });
});

app.get('/connected-members', (req, res) => res.json(Array.from(memberChats.keys())));

app.post('/missions', (req, res) => {
  const missions = getMissions();
  const m = { ...req.body, id: Date.now().toString(), status: isAutoAccept ? 'accepted' : 'pending', timestamp: new Date().toISOString() };
  missions.push(m);
  saveMissions(missions);
  io.emit('newMission', m);
  res.json(m);
});

app.post('/test-donation', (req, res) => {
  const { creator, content } = req.body;
  const sender = creator || '도네테스터';
  const msg = content || '';
  io.emit('mainChatLog', { sender, content: msg, isDonation: true, timestamp: Date.now() });
  processMessage(sender, msg, true);
  res.json({ success: true });
});

app.post('/test-chat', (req, res) => {
  const { creator, content } = req.body;
  const sender = creator || '채팅테스터';
  const msg = content || '';
  io.emit('mainChatLog', { sender, content: msg, isDonation: false, timestamp: Date.now() });
  processMessage(sender, msg, false);
  res.json({ success: true });
});

app.patch('/missions/:id', (req, res) => {
  let missions = getMissions();
  const m = missions.find((o: any) => o.id === req.params.id);
  if (m) {
    Object.assign(m, req.body);

    // main 미션 상태 변경 시 연결된 rogada(찌모) 미션도 동기화
    if (m.type === 'main') {
      const paired = missions.find((o: any) =>
        o.type === 'rogada' && o.target === '찌모' && o.content === m.content && o.creator === m.creator
      );
      if (paired) {
        Object.assign(paired, req.body);
        io.emit('updateMission', paired);
      }
    }

    saveMissions(missions);
    io.emit('updateMission', m);
  }
  res.json(m);
});

app.delete('/missions/:id', (req, res) => {
  const allMissions = getMissions();
  const target = allMissions.find((m: any) => m.id === req.params.id);

  // main 미션 삭제 시 같은 내용의 rogada(찌모) 미션도 함께 삭제
  const toDeleteIds: string[] = [req.params.id];
  if (target && target.type === 'main') {
    const paired = allMissions.find((m: any) =>
      m.type === 'rogada' && m.target === '찌모' && m.content === target.content && m.creator === target.creator
    );
    if (paired) toDeleteIds.push(paired.id);
  }

  saveMissions(allMissions.filter((m: any) => !toDeleteIds.includes(m.id)));
  toDeleteIds.forEach(id => io.emit('missionDeleted', id));
  res.status(204).send();
});

// 피드백 관련 API
app.get('/feedbacks', (req, res) => res.json(getFeedbacks()));
app.post('/feedbacks', (req, res) => {
  const { sender, content, role } = req.body;
  if (!sender || !content) return res.status(400).json({ error: '내용 누락' });
  const feedbacks = getFeedbacks();
  const newFeedback = {
    id: Date.now().toString(),
    sender,
    content,
    role,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  feedbacks.push(newFeedback);
  saveFeedbacks(feedbacks);
  io.emit('feedbackUpdate', feedbacks);
  res.json({ success: true, feedback: newFeedback });
});
app.patch('/feedbacks/:id', (req, res) => {
  const { status } = req.body;
  const feedbacks = getFeedbacks();
  const f = feedbacks.find((o: any) => o.id === req.params.id);
  if (f) {
    if (status) f.status = status;
    saveFeedbacks(feedbacks);
    io.emit('feedbackUpdate', feedbacks);
  }
  res.json(f);
});
app.delete('/feedbacks/:id', (req, res) => {
  const feedbacks = getFeedbacks();
  const next = feedbacks.filter((f: any) => f.id !== req.params.id);
  saveFeedbacks(next);
  io.emit('feedbackUpdate', next);
  res.status(204).send();
});

// ==================== 퀴즈쇼 API ====================
const QUIZ_LOG_PATH = path.join(__dirname, 'quiz_log_db.json');
if (!fs.existsSync(QUIZ_LOG_PATH)) fs.writeFileSync(QUIZ_LOG_PATH, JSON.stringify({ logs: [] }, null, 2));
const getQuizLog = () => JSON.parse(fs.readFileSync(QUIZ_LOG_PATH, 'utf-8'));
const appendQuizLog = (entry: any) => {
  const data = getQuizLog();
  data.logs.push(entry);
  fs.writeFileSync(QUIZ_LOG_PATH, JSON.stringify(data, null, 2));
};

app.get('/quiz/state', (req, res) => res.json(quizState));
app.get('/quiz/logs', (req, res) => res.json(getQuizLog()));

// 문제 편집 중 신호 — 오버레이에 "문제 입력 중" 표시
app.post('/quiz/editing', (req, res) => {
  if (!quizState.isActive) {
    io.emit('quizEditing');
  }
  res.json({ ok: true });
});

app.post('/quiz/start', (req, res) => {
  const { mode, question, correctAnswer, choice1, choice2, isConsecutiveMode } = req.body;
  if (!correctAnswer) return res.status(400).json({ error: '정답 필요' });
  quizState = {
    isActive: true,
    mode: mode || 'ox',
    question: question || '',
    correctAnswer,
    choice1: choice1 || '1번',
    choice2: choice2 || '2번',
    answers: [],
    startedAt: new Date().toISOString(),
    endedAt: null,
    isConsecutiveMode: !!isConsecutiveMode,
    previousWinnerCount: previousWinners.length,
    winner: null,
  };
  io.emit('quizUpdate', quizState);
  console.log(`🎯 [Quiz Start] mode=${mode}, answer=${correctAnswer}, consecutive=${isConsecutiveMode}`);
  res.json({ success: true });
});

app.post('/quiz/stop', (req, res) => {
  // 이전 정답자 명단 갱신
  if (quizState.mode === 'ox') {
    previousWinners = quizState.answers
      .filter(a => a.answer === quizState.correctAnswer)
      .map(a => a.sender);
  } else {
    // choice 모드는 answers에 이미 필터링된 정답자만 들어있음
    previousWinners = quizState.answers.map(a => a.sender);
  }

  // 중복 제거
  previousWinners = Array.from(new Set(previousWinners));

  quizState.isActive = false;
  quizState.endedAt = new Date().toISOString();
  quizState.previousWinnerCount = previousWinners.length;

  const pool = quizState.mode === 'ox'
    ? quizState.answers.filter(a => a.answer === quizState.correctAnswer)
    : quizState.answers;
  quizState.winner = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] ?? null : null;

  // 퀴즈 로그 기록
  const correctAnswerers = quizState.mode === 'ox'
    ? quizState.answers.filter(a => a.answer === quizState.correctAnswer).map(a => a.sender)
    : quizState.answers.map(a => a.sender);
  const wrongAnswerers = quizState.mode === 'ox'
    ? quizState.answers.filter(a => a.answer !== quizState.correctAnswer).map(a => a.sender)
    : [];

  appendQuizLog({
    no: getQuizLog().logs.length + 1,
    mode: quizState.mode,
    question: quizState.question,
    correctAnswer: quizState.correctAnswer,
    choice1: quizState.choice1,
    choice2: quizState.choice2,
    correctAnswerers,
    wrongAnswerers,
    totalAnswers: quizState.answers.length,
    startedAt: quizState.startedAt,
    endedAt: quizState.endedAt,
  });

  io.emit('quizUpdate', quizState);
  console.log(`🏁 [Quiz Stop] correctAnswer=${quizState.correctAnswer}, winners=${previousWinners.length}`);
  res.json({ success: true, state: quizState });
});

app.post('/quiz/reset', (req, res) => {
  previousWinners = [];
  quizState = {
    isActive: false, mode: 'ox', question: '', correctAnswer: '',
    choice1: '1번', choice2: '2번', answers: [], startedAt: null, endedAt: null,
    isConsecutiveMode: false, previousWinnerCount: 0, winner: null,
  };
  io.emit('quizUpdate', quizState);
  res.json({ success: true });
});

// [최적화된 Catch-all] API 경로가 아닌 요청만 React로 전달
const API_PREFIXES = ['/missions', '/login', '/log-access', '/users-config', '/sentiment', '/connected-members', '/connect-member', '/disconnect-member', '/test-', '/cheese-enabled', '/donation-only', '/mission-donation-only', '/auto-accept', '/rating', '/feedbacks', '/quiz', '/tournament'];

app.use((req, res, next) => {
  const isApi = API_PREFIXES.some(prefix => req.path.startsWith(prefix));
  if (req.method === 'GET' && !isApi) {
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    res.sendFile(indexPath, (err) => { if (err) next(); });
  } else {
    next();
  }
});

// 멤버별 대상 채널 연결 API
app.post('/connect-member', async (req, res) => {
  const { member, channelId } = req.body;
  if (!member || !channelId) return res.status(400).json({ error: '필수 파라미터 누락' });

  if (memberChats.has(member)) {
    console.log(`[${member}] 기존 커스텀 채널 연결 해제`);
    try { memberChats.get(member).disconnect(); } catch (e) { }
  }

  try {
    const memberChat = client.chat({ channelId });
    memberChat.on('connect', () => {
      console.log(`✅ [${member} 전용 채널 연결 완료] Channel ID: ${channelId}`);
    });
    memberChat.on('chat', (message) => {
      const sender = message.profile.nickname;
      const content = message.message;
      console.log(`💬 [${member}] ${sender} : ${content}`);
      processMemberSpecificMessage(member, sender, content, false);
    });
    memberChat.on('donation', (message) => {
      const sender = message.profile?.nickname || '익명';
      const content = message.message || '';
      console.log(`💰 [${member} 후원] ${sender} : ${content}`);
      processMemberSpecificMessage(member, sender, content, true);
    });

    await memberChat.connect();
    memberChats.set(member, memberChat);
    io.emit('memberConnected', { member, channelId });
    res.json({ success: true, member, channelId });
  } catch (error) {
    console.error(`❌ [${member} 전용 연결 실패]`, error);
    res.status(500).json({ error: '연결 실패' });
  }
});

app.post('/disconnect-member', (req, res) => {
  const { member } = req.body;
  if (!member) return res.status(400).json({ error: '파라미터 누락' });

  if (memberChats.has(member)) {
    console.log(`[${member}] 커스텀 채널 수동 종료`);
    try { memberChats.get(member).disconnect(); } catch (e) { }
    memberChats.delete(member);
    io.emit('memberDisconnected', member);
  }
  res.json({ success: true, member });
});

// 도네이션 전용 모드 관리 API
let isCheeseEnabled = false;
app.get('/cheese-enabled', (req, res) => res.json({ enabled: isCheeseEnabled }));
app.post('/cheese-enabled', (req, res) => {
  const { enabled } = req.body;
  isCheeseEnabled = !!enabled;
  io.emit('cheeseEnabledUpdate', isCheeseEnabled);
  console.log(`⚙️ [Config Change] Cheese Animation: ${isCheeseEnabled}`);
  res.json({ success: true, enabled: isCheeseEnabled });
});
app.post('/test-cheese', (req, res) => {
  io.emit('cheeseTest');
  res.json({ success: true });
});

app.get('/donation-only', (req, res) => res.json({ enabled: isDonationOnly }));
app.post('/donation-only', (req, res) => {
  const { enabled } = req.body;
  isDonationOnly = !!enabled;
  io.emit('donationOnlyUpdate', isDonationOnly);
  console.log(`⚙️ [Config Change] Roulette Donation Only Mode: ${isDonationOnly}`);
  res.json({ success: true, enabled: isDonationOnly });
});

app.get('/mission-donation-only', (req, res) => res.json({ enabled: isMissionDonationOnly }));
app.post('/mission-donation-only', (req, res) => {
  const { enabled } = req.body;
  isMissionDonationOnly = !!enabled;
  io.emit('missionDonationOnlyUpdate', isMissionDonationOnly);
  console.log(`⚙️ [Config Change] Mission Donation Only Mode: ${isMissionDonationOnly}`);
  res.json({ success: true, enabled: isMissionDonationOnly });
});

app.get('/auto-accept', (req, res) => res.json({ enabled: isAutoAccept }));
app.post('/auto-accept', (req, res) => {
  const { enabled } = req.body;
  isAutoAccept = !!enabled;
  io.emit('autoAcceptUpdate', isAutoAccept);
  console.log(`⚙️ [Config Change] Mission Auto Accept: ${isAutoAccept}`);
  res.json({ success: true, enabled: isAutoAccept });
});

// ==================== 폭병 룰렛 DB ====================
const POK_DB_PATH = path.join(__dirname, 'pok_roulette_db.json');
if (!fs.existsSync(POK_DB_PATH)) {
  fs.writeFileSync(POK_DB_PATH, JSON.stringify({ items1: [], personPools: {} }));
}

app.get('/pok-roulette-state', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(POK_DB_PATH, 'utf-8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'DB Read Error' });
  }
});

app.post('/pok-roulette-state', (req, res) => {
  try {
    const { items1, personPools } = req.body;
    fs.writeFileSync(POK_DB_PATH, JSON.stringify({ items1, personPools }, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'DB Write Error' });
  }
});

app.delete('/pok-roulette-state', (req, res) => {
  try {
    fs.writeFileSync(POK_DB_PATH, JSON.stringify({ items1: [], personPools: {} }));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'DB Reset Error' });
  }
});

// ==================== 레이팅 보드 ====================
const RATING_DB_PATH = path.join(__dirname, 'rating_db.json');
if (!fs.existsSync(RATING_DB_PATH)) fs.writeFileSync(RATING_DB_PATH, JSON.stringify({ characters: [] }));

const getRatingDB = () => JSON.parse(fs.readFileSync(RATING_DB_PATH, 'utf-8'));
const saveRatingDB = (data: any) => fs.writeFileSync(RATING_DB_PATH, JSON.stringify(data, null, 2));

const RATING_VIEWER_DB_PATH = path.join(__dirname, 'rating_viewer_db.json');
if (!fs.existsSync(RATING_VIEWER_DB_PATH)) fs.writeFileSync(RATING_VIEWER_DB_PATH, JSON.stringify({ characters: [] }));
const getRatingViewerDB = () => JSON.parse(fs.readFileSync(RATING_VIEWER_DB_PATH, 'utf-8'));
const saveRatingViewerDB = (data: any) => fs.writeFileSync(RATING_VIEWER_DB_PATH, JSON.stringify(data, null, 2));

// 기존 캐릭터 마이그레이션: score 없으면 rating값을 score로, rating은 1000으로 초기화 / winStreak 없으면 0으로 초기화
(() => {
  const db = getRatingDB();
  let changed = false;
  (db.characters || []).forEach((c: any) => {
    if (c.score === undefined) {
      c.score = c.rating;
      c.rating = 1000;
      changed = true;
    }
    if (c.winStreak === undefined) {
      c.winStreak = 0;
      changed = true;
    }
  });
  if (changed) saveRatingDB(db);
})();

// ==================== 레이팅 보드 자동 백업 ====================
const BACKUP_DIR = path.join(__dirname, 'backups', 'rating');

const performDailyBackup = () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const db = getRatingDB();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const backupPath = path.join(BACKUP_DIR, `rating_${dateStr}.json`);

    fs.writeFileSync(backupPath, JSON.stringify(db, null, 2));
    // 백업 시점에 뷰어용 DB도 동기화 (원본 복사본 유지)
    saveRatingViewerDB(db);

    console.log(`💾 [Daily Backup] Snapshot saved to ${backupPath} and Viewer DB updated.`);
    io.emit('ratingViewerUpdate', db);
  } catch (error) {
    console.error(`❌ [Daily Backup Error]`, error);
  }
};

// 매일 자정(0시 0분 1초)에 실행되도록 설정
const scheduleDailyBackup = () => {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  const msToMidnight = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    performDailyBackup();
    setInterval(performDailyBackup, 24 * 60 * 60 * 1000);
  }, msToMidnight);

  console.log(`🕒 [Backup Scheduler] Registered. Next backup in ${Math.floor(msToMidnight / 1000 / 60)} minutes.`);
};

scheduleDailyBackup();

// 전체 캐릭터 조회
app.get('/rating', (req, res) => {
  res.json(getRatingDB());
});

// 뷰어용 캐릭터 조회 (백업된 원본 복사본 기반)
app.get('/rating-viewer', (req, res) => {
  res.json(getRatingViewerDB());
});

// 수동으로 현재 데이터를 뷰어로 즉시 복사
app.post('/rating-viewer/sync', (req, res) => {
  const db = getRatingDB();
  saveRatingViewerDB(db);
  io.emit('ratingViewerUpdate', db);
  res.json({ success: true });
});

// 캐릭터 등록
app.post('/rating/register', (req, res) => {
  const { memberName, characterName, jobName, league, initialRating } = req.body;
  if (!memberName || !characterName || !league) return res.status(400).json({ success: false, message: '필수 값 누락' });
  if (!['4000', '5000', '6000', 'extra'].includes(league)) return res.status(400).json({ success: false, message: '유효하지 않은 리그' });
  if (initialRating === undefined || initialRating === null || isNaN(Number(initialRating))) return res.status(400).json({ success: false, message: '올바른 점수를 입력하세요' });

  const db = getRatingDB();
  // 게스트는 여러 캐릭터 등록 가능, 멤버는 리그별 1개 제한
  if (memberName !== '게스트') {
    const exists = db.characters.find((c: any) => c.memberName === memberName && c.league === league);
    if (exists) return res.status(409).json({ success: false, message: '이미 해당 리그에 캐릭터가 등록되어 있습니다' });
  }

  const newChar = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    memberName,
    characterName,
    jobName: jobName || '',
    league,
    score: Number(initialRating),  // 등록 시 입력한 고정 점수
    rating: 1000,                  // 대결 레이팅 (1000 시작)
    wins: 0,
    losses: 0,
    winStreak: 0,
    registeredAt: new Date().toISOString()
  };
  db.characters.push(newChar);
  saveRatingDB(db);
  appendBattleLog({
    type: 'register',
    characterId: newChar.id,
    memberName: newChar.memberName,
    characterName: newChar.characterName,
    jobName: newChar.jobName,
    league: newChar.league,
    score: newChar.score,
    registeredAt: newChar.registeredAt
  });
  io.emit('ratingUpdate', db);
  res.json({ success: true, character: newChar });
});

// 캐릭터 삭제
app.delete('/rating/:id', (req, res) => {
  const db = getRatingDB();
  const target = db.characters.find((c: any) => c.id === req.params.id);
  db.characters = db.characters.filter((c: any) => c.id !== req.params.id);
  saveRatingDB(db);
  if (target) {
    appendBattleLog({
      type: 'unregister',
      characterId: target.id,
      memberName: target.memberName,
      characterName: target.characterName,
      league: target.league,
      score: target.score,
      rating: target.rating,
      wins: target.wins,
      losses: target.losses,
      deletedAt: new Date().toISOString()
    });
  }
  io.emit('ratingUpdate', db);
  res.json({ success: true });
});

// 레이팅 업데이트 (승/패 or 직접 수정)
app.patch('/rating/:id', (req, res) => {
  const { result, ratingChange, setRating, setScore } = req.body;
  const db = getRatingDB();
  const char = db.characters.find((c: any) => c.id === req.params.id);
  if (!char) return res.status(404).json({ success: false, message: '캐릭터 없음' });

  if (setRating !== undefined) {
    // 레이팅 직접 수정
    char.rating = Math.max(0, Number(setRating));
  } else if (setScore !== undefined) {
    // 점수(고정) 직접 수정
    char.score = Math.max(0, Number(setScore));
  } else if (result === 'win') {
    char.wins += 1;
    char.rating += (ratingChange || 20);
  } else if (result === 'loss') {
    char.losses += 1;
    char.rating = Math.max(0, char.rating - (ratingChange || 20));
  }

  saveRatingDB(db);
  io.emit('ratingUpdate', db);
  res.json({ success: true, character: char });
});

// ── 대결 시스템 ──
// DB 초기화 시 battles 배열 보장
const ensureBattles = (db: any) => { if (!db.battles) db.battles = []; return db; };

// 대전 기록 별도 DB
const BATTLE_LOG_PATH = path.join(__dirname, 'battle_log_db.json');
if (!fs.existsSync(BATTLE_LOG_PATH)) fs.writeFileSync(BATTLE_LOG_PATH, JSON.stringify({ logs: [] }, null, 2));
const getBattleLog = () => JSON.parse(fs.readFileSync(BATTLE_LOG_PATH, 'utf-8'));
const saveBattleLog = (data: any) => fs.writeFileSync(BATTLE_LOG_PATH, JSON.stringify(data, null, 2));
const appendBattleLog = (entry: any) => {
  const log = getBattleLog();
  log.logs.push(entry);
  saveBattleLog(log);
};

// 대결 신청
app.post('/rating/battle', (req, res) => {
  const { challengerId, defenderId, status: reqStatus } = req.body;
  if (!challengerId || !defenderId) return res.status(400).json({ success: false, message: '필수 값 누락' });

  const db = ensureBattles(getRatingDB());
  const challenger = db.characters.find((c: any) => c.id === challengerId);
  const defender = db.characters.find((c: any) => c.id === defenderId);
  if (!challenger || !defender) return res.status(404).json({ success: false, message: '캐릭터 없음' });
  if (challenger.league !== defender.league) return res.status(400).json({ success: false, message: '같은 리그끼리만 대결 가능' });

  // 이미 진행 중인 대결 확인 (pending or accepted)
  const ongoing = db.battles.find((b: any) =>
    ['pending', 'accepted', 'intrusion_pending', 'triple_accepted'].includes(b.status) &&
    [b.challengerId, b.defenderId, b.intruderId].filter(Boolean).includes(challengerId) &&
    [b.challengerId, b.defenderId, b.intruderId].filter(Boolean).includes(defenderId)
  );
  if (ongoing) return res.status(409).json({ success: false, message: '이미 진행 중인 대결이 있습니다' });

  // [추가] 신청자가 이미 'pending' 상태인 대결을 가지고 있다면 3자 대결로 자동 전환
  const existingPending = db.battles.find((b: any) =>
    b.status === 'pending' &&
    b.challengerId === challengerId &&
    !b.intruderId
  );

  if (existingPending) {
    existingPending.intruderId = defenderId;
    existingPending.intruderName = defender.characterName;
    existingPending.intruderMember = defender.memberName;
    existingPending.status = 'intrusion_pending';
    existingPending.updatedAt = new Date().toISOString();

    saveRatingDB(db);
    io.emit('ratingUpdate', db);
    return res.json({ success: true, battle: existingPending });
  }


  const battle = {
    id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    challengerId, challengerName: challenger.characterName, challengerMember: challenger.memberName,
    defenderId,   defenderName: defender.characterName,   defenderMember: defender.memberName,
    league: challenger.league,
    status: (reqStatus === 'accepted' && (challenger.memberName === '게스트' || defender.memberName === '게스트')) ? 'accepted' : 'pending',

    ratingChange: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.battles.push(battle);

  saveRatingDB(db);
  io.emit('ratingUpdate', db);
  res.json({ success: true, battle });
});

// 대결 수락 / 거절 / 결과 / 난입
app.patch('/rating/battle/:id', (req, res) => {
  const { action, winnerId, intruderId } = req.body;
  // action: 'accept' | 'reject' | 'result' | 'intrude' | 'accept_intrusion' | 'reject_intrusion'
  const db = ensureBattles(getRatingDB());
  const battle = db.battles.find((b: any) => b.id === req.params.id);
  if (!battle) return res.status(404).json({ success: false, message: '대결 없음' });

  if (action === 'memo') {
    const { memo } = req.body;
    battle.memo = typeof memo === 'string' ? memo.slice(0, 200) : '';
    battle.updatedAt = new Date().toISOString();
    saveRatingDB(db);
    io.emit('ratingUpdate', db);
    return res.json({ success: true, battle });

  } else if (action === 'lock') {
    if (battle.status !== 'completed') return res.status(400).json({ success: false, message: '완료된 대결만 고정 가능' });
    battle.locked = true;
    battle.updatedAt = new Date().toISOString();
    saveRatingDB(db);
    io.emit('ratingUpdate', db);
    return res.json({ success: true, battle });

  } else if (action === 'unlock') {
    battle.locked = false;
    battle.updatedAt = new Date().toISOString();
    saveRatingDB(db);
    io.emit('ratingUpdate', db);
    return res.json({ success: true, battle });

  } else if (action === 'accept') {
    battle.status = 'accepted';
    battle.updatedAt = new Date().toISOString();

  } else if (action === 'reject') {
    battle.status = 'rejected';
    battle.updatedAt = new Date().toISOString();

  } else if (action === 'intrude') {
    if (battle.status !== 'pending') return res.status(400).json({ success: false, message: '신청 중인 대결에만 난입 가능' });
    if (!intruderId) return res.status(400).json({ success: false, message: 'intruderId 필요' });
    const intruder = db.characters.find((c: any) => c.id === intruderId);
    if (!intruder) return res.status(404).json({ success: false, message: '캐릭터 없음' });
    if (intruder.league !== battle.league) return res.status(400).json({ success: false, message: '같은 리그끼리만 가능' });
    if ([battle.challengerId, battle.defenderId].includes(intruderId)) return res.status(400).json({ success: false, message: '이미 대결 중인 캐릭터' });
    battle.intruderId     = intruderId;
    battle.intruderName   = intruder.characterName;
    battle.intruderMember = intruder.memberName;
    battle.status         = 'intrusion_pending';
    battle.updatedAt      = new Date().toISOString();

  } else if (action === 'accept_intrusion') {
    if (battle.status !== 'intrusion_pending') return res.status(400).json({ success: false, message: '난입 대기 상태가 아님' });
    battle.status    = 'triple_accepted';
    battle.updatedAt = new Date().toISOString();

  } else if (action === 'reject_intrusion') {
    if (battle.status !== 'intrusion_pending') return res.status(400).json({ success: false, message: '난입 대기 상태가 아님' });
    delete battle.intruderId;
    delete battle.intruderName;
    delete battle.intruderMember;
    battle.status    = 'pending';
    battle.updatedAt = new Date().toISOString();

  } else if (action === 'result') {
    if (!winnerId) return res.status(400).json({ success: false, message: 'winnerId 필요' });

    // 3자 대결
    if (battle.status === 'triple_accepted') {
      const allIds = [battle.challengerId, battle.defenderId, battle.intruderId];
      const loserIds = allIds.filter((id: string) => id !== winnerId);
      const winner = db.characters.find((c: any) => c.id === winnerId);
      const losers = loserIds.map((id: string) => db.characters.find((c: any) => c.id === id)).filter(Boolean);
      if (!winner) return res.status(404).json({ success: false, message: '캐릭터 없음' });

      winner.wins     += 1;
      winner.rating   += 50;
      winner.winStreak = (winner.winStreak || 0) + 1;
      for (const loser of losers) {
        loser.losses   += 1;
        loser.rating    = Math.max(0, loser.rating - 20);
        loser.winStreak = 0;
      }

      battle.status     = 'completed';
      battle.winnerId   = winnerId;
      battle.loserId    = loserIds[0];
      battle.loserIds   = loserIds;
      battle.isTriple   = true;
      battle.ratingChange = 50;
      battle.updatedAt  = new Date().toISOString();

      appendBattleLog({
        type: 'result_triple', battleId: battle.id, league: battle.league,
        challengerName: battle.challengerName, challengerMember: battle.challengerMember,
        defenderName: battle.defenderName,     defenderMember: battle.defenderMember,
        intruderName: battle.intruderName,     intruderMember: battle.intruderMember,
        winnerName: winner.characterName,      winnerMember: winner.memberName,
        winnerRatingAfter: winner.rating,
        recordedAt: new Date().toISOString()
      });

    // 1:1 대결
    } else {
      const loserId = winnerId === battle.challengerId ? battle.defenderId : battle.challengerId;
      const winner = db.characters.find((c: any) => c.id === winnerId);
      const loser  = db.characters.find((c: any) => c.id === loserId);
      if (!winner || !loser) return res.status(404).json({ success: false, message: '캐릭터 없음' });

      winner.wins      += 1;
      winner.rating    += battle.ratingChange;
      winner.winStreak  = (winner.winStreak || 0) + 1;
      loser.losses     += 1;
      loser.rating      = Math.max(0, loser.rating - battle.ratingChange);
      loser.winStreak   = 0;

      battle.status   = 'completed';
      battle.winnerId = winnerId;
      battle.loserId  = loserId;
      battle.updatedAt = new Date().toISOString();

      appendBattleLog({
        type: 'result', battleId: battle.id, league: battle.league,
        challengerName: battle.challengerName, challengerMember: battle.challengerMember,
        defenderName: battle.defenderName,     defenderMember: battle.defenderMember,
        winnerName: winner.characterName,      winnerMember: winner.memberName,
        loserName: loser.characterName,        loserMember: loser.memberName,
        ratingChange: battle.ratingChange,
        winnerRatingAfter: winner.rating,
        loserRatingAfter: loser.rating,
        recordedAt: new Date().toISOString()
      });
    }
  }

  saveRatingDB(db);
  io.emit('ratingUpdate', db);
  res.json({ success: true, battle });
});

// 대결 삭제 (admin용) - 완료된 대결이면 승패/레이팅 되돌리기
app.delete('/rating/battle/:id', (req, res) => {
  const db = ensureBattles(getRatingDB());
  const battle = db.battles.find((b: any) => b.id === req.params.id);
  if (!battle) return res.status(404).json({ success: false, message: '대결 없음' });
  if (battle.locked) return res.status(403).json({ success: false, message: '고정된 대결은 삭제할 수 없습니다' });

  // 완료된 대결이면 승패/레이팅 원복
  if (battle.status === 'completed' && battle.winnerId) {
    const winner = db.characters.find((c: any) => c.id === battle.winnerId);
    if (battle.isTriple) {
      if (winner) { winner.wins = Math.max(0, winner.wins - 1); winner.rating = Math.max(0, winner.rating - 50); }
      const loserIds = battle.loserIds || [battle.loserId];
      for (const lid of loserIds) {
        const loser = db.characters.find((c: any) => c.id === lid);
        if (loser) { loser.losses = Math.max(0, loser.losses - 1); loser.rating += 20; }
      }
    } else {
      const loser = db.characters.find((c: any) => c.id === battle.loserId);
      if (winner) { winner.wins = Math.max(0, winner.wins - 1); winner.rating = Math.max(0, winner.rating - battle.ratingChange); }
      if (loser)  { loser.losses = Math.max(0, loser.losses - 1); loser.rating += battle.ratingChange; }
    }
  }

  // 삭제 기록 별도 저장
  appendBattleLog({
    type: 'deleted',
    battleId: battle.id,
    league: battle.league,
    challengerName: battle.challengerName, challengerMember: battle.challengerMember,
    defenderName: battle.defenderName,     defenderMember: battle.defenderMember,
    originalStatus: battle.status,
    winnerId: battle.winnerId || null,
    winnerName: battle.winnerId === battle.challengerId ? battle.challengerName : battle.winnerId === battle.defenderId ? battle.defenderName : null,
    ratingChange: battle.ratingChange,
    deletedAt: new Date().toISOString()
  });

  db.battles = db.battles.filter((b: any) => b.id !== req.params.id);
  saveRatingDB(db);
  io.emit('ratingUpdate', db);
  res.json({ success: true });
});

// ==================== 토너먼트 ====================
const TOURNAMENT_DB_PATH = path.join(__dirname, 'tournament_db.json');
const initTournamentMatches = (size: number) => Array.from({ length: size === 16 ? 15 : 7 }, (_, i) => ({ id: `m${i}` }));
const DEFAULT_TOURNAMENT_DB = {
  leagues: {
    bronze: { matches: initTournamentMatches(8), participants: [], bracketSize: 8, isStarted: false },
    silver: { matches: initTournamentMatches(8), participants: [], bracketSize: 8, isStarted: false },
    gold:   { matches: initTournamentMatches(8), participants: [], bracketSize: 8, isStarted: false },
    master: { matches: initTournamentMatches(8), participants: [], bracketSize: 8, isStarted: false },
  },
  history: [] as any[],
};
if (!fs.existsSync(TOURNAMENT_DB_PATH)) {
  fs.writeFileSync(TOURNAMENT_DB_PATH, JSON.stringify(DEFAULT_TOURNAMENT_DB, null, 2));
}
const getTournamentDB = () => JSON.parse(fs.readFileSync(TOURNAMENT_DB_PATH, 'utf-8'));
const saveTournamentDB = (data: any) => fs.writeFileSync(TOURNAMENT_DB_PATH, JSON.stringify(data, null, 2));

app.get('/tournament', (req, res) => res.json(getTournamentDB()));

app.post('/tournament', (req, res) => {
  const { leagues, history } = req.body;
  if (!leagues) return res.status(400).json({ error: 'leagues 필요' });
  const db = { leagues, history: history || [] };
  saveTournamentDB(db);
  io.emit('tournamentUpdate', db);
  res.json({ success: true });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`🚀 [Server] Running on port ${PORT}...`));
