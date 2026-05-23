'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface ExcelViewerProps {
  url: string;
  fileName: string;
  isCsv?: boolean;
}

interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

export default function ExcelViewer({ url, fileName, isCsv = false }: ExcelViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('下载失败');
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetDataList: SheetData[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

          if (jsonData.length > 0) {
            const headers = jsonData[0].map((h, i) => String(h ?? `列${i + 1}`));
            const rows = jsonData.slice(1).map(row =>
              row.map((cell, i) => String(cell ?? ''))
            );
            sheetDataList.push({ name: sheetName, headers, rows });
          } else {
            sheetDataList.push({ name: sheetName, headers: [], rows: [] });
          }
        }

        if (cancelled) return;
        setSheets(sheetDataList);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError('表格文件加载失败');
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [url]);

  const currentSheet = sheets[activeSheet];

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
        <span className="text-sm text-muted-foreground truncate">{fileName}</span>
        <span className="text-xs text-muted-foreground">{isCsv ? 'CSV' : 'Excel'} 表格</span>
      </div>

      {/* Sheet 标签 */}
      {sheets.length > 1 && (
        <div className="flex gap-1 px-4 py-1 border-b border-border/20 bg-muted/10 overflow-x-auto">
          {sheets.map((sheet, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheet(idx)}
              className={`px-3 py-1 text-xs rounded-t transition-colors whitespace-nowrap ${
                idx === activeSheet
                  ? 'bg-card text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* 表格内容 */}
      <div className="flex-1 overflow-auto bg-muted/20">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-48">
            <div className="text-destructive">{error}</div>
          </div>
        )}
        {!loading && !error && currentSheet && (
          <div className="p-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-muted-foreground bg-muted/40 border border-border/20 font-medium">
                    #
                  </th>
                  {currentSheet.headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-3 py-2 text-left text-xs text-muted-foreground bg-muted/40 border border-border/20 font-medium whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentSheet.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={currentSheet.headers.length + 1}
                      className="px-3 py-8 text-center text-muted-foreground text-sm"
                    >
                      无数据
                    </td>
                  </tr>
                ) : (
                  currentSheet.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-1.5 text-xs text-muted-foreground/50 border border-border/10">
                        {rowIdx + 1}
                      </td>
                      {currentSheet.headers.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-3 py-1.5 text-foreground/80 border border-border/10 whitespace-nowrap max-w-[300px] truncate"
                        >
                          {row[colIdx] || ''}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {currentSheet.rows.length > 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                共 {currentSheet.rows.length} 行，{currentSheet.headers.length} 列
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
