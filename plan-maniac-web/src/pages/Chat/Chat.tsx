import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Button, Avatar, Spin, Upload, Modal, DatePicker, Checkbox, message } from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  PictureOutlined,
  AudioOutlined,
  LoadingOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types';
import { aiApi } from '../../services/ai';
import { useApp } from '../../stores/AppContext';
import './Chat.css';

const { TextArea } = Input;

interface ParsedPlanItem {
  content: string;
  startTime?: string;
}

function extractPlanItems(text: string): ParsedPlanItem[] {
  const lines = text.split('\n');
  const items: ParsedPlanItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Time-tagged: 09:00 xxx or - 09:00 xxx
    const timeMatch = trimmed.match(/^[-*\d.]*\s*(\d{1,2}:\d{2})\s+(.+)/);
    if (timeMatch) {
      const content = timeMatch[2].replace(/\*\*/g, '').replace(/[*_`]/g, '').trim();
      if (content.length > 2) {
        items.push({ content, startTime: timeMatch[1] });
        continue;
      }
    }

    // Bullet: - xxx or * xxx
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      const content = bulletMatch[1].replace(/\*\*/g, '').replace(/[*_`]/g, '').trim();
      if (content.length > 2) {
        items.push({ content });
        continue;
      }
    }

    // Numbered: 1. xxx
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numberedMatch) {
      const content = numberedMatch[1].replace(/\*\*/g, '').replace(/[*_`]/g, '').trim();
      if (content.length > 2) {
        items.push({ content });
      }
    }
  }

  return items;
}

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

  // Track which pico message IDs have finished streaming
  const [completedPicoIds, setCompletedPicoIds] = useState<Set<string>>(new Set());

  // Save modal state
  const [saveModal, setSaveModal] = useState<{
    messageId: string;
    items: ParsedPlanItem[];
    selected: string[]; // indices as strings
    date: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'pico',
      content: `你好！我是 Pico，你的专属计划助手。\n\n你想制定「${category}」，请告诉我你的具体需求和想法，我会帮你制定最合适的方案！`,
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

    const responseId = Date.now().toString();
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
    );
  };

  const handleImageUpload = (info: any) => {
    if (info.file.status === 'done' || info.file.originFileObj) {
      const imageUrl = URL.createObjectURL(info.file.originFileObj || info.file);
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: '[图片上传成功]',
        imageUrl: imageUrl,
        type: 'image',
        timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };
      setMessages((prev) => {
        const updated = [...prev, userMessage];
        callPicoApi(updated);
        return updated;
      });
    }
  };

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      type: 'text',
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      callPicoApi(updated);
      return updated;
    });
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openSaveModal = (msg: ChatMessage) => {
    const items = extractPlanItems(msg.content);
    setSaveModal({
      messageId: msg.id,
      items,
      selected: items.map((_, i) => String(i)),
      date: dayjs().format('YYYY-MM-DD'),
    });
  };

  const handleSavePlans = async () => {
    if (!saveModal) return;
    setSaving(true);
    const selectedItems = saveModal.selected.map((i) => saveModal.items[Number(i)]);
    try {
      for (const item of selectedItems) {
        await addPlan({
          content: item.content,
          date: saveModal.date,
          color: 'white',
          completed: false,
          source: 'pico',
          order: 0,
          startTime: item.startTime,
        });
      }
      message.success(`已保存 ${selectedItems.length} 条计划`);
      setSaveModal(null);
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
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
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.role === 'pico' ? 'pico' : 'user'}`}
            >
              {msg.role === 'pico' && (
                <Avatar
                  className="pico-avatar"
                  size={36}
                  src="/src/assets/pico-avatar.png"
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
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
                <div
                  className={`message-time ${msg.role === 'user' ? 'message-time-right' : ''}`}
                >
                  {dayjs(msg.timestamp).format('HH:mm')}
                </div>
                {/* 保存按钮：只在完成流式输出的 Pico 消息下显示 */}
                {msg.role === 'pico' && msg.id !== '1' && completedPicoIds.has(msg.id) && msg.content && (
                  <Button
                    size="small"
                    icon={<CalendarOutlined />}
                    className="save-plan-btn"
                    onClick={() => openSaveModal(msg)}
                  >
                    保存为计划
                  </Button>
                )}
              </div>
            </div>
          ))}
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

      {/* 保存计划 Modal */}
      <Modal
        title="保存为计划"
        open={!!saveModal}
        onCancel={() => setSaveModal(null)}
        onOk={handleSavePlans}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        okButtonProps={{ disabled: !saveModal?.selected.length }}
      >
        {saveModal && (
          <div className="save-plan-modal-body">
            <div className="save-plan-date-row">
              <span>计划日期：</span>
              <DatePicker
                value={dayjs(saveModal.date)}
                format="YYYY-MM-DD"
                onChange={(d) =>
                  setSaveModal((prev) =>
                    prev ? { ...prev, date: d ? d.format('YYYY-MM-DD') : prev.date } : prev
                  )
                }
                allowClear={false}
              />
            </div>
            {saveModal.items.length > 0 ? (
              <>
                <p style={{ color: '#888', fontSize: 13, margin: '12px 0 8px' }}>
                  选择要保存的计划项：
                </p>
                <Checkbox.Group
                  value={saveModal.selected}
                  onChange={(vals) =>
                    setSaveModal((prev) =>
                      prev ? { ...prev, selected: vals as string[] } : prev
                    )
                  }
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {saveModal.items.map((item, i) => (
                    <Checkbox key={i} value={String(i)}>
                      {item.startTime && (
                        <span style={{ color: '#667eea', marginRight: 6, fontWeight: 500 }}>
                          {item.startTime}
                        </span>
                      )}
                      {item.content}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </>
            ) : (
              <p style={{ color: '#888', fontSize: 13, marginTop: 12 }}>
                未检测到结构化计划项，请在今日计划页面手动添加。
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Chat;
