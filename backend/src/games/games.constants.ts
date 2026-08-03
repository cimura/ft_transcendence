export const BOMBERMAN_GAME_ID = 'bomberman';

export const bombermanGame = {
  id: BOMBERMAN_GAME_ID,
  name: 'Bomberman',
  description: 'A local multiplayer bomberman-style battle game.',
  supportedPlayers: [2, 3, 4],
  defaultMaxPlayers: 4,
  defaultMapId: 'classic',
  settings: {
    mapId: 'classic',
    gridSize: 9,
    playerSpeed: 3.5,
    bombTimerMs: 2000,
    explosionDurationMs: 500,
    blastRange: 2,
    maxMessages: 50,
    messageMaxLength: 200,
  },
} as const;
