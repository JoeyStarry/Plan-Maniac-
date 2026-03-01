import React, { useState, useMemo, useEffect } from 'react';
import { Input, Button, Popover, Modal, TimePicker } from 'antd';
import { HolderOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../../stores/AppContext';
import type { PlanItem } from '../../types';
import { quotes } from '../../mock/data';
import './Today.css';

dayjs.locale('zh-cn');

const { TextArea } = Input;

import { useLocation } from 'react-router-dom';

// ==================== SortablePlanItem ====================
interface SortablePlanItemProps {
  plan: PlanItem;
  index: number;
  onColorChange: (id: string, color: PlanItem['color']) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateDescription: (id: string, desc: string) => void;
  onUpdateContent: (id: string, content: string) => void;
  disabled: boolean;
}

const SortablePlanItem: React.FC<SortablePlanItemProps> = ({
  plan,
  index,
  onColorChange,
  onComplete,
  onDelete,
  onUpdateDescription,
  onUpdateContent,
  disabled,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [descValue, setDescValue] = useState(plan.description || '');

  // Edit Content State
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editContentValue, setEditContentValue] = useState(plan.content);

  // 当外部的 plan 属性更新时，同步更新内部的 state
  useEffect(() => {
    setDescValue(plan.description || '');
  }, [plan.description]);

  useEffect(() => {
    setEditContentValue(plan.content);
  }, [plan.content]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  const colorOptions: PlanItem['color'][] = ['red', 'yellow', 'white'];

  const colorPickerContent = (
    <div className="color-picker">
      {colorOptions.map((c) => (
        <div
          key={c}
          className={`color-picker-dot picker-${c}${plan.color === c ? ' selected' : ''}`}
          onClick={() => onColorChange(plan.id, c)}
        />
      ))}
    </div>
  );

  const handleCompleteClick = () => {
    if (plan.completed || disabled) return;
    Modal.confirm({
      title: '确认计划完成？',
      onOk: () => onComplete(plan.id),
      okText: '确认',
      cancelText: '取消',
    });
  };

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

  const handleEditContentStart = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发拖拽或双击
    setIsEditingContent(true);
  };

  const handleEditContentSave = () => {
    const trimmed = editContentValue.trim();
    if (trimmed && trimmed !== plan.content) {
      onUpdateContent(plan.id, trimmed);
    } else {
      setEditContentValue(plan.content);
    }
    setIsEditingContent(false);
  };

  const handleEditContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditContentSave();
    } else if (e.key === 'Escape') {
      setEditContentValue(plan.content);
      setIsEditingContent(false);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`plan-item${plan.completed ? ' completed' : ''}`}
        onDoubleClick={handleDoubleClick}
      >
        {/* Drag Handle */}
      <span className="drag-handle" {...attributes} {...listeners}>
        <HolderOutlined />
      </span>

      {/* Order Number */}
      <span className="plan-order-num">{index + 1}</span>

      {/* Pico Badge */}
      {plan.source === 'pico' && <span className="pico-badge">🤖</span>}

      {/* Content and Time */}
      <div className="plan-item-content-wrapper">
        <div className="plan-item-content-row">
          {isEditingContent ? (
            <Input
              autoFocus
              className="plan-content-edit-input"
              value={editContentValue}
              onChange={(e) => setEditContentValue(e.target.value)}
              onBlur={handleEditContentSave}
              onKeyDown={handleEditContentKeyDown}
              size="small"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className="plan-item-content">{plan.content}</span>
              {!plan.completed && !disabled && (
                <button
                  className="edit-content-btn"
                  onClick={handleEditContentStart}
                  title="修改计划名称"
                >
                  <EditOutlined />
                </button>
              )}
            </>
          )}
        </div>
        {plan.startTime && plan.endTime && (
          <span className="plan-item-time">
            {plan.startTime} - {plan.endTime}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="plan-item-actions">
        {/* Color Dot */}
        <Popover content={colorPickerContent} trigger="click" placement="bottom">
          <div className={`color-dot color-${plan.color}`} />
        </Popover>

        {/* Complete Checkbox */}
        <div
          className={`complete-box${plan.completed ? ' checked' : ''}`}
          onClick={handleCompleteClick}
        >
          {plan.completed && <CheckOutlined />}
        </div>

        {/* Delete Button */}
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          className="delete-plan-btn"
          onClick={() => onDelete(plan.id)}
          disabled={disabled}
        />
      </div>
    </div>

      {/* Description Modal */}
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

// ==================== Today Page ====================
const Today: React.FC = () => {
  const {
    getPlansForDate,
    addPlan,
    updatePlan,
    deletePlan,
    reorderPlans,
    completeTodayPlans,
    addPoints,
    todayCompleted,
    fetchPlansForDate,
  } = useApp();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const dateParam = queryParams.get('date');

  const todayStr = dateParam || dayjs().format('YYYY-MM-DD');

  // Load plans from API on mount
  useEffect(() => {
    fetchPlansForDate(todayStr);
  }, [todayStr]);
  const todayDisplay = dayjs(todayStr).format('YYYY年M月D日 dddd');
  const isRealToday = dayjs().format('YYYY-MM-DD') === todayStr;

  const [inputValue, setInputValue] = useState('');
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [showQuote, setShowQuote] = useState(false);
  const [randomQuote, setRandomQuote] = useState(quotes[0]);

  // Get today's plans from context
  const todayPlans = getPlansForDate(todayStr);

  // Check if all plans are completed
  const allCompleted = useMemo(() => {
    return todayPlans.length > 0 && todayPlans.every((p) => p.completed);
  }, [todayPlans]);

  // ---- Add Plan ----
  const handleAddPlan = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    let startTime: string | undefined = undefined;
    let endTime: string | undefined = undefined;

    if (timeRange && timeRange[0] && timeRange[1]) {
      startTime = timeRange[0].format('HH:mm');
      endTime = timeRange[1].format('HH:mm');
    }

    addPlan({
      content: trimmed,
      order: todayPlans.length + 1,
      color: 'white',
      completed: false,
      source: 'user',
      date: todayStr,
      startTime,
      endTime,
    });
    setInputValue('');
    setTimeRange(null);
  };

  // ---- Color Change ----
  const handleColorChange = (id: string, color: PlanItem['color']) => {
    updatePlan(id, { color });
  };

  // ---- Complete Single Plan ----
  const handleComplete = (id: string) => {
    updatePlan(id, { completed: true });
  };

  // ---- Delete Plan ----
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除该计划？',
      content: '删除后无法恢复',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        deletePlan(id);
      },
    });
  };

  // ---- Update Description ----
  const handleUpdateDescription = (id: string, description: string) => {
    updatePlan(id, { description });
  };

  // ---- Update Content ----
  const handleUpdateContent = (id: string, content: string) => {
    updatePlan(id, { content });
  };

  // ---- Drag End ----
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = todayPlans.findIndex((p) => p.id === active.id);
    const newIndex = todayPlans.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(todayPlans, oldIndex, newIndex).map(
      (plan, idx) => ({ ...plan, order: idx + 1 })
    );

    reorderPlans(todayStr, reordered);
  };

  // ---- Complete All Plans ----
  const handleCompleteAll = () => {
    Modal.confirm({
      title: '确认今日计划完成？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        // Show quote card
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        setRandomQuote(quote);
        setShowQuote(true);
      },
    });
  };

  // ---- Close Quote Card ----
  const handleCloseQuote = () => {
    setShowQuote(false);
    // Show points modal after closing quote
    Modal.info({
      title: '计划积分 +1',
      okText: '好的',
      onOk: () => {
        addPoints(1);
        completeTodayPlans();
      },
    });
  };

  return (
    <div className="today-container">
      <div className="today-card">
        {/* Date Title */}
        <div className="today-date-title">{todayDisplay}</div>

        {/* Input Area */}
        <div className="today-input-area">
          <Input
            placeholder="输入你的计划..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleAddPlan}
            disabled={todayCompleted}
          />
          <TimePicker.RangePicker
            format="HH:mm"
            minuteStep={15}
            value={timeRange}
            onChange={(dates) => setTimeRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
            disabled={todayCompleted}
            className="today-time-picker"
            placeholder={['开始', '结束']}
            allowClear
          />
          <Button
            type="primary"
            onClick={handleAddPlan}
            disabled={todayCompleted || !inputValue.trim()}
          >
            添加
          </Button>
        </div>

        {/* Execution Section */}
        {todayPlans.length > 0 && (
          <div className="execution-section-title">执行栏</div>
        )}

        {todayPlans.length === 0 ? (
          <div className="today-empty">
            {isRealToday ? '暂无计划，请添加今日计划' : '暂无计划，请添加计划'}
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={todayPlans.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {todayPlans.map((plan, index) => (
                <SortablePlanItem
                  key={plan.id}
                  plan={plan}
                  index={index}
                  onColorChange={handleColorChange}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                  onUpdateDescription={handleUpdateDescription}
                  onUpdateContent={handleUpdateContent}
                  disabled={todayCompleted}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Complete All Button (Only show if it's actually today) */}
        {isRealToday && todayPlans.length > 0 && (
          <div className="complete-all-section">
            <Button
              className={`complete-all-btn${allCompleted && !todayCompleted ? ' active' : ''}`}
              disabled={!allCompleted || todayCompleted}
              onClick={handleCompleteAll}
            >
              {todayCompleted ? '今日计划已完成' : '完成今日计划！'}
            </Button>
          </div>
        )}
      </div>

      {/* Quote Card Overlay */}
      {showQuote && (
        <div className="quote-overlay">
          <div
            className="quote-card"
            style={{ backgroundImage: `url(${randomQuote.backgroundImage})` }}
          >
            <button className="quote-close-btn" onClick={handleCloseQuote}>
              <CloseOutlined />
            </button>
            <div className="quote-card-mask">
              <div className="quote-text">{randomQuote.text}</div>
              <div className="quote-author">—— {randomQuote.author}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Today;
