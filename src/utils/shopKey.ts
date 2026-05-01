export function normalizeShopKeyPart(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeShopKey(name: string | null | undefined, address: string | null | undefined): string {
  return `${normalizeShopKeyPart(name)}::${normalizeShopKeyPart(address)}`;
}
