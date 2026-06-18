// frontend/backend共通のWebSocketイベント

// 0: 空地(empty), 1: 破壊不可(solid), 2: 破壊可能(breakable)
export type TileType = 0 | 1 | 2;

export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  username: string;
  position: Vector2D;
  velocity: Vector2D; // 移動速度ベクトル（補間処理用）
  direction: "up" | "down" | "left" | "right";
  alive: boolean;
  score: number;
  color: string; // 簡易描画用のカラーコード
  visorColor: string; // 簡易描画用のカラーコード
  // キャラクターのアニメーション状態
  animation: "idle" | "walk" | "win" | "die";
}

export interface Bomb {
  id: string;
  ownerId: string;
  position: Vector2D;
  blastRange: number;
  timerMs: number; // 爆発までの時間
}

export interface GameMap {
  // 固定サイズ（9x9）の2次元配列
  grid: TileType[][];
}

export interface GameState {
  players: Record<string, Player>;
  bombs: Record<string, Bomb>;
  map: GameMap;
  status: "waiting" | "playing" | "result";
}

// --- WebSocket イベントの定義 ---

/**
 * クライアント から サーバー へ送るイベント (Client to Server)
 */
export interface ClientToServerEvents {
  // ゲームへの入室（ロビーからゲーム部屋に遷移した時）
  "game:join": (data: { roomId: string; userId: string }) => void;

  // プレイヤーの移動入力・座標報告（高頻度で送信）
  "player:move": (data: {
    position: Vector2D;
    velocity: Vector2D;
    direction: "up" | "down" | "left" | "right";
    animation: "idle" | "walk" | "win" | "die";
  }) => void;

  // 爆弾設置リクエスト
  "bomb:place_req": () => void;
}

/**
 * サーバー から クライアント へ送るイベント (Server to Client)
 */
export interface ServerToClientEvents {
  // ゲーム初期化データ（マップ、全プレイヤーの初期位置）
  "game:init": (data: {
    map: GameMap;
    players: Record<string, Player>;
    yourId: string;
  }) => void;

  // カウントダウン開始
  "game:countdown": (data: { seconds: number }) => void;

  // ゲーム本番開始
  "game:start": () => void;

  // 定期的な全状態の同期（State Sync: ズレ補正用）
  "game:state_update": (data: {
    players: Record<string, Player>;
    bombs: Record<string, Bomb>;
  }) => void;

  // 誰かが爆弾を設置した
  "bomb:spawn": (data: { bomb: Bomb }) => void;

  // 爆弾が爆発した（爆発エフェクトの範囲、破壊されたブロック、巻き込まれたプレイヤー）
  "bomb:explode": (data: {
    bombId: string;
    affectedTiles: Vector2D[]; // 炎が広がる座標の配列
    destroyedBlocks: Vector2D[]; // 破壊されたブロックの座標
    damagedPlayerIds: string[]; // 死亡したプレイヤーID
  }) => void;

  // ゲーム終了・リザルト
  "game:end": (data: {
    winnerId: string | null;
    rankings: { playerId: string; score: number }[];
  }) => void;
}
