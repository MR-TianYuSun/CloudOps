import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUploadDir, buildFilePath } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

// POST /api/documents/create - Create a new document
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '令牌无效' }, { status: 401 });
  }

  const userId = (payload as unknown as Record<string, unknown>).userId as number;
  const body = await request.json() as Record<string, unknown>;
  const { name, type, parent_id, folder_path } = body;

  if (!name || !type) {
    return NextResponse.json({ error: '缺少文件名或类型' }, { status: 400 });
  }

  const docType = String(type);
  const docName = String(name);
  const parentId = parent_id ? Number(parent_id) : null;
  const folderPath = folder_path ? String(folder_path) : '';

  const db = getDb();
  const uploadDir = getUploadDir();

  // Determine file extension and mime type based on document type
  let fileExt = '';
  let mimeType = '';
  let fileCategory = '';
  let fileContent: Buffer | null = null;

  switch (docType) {
    case 'spreadsheet':
    case 'excel':
      fileExt = 'xlsx';
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileCategory = 'spreadsheet';
      // Create empty xlsx
      try {
        const XLSX = await import('xlsx');
        const workbook = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([[]]);
        XLSX.utils.book_append_sheet(workbook, ws, 'Sheet1');
        fileContent = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      } catch {
        fileContent = Buffer.alloc(0);
      }
      break;

    case 'document':
    case 'docx':
      fileExt = 'docx';
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileCategory = 'document';
      // Create minimal docx (a valid empty docx)
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
        zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
        zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t></w:t></w:r></w:p></w:body>
</w:document>`);
        zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
        fileContent = await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;
      } catch {
        fileContent = Buffer.alloc(0);
      }
      break;

    case 'presentation':
    case 'pptx':
      fileExt = 'pptx';
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      fileCategory = 'presentation';
      // Create minimal pptx
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`);
        zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);
        zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
</p:presentation>`);
        zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`);
        zip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
</p:sld>`);
        zip.file('ppt/slides/_rels/slide1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
        fileContent = await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;
      } catch {
        fileContent = Buffer.alloc(0);
      }
      break;

    default:
      return NextResponse.json({ error: '不支持的文档类型' }, { status: 400 });
  }

  // Generate storage filename
  const timestamp = Date.now();
  const folderPart = folderPath ? `--${folderPath.replace(/\//g, '^')}` : '';
  const storageName = `${timestamp}${folderPart}--${docName}.${fileExt}`;
  const fileName = `${docName}.${fileExt}`;
  const storagePath = path.join(uploadDir, storageName);

  // Write file to disk
  if (fileContent) {
    fs.writeFileSync(storagePath, fileContent);
  }

  // Ensure folder structure if folder_path is provided
  let resolvedParentId = parentId;
  if (folderPath) {
    const parts = folderPath.split('/').filter(Boolean);
    let currentParentId: number | null = null;
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;

      // Check if folder exists
      const existing = db.prepare(
        'SELECT id FROM files WHERE name = ? AND is_folder = 1 AND parent_id IS ? AND deleted_at IS NULL'
      ).get(part, currentParentId) as Record<string, unknown> | undefined;

      if (existing) {
        currentParentId = Number(existing.id);
      } else {
        // Create folder
        const folderPathFull = currentPath;
        const result = db.prepare(
          `INSERT INTO files (name, path, parent_id, is_folder, uploaded_by, storage_path, size, mime_type, file_ext, file_category)
           VALUES (?, ?, ?, 1, ?, '', 0, NULL, NULL, NULL)`
        ).run(part, folderPathFull, currentParentId, userId);
        currentParentId = Number(result.lastInsertRowid);
      }
    }
    resolvedParentId = currentParentId;
  }

  // Calculate virtual path AFTER resolving folder structure
  const virtualPath = buildFilePath(db, fileName, resolvedParentId);

  // Insert file record
  const result = db.prepare(
    `INSERT INTO files (name, path, parent_id, is_folder, uploaded_by, storage_path, size, mime_type, file_ext, file_category, owner_type)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'personal')`
  ).run(
    fileName,
    virtualPath,
    resolvedParentId,
    userId,
    storagePath,
    fileContent ? fileContent.length : 0,
    mimeType,
    fileExt,
    fileCategory
  );

  return NextResponse.json({
    success: true,
    data: {
      id: Number(result.lastInsertRowid),
      name: fileName,
      type: docType,
      ext: fileExt,
      category: fileCategory,
    },
  });
}
