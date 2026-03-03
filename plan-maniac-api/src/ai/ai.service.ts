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

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[now.getDay()];

    const systemMessage: ChatMessage = {
      role: 'system',
      content: `你是 Pico，Plan Maniac 应用中的 AI 计划助手，是一只聪明可爱的小狗 🐾。你偶尔会在句子末尾自然地加入"汪～"、"汪！"等语气词，表现出活泼可爱的性格，但不要每句都加，要自然随机。

你的职责：
- 通过对话了解用户的目标和需求
- 将用户的想法拆解为具体可执行的行动步骤
- 为每个计划建议合理的时间安排
- 提供鼓励和积极的反馈

今天是 ${today}（${weekday}）。

**计划生成规则**：
经过 2-3 轮对话，充分了解用户的目标、时间和具体需求后，主动向用户提出总结计划。此时在你的回复末尾加入以下格式的计划提案（JSON 必须合法）：

<plan_proposal>
{"items":[{"content":"任务描述","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm"}],"question":"要把这些计划写入日历吗？汪～"}
</plan_proposal>

注意：
- date 使用 YYYY-MM-DD 格式，基于今天 ${today} 合理安排日期
- startTime 和 endTime 都使用 HH:mm 24小时制，必须同时提供，没有明确时间的任务请根据内容估算合理时长
- 只有充分了解用户需求后才输出计划提案
- 每次只输出一个 plan_proposal 块

在每次回答之前，请先用 <think>...</think> 标签写出你的思考过程，然后再给出正式的回答。
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
      let accumulated = '';   // full raw content from model
      let emittedThinkLen = 0;
      let emittedAnswerLen = 0;
      let planProposalEmitted = false;
      const OPEN_TAG = '<think>';
      const CLOSE_TAG = '</think>';

      const flush = () => {
        const text = accumulated;
        const openIdx = text.indexOf(OPEN_TAG);
        const closeIdx = text.indexOf(CLOSE_TAG);

        if (openIdx === -1) {
          // No <think> tag yet — emit as answer (hold back possible partial tag)
          let safeLen = text.length;
          for (let i = OPEN_TAG.length - 1; i > 0; i--) {
            if (text.endsWith(OPEN_TAG.slice(0, i))) {
              safeLen = text.length - i;
              break;
            }
          }
          if (safeLen > emittedAnswerLen) {
            const chunk = text.slice(emittedAnswerLen, safeLen);
            if (chunk) {
              res.write(`data: ${JSON.stringify({ type: 'answer', content: chunk })}\n\n`);
              emittedAnswerLen = safeLen;
            }
          }
          return;
        }

        // <think> tag present
        if (closeIdx === -1) {
          // Still inside think block — stream thinking content
          const thinkSoFar = text.slice(openIdx + OPEN_TAG.length);
          if (thinkSoFar.length > emittedThinkLen) {
            const chunk = thinkSoFar.slice(emittedThinkLen);
            res.write(`data: ${JSON.stringify({ type: 'thinking', content: chunk })}\n\n`);
            emittedThinkLen = thinkSoFar.length;
          }
          return;
        }

        // Both tags present — think block complete
        const thinkContent = text.slice(openIdx + OPEN_TAG.length, closeIdx);
        if (thinkContent.length > emittedThinkLen) {
          const chunk = thinkContent.slice(emittedThinkLen);
          res.write(`data: ${JSON.stringify({ type: 'thinking', content: chunk })}\n\n`);
          emittedThinkLen = thinkContent.length;
        }

        // Everything after </think> is the answer area — parse plan_proposal within it
        const PLAN_OPEN = '<plan_proposal>';
        const PLAN_CLOSE = '</plan_proposal>';
        const answerArea = text.slice(closeIdx + CLOSE_TAG.length).replace(/^\s+/, '');
        const planOpenIdx = answerArea.indexOf(PLAN_OPEN);
        const planCloseIdx = answerArea.indexOf(PLAN_CLOSE);

        if (planOpenIdx === -1) {
          // No plan_proposal — emit answer (hold back possible partial plan tag)
          let safeLen = answerArea.length;
          for (let i = PLAN_OPEN.length - 1; i > 0; i--) {
            if (answerArea.endsWith(PLAN_OPEN.slice(0, i))) {
              safeLen = answerArea.length - i;
              break;
            }
          }
          if (safeLen > emittedAnswerLen) {
            const chunk = answerArea.slice(emittedAnswerLen, safeLen);
            if (chunk) {
              res.write(`data: ${JSON.stringify({ type: 'answer', content: chunk })}\n\n`);
              emittedAnswerLen = safeLen;
            }
          }
        } else if (planCloseIdx === -1) {
          // plan_proposal block opening but not yet closed — emit text before it
          const beforePlan = answerArea.slice(0, planOpenIdx);
          if (beforePlan.length > emittedAnswerLen) {
            const chunk = beforePlan.slice(emittedAnswerLen);
            if (chunk) {
              res.write(`data: ${JSON.stringify({ type: 'answer', content: chunk })}\n\n`);
              emittedAnswerLen = beforePlan.length;
            }
          }
        } else {
          // plan_proposal block complete
          const beforePlan = answerArea.slice(0, planOpenIdx).trim();
          if (beforePlan.length > emittedAnswerLen) {
            const chunk = beforePlan.slice(emittedAnswerLen);
            if (chunk) {
              res.write(`data: ${JSON.stringify({ type: 'answer', content: chunk })}\n\n`);
              emittedAnswerLen = beforePlan.length;
            }
          }

          // Emit plan_proposal once (check by emitted flag)
          if (!planProposalEmitted) {
            try {
              const jsonStr = answerArea.slice(planOpenIdx + PLAN_OPEN.length, planCloseIdx).trim();
              const planData = JSON.parse(jsonStr);
              res.write(`data: ${JSON.stringify({ type: 'plan_proposal', data: planData })}\n\n`);
              planProposalEmitted = true;
            } catch {
              // malformed JSON — skip
            }
          }

          // Emit text after plan_proposal
          const afterPlan = answerArea.slice(planCloseIdx + PLAN_CLOSE.length).trim();
          const afterStart = beforePlan.length; // virtual offset for afterPlan tracking
          if (afterPlan.length > (emittedAnswerLen - afterStart) && emittedAnswerLen >= afterStart) {
            const emittedAfter = emittedAnswerLen - afterStart;
            const chunk = afterPlan.slice(emittedAfter);
            if (chunk) {
              res.write(`data: ${JSON.stringify({ type: 'answer', content: chunk })}\n\n`);
              emittedAnswerLen = afterStart + afterPlan.length;
            }
          }
        }
      };

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

            if (delta.content) {
              accumulated += delta.content;
              flush();
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
