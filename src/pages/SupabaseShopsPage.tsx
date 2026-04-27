import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type SupabaseShop = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  ramen_type: string | null;
  rating: number | null;
  business_hours: string | null;
  recommendation: string | null;
  created_at: string;
  updated_at: string;
};

const columns = [
  'id',
  'name',
  'area',
  'address',
  'ramen_type',
  'rating',
  'business_hours',
  'recommendation',
  'created_at',
  'updated_at',
] as const;

export function SupabaseShopsPage() {
  const [shops, setShops] = useState<SupabaseShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState({
    isUrlConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL),
    isApiKeyConfigured: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
    isClientReady: Boolean(supabase),
  });

  useEffect(() => {
    let isCancelled = false;

    const loadShops = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const timeoutMs = 10_000;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        const isUrlConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);
        const isApiKeyConfigured = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
        const isClientReady = Boolean(supabase);

        if (!isCancelled) {
          setDebugInfo({
            isUrlConfigured,
            isApiKeyConfigured,
            isClientReady,
          });
        }

        if (!isUrlConfigured) {
          throw new Error('Supabase URL が未設定です');
        }

        if (!isApiKeyConfigured) {
          throw new Error('Supabase API Key が未設定です');
        }

        if (!isSupabaseConfigured || !supabase || !isClientReady) {
          throw new Error('Supabaseクライアントを初期化できません');
        }

        const shopsPromise = supabase
          .from('shops')
          .select(columns.join(','))
          .order('created_at', { ascending: true });
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('データ取得がタイムアウトしました（10秒）'));
          }, timeoutMs);
        });

        const { data, error } = await Promise.race([shopsPromise, timeoutPromise]);

        if (error) {
          throw new Error(error.message);
        }

        const fetchedShops = (data ?? []) as SupabaseShop[];
        if (fetchedShops.length === 0) {
          setShops([]);
          setErrorMessage('shops テーブルにデータがありません');
          return;
        }

        if (!isCancelled) {
          setShops(fetchedShops);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setShops([]);
          setErrorMessage(
            error instanceof Error ? error.message : 'データ取得中に不明なエラーが発生しました',
          );
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadShops();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <section className="card supabase-shops-panel">
      <h1>Supabase shops 読み込み確認</h1>
      <p className="empty-message">
        public.shops から指定カラムを取得して画面表示します。<strong>テスト高知ラーメン</strong>
        が一覧に表示されるか確認してください。
      </p>

      {isLoading ? <p>読み込み中...</p> : null}
      {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
      <dl className="status-list">
        <div>
          <dt>Supabase URL</dt>
          <dd>{debugInfo.isUrlConfigured ? '設定済み' : '未設定'}</dd>
        </div>
        <div>
          <dt>Supabase API Key</dt>
          <dd>{debugInfo.isApiKeyConfigured ? '設定済み' : '未設定'}</dd>
        </div>
        <div>
          <dt>Supabaseクライアント</dt>
          <dd>{debugInfo.isClientReady ? '初期化済み' : '未初期化'}</dd>
        </div>
      </dl>

      {!isLoading && !errorMessage ? (
        <>
          <p className="result-count">取得件数: {shops.length}件</p>
          <div className="supabase-shop-list">
            {shops.map((shop) => (
              <article key={shop.id} className="card supabase-shop-item">
                <h2>{shop.name}</h2>
                <dl className="detail-list">
                  <div>
                    <dt>ID</dt>
                    <dd>{shop.id}</dd>
                  </div>
                  <div>
                    <dt>エリア</dt>
                    <dd>{shop.area ?? '未設定'}</dd>
                  </div>
                  <div>
                    <dt>住所</dt>
                    <dd>{shop.address ?? '未設定'}</dd>
                  </div>
                  <div>
                    <dt>ラーメンタイプ</dt>
                    <dd>{shop.ramen_type ?? '未設定'}</dd>
                  </div>
                  <div>
                    <dt>評価</dt>
                    <dd>{shop.rating ?? '未設定'}</dd>
                  </div>
                  <div>
                    <dt>営業時間</dt>
                    <dd>{shop.business_hours ?? '未設定'}</dd>
                  </div>
                  <div>
                    <dt>おすすめ</dt>
                    <dd>{shop.recommendation ?? '未設定'}</dd>
                  </div>
                  <div>
                    <dt>作成日</dt>
                    <dd>{shop.created_at}</dd>
                  </div>
                  <div>
                    <dt>更新日</dt>
                    <dd>{shop.updated_at}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      ) : null}

      <Link to="/settings/supabase" className="button-secondary detail-button">
        Supabase接続確認に戻る
      </Link>
    </section>
  );
}
