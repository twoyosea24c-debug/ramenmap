const GOOGLE_GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

type GeocodingApiResponse = {
  status: string;
  error_message?: string;
  results?: Array<{
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
};

export type GeocodeResult = {
  latitude: string;
  longitude: string;
};

const isValidLatitude = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90;
const isValidLongitude = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180;

const withJapanHint = (address: string) => {
  const trimmedAddress = address.trim();
  if (!trimmedAddress) {
    return '';
  }

  if (trimmedAddress.includes('日本')) {
    return trimmedAddress;
  }

  return `${trimmedAddress}, 日本`;
};

export async function geocodeJapaneseAddress(address: string): Promise<GeocodeResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Google Maps APIキーが未設定です');
  }

  const hintedAddress = withJapanHint(address);
  if (!hintedAddress) {
    throw new Error('住所を入力してください');
  }

  const params = new URLSearchParams({
    address: hintedAddress,
    key: apiKey,
    region: 'jp',
    language: 'ja',
  });

  const response = await fetch(`${GOOGLE_GEOCODING_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('住所から位置情報を取得できませんでした。時間をおいて再度お試しください。');
  }

  const data = (await response.json()) as GeocodingApiResponse;

  if (data.status === 'REQUEST_DENIED') {
    throw new Error('Geocoding APIの利用が拒否されました。API設定を確認してください。');
  }

  if (data.status === 'ZERO_RESULTS') {
    throw new Error('住所に一致する位置情報が見つかりませんでした。住所を詳しく入力してください。');
  }

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(data.error_message || '位置情報の取得に失敗しました。');
  }

  const firstCandidate = data.results[0];
  const lat = firstCandidate.geometry?.location?.lat;
  const lng = firstCandidate.geometry?.location?.lng;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('位置情報の形式が不正です。');
  }

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    throw new Error('取得した緯度・経度が有効範囲外です。');
  }

  return {
    latitude: String(lat),
    longitude: String(lng),
  };
}
