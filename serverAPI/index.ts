import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import ioClient from 'socket.io-client';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';
import WebSocket from 'ws';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, 'tokens.json');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4000;
const CHANNEL_ID = process.env.CHZZK_CHANNEL_ID || '';
const CLIENT_ID = process.env.CHZZK_CLIENT_ID || '';
const CLIENT_SECRET = process.env.CHZZK_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.CHZZK_REDIRECT_URI || `http://localhost:${PORT}/api/auth/callback`;

interface Mission {
  id: string;
  content: string;
  time: number | null;
  createdAt: number;
  creator: string;
  count: number;
}

let missions: Mission[] = [];
let chzzkSocket: any = null;

// 1. 토큰 관리 로직
function saveTokens(tokens: any) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ ...tokens, updatedAt: Date.now() }));
}

function loadTokens() {
  if (fs.existsSync(TOKEN_FILE)) return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  return null;
}

async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await axios.post('https://openapi.chzzk.naver.com/auth/v1/token', {
      grantType: 'refresh_token', refreshToken, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET
    });
    const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data.content;
    saveTokens({ accessToken, refreshToken: newRefreshToken || refreshToken, expiresIn });
    return accessToken;
  } catch (error: any) {
    console.error('❌ 토큰 갱신 실패:', error.response?.data || error.message);
    return null;
  }
}

// 2. 미션 처리 및 메시지 파싱
const handleMission = (content: string, time: number | null, nickname: string) => {
  const existingMission = missions.find(m => m.content === content);
  if (existingMission) {
    existingMission.count += 1;
    io.emit('updateMission', existingMission);
  } else {
    const newMission: Mission = {
      id: Date.now().toString(),
      content, time, createdAt: Date.now(),
      creator: nickname, count: 1
    };
    missions.push(newMission);
    io.emit('newMission', newMission);
  }
};

function processChatMessage(rawData: any) {
  console.log(`🔍 [CHZZK-CHAT-DEBUG] 원본 데이터:`, JSON.stringify(rawData).slice(0, 500));

  let data = rawData;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { return; } }

  // 데이터 구조를 유연하게 탐색
  const body = Array.isArray(data) ? data[0] : data;
  const content = body.data?.[0] || body.data || body;

  const text = content.content || content.message || content.msg;
  const nickname = content.profile?.nickname || '익명';

  if (!text) {
    console.log('⚠️ 메시지 내용(text)을 이 파편에서 추출할 수 없습니다.');
    return;
  }

  console.log(`💬 [수신됨] ${nickname}: ${text}`);

  const missionRegex = /^!미션\s+(.+?)(?:\s+(\d+))?$/;
  const match = text.match(missionRegex);
  if (match) {
    handleMission(match[1].trim(), match[2] ? parseInt(match[2], 10) : null, nickname);
  }
}

// 3. 치지직 공식 API 채팅 초기화
async function setupChzzkChat() {
  const tokens = loadTokens();
  if (!tokens) {
    console.log('⚠️ 인증 토큰이 없습니다. http://localhost:4000/api/auth/login 으로 접속해 주세요.');
    return;
  }

  try {
    console.log('🔄 공식 API 세션 인증 시도...');
    const sessionRes = await axios.get('https://openapi.chzzk.naver.com/open/v1/sessions/auth', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` }
    });

    const { url } = sessionRes.data.content;
    if (!url) throw new Error('세션 URL 획득 실패');

    if (chzzkSocket) chzzkSocket.disconnect();
    chzzkSocket = ioClient(url, { transports: ['websocket'], forceNew: true, reconnection: false });

    // 원본 패킷 로깅
    const onevent = (chzzkSocket as any).onevent;
    (chzzkSocket as any).onevent = function (packet: any) {
      const eventName = packet.data?.[0];
      const payload = packet.data?.[1];
      console.log(`📡 [SocketEvent] ${eventName} | Data:`, JSON.stringify(payload).slice(0, 500));
      onevent.call(this, packet);
    };

    chzzkSocket.on('connect', () => console.log('📡 공식 채팅 서버 연결됨!'));

    chzzkSocket.on('SYSTEM', async (rawData: any) => {
      let data = rawData;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { return; } }

      console.log(`📡 [SYSTEM-RAW] Type: ${data.type} | Data:`, JSON.stringify(data.data).slice(0, 500));

      // 1. 연결 성공 처리
      if (data.type === 'connected') {
        const sessionKey = data.data.sessionKey;
        console.log(`🔑 세션 키 획득: ${sessionKey} | 구독 실시...`);
        try {
          const headers = { Authorization: `Bearer ${tokens.accessToken}`, 'Client-Id': CLIENT_ID, 'Client-Secret': CLIENT_SECRET };
          const subUrl = `https://openapi.chzzk.naver.com/open/v1/sessions/events/subscribe/chat?sessionKey=${sessionKey}`;
          axios.post(subUrl, { channelId: CHANNEL_ID }, { headers })
            .then(r => console.log(`✅ 구독 성공!`, r.data))
            .catch(e => console.error(`❌ 구독 실패:`, e.response?.data || e.message));
        } catch (subErr: any) { console.error('❌ 구독 치명적 오류:', subErr.message); }
      } 
      // 2. 채팅 메시지 처리 (SYSTEM 이벤트 내부에 type: 'chat'으로 올 경우)
      else if (data.type === 'chat' || data.type === 'CHAT' || data.type === 'MESSAGE') {
        console.log(`💬 [SYSTEM->CHAT] 데이터 감지됨!`);
        processChatMessage(data.data);
      }
    });

    // 4. 별도 이벤트 이름으로 올 경우 대비 (전방위 핸들러)
    const extraNames = ['CHAT', 'chat', 'EVENT', 'event', 'MESSAGE', 'message'];
    extraNames.forEach(name => {
      chzzkSocket.on(name, (rawData: any) => {
        console.log(`📡 [Recv: ${name}] 포착!`, JSON.stringify(rawData).slice(0, 500));
        processChatMessage(rawData);
      });
    });

  } catch (err: any) {
    if (err.response?.status === 401 && tokens.refreshToken) {
      const newToken = await refreshAccessToken(tokens.refreshToken);
      if (newToken) setupChzzkChat();
    } else {
      console.error('❌ 공식 API 설정 오류:', err.message);
    }
  }
}

// 4. API 라우트
app.get('/api/auth/login', (req, res) => {
  const authUrl = `https://chzzk.naver.com/account-interlock?clientId=${CLIENT_ID}&redirectUri=${encodeURIComponent(REDIRECT_URI)}&state=rnd&scope=chat_message:read`;
  res.redirect(authUrl);
});

app.get('/api/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    const response = await axios.post('https://openapi.chzzk.naver.com/auth/v1/token', {
      grantType: 'authorization_code', code, state, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, redirectUri: REDIRECT_URI
    });
    saveTokens(response.data.content);
    res.send('✅ 인증 성공! 챗봇이 가동됩니다.');
    setupChzzkChat();
  } catch (error: any) {
    res.status(500).send('인증 처리 실패');
  }
});

app.get('/missions', (req, res) => res.json(missions));
app.delete('/missions/:id', (req, res) => {
  missions = missions.filter(m => m.id !== req.params.id);
  io.emit('missionDeleted', req.params.id);
  res.sendStatus(204);
});

app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, '../../client/dist/index.html')));

httpServer.listen(PORT, () => {
  console.log(`🚀 서버 시작: http://localhost:${PORT}`);
  if (loadTokens()) setupChzzkChat();
});
