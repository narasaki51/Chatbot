import type { TowerDefenseUnit } from './TowerDefenseTypes';

export const ENEMY_TEMPLATES: TowerDefenseUnit[] = [
  {
    templateId: 'basic_goblin',
    name: '고블린 정찰병',
    type: 'Normal',
    defenseType: 'Light',
    speed: 4,
    hp: 50,
    maxHp: 50,
    armor: 2,
    tags: ['fast', 'small']
  },
  {
    templateId: 'heavy_orc',
    name: '오크 전사',
    type: 'Elite',
    defenseType: 'Heavy',
    speed: 2,
    hp: 200,
    maxHp: 200,
    armor: 15,
    tags: ['sturdy']
  },
  {
    templateId: 'boss_dragon',
    name: '고룡',
    type: 'Boss',
    defenseType: 'Fortified',
    speed: 1,
    hp: 2000,
    maxHp: 2000,
    armor: 50,
    tags: ['flying', 'elemental']
  }
];
