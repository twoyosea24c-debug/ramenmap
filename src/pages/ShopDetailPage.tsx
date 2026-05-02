import { formatStructuredHours, getShopBusinessStatus } from '../utils/businessHours';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';

import { googleMapsEmbedApiKey } from '../services/geocodingService';
import { appendAdminOperationLog } from '../services/adminOperationLogService';
import { createReservation } from '../services/reservationService';
import { isSupabaseConfigured } from '../lib/supabase';

const MAP_LOAD_HELP_MESSAGE = '地図を読み込めませんでした。Google Maps APIキーの設定、HTTPリファラー制限、Maps JavaScript APIの有効化を確認してください。';

type ReservationFormData = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationDate: string;
  reservationTime: string;
  partySize: string;
  note: string;
};

const initialReservationFormData: ReservationFormData = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  reservationDate: '',
  reservationTime: '',
  partySize: '1',
  note: '',
};

export function ShopDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shops, deleteShop } = useShops();
  const shop = shops.find((item) => item.id === id);
  const { isFavorite, toggleFavorite, removeFavorite } = useFavorites();
  const { isAdmin } = useAuth();
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [reservationForm, setReservationForm] = useState<ReservationFormData>(initialReservationFormData);
  const [reservationSuccessMessage, setReservationSuccessMessage] = useState<string | null>(null);
  const [reservationErrorMessage, setReservationErrorMessage] = useState<string | null>(null);
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
  const [isReservationCompleted, setIsReservationCompleted] = useState(false);
  const [isMapLoadFailed, setIsMapLoadFailed] = useState(false);

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

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleReservationChange = (key: keyof ReservationFormData, value: string) => {
    if (reservationSuccessMessage) {
      setReservationSuccessMessage(null);
    }
    if (isReservationCompleted) {
      setIsReservationCompleted(false);
    }
    setReservationForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReservationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReservationErrorMessage(null);
    setIsSubmittingReservation(true);

    try {
      const customerName = reservationForm.customerName.trim();
      const customerPhone = reservationForm.customerPhone.trim();
      const customerEmail = reservationForm.customerEmail.trim();
      const reservationDate = reservationForm.reservationDate;
      const reservationTime = reservationForm.reservationTime;
      const partySize = Number(reservationForm.partySize);

      if (!customerName || !customerPhone || !customerEmail || !reservationDate || !reservationTime || !reservationForm.partySize) {
        setReservationErrorMessage('必須項目を入力してください。');
        return;
      }

      if (!isValidEmail(customerEmail)) {
        setReservationErrorMessage('メールアドレスの形式が正しくありません。');
        return;
      }

      if (!Number.isInteger(partySize) || partySize < 1) {
        setReservationErrorMessage('人数は1人以上で入力してください。');
        return;
      }

      if (!isSupabaseConfigured) {
        setReservationErrorMessage('現在予約機能を利用できません。管理者へお問い合わせください。');
        return;
      }

      const reservationDatetime = new Date(`${reservationDate}T${reservationTime}`).toISOString();

      await createReservation({
        shopId: shop.id,
        shopName: shop.name,
        customerName,
        customerPhone,
        customerEmail,
        reservationDatetime,
        partySize,
        note: reservationForm.note.trim() || null,
        status: 'pending',
      });

      setReservationSuccessMessage('予約が完了しました。店舗からの確認連絡をお待ちください。');
      setIsReservationCompleted(true);
      setReservationForm(initialReservationFormData);
    } catch (error) {
      console.error(error);
      setReservationErrorMessage('予約の登録に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmittingReservation(false);
    }
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
          ) : !googleMapsEmbedApiKey || isMapLoadFailed ? (
            <p className="shop-map-message">{MAP_LOAD_HELP_MESSAGE}</p>
          ) : (
            <iframe
              title={`${shop.name} の地図`}
              src={mapSrc}
              className="shop-map-iframe"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              onError={() => {
                setIsMapLoadFailed(true);
                if (import.meta.env.DEV) {
                  console.error('Google Maps iframe failed to load.');
                }
              }}
            />
          )}
          {hasCoordinates ? <p className="form-hint">住所: {shop.address} / 緯度 {shop.latitude} / 経度 {shop.longitude}</p> : null}
        </section>
      </article>

      <article className="card detail-card">
        <section className="shop-reservation-section" aria-label="予約フォーム">
          <h2>予約フォーム</h2>
          {reservationSuccessMessage ? <p className="status-ok">{reservationSuccessMessage}</p> : null}
          {reservationErrorMessage ? <p className="status-error">{reservationErrorMessage}</p> : null}
          <form className="shop-form" noValidate onSubmit={(event) => void handleReservationSubmit(event)}>
            <div>
              <label htmlFor="customerName">
                予約者名<span className="required">*</span>
              </label>
              <input
                id="customerName"
                name="customerName"
                value={reservationForm.customerName}
                onChange={(event) => handleReservationChange('customerName', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="customerPhone">
                電話番号<span className="required">*</span>
              </label>
              <input
                id="customerPhone"
                name="customerPhone"
                value={reservationForm.customerPhone}
                onChange={(event) => handleReservationChange('customerPhone', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="customerEmail">
                メールアドレス<span className="required">*</span>
              </label>
              <input
                id="customerEmail"
                name="customerEmail"
                value={reservationForm.customerEmail}
                onChange={(event) => handleReservationChange('customerEmail', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="reservationDate">
                予約日<span className="required">*</span>
              </label>
              <input
                id="reservationDate"
                type="date"
                name="reservationDate"
                value={reservationForm.reservationDate}
                onChange={(event) => handleReservationChange('reservationDate', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="reservationTime">
                予約時間<span className="required">*</span>
              </label>
              <input
                id="reservationTime"
                type="time"
                name="reservationTime"
                value={reservationForm.reservationTime}
                onChange={(event) => handleReservationChange('reservationTime', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="partySize">
                人数<span className="required">*</span>
              </label>
              <input
                id="partySize"
                type="number"
                name="partySize"
                value={reservationForm.partySize}
                onChange={(event) => handleReservationChange('partySize', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="note">備考</label>
              <textarea
                id="note"
                name="note"
                rows={4}
                value={reservationForm.note}
                onChange={(event) => handleReservationChange('note', event.target.value)}
              />
            </div>
            <div className="shop-form-actions">
              <button type="submit" className="button-primary" disabled={isSubmittingReservation}>
                {isSubmittingReservation ? '送信中...' : isReservationCompleted ? '予約完了' : '予約を送信'}
              </button>
              {isReservationCompleted ? <p className="status-ok">予約完了しました</p> : null}
            </div>
          </form>
          {hasCoordinates ? <p className="form-hint">住所: {shop.address} / 緯度 {shop.latitude} / 経度 {shop.longitude}</p> : null}
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
