import React, { useState } from 'react';
import { 
  Sword, 
  Zap, 
  Box, 
  DoorOpen, 
  Gem,
  LayoutGrid,
  Map as MapIcon,
  CircleSlash,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { DungeonData, TileType, ObjectType, DungeonObject, Direction, Tile } from './DungeonTypes';
import { createInitialDungeon, hasPathToRelic } from './DungeonUtils';
import type { Builder } from './DungeonBuilders';
import { UNIT_TEMPLATES } from './DungeonUnits';
import type { UnitTemplate } from './DungeonUnits';
import { TRAP_TEMPLATES } from './DungeonTraps';
import type { TrapTemplate } from './DungeonTraps';
import { DISPENSER_TEMPLATES } from './DungeonDispensers';
import type { DispenserTemplate } from './DungeonDispensers';

interface DungeonEditorProps {
  builder: Builder;
  onBack: () => void;
}

const DungeonEditor: React.FC<DungeonEditorProps> = ({ builder, onBack }) => {
  const [dungeon, setDungeon] = useState<DungeonData>(createInitialDungeon());
  const [selectedTool, setSelectedTool] = useState<TileType | ObjectType | 'eraser'>('floor');
  const [selectedUnitTemplate, setSelectedUnitTemplate] = useState<UnitTemplate>(UNIT_TEMPLATES[0]);
  const [selectedTrapTemplate, setSelectedTrapTemplate] = useState<TrapTemplate>(TRAP_TEMPLATES[0]);
  const [selectedDispenserTemplate, setSelectedDispenserTemplate] = useState<DispenserTemplate>(DISPENSER_TEMPLATES[0]);
  const [selectedDirection, setSelectedDirection] = useState<Direction>('up');
  const [hoveredTile, pHoveredTile] = useState<{x: number, y: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const toggleTile = (x: number, y: number, fromDrag = false) => {
    // Objects (units/traps/dispensers) usually shouldn't be drag-painted to avoid accidents
    if (fromDrag && !['wall', 'floor', 'eraser'].includes(selectedTool)) return;
    
    const newTiles = [...dungeon.tiles.map(row => [...row])]; // Deep copy for simulation
    const currentTile = newTiles[y][x];
    const isEdge = x === 0 || x === dungeon.size - 1 || y === 0 || y === dungeon.size - 1;
    
    // Don't change entrance or relic tiles
    if ((x === dungeon.entrance.x && y === dungeon.entrance.y) || 
        (x === dungeon.relic.x && y === dungeon.relic.y)) return;

    // Prevent changing outer edges
    if (isEdge && (selectedTool === 'wall' || selectedTool === 'floor')) return;

    if (selectedTool === 'wall' || selectedTool === 'floor') {
      if (currentTile.type === selectedTool) return;

      // Simulate wall placement
      if (selectedTool === 'wall') {
        const testTiles = [...dungeon.tiles.map(row => [...row])];
        testTiles[y][x] = { ...currentTile, type: 'wall' };
        if (!hasPathToRelic({ ...dungeon, tiles: testTiles })) {
          // Block if path is broken
          return;
        }
      }

      newTiles[y][x] = { ...currentTile, type: selectedTool };
      
      let updatedObjects = [...dungeon.objects];
      if (selectedTool === 'wall') {
        // Remove any dispensers facing this tile
        updatedObjects = updatedObjects.filter(obj => {
          if (obj.type !== 'dispenser') return true;
          
          let targetX = obj.x;
          let targetY = obj.y;
          if (obj.direction === 'up') targetY--;
          else if (obj.direction === 'down') targetY++;
          else if (obj.direction === 'left') targetX--;
          else if (obj.direction === 'right') targetX++;

          return targetX !== x || targetY !== y;
        });

        // Also remove any units/traps that were on this tile
        updatedObjects = updatedObjects.filter(obj => obj.x !== x || obj.y !== y || obj.type === 'dispenser');
      }

      setDungeon({ ...dungeon, tiles: newTiles, objects: updatedObjects });
    } else if (selectedTool === 'eraser') {
       setDungeon({
         ...dungeon,
         objects: dungeon.objects.filter((obj: DungeonObject) => obj.x !== x || obj.y !== y)
       });
    } else if (['unit', 'trap', 'dispenser'].includes(selectedTool)) {
      // Check placement rules
      const tileType = currentTile.type;
      const isWall = tileType === 'wall';
      
      let canPlace = false;
      if (selectedTool === 'unit' && !isWall) canPlace = true;
      if (selectedTool === 'trap' && !isWall) canPlace = true;
      if (selectedTool === 'dispenser' && isWall) canPlace = true;

      if (canPlace) {
        if (selectedTool === 'dispenser') {
          // ... (existing dispenser logic remains same)
          let targetX = x;
          let targetY = y;
          if (selectedDirection === 'up') targetY--;
          else if (selectedDirection === 'down') targetY++;
          else if (selectedDirection === 'left') targetX--;
          else if (selectedDirection === 'right') targetX++;

          const isOutOfBounds = targetX < 0 || targetX >= dungeon.size || targetY < 0 || targetY >= dungeon.size;
          const targetTile = !isOutOfBounds ? dungeon.tiles[targetY][targetX] : null;
          
          if (isOutOfBounds || !targetTile || targetTile.type !== 'floor') return;

          const existingDispenser = dungeon.objects.find(
            obj => obj.x === x && obj.y === y && obj.type === 'dispenser' && obj.direction === selectedDirection
          );

          if (existingDispenser) {
             setDungeon({ ...dungeon, objects: dungeon.objects.filter(obj => obj.id !== existingDispenser.id) });
             return;
          }
        } else if (selectedTool === 'unit' || selectedTool === 'trap') {
          const stats = selectedTool === 'unit' ? selectedUnitTemplate.stats : selectedTrapTemplate.stats;
          const { width, height } = stats.size;
          
          // Check bounds
          if (x + width > dungeon.size || y + height > dungeon.size) return;

          // Check if all tiles are floor and empty (or toggle)
          const areaTiles: {x: number, y: number}[] = [];
          for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
              areaTiles.push({ x: x + j, y: y + i });
            }
          }

          const isBlocked = areaTiles.some(t => dungeon.tiles[t.y][t.x].type === 'wall');
          if (isBlocked) return;

          // Check for existing units/traps that overlap this area
          const overlapping = dungeon.objects.filter(obj => {
            const oStats = obj.trapStats || obj.stats;
            const objWidth = oStats?.size?.width || 1;
            const objHeight = oStats?.size?.height || 1;
            
            return areaTiles.some(t => 
              t.x >= obj.x && t.x < obj.x + objWidth &&
              t.y >= obj.y && t.y < obj.y + objHeight
            );
          });

          if (overlapping.length > 0) {
            // Toggle: if clicking exactly the same object origin with same name, remove it
            const targetName = selectedTool === 'unit' ? selectedUnitTemplate.name : selectedTrapTemplate.name;
            const sameObj = overlapping.find(obj => obj.x === x && obj.y === y && obj.name === targetName);
            if (sameObj && overlapping.length === 1) {
              setDungeon({ ...dungeon, objects: dungeon.objects.filter(obj => obj.id !== sameObj.id) });
              return;
            }
            // Otherwise, clear overlapping area to place new one
          }
        } else {
          // For dispensers, one per tile
          const existingOnTile = dungeon.objects.find(obj => obj.x === x && obj.y === y);
          if (existingOnTile && existingOnTile.type === selectedTool) {
             setDungeon({ ...dungeon, objects: dungeon.objects.filter(obj => obj.id !== existingOnTile.id) });
             return;
          }
        }

        const newObject: DungeonObject = {
          id: `${selectedTool}-${Date.now()}`,
          type: selectedTool as ObjectType,
          x,
          y,
          name: selectedTool === 'unit' ? selectedUnitTemplate.name : 
                selectedTool === 'trap' ? selectedTrapTemplate.name : 
                selectedTool === 'dispenser' ? selectedDispenserTemplate.name :
                `${selectedTool} ${dungeon.objects.length + 1}`,
          direction: selectedTool === 'dispenser' ? selectedDirection : undefined,
          stats: selectedTool === 'unit' ? selectedUnitTemplate.stats : undefined,
          trapStats: selectedTool === 'trap' ? selectedTrapTemplate.stats : undefined,
          dispenserStats: selectedTool === 'dispenser' ? selectedDispenserTemplate.stats : undefined,
          metadata: selectedTool === 'unit' ? { icon: selectedUnitTemplate.icon } : 
                    selectedTool === 'trap' ? { icon: selectedTrapTemplate.icon } : 
                    selectedTool === 'dispenser' ? { icon: selectedDispenserTemplate.icon } : undefined
        };

        let filteredObjects = [...dungeon.objects];
        if (selectedTool === 'unit' || selectedTool === 'trap') {
          const stats = selectedTool === 'unit' ? selectedUnitTemplate.stats : selectedTrapTemplate.stats;
          const { width, height } = stats.size;
          const areaTiles: {x: number, y: number}[] = [];
          for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
              areaTiles.push({ x: x + j, y: y + i });
            }
          }
          
          filteredObjects = filteredObjects.filter(obj => {
            const oStats = obj.trapStats || obj.stats;
            const oW = oStats?.size?.width || 1;
            const oH = oStats?.size?.height || 1;
            return !areaTiles.some(t => t.x >= obj.x && t.x < obj.x + oW && t.y >= obj.y && t.y < obj.y + oH);
          });
        } else if (selectedTool === 'dispenser') {
          filteredObjects = filteredObjects.filter(obj => (obj.x !== x || obj.y !== y) || obj.type === 'dispenser');
        } else {
          filteredObjects = filteredObjects.filter(obj => obj.x !== x || obj.y !== y);
        }

        setDungeon({ ...dungeon, objects: [...filteredObjects, newObject] });
      }
    }
  };

  const getTileStyles = (x: number, y: number, type: TileType) => {
    const isEntrance = x === dungeon.entrance.x && y === dungeon.entrance.y;
    const isRelic = x === dungeon.relic.x && y === dungeon.relic.y;
    const isEdge = x === 0 || x === dungeon.size - 1 || y === 0 || y === dungeon.size - 1;

    let backgroundColor = '#334155'; // Default floor
    let borderColor = 'rgba(255,255,255,0.05)';

    if (isEntrance) {
      backgroundColor = '#10b981';
    } else if (isRelic) {
      backgroundColor = '#f59e0b';
    } else if (isEdge) {
      backgroundColor = '#0f172a';
    } else if (type === 'wall') {
      backgroundColor = '#1e293b';
      borderColor = 'rgba(255,255,255,0.1)';
    }

    return {
      width: '20px',
      height: '20px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: backgroundColor,
      border: `0.5px solid ${borderColor}`,
      transition: 'background 0.1s',
      position: 'relative'
    } as React.CSSProperties;
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 100px)', 
      gap: '20px',
      color: 'white'
    }}>
      {/* Sidebar Toolset */}
      <div style={{
        width: '320px',
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px', 
            background: builder.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {builder.icon}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{builder.name}</h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dungeon Architect</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: 0 }} />

        <div className="tool-section">
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Terrain</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <ToolButton 
              active={selectedTool === 'floor'} 
              onClick={() => setSelectedTool('floor')}
              icon={<MapIcon size={18} />}
              label="바닥"
            />
            <ToolButton 
              active={selectedTool === 'wall'} 
              onClick={() => setSelectedTool('wall')}
              icon={<LayoutGrid size={18} />}
              label="벽"
            />
          </div>
        </div>

        <div className="tool-section">
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Objects</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <ToolButton 
              active={selectedTool === 'unit'} 
              onClick={() => setSelectedTool('unit')}
              icon={<Sword size={18} />}
              label="유닛 (바닥)"
            />
            <ToolButton 
              active={selectedTool === 'trap'} 
              onClick={() => setSelectedTool('trap')}
              icon={<Zap size={18} />}
              label="함정 (바닥)"
            />
            <ToolButton 
              active={selectedTool === 'dispenser'} 
              onClick={() => setSelectedTool('dispenser')}
              icon={<Box size={18} />}
              label="디스팬서 (벽)"
            />
          </div>
        </div>

        {selectedTool === 'unit' && (
          <div className="tool-section" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <label style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Pick Unit</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {UNIT_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedUnitTemplate(template)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: selectedUnitTemplate.id === template.id ? '#818cf8' : 'rgba(255,255,255,0.05)',
                    background: selectedUnitTemplate.id === template.id ? 'rgba(129, 140, 248, 0.2)' : 'transparent',
                    color: selectedUnitTemplate.id === template.id ? 'white' : '#94a3b8',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{template.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{template.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{template.stats.class === 'melee' ? '근거리' : '원거리'} • {template.stats.attackType}</div>
                  </div>
                </button>
              ))}
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>체력</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{selectedUnitTemplate.stats.hp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>공격력</span>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{selectedUnitTemplate.stats.attackPower.min} ~ {selectedUnitTemplate.stats.attackPower.max}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>사거리</span>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>{selectedUnitTemplate.stats.range.min} ~ {selectedUnitTemplate.stats.range.max}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>공격속도</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>{selectedUnitTemplate.stats.attackSpeed} /s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>공격범위(AOE)</span>
                <span style={{ color: '#f472b6', fontWeight: 700 }}>{selectedUnitTemplate.stats.attackArea}칸</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>이동</span>
                <span style={{ color: '#60a5fa', fontWeight: 700 }}>{selectedUnitTemplate.stats.moveDistance}칸 (빈도 {selectedUnitTemplate.stats.activityFrequency})</span>
              </div>
            </div>
          </div>
        )}

        {selectedTool === 'trap' && (
          <div className="tool-section" style={{ background: 'rgba(244, 63, 94, 0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
            <label style={{ fontSize: '0.8rem', color: '#fb7185', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Pick Trap</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {TRAP_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTrapTemplate(template)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: selectedTrapTemplate.id === template.id ? '#fb7185' : 'rgba(255,255,255,0.05)',
                    background: selectedTrapTemplate.id === template.id ? 'rgba(251, 113, 133, 0.2)' : 'transparent',
                    color: selectedTrapTemplate.id === template.id ? 'white' : '#94a3b8',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{template.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{template.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{template.stats.attackType} • {template.stats.isSingleUse ? '일회성' : '지속'}</div>
                  </div>
                </button>
              ))}
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>공격력</span>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{selectedTrapTemplate.stats.attackPower.min} ~ {selectedTrapTemplate.stats.attackPower.max}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>크기</span>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>{selectedTrapTemplate.stats.size.width} x {selectedTrapTemplate.stats.size.height}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>공격속도</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>{selectedTrapTemplate.stats.attackFrequency} /s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>공격범위(AOE)</span>
                <span style={{ color: '#f472b6', fontWeight: 700 }}>{selectedTrapTemplate.stats.attackArea}칸</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>속성</span>
                <span style={{ color: '#60a5fa', fontWeight: 700 }}>{selectedTrapTemplate.stats.attackType}</span>
              </div>
            </div>
          </div>
        )}

        {selectedTool === 'dispenser' && (
          <div className="tool-section" style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <label style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Pick Dispenser</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {DISPENSER_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedDispenserTemplate(template)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: selectedDispenserTemplate.id === template.id ? '#60a5fa' : 'rgba(255,255,255,0.05)',
                    background: selectedDispenserTemplate.id === template.id ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
                    color: selectedDispenserTemplate.id === template.id ? 'white' : '#94a3b8',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{template.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{template.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{template.stats.attackType} • 감지{template.stats.detectionRange}칸</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>공격력</span>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{selectedDispenserTemplate.stats.attackPower.min} ~ {selectedDispenserTemplate.stats.attackPower.max}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>사거리</span>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>{selectedDispenserTemplate.stats.attackRange.min} ~ {selectedDispenserTemplate.stats.attackRange.max}칸</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>범위(AOE)</span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>{selectedDispenserTemplate.stats.attackArea}칸</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>내구도(회)</span>
                <span style={{ color: '#60a5fa', fontWeight: 700 }}>{selectedDispenserTemplate.stats.breakdownThreshold.min} ~ {selectedDispenserTemplate.stats.breakdownThreshold.max}</span>
              </div>
            </div>

            <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Dispenser Direction</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <DirectionButton active={selectedDirection === 'up'} onClick={() => setSelectedDirection('up')} icon={<ChevronUp size={20} />} />
              <DirectionButton active={selectedDirection === 'down'} onClick={() => setSelectedDirection('down')} icon={<ChevronDown size={20} />} />
              <DirectionButton active={selectedDirection === 'left'} onClick={() => setSelectedDirection('left')} icon={<ChevronLeft size={20} />} />
              <DirectionButton active={selectedDirection === 'right'} onClick={() => setSelectedDirection('right')} icon={<ChevronRight size={20} />} />
            </div>
          </div>
        )}

        <div className="tool-section">
          <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Utilities</label>
          <ToolButton 
            active={selectedTool === 'eraser'} 
            onClick={() => setSelectedTool('eraser')}
            icon={<CircleSlash size={18} />}
            label="지우개"
          />
        </div>

        <div style={{ marginTop: 'auto' }}>
          <button 
            onClick={onBack}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            빌더 선택으로 돌아가기
          </button>
        </div>
      </div>

      {/* Main Dungeon Canvas */}
      <div style={{
        flex: 1,
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }} />
              <span style={{ fontSize: '0.8rem' }}>입구 (Entrance)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '3px' }} />
              <span style={{ fontSize: '0.8rem' }}>성물 (Relic)</span>
            </div>
          </div>
          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
            {hoveredTile ? `[${hoveredTile.x}, ${hoveredTile.y}]` : '30 x 30 Grid'}
          </div>
        </div>

        <div 
          onMouseLeave={() => setIsDragging(false)}
          onMouseUp={() => setIsDragging(false)}
          style={{ 
            flex: 1, 
            padding: '40px', 
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'radial-gradient(circle at center, rgba(30, 41, 59, 0.2) 0%, transparent 70%)'
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${dungeon.size}, 20px)`,
            gridTemplateRows: `repeat(${dungeon.size}, 20px)`,
            gap: '1px',
            background: 'rgba(255,255,255,0.05)',
            border: '4px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            userSelect: 'none'
          }}>
            {dungeon.tiles.map((row: Tile[], y: number) => 
              row.map((tile: Tile, x: number) => {
                const objectsAtTile = dungeon.objects.filter((obj: DungeonObject) => obj.x === x && obj.y === y);
                const tileStyle = getTileStyles(x, y, tile.type);
                
                return (
                  <div
                    key={`${x}-${y}`}
                    onMouseEnter={() => {
                      pHoveredTile({x, y});
                      if (isDragging) toggleTile(x, y, true);
                    }}
                    onMouseLeave={() => pHoveredTile(null)}
                    onMouseDown={() => {
                      setIsDragging(true);
                      toggleTile(x, y);
                    }}
                    style={tileStyle}
                  >
                    {/* Hover Effect */}
                    {hoveredTile?.x === x && hoveredTile?.y === y && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        border: '1px solid white',
                        zIndex: 10,
                        pointerEvents: 'none'
                      }} />
                    )}

                    {/* Entrance Icon */}
                    {x === dungeon.entrance.x && y === dungeon.entrance.y && (
                      <DoorOpen size={14} color="white" />
                    )}

                    {/* Relic Icon */}
                    {x === dungeon.relic.x && y === dungeon.relic.y && (
                      <Gem size={14} color="white" />
                    )}

                    {/* Objects */}
                    {objectsAtTile.map(object => {
                      const stats = object.trapStats || object.stats;
                      const uW = stats?.size?.width || 1;
                      const uH = stats?.size?.height || 1;
                      const isSizable = object.type === 'unit' || object.type === 'trap';
                      
                      return (
                        <div 
                          key={object.id}
                          style={{ 
                            position: (object.type === 'dispenser' || isSizable) ? 'absolute' : 'relative',
                            zIndex: 5,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: isSizable ? `${uW * 100}%` : 'auto',
                            height: isSizable ? `${uH * 100}%` : 'auto',
                            top: isSizable ? 0 : (object.direction === 'up' ? '0' : object.direction === 'down' ? 'auto' : '50%'),
                            left: isSizable ? 0 : (object.direction === 'left' ? '0' : object.direction === 'right' ? 'auto' : '50%'),
                            bottom: object.direction === 'down' ? '0' : 'auto',
                            right: object.direction === 'right' ? '0' : 'auto',
                            transform: isSizable ? 'none' : `translate(${
                              object.type === 'dispenser' 
                                ? (object.direction === 'left' || object.direction === 'right' ? '0' : '-50%')
                                : '-50%'
                            }, ${
                              object.type === 'dispenser'
                                ? (object.direction === 'up' || object.direction === 'down' ? '0' : '-50%')
                                : '-50%'
                            }) rotate(${
                              object.type === 'dispenser' ? (
                                object.direction === 'right' ? '90deg' : 
                                object.direction === 'down' ? '180deg' : 
                                object.direction === 'left' ? '-90deg' : '0deg'
                               ) : '0deg'
                            })`,
                          }}
                        >
                          {object.type === 'unit' && (
                            <div style={{
                              position: 'absolute',
                              top: '-6px',
                              left: '10%',
                              width: '80%',
                              height: '3px',
                              background: 'rgba(0,0,0,0.5)',
                              borderRadius: '2px',
                              overflow: 'hidden',
                              zIndex: 10
                            }}>
                              <div style={{
                                width: '100%',
                                height: '100%',
                                background: '#10b981'
                              }} />
                            </div>
                          )}
                          {(object.type === 'unit' || object.type === 'trap') && (
                            <span style={{ fontSize: `${Math.min(uW, uH) * 0.8}rem`, cursor: 'default' }}>{object.metadata?.icon || '❓'}</span>
                          )}
                          {object.type === 'dispenser' && (
                            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.7rem' }}>{object.metadata?.icon || '🏹'}</span>
                              <div style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)' }}>
                                <ChevronUp size={8} color="#60a5fa" strokeWidth={4} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 16px',
      borderRadius: '12px',
      border: '1px solid',
      borderColor: active ? '#6366f1' : 'rgba(255,255,255,0.1)',
      background: active ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
      color: active ? '#818cf8' : '#94a3b8',
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontWeight: 700,
      transition: 'all 0.2s',
      flex: 1
    }}
  >
    {icon}
    {label}
  </button>
);

const DirectionButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      aspectRatio: '1',
      borderRadius: '8px',
      border: '1px solid',
      borderColor: active ? '#818cf8' : 'rgba(255,255,255,0.1)',
      background: active ? 'rgba(129, 140, 248, 0.3)' : 'rgba(255,255,255,0.03)',
      color: active ? 'white' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    {icon}
  </button>
);

export default DungeonEditor;

