'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Folder, File, Trash2, Share2, Wrench, ChevronDown, ChevronUp } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; arguments: string }>;
  toolResults?: Array<{ name: string; result: Record<string, unknown> }>;
  isStreaming?: boolean;
}

interface Props {
  windowId: string;
}

export default function AIAssistantApp({ windowId: _windowId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 添加空的助手消息用于流式填充
    const assistantMessage: Message = { role: 'assistant', content: '', isStreaming: true };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const token = localStorage.getItem('token');
      const chatMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: chatMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `请求失败: ${response.status}`,
            isStreaming: false,
          };
          return updated;
        });
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: '无法读取响应流',
            isStreaming: false,
          };
          return updated;
        });
        setIsLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let toolCalls: Array<{ name: string; arguments: string }> = [];
      const toolResults: Array<{ name: string; result: Record<string, unknown> }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('event: ') && !line.startsWith('data: ')) continue;

          // 解析 SSE 事件
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            // 下一个 data 行是内容
            continue;
          }

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            let parsed: { text?: string; calls?: Array<{ name: string; arguments: string }>; name?: string; result?: Record<string, unknown>; message?: string };
            try {
              parsed = JSON.parse(dataStr);
            } catch {
              continue;
            }

            // 需要根据前一个 event 行判断类型，简化处理：通过字段判断
            if ('text' in parsed && parsed.text) {
              fullContent += parsed.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullContent,
                  isStreaming: true,
                };
                return updated;
              });
            } else if ('calls' in parsed && parsed.calls) {
              toolCalls = parsed.calls;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  toolCalls,
                };
                return updated;
              });
            } else if ('name' in parsed && 'result' in parsed && parsed.result) {
              toolResults.push({ name: parsed.name!, result: parsed.result });
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  toolResults: [...toolResults],
                };
                return updated;
              });
            }
          }
        }
      }

      // 流式结束
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          isStreaming: false,
        };
        return updated;
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `出错了: ${err instanceof Error ? err.message : '未知错误'}`,
          isStreaming: false,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">AI 云盘助手</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">DeepSeek</span>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
        >
          清空对话
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Bot className="w-12 h-12 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">你好，我是 AI 云盘助手</p>
              <p className="text-xs mt-1 opacity-60">我可以帮你管理云盘文件，试试对我说：</p>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {[
                '查看我的文件',
                '搜索关于项目的文件',
                '帮我创建一个"工作文档"文件夹',
                '查看存储空间使用情况',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(suggestion); }}
                  className="text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {isLoading && messages[messages.length - 1]?.isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs pl-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>思考中...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="border-t border-border p-3 bg-card">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，回车发送..."
            rows={1}
            className="flex-1 resize-none rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">
          AI 助手基于 DeepSeek，可能会产生不准确的信息
        </p>
      </div>
    </div>
  );
}

// ============ 消息气泡组件 ============
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 头像 */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-muted' : 'bg-primary/15'}`}>
        {isUser ? <User className="w-3.5 h-3.5 text-muted-foreground" /> : <Bot className="w-3.5 h-3.5 text-primary" />}
      </div>

      {/* 内容 */}
      <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* 工具调用显示 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallsDisplay calls={message.toolCalls} results={message.toolResults} />
        )}

        {/* 文本内容 */}
        {message.content && (
          <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted/50 text-foreground rounded-tl-sm'
          }`}>
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ 工具调用展示 ============
function ToolCallsDisplay({ calls, results }: {
  calls: Array<{ name: string; arguments: string }>;
  results?: Array<{ name: string; result: Record<string, unknown> }>;
}) {
  const [expanded, setExpanded] = useState(false);

  const toolIconMap: Record<string, React.ReactNode> = {
    list_files: <Folder className="w-3 h-3" />,
    search_files: <Folder className="w-3 h-3" />,
    get_file_details: <File className="w-3 h-3" />,
    create_folder: <Folder className="w-3 h-3" />,
    delete_file: <Trash2 className="w-3 h-3" />,
    rename_file: <File className="w-3 h-3" />,
    move_file: <File className="w-3 h-3" />,
    share_file: <Share2 className="w-3 h-3" />,
    list_shares: <Share2 className="w-3 h-3" />,
    get_storage_info: <Folder className="w-3 h-3" />,
    get_recent_files: <File className="w-3 h-3" />,
  };

  const toolNameMap: Record<string, string> = {
    list_files: '列出文件',
    search_files: '搜索文件',
    get_file_details: '文件详情',
    create_folder: '创建文件夹',
    delete_file: '删除文件',
    rename_file: '重命名',
    move_file: '移动文件',
    share_file: '创建分享',
    list_shares: '分享列表',
    get_storage_info: '存储信息',
    get_recent_files: '最近文件',
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors bg-muted/30 rounded-lg px-2.5 py-1.5 w-full text-left"
      >
        <Wrench className="w-3 h-3" />
        <span>使用了 {calls.length} 个工具</span>
        {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1.5 pl-1">
          {calls.map((call, i) => {
            const result = results?.find(r => r.name === call.name);
            const isSuccess = result?.result && typeof result.result === 'object' && 'success' in result.result && result.result.success;

            return (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                <span className={isSuccess ? 'text-emerald-500' : 'text-muted-foreground'}>
                  {toolIconMap[call.name] || <Wrench className="w-3 h-3" />}
                </span>
                <span className="text-foreground/80">{toolNameMap[call.name] || call.name}</span>
                {(() => {
                  try {
                    const args = JSON.parse(call.arguments);
                    const desc = args.query || args.name || args.fileId || args.parentId;
                    return desc ? <span className="text-muted-foreground">({String(desc)})</span> : null;
                  } catch {
                    return null;
                  }
                })()}
                <span className={isSuccess ? 'text-emerald-500' : 'text-muted-foreground'}>
                  {isSuccess ? '✓' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
