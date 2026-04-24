import type { DispenserStats } from './DungeonTypes';

export interface DispenserTemplate {
  id: string;
  name: string;
  stats: DispenserStats;
  icon: string;
}

export const DISPENSER_TEMPLATES: DispenserTemplate[] = [
  {
    id: 'arrow_dispenser',
    name: '화살 발사기',
    icon: '🏹',
    stats: {
      attackPower: { min: 15, max: 25 },
      attackFrequency: 1.0,
      attackType: 'physical',
      detectionRange: 10,
      attackRange: { min: 1, max: 10 },
      breakdownThreshold: { min: 50, max: 100 },
      attackArea: 0
    }
  },
  {
    id: 'poison_dart_trap',
    name: '독침 발사기',
    icon: '🎯',
    stats: {
      attackPower: { min: 5, max: 8 },
      attackFrequency: 2.0,
      attackType: 'magic',
      detectionRange: 5,
      attackRange: { min: 1, max: 5 },
      breakdownThreshold: { min: 30, max: 60 },
      attackArea: 0
    }
  },
  {
    id: 'fire_cannon',
    name: '화염포',
    icon: '☄️',
    stats: {
      attackPower: { min: 40, max: 60 },
      attackFrequency: 0.2,
      attackType: 'magic',
      detectionRange: 8,
      attackRange: { min: 3, max: 8 },
      breakdownThreshold: { min: 20, max: 40 },
      attackArea: 2
    }
  },
  {
    id: 'chaos_beam',
    name: '혼돈의 광선',
    icon: '👁️',
    stats: {
      attackPower: { min: 20, max: 40 },
      attackFrequency: 0.5,
      attackType: 'chaos',
      detectionRange: 15,
      attackRange: { min: 1, max: 15 },
      breakdownThreshold: { min: 10, max: 20 },
      attackArea: 1
    }
  }
];
