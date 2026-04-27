import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const getStatusLabel = (isConfigured: boolean) =>
  isConfigured ? '設定済み' : '未設定';

export function SupabaseSettingsPage() {
  const isUrlConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);
  const isAnonKeyConfigured = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const isClientReady = isSupabaseConfigured && Boolean(supabase);

  return (
    <section className="card status-panel">
      <h1>Supabase接続確認</h1>
      <p className="empty-message">
        .env.local の VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を利用して接続準備状態を確認できます。
      </p>

      <dl className="status-list">
        <div>
          <dt>Supabase URL</dt>
          <dd>{getStatusLabel(isUrlConfigured)}</dd>
        </div>
        <div>
          <dt>Supabase API Key</dt>
          <dd>{getStatusLabel(isAnonKeyConfigured)}</dd>
        </div>
      </dl>

      <p className={isClientReady ? 'status-ok' : 'status-error'}>
        {isClientReady
          ? 'Supabase接続準備OK'
          : '.env.local に Supabase情報を設定してください'}
      </p>

      <Link to="/settings/supabase-shops" className="button-secondary detail-button">
        shopsテーブル読み込み確認へ
      </Link>
    </section>
  );
}
