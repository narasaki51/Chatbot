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

const getMissions = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const saveMissions = (missions: any) => fs.writeFileSync(DB_PATH, JSON.stringify(missions));

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
    res.json({ success: true, role: user.role, name: user.name, chnnelid: user.chnnelid });
  } else {
    res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 틀렸습니다.' });
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
    saveMissions(missions);
    io.emit('updateMission', m);
  }
  res.json(m);
});

app.delete('/missions/:id', (req, res) => {
  let missions = getMissions().filter((m: any) => m.id !== req.params.id);
  saveMissions(missions);
  io.emit('missionDeleted', req.params.id);
  res.status(204).send();
});

// [최적화된 Catch-all] 모든 알 수 없는 요청은 React로 전달
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/missions') && !req.path.startsWith('/test-donation')) {
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

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`🚀 [Server] Running on port ${PORT}...`));
