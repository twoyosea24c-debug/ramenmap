import { isSupabaseConfigured, supabase } from '../lib/supabase';

const SHOP_IMAGE_BUCKET = 'shop-images';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function getFileExtension(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : '';
  const normalized = (fromName ?? '').toLowerCase();

  if (normalized === 'jpg' || normalized === 'jpeg' || normalized === 'png' || normalized === 'webp') {
    return normalized;
  }

  if (file.type === 'image/png') {
    return 'png';
  }

  if (file.type === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

export function validateShopImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return '画像は jpg / jpeg / png / webp 形式のみアップロードできます。';
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return '画像サイズが大きすぎます。5MB以下の画像を選択してください。';
  }

  return null;
}

export async function uploadShopImage(file: File): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase が未設定のため画像をアップロードできません。');
  }

  const validationError = validateShopImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const extension = getFileExtension(file);
  const filename = `${Date.now().toString(36)}-${crypto.randomUUID()}.${extension}`;

  const { data, error } = await supabase.storage.from(SHOP_IMAGE_BUCKET).upload(filename, file, {
    upsert: false,
    cacheControl: '3600',
    contentType: file.type,
  });

  if (error) {
    throw new Error(`画像アップロードに失敗しました: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(SHOP_IMAGE_BUCKET).getPublicUrl(data.path);
  if (!publicUrlData.publicUrl) {
    throw new Error('画像URLの取得に失敗しました。');
  }

  return publicUrlData.publicUrl;
}
