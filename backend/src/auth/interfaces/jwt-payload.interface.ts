// アクセストークンからデコードされるデータ構造
export interface JwtPayload {
  sub: string;
  // 有効期限 (秒単位のUNIX時刻)。JwtService.signAsync が signOptions.expiresIn から自動で埋める
  exp?: number;
}
