import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../stores/AppContext';
import { generateMonthGrid } from '../../utils/lunarCalendar';
import type { DayCellData } from '../../utils/lunarCalendar';
import './Home.css';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const BADGE_LABELS: Record<string, string> = {
  today: '今',
  yesterday: '昨',
  tomorrow: '明',
};

const flipVariants = {
  enter: (dir: number) => ({
    rotateX: dir > 0 ? 90 : -90,
    opacity: 0,
  }),
  center: {
    rotateX: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 30 },
  },
  exit: (dir: number) => ({
    rotateX: dir > 0 ? -90 : 90,
    opacity: 0,
    transition: { duration: 0.2 },
  }),
};

/** 获取副文字及其样式类 */
function getSubText(cell: DayCellData): { text: string; className: string } {
  if (cell.solarTermName) return { text: cell.solarTermName, className: 'sub-solar-term' };
  if (cell.lunarFestivalName) return { text: cell.lunarFestivalName, className: 'sub-festival' };
  if (cell.solarFestivalName) return { text: cell.solarFestivalName, className: 'sub-festival' };
  if (cell.lunarMonthName) return { text: cell.lunarMonthName, className: 'sub-month' };
  return { text: cell.lunarDayName, className: 'sub-lunar' };
}

const Home: React.FC = () => {
  const { getPlansForDate, fetchPlansForMonth } = useApp();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  const [direction, setDirection] = useState(0);

  const year = currentMonth.year();
  const month = currentMonth.month() + 1;

  const grid = useMemo(() => generateMonthGrid(year, month), [year, month]);

  // Load plans for current month whenever month changes
  useEffect(() => {
    const monthStr = currentMonth.format('YYYY-MM');
    fetchPlansForMonth(monthStr);
  }, [currentMonth]);

  const handlePrevMonth = useCallback(() => {
    setDirection(-1);
    setCurrentMonth((prev) => prev.subtract(1, 'month'));
  }, []);

  const handleNextMonth = useCallback(() => {
    setDirection(1);
    setCurrentMonth((prev) => prev.add(1, 'month'));
  }, []);

  const handleDayClick = useCallback((cell: DayCellData) => {
    navigate(`/day/${cell.date}`);
  }, [navigate]);

  return (
    <div className="home-container">
      <div className="calendar-card">
        {/* 顶部导航 */}
        <div className="calendar-header">
          <button className="nav-btn" onClick={handlePrevMonth} aria-label="上个月">
            <LeftOutlined />
          </button>
          <span className="calendar-title">
            {currentMonth.format('YYYY年M月')}
          </span>
          <button className="nav-btn" onClick={handleNextMonth} aria-label="下个月">
            <RightOutlined />
          </button>
        </div>

        {/* 星期栏 */}
        <div className="weekday-bar">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`weekday-cell${i >= 5 ? ' weekend' : ''}`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 翻页动画容器 */}
        <div className="flip-perspective">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentMonth.format('YYYY-MM')}
              custom={direction}
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="calendar-body"
            >
              {/* 月份水印 */}
              <div className="month-watermark">{month}</div>

              {/* 日期网格 */}
              <div className="calendar-grid">
                {grid.map((cell) => {
                  const hasPlans = getPlansForDate(cell.date).length > 0;
                  const sub = getSubText(cell);

                  return (
                    <div
                      key={cell.date}
                      className={[
                        'day-cell',
                        !cell.isCurrentMonth && 'other-month',
                        cell.isWeekend && cell.isCurrentMonth && 'weekend',
                        cell.todayRelation === 'today' && 'today',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleDayClick(cell)}
                    >
                      {/* 休/班 丝带 */}
                      {cell.legalHoliday && (
                        <span
                          className={`ribbon ${cell.legalHoliday.isWork ? 'ribbon-work' : 'ribbon-rest'}`}
                          data-label={cell.legalHoliday.isWork ? '班' : '休'}
                        />
                      )}

                      {/* 今/昨/明 徽章 */}
                      {cell.todayRelation && (
                        <span className={`day-badge badge-${cell.todayRelation}`}>
                          {BADGE_LABELS[cell.todayRelation]}
                        </span>
                      )}

                      {/* 日期数字 */}
                      <span className="day-number">{cell.dayNumber}</span>

                      {/* 副文字 */}
                      <span className={`day-sub ${sub.className}`}>{sub.text}</span>

                      {/* 计划圆点 */}
                      {hasPlans && <span className="plan-dot" />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Home;
