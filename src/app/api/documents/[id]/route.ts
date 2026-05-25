import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadDir } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

// GET /api/documents/[id] - Open a document for editing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '令牌无效' }, { status: 401 });
  }

  const db = getDb();
  const file = db.prepare(
    'SELECT * FROM files WHERE id = ? AND deleted_at IS NULL'
  ).get(Number(id)) as Record<string, unknown> | undefined;

  if (!file) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  // Use storage_path directly from database; fallback to uploadDir + basename
  const storagePath = String(file.storage_path || '');
  let fullPath = storagePath;
  if (!fs.existsSync(fullPath)) {
    const uploadDir = getUploadDir();
    fullPath = path.join(uploadDir, path.basename(storagePath));
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: '文件在磁盘上不存在' }, { status: 404 });
  }

  const fileExt = String(file.file_ext || '').toLowerCase();
  const fileName = String(file.name || '');
  const fileCategory = String(file.file_category || '');
  const mimeType = String(file.mime_type || '');

  // Read file content based on type
  let documentData: Record<string, unknown> = {};

  if (fileCategory === 'spreadsheet' || ['xlsx', 'xls', 'csv'].includes(fileExt)) {
    // Excel file - parse with xlsx
    try {
      // Check for companion .univer.json first (preserves full Univer state: styles, merges, etc.)
      const companionPath = fullPath + '.univer.json';
      if (fs.existsSync(companionPath)) {
        try {
          const companionData = JSON.parse(fs.readFileSync(companionPath, 'utf-8'));
          documentData = { type: 'spreadsheet', univerSnapshot: companionData };
        } catch {
          // Fallback to XLSX parsing
          documentData = { type: 'spreadsheet', error: '无法解析编辑数据' };
        }
      } else {
        const XLSX = await import('xlsx');
        const fileBuffer = fs.readFileSync(fullPath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheets: Record<string, unknown[]> = {};
        for (const sheetName of workbook.SheetNames) {
          sheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        }
        documentData = {
          type: 'spreadsheet',
          sheets,
          sheetNames: workbook.SheetNames,
        };
      }
    } catch (e) {
      documentData = { type: 'spreadsheet', error: '无法解析文件' };
    }
  } else if (fileCategory === 'document' || ['docx', 'doc', 'txt', 'md'].includes(fileExt)) {
    // Document file
    if (fileExt === 'docx') {
      // Check for companion .univer.json first (edited version)
      const companionPath = fullPath + '.univer.json';
      if (fs.existsSync(companionPath)) {
        try {
          const companionData = JSON.parse(fs.readFileSync(companionPath, 'utf-8'));
          documentData = { type: 'document', univerSnapshot: companionData };
        } catch {
          documentData = { type: 'document', error: '无法解析编辑数据' };
        }
      } else {
        // First time open - parse docx with mammoth
        try {
          const mammoth = await import('mammoth');
          const fileBuffer = fs.readFileSync(fullPath);
          const result = await mammoth.convertToHtml({ buffer: fileBuffer });
          documentData = {
            type: 'document',
            html: result.value,
          };
        } catch {
          documentData = { type: 'document', error: '无法解析文件' };
        }
      }
    } else if (fileExt === 'txt' || fileExt === 'md') {
      const content = fs.readFileSync(fullPath, 'utf-8');
      documentData = {
        type: 'document',
        text: content,
      };
    } else {
      documentData = { type: 'document' };
    }
  } else if (fileCategory === 'presentation' || ['pptx', 'ppt'].includes(fileExt)) {
    // Check for companion .univer.json first (edited version)
    const companionPath = fullPath + '.univer.json';
    if (fs.existsSync(companionPath)) {
      try {
        const companionData = JSON.parse(fs.readFileSync(companionPath, 'utf-8'));
        documentData = { type: 'presentation', univerSnapshot: companionData };
      } catch {
        documentData = { type: 'presentation' };
      }
    } else {
      documentData = { type: 'presentation' };
    }
  } else {
    documentData = { type: 'unknown' };
  }

  return NextResponse.json({
    success: true,
    data: {
      id: file.id,
      name: fileName,
      ext: fileExt,
      category: fileCategory,
      mimeType,
      size: file.size,
      documentData,
    },
  });
}

// PUT /api/documents/[id] - Save a document
// Accepts two formats:
//   1. JSON: { univerData: <snapshot>, documentType?: string } — from Univer editor
//   2. FormData: file (Blob) + univerData (JSON string) — from PPT editor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '令牌无效' }, { status: 401 });
  }

  const db = getDb();
  const file = db.prepare(
    'SELECT * FROM files WHERE id = ? AND deleted_at IS NULL'
  ).get(Number(id)) as Record<string, unknown> | undefined;

  if (!file) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  // Resolve actual file path on disk
  const storagePath = String(file.storage_path || '');
  let fullPath = storagePath;
  if (!fs.existsSync(fullPath)) {
    const uploadDir = getUploadDir();
    fullPath = path.join(uploadDir, path.basename(storagePath));
  }
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: '文件在磁盘上不存在' }, { status: 404 });
  }

  const fileExt = String(file.file_ext || '').toLowerCase();
  const contentType = request.headers.get('content-type') || '';

  try {
    // ---- Handle FormData (PPT editor) ----
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const fileBlob = formData.get('file') as Blob | null;

      if (fileBlob) {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(fullPath, buffer);
      }

      // Save companion .univer.json for presentation slide state
      const univerDataStr = formData.get('univerData') as string | null;
      if (univerDataStr) {
        try {
          const companionPath = fullPath + '.univer.json';
          fs.writeFileSync(companionPath, univerDataStr, 'utf-8');
        } catch { /* ignore companion save errors */ }
      }

      // Update file size in database
      const stat = fs.statSync(fullPath);
      db.prepare(
        "UPDATE files SET size = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(stat.size, Number(id));

      return NextResponse.json({
        success: true,
        data: { id: Number(id), size: stat.size },
      });
    }

    // ---- Handle JSON (Univer editor) ----
    const body = await request.json() as Record<string, unknown>;
    const univerData = body.univerData;
    const docType = String(file.file_category || '');

    if (docType === 'spreadsheet' && (fileExt === 'xlsx' || fileExt === 'csv')) {
      // Convert Univer snapshot back to XLSX
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const snapshot = univerData as Record<string, unknown> | null;

      if (snapshot && typeof snapshot === 'object') {
        const sheetsMap = snapshot.sheets as Record<string, Record<string, unknown>> | undefined;
        const sheetOrder = snapshot.sheetOrder as string[] | undefined;

        if (sheetsMap) {
          const order = sheetOrder || Object.keys(sheetsMap);
          for (const sheetId of order) {
            const sheetData = sheetsMap[sheetId];
            if (!sheetData) continue;
            const cellData = sheetData.cellData as Record<string, Record<string, { v?: unknown; m?: string }>> | undefined;
            const sheetName = (sheetData.name as string) || sheetId;

            if (cellData) {
              // Univer cellData uses numeric row/col keys: cellData["0"]["0"] = A1
              const rowKeys = Object.keys(cellData).map(Number).sort((a, b) => a - b);
              const maxRow = rowKeys.length > 0 ? rowKeys[rowKeys.length - 1] : -1;

              // Find max column across all rows
              let maxCol = -1;
              for (const rk of rowKeys) {
                const rowCells = cellData[String(rk)];
                if (rowCells) {
                  const colKeys = Object.keys(rowCells).map(Number);
                  const rowMax = colKeys.length > 0 ? Math.max(...colKeys) : -1;
                  if (rowMax > maxCol) maxCol = rowMax;
                }
              }

              const aoa: unknown[][] = [];
              for (let r = 0; r <= maxRow; r++) {
                const row: unknown[] = [];
                const rowCells = cellData[String(r)];
                for (let c = 0; c <= maxCol; c++) {
                  const cell = rowCells?.[String(c)];
                  row.push(cell?.v ?? '');
                }
                aoa.push(row);
              }
              const ws = XLSX.utils.aoa_to_sheet(aoa);
              XLSX.utils.book_append_sheet(workbook, ws, sheetName.substring(0, 31));
            }
          }
        }
      }

      const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      fs.writeFileSync(fullPath, buf);

      // Also save companion .univer.json for full Univer state (styles, merges, etc.)
      if (univerData && typeof univerData === 'object') {
        try {
          const companionPath = fullPath + '.univer.json';
          fs.writeFileSync(companionPath, JSON.stringify(univerData), 'utf-8');
        } catch { /* ignore companion save errors */ }
      }
    } else if (docType === 'document' && fileExt === 'docx') {
      // For docx, we save the Univer snapshot as JSON alongside the original docx
      // and also update the original docx file
      if (univerData && typeof univerData === 'object') {
        // Save a companion .univer.json file so we can reload edits
        const companionPath = fullPath + '.univer.json';
        fs.writeFileSync(companionPath, JSON.stringify(univerData), 'utf-8');
      }
    } else if (docType === 'presentation' || fileExt === 'pptx') {
      // PPT via JSON save (not FormData)
      if (typeof univerData === 'string') {
        fs.writeFileSync(fullPath, Buffer.from(univerData, 'base64'));
      } else if (univerData && typeof univerData === 'object') {
        // Save companion file for presentation state
        const companionPath = fullPath + '.univer.json';
        fs.writeFileSync(companionPath, JSON.stringify(univerData), 'utf-8');
      }
    } else {
      // Generic save for other file types
      if (typeof univerData === 'string') {
        if (univerData.startsWith('data:')) {
          const base64Data = univerData.split(',')[1];
          if (base64Data) {
            fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
          }
        } else {
          fs.writeFileSync(fullPath, univerData, 'utf-8');
        }
      }
    }

    // Update file size in database
    const stat = fs.statSync(fullPath);
    db.prepare(
      "UPDATE files SET size = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(stat.size, Number(id));

    return NextResponse.json({
      success: true,
      data: { id: Number(id), size: stat.size },
    });
  } catch (e) {
    const error = e as Error;
    console.error('[Document Save Error]', error);
    return NextResponse.json(
      { error: `保存失败: ${error.message}` },
      { status: 500 }
    );
  }
}


