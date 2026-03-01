import React from 'react';
import { useNavigate } from 'react-router-dom';
import { planCategories } from '../../mock/data';
import type { PlanCategory } from '../../types';
import './PlanChat.css';

const PlanChat: React.FC = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (category: PlanCategory) => {
    navigate(`/chat/${category.name}`);
  };

  const getSizeClass = (size: string): string => {
    switch (size) {
      case 'large':
        return 'plan-btn large';
      case 'medium':
        return 'plan-btn medium';
      case 'small':
        return 'plan-btn small';
      default:
        return 'plan-btn medium';
    }
  };

  const getButtonStyle = (category: PlanCategory): React.CSSProperties => {
    // 随机动画延迟和持续时间，制造不同气泡的错落感
    const animDuration = 4 + Math.random() * 3; // 4s - 7s
    const animDelay = Math.random() * -5; // 负数 delay 让动画一开始就处于不同阶段

    return {
      backgroundColor: `${category.color}18`,
      color: category.color,
      borderColor: `${category.color}60`,
      animationDuration: `${animDuration}s`,
      animationDelay: `${animDelay}s`,
      '--hover-glow-color': category.color, // 用于传递给 CSS 的光晕颜色
    } as React.CSSProperties;
  };

  return (
    <div className="plan-chat-page">
      <div className="plan-chat-card">
        <div className="plan-chat-header">
          <h1 className="plan-chat-title">选择你的计划类型</h1>
          <p className="plan-chat-subtitle">点击开始与 Pico 制定专属计划</p>
        </div>

        <div className="plan-btn-container">
          {planCategories.map((category: PlanCategory, index: number) => (
            <button
              key={category.id}
              className={`${getSizeClass(category.size)} ${index % 2 === 0 ? 'offset-even' : 'offset-odd'}`}
              style={getButtonStyle(category)}
              onClick={() => handleCategoryClick(category)}
            >
              <span className="plan-btn-icon">{category.icon}</span>
              <span className="plan-btn-name">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlanChat;
