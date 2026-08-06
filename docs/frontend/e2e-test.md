# フロントエンド E2E テスト (Playwright)

`frontend/tests/e2e/` にある Playwright テストは、実際に起動したスタック(nginx +
フロントエンド + バックエンド + Postgres)に対して、ブラウザからアプリを操作して
検証する。

## ディレクトリ構成

```text
frontend/tests/e2e/
├── global-setup.ts   起動中のスタックが dev/prod どちらかを検査する
├── helpers/          サインアップ・ルーム操作・コンソール監視などの共通処理
└── specs/            テスト本体
```

`specs/` の内訳:

| ファイル | 検証する範囲 |
|---|---|
| `auth.spec.ts` | サインアップ/サインイン/ログアウト、保護ルートのリダイレクト、パスワード変更 |
| `form-validation.spec.ts` | 各フォームのクライアント側バリデーションとエラー表示 |
| `xss.spec.ts` | 各フォームに入れた HTML/スクリプトが実行されずエスケープされる |
| `sql-injection.spec.ts` | 各フォームに入れた SQL がクエリではなく文字列として扱われる |
| `legal-pages.spec.ts` | プライバシーポリシー/利用規約への導線と内容 |
| `responsive.spec.ts` | desktop/tablet/mobile の各幅で横スクロールが発生しない |
| `console-clean.spec.ts` | 主要な画面遷移でコンソールにエラー・警告が出ない |
| `secure-connection.spec.ts` | ページから出る通信に混在コンテンツ (http/ws) が無い |
| `profile.spec.ts` | ユーザー名変更、アバターの選択・アップロード・拒否 |
| `friends.spec.ts` | ユーザー検索・フレンド申請・承認・削除・オンライン表示 |
| `notifications.spec.ts` | 通知バッジのリアルタイム更新、ルーム招待からの参加 |
| `room-lobby.spec.ts` | ロビー/待機室のリアルタイム同期、チャット、ホスト引き継ぎ |
| `concurrent-users.spec.ts` | 4人が同時にログインして別々の画面を操作する |
| `game-match.spec.ts` | 2人対戦の開始・操作・決着 |
| `game-multiplayer.spec.ts` | 4人対戦の開始と全画面の同期 |
| `game-reconnect.spec.ts` | 対戦中に切断しても再接続で試合に復帰できる |
| `match-history.spec.ts` | 試合結果が統計・戦闘履歴・ランキングに反映される |

### インジェクション系テストの対象フォーム

`xss.spec.ts` と `sql-injection.spec.ts` は、ユーザー入力を受け取る次のフォームを
それぞれ同じ観点で攻撃する。ペイロードは `helpers/payloads.ts` に集約している。

- SignUp / SignIn 画面
- Room 内 Chat
- プロフィール編集モーダル(ユーザー名)
- 設定 > アカウント情報変更(メールアドレス・ユーザー名)
- Room 作成モーダル(ルーム名)

XSS 側は「描画結果」ではなく副作用でスクリプトの実行を検知する。`helpers/payloads.ts` の
`attachXssProbe()` が、インラインハンドラが立てるフラグ・`alert()` の dialog・
ペイロードが要素として組み立てられていないかの 3 点を見る。

SQL インジェクション側は、認証を突破できないこと・入力が文字列として保存され
そのまま表示されることに加え、`DROP TABLE` 系を流し込んだ後もサインアップ／
サインイン／ロビーが動作することまで確認する。

## 前提

- Docker / Docker Compose v2 (`docker compose` コマンドが使えること)
- ホストに Node.js が入っていること(Playwright 自体・実ブラウザの起動はホスト側で行う)

## セットアップ

```bash
cp .env.example .env

# 依存関係のインストール(docker-compose.yml と同じ node:24-alpine イメージで実行する。
# ホストの node バージョンが違うと package-lock.json に毎回差分が出てしまうため、
# ホストで直接 npm install はしないこと)
make dev-deps

# Playwright が使うブラウザ本体をインストール(config は chromium のみ使用)
npx playwright install --with-deps chromium
```

`node_modules` は `docker-compose.yml`/`docker-compose.prod.yml` の各コンテナでは匿名ボリューム
としてマウントされており、image ビルド時に作られたものがコンテナ再起動をまたいで永続化される。
そのためホスト側で生成した `node_modules` はコンテナには反映されないし、その逆もない。
`make dev-deps` はコンテナとは無関係に、ホストのリポジトリへ直接 `node_modules` /
`package-lock.json` を書き込む使い捨てコンテナ実行であり、Playwright テストを動かす
ホスト環境の依存関係を Dockerfile と同じ Node バージョンで揃えるためだけに使う。

## テストの実行

Playwright は既定で **本番相当スタック**(`docker/docker-compose.prod.yml`)を自動起動する。
開発用スタック(`docker-compose.yml`)は Vite の HMR クライアントなどが console に出るため、
「console にエラー・警告が無いこと」の判定が本番と食い違ってしまう。

開発用スタックがポート 8443 で起動している場合は先に止めておく:

```bash
make dev-down
```

テスト実行:

```bash
cd frontend
npm run test:e2e
```

初回は `docker compose -f ../docker/docker-compose.prod.yml up -d --build` が自動で走るため、
イメージビルドに数分かかる。2回目以降は既に起動しているスタックを再利用する
(`reuseExistingServer: true`)。フロントエンドのコードを変更した後は、再ビルドが走るように
コンテナを一度落とすか `make build` で作り直してから実行すること。

開発用スタックに対して実行したい場合:

```bash
E2E_STACK=dev npm run test:e2e
```

`global-setup.ts` が起動中のスタックの種類(dev/prod)を実際の応答から判定し、
`E2E_STACK` の指定と食い違っていれば実行前にエラーで止まる。

## 結果の確認

```bash
npm run test:e2e:report   # Playwright の HTML レポートを開く
```

## 注意点

- テストは実際に Postgres へユーザー・ルーム・試合結果を書き込む。クリーンアップ処理は
  無いため、繰り返し実行するとデータが蓄積する(ユーザー名は毎回一意にしているので
  衝突はしない)。気になる場合は `make clean`(dev)または
  `docker compose -f docker/docker-compose.prod.yml down -v` でボリュームごと削除してから
  再実行する。
- テストの並列実行はしない(`workers: 1`)。ルーム/ゲーム状態はバックエンドの
  in-memory `Map` で単一プロセス内に保持されており、並列実行すると互いに干渉するため。
