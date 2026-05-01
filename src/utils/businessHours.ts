import type { RamenShop } from "../types";

export const WEEKDAY_OPTIONS = ["月", "火", "水", "木", "金", "土", "日", "不定休"] as const;
export type HolidayOption = (typeof WEEKDAY_OPTIONS)[number];

type ShopStatus = "open" | "closed" | "holiday" | "unset";

export function formatStructuredHours(shop: Pick<RamenShop, "openingTime" | "closingTime" | "closedDays" | "businessHoursNote" | "businessHours">): string {
  if (!shop.openingTime || !shop.closingTime) {
    return shop.businessHours?.trim() || "営業時間未設定";
  }

  const holidays = shop.closedDays?.length ? ` / 定休日: ${shop.closedDays.join("・")}` : "";
  const note = shop.businessHoursNote?.trim() ? ` / ${shop.businessHoursNote.trim()}` : "";
  return `${shop.openingTime}〜${shop.closingTime}${holidays}${note}`;
}

export function getShopBusinessStatus(shop: Pick<RamenShop, "openingTime" | "closingTime" | "closedDays">, now = new Date()): { status: ShopStatus; label: string } {
  if (!shop.openingTime || !shop.closingTime) {
    return { status: "unset", label: "営業時間未設定" };
  }

  const weekdayMap = ["日", "月", "火", "水", "木", "金", "土"] as const;
  const today = weekdayMap[now.getDay()];
  if (shop.closedDays?.includes("不定休") || shop.closedDays?.includes(today)) {
    return { status: "holiday", label: "本日定休" };
  }

  const [oh, om] = shop.openingTime.split(":").map(Number);
  const [ch, cm] = shop.closingTime.split(":").map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const overnight = closeMinutes <= openMinutes;
  const isOpen = overnight
    ? nowMinutes >= openMinutes || nowMinutes < closeMinutes
    : nowMinutes >= openMinutes && nowMinutes < closeMinutes;

  return isOpen ? { status: "open", label: "営業中" } : { status: "closed", label: "営業時間外" };
}
