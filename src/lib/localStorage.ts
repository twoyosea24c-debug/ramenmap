function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getLocalStorageItem(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(key);
}

export function setLocalStorageItem(key: string, value: string): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, value);
}
