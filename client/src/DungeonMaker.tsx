import React, { useState } from 'react';
import type { UserAuth } from './App';
import { Sparkles, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BUILDERS } from './DungeonBuilders';
import type { Builder } from './DungeonBuilders';

interface DungeonMakerProps {
  user: UserAuth;
}

const DungeonMaker: React.FC<DungeonMakerProps> = ({ user }) => {
  const [selectedBuilderId, setSelectedBuilderId] = useState<string | null>(null);

  const selectedBuilder = BUILDERS.find(b => b.id === selectedBuilderId);

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center', 
            gap: '12px',
            background: 'rgba(99, 102, 241, 0.1)',
            padding: '8px 20px',
            borderRadius: '100px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#6366f1',
            fontSize: '0.9rem',
            fontWeight: 800,
            marginBottom: '20px'
          }}
        >
          <Crown size={16} /> DUNGEON MAKER
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: '3rem',
            fontWeight: 900,
            margin: 0,
            letterSpacing: '-2px'
          }}
        >
          {selectedBuilder ? `빌더: ${selectedBuilder.name}` : '던전 빌더 선택'}
        </motion.h1>
        <p style={{ color: '#94a3b8', fontSize: '1.2rem', marginTop: '10px' }}>
          {selectedBuilder ? selectedBuilder.title : '당신의 영토를 설계할 지휘관을 결정하십시오.'}
        </p>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '100px'
      }}>
        {BUILDERS.map((builder, idx) => (
          <motion.div
            key={builder.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={!builder.isLocked ? { y: -10, scale: 1.02 } : {}}
            onClick={() => !builder.isLocked && setSelectedBuilderId(builder.id)}
            style={{
              background: selectedBuilderId === builder.id
                ? `linear-gradient(135deg, ${builder.color}22, ${builder.color}44)`
                : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '24px',
              padding: '32px',
              border: `2px solid ${selectedBuilderId === builder.id ? builder.color : builder.isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
              cursor: builder.isLocked ? 'default' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.3s, background 0.3s',
              opacity: builder.isLocked ? 0.6 : 1,
              filter: builder.isLocked ? 'grayscale(0.8)' : 'none'
            }}
          >
            {/* Background Glow */}
            {selectedBuilderId === builder.id && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at top right, ${builder.color}33, transparent)`,
                zIndex: 0
              }} />
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: builder.isLocked ? '#222' : `linear-gradient(135deg, ${builder.color}, ${builder.color}88)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                marginBottom: '24px',
                boxShadow: builder.isLocked ? 'none' : `0 10px 20px ${builder.color}33`
              }}>
                {builder.icon}
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px', margin: 0 }}>
                {builder.name}
              </h2>
              <p style={{ color: builder.isLocked ? '#666' : builder.color, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                {builder.title}
              </p>

              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', height: '60px', overflow: 'hidden', marginBottom: '24px' }}>
                {builder.description}
              </p>

              {!builder.isLocked && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {builder.traits.map((trait, tIdx) => (
                    <div key={tIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '8px' }}>
                      <span style={{ color: '#64748b' }}>{trait.label}</span>
                      <span style={{ color: trait.color, fontWeight: 700 }}>{trait.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {builder.isLocked && (
                <div style={{ 
                  textAlign: 'center',
                  padding: '12px',
                  border: '1px dashed #444',
                  borderRadius: '12px',
                  color: '#444',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  COMING SOON
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedBuilderId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              position: 'fixed',
              bottom: '40px',
              left: 0,
              right: 0,
              zIndex: 100
            }}
          >
            <button
              style={{
                background: `linear-gradient(45deg, ${selectedBuilder?.color}, #a855f7)`,
                color: 'white',
                border: 'none',
                padding: '20px 80px',
                borderRadius: '20px',
                fontSize: '1.2rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: `0 15px 40px ${selectedBuilder?.color}55`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <Sparkles size={24} /> {selectedBuilder?.name}으로 시작하기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DungeonMaker;
