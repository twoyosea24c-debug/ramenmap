import { formatStructuredHours, getShopBusinessStatus } from '../utils/businessHours';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';

import { googleMapsEmbedApiKey } from '../services/geocodingService';
import { appendAdminOperationLog } from '../services/adminOperationLogService';

export function ShopDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shops, deleteShop } = useShops();
  const shop = shops.find((item) => item.id === id);
  const { isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const { isAdmin } = useAuth();
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    const message = sessionStorage.getItem('ramenmap:update-shop-flash');
    if (!message) {
      return;
    }

    setFlashMessage(message);
    sessionStorage.removeItem('ramenmap:update-shop-flash');
  }, []);

  if (!shop) {
    return (
      <section className="card detail-wrapper">
        <h1>店舗が見つかりません</h1>
        <Link to="/shops" className="button-secondary back-button">
          一覧に戻る
        </Link>
      </section>
    );
  }

  const favorite = isFavorite(shop.id);
  const businessStatus = getShopBusinessStatus(shop);
  const hasCoordinates = shop.latitude != null && shop.longitude != null;
  const mapSrc = hasCoordinates
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(googleMapsEmbedApiKey ?? '')}&q=${encodeURIComponent(`${shop.latitude},${shop.longitude}`)}`
    : '';

  const handleDelete = async () => {
    if (!isAdmin) {
      setFlashMessage('管理者のみ削除できます。');
      return;
    }

    const shouldDelete = window.confirm('この店舗を削除しますか？');
    if (!shouldDelete) {
      return;
    }

    const result = await deleteShop(shop.id);
    if (!result.deleted) {
      appendAdminOperationLog({ operationType: '店舗削除', target: shop.name, result: '失敗', message: result.message });
      setFlashMessage(result.message);
      return;
    }

    appendAdminOperationLog({ operationType: '店舗削除', target: shop.name, result: '成功', message: result.message });
    removeFavorite(shop.id);
    navigate('/shops');
  };

  return (
    <section className="detail-wrapper">
      <h1>{shop.name}</h1>
      <p>{businessStatus.label}</p>

      <article className="card detail-card">
        {flashMessage ? <p className="status-ok">{flashMessage}</p> : null}
        {shop.imageUrl ? (
          <img src={shop.imageUrl} alt={`${shop.name} の店舗画像`} className="shop-detail-image" />
        ) : (
          <div className="shop-detail-image-placeholder" aria-label="画像なし">
            画像が登録されていません
          </div>
        )}

        <dl className="detail-list">
          <div>
            <dt>店舗名</dt>
            <dd>{shop.name}</dd>
          </div>
          <div>
            <dt>地域</dt>
            <dd>{shop.region}</dd>
          </div>
          <div>
            <dt>住所</dt>
            <dd>{shop.address}</dd>
          </div>
          <div>
            <dt>ラーメンの種類</dt>
            <dd>{shop.ramenType}</dd>
          </div>
          <div>
            <dt>評価</dt>
            <dd>⭐ {shop.rating.toFixed(1)}</dd>
          </div>
          <div>
            <dt>営業時間</dt>
            <dd>{formatStructuredHours(shop)}</dd>
          </div>
          <div>
            <dt>おすすめポイント</dt>
            <dd>{shop.recommendation}</dd>
          </div>
        </dl>

        <section className="shop-map-section" aria-label="店舗位置">
          <h2>地図</h2>
          {!hasCoordinates ? (
            <p className="shop-map-message">位置情報が未設定です</p>
          ) : !googleMapsEmbedApiKey ? (
            <p className="shop-map-message">Google Maps Embed APIキーが未設定です</p>
          ) : (
            <iframe
              title={`${shop.name} の地図`}
              src={mapSrc}
              className="shop-map-iframe"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          )}
        </section>
      </article>

      <div className="detail-actions">
        <button
          type="button"
          className={favorite ? 'favorite-button is-active' : 'favorite-button'}
          onClick={() => toggleFavorite(shop.id)}
          aria-pressed={favorite}
        >
          {favorite ? 'お気に入り済み' : 'お気に入りに追加'}
        </button>
        {isAdmin ? (
          <>
            <Link to={`/shops/${shop.id}/edit`} className="button-secondary back-button">
              編集
            </Link>
            <button type="button" className="button-danger back-button" onClick={() => void handleDelete()}>
              削除
            </button>
          </>
        ) : null}
        <Link to="/shops" className="button-secondary back-button">
          一覧に戻る
        </Link>
      </div>
    </section>
  );
}
