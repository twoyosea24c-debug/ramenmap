import { formatStructuredHours, getShopBusinessStatus } from '../utils/businessHours';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { useShops } from '../context/ShopsContext';
import { useAuth } from '../context/AuthContext';
import { googleMapsEmbedApiKey } from '../services/geocodingService';
import { fetchSupabaseShops } from '../services/supabaseShopService';
import { getLocalStorageItem, setLocalStorageItem } from '../lib/localStorage';
import { isSupabaseConfigured } from '../lib/supabase';
import { isRegionOption } from '../constants/shopOptions';
const KOCHI_CITY_COORDINATES = { lat: 33.5597, lng: 133.5311 };
const MANUAL_REFERENCE_POINT_KEY = 'ramenmap:manual-reference-point';
const DISTANCE_SOURCE_MODE_KEY = 'ramenmap:distance-source-mode';
const DEFAULT_REFERENCE_NAME = '現在地';
const KOCHI_STATION_REFERENCE = { name: '高知駅', lat: 33.5663, lng: 133.543 };
type DistanceSourceMode = 'current' | 'manual';
type ManualReferencePoint = { name: string; lat: number; lng: number };
type CsvFieldKey =
  | 'name'
  | 'area'
  | 'address'
  | 'ramen_type'
  | 'rating'
  | 'opening_time'
  | 'closing_time'
  | 'closed_days'
  | 'business_hours_note'
  | 'recommendation'
  | 'latitude'
  | 'longitude';
type CsvPreviewRow = {
  rowNumber: number;
  values: Record<CsvFieldKey, string>;
  errors: string[];
  warnings: string[];
  isDuplicateWithExisting: boolean;
  isDuplicateInCsv: boolean;
};
const csvHeaderMap: Record<string, CsvFieldKey> = {
  name: 'name',
  area: 'area',
  address: 'address',
  ramen_type: 'ramen_type',
  rating: 'rating',
  opening_time: 'opening_time',
  closing_time: 'closing_time',
  closed_days: 'closed_days',
  business_hours_note: 'business_hours_note',
  recommendation: 'recommendation',
  latitude: 'latitude',
  longitude: 'longitude',
  店舗名: 'name',
  地域: 'area',
  住所: 'address',
  ラーメンの種類: 'ramen_type',
  評価: 'rating',
  開店時間: 'opening_time',
  閉店時間: 'closing_time',
  定休日: 'closed_days',
  営業時間補足: 'business_hours_note',
  おすすめポイント: 'recommendation',
  緯度: 'latitude',
  経度: 'longitude',
};
const csvFieldKeys: CsvFieldKey[] = [
  'name','area','address','ramen_type','rating','opening_time','closing_time','closed_days','business_hours_note','recommendation','latitude','longitude',
];
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1; } else { inQuotes = !inQuotes; }
      continue;
    }
    if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += char;
  }
  result.push(current);
  return result.map((value) => value.trim());
}
function normalizeDuplicateKeyValue(value: string): string {
  return value.trim().replace(/[ \u3000]+/g, ' ').toLowerCase();
}
function buildDuplicateKey(name: string, address: string): string {
  return `${normalizeDuplicateKeyValue(name)}::${normalizeDuplicateKeyValue(address)}`;
}

async function getExistingDuplicateKeys(shopsFromState: { name: string; address: string }[]): Promise<Set<string>> {
  const sourceShops = isSupabaseConfigured ? await fetchSupabaseShops() : shopsFromState;
  return new Set(sourceShops.map((shop) => buildDuplicateKey(shop.name, shop.address)));
}
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
  const { shops, deleteShop, isLoading, loadError, reloadShops, importShops } = useShops();
  const { isAdmin } = useAuth();
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapsLoadError, setMapsLoadError] = useState<string | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [allowDuplicateImport, setAllowDuplicateImport] = useState(false);
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
  useEffect(() => {
    const savedMode = getLocalStorageItem(DISTANCE_SOURCE_MODE_KEY);
    if (savedMode === 'current' || savedMode === 'manual') {
      setDistanceSourceMode(savedMode);
    }
  }, []);
  useEffect(() => {
    setLocalStorageItem(DISTANCE_SOURCE_MODE_KEY, distanceSourceMode);
  }, [distanceSourceMode]);
  const allRegions = useMemo(() => {
    const uniqueRegions = Array.from(new Set(shops.map((shop) => shop.region)));
    const normalized = uniqueRegions.filter((value) => isRegionOption(value));
    const legacy = uniqueRegions.filter((value) => !isRegionOption(value)).sort();
    return [...normalized, ...legacy];
  }, [shops]);
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
  const clearManualReferencePoint = () => {
    setManualReferenceName('');
    setManualLatitude('');
    setManualLongitude('');
    setManualReferenceError(null);
    setManualReferencePoint(null);
    setDistanceSourceMode('current');
    localStorage.removeItem(MANUAL_REFERENCE_POINT_KEY);
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
  const handleCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setCsvImportMessage(null);
    if (!file) {
      setCsvPreviewRows([]);
      return;
    }
    try {
      const text = await file.text();
      const normalizedLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((line) => line.trim());
      if (normalizedLines.length < 2) {
        setCsvPreviewRows([]);
        setCsvImportMessage('CSVにデータ行がありません。');
        return;
      }
      const headers = splitCsvLine(normalizedLines[0]);
      const mappedHeaders = headers.map((header) => csvHeaderMap[header.trim()] ?? null);
      const existingDuplicateKeys = await getExistingDuplicateKeys(shops);
      const previewRows: CsvPreviewRow[] = normalizedLines.slice(1).map((line, index) => {
      const cols = splitCsvLine(line);
      const values = Object.fromEntries(csvFieldKeys.map((key) => [key, ''])) as Record<CsvFieldKey, string>;
      mappedHeaders.forEach((mapped, i) => {
        if (!mapped) return;
        values[mapped] = cols[i] ?? '';
      });
      const errors: string[] = [];
      const warnings: string[] = [];
      if (!values.name.trim()) errors.push('店舗名は必須です。');
      if (!values.area.trim()) errors.push('地域は必須です。');
      if (!values.ramen_type.trim()) errors.push('ラーメンの種類は必須です。');
      const ratingValue = values.rating.trim();
      if (ratingValue) {
        const rating = Number(ratingValue);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) errors.push('評価は1〜5の数値で入力してください。');
      }
      const latitudeValue = values.latitude.trim();
      if (latitudeValue) {
        const latitude = Number(latitudeValue);
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.push('緯度は-90〜90で入力してください。');
      }
      const longitudeValue = values.longitude.trim();
      if (longitudeValue) {
        const longitude = Number(longitudeValue);
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.push('経度は-180〜180で入力してください。');
      }
      const duplicateKey = buildDuplicateKey(values.name, values.address);
      const isDuplicateWithExisting = Boolean(values.name.trim()) && Boolean(values.address.trim()) && existingDuplicateKeys.has(duplicateKey);
      if (isDuplicateWithExisting) {
        warnings.push('既存店舗と重複');
      }
      return { rowNumber: index + 2, values, errors, warnings, isDuplicateWithExisting, isDuplicateInCsv: false };
    });
      const csvDuplicateBuckets = new Map<string, number[]>();
      previewRows.forEach((row, idx) => {
      const key = buildDuplicateKey(row.values.name, row.values.address);
      if (!row.values.name.trim() || !row.values.address.trim()) {
        return;
      }
      const indexes = csvDuplicateBuckets.get(key) ?? [];
      indexes.push(idx);
      csvDuplicateBuckets.set(key, indexes);
    });
      csvDuplicateBuckets.forEach((indexes) => {
      if (indexes.length < 2) return;
      indexes.forEach((idx) => {
        previewRows[idx].isDuplicateInCsv = true;
        previewRows[idx].warnings.push('CSV内で重複');
      });
    });
      setCsvPreviewRows(previewRows);
      setAllowDuplicateImport(false);
    } catch (error) {
      setCsvPreviewRows([]);
      setCsvImportMessage(error instanceof Error ? error.message : 'CSVプレビューの作成に失敗しました。');
    }
  };
  const csvErrorCount = csvPreviewRows.filter((row) => row.errors.length > 0).length;
  const csvDuplicateSkipCount = allowDuplicateImport
    ? 0
    : csvPreviewRows.filter((row) => row.errors.length === 0 && (row.isDuplicateInCsv || row.isDuplicateWithExisting)).length;
  const csvPlannedImportCount = csvPreviewRows.filter(
    (row) => row.errors.length === 0 && (allowDuplicateImport || (!row.isDuplicateInCsv && !row.isDuplicateWithExisting)),
  ).length;
  const handleCsvImport = async () => {
    const existingDuplicateKeys = await getExistingDuplicateKeys(shops);
    const validRows = csvPreviewRows.filter((row) => row.errors.length === 0);
    const duplicateRows = validRows.filter((row) => {
      const duplicateKey = buildDuplicateKey(row.values.name, row.values.address);
      return row.isDuplicateInCsv || existingDuplicateKeys.has(duplicateKey);
    });
    const rowsToImport = allowDuplicateImport
      ? validRows
      : validRows.filter((row) => {
          const duplicateKey = buildDuplicateKey(row.values.name, row.values.address);
          return !row.isDuplicateInCsv && !existingDuplicateKeys.has(duplicateKey);
        });
    if (validRows.length === 0) {
      setCsvImportMessage('登録可能な行がありません。エラーを修正してください。');
      return;
    }
    if (rowsToImport.length === 0) {
      setCsvImportMessage('重複を除外すると登録可能な行がありません。');
      return;
    }
    const confirmed = window.confirm(
      `${rowsToImport.length}件をSupabaseに登録します。よろしいですか？（重複候補: ${duplicateRows.length}件）`,
    );
    if (!confirmed) {
      return;
    }
    setIsImportingCsv(true);
    setCsvImportMessage(null);
    try {
      const inputs = rowsToImport.map((row) => {
        const closedDays = row.values.closed_days
          .split(/[;,]/)
          .map((value) => value.trim())
          .filter(Boolean);
        const openingTime = row.values.opening_time.trim();
        const closingTime = row.values.closing_time.trim();
        const businessHoursNote = row.values.business_hours_note.trim();
        const rating = row.values.rating.trim() ? Number(row.values.rating) : 3;
        const address = row.values.address.trim() || '未設定';
        return {
          name: row.values.name.trim(),
          region: row.values.area.trim(),
          address,
          ramenType: row.values.ramen_type.trim(),
          rating,
          businessHours: openingTime && closingTime ? `${openingTime}〜${closingTime}` : '未設定',
          openingTime: openingTime || undefined,
          closingTime: closingTime || undefined,
          closedDays: closedDays.length > 0 ? closedDays : undefined,
          businessHoursNote: businessHoursNote || undefined,
          recommendation: row.values.recommendation.trim() || '未設定',
          imageUrl: undefined,
          latitude: row.values.latitude.trim() ? Number(row.values.latitude) : null,
          longitude: row.values.longitude.trim() ? Number(row.values.longitude) : null,
        };
      });
      const result = await importShops(inputs);
      setCsvImportMessage(`登録件数: ${result.count}件 / 重複スキップ件数: ${allowDuplicateImport ? 0 : duplicateRows.length}件 / エラー件数: ${csvErrorCount}件`);
      setCsvPreviewRows([]);
      setAllowDuplicateImport(false);
    } catch (error) {
      setCsvImportMessage(error instanceof Error ? error.message : 'CSVインポートに失敗しました。');
    } finally {
      setIsImportingCsv(false);
    }
  };
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
      {isAdmin ? (
        <section className="card">
          <h2>CSVインポート（管理者向け）</h2>
          <input type="file" accept=".csv,text/csv" onChange={(event) => void handleCsvFileChange(event)} />
          {csvImportMessage ? <p className={csvImportMessage.includes('失敗') || csvImportMessage.includes('エラー') ? 'status-error' : 'status-ok'}>{csvImportMessage}</p> : null}
          {csvPreviewRows.length > 0 ? (
            <>
              <p>プレビュー（エラーがある行は登録されません）</p>
              <label>
                <input type="checkbox" checked={allowDuplicateImport} onChange={(event) => setAllowDuplicateImport(event.target.checked)} />
                重複候補の行も登録する（管理者が明示的に許可）
              </label>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>行</th><th>店舗名</th><th>地域</th><th>住所</th><th>ラーメンの種類</th><th>評価</th><th>営業時間</th><th>定休日</th><th>おすすめポイント</th><th>緯度</th><th>経度</th><th>警告</th><th>エラー</th></tr></thead>
                  <tbody>
                    {csvPreviewRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td><td>{row.values.name}</td><td>{row.values.area}</td><td>{row.values.address}</td><td>{row.values.ramen_type}</td><td>{row.values.rating}</td><td>{row.values.opening_time}{row.values.closing_time ? `〜${row.values.closing_time}` : ''}</td><td>{row.values.closed_days}</td><td>{row.values.recommendation}</td><td>{row.values.latitude}</td><td>{row.values.longitude}</td><td>{row.warnings.join(' ')}</td><td>{row.errors.join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <p>登録予定件数: {csvPlannedImportCount}件</p>
                <p>重複スキップ件数: {csvDuplicateSkipCount}件</p>
                <p>エラー件数: {csvErrorCount}件</p>
              </div>
              <button type="button" className="button-primary" onClick={() => void handleCsvImport()} disabled={isImportingCsv || csvPlannedImportCount === 0}>
                {isImportingCsv ? '登録中...' : 'プレビュー内容を登録'}
              </button>
            </>
          ) : null}
        </section>
      ) : null}
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
            <option value="distance">基準地点から近い順</option>
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
          <button type="button" className="button-secondary location-button" onClick={clearManualReferencePoint}>
            手動基準地点をクリア
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
      <section id="shops-map" className="card shop-map-section" aria-label="地図で見る">
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
          const businessStatus = getShopBusinessStatus(shop);
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
                <span>{businessStatus.label}</span>
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
                  <dd>{formatStructuredHours(shop)}</dd>
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
