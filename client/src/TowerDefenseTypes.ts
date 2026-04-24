export type UnitType = 'Normal' | 'Elite' | 'Boss';
export type DefenseType = 'Unarmored' | 'Light' | 'Heavy' | 'Fortified';

export interface TowerDefenseUnit {
  templateId: string;
  name: string;
  type: UnitType;
  defenseType: DefenseType;
  speed: number; // tiles per second
  hp: number;
  maxHp: number;
  armor: number;
  tags: string[];
}

export interface MobInstance extends TowerDefenseUnit {
  instanceId: number;
  pathIndex: number;
  x: number;
  y: number;
  lastMoveTime: number;
}
