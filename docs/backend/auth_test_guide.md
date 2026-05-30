# Authentication API Testing Guide

このドキュメントは、NestJSで実装したJWT認証機能の動作確認手順をまとめたものです。
自己証明書（HTTPS）環境でのテストを想定しています。

## 接続先情報
- **Base URL:** `https://localhost:8443/api/auth`
- **Signup:** `/signup` (POST)
- **Signin:** `/signin` (POST)
- **Profile:** `/profile` (GET)

## 事前準備
プロジェクトルートに`.env`を作成してください。リポジトリに`.env.example`を含めているので以下のコマンドで複製してから独自の内容に書き換えてください。
```bash
# プロジェクトルートにて
cp .env.example .env
```
作成した`.env`はバージョン管理されません。

## テスト方法 A: curl (コマンドライン)
自己証明書の警告を無視するために `-k` または `--insecure` オプションを使用します。

### サインアップ
```bash
curl -X POST https://localhost:8443/api/auth/signup \
  -k \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### サインイン (トークン取得)
```bash
curl -X POST https://localhost:8443/api/auth/signin \
  -k \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### プロフィール (サインイン済みユーザーでアクセス)
```bash
curl -k -X GET https://localhost:8443/api/auth/profile
-H "Authorization: Bearer <YOUR_JWT_TOKEN_HERE>"
```

## テスト方法 B: VSCode REST Client
VSCodeの拡張機能 [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) をインストールしてください。
`backend/test.http` の`GET`や`POST`などのリクエストメソッド文の上に表示される `Send Request` をクリックします。
ウィンドウの右側に新たなタブが作成され、HTTPリクエストの詳しい内容を見れるはずです。
また書き方は以下を参考にしてください。

```http
### サインアップ
POST https://localhost:8443/api/auth/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

### サインイン
POST https://localhost:8443/api/auth/signin
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

### サインイン確認(profile)
GET https://localhost:8443/api/auth/profile
Authorization: Bearer <YOUR_JWT_TOKEN_HERE>
```

## トークンの検証 (jwt.io)
1. サインイン成功時に返ってきた `access_token` の文字列をコピーします。
2. [jwt.io](https://jwt.io/) にアクセスします。
3. "Encoded" 欄に貼り付けます。
4. "Payload" 欄で以下の項目が正しく入っているか確認します。
   - `sub`: ユーザー識別子
   - `email`: 登録したメールアドレス
   - `iat`: 発行時刻 (Issued At)
   - `exp`: 有効期限 (Expiration Time)

## トラブルシューティング
- **404 Not Found:** NestJS側で `app.setGlobalPrefix('api')` が設定されているか確認してください。
- **502 Bad Gateway:** Nginxコンテナからバックエンドコンテナへのネットワーク疎通（Service名での解決）を確認してください。
- **Certificate Error:** `curl` の場合は `-k` を、ブラウザの場合は「詳細設定」から「localhost:8443にアクセスする（安全ではありません）」をクリックしてください。
