import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Button, Avatar, Spin, Upload, message } from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  PictureOutlined,
  AudioOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../../types';
import { aiApi } from '../../services/ai';
import './Chat.css';

const { TextArea } = Input;

const Chat: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingEndRef = useRef<HTMLDivElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);

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
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
    </div>
  );
};

export default Chat;
