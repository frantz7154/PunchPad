export type RangeKey = "today" | "thisWeek" | "lastWeek" | "payPeriod" | "custom";

export type DailyRow = {
  dateLocal: string;
  minutes: number;
  sessionCount: number;
};

export type UserRow = {
  userId: string;
  email: string;
  name: string;
  totalMinutes: number;
  days: DailyRow[];
};

export type KpiSet = {
  today: number;
  thisWeek: number;
  lastWeek: number;
  sevenDayAvg: number;
};
