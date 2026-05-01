import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';
import { googleMapsEmbedApiKey } from '../services/geocodingService';
import { getLocalStorageItem, setLocalStorageItem } from '../lib/localStorage';

const KOCHI_CITY_COORDINATES = { lat: 33.5597, lng: 133.5311 };
const MANUAL_REFERENCE_POINT_KEY = 'ramenmap:manual-reference-point';
const DEFAULT_REFERENCE_NAME = '現在地';
const KOCHI_STATION_REFERENCE = { name: '高知駅', lat: 33.5663, lng: 133.543 };
type DistanceSourceMode = 'current' | 'manual';
type ManualReferencePoint = { name: string; lat: number; lng: number };

export function ShopsPage() {
  const [keyword, setKeyword] = useState('');
  const [region, setRegion] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sortMode, setSortMode] = useState<'rating' | 'distance'>('rating');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceSourceMode, setDistanceSourceMode] = useState<DistanceSourceMode>('current');
  const [manualReferenceName, setManualReferenceName] = useState('');
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const [manualReferencePoint, setManualReferencePoint] = useState<ManualReferencePoint | null>(null);
  const [manualReferenceError, setManualReferenceError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
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

  useEffect(() => {
    const saved = getLocalStorageItem(MANUAL_REFERENCE_POINT_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as ManualReferencePoint;
      if (
        typeof parsed.name === 'string' &&
        typeof parsed.lat === 'number' &&
        typeof parsed.lng === 'number' &&
        parsed.lat >= -90 &&
        parsed.lat <= 90 &&
        parsed.lng >= -180 &&
        parsed.lng <= 180
      ) {
        setManualReferencePoint(parsed);
        setManualReferenceName(parsed.name);
        setManualLatitude(String(parsed.lat));
        setManualLongitude(String(parsed.lng));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const allRegions = useMemo(() => Array.from(new Set(shops.map((shop) => shop.region))).sort(), [shops]);

  const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const earthRadiusKm = 6371;
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const activeReferencePoint = useMemo(() => {
    if (distanceSourceMode === 'manual') {
      return manualReferencePoint;
    }

    if (!userLocation) {
      return null;
    }

    return { name: DEFAULT_REFERENCE_NAME, lat: userLocation.lat, lng: userLocation.lng };
  }, [distanceSourceMode, manualReferencePoint, userLocation]);

  const shopDistances = useMemo(() => {
    if (!activeReferencePoint) {
      return new Map<string, number>();
    }

    const distances = new Map<string, number>();
    shops.forEach((shop) => {
      if (shop.latitude == null || shop.longitude == null) {
        return;
      }
      distances.set(shop.id, getDistanceKm(activeReferencePoint.lat, activeReferencePoint.lng, shop.latitude, shop.longitude));
    });
    return distances;
  }, [activeReferencePoint, shops]);

  const filteredShops = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    const result = [...shops].filter((shop) => {
        const regionMatch = region ? shop.region === region : true;
        const keywordMatch = normalizedKeyword
          ? [shop.name, shop.region, shop.ramenType]
              .join(' ')
              .toLowerCase()
              .includes(normalizedKeyword)
          : true;

      return regionMatch && keywordMatch;
    });

    if (sortMode === 'distance' && activeReferencePoint) {
      return result.sort((a, b) => {
        const distanceA = shopDistances.get(a.id);
        const distanceB = shopDistances.get(b.id);
        if (distanceA == null && distanceB == null) {
          return 0;
        }
        if (distanceA == null) {
          return 1;
        }
        if (distanceB == null) {
          return -1;
        }
        return distanceA - distanceB;
      });
    }

    return result.sort((a, b) => (sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating));
  }, [activeReferencePoint, keyword, region, shopDistances, shops, sortMode, sortOrder]);

  const handleGetCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      setLocationError('このブラウザは現在地取得に対応していません。');
      return;
    }

    setLocationStatus('loading');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('success');
      },
      (error) => {
        setLocationStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('現在地の取得が許可されませんでした');
          return;
        }
        if (error.code === error.TIMEOUT) {
          setLocationError('現在地の取得がタイムアウトしました。通信状況を確認して再度お試しください。');
          return;
        }
        setLocationError('現在地の取得に失敗しました。しばらくしてから再度お試しください。');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleSaveManualReferencePoint = () => {
    const trimmedName = manualReferenceName.trim();
    if (!trimmedName) {
      setManualReferenceError('基準地点名を入力してください。');
      return;
    }

    const lat = Number(manualLatitude);
    const lng = Number(manualLongitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setManualReferenceError('緯度は -90〜90 の範囲で入力してください。');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setManualReferenceError('経度は -180〜180 の範囲で入力してください。');
      return;
    }

    const point = { name: trimmedName, lat, lng };
    setManualReferencePoint(point);
    setManualReferenceError(null);
    setDistanceSourceMode('manual');
    setLocalStorageItem(MANUAL_REFERENCE_POINT_KEY, JSON.stringify(point));
  };

  const applyKochiStationReference = () => {
    setManualReferenceName(KOCHI_STATION_REFERENCE.name);
    setManualLatitude(String(KOCHI_STATION_REFERENCE.lat));
    setManualLongitude(String(KOCHI_STATION_REFERENCE.lng));
    setManualReferencePoint(KOCHI_STATION_REFERENCE);
    setManualReferenceError(null);
    setDistanceSourceMode('manual');
    setLocalStorageItem(MANUAL_REFERENCE_POINT_KEY, JSON.stringify(KOCHI_STATION_REFERENCE));
  };


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

        <div>
          <label htmlFor="sortMode">並び替え</label>
          <select
            id="sortMode"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as 'rating' | 'distance')}
          >
            <option value="rating">評価順</option>
            <option value="distance">現在地から近い順</option>
          </select>
          <button type="button" className="button-secondary location-button" onClick={handleGetCurrentLocation}>
            現在地を取得
          </button>
          <div>
            <label htmlFor="distanceSourceMode">距離計算の基準</label>
            <select
              id="distanceSourceMode"
              value={distanceSourceMode}
              onChange={(e) => setDistanceSourceMode(e.target.value as DistanceSourceMode)}
            >
              <option value="current">現在地</option>
              <option value="manual">手動設定した基準地点</option>
            </select>
          </div>
          <div>
            <label htmlFor="manualReferenceName">基準地点名</label>
            <input
              id="manualReferenceName"
              type="text"
              placeholder="例: 高知駅"
              value={manualReferenceName}
              onChange={(e) => setManualReferenceName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="manualLatitude">緯度</label>
            <input
              id="manualLatitude"
              type="number"
              step="any"
              value={manualLatitude}
              onChange={(e) => setManualLatitude(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="manualLongitude">経度</label>
            <input
              id="manualLongitude"
              type="number"
              step="any"
              value={manualLongitude}
              onChange={(e) => setManualLongitude(e.target.value)}
            />
          </div>
          <button type="button" className="button-secondary location-button" onClick={handleSaveManualReferencePoint}>
            基準地点を手動設定
          </button>
          <button type="button" className="button-secondary location-button" onClick={applyKochiStationReference}>
            高知駅を基準にする
          </button>
          {locationStatus === 'loading' ? <p className="location-status">現在地を取得中...</p> : null}
          {locationStatus === 'error' && locationError ? <p className="status-error">{locationError}</p> : null}
          {manualReferenceError ? <p className="status-error">{manualReferenceError}</p> : null}
          {sortMode === 'distance' && !activeReferencePoint ? (
            <p className="location-status">現在地取得または手動設定を行うと近い順で並び替えできます。</p>
          ) : null}
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
              {shopDistances.get(shop.id) != null && activeReferencePoint ? (
                <p className="shop-distance">
                  {activeReferencePoint.name}から約{shopDistances.get(shop.id)?.toFixed(1)}km
                </p>
              ) : null}
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
