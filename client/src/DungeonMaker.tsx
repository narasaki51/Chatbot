import React from 'react';
import type { UserAuth } from './App';
import { Sparkles } from 'lucide-react';

interface DungeonMakerProps {
  user: UserAuth;
}

const DungeonMaker: React.FC<DungeonMakerProps> = ({ user }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px',
      padding: '40px',
      background: 'rgba(10, 10, 20, 0.6)',
      borderRadius: '30px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
      minHeight: '600px',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        width: '80px',
        height: '80px',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)'
      }}>
        <Sparkles size={40} color="white" />
      </div>
      
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: 900, 
        margin: 0,
        background: 'linear-gradient(to right, #fff, #94a3b8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-1px'
      }}>
        던전메이커 (Dungeon Maker)
      </h1>
      
      <p style={{ 
        fontSize: '1.1rem', 
        color: '#94a3b8', 
        maxWidth: '500px',
        lineHeight: '1.6',
        margin: '20px 0 40px' 
      }}>
        새로운 모험이 곧 시작됩니다. 나만의 던전을 설계하고 도전자를 맞이할 준비를 하세요.
      </p>

      <div style={{
        padding: '12px 24px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        color: '#6366f1',
        fontWeight: 700,
        fontSize: '0.9rem'
      }}>
        현재 관리자 모드로 접속 중입니다: {user.name}
      </div>
    </div>
  );
};

export default DungeonMaker;
