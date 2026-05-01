const lastUpdated = '2026年5月1日';

export function PrivacyPage() {
  return (
    <article className="card legal-page">
      <header className="legal-header">
        <h1>プライバシーポリシー</h1>
        <p>ラーメンマップ（以下、「本アプリ」）の利用における情報の取り扱いについてご案内します。</p>
        <p className="legal-updated">最終更新日: {lastUpdated}</p>
      </header>

      <section>
        <h2>1. 取得する情報</h2>
        <p>本アプリでは、運営・機能提供のため、次の情報を取り扱う場合があります。</p>
        <ul>
          <li>店舗情報（店舗名、住所、営業時間、紹介文など）</li>
          <li>管理者ログイン情報（認証に必要な情報）</li>
          <li>画像データ（アップロードされた店舗画像）</li>
          <li>現在地情報（近い順表示などの機能で利用）</li>
        </ul>
      </section>

      <section>
        <h2>2. 現在地情報の利用について</h2>
        <ul>
          <li>現在地情報は、近い順表示など利便性向上の目的でブラウザ上で利用します。</li>
          <li>現在地情報は、ユーザーによる明示的な許可がある場合にのみ取得します。</li>
          <li>許可しない場合でも、本アプリの基本機能は引き続き利用できます。</li>
        </ul>
      </section>

      <section>
        <h2>3. 外部サービスの利用</h2>
        <p>本アプリは、機能提供のため以下のサービスを利用します。</p>
        <ul>
          <li>Google Maps API / Geocoding API（地図表示・位置情報関連機能）</li>
          <li>Supabase（店舗情報などのデータ保存）</li>
        </ul>
      </section>

      <section>
        <h2>4. 画像データの取り扱い</h2>
        <p>アップロードされた店舗画像は、本アプリ内での保存および表示のために利用します。</p>
      </section>

      <section>
        <h2>5. 情報の利用目的</h2>
        <p>取得した情報は、本アプリの提供・運営・改善の目的で利用し、個人情報を目的外に利用しません。</p>
      </section>

      <section>
        <h2>6. お問い合わせ</h2>
        <p>本ポリシーに関するお問い合わせは、管理者までお問い合わせください。</p>
      </section>

      <section>
        <h2>7. 改定について</h2>
        <p>本ポリシーは、必要に応じて内容を見直し、改定する場合があります。</p>
      </section>
    </article>
  );
}
