export const REGION_OPTIONS = [
  '高知市',
  '南国市',
  '香美市',
  '香南市',
  '土佐市',
  '須崎市',
  '四万十市',
  'その他',
] as const;

export const RAMEN_TYPE_OPTIONS = [
  '醤油ラーメン',
  '塩ラーメン',
  '味噌ラーメン',
  '豚骨ラーメン',
  '鶏白湯',
  'つけ麺',
  'まぜそば',
  '担々麺',
  '二郎系',
  '家系',
  'その他',
] as const;

export const withLegacyOption = (options: readonly string[], currentValue: string): string[] => {
  const trimmed = currentValue.trim();
  if (!trimmed || options.includes(trimmed)) {
    return [...options];
  }

  return [trimmed, ...options];
};

export const isRegionOption = (value: string): value is (typeof REGION_OPTIONS)[number] =>
  REGION_OPTIONS.some((option) => option === value);
