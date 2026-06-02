import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';

// ============================================================
// DeepSeek Function Calling Agent - 云盘 AI 助手
// ============================================================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-d1646d7f6e3f458ba082755ba88b75be';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';
const MAX_TOOL_ROUNDS = 8; // 最大工具调用轮数

// ============ Tools 定义 ============
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_files',
      description: '列出云盘中的文件和文件夹。可指定父文件夹ID查看子内容，不指定则查看根目录。',
      parameters: {
        type: 'object',
        properties: {
          parentId: {
            type: 'number',
            description: '父文件夹ID，不传或传null查看根目录',
          },
          type: {
            type: 'string',
            enum: ['all', 'folder', 'file'],
            description: '筛选类型：all=全部(默认), folder=仅文件夹, file=仅文件',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_files',
      description: '在云盘中搜索文件或文件夹，支持按名称关键词搜索。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词',
          },
          type: {
            type: 'string',
            enum: ['all', 'folder', 'file'],
            description: '筛选类型',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_file_details',
      description: '获取指定文件或文件夹的详细信息，包括大小、类型、创建时间等。',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'number',
            description: '文件ID',
          },
        },
        required: ['fileId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_folder',
      description: '在云盘中创建新文件夹。',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '文件夹名称',
          },
          parentId: {
            type: 'number',
            description: '父文件夹ID，不传则在根目录创建',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_file',
      description: '删除文件或文件夹，移至回收站。',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'number',
            description: '要删除的文件或文件夹ID',
          },
        },
        required: ['fileId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'rename_file',
      description: '重命名文件或文件夹。',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'number',
            description: '文件ID',
          },
          newName: {
            type: 'string',
            description: '新名称',
          },
        },
        required: ['fileId', 'newName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_file',
      description: '将文件或文件夹移动到指定文件夹。',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'number',
            description: '要移动的文件ID',
          },
          targetParentId: {
            type: 'number',
            description: '目标父文件夹ID，传null移到根目录',
          },
        },
        required: ['fileId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'share_file',
      description: '创建文件或文件夹的分享链接。',
      parameters: {
        type: 'object',
        properties: {
          fileId: {
            type: 'number',
            description: '文件或文件夹ID',
          },
          expiryDays: {
            type: 'number',
            description: '有效天数，不传则永久有效',
          },
        },
        required: ['fileId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_shares',
      description: '列出当前用户的所有分享记录。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_storage_info',
      description: '获取当前用户的存储空间使用情况，包括已用空间、总配额等。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_recent_files',
      description: '获取最近操作过的文件列表。',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '返回数量，默认10',
          },
        },
        required: [],
      },
    },
  },
];

// ============ Tool 执行引擎 ============
function executeTool(name: string, args: Record<string, unknown>, userId: number): string {
  const db = getDb();
  try {
    switch (name) {
      case 'list_files': {
        const parentId = args.parentId as number | null | undefined;
        const type = (args.type as string) || 'all';
        let rows: Record<string, unknown>[];
        if (parentId) {
          rows = db.prepare('SELECT id, name, is_folder, size, mime_type, created_at, updated_at FROM files WHERE parent_id = ? AND uploaded_by = ? AND deleted_at IS NULL ORDER BY is_folder DESC, name ASC').all(parentId, userId) as Record<string, unknown>[];
        } else {
          rows = db.prepare('SELECT id, name, is_folder, size, mime_type, created_at, updated_at FROM files WHERE (parent_id IS NULL OR parent_id = 0) AND uploaded_by = ? AND deleted_at IS NULL ORDER BY is_folder DESC, name ASC').all(userId) as Record<string, unknown>[];
        }
        if (type === 'folder') rows = rows.filter(r => r.is_folder);
        else if (type === 'file') rows = rows.filter(r => !r.is_folder);
        return JSON.stringify({
          success: true,
          files: rows.map(r => ({
            ...r,
            isFolder: !!r.is_folder,
            sizeText: formatSize(r.size as number),
          })),
          total: rows.length,
        });
      }

      case 'search_files': {
        const query = args.query as string;
        const type = (args.type as string) || 'all';
        const likeQuery = `%${query}%`;
        let rows = db.prepare('SELECT id, name, is_folder, size, mime_type, created_at FROM files WHERE uploaded_by = ? AND deleted_at IS NULL AND name LIKE ? ORDER BY is_folder DESC, name ASC').all(userId, likeQuery) as Record<string, unknown>[];
        if (type === 'folder') rows = rows.filter(r => r.is_folder);
        else if (type === 'file') rows = rows.filter(r => !r.is_folder);
        return JSON.stringify({
          success: true,
          query,
          files: rows.map(r => ({
            ...r,
            isFolder: !!r.is_folder,
            sizeText: formatSize(r.size as number),
          })),
          total: rows.length,
        });
      }

      case 'get_file_details': {
        const fileId = args.fileId as number;
        const file = db.prepare('SELECT * FROM files WHERE id = ? AND uploaded_by = ? AND deleted_at IS NULL').get(fileId, userId) as Record<string, unknown> | undefined;
        if (!file) return JSON.stringify({ success: false, error: '文件不存在' });
        return JSON.stringify({
          success: true,
          file: {
            ...file,
            isFolder: !!file.is_folder,
            sizeText: formatSize(file.size as number),
          },
        });
      }

      case 'create_folder': {
        const name = args.name as string;
        const parentId = args.parentId as number | null | undefined;
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const result = db.prepare('INSERT INTO files (name, is_folder, uploaded_by, parent_id, created_at, updated_at, path) VALUES (?, 1, ?, ?, ?, ?, ?)').run(name, userId, parentId || null, now, now, `/${name}`);
        return JSON.stringify({
          success: true,
          folder: { id: result.lastInsertRowid, name, parentId: parentId || null },
          message: `文件夹"${name}"创建成功`,
        });
      }

      case 'delete_file': {
        const fileId = args.fileId as number;
        const file = db.prepare('SELECT name, is_folder FROM files WHERE id = ? AND uploaded_by = ? AND deleted_at IS NULL').get(fileId, userId) as { name: string; is_folder: number } | undefined;
        if (!file) return JSON.stringify({ success: false, error: '文件不存在' });
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        db.prepare('UPDATE files SET deleted_at = ? WHERE id = ? AND uploaded_by = ?').run(now, fileId, userId);
        return JSON.stringify({
          success: true,
          message: `"${file.name}"已移至回收站`,
        });
      }

      case 'rename_file': {
        const fileId = args.fileId as number;
        const newName = args.newName as string;
        const file = db.prepare('SELECT name FROM files WHERE id = ? AND uploaded_by = ? AND deleted_at IS NULL').get(fileId, userId) as { name: string } | undefined;
        if (!file) return JSON.stringify({ success: false, error: '文件不存在' });
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        db.prepare('UPDATE files SET name = ?, updated_at = ? WHERE id = ? AND uploaded_by = ?').run(newName, now, fileId, userId);
        return JSON.stringify({
          success: true,
          message: `"${file.name}"已重命名为"${newName}"`,
        });
      }

      case 'move_file': {
        const fileId = args.fileId as number;
        const targetParentId = args.targetParentId as number | null | undefined;
        const file = db.prepare('SELECT name FROM files WHERE id = ? AND uploaded_by = ? AND deleted_at IS NULL').get(fileId, userId) as { name: string } | undefined;
        if (!file) return JSON.stringify({ success: false, error: '文件不存在' });
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        db.prepare('UPDATE files SET parent_id = ?, updated_at = ? WHERE id = ? AND uploaded_by = ?').run(targetParentId || null, now, fileId, userId);
        const targetName = targetParentId
          ? (db.prepare('SELECT name FROM files WHERE id = ?').get(targetParentId) as { name: string })?.name || '未知'
          : '根目录';
        return JSON.stringify({
          success: true,
          message: `"${file.name}"已移动到"${targetName}"`,
        });
      }

      case 'share_file': {
        const fileId = args.fileId as number;
        const expiryDays = args.expiryDays as number | undefined;
        const file = db.prepare('SELECT name, is_folder, size FROM files WHERE id = ? AND uploaded_by = ? AND deleted_at IS NULL').get(fileId, userId) as { name: string; is_folder: number; size: number } | undefined;
        if (!file) return JSON.stringify({ success: false, error: '文件不存在' });
        const shareCode = Math.random().toString(36).substring(2, 10);
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        let expiresAt: string | null = null;
        if (expiryDays) {
          const d = new Date();
          d.setDate(d.getDate() + expiryDays);
          expiresAt = d.toISOString().replace('T', ' ').slice(0, 19);
        }
        db.prepare('INSERT INTO shares (file_id, file_name, file_size, share_code, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          fileId, file.name, file.size, shareCode, userId, expiresAt, now
        );
        return JSON.stringify({
          success: true,
          shareCode,
          expiresAt,
          message: `"${file.name}"分享链接已创建，提取码: ${shareCode}`,
        });
      }

      case 'list_shares': {
        const shares = db.prepare('SELECT id, file_name, share_code, expires_at, created_at FROM shares WHERE created_by = ? ORDER BY created_at DESC').all(userId);
        return JSON.stringify({
          success: true,
          shares,
          total: (shares as unknown[]).length,
        });
      }

      case 'get_storage_info': {
        const user = db.prepare('SELECT storage_used, storage_quota FROM users WHERE id = ?').get(userId) as { storage_used: number; storage_quota: number } | undefined;
        if (!user) return JSON.stringify({ success: false, error: '用户不存在' });
        return JSON.stringify({
          success: true,
          storageUsed: user.storage_used,
          storageUsedText: formatSize(user.storage_used),
          quota: user.storage_quota,
          quotaText: formatSize(user.storage_quota),
          usagePercent: user.storage_quota > 0 ? Math.round((user.storage_used / user.storage_quota) * 100) : 0,
        });
      }

      case 'get_recent_files': {
        const limit = (args.limit as number) || 10;
        const files = db.prepare('SELECT id, name, is_folder, size, mime_type, updated_at FROM files WHERE uploaded_by = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?').all(userId, limit);
        return JSON.stringify({
          success: true,
          files: (files as Record<string, unknown>[]).map(r => ({
            ...r,
            isFolder: !!r.is_folder,
            sizeText: formatSize(r.size as number),
          })),
        });
      }

      default:
        return JSON.stringify({ success: false, error: `未知工具: ${name}` });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return JSON.stringify({ success: false, error: errorMessage });
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// ============ System Prompt ============
const SYSTEM_PROMPT = `你是一个智能云盘助手，可以帮助用户管理云盘中的文件和文件夹。你可以：

1. 浏览和搜索文件：列出文件、搜索文件、查看文件详情
2. 文件管理：创建文件夹、重命名、移动、删除文件
3. 分享管理：创建分享链接、查看分享列表
4. 存储管理：查看存储空间使用情况、最近文件

重要规则：
- 所有文件操作仅限于当前用户的文件，你无权访问其他用户的文件
- 删除操作会将文件移至回收站，不会永久删除
- 在执行操作前，先确认文件是否存在
- 如果用户意图不明确，先询问确认
- 回复使用中文，简洁清晰
- 显示文件大小时使用人类可读格式（如 1.5 MB）
- 文件列表按 文件夹优先 排序`;

// ============ 主处理逻辑 ============
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export async function POST(request: NextRequest) {
  // 验证用户身份
  const authHeader = request.headers.get('authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return new Response(JSON.stringify({ code: 401, message: '未登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { messages: inputMessages, stream = true } = body;

  if (!inputMessages || !Array.isArray(inputMessages) || inputMessages.length === 0) {
    return new Response(JSON.stringify({ code: 400, message: '消息不能为空' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 构建消息列表
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...inputMessages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  if (stream) {
    return handleStreamingChat(messages, user.userId);
  } else {
    return handleNonStreamingChat(messages, user.userId);
  }
}

// ============ 流式处理（SSE）============
async function handleStreamingChat(messages: ChatMessage[], userId: number) {
  const encoder = new TextEncoder();
  let currentRound = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const currentMessages: ChatMessage[] = [...messages];

      while (currentRound < MAX_TOOL_ROUNDS) {
        currentRound++;

        try {
          const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: MODEL,
              messages: currentMessages,
              tools: TOOLS,
              tool_choice: 'auto',
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            sendEvent('error', { message: `DeepSeek API 错误: ${response.status}`, detail: errorText });
            break;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            sendEvent('error', { message: '无法读取流式响应' });
            break;
          }

          const decoder = new TextDecoder();
          let buffer = '';
          let assistantContent = '';
          const toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];
          let hasToolCalls = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;

                // 处理文本内容
                if (delta.content) {
                  assistantContent += delta.content;
                  sendEvent('content', { text: delta.content });
                }

                // 处理工具调用
                if (delta.tool_calls) {
                  hasToolCalls = true;
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index ?? 0;
                    if (!toolCalls[idx]) {
                      toolCalls[idx] = {
                        id: tc.id || '',
                        type: 'function',
                        function: { name: '', arguments: '' },
                      };
                    }
                    if (tc.id) toolCalls[idx].id = tc.id;
                    if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
                    if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
                  }
                }
              } catch {
                // 忽略解析错误
              }
            }
          }

          // 如果有工具调用，执行并继续循环
          if (hasToolCalls && toolCalls.length > 0) {
            // 发送工具调用信息给前端
            sendEvent('tool_calls', {
              calls: toolCalls.map(tc => ({
                name: tc.function.name,
                arguments: tc.function.arguments,
              })),
            });

            // 将 assistant 消息（含 tool_calls）加入消息列表
            currentMessages.push({
              role: 'assistant',
              content: assistantContent || null,
              tool_calls: toolCalls,
            });

            // 执行每个工具调用
            for (const tc of toolCalls) {
              let toolArgs: Record<string, unknown>;
              try {
                toolArgs = JSON.parse(tc.function.arguments);
              } catch {
                toolArgs = {};
              }

              const result = executeTool(tc.function.name, toolArgs, userId);

              // 发送工具结果给前端
              let parsedResult: unknown;
              try {
                parsedResult = JSON.parse(result);
              } catch {
                parsedResult = result;
              }
              sendEvent('tool_result', {
                name: tc.function.name,
                result: parsedResult,
              });

              // 将工具结果加入消息列表
              currentMessages.push({
                role: 'tool',
                content: result,
                tool_call_id: tc.id,
              });
            }

            // 继续下一轮对话
            continue;
          }

          // 没有工具调用，对话结束
          break;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '未知错误';
          sendEvent('error', { message: errorMessage });
          break;
        }
      }

      sendEvent('done', { rounds: currentRound });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ============ 非流式处理 ============
async function handleNonStreamingChat(messages: ChatMessage[], userId: number) {
  const currentMessages: ChatMessage[] = [...messages];
  let currentRound = 0;

  while (currentRound < MAX_TOOL_ROUNDS) {
    currentRound++;

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: currentMessages,
          tools: TOOLS,
          tool_choice: 'auto',
        }),
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ code: 500, message: `DeepSeek API 错误: ${response.status}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) break;

      const assistantMessage = choice.message;

      // 如果有工具调用
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        currentMessages.push(assistantMessage as ChatMessage);

        for (const tc of assistantMessage.tool_calls) {
          let toolArgs: Record<string, unknown>;
          try {
            toolArgs = JSON.parse(tc.function.arguments);
          } catch {
            toolArgs = {};
          }

          const result = executeTool(tc.function.name, toolArgs, userId);
          currentMessages.push({
            role: 'tool',
            content: result,
            tool_call_id: tc.id,
          });
        }

        continue;
      }

      // 返回最终回复
      return new Response(JSON.stringify({
        code: 200,
        data: {
          content: assistantMessage.content,
          rounds: currentRound,
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      return new Response(JSON.stringify({ code: 500, message: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ code: 500, message: '工具调用轮数超限' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
