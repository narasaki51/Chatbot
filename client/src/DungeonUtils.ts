import type { DungeonData, Tile } from './DungeonTypes';

export const DUNGEON_SIZE = 30;

export const createInitialDungeon = (): DungeonData => {
  const size = DUNGEON_SIZE;
  const tiles: Tile[][] = [];

  // Random entrance at the bottom (y = size - 1)
  const entranceX = Math.floor(Math.random() * (size - 2)) + 1; // Not at the very corner
  const entranceY = size - 1;

  // Initialize tiles
  for (let y = 0; y < size; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < size; x++) {
      const isEdge = x === 0 || x === size - 1 || y === 0 || y === size - 1;
      const isEntrance = x === entranceX && y === entranceY;
      
      row.push({ 
        x, 
        y, 
        type: isEdge && !isEntrance ? 'wall' : 'floor' 
      });
    }
    tiles.push(row);
  }

  // Find furthest point for relic (must be floor)
  let maxDist = -1;
  let relicX = 0;
  let relicY = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Don't place relic on walls
      if (tiles[y][x].type === 'wall') continue;

      const dist = Math.abs(x - entranceX) + Math.abs(y - entranceY);
      if (dist > maxDist) {
        maxDist = dist;
        relicX = x;
        relicY = y;
      }
    }
  }

  return {
    size,
    tiles,
    objects: [],
    entrance: { x: entranceX, y: entranceY },
    relic: { x: relicX, y: relicY }
  };
};

export const hasPathToRelic = (dungeon: DungeonData): boolean => {
  const { size, tiles, entrance, relic } = dungeon;
  const queue: [number, number][] = [[entrance.x, entrance.y]];
  const visited = new Set<string>();
  visited.add(`${entrance.x},${entrance.y}`);

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;

    if (x === relic.x && y === relic.y) return true;

    const neighbors = [
      [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        if (tiles[ny][nx].type === 'floor' && !visited.has(`${nx},${ny}`)) {
          visited.add(`${nx},${ny}`);
          queue.push([nx, ny]);
        }
      }
    }
  }

  return false;
};
