import dayjs, { Dayjs } from 'dayjs';
import { SolarDay } from 'tyme4ts';

export interface DayCellData {
  date: string;                // YYYY-MM-DD
  dayNumber: number;           // 日期数字
  lunarDayName: string;        // 农历日名：初一、初八、廿一
  lunarMonthName: string | null; // 初一时显示月名：正月、二月
  solarTermName: string | null;  // 节气名：雨水、惊蛰（仅首日）
  lunarFestivalName: string | null; // 农历节日：春节、除夕
  solarFestivalName: string | null; // 公历节日：元旦、妇女节
  legalHoliday: { name: string; isWork: boolean } | null;
  isWeekend: boolean;
  isCurrentMonth: boolean;
  todayRelation: 'today' | 'yesterday' | 'tomorrow' | null;
}

function getDayCellData(
  d: Dayjs,
  currentMonth: number,
  currentYear: number,
  todayStr: string,
  yesterdayStr: string,
  tomorrowStr: string,
): DayCellData {
  const year = d.year();
  const month = d.month() + 1;
  const day = d.date();
  const dateStr = d.format('YYYY-MM-DD');
  const weekday = d.day(); // 0=Sun, 6=Sat

  const solarDay = SolarDay.fromYmd(year, month, day);
  const lunarDay = solarDay.getLunarDay();

  // Lunar day name & month name (show month only on 初一)
  const lunarDayName = lunarDay.getName();
  const lunarDayNum = lunarDay.getDay();
  const lunarMonthName = lunarDayNum === 1 ? lunarDay.getLunarMonth().getName() : null;

  // Solar term: check if this day is the exact first day of a term
  let solarTermName: string | null = null;
  const termDay = solarDay.getTermDay();
  if (termDay.toString().endsWith('第1天')) {
    solarTermName = solarDay.getTerm().getName();
  }

  // Festivals
  const lunarFestival = lunarDay.getFestival();
  const lunarFestivalName = lunarFestival ? lunarFestival.getName() : null;
  const solarFestival = solarDay.getFestival();
  const solarFestivalName = solarFestival ? solarFestival.getName() : null;

  // Legal holiday
  const lh = solarDay.getLegalHoliday();
  const legalHoliday = lh ? { name: lh.getName(), isWork: lh.isWork() } : null;

  // Today relation
  let todayRelation: DayCellData['todayRelation'] = null;
  if (dateStr === todayStr) todayRelation = 'today';
  else if (dateStr === yesterdayStr) todayRelation = 'yesterday';
  else if (dateStr === tomorrowStr) todayRelation = 'tomorrow';

  return {
    date: dateStr,
    dayNumber: day,
    lunarDayName,
    lunarMonthName,
    solarTermName,
    lunarFestivalName,
    solarFestivalName,
    legalHoliday,
    isWeekend: weekday === 0 || weekday === 6,
    isCurrentMonth: d.month() + 1 === currentMonth && d.year() === currentYear,
    todayRelation,
  };
}

/**
 * 生成以周一为起始的月日历网格（6行×7列 = 42格）
 */
export function generateMonthGrid(year: number, month: number): DayCellData[] {
  const today = dayjs();
  const todayStr = today.format('YYYY-MM-DD');
  const yesterdayStr = today.subtract(1, 'day').format('YYYY-MM-DD');
  const tomorrowStr = today.add(1, 'day').format('YYYY-MM-DD');

  const firstDay = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  // Monday-based weekday: 0=Mon, 1=Tue, ..., 6=Sun
  const startWeekdayMondayBased = (firstDay.day() + 6) % 7;

  const days: DayCellData[] = [];

  // Fill previous month days
  for (let i = startWeekdayMondayBased - 1; i >= 0; i--) {
    const d = firstDay.subtract(i + 1, 'day');
    days.push(getDayCellData(d, month, year, todayStr, yesterdayStr, tomorrowStr));
  }

  // Current month days
  const daysInMonth = firstDay.daysInMonth();
  for (let i = 0; i < daysInMonth; i++) {
    const d = firstDay.add(i, 'day');
    days.push(getDayCellData(d, month, year, todayStr, yesterdayStr, tomorrowStr));
  }

  // Fill next month days to complete 42 cells (6 rows)
  const remaining = 42 - days.length;
  const lastDay = firstDay.add(daysInMonth - 1, 'day');
  for (let i = 1; i <= remaining; i++) {
    const d = lastDay.add(i, 'day');
    days.push(getDayCellData(d, month, year, todayStr, yesterdayStr, tomorrowStr));
  }

  return days;
}
