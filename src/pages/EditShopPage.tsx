import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useShops } from '../context/ShopsContext';

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

export function EditShopPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shops, updateShop } = useShops();
  const shop = shops.find((item) => item.id === id);

  const initialValues = useMemo<ShopFormValues>(
    () => ({
      name: shop?.name ?? '',
      region: shop?.region ?? '',
      address: shop?.address ?? '',
      ramenType: shop?.ramenType ?? '',
      rating: shop ? String(shop.rating) : '',
      businessHours: shop?.businessHours ?? '',
      recommendation: shop?.recommendation ?? '',
    }),
    [shop],
  );

  const [values, setValues] = useState<ShopFormValues>(initialValues);
  const [errors, setErrors] = useState<ShopFormErrors>({});

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!shop) {
      return;
    }

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const updated = updateShop(shop.id, {
      name: values.name.trim(),
      region: values.region.trim(),
      address: values.address.trim(),
      ramenType: values.ramenType.trim(),
      rating: values.rating.trim() ? Number(values.rating) : 3,
      businessHours: values.businessHours.trim(),
      recommendation: values.recommendation.trim(),
    });

    if (updated) {
      navigate(`/shops/${updated.id}`);
    }
  };

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

  return (
    <section className="detail-wrapper">
      <h1>店舗編集</h1>

      <form className="card shop-form" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="name">
            店舗名 <span className="required">*</span>
          </label>
          <input id="name" value={values.name} onChange={(e) => onChange('name', e.target.value)} />
          {errors.name ? <p className="form-error">{errors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="region">
            地域 <span className="required">*</span>
          </label>
          <input id="region" value={values.region} onChange={(e) => onChange('region', e.target.value)} />
          {errors.region ? <p className="form-error">{errors.region}</p> : null}
        </div>

        <div>
          <label htmlFor="address">住所</label>
          <input id="address" value={values.address} onChange={(e) => onChange('address', e.target.value)} />
        </div>

        <div>
          <label htmlFor="ramenType">
            ラーメンの種類 <span className="required">*</span>
          </label>
          <input id="ramenType" value={values.ramenType} onChange={(e) => onChange('ramenType', e.target.value)} />
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

        {Object.keys(errors).length > 0 ? (
          <p className="form-error form-error-summary">入力内容を確認してください。</p>
        ) : null}

        <div className="shop-form-actions">
          <button type="submit" className="button-primary">
            保存
          </button>
          <Link to={`/shops/${shop.id}`} className="button-secondary">
            キャンセル
          </Link>
        </div>
      </form>
    </section>
  );
}
