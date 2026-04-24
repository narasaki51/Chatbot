export type TileType = 'wall' | 'floor';

export type ObjectType = 'unit' | 'trap' | 'dispenser' | 'relic' | 'entrance';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type DamageType = 'physical' | 'magic' | 'chaos';

export type UnitClass = 'melee' | 'ranged';

export interface UnitStats {
  class: UnitClass;
  hp: number;
  maxHp: number;
  attackPower: { min: number; max: number };
  range: { min: number; max: number };
  attackSpeed: number; // Attacks per second
  activityFrequency: number; // 0-1, higher means more frequent movement
  moveDistance: number; // Tiles per move
  size: { width: number; height: number }; // New: tile occupancy
  attackArea: number; // New: AOE radius
  attackType: DamageType;
  defenseType: DamageType;
  traits: string[];
}

export interface TrapStats {
  size: { width: number; height: number };
  attackPower: { min: number; max: number };
  attackFrequency: number;
  attackArea: number; // New: AOE radius
  isSingleUse: boolean;
  attackType: DamageType;
  traits: string[];
}

export interface DispenserStats {
  attackPower: { min: number; max: number };
  attackFrequency: number;
  attackType: DamageType;
  detectionRange: number; // Tiles forward
  attackRange: { min: number; max: number };
  breakdownThreshold: { min: number; max: number }; // Broken after these many attacks
  attackArea: number; // Radius/tiles around target
}

export interface DungeonObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  name: string;
  direction?: Direction;
  stats?: UnitStats; // Detailed stats for units
  trapStats?: TrapStats; // Detailed stats for traps
  dispenserStats?: DispenserStats; // Detailed stats for dispensers
  metadata?: any;
}

export interface Tile {
  x: number;
  y: number;
  type: TileType;
}

export interface DungeonData {
  size: number;
  tiles: Tile[][];
  objects: DungeonObject[];
  entrance: { x: number; y: number };
  relic: { x: number; y: number };
}
