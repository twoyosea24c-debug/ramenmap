export type ReservationStatus = '未確認' | '確認済み' | 'キャンセル' | '来店済み';

export type Reservation = {
  id: string;
  shopName: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  reservedAt: string;
  partySize: number;
  status: ReservationStatus;
  appliedAt: string;
};

export const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'R-20260501-001',
    shopName: '麺処さくら 新宿本店',
    customerName: '山田 太郎',
    phoneNumber: '090-1234-5678',
    email: 'taro.yamada@example.com',
    reservedAt: '2026-05-02T12:30:00+09:00',
    partySize: 2,
    status: '未確認',
    appliedAt: '2026-05-01T20:14:00+09:00',
  },
  {
    id: 'R-20260501-002',
    shopName: '濃厚豚骨 一番亭 渋谷',
    customerName: '鈴木 花子',
    phoneNumber: '080-9876-5432',
    email: 'hanako.suzuki@example.com',
    reservedAt: '2026-05-02T19:00:00+09:00',
    partySize: 3,
    status: '確認済み',
    appliedAt: '2026-05-01T09:22:00+09:00',
  },
  {
    id: 'R-20260430-003',
    shopName: '鶏白湯らぁめん 月灯り 池袋',
    customerName: '佐藤 健',
    phoneNumber: '070-2468-1357',
    email: 'takeshi.sato@example.com',
    reservedAt: '2026-05-03T18:00:00+09:00',
    partySize: 4,
    status: 'キャンセル',
    appliedAt: '2026-04-30T14:05:00+09:00',
  },
  {
    id: 'R-20260429-004',
    shopName: '味噌らーめん 北風 神田',
    customerName: '高橋 美咲',
    phoneNumber: '090-1111-2222',
    email: 'misaki.takahashi@example.com',
    reservedAt: '2026-05-01T13:00:00+09:00',
    partySize: 1,
    status: '来店済み',
    appliedAt: '2026-04-29T10:33:00+09:00',
  },
  {
    id: 'R-20260502-005',
    shopName: '煮干し中華そば 凪 吉祥寺',
    customerName: '中村 翔',
    phoneNumber: '080-3333-4444',
    email: 'sho.nakamura@example.com',
    reservedAt: '2026-05-02T20:30:00+09:00',
    partySize: 2,
    status: '未確認',
    appliedAt: '2026-05-02T08:11:00+09:00',
  },
];
