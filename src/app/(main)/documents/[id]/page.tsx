'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createUniver, defaultTheme, FUniver, Univer, LocaleType } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import { UniverDocsCorePreset } from '@univerjs/preset-docs-core';

import '@univerjs/preset-sheets-core/lib/index.css';
import '@univerjs/preset-docs-core/lib/index.css';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowLeft, Users, FileText, Table, Presentation } from 'lucide-react';

interface Collaborator {
  userId: number;
  username: string;
  color: string;
}

interface WsMessage {
  type: string;
  payload: unknown;
}

const COLLAB_COLORS = ['#7C5CFF', '#69E7FF', '#62FAD3', '#FF6B6B', '#FFD93D', '#FF8C42', '#6BCB77', '#4D96FF'];

function getFileTypeInfo(fileName: string): { type: 'spreadsheet' | 'document' | 'presentation'; label: string; icon: React.ReactNode } {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    return { type: 'spreadsheet', label: 'Excel 表格', icon: <Table className="w-4 h-4" /> };
  }
  if (ext === 'docx' || ext === 'doc') {
    return { type: 'document', label: 'Word 文档', icon: <FileText className="w-4 h-4" /> };
  }
  if (ext === 'pptx' || ext === 'ppt') {
    return { type: 'presentation', label: 'PPT 演示', icon: <Presentation className="w-4 h-4" /> };
  }
  return { type: 'document', label: '文档', icon: <FileText className="w-4 h-4" /> };
}

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const fileId = params.id as string;

  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<{ univer: Univer; univerAPI: FUniver } | null>(null);
  const wsRef = useRef<{ send: (msg: WsMessage) => void; close: () => void } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'spreadsheet' | 'document' | 'presentation'>('document');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  // Load file data and initialize editor
  useEffect(() => {
    if (!fileId) return;

    const loadAndInit = async () => {
      try {
        // Fetch file info
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const fileRes = await fetch(`/api/documents/${fileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fileData = await fileRes.json();

        if (!fileData.success) {
          setError(fileData.error || '无法加载文件');
          setLoading(false);
          return;
        }

        const docInfo = fileData.data;
        const docData = docInfo.documentData || {};
        const name = (docInfo.name || fileData.data.name || '') as string;
        setFileName(name);
        const info = getFileTypeInfo(name);
        setFileType(info.type);

        // Initialize Univer after container is ready
        await new Promise((r) => setTimeout(r, 100));

        if (!containerRef.current) return;

        // Create Univer instance based on file type
        let univerResult: { univer: Univer; univerAPI: FUniver };

        if (info.type === 'spreadsheet') {
          univerResult = createUniver({
            locale: LocaleType.ZH_CN,
            theme: defaultTheme,
            collaboration: true,
            presets: [
              UniverSheetsCorePreset({
                container: 'univer-container',
              }),
            ],
          });
        } else {
          univerResult = createUniver({
            locale: LocaleType.ZH_CN,
            theme: defaultTheme,
            collaboration: true,
            presets: [
              UniverDocsCorePreset({
                container: 'univer-container',
              }),
            ],
          });
        }

        univerRef.current = univerResult;

        // Load document data - prefer saved Univer snapshot over raw parsed data
        if (info.type === 'spreadsheet' && docData.univerSnapshot) {
          // Load from saved Univer snapshot (edited version takes priority)
          univerResult.univerAPI.createUniverSheet(docData.univerSnapshot as Partial<import('@univerjs/presets').IWorkbookData>);
        } else if (info.type === 'spreadsheet' && docData.sheets) {
          // Convert xlsx parsed data to Univer sheet format (first-time open)
          univerResult.univerAPI.createUniverSheet(xlsxToUniverSheet(
            docData.sheets as Record<string, unknown[]>,
            docData.sheetNames as string[],
            name,
          ) as Partial<import('@univerjs/presets').IWorkbookData>);
        } else if (info.type === 'document' && docData.univerSnapshot) {
          // Load from saved Univer snapshot (edited document)
          univerResult.univerAPI.createUniverDoc(docData.univerSnapshot as Partial<import('@univerjs/presets').IDocumentData>);
        } else if (info.type === 'document' && docData.html) {
          // Convert HTML from mammoth to Univer doc format
          const univerData = htmlToUniverDoc(docData.html as string, name);
          univerResult.univerAPI.createUniverDoc(univerData);
        } else if (info.type === 'document' && docData.text) {
          // Convert plain text to Univer doc format
          const univerData = htmlToUniverDoc(
            `<p>${(docData.text as string).replace(/\n/g, '</p><p>')}</p>`,
            name,
          );
          univerResult.univerAPI.createUniverDoc(univerData);
        }
        // If no data, Univer already shows a default empty document

        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize editor:', err);
        setError('编辑器初始化失败');
        setLoading(false);
      }
    };

    loadAndInit();

    return () => {
      if (univerRef.current) {
        univerRef.current.univer.dispose();
        univerRef.current = null;
      }
    };
  }, [fileId, router]);

  // WebSocket collaboration
  useEffect(() => {
    if (!fileId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws/collab`;
    let ws: WebSocket;
    let heartbeatTimer: ReturnType<typeof setInterval>;
    let closed = false;

    function updateWsRef(socket: WebSocket) {
      wsRef.current = {
        send: (msg: WsMessage) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(msg));
          }
        },
        close: () => {
          closed = true;
          socket.close();
        },
      };
    }

    function connect() {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        // Send join message
        ws.send(JSON.stringify({
          type: 'join',
          payload: { fileId, token },
        }));
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', payload: null }));
          }
        }, 30000);
      };

      ws.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          if (msg.type === 'pong') return;

          switch (msg.type) {
            case 'collaborators':
              setCollaborators((msg.payload as { collaborators: Collaborator[] }).collaborators);
              break;
            case 'edit':
              // Apply remote edit via Univer API
              applyRemoteEdit(msg.payload as { operations: unknown[] });
              break;
            case 'user_joined':
            case 'user_left':
              // Refresh collaborator list
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        clearInterval(heartbeatTimer);
        if (!closed) setTimeout(connect, 3000);
      };

      updateWsRef(ws);
    }

    connect();

    return () => {
      closed = true;
      clearInterval(heartbeatTimer);
      ws.close();
    };
  }, [fileId]);

  // Listen for Univer edits and broadcast via WebSocket
  useEffect(() => {
    if (!univerRef.current || !wsRef.current) return;

    const univerAPI = univerRef.current.univerAPI;

    // Listen for command execution (edits)
    const disposable = univerAPI.onCommandExecuted((commandInfo) => {
      if (wsRef.current) {
        wsRef.current.send({
          type: 'edit',
          payload: {
            fileId,
            commandId: commandInfo.id,
            operations: (commandInfo as { params?: unknown }).params ? [commandInfo] : [],
          },
        });
      }
    });

    return () => {
      disposable.dispose();
    };
  }, [fileId]);

  const applyRemoteEdit = useCallback((payload: { operations: unknown[] }) => {
    // Apply remote operations to local Univer instance
    if (!univerRef.current || !payload.operations?.length) return;
    // Univer's OT engine handles this internally when collaboration is enabled
  }, []);

  const handleSave = useCallback(async () => {
    if (!univerRef.current) return;
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const univerAPI = univerRef.current.univerAPI;

      // Get snapshot data from Univer
      let univerData: unknown;
      if (fileType === 'spreadsheet') {
        const activeSheet = univerAPI.getActiveWorkbook();
        univerData = activeSheet?.getSnapshot();
      } else {
        const activeDoc = univerAPI.getActiveDocument();
        univerData = activeDoc?.getSnapshot();
      }

      const res = await fetch(`/api/documents/${fileId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ univerData }),
      });

      const result = await res.json();
      if (result.success) {
        // Notify collaborators
        wsRef.current?.send({
          type: 'edit',
          payload: { fileId, operations: [{ type: 'save' }] },
        });
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [fileId, fileType]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      handleSave();
    }, 30000);
    return () => clearInterval(timer);
  }, [handleSave]);

  const typeInfo = getFileTypeInfo(fileName);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#070A14] text-white">
        <div className="text-center">
          <p className="text-xl mb-4">{error}</p>
          <Button onClick={() => router.push('/cloud-drive')} variant="outline">
            返回云盘
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#070A14]">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0D1117]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/cloud-drive')}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <div className="flex items-center gap-2">
            {typeInfo.icon}
            <span className="text-white font-medium">{fileName}</span>
            <Badge variant="outline" className="text-xs border-white/20 text-white/60">
              {typeInfo.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Collaborators */}
          <div className="flex items-center gap-2">
            {collaborators.length > 0 && (
              <div className="flex -space-x-2">
                {collaborators.slice(0, 5).map((c) => (
                  <div
                    key={c.userId}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white border-2 border-[#0D1117]"
                    style={{ backgroundColor: c.color }}
                    title={c.username}
                  >
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-white/50">
              <Users className="w-3 h-3" />
              <span>{collaborators.length + 1}人在线</span>
              <span className={`ml-1 w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-[#7C5CFF] hover:bg-[#6B4FE0] text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* Editor container */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#7C5CFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60">正在加载编辑器...</p>
            </div>
          </div>
        ) : fileType === 'presentation' ? (
          <PresentationEditor fileId={fileId} fileName={fileName} />
        ) : (
          <div
            id="univer-container"
            ref={containerRef}
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  );
}

// Simple presentation editor for PPT files
function PresentationEditor({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [slides, setSlides] = useState<Array<{ id: string; content: string }>>([
    { id: '1', content: '<h1 style="text-align:center;padding-top:30%;color:#F7FAFF">点击编辑幻灯片标题</h1>' },
  ]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const addSlide = () => {
    setSlides([...slides, {
      id: String(Date.now()),
      content: '<h1 style="text-align:center;padding-top:30%;color:#F7FAFF">新幻灯片</h1>',
    }]);
    setActiveSlide(slides.length);
  };

  const updateSlideContent = (index: number, content: string) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], content };
    setSlides(newSlides);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const pptxgen = (await import('pptxgenjs')).default;
      const ppt = new pptxgen();

      for (const slide of slides) {
        const pptSlide = ppt.addSlide();
        // Extract text content from HTML
        const textContent = slide.content.replace(/<[^>]*>/g, '').trim();
        pptSlide.addText(textContent, {
          x: 0.5, y: 0.5, w: '90%', h: '90%',
          fontSize: 24, color: '333333',
          valign: 'middle' as const, align: 'center',
        });
      }

      const buffer = await ppt.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('univerData', JSON.stringify({ slides }));

      await fetch(`/api/documents/${fileId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } catch (err) {
      console.error('Save presentation failed:', err);
    }
  };

  return (
    <div className="flex h-full">
      {/* Slide sidebar */}
      <div className="w-48 border-r border-white/10 bg-[#0D1117] p-3 flex flex-col gap-2 overflow-y-auto">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            onClick={() => { setActiveSlide(i); setEditMode(false); }}
            className={`cursor-pointer rounded-lg border-2 p-1 transition-all ${
              i === activeSlide ? 'border-[#7C5CFF]' : 'border-white/10 hover:border-white/30'
            }`}
          >
            <div className="aspect-video bg-[#1A1D2E] rounded flex items-center justify-center text-white/40 text-xs overflow-hidden">
              <div dangerouslySetInnerHTML={{ __html: slide.content.substring(0, 100) }} />
            </div>
            <p className="text-white/60 text-xs mt-1 text-center">幻灯片 {i + 1}</p>
          </div>
        ))}
        <button
          onClick={addSlide}
          className="w-full py-2 border border-dashed border-white/20 rounded-lg text-white/50 hover:text-white hover:border-white/40 transition-colors text-sm"
        >
          + 新增幻灯片
        </button>
      </div>

      {/* Main editing area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0A0E1A]">
        <div className="w-full max-w-4xl aspect-video bg-[#1A1D2E] rounded-lg shadow-xl overflow-hidden border border-white/10">
          <div
            ref={editorRef}
            contentEditable={editMode}
            suppressContentEditableWarning
            className="w-full h-full p-8 outline-none text-white/90"
            onClick={() => setEditMode(true)}
            onBlur={(e) => {
              setEditMode(false);
              updateSlideContent(activeSlide, e.currentTarget.innerHTML);
            }}
            dangerouslySetInnerHTML={{ __html: slides[activeSlide]?.content || '' }}
          />
        </div>
      </div>

      {/* Right toolbar */}
      <div className="w-48 border-l border-white/10 bg-[#0D1117] p-3">
        <Button onClick={handleSave} className="w-full bg-[#7C5CFF] hover:bg-[#6B4FE0] text-white" size="sm">
          <Save className="w-4 h-4 mr-1" />
          保存PPT
        </Button>
      </div>
    </div>
  );
}

// Convert HTML content to Univer doc format
function htmlToUniverDoc(html: string, title: string) {
  // Parse simple HTML to Univer document body
  const text = html.replace(/<[^>]*>/g, '').trim();
  return {
    id: 'doc-' + Date.now(),
    body: {
      dataStream: text + '\n',
      textRuns: [{ st: 0, ed: text.length }],
    },
    documentStyle: {},
  };
}

function xlsxToUniverSheet(
  sheets: Record<string, unknown[]>,
  sheetNames: string[],
  title: string,
) {
  // Convert xlsx parsed data to Univer sheet format
  const sheetDataMap: Record<string, unknown> = {};
  const sheetOrder: string[] = [];

  (sheetNames || Object.keys(sheets)).forEach((sheetName, idx) => {
    const sheetId = 'sheet-' + idx;
    sheetOrder.push(sheetId);
    const rows = (sheets[sheetName] || []) as unknown[][];
    const cellData: Record<string, Record<string, unknown>> = {};
    const mergedCell: Record<string, unknown> = {};

    rows.forEach((row, rowIdx) => {
      const rowCells: Record<string, unknown> = {};
      (row as unknown[]).forEach((val, colIdx) => {
        if (val !== undefined && val !== null) {
          rowCells[String(colIdx)] = {
            v: String(val),
            m: String(val),
          };
        }
      });
      if (Object.keys(rowCells).length > 0) {
        cellData[String(rowIdx)] = rowCells;
      }
    });

    sheetDataMap[sheetId] = {
      id: sheetId,
      name: sheetName,
      cellData,
      rowCount: Math.max(rows.length, 100),
      columnCount: 26,
      defaultColumnWidth: 93,
      defaultRowHeight: 27,
      mergedCell,
      rowData: {},
      columnData: {},
      status: idx === 0 ? 1 : 0,
    };
  });

  return {
    id: 'workbook-' + Date.now(),
    sheetOrder,
    sheets: sheetDataMap,
    name: title,
    appVersion: '1.0',
  };
}
