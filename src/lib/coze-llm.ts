/**
 * LLM Client wrapper
 * Uses eval('require') to bypass Turbopack's CJS async module handling.
 * The static/dynamic import() approaches don't work because Turbopack
 * still tries to parse the CJS module graph at compile time.
 */

interface LLMInvokeResult {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Lazily loaded SDK references
let _sdk: Record<string, unknown> | null = null;

async function getSDK(): Promise<Record<string, unknown>> {
  if (_sdk) return _sdk;
  // eval('require') bypasses Turbopack's static analysis entirely
  const req = eval('require');
  _sdk = req('coze-coding-dev-sdk');
  return _sdk!;
}

export async function invokeLLM(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'doubao-seed-2-0-mini-260215'
): Promise<string> {
  try {
    const sdk = await getSDK();
    const Config = sdk.Config as new (opts: { apiKey: string }) => Record<string, unknown>;
    const LLMClient = sdk.LLMClient as new (opts: Record<string, unknown>) => { invoke: (msgs: unknown[]) => Promise<Record<string, unknown>> };
    
    const apiKey = process.env.COZE_WORKLOAD_IDENTITY_API_KEY;
    if (!apiKey) {
      throw new Error('COZE_WORKLOAD_IDENTITY_API_KEY 环境变量未设置');
    }
    
    const config = new Config({ apiKey });
    const client = new LLMClient({ ...config, model });
    
    const result = await client.invoke(messages as unknown[]);
    
    // Try different response field names
    const content = (result.content as string) || (result.text as string) || JSON.stringify(result);
    return content;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[LLM] Invoke failed:', err.message);
    throw new Error(`LLM 调用失败: ${err.message}`);
  }
}

export async function invokeLLMStream(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'doubao-seed-2-0-mini-260215'
): Promise<ReadableStream<Uint8Array>> {
  try {
    const sdk = await getSDK();
    const Config = sdk.Config as new (opts: { apiKey: string }) => Record<string, unknown>;
    const LLMClient = sdk.LLMClient as new (opts: Record<string, unknown>) => { invokeStream: (msgs: unknown[]) => Promise<AsyncIterable<Record<string, unknown>>> };
    
    const apiKey = process.env.COZE_WORKLOAD_IDENTITY_API_KEY;
    if (!apiKey) {
      throw new Error('COZE_WORKLOAD_IDENTITY_API_KEY 环境变量未设置');
    }
    
    const config = new Config({ apiKey });
    const client = new LLMClient({ ...config, model });
    
    const stream = await client.invokeStream(messages as unknown[]);
    
    const readableStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          for await (const chunk of stream) {
            const content = (chunk.content as string) || (chunk.text as string) || (chunk.data as string) || '';
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err: unknown) {
          const e = err as Error;
          console.error('[LLM] Stream error:', e.message);
          controller.error(e);
        }
      }
    });
    
    return readableStream;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[LLM] Stream setup failed:', err.message);
    throw new Error(`LLM 流式调用失败: ${err.message}`);
  }
}
