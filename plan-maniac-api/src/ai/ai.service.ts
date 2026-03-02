import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Response } from 'express';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class AiService {
  private readonly API_URL = 'https://api.moonshot.cn/v1/chat/completions';

  constructor(private readonly httpService: HttpService) {}

  async streamChat(messages: ChatMessage[], res: Response): Promise<void> {
    const apiKey = process.env.MOONSHOT_API_KEY;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const systemMessage: ChatMessage = {
      role: 'system',
      content: `你是 Pico，Plan Maniac 应用中的 AI 计划助手。你的职责是帮助用户制定清晰、可执行的个人计划。
你擅长：
- 将用户的想法拆解为具体的行动步骤
- 为每个计划建议合理的时间安排
- 提供鼓励和积极的反馈
- 用简洁友好的语气与用户沟通
回答时请使用中文，保持亲切、专业的风格。`,
    };

    const allMessages = [systemMessage, ...messages];

    try {
      const response = await this.httpService.axiosRef.post(
        this.API_URL,
        {
          model: 'moonshot-v1-32k',
          messages: allMessages,
          stream: true,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      );

      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta;
            if (!delta) continue;

            // Kimi uses standard OpenAI format: content = answer
            if (delta.content) {
              res.write(`data: ${JSON.stringify({ type: 'answer', content: delta.content })}\n\n`);
            }
          } catch {
            // skip malformed chunks
          }
        }
      });

      response.data.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });

      response.data.on('error', () => {
        res.write(`data: ${JSON.stringify({ type: 'error', content: 'Stream error occurred' })}\n\n`);
        res.end();
      });

    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || 'AI service unavailable';
      res.write(`data: ${JSON.stringify({ type: 'error', content: msg })}\n\n`);
      res.end();
    }
  }
}
