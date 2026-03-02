import apiClient from './client';
import type { ChatMessage } from '../types';

export const aiApi = {
  /**
   * Stream chat with Pico AI via SSE
   * onThinking: called with each reasoning chunk
   * onAnswer: called with each answer chunk
   * onDone: called when stream ends
   */
  streamChat: (
    messages: { role: 'user' | 'assistant'; content: string }[],
    onThinking: (chunk: string) => void,
    onAnswer: (chunk: string) => void,
    onDone: () => void,
    onError: (msg: string) => void,
    onPlanProposal?: (data: any) => void,
  ): (() => void) => {
    const token = localStorage.getItem('access_token');

    const controller = new AbortController();

    fetch(`${apiClient.defaults.baseURL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          onError('AI 服务暂时不可用');
          onDone();
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') {
              if (trimmed === 'data: [DONE]') onDone();
              continue;
            }
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.type === 'thinking') onThinking(json.content);
              else if (json.type === 'answer') onAnswer(json.content);
              else if (json.type === 'plan_proposal') onPlanProposal?.(json.data);
              else if (json.type === 'error') onError(json.content);
            } catch {
              // skip malformed
            }
          }
        }

        onDone();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError('网络连接失败');
          onDone();
        }
      });

    // Return cancel function
    return () => controller.abort();
  },
};

export type { ChatMessage };
