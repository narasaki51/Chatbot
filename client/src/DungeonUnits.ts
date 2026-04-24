import type { UnitStats } from './DungeonTypes';

export interface UnitTemplate {
  id: string;
  name: string;
  stats: UnitStats;
  icon: string; // We can use Lucide icon names or emojis
}

export const UNIT_TEMPLATES: UnitTemplate[] = [
  {
    id: 'warrior_skeleton',
    name: '해골 전사',
    icon: '⚔️',
    stats: {
      class: 'melee',
      hp: 40,
      maxHp: 40,
      attackPower: { min: 8, max: 12 },
      range: { min: 1, max: 1 },
      attackSpeed: 1.2,
      activityFrequency: 0.3,
      moveDistance: 1,
      size: { width: 1, height: 1 },
      attackArea: 0,
      attackType: 'physical',
      defenseType: 'physical',
      traits: []
    }
  },
  {
    id: 'archer_skeleton',
    name: '해골 궁수',
    icon: '🏹',
    stats: {
      class: 'ranged',
      hp: 25,
      maxHp: 25,
      attackPower: { min: 6, max: 10 },
      range: { min: 2, max: 5 },
      attackSpeed: 0.8,
      activityFrequency: 0.2,
      moveDistance: 1,
      size: { width: 1, height: 1 },
      attackArea: 0,
      attackType: 'physical',
      defenseType: 'physical',
      traits: []
    }
  },
  {
    id: 'apprentice_mage',
    name: '수습 마법사',
    icon: '🧙',
    stats: {
      class: 'ranged',
      hp: 20,
      maxHp: 20,
      attackPower: { min: 12, max: 18 },
      range: { min: 1, max: 4 },
      attackSpeed: 0.5,
      activityFrequency: 0.1,
      moveDistance: 1,
      size: { width: 1, height: 1 },
      attackArea: 1,
      attackType: 'magic',
      defenseType: 'magic',
      traits: []
    }
  },
  {
    id: 'chaos_spawn',
    name: '혼돈의 피조물',
    icon: '👾',
    stats: {
      class: 'melee',
      hp: 60,
      maxHp: 60,
      attackPower: { min: 15, max: 25 },
      range: { min: 1, max: 1 },
      attackSpeed: 1.0,
      activityFrequency: 0.5,
      moveDistance: 2,
      size: { width: 1, height: 1 },
      attackArea: 0,
      attackType: 'chaos',
      defenseType: 'chaos',
      traits: []
    }
  },
  {
    id: 'iron_golem',
    name: '강철 골렘',
    icon: '🤖',
    stats: {
      class: 'melee',
      hp: 150,
      maxHp: 150,
      attackPower: { min: 20, max: 35 },
      range: { min: 1, max: 1 },
      attackSpeed: 0.4,
      activityFrequency: 0.1,
      moveDistance: 1,
      size: { width: 2, height: 2 },
      attackArea: 1.5,
      attackType: 'physical',
      defenseType: 'physical',
      traits: ['sturdy']
    }
  }
];
