# Edge-case チェックリスト

チェックは「テストを書いた／実装した」の意味で使う。カテゴリの頭に付けたチェックボックスは
「そのカテゴリを一通り着手した」の目安として使ってよい（サブ項目とは独立に管理してよい）。

凡例: 🔴 = コードを読んだ時点で実際に落ちる（根拠あり、優先度高）

---

## 🔴 確殺級(優先対応)

- [x] 🔴 `.env` 未設定時に `make` すると `JWT_SECRET=your_jwt_secret_key_here` の既知値で起動する([.env.example](../.env.example)、[Makefile:8-9](../Makefile#L8-L9))。この既知の秘密鍵で任意の `userId` の JWT を偽造し、他人へなりすませることを確認する
  - [x] デフォルト値のまま backend が起動を拒否する(または起動時に警告する)ことを検証するテストも追加する
- [ ] 🔴 `POST /api/auth/logout` が空実装であること([auth.controller.ts:60](../backend/src/auth/auth.controller.ts#L60))を確認し、ログアウト後も同じ accessToken で保護 API が通ってしまうことを再現する
- [x] 🔴 退会(`DELETE /users/me`)がフレンド関係・対戦履歴のある状態で 500 になることを再現する([users.service.ts:281](../backend/src/users/users.service.ts#L281) の `onDelete: Cascade` 未設定 TODO)
  - [x] フレンド申請を1件送った状態での退会
  - [x] 試合を1回終えた(`MatchParticipant` が存在する)状態での退会
  - [x] アバターをアップロードした状態での退会 → `UploadedImage` レコード・実ファイルが孤児化して残ることの確認
- [ ] 🔴 退会後も同じトークンで API 呼び出しが通ってしまうことを確認する([jwt.strategy.ts](../backend/src/auth/strategies/jwt.strategy.ts) が DB を引かず `payload.sub` をそのまま信頼する)
- [ ] 🔴 `/api/auth/signin` に誤パスワードを高頻度で送ってもロック・レート制限が無いことを確認する(`Throttler`/`helmet` 未導入)
- [ ] 🔴 `/api/auth/signup` を並列多発させ、アカウントが無制限に作られることを確認する

---

## Browser Compatibility(コンソール無警告)

- [x] `channel: 'chrome'` を指定した実物の Google Chrome で console-clean 系テストを走らせ、bundled Chromium との差分が無いか確認する
- [x] ゲーム中(`/game/:roomId`)に F5 リロードし、socket 再接続失敗のコンソールエラーが出ないか確認する
- [x] 存在しない ID への直リンクでエラーが出ないか確認する
  - [x] `/room/00000000-0000-0000-0000-000000000000`
  - [x] `/profile/deadbeef`
  - [x] `/game/not-a-room`
- [x] ブラウザバックを連打(ゲーム中→ロビー→戻る)してもコンソールが汚れないか確認する
- [ ] 同一アカウントで2タブ同時ログインしてもコンソールが汚れないか確認する
- [x] DevTools のオフライン切替で socket 切断時に警告が出続けないか確認する
- [ ] WebGL 無効(ソフトウェア GL 無し)の Chrome で `/game` を開いたときの挙動を確認する(現状 `swiftshader` 強制でごまかしている)
- [ ] ErrorBoundary が存在しない([src/](../frontend/src/) に `ErrorBoundary`/`componentDidCatch` が無いことを確認済み)ことを踏まえ、`route.fulfill()` で不正な API レスポンスを返して意図的に白画面化させ、コンソール・UI の挙動を確認する
- [x] タブを閉じる/`beforeunload` 時の socket 切断で警告が出ないか確認する

---

## Privacy Policy / Terms of Service

- [x] `/home` `/lobby` `/rankings` `/game/:id` など全ログイン後ルートのフッターからリーガルページへ到達できるか確認する(現状 `/signin` と `/settings` のみ検証済み)
- [x] 本文が本プロジェクト固有の内容(email・パスワードハッシュ・アバター画像・対戦履歴・localStorage のトークン・WebSocket 接続など実際に扱うデータ)に言及しているか、文字列ベースで検証する
- [x] 退会時のデータ削除方針を謳っている場合、実際の削除挙動(🔴 の退会 500 / 孤児ファイル問題)と矛盾していないか突き合わせる
- [x] モバイル幅(375px 以下)でのリーガルページの表示崩れを確認する(現行 responsive テストはリーガルページ未対象)
- [x] 未ログイン・ログイン済み両方の状態から到達できるか確認する(現状は片方ずつしか検証していない)

---

## Frontend Responsiveness / Accessible

- [x] 320px 幅(iPhone SE 相当)でのレイアウト崩れを確認する
- [x] 横向きモバイル(667×375)でヘッダ・ゲーム canvas が収まるか確認する
- [ ] ブラウザズーム200%・OS フォント特大設定での表示を確認する
- [x] タッチデバイスでゲーム操作が可能か確認する(現状はキーボード入力前提の `useInputManager` のみ)
- [ ] axe-core 等でコントラスト比・フォームラベル・landmark を実測する
- [x] キーボードのみでの全操作(Tab 順序・フォーカスリング・モーダルのフォーカストラップ・Esc で閉じる)を確認する
- [ ] 長いユーザー名(50文字)・長いルーム名(30文字)・長いチャット文字列でのレイアウト崩壊を確認する
- [ ] `prefers-reduced-motion` / OS ダークモード強制時の表示を確認する

---

## Form Validation(フロント + バック)

- [ ] フロントを経由せず各エンドポイントへ直接不正値を送る
  - [ ] `PATCH /users/me`: email を他人と重複させる、変更前と同じ値を送る
  - [ ] `POST /rooms`: `maxPlayers: 0 / 99 / -1 / 2.5 / "2"`
  - [ ] チャット: 空文字・10万文字・改行のみ
- [ ] Unicode 攻撃(全角スペース・ゼロ幅スペース・RTL override `U+202E`・絵文字・homoglyph 例: キリル文字の `а`)をユーザー名に投入し、表示上の見分けが付かなくなることを確認する
- [x] email の大文字小文字違い(`Foo@example.com` vs `foo@example.com`)で二重登録できないか確認する(`@unique` は case-sensitive)
- [ ] 型/構造の混入: `{"password": {"$ne": null}}`、`username: ["a","b"]`、`email: null`、巨大な JSON(10MB body)
- [ ] Content-Type 詐称: `application/x-www-form-urlencoded` や `text/plain` で JSON ボディを送る、`Content-Length` 不一致
- [ ] アバターアップロードのサーバ側検証(現状クライアント側拒否のみテスト済み)
  - [ ] 拡張子だけ `.png` に変えた `.exe` / `.svg` を送り magic byte 検証が効くか確認する
  - [ ] PNG ヘッダ + 末尾に `<script>` を仕込んだ polyglot ファイル
  - [ ] `originalName` に `../../etc/passwd` や XSS ペイロードを入れ、DB にそのまま保存されないか確認する
  - [ ] ちょうど 5MB のファイルを送り、nginx の `client_max_body_size 5M`([nginx.prod.conf](../docker/nginx/conf/nginx.prod.conf)) に先に弾かれて生 HTML の 413 が返り、フロントのエラーハンドラが壊れないか確認する
- [ ] 同時実行の競合を確認する
  - [ ] 同じユーザー名での signup を並列2発(409 が両方返るか、片方 500 にならないか)
  - [ ] フレンド申請を相互に同時送信し、`pairKey` の競合を確認する
- [ ] XSS の未検証経路(現状はチャットとルーム名のみ)
  - [ ] ユーザー名
  - [ ] プロフィール本文
  - [ ] 通知本文
  - [ ] 招待メッセージ
  - [ ] ランキング表示
  - [ ] アバターの `alt` 属性、`javascript:` スキームの avatarUrl
- [ ] チャットは in-memory にそのまま保存されるため、API 直叩きで XSS payload を投入し、後から入室した第三者の画面で発火しないか確認する

---

## Authentication Security

- [ ] 改変 JWT のバリエーションを確認する
  - [ ] `alg: none`
  - [ ] HS256→RS256 confusion
  - [ ] `exp` を書き換えたトークン
  - [ ] `sub` を他人の UUID に差し替えたトークン
- [ ] 有効期限切れトークンの挙動を確認する(短い `JWT_EXPIRES_IN` で起動して検証)
- [ ] WebSocket の認証まわり
  - [ ] `handshake.auth.token` に不正/他人のトークンを渡す
  - [ ] トークン無しで `/game` `/socket.io` に直接接続する
  - [ ] 他人の roomId で `game:join` する
  - [ ] 他プレイヤーになりすまして `player:input` を送る
- [ ] Socket.IO の CORS 設定(`SOCKET_IO_CORS_ORIGIN=http://localhost:5173,...`、[.env.example](../.env.example))が平文 HTTP オリジンからの WS 接続を許可してしまい、「HTTPS everywhere」と矛盾しないか確認する
- [ ] パスワード変更後、別タブ/別ブラウザの旧トークンが失効せず使えてしまわないか確認する
- [ ] タイミング攻撃: 存在するユーザー名 vs 存在しないユーザー名で signin の応答時間差からユーザー列挙が可能でないか確認する([auth.service.ts:87](../backend/src/auth/auth.service.ts#L87) 周辺)
- [ ] bcrypt の 72 バイト切り詰めがマルチバイト文字(日本語24文字 = 72バイト)でどう扱われるか確認する
- [ ] DB に平文パスワードが無いことを `psql` で直接確認する自動テストを用意する(`$2b$` 形式・ソルトの存在)

---

## Multi-user Support / 安定性

- [x] ホストがゲーム中に `browser.close()`(タブ close ではなくプロセス強制終了相当)した場合、残りプレイヤーが進行できるか・部屋が永久ロックされないか確認する
- [x] 同一アカウントで2タブから同じ部屋に入室し、片方を閉じても他方が落ちないか確認する(`socket-presence` の多重接続)
- [ ] `docker compose restart backend` で進行中のルーム・チャット履歴が全消失することを確認する(`rooms-chat.service.ts` は Prisma を使わず in-memory のみ)
- [ ] 同じ部屋に大量参加を試みる(8-10人同時 JOIN 連打)、ルームを大量作成(500個)してメモリリーク・ロビー描画破綻が無いか確認する
- [ ] 試合中に片方が `context.setOffline(true)` で回線切断した場合、タイムアウト処理が正しく走るか・無限待機にならないか確認する(既存 [remote-players.spec.ts](../frontend/tests/e2e/modules/remote-players.spec.ts) は復帰成功パスのみ)
- [ ] `JWT_EXPIRES_IN` 経過後に操作を再開した場合の挙動を確認する
- [x] 同着・全員リタイア・1人だけ残るなど終局のエッジケース(DRAW の扱い、ランキング加算の重複)を確認する

---

## Deployment / Architecture

- [ ] `make fclean` 相当の真っさらな環境から `make` のみで起動できるか確認する
- [x] prod ターゲットに `migrate` が存在しない(Makefile には `dev-migrate` のみ)ことを踏まえ、prod 環境でのマイグレーション手順が抜けていないか確認する
- [ ] 2回目の `make`、`make down && make`、ホスト再起動後、それぞれでデータ永続性を確認する
- [ ] ポート 8443 が既に使用中の環境でのエラーメッセージのわかりやすさを確認する
- [ ] コンテナ単体を kill して `restart: always` により自動復旧するか確認する
- [ ] postgres が落ちた状態での backend の挙動(500 の握り潰しか素の例外か)を確認する
- [ ] `git ls-files` に `.env` が含まれないこと、`git log --all -S 'JWT_SECRET='` 等で履歴に秘密が無いことを自動テスト化する
- [ ] `npm ci` が lockfile と整合すること、`docker compose config` に平文パスワードが露出しないことを確認する

---

## Secure Connections(HTTPS)

- [ ] セキュリティヘッダの欠落を確認する([nginx.prod.conf](../docker/nginx/conf/nginx.prod.conf) には `Cache-Control` しか無い)
  - [ ] CSP 未設定
  - [ ] HSTS 未設定
  - [ ] X-Frame-Options 未設定 → `<iframe src="https://localhost:8443">` でクリックジャッキング可能なことを実証する
  - [ ] X-Content-Type-Options 未設定
  - [ ] Referrer-Policy 未設定
- [ ] `http://localhost:8443` へアクセスした際の挙動(nginx の生 HTML エラーが出る、80番へのリダイレクトが無い)を確認する
- [x] トークンが localStorage に直置きされている([helpers/auth.ts](../frontend/tests/e2e/helpers/auth.ts) で使用)ため、XSS 1件で全トークンが盗めることを確認する(HttpOnly Cookie でない点の指摘)
- [ ] `/uploads/` のパストラバーサルを確認する(`/uploads/../etc/passwd`、`%2e%2e%2f`、二重エンコード)
- [ ] TLS 設定を実測する(TLS1.0/1.1 拒否、暗号スイート、証明書 SAN に `localhost` が入っているか)
- [x] Swagger が prod で実際に無効化されているか(`NODE_ENV` が prod compose で設定されているか)を実測する

---

## Database Design

- [x] `RoomMessage` / `RoomInvitation` がスキーマに存在しないこと([schema.prisma](../backend/prisma/schema.prisma))と、ドキュメント上の記述(永続化されるという説明)との整合性を確認する
- [] `prisma migrate diff` で schema.prisma と実DBの差分がゼロであることを確認する
- [ ] 全 FK について親削除時の挙動を1件ずつ確認する(Friendship / MatchParticipant で 500 になることは確認済み)
- [ ] `Friendship.pairKey` が (A→B) と (B→A) を同一視できているか、逆方向の申請を同時に投げて2行できてしまわないか確認する

---

## Styling Solution

- [ ] Tailwind の utility class が prod ビルド成果物で purge されずに実際に効いているか確認する(dev では効くが prod で崩れるパターン)
- [ ] CSS を無効化した状態でも情報が読めるか(progressive enhancement の観点)確認する

---

## 優先順位メモ

1. 🔴 JWT デフォルト秘密鍵 — `make` した瞬間に成立する完全な認証バイパス。テストを書く前に修正を検討する
2. 🔴 退会 500 — 評価者が普通に触る導線で 500 になる
3. 🔴 ログアウトしてもトークンが無効化されない — Authentication Security の口頭質問で即バレる
4. レート制限なし / セキュリティヘッダなし — 「Form Validation はセキュリティが critical」と明記された項目の穴
5. ErrorBoundary なし / アップロードのサーバ側検証不足 — 「コンソール無警告」要件を一撃で壊せる
