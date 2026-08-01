import { GameSession } from '../../../common/types/game.type';
import { START_POSITIONS } from '@ft_transcendence/shared/game-map';

export const PLAYER_COLORS = [
  { color: '#ff8800', visorColor: '#00ff00' },
  { color: '#2563eb', visorColor: '#00ffff' },
  { color: '#dc2626', visorColor: '#ffff00' },
  { color: '#16a34a', visorColor: '#ff00ff' },
];

export interface AddPlayerResult {
  success: boolean;
}

export function addPlayerToRoom(
  room: GameSession,
  playerId: string,
  username: string,
): AddPlayerResult {
  if (room.players[playerId]) {
    // 待機中の多重 join (React StrictMode の二重effect実行など)。
    // ゲーム開始前で実害がないため、成功扱いにするだけでよい
    room.playerConnections[playerId].lastActiveTime = 0;
    return { success: true };
  }

  const availableIndices: number[] = [];
  room.startPositionSlots.forEach((id, index) => {
    if (id === null) availableIndices.push(index);
  });

  if (availableIndices.length === 0) return { success: false }; // 満員

  const randomIndex = Math.floor(Math.random() * availableIndices.length);
  const playerIndex = availableIndices[randomIndex];

  room.startPositionSlots[playerIndex] = playerId;

  const position = START_POSITIONS[playerIndex];
  const colors = PLAYER_COLORS[playerIndex];

  room.players[playerId] = {
    id: playerId,
    username,
    position: { x: position.x, z: position.z },
    direction: 'down',
    alive: true,
    color: colors.color,
    visorColor: colors.visorColor,
    isDisconnected: false,
  };
  room.stats[playerId] = {
    alive: true,
    blocksDestroyed: 0,
    bombsPlaced: 0,
    kills: 0,
    survivalTime: 0,
  };
  room.playerConnections[playerId] = {
    lastActiveTime: 0,
  };

  return { success: true };
}

export interface RemovePlayerResult {
  success: boolean;
  isEmpty: boolean;
}

export function removePlayerFromRoom(
  room: GameSession,
  playerId: string,
): RemovePlayerResult {
  if (!room.players[playerId]) {
    return { success: false, isEmpty: false };
  }

  const slotIndex = room.startPositionSlots.indexOf(playerId);
  if (slotIndex !== -1) {
    room.startPositionSlots[slotIndex] = null;
  }

  delete room.players[playerId];
  delete room.stats[playerId];
  if (room.playerInputs) {
    delete room.playerInputs[playerId];
  }

  if (room.playerConnections[playerId]) {
    delete room.playerConnections[playerId];
  }

  // 爆弾すり抜けリストからの除外
  if (room.bombPassingPlayers) {
    for (const bombId in room.bombPassingPlayers) {
      room.bombPassingPlayers[bombId] = room.bombPassingPlayers[bombId].filter(
        (id) => id !== playerId,
      );
    }
  }

  const isEmpty = Object.keys(room.players).length === 0;

  return { success: true, isEmpty };
}

export interface ReconnectResult {
  success: boolean;
}

export function reconnectPlayerToRoom(
  room: GameSession,
  playerId: string,
): ReconnectResult {
  const player = room.players[playerId];
  if (!player || !player.isDisconnected) return { success: false };

  player.isDisconnected = false;
  room.playerConnections[playerId].lastActiveTime = 0;
  room.disconnectedPlayers -= 1;
  room.disconnectedAt = 0; // 誰か一人でも戻ってきたらルームタイマーをリセット

  if (room.playerInputs && room.playerInputs[playerId]) {
    // 再接続時はクライアントが送るseqが初期値に戻るため、サーバー側も初期化する
    room.playerInputs[playerId].seq = 0;
  }

  return { success: true };
}

export interface DisconnectResult {
  success: boolean;
  isAllDisconnected: boolean;
}

export function disconnectPlayerFromRoom(
  room: GameSession,
  playerId: string,
  now: number,
): DisconnectResult {
  const player = room.players[playerId];
  if (!player || player.isDisconnected) {
    return { success: false, isAllDisconnected: false };
  }

  // 入力をリセット
  const playerInput = room.playerInputs?.[playerId];
  if (playerInput) {
    playerInput.direction = null;
  }

  // 切断時の時間を保存（タイムアウト判定のため）
  player.isDisconnected = true;
  room.playerConnections[playerId].lastActiveTime = now;
  room.disconnectedPlayers += 1;

  // room 自体の寿命を図るための判定
  const totalPlayers = Object.keys(room.players).length;
  const isAllDisconnected = room.disconnectedPlayers === totalPlayers;

  if (isAllDisconnected) {
    room.disconnectedAt = now;
  }

  return { success: true, isAllDisconnected };
}
