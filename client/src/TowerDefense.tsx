import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Target, Flag, Edit3, Check, Play, Square, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MobInstance, TowerDefenseUnit } from './TowerDefenseTypes';
import { ENEMY_TEMPLATES } from './TowerDefenseUnits';

const GRID_SIZE = 15;
const SIM_TICK = 50; 

// API Configuration
const IS_DEV = window.location.port === '5173';
const API_BASE = IS_DEV ? `http://${window.location.hostname}:4000` : '';

interface Tile {
  x: number;
  y: number;
  type: 'path' | 'wall' | 'start' | 'end';
}

const TowerDefense: React.FC<{ user: any }> = ({ user }) => {
  const [grid, setGrid] = useState<Tile[][]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTool, setEditTool] = useState<'path' | 'wall' | 'start' | 'end'>('path');
  const [isMouseDown, setIsMouseDown] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [mobs, setMobs] = useState<MobInstance[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TowerDefenseUnit>(ENEMY_TEMPLATES[0]);
  const [fullPath, setFullPath] = useState<{x: number, y: number}[]>([]);
  const timerRef = useRef<any>(null);

  const getDefaultMap = useCallback(() => {
    const newGrid: Tile[][] = Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => ({ x, y, type: 'wall' as const }))
    );
    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      const sx = Math.min(x1, x2), ex = Math.max(x1, x2), sy = Math.min(y1, y2), ey = Math.max(y1, y2);
      for (let y = sy; y <= ey; y++) for (let x = sx; x <= ex; x++) if (newGrid[y] && newGrid[y][x]) newGrid[y][x].type = 'path';
    };
    drawLine(0, 7, 5, 7); drawLine(5, 7, 5, 2); drawLine(5, 2, 10, 2); drawLine(10, 2, 10, 12); drawLine(10, 12, 2, 12); drawLine(2, 12, 2, 7);
    newGrid[7][0].type = 'start'; newGrid[7][14].type = 'end';
    return newGrid;
  }, []);

  // Fetch from server on mount
  useEffect(() => {
    const fetchMap = async () => {
      try {
        const res = await fetch(`${API_BASE}/tower-map`);
        const data = await res.json();
        if (data) setGrid(data);
        else setGrid(getDefaultMap());
      } catch (e) {
        setGrid(getDefaultMap());
      }
    };
    fetchMap();

    const handleGlobalMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [getDefaultMap]);

  const findInertiaPath = useCallback(() => {
    if (grid.length === 0) return [];
    const startTile = grid.flat().find(t => t.type === 'start');
    const endTile = grid.flat().find(t => t.type === 'end');
    if (!startTile || !endTile) return [];
    let cx = startTile.x, cy = startTile.y;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let dx = 0, dy = 0;
    for (const [ndx, ndy] of dirs) {
      const nx = cx + ndx, ny = cy + ndy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && grid[ny][nx].type !== 'wall') { dx = ndx; dy = ndy; break; }
    }
    if (dx === 0 && dy === 0) return [];
    const path = [{ x: cx, y: cy }];
    while (cx !== endTile.x || cy !== endTile.y) {
      if (path.length > 500) break;
      let nx = cx + dx, ny = cy + dy;
      const isBlocked = nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || grid[ny][nx].type === 'wall';
      if (!isBlocked) { cx = nx; cy = ny; path.push({ x: cx, y: cy }); } 
      else {
        let turned = false;
        for (const [ndx, ndy] of dirs) {
          if (ndx === -dx && ndy === -dy) continue;
          const tx = cx + ndx, ty = cy + ndy;
          if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE && grid[ty][tx].type !== 'wall') { dx = ndx; dy = ndy; cx = tx; cy = ty; path.push({ x: cx, y: cy }); turned = true; break; }
        }
        if (!turned) break;
      }
    }
    return (cx === endTile.x && cy === endTile.y) ? path : [];
  }, [grid]);

  const saveToServer = async (currentGrid: Tile[][]) => {
    try {
      await fetch(`${API_BASE}/tower-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentGrid)
      });
    } catch (e) {
      console.error('Failed to save map to server', e);
    }
  };

  const handleStartSimulation = () => {
    const path = findInertiaPath();
    if (path.length === 0) { alert('동작 불가능한 경로입니다!'); return; }
    setFullPath(path);
    setMobs([{ ...selectedTemplate, instanceId: Date.now(), pathIndex: 0, x: path[0].x, y: path[0].y, lastMoveTime: Date.now() }]);
    setIsPlaying(true);
    setIsEditMode(false);
  };

  const handleStopSimulation = () => { setIsPlaying(false); setMobs([]); };

  useEffect(() => {
    if (isPlaying && mobs.length > 0) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        setMobs(prevMobs => {
          const updated = prevMobs.map(mob => {
            const moveInterval = 1000 / mob.speed;
            if (now - mob.lastMoveTime < moveInterval) return mob;
            if (mob.pathIndex >= fullPath.length - 1) return null;
            const nextIdx = mob.pathIndex + 1;
            return { ...mob, pathIndex: nextIdx, x: fullPath[nextIdx].x, y: fullPath[nextIdx].y, lastMoveTime: now };
          }).filter(m => m !== null) as MobInstance[];
          return updated;
        });
      }, SIM_TICK);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, fullPath, mobs.length]);

  useEffect(() => {
    if (isPlaying && mobs.length === 0) {
      setIsPlaying(false);
    }
  }, [isPlaying, mobs.length]);

  const applyEditToTile = (x: number, y: number) => {
    setGrid(prev => {
      const newGrid = [...prev.map(row => [...row])];
      if (!newGrid[y] || !newGrid[y][x]) return prev;
      if (newGrid[y][x].type === editTool) return prev;
      if (editTool === 'start' || editTool === 'end') {
        for (let ry = 0; ry < GRID_SIZE; ry++) for (let rx = 0; rx < GRID_SIZE; rx++) if (newGrid[ry][rx].type === editTool) newGrid[ry][rx].type = 'wall';
      }
      newGrid[y][x] = { ...newGrid[y][x], type: editTool };
      return newGrid;
    });
  };

  const onTileMouseDown = (x: number, y: number) => { if (isEditMode) { setIsMouseDown(true); applyEditToTile(x, y); } };
  const onTileMouseEnter = (x: number, y: number) => { if (isEditMode && isMouseDown && (editTool === 'path' || editTool === 'wall')) applyEditToTile(x, y); };

  const activePath = findInertiaPath();
  const isValidPath = activePath.length > 0;

  return (
    <div style={{ padding: '20px', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px',
        background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '18px', 
            background: isEditMode ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : isPlaying ? '#10b981' : '#00ffa3',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {isEditMode ? <Edit3 size={32} color="black" /> : isPlaying ? <Play size={32} color="white" /> : <Shield size={32} color="black" />}
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>타워 디펜스</h1>
            <p style={{ color: '#64748b', margin: '5px 0', fontSize: '0.9rem' }}>오퍼레이터: {user.name} • <strong>실시간 클라우드 동기화</strong></p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {!isEditMode && !isPlaying ? (
            <><button onClick={handleStartSimulation} style={{ background: '#10b981', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>테스트 시작</button>
              <button onClick={() => setIsEditMode(true)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>지도 편집</button></>
          ) : (
            <button onClick={isPlaying ? handleStopSimulation : () => { saveToServer(grid); setIsEditMode(false); }} 
                    style={{ background: isPlaying ? '#ef4444' : '#fbbf24', color: isPlaying ? 'white' : 'black', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>
              {isPlaying ? '중단' : <><Check size={18} /> 서버 저장</>}
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: '40px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {isEditMode && (
             <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '15px' }}>
                {['path', 'wall', 'start', 'end'].map(t => (
                  <button key={t} onClick={() => setEditTool(t as any)} 
                          style={{ background: editTool === t ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 15px', borderRadius: '8px', textTransform: 'capitalize', cursor: 'pointer' }}>{t}</button>
                ))}
             </div>
          )}
          
          <div style={{ position: 'relative', background: '#0a0a0a', padding: '20px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, 35px)`, gridTemplateRows: `repeat(${GRID_SIZE}, 35px)`, gap: '1px', background: 'rgba(255,255,255,0.02)', touchAction: 'none' }}>
              {grid.map((row, y) => row.map((tile, x) => (
                <div key={`${x}-${y}`} onMouseDown={() => onTileMouseDown(x, y)} onMouseEnter={() => onTileMouseEnter(x, y)}
                  style={{ width: '35px', height: '35px', borderRadius: '4px', background: tile.type === 'start' ? '#10b981' : tile.type === 'end' ? '#ef4444' : tile.type === 'path' ? 'rgba(120, 80, 50, 0.4)' : 'transparent', border: '1px solid rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tile.type === 'start' && <Target size={18} />}
                  {tile.type === 'end' && <Flag size={18} />}
                </div>
              )))}
            </div>
            
            <AnimatePresence>
              {mobs.map(mob => (
                <motion.div key={mob.instanceId} initial={{ x: mob.x * 36, y: mob.y * 36, opacity: 0, scale: 0 }} animate={{ x: mob.x * 36, y: mob.y * 36, opacity: 1, scale: 1 }} transition={{ duration: 1/mob.speed, ease: 'linear' }}
                  style={{ position: 'absolute', left: 20, top: 20, width: '35px', height: '35px', borderRadius: '50%', background: mob.type === 'Boss' ? '#ef4444' : mob.type === 'Elite' ? '#fbbf24' : '#60a5fa', border: '2px solid white', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'black', fontSize: '10px' }}>
                  {Math.ceil(mob.hp)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#00ffa3' }}><Info size={20} /> 적군 도감 (Enemy Database)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
              {ENEMY_TEMPLATES.map(t => (
                <button key={t.templateId} onClick={() => setSelectedTemplate(t)} 
                        style={{ background: selectedTemplate.templateId === t.templateId ? 'rgba(0, 255, 163, 0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${selectedTemplate.templateId === t.templateId ? '#00ffa3' : 'transparent'}`, color: 'white', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left', minWidth: '150px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#888' }}>{t.type}</div>
                  <div style={{ fontWeight: 800 }}>{t.name}</div>
                </button>
              ))}
            </div>

            <AnimatePresence mode='wait'>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} key={selectedTemplate.templateId}
                style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <StatItem label="체력 (HP)" value={`${selectedTemplate.hp} / ${selectedTemplate.maxHp}`} color="#ef4444" />
                  <StatItem label="방어력 (Armor)" value={`${selectedTemplate.armor}`} color="#94a3b8" />
                  <StatItem label="이동 속도" value={`${selectedTemplate.speed} Tiles / Sec`} color="#fbbf24" />
                  <StatItem label="방어 타입" value={selectedTemplate.defenseType} color="#60a5fa" />
                </div>
                <div style={{ marginTop: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedTemplate.tags.map(tag => (
                    <span key={tag} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#ccc' }}>#{tag}</span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div style={{ background: isValidPath ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', padding: '20px', borderRadius: '20px', border: `1px solid ${isValidPath ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`, fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 900, color: isValidPath ? '#10b981' : '#ef4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isValidPath ? '✓ 작전 수행 가능' : <><AlertCircle size={16} /> ✗ 작전 수정 필요</>}
            </div>
            <p style={{ margin: 0, color: '#888' }}>적 유닛은 직진하다가 벽을 만나면 회전합니다. 현재 설계된 길은 <strong>{activePath.length}칸</strong> 길이이며 완주 가능합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div>
    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontWeight: 900, color }}>{value}</div>
  </div>
);

export default TowerDefense;
