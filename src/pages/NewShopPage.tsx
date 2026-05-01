import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';
import { uploadShopImage, validateShopImageFile } from '../services/shopImageService';
import { geocodeJapaneseAddress } from '../services/geocodingService';
import { WEEKDAY_OPTIONS } from '../utils/businessHours';

const GOOGLE_MAPS_EMBED_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY as string | undefined;

type ShopFormValues = {
  name: string;
  region: string;
  address: string;
  ramenType: string;
  rating: string;
  businessHours: string;
  openingTime: string;
  closingTime: string;
  closedDays: string[];
  businessHoursNote: string;
  recommendation: string;
  latitude: string;
  longitude: string;
};

type ShopFormErrors = Partial<Record<keyof ShopFormValues, string>>;

const initialValues: ShopFormValues = {
  name: '',
  region: '',
  address: '',
  ramenType: '',
  rating: '',
  businessHours: '',
  openingTime: '',
  closingTime: '',
  closedDays: [],
  businessHoursNote: '',
  recommendation: '',
  latitude: '',
  longitude: '',
};

export function NewShopPage() {
  const navigate = useNavigate();
  const { addShop } = useShops();
  const { isAdmin } = useAuth();
  const [values, setValues] = useState<ShopFormValues>(initialValues);
  const [errors, setErrors] = useState<ShopFormErrors>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const latitudeValue = values.latitude.trim();
  const longitudeValue = values.longitude.trim();
  const parsedLatitude = latitudeValue ? Number(latitudeValue) : null;
  const parsedLongitude = longitudeValue ? Number(longitudeValue) : null;
  const hasPreviewCoordinates =
    parsedLatitude != null
    && Number.isFinite(parsedLatitude)
    && parsedLatitude >= -90
    && parsedLatitude <= 90
    && parsedLongitude != null
    && Number.isFinite(parsedLongitude)
    && parsedLongitude >= -180
    && parsedLongitude <= 180;
  const previewMapSrc = hasPreviewCoordinates
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(GOOGLE_MAPS_EMBED_API_KEY ?? '')}&q=${encodeURIComponent(`${parsedLatitude},${parsedLongitude}`)}`
    : null;

  const onChange = (field: keyof ShopFormValues, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === 'address' || field === 'latitude' || field === 'longitude') {
      setGeocodeError(null);
    }
  };

  const validate = (): ShopFormErrors => {
    const nextErrors: ShopFormErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = '店舗名は必須です。';
    }

    if (!values.region.trim()) {
      nextErrors.region = '地域は必須です。';
    }

    if (!values.ramenType.trim()) {
      nextErrors.ramenType = 'ラーメンの種類は必須です。';
    }

    if (values.rating.trim()) {
      const parsedRating = Number(values.rating);
      const isInteger = Number.isInteger(parsedRating);
      if (!Number.isFinite(parsedRating) || !isInteger || parsedRating < 1 || parsedRating > 5) {
        nextErrors.rating = '評価は1〜5の整数で入力してください。';
      }
    }

    if (values.latitude.trim()) {
      const parsedLatitude = Number(values.latitude);
      if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) {
        nextErrors.latitude = '緯度は -90〜90 の範囲で入力してください。';
      }
    }

    if (values.longitude.trim()) {
      const parsedLongitude = Number(values.longitude);
      if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
        nextErrors.longitude = '経度は -180〜180 の範囲で入力してください。';
      }
    }

    return nextErrors;
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleGeocode = async () => {
    if (!values.address.trim()) {
      setGeocodeError('住所を入力してください');
      return;
    }

    setGeocodeError(null);
    setIsGeocoding(true);

    try {
      const result = await geocodeJapaneseAddress(values.address);
      setValues((prev) => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
      setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '住所から位置情報を取得できませんでした。';
      setGeocodeError(message);
    } finally {
      setIsGeocoding(false);
    }
  };


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (imageError) {
      setSubmitError(imageError);
      return;
    }

    if (!isAdmin) {
      setSubmitError('管理者のみ操作できます。');
      return;
    }

    setSubmitError(null);

    try {
      let imageUrl: string | undefined;
      if (isAdmin && imageFile) {
        setIsUploadingImage(true);
        imageUrl = await uploadShopImage(imageFile);
      }

      const result = await addShop({
        name: values.name.trim(),
        region: values.region.trim(),
        address: values.address.trim(),
        ramenType: values.ramenType.trim(),
        rating: values.rating.trim() ? Number(values.rating) : 3,
        businessHours: values.businessHours.trim(),
        openingTime: values.openingTime.trim(),
        closingTime: values.closingTime.trim(),
        closedDays: values.closedDays,
        businessHoursNote: values.businessHoursNote.trim(),
        recommendation: values.recommendation.trim(),
        latitude: values.latitude.trim() ? Number(values.latitude) : null,
        longitude: values.longitude.trim() ? Number(values.longitude) : null,
        imageUrl,
      });

      sessionStorage.setItem('ramenmap:save-shop-flash', result.message);
      navigate('/shops');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存に失敗しました。';
      setSubmitError(message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <section className="detail-wrapper">
      <h1>店舗登録</h1>

      <form className="card shop-form" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="name">店舗名 <span className="required">*</span></label>
          <input id="name" value={values.name} onChange={(e) => onChange('name', e.target.value)} />
          {errors.name ? <p className="form-error">{errors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="region">地域 <span className="required">*</span></label>
          <input id="region" value={values.region} onChange={(e) => onChange('region', e.target.value)} />
          {errors.region ? <p className="form-error">{errors.region}</p> : null}
        </div>

        <div>
          <label htmlFor="address">住所</label>
          <input id="address" value={values.address} onChange={(e) => onChange('address', e.target.value)} />
          <button type="button" className="button-secondary address-geocode-button" onClick={handleGeocode} disabled={isGeocoding}>
            {isGeocoding ? '取得中...' : '住所から位置取得'}
          </button>
          <p className="form-hint location-warning">取得結果は必ず地図で確認してください。</p>
          <p className="form-hint">住所を変更しても地図位置は自動更新されません。「住所から位置取得」を押した場合のみ緯度・経度が更新されます。</p>
          {geocodeError ? <p className="form-error">{geocodeError}</p> : null}
        </div>

        <div>
          <label htmlFor="ramenType">ラーメンの種類 <span className="required">*</span></label>
          <input
            id="ramenType"
            value={values.ramenType}
            onChange={(e) => onChange('ramenType', e.target.value)}
          />
          {errors.ramenType ? <p className="form-error">{errors.ramenType}</p> : null}
        </div>

        <div>
          <label htmlFor="rating">評価 (1〜5)</label>
          <input
            id="rating"
            type="number"
            min={1}
            max={5}
            step={1}
            value={values.rating}
            onChange={(e) => onChange('rating', e.target.value)}
          />
          {errors.rating ? <p className="form-error">{errors.rating}</p> : null}
        </div>

        <div>
          <label htmlFor="businessHours">営業時間補足（旧データ）</label>
          <input
            id="businessHours"
            value={values.businessHours}
            onChange={(e) => onChange('businessHours', e.target.value)}
            placeholder="例: 昼のみ営業 / 旧データのメモ"
          />
        </div>

        <div>
          <label htmlFor="openingTime">開店時間</label>
          <input id="openingTime" type="time" value={values.openingTime} onChange={(e) => onChange('openingTime', e.target.value)} />
        </div>

        <div>
          <label htmlFor="closingTime">閉店時間</label>
          <input id="closingTime" type="time" value={values.closingTime} onChange={(e) => onChange('closingTime', e.target.value)} />
        </div>

        <fieldset>
          <legend>定休日</legend>
          <div className="holiday-checkboxes">
            {WEEKDAY_OPTIONS.map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={values.closedDays.includes(day)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...values.closedDays, day]
                      : values.closedDays.filter((item) => item !== day);
                    setValues((prev) => ({ ...prev, closedDays: next }));
                  }}
                />
                {day}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="businessHoursNote">営業時間補足</label>
          <input id="businessHoursNote" value={values.businessHoursNote} onChange={(e) => onChange('businessHoursNote', e.target.value)} />
        </div>

        <div>
          <label htmlFor="latitude">緯度</label>
          <input
            id="latitude"
            type="number"
            min={-90}
            max={90}
            step="any"
            value={values.latitude}
            onChange={(e) => onChange('latitude', e.target.value)}
          />
          {errors.latitude ? <p className="form-error">{errors.latitude}</p> : null}
        </div>

        <div>
          <label htmlFor="longitude">経度</label>
          <input
            id="longitude"
            type="number"
            min={-180}
            max={180}
            step="any"
            value={values.longitude}
            onChange={(e) => onChange('longitude', e.target.value)}
          />
          {errors.longitude ? <p className="form-error">{errors.longitude}</p> : null}
        </div>

        <section className="form-location-preview" aria-label="位置情報プレビュー">
          <h2>位置情報プレビュー</h2>
          <p className="form-hint">緯度・経度を手入力で修正すると、この地図も更新されます。</p>
          {hasPreviewCoordinates ? (
            GOOGLE_MAPS_EMBED_API_KEY ? (
              <iframe title="店舗位置のプレビュー地図" src={previewMapSrc ?? ''} className="shop-map-iframe" loading="lazy" />
            ) : (
              <p className="shop-map-message">Google Maps Embed APIキーが未設定です</p>
            )
          ) : (
            <p className="shop-map-message">緯度・経度を入力すると地図を表示できます（緯度 -90〜90 / 経度 -180〜180）。</p>
          )}
          {hasPreviewCoordinates ? <p className="form-hint">この位置で保存します: 緯度 {parsedLatitude} / 経度 {parsedLongitude}</p> : null}
        </section>

        <div>
          <label htmlFor="recommendation">おすすめポイント</label>
          <textarea
            id="recommendation"
            value={values.recommendation}
            onChange={(e) => onChange('recommendation', e.target.value)}
            rows={4}
          />
        </div>
        {isAdmin ? (
          <div>
            <label htmlFor="imageFile">店舗画像</label>
            <input
              id="imageFile"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                if (!file) {
                  setImageFile(null);
                  setImageError(null);
                  return;
                }

                const validationMessage = validateShopImageFile(file);
                if (validationMessage) {
                  setImageFile(null);
                  setImageError(validationMessage);
                  event.currentTarget.value = '';
                  return;
                }

                setImageFile(file);
                setImageError(null);
              }}
            />
            <p className="form-hint">対応形式: jpg / jpeg / png / webp（最大5MB）</p>
            {imageFile ? <p className="form-hint">選択中: {imageFile.name}</p> : null}
            {imageError ? <p className="form-error">{imageError}</p> : null}
          </div>
        ) : null}

        {Object.keys(errors).length > 0 ? (
          <p className="form-error form-error-summary">入力内容を確認してください。</p>
        ) : null}
        {submitError ? <p className="form-error form-error-summary">{submitError}</p> : null}

        <div className="shop-form-actions">
          <button type="submit" className="button-primary" disabled={isUploadingImage}>
            {isUploadingImage ? '画像アップロード中...' : '保存'}
          </button>
          <Link to="/shops" className="button-secondary">
            キャンセル
          </Link>
        </div>
      </form>
    </section>
  );
}
