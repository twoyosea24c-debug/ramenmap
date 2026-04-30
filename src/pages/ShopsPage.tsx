import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';
import { googleMapsEmbedApiKey } from '../services/geocodingService';

const KOCHI_CITY_COORDINATES = { lat: 33.5597, lng: 133.5311 };

export function ShopsPage() {
  const [keyword, setKeyword] = useState('');
  const [region, setRegion] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const { isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const { shops, deleteShop, isLoading, loadError, reloadShops } = useShops();
  const { isAdmin } = useAuth();
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapsLoadError, setMapsLoadError] = useState<string | null>(null);

  useEffect(() => {
    const message = sessionStorage.getItem('ramenmap:save-shop-flash');
    if (!message) {
      return;
    }

    setFlashMessage(message);
    sessionStorage.removeItem('ramenmap:save-shop-flash');

    if (message === 'Supabaseに店舗を保存しました。') {
      void reloadShops();
    }
  }, [reloadShops]);

  const allRegions = useMemo(() => Array.from(new Set(shops.map((shop) => shop.region))).sort(), [shops]);

  const filteredShops = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return [...shops]
      .filter((shop) => {
        const regionMatch = region ? shop.region === region : true;
        const keywordMatch = normalizedKeyword
          ? [shop.name, shop.region, shop.ramenType]
              .join(' ')
              .toLowerCase()
              .includes(normalizedKeyword)
          : true;

        return regionMatch && keywordMatch;
      })
      .sort((a, b) => (sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating));
  }, [keyword, region, sortOrder, shops]);


  const mappableShops = useMemo(
    () => filteredShops.filter((shop) => shop.latitude != null && shop.longitude != null),
    [filteredShops],
  );
  useEffect(() => {
    const apiKey = googleMapsEmbedApiKey;
    const mapElement = mapContainerRef.current;

    if (!mapElement || !apiKey) {
      return;
    }

    let isActive = true;

    const renderMap = () => {
      if (!isActive || !mapContainerRef.current || !window.google?.maps) {
        return;
      }

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: KOCHI_CITY_COORDINATES,
        zoom: 12,
      });
      const infoWindow = new window.google.maps.InfoWindow();
      const bounds = new window.google.maps.LatLngBounds();

      mappableShops.forEach((shop) => {
        if (shop.latitude == null || shop.longitude == null) {
          return;
        }

        const position = { lat: shop.latitude, lng: shop.longitude };
        const marker = new window.google.maps.Marker({
          map,
          position,
          title: shop.name,
        });

        const detailUrl = `/shops/${shop.id}`;
        const content = `
          <div>
            <h3>${shop.name}</h3>
            <p>地域: ${shop.region}</p>
            <p>ラーメンの種類: ${shop.ramenType}</p>
            <p>評価: ⭐ ${shop.rating.toFixed(1)}</p>
            <a href="${detailUrl}">詳細ページを見る</a>
          </div>
        `;

        marker.addListener('click', () => {
          infoWindow.setContent(content);
          infoWindow.open({ map, anchor: marker });
        });

        bounds.extend(position);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
      }
    };

    const scriptId = 'google-maps-javascript-api';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.maps) {
        setMapsLoadError(null);
        renderMap();
        return;
      }

      existingScript.addEventListener('load', renderMap, { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          if (isActive) {
            setMapsLoadError('Google Maps JavaScript APIの読み込みに失敗しました。時間をおいて再度お試しください。');
          }
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      setMapsLoadError(null);
      renderMap();
    });
    script.addEventListener('error', () => {
      if (isActive) {
        setMapsLoadError('Google Maps JavaScript APIの読み込みに失敗しました。時間をおいて再度お試しください。');
      }
    });
    document.head.appendChild(script);

    return () => {
      isActive = false;
    };
  }, [mappableShops]);


  const handleDelete = async (shopId: string) => {
    if (!isAdmin) {
      setFlashMessage('管理者のみ削除できます。');
      return;
    }

    const shouldDelete = window.confirm('この店舗を削除しますか？');
    if (!shouldDelete) {
      return;
    }

    const result = await deleteShop(shopId);
    if (!result.deleted) {
      setFlashMessage(result.message);
      return;
    }

    removeFavorite(shopId);
    setFlashMessage(result.message);
  };

  return (
    <section>
      <div className="page-header">
        <h1>店舗一覧</h1>
        {isAdmin ? (
          <Link to="/shops/new" className="button-primary add-shop-button">
            店舗を追加
          </Link>
        ) : null}
      </div>
      <form className="card search-form" aria-label="店舗検索フォーム">
        <div>
          <label htmlFor="keyword">キーワード</label>
          <input
            id="keyword"
            type="search"
            placeholder="店舗名・地域・ラーメン種類で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="region">地域</label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">すべて</option>
            {allRegions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sortOrder">評価順</label>
          <select
            id="sortOrder"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
          >
            <option value="desc">高い順</option>
            <option value="asc">低い順</option>
          </select>
        </div>
      </form>

      <p className="result-count">{filteredShops.length} 件の店舗が見つかりました。</p>
      {flashMessage ? <p className="status-ok">{flashMessage}</p> : null}
      {isLoading ? <p>店舗データを読み込み中です...</p> : null}
      {loadError ? <p className="status-error">{loadError}</p> : null}

      <section className="card shop-map-section" aria-label="地図で見る">
        <h2>地図で見る</h2>
        {!googleMapsEmbedApiKey ? (
          <p className="shop-map-message">Google Maps APIキーが未設定です</p>
        ) : mapsLoadError ? (
          <p className="status-error">{mapsLoadError}</p>
        ) : mappableShops.length === 0 ? (
          <p className="shop-map-message">地図表示できる店舗がありません（位置情報未設定）。</p>
        ) : (
          <div ref={mapContainerRef} className="shops-map-canvas" />
        )}
      </section>

      <div className="shop-list">
        {filteredShops.map((shop) => {
          const favorite = isFavorite(shop.id);

          return (
            <article className="card shop-card" key={shop.id}>
              {shop.imageUrl ? (
                <img src={shop.imageUrl} alt={`${shop.name} の店舗画像`} className="shop-card-image" loading="lazy" />
              ) : (
                <div className="shop-card-image-placeholder" aria-label="画像なし">
                  画像なし
                </div>
              )}
              <div className="shop-card-header">
                <h2>{shop.name}</h2>
                <span className="rating-badge">⭐ {shop.rating.toFixed(1)}</span>
              </div>

              <dl className="shop-meta">
                <div>
                  <dt>地域</dt>
                  <dd>{shop.region}</dd>
                </div>
                <div>
                  <dt>ラーメンの種類</dt>
                  <dd>{shop.ramenType}</dd>
                </div>
                <div>
                  <dt>営業時間</dt>
                  <dd>{shop.businessHours}</dd>
                </div>
              </dl>

              <p>
                <strong>住所:</strong> {shop.address}
              </p>
              <p>{shop.recommendation}</p>
              <div className="shop-actions">
                <button
                  type="button"
                  className={favorite ? 'favorite-button is-active' : 'favorite-button'}
                  onClick={() => toggleFavorite(shop.id)}
                  aria-pressed={favorite}
                >
                  {favorite ? 'お気に入り済み' : 'お気に入りに追加'}
                </button>
                <Link to={`/shops/${shop.id}`} className="button-primary detail-button">
                  詳細を見る
                </Link>
                {isAdmin ? (
                  <>
                    <Link to={`/shops/${shop.id}/edit`} className="button-secondary detail-button">
                      編集
                    </Link>
                    <button
                      type="button"
                      className="button-danger detail-button"
                      onClick={() => void handleDelete(shop.id)}
                    >
                      削除
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
