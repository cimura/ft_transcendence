# Authentication API Testing Guide

このドキュメントは、NestJSで実装したJWT認証機能の動作確認手順をまとめたものです。
自己証明書（HTTPS）環境でのテストを想定しています。

## 1. 接続先情報
- **Base URL:** `https://localhost/api/auth`
- **Signup:** `/signup` (POST)
- **Login:** `/login` (POST)

## 2. テスト方法 A: curl (コマンドライン)
自己証明書の警告を無視するために `-k` または `--insecure` オプションを使用します。

### サインアップ
```bash
curl -X POST https://localhost/api/auth/signup \
  -k \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### ログイン (トークン取得)
```bash
curl -X POST https://localhost/api/auth/login \
  -k \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

## 3. テスト方法 B: VSCode REST Client
VSCodeの拡張機能 [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) をインストールしてください。
`backend/test.http` ファイルを作成し、以下の内容を記述して、`POST`文の上に表示される `Send Request` をクリックします。
ウィンドウの右側に新たなタブが作成され、HTTPリクエストの詳しい内容を見れるはずです。

```http
### サインアップ
POST https://localhost/api/auth/signup
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

### サインイン
POST https://localhost/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

## 4. トークンの検証 (jwt.io)
1. ログイン成功時に返ってきた `access_token` の文字列をコピーします。
2. [jwt.io](https://jwt.io/) にアクセスします。
3. "Encoded" 欄に貼り付けます。
4. "Payload" 欄で以下の項目が正しく入っているか確認します。
   - `sub`: ユーザー識別子
   - `email`: 登録したメールアドレス
   - `iat`: 発行時刻 (Issued At)
   - `exp`: 有効期限 (Expiration Time)

## 5. トラブルシューティング
- **404 Not Found:** NestJS側で `app.setGlobalPrefix('api')` が設定されているか確認してください。
- **502 Bad Gateway:** Nginxコンテナからバックエンドコンテナへのネットワーク疎通（Service名での解決）を確認してください。
- **Certificate Error:** `curl` の場合は `-k` を、ブラウザの場合は「詳細設定」から「localhostにアクセスする（安全ではありません）」をクリックしてください。
