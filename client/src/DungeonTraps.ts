import type { TrapStats } from './DungeonTypes';

export interface TrapTemplate {
  id: string;
  name: string;
  stats: TrapStats;
  icon: string;
}

export const TRAP_TEMPLATES: TrapTemplate[] = [
  {
    id: 'spike_trap',
    name: '가시 함정',
    icon: '📍',
    stats: {
      size: { width: 1, height: 1 },
      attackPower: { min: 10, max: 20 },
      attackFrequency: 0.5,
      attackArea: 0.5,
      isSingleUse: false,
      attackType: 'physical',
      traits: []
    }
  },
  {
    id: 'pitfall_trap',
    name: '낙정 함정',
    icon: '🕳️',
    stats: {
      size: { width: 1, height: 1 },
      attackPower: { min: 100, max: 100 },
      attackFrequency: 0,
      attackArea: 0,
      isSingleUse: true,
      attackType: 'physical',
      traits: ['instant_death_low_hp']
    }
  },
  {
    id: 'flame_vent',
    name: '화염 분출구',
    icon: '🔥',
    stats: {
      size: { width: 1, height: 1 },
      attackPower: { min: 5, max: 10 },
      attackFrequency: 2.0,
      attackArea: 0.5,
      isSingleUse: false,
      attackType: 'magic',
      traits: ['burn']
    }
  },
  {
    id: 'large_blade_trap',
    name: '대형 회전 칼날',
    icon: '⚙️',
    stats: {
      size: { width: 2, height: 2 },
      attackPower: { min: 15, max: 25 },
      attackFrequency: 3.0,
      attackArea: 2.0,
      isSingleUse: false,
      attackType: 'physical',
      traits: ['multi_hit']
    }
  },
  {
    id: 'chaos_rift',
    name: '혼돈의 균열',
    icon: '🌀',
    stats: {
      size: { width: 2, height: 2 },
      attackPower: { min: 30, max: 60 },
      attackFrequency: 0.2,
      attackArea: 3.0,
      isSingleUse: false,
      attackType: 'chaos',
      traits: ['slow']
    }
  }
];
