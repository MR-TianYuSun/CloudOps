'use client';

import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';

export default function TerminalApp({ windowId }: { windowId: string }) {
  const [history, setHistory] = useState<string[]>([
    'CloudOps Terminal v2.0',
    '输入 help 查看可用命令',
    '',
  ]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const commands: Record<string, (...args: string[]) => string> = {
    help: () => '可用命令: help, ls, pwd, echo, clear, date, whoami, uname',
    ls: () => 'Desktop/  Documents/  Downloads/  Pictures/  Music/',
    pwd: () => '/home/cloudops',
    echo: (...args) => args.join(' '),
    clear: () => { setHistory([]); return ''; },
    date: () => new Date().toLocaleString('zh-CN'),
    whoami: () => 'cloudops',
    uname: () => 'CloudOS 2.0 x86_64',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const parts = input.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    setHistory(prev => [...prev, `$ ${input}`]);
    setCmdHistory(prev => [...prev, input]);
    setHistoryIndex(-1);

    if (commands[cmd]) {
      const result = commands[cmd](...args);
      if (result) setHistory(prev => [...prev, result]);
    } else {
      setHistory(prev => [...prev, `命令未找到: ${cmd}. 输入 help 查看可用命令`]);
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, cmdHistory.length - 1);
      if (newIndex >= 0) {
        setHistoryIndex(newIndex);
        setInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? '' : cmdHistory[cmdHistory.length - 1 - newIndex]);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col bg-[#0a0c14] font-mono text-xs"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto p-3">
        {history.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap text-foreground/80 leading-relaxed">
            {line}
          </div>
        ))}
        <form onSubmit={handleSubmit} className="flex items-center gap-1 mt-1">
          <span className="text-primary">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-foreground/90 focus:outline-none caret-primary"
            autoFocus
          />
        </form>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
