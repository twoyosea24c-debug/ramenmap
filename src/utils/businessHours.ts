import type { RamenShop } from "../types";

export const WEEKDAY_OPTIONS = ["月", "火", "水", "木", "金", "土", "日", "不定休"] as const;
export type HolidayOption = (typeof WEEKDAY_OPTIONS)[number];

type ShopStatus = "open" | "closed" | "holiday" | "unset";

export function formatStructuredHours(shop: Pick<RamenShop, "openTime" | "closeTime" | "regularHolidays" | "businessHoursNote" | "businessHours">): string {
  if (!shop.openTime || !shop.closeTime) {
    return shop.businessHours?.trim() || "営業時間未設定";
  }

  const holidays = shop.regularHolidays?.length ? ` / 定休日: ${shop.regularHolidays.join("・")}` : "";
  const note = shop.businessHoursNote?.trim() ? ` / ${shop.businessHoursNote.trim()}` : "";
  return `${shop.openTime}〜${shop.closeTime}${holidays}${note}`;
}

export function getShopBusinessStatus(shop: Pick<RamenShop, "openTime" | "closeTime" | "regularHolidays">, now = new Date()): { status: ShopStatus; label: string } {
  if (!shop.openTime || !shop.closeTime) {
    return { status: "unset", label: "営業時間未設定" };
  }

  const weekdayMap = ["日", "月", "火", "水", "木", "金", "土"] as const;
  const today = weekdayMap[now.getDay()];
  if (shop.regularHolidays?.includes("不定休") || shop.regularHolidays?.includes(today)) {
    return { status: "holiday", label: "本日定休" };
  }

  const [oh, om] = shop.openTime.split(":").map(Number);
  const [ch, cm] = shop.closeTime.split(":").map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const overnight = closeMinutes <= openMinutes;
  const isOpen = overnight
    ? nowMinutes >= openMinutes || nowMinutes < closeMinutes
    : nowMinutes >= openMinutes && nowMinutes < closeMinutes;

  return isOpen ? { status: "open", label: "営業中" } : { status: "closed", label: "営業時間外" };
}
