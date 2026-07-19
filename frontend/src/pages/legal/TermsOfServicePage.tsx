import { LegalPageLayout } from './LegalPageLayout'

export function TermsOfServicePage() {
  return (
    <LegalPageLayout title="利用規約" lastUpdated="2026年7月19日">
      <section>
        <h2 className="text-xl font-semibold text-gray-900">サービスの利用</h2>
        <p className="mt-2">
          本サービスは、対戦、プロフィール、フレンド、招待、ランキング、ルームチャットなどの機能を備えた学習目的のマルチプレイヤーゲームです。ユーザーは、自身のアカウントで行われる操作および認証情報の適切な管理について責任を負います。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">禁止事項</h2>
        <p className="mt-2">
          他のユーザーへの嫌がらせ、違法または攻撃的なチャット内容の投稿、なりすまし、不具合の悪用、不正行為、対戦の妨害、不正アクセスの試み、およびサービスや他のユーザーへの妨害行為を禁止します。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">
          サービスの提供と対戦結果
        </h2>
        <p className="mt-2">
          本サービスは開発中のため、内容の変更、中断、または終了が行われる場合があります。対戦結果、スコア、ランキングはアプリケーションによって生成され、技術的な問題の影響を受けた場合には修正されることがあります。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">
          アカウントの利用制限
        </h2>
        <p className="mt-2">
          本規約への違反、他のユーザーを保護する必要がある場合、またはサービスを維持するために必要な場合には、サービスへのアクセスを制限し、またはアカウントを削除することがあります。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">
          学習目的のプロジェクト
        </h2>
        <p className="mt-2">
          本サービスは42のft_transcendenceカリキュラムの一環として提供されており、継続的な利用可能性や特定目的への適合性を保証するものではありません。本規約はプロジェクトの説明文書であり、専門的な法的助言を提供するものではありません。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">規約の変更</h2>
        <p className="mt-2">
          本サービスの機能や運用内容の変更に応じて、本規約を変更することがあります。変更した場合は、このページの内容と最終更新日を更新してお知らせします。変更後も本サービスを利用する場合は、最新の規約が適用されます。
        </p>
      </section>
    </LegalPageLayout>
  )
}
