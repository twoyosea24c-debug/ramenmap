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

const getGeocodingApiKey = () => {
  const geocodingApiKey = import.meta.env.VITE_GOOGLE_GEOCODING_API_KEY?.trim();
  if (geocodingApiKey) {
    return { apiKey: geocodingApiKey, isLegacyFallback: false };
  }

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (mapsApiKey) {
    return { apiKey: mapsApiKey, isLegacyFallback: true };
  }

  return { apiKey: '', isLegacyFallback: false };
};

const getMapsEmbedApiKey = () => {
  const embedApiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  if (embedApiKey) {
    return embedApiKey;
  }

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (mapsApiKey) {
    return mapsApiKey;
  }

  return '';
};

export const googleMapsEmbedApiKey = getMapsEmbedApiKey();

const buildErrorDetail = (address: string, status: string, errorMessage: string, isLegacyFallback: boolean) => {
  const detailLines = [
    '住所から位置情報を取得できませんでした。',
    `住所: ${address}`,
    `Geocoding status: ${status}`,
  ];

  if (errorMessage.trim()) {
    detailLines.push(`Geocoding error_message: ${errorMessage}`);
  }

  if (isLegacyFallback) {
    detailLines.push('後方互換キーを使用中');
  }

  return detailLines.join('\n');
};

export async function geocodeJapaneseAddress(address: string): Promise<GeocodeResult> {
  const { apiKey, isLegacyFallback } = getGeocodingApiKey();
  if (!apiKey) {
    throw new Error('Geocoding APIキーが未設定です');
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
    throw new Error(
      buildErrorDetail(address.trim(), `HTTP_${response.status}`, 'HTTPリクエストに失敗しました', isLegacyFallback),
    );
  }

  const data = (await response.json()) as GeocodingApiResponse;

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(buildErrorDetail(address.trim(), data.status, data.error_message ?? '', isLegacyFallback));
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
