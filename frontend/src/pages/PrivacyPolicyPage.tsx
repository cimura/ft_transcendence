import { Link } from 'react-router-dom'

export function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10 text-gray-900 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-md sm:p-10">
        <h1 className="text-3xl font-bold">プライバシーポリシー</h1>
        <p className="mt-2 text-sm text-gray-500">最終更新日：2026年7月19日</p>

        <div className="mt-8 space-y-6 leading-7 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              収集する情報
            </h2>
            <p className="mt-2">
              本サービスでは、メールアドレス、ユーザー名、表示名、パスワードのハッシュ値、アバターなどのアカウント情報を収集します。また、フレンド関係、ルームへの参加状況、チャットメッセージ、対戦結果、スコア、ランキング、招待など、サービスの利用中に作成される情報を保存します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              情報の利用目的
            </h2>
            <p className="mt-2">
              収集した情報は、ユーザー認証、マルチプレイヤーゲームの提供、プロフィールや対戦履歴の表示、フレンドや招待の管理、およびサービスの安全性と信頼性の維持に使用します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              情報の保護と共有
            </h2>
            <p className="mt-2">
              パスワードは平文ではなくハッシュ化して保存します。個人情報を販売することはありません。プロフィール、対戦、ソーシャル機能に関する情報は、アプリケーションの機能を提供するために必要な範囲で、他のユーザーに表示される場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              アカウントについて
            </h2>
            <p className="mt-2">
              アプリケーション上で、対応しているプロフィール情報の変更やアカウント削除を行うことができます。ただし、サービスの整合性維持または技術上の要件のために必要な場合、一部の記録を保持することがあります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              本プロジェクトについて
            </h2>
            <p className="mt-2">
              本サービスは、42のft_transcendenceカリキュラムの一環として制作された学習目的のプロジェクトです。本ポリシーはプロジェクトにおける情報の取り扱い方針を説明するものであり、専門的な法的助言を提供するものではありません。
            </p>
          </section>
        </div>

        <Link
          to="/"
          className="mt-10 inline-block font-medium text-blue-600 hover:text-blue-800"
        >
          アプリに戻る
        </Link>
      </article>
    </main>
  )
}
