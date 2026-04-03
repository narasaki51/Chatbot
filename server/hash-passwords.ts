/**
 * 비밀번호 해시화 스크립트
 * 실행: npx ts-node hash-passwords.ts
 * → users.json의 모든 평문 pw를 bcrypt 해시로 변환하여 덮어씁니다.
 */
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_PATH = path.join(__dirname, 'users.json');
const SALT_ROUNDS = 12;

async function hashPasswords() {
  const users = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));

  let changed = 0;
  for (const user of users) {
    // 이미 해시된 경우 (bcrypt 해시는 $2b$로 시작) 건너뜀
    if (user.pw && user.pw.startsWith('$2b$')) {
      console.log(`[SKIP] ${user.id} - 이미 해시되어 있음`);
      continue;
    }
    user.pw = await bcrypt.hash(user.pw, SALT_ROUNDS);
    console.log(`[OK]   ${user.id} - 해시화 완료`);
    changed++;
  }

  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
  console.log(`\n✅ ${changed}개 계정 비밀번호 해시화 완료 → users.json 저장됨`);
}

hashPasswords().catch(console.error);
