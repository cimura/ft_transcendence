import { LegalPageLayout } from './LegalPageLayout'

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="プライバシーポリシー" lastUpdated="2026年7月19日">
      <section>
        <h2 className="text-xl font-semibold text-gray-900">収集する情報</h2>
        <p className="mt-2">
          本サービスでは、メールアドレス、ユーザー名、表示名、パスワードのハッシュ値、アバターなどのアカウント情報を収集します。また、フレンド関係、ルームへの参加状況、チャットメッセージ、対戦結果、スコア、ランキング、招待など、サービスの利用中に作成される情報を保存します。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">情報の利用目的</h2>
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
          セキュリティ対策
        </h2>
        <p className="mt-2">
          本サービスでは、HTTPSによる通信、パスワードのハッシュ化、認証が必要な機能へのアクセス制御など、情報を保護するための合理的な対策を講じます。ただし、インターネット上の通信や情報の保存について、完全な安全性を保証するものではありません。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">情報の保存期間</h2>
        <p className="mt-2">
          収集した情報は、アカウントおよび本サービスを提供するために必要な期間保存します。アカウントが削除された場合、関連する情報は、サービスの整合性維持、技術上の制約、または不正利用への対応に必要なものを除き、合理的な期間内に削除します。
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

      <section>
        <h2 className="text-xl font-semibold text-gray-900">お問い合わせ</h2>
        <p className="mt-2">
          本ポリシーまたは個人情報の取り扱いに関する質問や削除依頼については、本プロジェクトのGitHubリポジトリのIssueを通じて、開発チームまでお問い合わせください。公開のIssueには、パスワードなどの機密情報を記載しないでください。
        </p>
      </section>
    </LegalPageLayout>
  )
}
