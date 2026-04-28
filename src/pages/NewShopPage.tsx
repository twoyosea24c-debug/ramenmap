import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';
import { uploadShopImage, validateShopImageFile } from '../services/shopImageService';

type ShopFormValues = {
  name: string;
  region: string;
  address: string;
  ramenType: string;
  rating: string;
  businessHours: string;
  recommendation: string;
};

type ShopFormErrors = Partial<Record<keyof ShopFormValues, string>>;

const initialValues: ShopFormValues = {
  name: '',
  region: '',
  address: '',
  ramenType: '',
  rating: '',
  businessHours: '',
  recommendation: '',
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

  const onChange = (field: keyof ShopFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
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

    return nextErrors;
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

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
        recommendation: values.recommendation.trim(),
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
          <label htmlFor="businessHours">営業時間</label>
          <input
            id="businessHours"
            value={values.businessHours}
            onChange={(e) => onChange('businessHours', e.target.value)}
          />
        </div>

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
