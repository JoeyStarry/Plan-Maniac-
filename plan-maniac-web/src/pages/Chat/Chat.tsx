import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Button, Avatar, Spin, Upload, message } from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  PictureOutlined,
  AudioOutlined,
  LoadingOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types';
import { aiApi } from '../../services/ai';
import { useApp } from '../../stores/AppContext';
import picoAvatar from '../../assets/pico-avatar.png';
import './Chat.css';

const { TextArea } = Input;

// ---- Types ----
interface PlanProposalItem {
  content: string;
  date: string;
  startTime?: string;
  endTime?: string;
}

interface PlanProposal {
  items: PlanProposalItem[];
  question?: string;
}

// ---- Helpers ----

/** If startTime given but no endTime, default to startTime + 1 hour. */
function resolveEndTime(startTime?: string, endTime?: string): string | undefined {
  if (endTime) return endTime;
  if (!startTime) return undefined;
  const [h, m] = startTime.split(':').map(Number);
  const total = Math.min(h * 60 + m + 60, 24 * 60 - 1);
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

// ---- Helpers ----

/** Parse <plan_proposal> JSON out of a completed message. */
function parsePlanProposal(content: string): { text: string; proposal: PlanProposal | null } {
  const OPEN = '<plan_proposal>';
  const CLOSE = '</plan_proposal>';
  const start = content.indexOf(OPEN);
  const end = content.indexOf(CLOSE);
  if (start === -1 || end === -1) return { text: content, proposal: null };
  try {
    const jsonStr = content.slice(start + OPEN.length, end).trim();
    const proposal = JSON.parse(jsonStr) as PlanProposal;
    const before = content.slice(0, start).trim();
    const after = content.slice(end + CLOSE.length).trim();
    const text = [before, after].filter(Boolean).join('\n\n');
    return { text, proposal };
  } catch {
    return { text: content, proposal: null };
  }
}

/** During streaming, hide <plan_proposal> block (including partial tag). */
function streamDisplayText(content: string): string {
  const OPEN = '<plan_proposal>';
  const idx = content.indexOf(OPEN);
  if (idx !== -1) return content.slice(0, idx).trim();
  // Guard partial tag at end of stream
  for (let i = OPEN.length - 1; i > 0; i--) {
    if (content.endsWith(OPEN.slice(0, i))) {
      return content.slice(0, content.length - i).trim();
    }
  }
  return content;
}

let _id = 0;
const genId = (prefix: string) => `${prefix}-${Date.now()}-${++_id}`;

// ---- Plan Proposal Card ----
const PlanProposalCard: React.FC<{
  proposal: PlanProposal;
  confirmed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ proposal, confirmed, onConfirm, onCancel }) => (
  <div className="plan-proposal-card">
    <div className="plan-proposal-header">
      <CalendarOutlined />
      <span>Pico 为你整理的计划</span>
    </div>
    <ul className="plan-proposal-list">
      {proposal.items.map((item, i) => (
        <li key={i} className="plan-proposal-item">
          {item.startTime && (
            <span className="plan-proposal-time">
              {item.startTime}{item.endTime ? `–${item.endTime}` : ''}
            </span>
          )}
          <span className="plan-proposal-content">{item.content}</span>
          <span className="plan-proposal-date">{item.date}</span>
        </li>
      ))}
    </ul>
    {confirmed ? (
      <div className="plan-proposal-confirmed">
        <CheckCircleOutlined />
        <span>已写入日历</span>
      </div>
    ) : (
      <div className="plan-proposal-actions">
        <Button type="primary" size="small" onClick={onConfirm}>
          确认，写入日历
        </Button>
        <Button size="small" onClick={onCancel}>
          稍后再说
        </Button>
      </div>
    )}
  </div>
);

// ---- Main Component ----
const Chat: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { addPlan } = useApp();

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingEndRef = useRef<HTMLDivElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);

  const [completedPicoIds, setCompletedPicoIds] = useState<Set<string>>(new Set());
  const [confirmedProposalIds, setConfirmedProposalIds] = useState<Set<string>>(new Set());

  // For plan proposals received via dedicated SSE event (backend parsed)
  const [messageProposals, setMessageProposals] = useState<Record<string, PlanProposal>>({});

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'pico-init',
      role: 'pico',
      content: `汪～你好！我是 Pico，你的专属计划助手 🐾\n\n你想制定「${category}」，告诉我你的具体需求和想法吧，我会帮你制定最合适的方案！`,
      type: 'text',
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    thinkingEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thinkingText]);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      message.info('开始录音...');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      mediaRecorder.ondataavailable = async (_e) => {
        setInputValue(prev => prev + ' [语音输入内容]');
      };
    } catch (err) {
      console.error('Error accessing microphone:', err);
      message.error('无法访问麦克风，请检查权限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      message.success('录音结束');
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAudioClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const callPicoApi = (currentMessages: ChatMessage[]) => {
    setIsLoading(true);
    setThinkingText('');

    const responseId = genId('pico');
    setMessages((prev) => [
      ...prev,
      {
        id: responseId,
        role: 'pico',
        content: '',
        type: 'text',
        timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      },
    ]);

    const apiMessages = currentMessages
      .filter((m) => m.role === 'user' || m.role === 'pico')
      .map((m) => ({
        role: (m.role === 'pico' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      }));

    cancelStreamRef.current = aiApi.streamChat(
      apiMessages,
      (chunk) => {
        setThinkingText((prev) => prev + chunk);
      },
      (chunk) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === responseId
              ? { ...msg, content: msg.content + chunk }
              : msg,
          ),
        );
      },
      () => {
        setIsLoading(false);
        cancelStreamRef.current = null;
        setCompletedPicoIds((prev) => new Set(prev).add(responseId));
      },
      (errMsg) => {
        message.error(errMsg);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === responseId
              ? { ...msg, content: `[错误：${errMsg}]` }
              : msg,
          ),
        );
        setIsLoading(false);
        cancelStreamRef.current = null;
      },
      // plan_proposal callback
      (planData: PlanProposal) => {
        setMessageProposals((prev) => ({ ...prev, [responseId]: planData }));
      },
    );
  };

  const handleImageUpload = (info: any) => {
    if (info.file.status === 'done' || info.file.originFileObj) {
      const imageUrl = URL.createObjectURL(info.file.originFileObj || info.file);
      const userMessage: ChatMessage = {
        id: genId('user'),
        role: 'user',
        content: '[图片上传成功]',
        imageUrl: imageUrl,
        type: 'image',
        timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };
      const updated = [...messages, userMessage];
      setMessages(updated);
      callPicoApi(updated);
    }
  };

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: genId('user'),
      role: 'user',
      content: trimmed,
      type: 'text',
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    setInputValue('');
    callPicoApi(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirmPlans = async (items: PlanProposalItem[], msgId: string) => {
    try {
      for (const item of items) {
        await addPlan({
          content: item.content,
          date: item.date,
          color: 'white',
          completed: false,
          source: 'pico',
          order: 0,
          startTime: item.startTime,
          endTime: resolveEndTime(item.startTime, item.endTime),
        });
      }
      setConfirmedProposalIds((prev) => new Set(prev).add(msgId));
      message.success(`已将 ${items.length} 条计划写入日历 汪～`);
      const confirmMsg: ChatMessage = {
        id: genId('pico'),
        role: 'pico',
        content: `汪！${items.length} 条计划已经全部写入日历啦 🐾 记得按时完成哦！`,
        type: 'text',
        timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };
      setMessages((prev) => [...prev, confirmMsg]);
      setCompletedPicoIds((prev) => new Set(prev).add(confirmMsg.id));
    } catch {
      message.error('保存失败，请重试');
    }
  };

  const handleCancelPlans = (msgId: string) => {
    setConfirmedProposalIds((prev) => new Set(prev).add(msgId));
    const cancelMsg: ChatMessage = {
      id: genId('pico'),
      role: 'pico',
      content: `好的，随时告诉我要保存就行～ 汪！`,
      type: 'text',
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
    setMessages((prev) => [...prev, cancelMsg]);
    setCompletedPicoIds((prev) => new Set(prev).add(cancelMsg.id));
  };

  return (
    <div className="chat-layout-container">
      {/* 左侧：聊天区域 */}
      <div className="chat-page">
        {/* 顶部栏 */}
        <div className="chat-header">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="chat-back-btn"
            onClick={() => navigate(-1)}
          >
            返回
          </Button>
          <div className="chat-header-title">{category}</div>
          <div className="chat-header-placeholder" />
        </div>

        {/* 消息区域 */}
        <div className="chat-messages">
          {messages.map((msg) => {
            const isCompleted = completedPicoIds.has(msg.id);

            // Get the proposal: either from backend SSE event or parsed from content
            const proposal: PlanProposal | null =
              msg.role === 'pico' && isCompleted
                ? (messageProposals[msg.id] ?? parsePlanProposal(msg.content).proposal)
                : null;

            // Clean display text (strip plan_proposal block)
            const displayText =
              msg.role === 'pico'
                ? isCompleted
                  ? parsePlanProposal(msg.content).text
                  : streamDisplayText(msg.content)
                : msg.content;

            return (
              <div
                key={msg.id}
                className={`message-row ${msg.role === 'pico' ? 'pico' : 'user'}`}
              >
                {msg.role === 'pico' && (
                  <Avatar
                    className="pico-avatar"
                    size={36}
                    src={picoAvatar}
                    style={{ flexShrink: 0 }}
                  />
                )}
                <div className="message-content">
                  <div
                    className={`message-bubble ${msg.role === 'pico' ? 'pico-bubble' : 'user-bubble'}`}
                  >
                    {msg.type === 'image' && msg.imageUrl ? (
                      <img src={msg.imageUrl} alt="uploaded" className="chat-uploaded-image" />
                    ) : (
                      <ReactMarkdown>{displayText}</ReactMarkdown>
                    )}
                  </div>
                  <div
                    className={`message-time ${msg.role === 'user' ? 'message-time-right' : ''}`}
                  >
                    {dayjs(msg.timestamp).format('HH:mm')}
                  </div>
                  {/* 计划提案卡片 */}
                  {proposal && (
                    <PlanProposalCard
                      proposal={proposal}
                      confirmed={confirmedProposalIds.has(msg.id)}
                      onConfirm={() => handleConfirmPlans(proposal.items, msg.id)}
                      onCancel={() => handleCancelPlans(msg.id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 底部输入区 */}
        <div className="chat-input-area">
          <Upload
            accept="image/*"
            showUploadList={false}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            customRequest={({ file: _file, onSuccess }) => {
              setTimeout(() => onSuccess?.('ok'), 0);
            }}
            onChange={handleImageUpload}
          >
            <Button
              type="text"
              icon={<PictureOutlined />}
              className="chat-action-btn"
              disabled={isLoading}
            />
          </Upload>
          <Button
            type="text"
            icon={<AudioOutlined />}
            className={`chat-action-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleAudioClick}
            disabled={isLoading}
          />
          <TextArea
            className="chat-textarea"
            placeholder={isRecording ? '正在录音，点击麦克风停止...' : '输入消息...'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isLoading || isRecording}
          />
          <Button
            type="primary"
            icon={isLoading ? <LoadingOutlined /> : <SendOutlined />}
            className="chat-send-btn"
            onClick={handleSend}
            disabled={(!inputValue.trim() && !isRecording) || isLoading}
          />
        </div>
      </div>

      {/* 右侧：AI 思考过程区 */}
      <div className="chat-thinking-area">
        <div className="thinking-header">
          <span className="thinking-icon">💭</span>
          Pico 思考过程
          {isLoading && <Spin size="small" style={{ marginLeft: 'auto' }} />}
        </div>
        <div className="thinking-content">
          {thinkingText ? (
            <div className="thinking-text">
              {thinkingText.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {isLoading && <span className="thinking-cursor">|</span>}
            </div>
          ) : (
            <div className="thinking-placeholder">
              模型在背后的推理、任务拆解以及工具调用过程将在这里显示。
            </div>
          )}
          <div ref={thinkingEndRef} />
        </div>
      </div>
    </div>
  );
};

export default Chat;
