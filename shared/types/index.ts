// 1. ユーザー情報 (User Management)
export interface User {
  id: string;          // 一意のID (UUIDなど)
  username: string;    // 表示名
  email: string;       // メールアドレス
  avatarUrl?: string;  // プロフィール画像のURL（オプショナル）
  createdAt: Date;
  updatedAt: Date;
}

// 1-1. ユーザープロフィール (User Profile) - 回廊のリストを含む
export interface UserProfile extends User {
  cloisters: Cloister[]; // ユーザーが作成した回廊のリスト
}

// 2. 回廊・ギャラリー (The Cloister)
export interface Cloister {
  id: string;
  ownerId: string;     // 作成者(Drawer)のUser ID
  title: string;       // 回廊のタイトル
  theme: string;       // テーマ・説明
  wallColor: string;   // カスタム可能な壁紙の色（Hexコード等）
  isPublished: boolean;// 公開状態かどうか
}

// 2-1. 回廊の詳細情報 (Cloister Detail) - 絵画や作品のリストを含む
export interface CloisterDetail extends Cloister {
  artworks: Artwork[]; // 回廊内の絵画のリスト
}

// 3. 展示される絵画・作品 (Artwork)
export interface Artwork {
  id: string;
  cloisterId: string;  // どの回廊に展示されているか
  title: string;
  authorName: string;  // 絵画の作者名（実在の画家や架空の名前など）
  imageUrl: string;
  description: string;
  audioUrl?: string;   // 音声ガイドのURL（オプショナル）
  orderIndex: number;
}

// 4. 掲示板のコメント (Interaction / Bulletin Board)
export interface Comment {
  id: string;
  cloisterId: string;  // どの回廊の出口にあるコメントか
  authorId: string;    // 誰が書き込んだか
  content: string;     // コメント本文
  createdAt: Date;
  updatedAt: Date;
}

// 5. 足音同期のためのリアルタイムデータ (WebSocket)
export interface FootstepEvent {
  userId: string;
  cloisterId: string;
  positionZ: number;   // 現在の奥行き座標
  timestamp: number;
}
