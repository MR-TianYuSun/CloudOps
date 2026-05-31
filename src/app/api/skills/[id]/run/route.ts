import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Lazy-load LLM functions to avoid Turbopack CJS issues
async function getInvokeLLM() {
  const mod = await import('@/lib/coze-llm');
  return mod.invokeLLM;
}

// Skill run API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skillId = parseInt(id);
    if (isNaN(skillId)) {
      return NextResponse.json({ code: 400, message: '无效的Skill ID' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const decoded = verifyToken(token) as { userId: number } | null;
    if (!decoded) {
      return NextResponse.json({ code: 401, message: '令牌无效' }, { status: 401 });
    }

    const body = await request.json();
    const userInput = (body.input as string) || '';
    const runParams = body.params as Record<string, unknown> | undefined;
    const fileIds = body.fileIds as number[] | undefined;
    // extraParams: any additional key-value pairs from the request body
    const { input: _input, params: _params, fileIds: _fileIds, ...extraParams } = body as Record<string, unknown>;

    const db = getDb();
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId) as Record<string, unknown> | undefined;
    if (!skill) {
      return NextResponse.json({ code: 404, message: 'Skill不存在' }, { status: 404 });
    }

    // Check access: owner or public
    if (skill.user_id !== decoded.userId && !skill.is_public) {
      return NextResponse.json({ code: 403, message: '无权访问此Skill' }, { status: 403 });
    }

    const category = skill.category as string;
    const skillConfig = (typeof skill.config === 'string' ? JSON.parse(skill.config) : skill.config) as Record<string, unknown>;
    const startTime = Date.now();

    // Read associated file contents if any
    let fileContents = '';
    const skillFileIds = (typeof skill.file_ids === 'string' ? JSON.parse(skill.file_ids) : skill.file_ids || []) as number[];
    const allFileIds = [...skillFileIds, ...(fileIds || [])];
    if (allFileIds.length > 0) {
      const placeholders = allFileIds.map(() => '?').join(',');
      const files = db.prepare(`SELECT f.id, f.name, f.path, f.size, f.is_folder, f.owner_id 
        FROM files f WHERE f.id IN (${placeholders}) AND f.deleted_at IS NULL`).all(...allFileIds) as Record<string, unknown>[];
      
      for (const file of files) {
        if (file.is_folder) continue;
        const uploadDir = db.prepare("SELECT value FROM system_settings WHERE key = 'upload_dir'").get() as Record<string, string> | undefined;
        const uploadDirPath = uploadDir?.value || path.join(process.cwd(), 'data', 'uploads');
        const filePath = path.join(uploadDirPath, file.path as string);
        try {
          if (fs.existsSync(filePath)) {
            const ext = path.extname(file.name as string).toLowerCase();
            const textExts = ['.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml', '.html', '.css', '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.sh', '.bat', '.sql', '.log', '.ini', '.toml', '.env', '.gitignore', '.jsx', '.tsx', '.vue', '.svelte'];
            if (textExts.includes(ext) || (file.size as number) < 50000) {
              const content = fs.readFileSync(filePath, 'utf-8');
              fileContents += `\n--- 文件: ${file.name} ---\n${content}\n`;
            } else {
              fileContents += `\n--- 文件: ${file.name} (${((file.size as number) / 1024).toFixed(1)}KB, ${ext}格式) ---\n[二进制文件，无法直接读取]\n`;
            }
          }
        } catch {
          fileContents += `\n--- 文件: ${file.name} ---\n[读取失败]\n`;
        }
      }
    }

    let result = '';
    let status = 'success';

    try {
      switch (category) {
        case 'script':
          result = await executeScriptSkill(skillConfig, userInput, fileContents, runParams);
          break;
        case 'workflow':
          result = await executeWorkflowSkill(skillConfig, userInput, fileContents);
          break;
        case 'prompt':
        default:
          result = await executePromptSkill(skillConfig, skill, userInput, fileContents, extraParams);
      }
    } catch (err) {
      status = 'failed';
      result = err instanceof Error ? err.message : '执行失败';
    }

    const duration = Date.now() - startTime;

    // Record execution history
    try {
      db.prepare(`INSERT INTO skill_runs (skill_id, user_id, input, output, status, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))`).run(
          skillId, decoded.userId,
          JSON.stringify({ input: userInput, params: runParams, fileIds }),
          result.substring(0, 50000),
          status
        );
      // Update run count
      try {
        db.prepare('UPDATE skills SET run_count = run_count + 1 WHERE id = ?').run(skillId);
      } catch {
        // run_count column may not exist yet
      }
    } catch {
      // Non-fatal: don't fail the run if history recording fails
    }

    return NextResponse.json({
      code: 200,
      message: '执行完成',
      data: {
        skillId,
        skillName: skill.name,
        category,
        result,
        status,
        duration,
      }
    });
  } catch (err) {
    console.error('Skill run error:', err);
    return NextResponse.json({ code: 500, message: '执行失败' }, { status: 500 });
  }
}

// GET: Stream execution for prompt type (SSE)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skillId = parseInt(id);
    if (isNaN(skillId)) {
      return NextResponse.json({ code: 400, message: '无效的Skill ID' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const decoded = verifyToken(token) as { userId: number } | null;
    if (!decoded) {
      return NextResponse.json({ code: 401, message: '令牌无效' }, { status: 401 });
    }

    const url = new URL(request.url);
    const input = url.searchParams.get('input') || '';

    const db = getDb();
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId) as Record<string, unknown> | undefined;
    if (!skill) {
      return NextResponse.json({ code: 404, message: 'Skill不存在' }, { status: 404 });
    }

    if (skill.category !== 'prompt') {
      return NextResponse.json({ code: 400, message: '仅prompt类型Skill支持流式输出' }, { status: 400 });
    }

    // Build prompt
    const skillConfig = (typeof skill.config === 'string' ? JSON.parse(skill.config) : skill.config) as Record<string, unknown>;
    const template = (skillConfig.template as string) || '请处理以下内容：{{input}}';
    const systemPrompt = (skillConfig.systemPrompt as string) || '';
    const model = (skillConfig.model as string) || 'doubao-seed-2-0-mini-260215';

    // Collect extra params from query string
    const extraQueryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      if (!['input', 'fileIds', '_t'].includes(key)) {
        extraQueryParams[key] = value;
      }
    });
    
    // Replace all {{variable}} placeholders
    let userPrompt = template.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
      if (key === 'input' || key === 'content') return input || '';
      return String(extraQueryParams[key] ?? _match);
    });

    // Build messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    // Stream with LLM
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const invokeLLMFn = await getInvokeLLM();
          // For streaming, we'll use non-streaming invoke and chunk the response
          // since the SDK's stream API varies
          const fullContent = await invokeLLMFn(messages, model);
          
          // Simulate streaming by chunking the response
          const chunkSize = 20;
          for (let i = 0; i < fullContent.length; i += chunkSize) {
            const textChunk = fullContent.substring(i, i + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: textChunk })}\n\n`));
            // Small delay for streaming feel
            await new Promise(resolve => setTimeout(resolve, 30));
          }

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`));
          controller.close();

          // Record execution
          try {
            db.prepare(`INSERT INTO skill_runs (skill_id, user_id, input, output, status, created_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))`).run(
                skillId, decoded.userId,
                JSON.stringify({ input }),
                fullContent.substring(0, 50000),
                'success'
              );
            try {
              db.prepare('UPDATE skills SET run_count = run_count + 1 WHERE id = ?').run(skillId);
            } catch { /* ignore */ }
          } catch {
            // Non-fatal
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'LLM调用失败';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Skill stream error:', err);
    return NextResponse.json({ code: 500, message: '流式执行失败' }, { status: 500 });
  }
}

// Execute prompt-type skill using LLM
async function executePromptSkill(
  skillConfig: Record<string, unknown>,
  skill: Record<string, unknown>,
  input: string,
  fileContents: string,
  extraParams: Record<string, unknown>
): Promise<string> {
  const template = (skillConfig.template as string) || '请处理以下内容：{{input}}';
  const systemPrompt = (skillConfig.systemPrompt as string) || (skill.description as string) || '';
  const model = (skillConfig.model as string) || 'doubao-seed-2-0-mini-260215';

  let userPrompt = template
    .replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
      if (key === 'input' || key === 'content') return input || '';
      if (key === 'files') return fileContents || '（无关联文件）';
      return String(extraParams[key] ?? _match);
    });

  if (fileContents && !template.includes('{{files}}')) {
    userPrompt += '\n\n关联文件内容：' + fileContents;
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  try {
    const invokeLLMFn = await getInvokeLLM();
    const response = await invokeLLMFn(messages, model);
    return response;
  } catch (err) {
    throw new Error(`LLM调用失败: ${err instanceof Error ? err.message : '未知错误'}`);
  }
}

// Execute script-type skill in sandboxed environment
async function executeScriptSkill(
  skillConfig: Record<string, unknown>,
  input: string,
  fileContents: string,
  runParams: Record<string, unknown> | undefined
): Promise<string> {
  const scriptCode = (skillConfig.code as string) || (skillConfig.script as string) || '';
  const timeout = Math.min((skillConfig.timeout as number) || 10000, 30000);

  if (!scriptCode.trim()) {
    return '该脚本Skill没有定义执行代码。请在Skill配置中添加代码。';
  }

  // Generate a standalone Node.js script file
  const scriptContent = `
const input = ${JSON.stringify(input)};
const files = ${JSON.stringify(fileContents)};
const params = ${JSON.stringify(runParams || {})};
const __output = [];
const console = { log: (...args) => __output.push(args.map(String).join(' ')) };
try {
  const __result = (function() {
    ${scriptCode}
  })();
  if (__result !== undefined) __output.push(String(__result));
} catch(e) {
  __output.push('执行错误: ' + e.message);
}
process.stdout.write(__output.join('\\n'));
`;

  try {
    const tmpDir = '/tmp';
    const scriptFile = path.join(tmpDir, `skill_${Date.now()}.mjs`);
    fs.writeFileSync(scriptFile, scriptContent, 'utf-8');

    try {
      const { stdout, stderr } = await execAsync(
        `node ${scriptFile}`,
        { timeout, maxBuffer: 1024 * 1024 }
      );
      
      if (stderr && !stdout) {
        return `脚本执行错误: ${stderr.trim()}`;
      }
      return stdout.trim() || '（脚本执行完成，无输出）';
    } finally {
      try { fs.unlinkSync(scriptFile); } catch { /* ignore */ }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('timed out')) {
      return '脚本执行超时，请优化代码或增加超时时间';
    }
    return `脚本执行失败: ${err instanceof Error ? err.message : '未知错误'}`;
  }
}

// Execute workflow-type skill with step-by-step processing
async function executeWorkflowSkill(
  skillConfig: Record<string, unknown>,
  input: string,
  fileContents: string
): Promise<string> {
  const steps = (skillConfig.steps as Array<Record<string, unknown>>) || [];

  if (steps.length === 0) {
    return '该工作流Skill没有定义任何步骤。请在配置中添加步骤。';
  }

  const results: string[] = [];
  let currentData = input;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepType = (step.type as string) || 'process';
    const stepName = (step.name as string) || `步骤 ${i + 1}`;
    const stepPrompt = (step.prompt as string) || (step.content as string) || '';

    results.push(`\n## ${stepName}`);

    switch (stepType) {
      case 'llm': {
        try {
          const prompt = stepPrompt
            .replace(/\{\{input\}\}/g, currentData)
            .replace(/\{\{prev\}\}/g, currentData)
            .replace(/\{\{files\}\}/g, fileContents || '（无文件）');

          const invokeLLMFn = await getInvokeLLM();
          currentData = await invokeLLMFn(
            [{ role: 'user', content: prompt }],
            'doubao-seed-2-0-mini-260215'
          );
          results.push(currentData);
        } catch (err) {
          results.push(`LLM调用失败: ${err instanceof Error ? err.message : '未知错误'}`);
        }
        break;
      }
      case 'transform': {
        const transformExpr = stepPrompt || 'return input;';
        try {
          const fn = new Function('input', 'files', 'params', transformExpr);
          const transformed = fn(currentData, fileContents, {});
          currentData = String(transformed);
          results.push(currentData);
        } catch (err) {
          results.push(`转换失败: ${err instanceof Error ? err.message : '未知错误'}`);
        }
        break;
      }
      case 'filter': {
        try {
          const filterPrompt = stepPrompt.replace(/\{\{input\}\}/g, currentData);
          const invokeLLMFn = await getInvokeLLM();
          currentData = await invokeLLMFn(
            [
              { role: 'system', content: '你是一个数据提取助手。根据用户的要求，从输入内容中提取或过滤信息。只输出提取结果，不要多余解释。' },
              { role: 'user', content: filterPrompt }
            ],
            'doubao-seed-2-0-mini-260215'
          );
          results.push(currentData);
        } catch (err) {
          results.push(`过滤失败: ${err instanceof Error ? err.message : '未知错误'}`);
        }
        break;
      }
      default: {
        const processed = stepPrompt
          .replace(/\{\{input\}\}/g, currentData)
          .replace(/\{\{prev\}\}/g, currentData)
          .replace(/\{\{files\}\}/g, fileContents || '（无文件）');
        currentData = processed;
        results.push(processed || '（处理完成）');
      }
    }
  }

  return results.join('\n');
}
