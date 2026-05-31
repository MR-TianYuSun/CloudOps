'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Play, Clock, Globe, Lock, Plus, Search, Download, Upload, ChevronRight, X, FileText, Code, Workflow, Sparkles, Copy, Check, Trash2, Edit3, Eye } from 'lucide-react';

interface Skill {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  config: string;
  file_id: number | null;
  file_name: string | null;
  is_public: number;
  created_by: number;
  creator_name: string | null;
  created_at: string;
  updated_at: string;
}

interface SkillRun {
  id: number;
  skill_id: number;
  input: string;
  output: string;
  status: string;
  created_at: string;
}

type TabType = 'mine' | 'discover' | 'history';
type ViewType = 'list' | 'create' | 'edit' | 'run' | 'detail';

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  prompt: { label: '提示词', icon: Sparkles, color: 'text-purple-400' },
  script: { label: '脚本', icon: Code, color: 'text-green-400' },
  automation: { label: '自动化', icon: Workflow, color: 'text-blue-400' },
  general: { label: '通用', icon: Zap, color: 'text-yellow-400' },
};

export default function SkillPlatformApp({ windowId }: { windowId: string }) {
  const [activeTab, setActiveTab] = useState<TabType>('mine');
  const [view, setView] = useState<ViewType>('list');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [history, setHistory] = useState<SkillRun[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // Create/Edit form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('⚡');
  const [formCategory, setFormCategory] = useState('prompt');
  const [formConfig, setFormConfig] = useState('');
  const [formPublic, setFormPublic] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Run
  const [runInput, setRunInput] = useState('');
  const [runOutput, setRunOutput] = useState('');
  const [runStreaming, setRunStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';

  const fetchSkills = useCallback(async (scope?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (scope) params.set('scope', scope);
      if (search) params.set('search', search);
      const res = await fetch(`/api/skills?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) setSkills(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, search]);

  const fetchHistory = useCallback(async () => {
    try {
      // Get recent runs across all skills
      const res = await fetch('/api/skills?scope=mine', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200 && data.data?.length > 0) {
        // Fetch runs for each skill (most recent first)
        const allRuns: SkillRun[] = [];
        for (const skill of data.data.slice(0, 10)) {
          const runRes = await fetch(`/api/skills/${skill.id}/runs`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const runData = await runRes.json();
          if (runData.code === 200) {
            allRuns.push(...(runData.data || []));
          }
        }
        allRuns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setHistory(allRuns.slice(0, 50));
      }
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'mine') fetchSkills('mine');
    else if (activeTab === 'discover') fetchSkills('public');
    else if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchSkills, fetchHistory]);

  // --- Handlers ---

  const handleCreate = () => {
    setFormName(''); setFormDesc(''); setFormIcon('⚡');
    setFormCategory('prompt');
    setFormConfig(getDefaultConfig('prompt'));
    setFormPublic(false); setEditingId(null);
    setView('create');
  };

  const handleEdit = (skill: Skill) => {
    setFormName(skill.name); setFormDesc(skill.description); setFormIcon(skill.icon);
    setFormCategory(skill.category);
    setFormConfig(typeof skill.config === 'string' ? skill.config : JSON.stringify(skill.config, null, 2));
    setFormPublic(skill.is_public === 1); setEditingId(skill.id);
    setView('edit');
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const body = {
      name: formName,
      description: formDesc,
      icon: formIcon,
      category: formCategory,
      config: JSON.parse(formConfig || '{}'),
      isPublic: formPublic,
    };
    try {
      const url = editingId ? `/api/skills/${editingId}` : '/api/skills';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchSkills(activeTab === 'discover' ? 'public' : 'mine');
        setView('list');
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此Skill吗？')) return;
    await fetch(`/api/skills/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchSkills(activeTab === 'discover' ? 'public' : 'mine');
  };

  const handleRunStart = (skill: Skill) => {
    setSelectedSkill(skill);
    setRunInput('');
    setRunOutput('');
    setView('run');
  };

  const handleRunExecute = async () => {
    if (!selectedSkill || runStreaming) return;
    setRunStreaming(true);
    setRunOutput('');
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/skills/${selectedSkill.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ input: runInput }),
        signal: abortRef.current.signal,
      });

      const contentType = res.headers.get('Content-Type') || '';

      if (contentType.includes('text/event-stream')) {
        // Streaming response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) { setRunStreaming(false); return; }

        let fullOutput = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullOutput += parsed.content;
                  setRunOutput(fullOutput);
                }
                if (parsed.error) {
                  fullOutput += `\n\n❌ Error: ${parsed.error}`;
                  setRunOutput(fullOutput);
                }
              } catch {
                // Plain text chunk
                fullOutput += data;
                setRunOutput(fullOutput);
              }
            }
          }
        }
      } else {
        // JSON response
        const data = await res.json();
        if (data.code === 200) {
          setRunOutput(data.data?.result || '执行完成（无输出）');
        } else {
          setRunOutput(`❌ ${data.message || '执行失败'}`);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setRunOutput(`❌ 执行出错: ${err instanceof Error ? err.message : String(err)}`);
    }
    setRunStreaming(false);
  };

  const handleStopRun = () => {
    abortRef.current?.abort();
    setRunStreaming(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (skill: Skill) => {
    const res = await fetch(`/api/skills/${skill.id}?export=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${skill.name}.skill.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const skillData = JSON.parse(text);
        const res = await fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'import', skillData }),
        });
        const data = await res.json();
        if (data.code === 200) {
          fetchSkills('mine');
          alert('Skill导入成功！');
        } else {
          alert(data.message || '导入失败');
        }
      } catch {
        alert('文件格式无效');
      }
    };
    input.click();
  };

  const handleViewDetail = (skill: Skill) => {
    setSelectedSkill(skill);
    setView('detail');
  };

  // --- Helpers ---

  function getDefaultConfig(category: string): string {
    switch (category) {
      case 'prompt':
        return JSON.stringify({ template: '请根据以下输入完成任务：\n\n{{input}}', model: 'doubao-seed-2-0-lite-260215' }, null, 2);
      case 'script':
        return JSON.stringify({ code: '// 输入参数: input\n// 输出: return 结果\nconst result = input;\nreturn result;' }, null, 2);
      case 'automation':
        return JSON.stringify({
          steps: [
            { name: '步骤1', type: 'input', description: '接收输入' },
            { name: '步骤2', type: 'process', description: '处理数据' },
            { name: '步骤3', type: 'output', description: '输出结果' },
          ],
        }, null, 2);
      default:
        return '{}';
    }
  }

  const getCategoryInfo = (cat: string) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;

  // --- Render ---

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-[#e6edf3]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="font-semibold text-base">Skill Platform</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleImport} className="p-1.5 rounded-md hover:bg-white/10 transition" title="导入Skill">
            <Upload className="w-4 h-4" />
          </button>
          <button onClick={handleCreate} className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-md hover:bg-yellow-500/30 transition text-sm">
            <Plus className="w-3.5 h-3.5" /> 创建
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(['mine', 'discover', 'history'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setView('list'); }}
            className={`flex-1 px-3 py-2 text-sm font-medium transition ${
              activeTab === tab ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'mine' ? '我的' : tab === 'discover' ? '发现' : '历史'}
          </button>
        ))}
      </div>

      {/* Search */}
      {view === 'list' && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索Skill..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {view === 'list' && renderList()}
        {view === 'create' && renderForm()}
        {view === 'edit' && renderForm()}
        {view === 'run' && renderRun()}
        {view === 'detail' && renderDetail()}
      </div>
    </div>
  );

  function renderList() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <div className="animate-spin w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full mr-2" />
          加载中...
        </div>
      );
    }

    if (activeTab === 'history') {
      if (history.length === 0) {
        return <div className="text-center py-12 text-gray-500">暂无执行历史</div>;
      }
      return (
        <div className="space-y-2">
          {history.map((run) => (
            <div key={run.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Skill #{run.skill_id}</span>
                <span className="text-xs text-gray-500">{new Date(run.created_at).toLocaleString()}</span>
              </div>
              <div className="text-sm text-gray-300 mb-1 line-clamp-1">
                <span className="text-gray-500">输入: </span>{run.input || '(空)'}
              </div>
              <div className="text-sm line-clamp-2">
                <span className="text-gray-500">输出: </span>
                <span className={run.status === 'error' ? 'text-red-400' : 'text-green-300'}>
                  {run.output || '(空)'}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (skills.length === 0) {
      return (
        <div className="text-center py-12">
          <Zap className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">
            {activeTab === 'discover' ? '暂无公共Skill' : '你还没有创建任何Skill'}
          </p>
          {activeTab === 'mine' && (
            <button onClick={handleCreate} className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition text-sm">
              创建第一个Skill
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {skills.map((skill) => {
          const catInfo = getCategoryInfo(skill.category);
          const CatIcon = catInfo.icon;
          const isOwner = skill.created_by === Number(localStorage.getItem('userId') || '0');

          return (
            <div
              key={skill.id}
              className="group p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition cursor-pointer"
              onClick={() => handleViewDetail(skill)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg shrink-0">
                  {skill.icon || '⚡'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{skill.name}</span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 ${catInfo.color}`}>
                      <CatIcon className="w-2.5 h-2.5" /> {catInfo.label}
                    </span>
                    {skill.is_public ? (
                      <Globe className="w-3 h-3 text-blue-400" />
                    ) : (
                      <Lock className="w-3 h-3 text-gray-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{skill.description || '无描述'}</p>
                  {skill.creator_name && !isOwner && (
                    <p className="text-[10px] text-gray-500 mt-1">by {skill.creator_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleRunStart(skill); }} className="p-1.5 rounded hover:bg-green-500/20 text-green-400" title="运行">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  {isOwner && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(skill); }} className="p-1.5 rounded hover:bg-blue-500/20 text-blue-400" title="编辑">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleExport(skill); }} className="p-1.5 rounded hover:bg-purple-500/20 text-purple-400" title="导出">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(skill.id); }} className="p-1.5 rounded hover:bg-red-500/20 text-red-400" title="删除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {!isOwner && (
                    <button onClick={(e) => { e.stopPropagation(); handleExport(skill); }} className="p-1.5 rounded hover:bg-purple-500/20 text-purple-400" title="导出">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderForm() {
    const isEdit = view === 'edit';
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-white transition">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <h3 className="font-medium text-sm">{isEdit ? '编辑Skill' : '创建Skill'}</h3>
        </div>

        {/* Icon + Name */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              value={formIcon}
              onChange={(e) => setFormIcon(e.target.value)}
              className="w-12 h-12 text-2xl text-center bg-white/10 rounded-lg border border-white/10 focus:border-yellow-400/50 outline-none"
              maxLength={2}
            />
          </div>
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Skill名称"
            className="flex-1 px-3 py-2.5 bg-white/5 rounded-lg border border-white/10 focus:border-yellow-400/50 outline-none text-sm placeholder:text-gray-500"
          />
        </div>

        {/* Description */}
        <textarea
          value={formDesc}
          onChange={(e) => setFormDesc(e.target.value)}
          placeholder="描述这个Skill的用途..."
          rows={2}
          className="w-full px-3 py-2 bg-white/5 rounded-lg border border-white/10 focus:border-yellow-400/50 outline-none text-sm placeholder:text-gray-500 resize-none"
        />

        {/* Category */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">类型</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== 'general').map(([key, info]) => {
              const Icon = info.icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setFormCategory(key);
                    if (!isEdit) setFormConfig(getDefaultConfig(key));
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition ${
                    formCategory === key
                      ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Config */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">配置 (JSON)</label>
          <textarea
            value={formConfig}
            onChange={(e) => setFormConfig(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 bg-black/30 rounded-lg border border-white/10 focus:border-yellow-400/50 outline-none text-xs font-mono placeholder:text-gray-500 resize-y"
            spellCheck={false}
          />
        </div>

        {/* Public toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm">公开到发现市场</span>
            <p className="text-xs text-gray-500">其他用户可以发现和使用此Skill</p>
          </div>
          <button
            onClick={() => setFormPublic(!formPublic)}
            className={`w-10 h-5 rounded-full transition ${formPublic ? 'bg-yellow-400' : 'bg-white/20'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${formPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button onClick={() => setView('list')} className="flex-1 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/15 transition text-sm">
            取消
          </button>
          <button onClick={handleSave} disabled={!formName.trim()} className="flex-1 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition text-sm font-medium disabled:opacity-50">
            {isEdit ? '保存' : '创建'}
          </button>
        </div>
      </div>
    );
  }

  function renderRun() {
    if (!selectedSkill) return null;
    const catInfo = getCategoryInfo(selectedSkill.category);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => { setView('list'); setRunOutput(''); }} className="text-gray-400 hover:text-white transition">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <span className="text-lg">{selectedSkill.icon}</span>
          <h3 className="font-medium text-sm">{selectedSkill.name}</h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded bg-white/10 ${catInfo.color}`}>{catInfo.label}</span>
        </div>

        <p className="text-xs text-gray-400">{selectedSkill.description}</p>

        {/* Input */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">输入内容</label>
          <textarea
            value={runInput}
            onChange={(e) => setRunInput(e.target.value)}
            placeholder={
              selectedSkill.category === 'prompt' ? '输入你要处理的内容...' :
              selectedSkill.category === 'script' ? '输入脚本参数...' :
              '输入工作流参数...'
            }
            rows={4}
            className="w-full px-3 py-2 bg-white/5 rounded-lg border border-white/10 focus:border-yellow-400/50 outline-none text-sm placeholder:text-gray-500 resize-none"
            disabled={runStreaming}
          />
        </div>

        {/* Run button */}
        <div className="flex gap-2">
          {!runStreaming ? (
            <button onClick={handleRunExecute} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-sm font-medium">
              <Play className="w-4 h-4" /> 运行
            </button>
          ) : (
            <button onClick={handleStopRun} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm font-medium">
              <X className="w-4 h-4" /> 停止
            </button>
          )}
        </div>

        {/* Output */}
        {runOutput && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">输出结果</label>
              <button onClick={() => handleCopy(runOutput)} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <div className="p-3 bg-black/40 rounded-lg border border-white/10 text-sm whitespace-pre-wrap max-h-80 overflow-y-auto font-mono text-xs leading-relaxed">
              {runStreaming && !runOutput ? (
                <span className="text-gray-500 animate-pulse">思考中...</span>
              ) : (
                runOutput
              )}
              {runStreaming && <span className="animate-pulse text-yellow-400">▊</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderDetail() {
    if (!selectedSkill) return null;
    const catInfo = getCategoryInfo(selectedSkill.category);
    const CatIcon = catInfo.icon;
    const isOwner = selectedSkill.created_by === Number(localStorage.getItem('userId') || '0');
    let parsedConfig: Record<string, unknown> = {};
    try { parsedConfig = typeof selectedSkill.config === 'string' ? JSON.parse(selectedSkill.config) : (selectedSkill.config as Record<string, unknown>); } catch { /* ignore */ }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-white transition">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <span className="text-2xl">{selectedSkill.icon}</span>
          <div>
            <h3 className="font-medium text-sm">{selectedSkill.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CatIcon className={`w-3 h-3 ${catInfo.color}`} />
              <span className={`text-[10px] ${catInfo.color}`}>{catInfo.label}</span>
              {selectedSkill.is_public ? (
                <Globe className="w-3 h-3 text-blue-400" />
              ) : (
                <Lock className="w-3 h-3 text-gray-500" />
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-300">{selectedSkill.description || '无描述'}</p>

        {selectedSkill.creator_name && !isOwner && (
          <p className="text-xs text-gray-500">创建者: {selectedSkill.creator_name}</p>
        )}

        {/* Config preview */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">配置</label>
          <div className="p-3 bg-black/30 rounded-lg border border-white/10 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
            {JSON.stringify(parsedConfig, null, 2)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => handleRunStart(selectedSkill)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-sm font-medium">
            <Play className="w-4 h-4" /> 运行
          </button>
          {isOwner && (
            <button onClick={() => handleEdit(selectedSkill)} className="px-4 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition text-sm">
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => handleExport(selectedSkill)} className="px-4 py-2.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition text-sm">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
}
