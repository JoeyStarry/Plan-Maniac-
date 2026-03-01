import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Modal, Button } from 'antd';
import { LeftOutlined, RightOutlined, ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { SolarDay } from 'tyme4ts';
import {
  DndContext,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useApp } from '../../stores/AppContext';
import type { PlanItem } from '../../types';
import './DayDetail.css';

const HOUR_HEIGHT = 60;
const SNAP_MINUTES = 15;
const SNAP_PX = (SNAP_MINUTES / 60) * HOUR_HEIGHT; // 15px
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const MINI_WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const EVENT_COLORS: Record<PlanItem['color'], { bg: string; border: string }> = {
  red: { bg: '#F28B82', border: '#D93025' },
  yellow: { bg: '#FDD663', border: '#F9AB00' },
  white: { bg: '#D2E3FC', border: '#667eea' },
};

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

function timeToMinutes(time: string): number {
  const { hour, minute } = parseTime(time);
  return hour * 60 + minute;
}

function minutesToTime(totalMin: number): string {
  const clamped = Math.max(0, Math.min(totalMin, 24 * 60 - 1));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function getLunarInfo(dateStr: string): string {
  try {
    const d = dayjs(dateStr);
    const solar = SolarDay.fromYmd(d.year(), d.month() + 1, d.date());
    const lunar = solar.getLunarDay();
    return `${lunar.getLunarMonth().getName()}${lunar.getName()}`;
  } catch {
    return '';
  }
}

/** Generate a 6x7 mini calendar grid (Mon-start) */
function generateMiniGrid(year: number, month: number) {
  const firstDay = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const startWeekday = (firstDay.day() + 6) % 7;
  const days: Dayjs[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push(firstDay.subtract(i + 1, 'day'));
  }
  const daysInMonth = firstDay.daysInMonth();
  for (let i = 0; i < daysInMonth; i++) {
    days.push(firstDay.add(i, 'day'));
  }
  const remaining = 42 - days.length;
  const lastDay = firstDay.add(daysInMonth - 1, 'day');
  for (let i = 1; i <= remaining; i++) {
    days.push(lastDay.add(i, 'day'));
  }
  return days;
}

const { TextArea } = Input;

/* ─── Draggable Event Block ─── */
const DraggableEvent: React.FC<{
  plan: PlanItem;
  topPx: number;
  heightPx: number;
  colors: { bg: string; border: string };
  onUpdateDescription: (id: string, desc: string) => void;
}> = ({ plan, topPx, heightPx, colors, onUpdateDescription }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: plan.id,
    data: { plan },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [descValue, setDescValue] = useState(plan.description || '');

  useEffect(() => {
    setDescValue(plan.description || '');
  }, [plan.description]);

  const handleDoubleClick = () => {
    setIsModalOpen(true);
  };

  const handleSaveDescription = () => {
    onUpdateDescription(plan.id, descValue);
    setIsModalOpen(false);
  };

  const handleCancelDescription = () => {
    setDescValue(plan.description || '');
    setIsModalOpen(false);
  };

  // Snap vertical offset to 15-min grid, lock horizontal
  const snappedY = transform
    ? Math.round(transform.y / SNAP_PX) * SNAP_PX
    : 0;

  const style: React.CSSProperties = {
    top: topPx,
    height: heightPx,
    backgroundColor: colors.bg,
    borderLeftColor: colors.border,
    transform: snappedY ? `translateY(${snappedY}px)` : undefined,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.92 : 1,
    boxShadow: isDragging ? '0 6px 20px rgba(0,0,0,0.25)' : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    willChange: isDragging ? 'transform' : undefined,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className="event-block"
        style={style}
        {...listeners}
        {...attributes}
        onDoubleClick={handleDoubleClick}
      >
        <div className="event-block-time">
          {plan.startTime} - {plan.endTime}
        </div>
        <div className="event-block-content">{plan.content}</div>
        {plan.source === 'pico' && <span className="event-pico-tag">Pico</span>}
      </div>

      <Modal
        title="计划详情"
        open={isModalOpen}
        onOk={handleSaveDescription}
        onCancel={handleCancelDescription}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        centered
        width={400}
      >
        <div style={{ marginBottom: 12, fontWeight: 500, color: '#333' }}>
          {plan.content} {plan.startTime && plan.endTime && `(${plan.startTime} - ${plan.endTime})`}
        </div>
        <TextArea
          rows={5}
          placeholder="在这里输入计划备注..."
          value={descValue}
          onChange={(e) => setDescValue(e.target.value)}
        />
      </Modal>
    </>
  );
};

/* ─── Mini Calendar ─── */
const MiniCalendar: React.FC<{
  selectedDate: Dayjs;
  onSelectDate: (date: string) => void;
  getPlansForDate: (date: string) => PlanItem[];
}> = ({ selectedDate, onSelectDate, getPlansForDate }) => {
  const [viewMonth, setViewMonth] = useState<Dayjs>(selectedDate.startOf('month'));

  useEffect(() => {
    const selMonth = selectedDate.startOf('month');
    if (!selMonth.isSame(viewMonth, 'month')) {
      setViewMonth(selMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const grid = useMemo(
    () => generateMiniGrid(viewMonth.year(), viewMonth.month() + 1),
    [viewMonth],
  );

  const todayStr = dayjs().format('YYYY-MM-DD');
  const selectedStr = selectedDate.format('YYYY-MM-DD');

  return (
    <div className="mini-calendar">
      <div className="mini-cal-header">
        <button
          className="mini-cal-nav"
          onClick={() => setViewMonth((p) => p.subtract(1, 'month'))}
        >
          <LeftOutlined />
        </button>
        <span className="mini-cal-title">{viewMonth.format('YYYY年M月')}</span>
        <button
          className="mini-cal-nav"
          onClick={() => setViewMonth((p) => p.add(1, 'month'))}
        >
          <RightOutlined />
        </button>
      </div>

      <div className="mini-cal-weekdays">
        {MINI_WEEKDAY_LABELS.map((l) => (
          <span key={l} className="mini-cal-wd">{l}</span>
        ))}
      </div>

      <div className="mini-cal-grid">
        {grid.map((d) => {
          const ds = d.format('YYYY-MM-DD');
          const isCurrentMonth = d.month() === viewMonth.month();
          const isSelected = ds === selectedStr;
          const isToday = ds === todayStr;
          const hasPlan = getPlansForDate(ds).length > 0;

          return (
            <button
              key={ds}
              className={[
                'mini-cal-day',
                !isCurrentMonth && 'other-month',
                isSelected && 'selected',
                isToday && !isSelected && 'today',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(ds)}
            >
              {d.date()}
              {hasPlan && !isSelected && <span className="mini-cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Main DayDetail Component ─── */
const DayDetail: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { getPlansForDate, updatePlan } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const currentDate = useMemo(() => dayjs(date), [date]);
  const isToday = useMemo(() => currentDate.isSame(dayjs(), 'day'), [currentDate]);

  const plans = useMemo(
    () => getPlansForDate(currentDate.format('YYYY-MM-DD')),
    [getPlansForDate, currentDate],
  );
  const timedPlans = useMemo(() => plans.filter((p) => p.startTime && p.endTime), [plans]);
  const allDayPlans = useMemo(() => plans.filter((p) => !p.startTime || !p.endTime), [plans]);

  const lunarText = useMemo(
    () => getLunarInfo(currentDate.format('YYYY-MM-DD')),
    [currentDate],
  );

  // Pointer sensor with 5px activation distance to avoid accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Tick current-time line every minute
  useEffect(() => {
    if (!isToday) return;
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(timer);
  }, [isToday]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      if (isToday) {
        el.scrollTop = Math.max(0, (new Date().getHours() - 1) * HOUR_HEIGHT);
      } else if (timedPlans.length > 0) {
        const { hour, minute } = parseTime(timedPlans[0].startTime!);
        el.scrollTop = Math.max(0, (hour - 1) * HOUR_HEIGHT + minute);
      } else {
        el.scrollTop = 8 * HOUR_HEIGHT;
      }
    });
  }, [date, isToday, timedPlans]);

  const navigateToDate = useCallback(
    (ds: string) => navigate(`/day/${ds}`, { replace: true }),
    [navigate],
  );

  const handlePrevDay = () =>
    navigateToDate(currentDate.subtract(1, 'day').format('YYYY-MM-DD'));
  const handleNextDay = () =>
    navigateToDate(currentDate.add(1, 'day').format('YYYY-MM-DD'));
  const handleToday = () => navigateToDate(dayjs().format('YYYY-MM-DD'));
  const handleBack = () => navigate('/home');

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      if (delta.y === 0) return;

      const plan = active.data.current?.plan as PlanItem | undefined;
      if (!plan?.startTime || !plan?.endTime) return;

      // Snap delta to 15-min grid
      const snappedDeltaPx = Math.round(delta.y / SNAP_PX) * SNAP_PX;
      const deltaMinutes = (snappedDeltaPx / HOUR_HEIGHT) * 60;
      if (deltaMinutes === 0) return;

      const startMin = timeToMinutes(plan.startTime);
      const endMin = timeToMinutes(plan.endTime);
      const duration = endMin - startMin;

      // Clamp new start within 0:00 ~ (24:00 - duration)
      let newStartMin = startMin + deltaMinutes;
      newStartMin = Math.max(0, Math.min(newStartMin, 24 * 60 - duration));
      // Snap to 15min
      newStartMin = Math.round(newStartMin / SNAP_MINUTES) * SNAP_MINUTES;
      const newEndMin = newStartMin + duration;

      updatePlan(plan.id, {
        startTime: minutesToTime(newStartMin),
        endTime: minutesToTime(newEndMin),
      });
    },
    [updatePlan],
  );

  const handleUpdateDescription = useCallback((id: string, description: string) => {
    updatePlan(id, { description });
  }, [updatePlan]);

  return (
    <div className="day-detail">
      {/* ── Left sidebar ── */}
      <aside className="day-detail-sidebar">
        <button className="sidebar-back-btn" onClick={handleBack}>
          <ArrowLeftOutlined />
          <span>返回日历</span>
        </button>

        <MiniCalendar
          selectedDate={currentDate}
          onSelectDate={navigateToDate}
          getPlansForDate={getPlansForDate}
        />

        {!isToday && (
          <button className="sidebar-today-btn" onClick={handleToday}>
            回到今天
          </button>
        )}

        <div className="sidebar-summary">
          <div className="sidebar-summary-count">
            <span className="summary-number">{plans.length}</span>
            <span className="summary-label">项计划</span>
          </div>

          <Button
            type="primary"
            icon={<EditOutlined />}
            className="sidebar-create-btn"
            onClick={() => navigate(`/today?date=${currentDate.format('YYYY-MM-DD')}`)}
            style={{ width: '100%', marginTop: '12px' }}
          >
            制定计划
          </Button>

          {plans.length > 0 && (
            <ul className="sidebar-plan-list">
              {plans.map((plan) => (
                <li key={plan.id} className="sidebar-plan-item">
                  <span
                    className="sidebar-plan-dot"
                    style={{ backgroundColor: EVENT_COLORS[plan.color].border }}
                  />
                  <span className="sidebar-plan-content">{plan.content}</span>
                  {plan.startTime && (
                    <span className="sidebar-plan-time">{plan.startTime}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Right main area ── */}
      <div className="day-detail-main">
        {/* Sub-header */}
        <div className="day-detail-header">
          <div className="day-detail-title-area">
            <div className="day-detail-date-num">{currentDate.date()}</div>
            <div className="day-detail-title-text">
              <div className="day-detail-title">
                {currentDate.format('M月')} 星期{WEEKDAY_NAMES[currentDate.day()]}
              </div>
              {lunarText && <div className="day-detail-lunar">{lunarText}</div>}
            </div>
          </div>
          <div className="day-detail-nav">
            <button className="day-detail-nav-btn" onClick={handlePrevDay}>
              <LeftOutlined />
            </button>
            <button className="day-detail-nav-btn" onClick={handleNextDay}>
              <RightOutlined />
            </button>
          </div>
        </div>

        {/* All-day events */}
        {allDayPlans.length > 0 && (
          <div className="day-detail-allday">
            <span className="allday-label">全天</span>
            <div className="allday-events">
              {allDayPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="allday-event"
                  style={{
                    backgroundColor: EVENT_COLORS[plan.color].bg,
                    borderLeftColor: EVENT_COLORS[plan.color].border,
                  }}
                >
                  <span className="allday-event-content">{plan.content}</span>
                  {plan.source === 'pico' && <span className="event-pico-tag">Pico</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time grid with DnD */}
        <DndContext
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <div className="day-detail-scroll" ref={scrollRef}>
            <div className="time-grid" style={{ height: 24 * HOUR_HEIGHT }}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="hour-row"
                  style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  <span className="hour-label">{formatHourLabel(hour)}</span>
                  <div className="hour-line" />
                </div>
              ))}

              {isToday && (
                <div
                  className="current-time-line"
                  style={{ top: currentMinutes * (HOUR_HEIGHT / 60) }}
                >
                  <div className="current-time-dot" />
                  <div className="current-time-rule" />
                </div>
              )}

              {timedPlans.map((plan) => {
                const start = parseTime(plan.startTime!);
                const end = parseTime(plan.endTime!);
                const topPx = (start.hour * 60 + start.minute) * (HOUR_HEIGHT / 60);
                const durationMin =
                  end.hour * 60 + end.minute - (start.hour * 60 + start.minute);
                const heightPx = Math.max(durationMin * (HOUR_HEIGHT / 60), 40);

                return (
                  <DraggableEvent
                    key={plan.id}
                    plan={plan}
                    topPx={topPx}
                    heightPx={heightPx}
                    colors={EVENT_COLORS[plan.color]}
                    onUpdateDescription={handleUpdateDescription}
                  />
                );
              })}
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  );
};

export default DayDetail;
