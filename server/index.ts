import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChzzkClient } from 'chzzk';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://chatbot-pbp5-n56phycym-narasaki.vercel.app'
    ],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4000;
const CHANNEL_ID = process.env.CHZZK_CHANNEL_ID || ''; // 치지직 채널 ID

if (!CHANNEL_ID) {
  console.error('⚠️ CHANNEL_ID가 설정되지 않았습니다. .env 파일이나 환경 변수를 확인해주세요.');
}

const client = new ChzzkClient();

// 미션 리스트 (메모리에 임시 저장)
interface Mission {
  id: string;
  content: string;
  time: number | null; // 분 단위 (없음 허용)
  createdAt: number;
  creator: string; // 최초 등록자 닉네임
  count: number;   // 중복 등록 횟수
}

let missions: Mission[] = [];

async function setupChzzk() {
  try {
    // 채팅 인스턴스 생성
    const chat = client.chat({
      channelId: CHANNEL_ID
    });
    
    chat.on('connect', (data: any) => {
      console.log(`✅ 치지직 채팅 연결됨: ${CHANNEL_ID}`);
    });

    chat.on('chat', (message: any) => {
      const text = message.message;
      const nickname = message.profile?.nickname || '익명';
      
      console.log(`💬 [채팅] ${nickname}: ${text}`);
      
      // !미션 명령어 파싱: !미션 (내용) [시간]
      // 시간이 없으면 time은 null로 저장됩니다.
      const missionRegex = /^!미션\s+(.+?)(?:\s+(\d+))?$/;
      const match = text.match(missionRegex);

      if (match) {
        const content = match[1].trim();
        const time = match[2] ? parseInt(match[2], 10) : null; 
        
        if (content) {
          // 중복 확인
          const existingMission = missions.find(m => m.content === content);
          
          if (existingMission) {
            // 이미 존재하는 미션이면 카운트 증가
            existingMission.count += 1;
            console.log(`🔥 미션 중복 등록: [${content}] - ${existingMission.count}회`);
            io.emit('updateMission', existingMission);
          } else {
            // 새로운 미션 등록
            const newMission: Mission = {
              id: Date.now().toString(),
              content,
              time,
              createdAt: Date.now(),
              creator: nickname,
              count: 1
            };
            
            missions.push(newMission);
            console.log(`📝 새 미션 등록: [${content}] - ${time ? time + '분' : '시간 제한 없음'} (작성자: ${nickname})`);
            io.emit('newMission', newMission);
          }
        }
      }
    });

    // 채널 ID에 해당하는 채팅방 입장
    await chat.connect();
    
  } catch (err) {
    console.error('❌ 치지직 채팅 연결 오류:', err);
  }
}

// API 엔드포인트
app.get('/missions', (req, res) => {
  res.json(missions);
});

// 정적 파일 서빙 (Client Build) - Render 배포용
// client 폴더와 server 폴더가 같은 ChatTool 안에 있다고 가정 (../../client/dist)
app.use(express.static(path.join(__dirname, '../../client/dist')));

// API 이외의 모든 경로는 클라이언트의 index.html로 연결 (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

app.delete('/missions/:id', (req, res) => {
  const { id } = req.params;
  missions = missions.filter(m => m.id !== id);
  io.emit('missionDeleted', id);
  res.sendStatus(204);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  if (CHANNEL_ID) {
    setupChzzk();
  }
});
