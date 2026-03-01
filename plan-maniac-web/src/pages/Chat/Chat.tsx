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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'pico',
      content: `你好！我是 Pico，你的专属计划助手。\n\n你想制定「${category}」，请告诉我你的具体需求和想法，我会帮你制定最合适的方案！`,
      type: 'text',
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    },
  ]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    thinkingEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thinkingText]);

  // Audio recording state
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

      // Implement processing audio data when stopped
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      mediaRecorder.ondataavailable = async (_e) => {
        // Here you would normally send _e.data to an audio-to-text API
        // For this demo, we'll just mock it
        setInputValue(prev => prev + " [语音输入内容]");
      };

    } catch (err) {
      console.error("Error accessing microphone:", err);
      message.error('无法访问麦克风，请检查权限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      message.success('录音结束');

      // Stop all tracks to release microphone
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

  // Image Upload handler
  const handleImageUpload = (info: any) => {
    if (info.file.status === 'done' || info.file.originFileObj) {
      // Generate object URL for preview
      const imageUrl = URL.createObjectURL(info.file.originFileObj || info.file);

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: `[图片上传成功]`,
        imageUrl: imageUrl,
        type: 'image',
        timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };

      setMessages((prev) => [...prev, userMessage]);
      simulatePicoResponse(userMessage.content, true);
    }
  };

  // 模拟真实 API 流式返回
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const simulatePicoResponse = (_userText: string, isImage: boolean = false) => {
    setIsLoading(true);
    setThinkingText('Pico 正在思考...');

    // 1. 先进行思考 (Thinking phase)
    let thoughtProcess = '';
    const thoughts = isImage ? [
      "收到了一张图片",
      "开始分析图片内容和当前计划分类的关联...",
      "提取图片中的关键信息、时间节点和任务点...",
      "结合用户的目标生成合理的日程安排..."
    ] : [
      "分析用户的输入意图...",
      "用户提到了关于计划的细节",
      "结合当前类别提取关键步骤...",
      "评估可行性并生成时间表..."
    ];

    let thoughtStep = 0;
    const thinkInterval = setInterval(() => {
      if (thoughtStep < thoughts.length) {
        thoughtProcess += `\n> ${thoughts[thoughtStep]}`;
        setThinkingText(thoughtProcess);
        thoughtStep++;
      } else {
        clearInterval(thinkInterval);

        // 2. 思考完毕，开始生成回复 (Response phase)
        const responseId = (Date.now() + 1).toString();

        // 先加一个空的回应框
        setMessages((prev) => [...prev, {
          id: responseId,
          role: 'pico',
          content: '',
          type: 'text',
          timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        }]);

        const finalReply = isImage ?
          `我已经识别了图片内容！\n\n根据图片信息，我建议在这个阶段加入以下安排：\n\n📅 **建议计划**\n- 分析图片资料 (1小时)\n- 制定相应的实施步骤\n\n**是否需要我将这些加入你的日程？**` :
          `好的，我了解了！让我为你整理一下...\n\n根据你的描述，我建议以下计划方案：\n\n📅 **第1天** (明天)\n- 09:00 制定详细目标\n- 14:00 收集相关资料\n\n📅 **第2天**\n- 09:00 开始执行第一阶段\n- 15:00 阶段性总结\n\n**是否需要我为你制定这个计划？**`;

        let charIndex = 0;
        const typeInterval = setInterval(() => {
          if (charIndex < finalReply.length) {
            const currentChar = finalReply.charAt(charIndex);
            setMessages((prev) =>
              prev.map(msg =>
                msg.id === responseId
                  ? { ...msg, content: msg.content + currentChar }
                  : msg
              )
            );
            charIndex++;
          } else {
            clearInterval(typeInterval);
            setIsLoading(false);
          }
        }, 30); // 打字机效果速度
      }
    }, 800); // 思考每步间隔
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

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Trigger simulation
    simulatePicoResponse(trimmed);
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
            setTimeout(() => onSuccess?.("ok"), 0);
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
          placeholder={isRecording ? "正在录音，点击麦克风停止..." : "输入消息..."}
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
