
import { GoogleGenAI } from "@google/genai";
import { GenerationModel, Settings, Character, DEFAULT_TEXT_MODELS } from "../types";

// Helper to clean Base URL for New API / One API compatibility
const cleanBaseUrl = (url?: string): string | undefined => {
    if (!url || !url.trim()) return undefined; 
    
    let cleaned = url.trim();
    // Remove trailing slashes
    cleaned = cleaned.replace(/\/+$/, '');
    
    // SDK adds /v1beta automatically. We must strip common user-pasted suffixes to avoid duplication.
    // e.g. https://api.xxapi.xyz/v1beta -> https://api.xxapi.xyz
    if (cleaned.endsWith('/v1beta')) {
        cleaned = cleaned.substring(0, cleaned.length - 7);
    } else if (cleaned.endsWith('/v1')) {
        // Some proxies use /v1 as root for openai but /v1beta for google. 
        // We strip /v1 to let SDK append /v1beta.
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    
    cleaned = cleaned.replace(/\/+$/, '');
    
    // Official API check
    if (cleaned === 'https://generativelanguage.googleapis.com') return undefined;
    
    return cleaned;
};

// Helper to clean API Key
const cleanApiKey = (key: string): string => {
    if (!key) return "";
    // Simplified cleaning: Trim only. Avoid over-aggressive regex that might kill valid chars.
    // User input should be trusted after trim.
    return key.trim(); 
};

// Helper to format error messages
const formatError = (error: any, context: string): string => {
  let msg = error instanceof Error ? error.message : String(error);
  
  if (msg.includes('400')) msg = '请求无效 (400) - 代理不支持此模型名，或需要 role:user 字段 (已尝试修复)';
  else if (msg.includes('401')) msg = 'API Key 无效或未授权 (401) - 请检查余额或 Key 是否正确';
  else if (msg.includes('403')) msg = 'API Key 权限不足 (403)';
  else if (msg.includes('404')) msg = '地址错误 (404) - 代理地址路径不匹配';
  else if (msg.includes('429')) msg = '请求过于频繁/额度耗尽 (429)';
  else if (msg.includes('500')) msg = 'AI 服务内部错误 (500)';
  else if (msg.includes('503')) msg = '服务暂时不可用 (503)';
  else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) msg = '网络连接失败 (请检查代理地址/VPN/跨域设置)';
  
  return `${context}: ${msg}`;
};

// Helper: Sleep delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Retry with Exponential Backoff
const retryOperation = async <T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3,
    baseDelay: number = 2000
): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const msg = error.message || String(error);
            // Retry on typical network/rate limit errors
            if (msg.includes('429') || msg.includes('503') || msg.includes('Quota exceeded') || msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
                if (attempt < maxRetries) {
                    const waitTime = baseDelay * Math.pow(2, attempt);
                    console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after error: ${msg}`);
                    await sleep(waitTime);
                    continue;
                }
            }
            throw error;
        }
    }
    throw lastError;
};

/**
 * Creates a configured GoogleGenAI client with OpenAI-compatible headers
 */
const createClient = (apiKey: string, baseUrl?: string) => {
    const clientOptions: any = { 
        apiKey: apiKey,
        apiVersion: 'v1beta', // Stable version for most features
        requestOptions: {
            customHeaders: {
                // CRITICAL: Inject Bearer token for OpenAI-compatible proxies (New API, One API)
                // These proxies often ignore x-goog-api-key and require Authorization header
                'Authorization': `Bearer ${apiKey}`
            }
        }
    };
    
    if (baseUrl) {
        clientOptions.baseUrl = baseUrl;
    }

    return new GoogleGenAI(clientOptions);
};

/**
 * Execute an API operation
 */
const executeGeminiCall = async <T>(
    settings: Settings, 
    operation: (ai: GoogleGenAI) => Promise<T>,
    contextName: string
): Promise<T> => {
    const key = cleanApiKey(settings.apiKey);
    
    // Debug Log: Check what key is actually being used
    if (key) {
        // Log masked key for security but enough to verify
        const masked = key.length > 8 ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : key;
        console.log(`[GeminiService] Executing Call with Key: ${masked}`);
    } else {
        console.error('[GeminiService] No API Key provided!');
    }

    if (!key) throw new Error("未配置 API Key");

    const baseUrl = cleanBaseUrl(settings.baseUrl);
    if(baseUrl) console.log(`[GeminiService] Using BaseURL: ${baseUrl}`);

    try {
        const ai = createClient(key, baseUrl);
        return await retryOperation(() => operation(ai));

    } catch (error: any) {
        const errorMsg = formatError(error, contextName);
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
};

/**
 * Test API Connection
 * @param priorityModels Optional models to try first (e.g. custom user model)
 */
export const testApiConnection = async (
    apiKey: string, 
    baseUrl: string, 
    priorityModels: string[] = []
): Promise<string> => {
  const cleanKey = cleanApiKey(apiKey);
  const cleanUrl = cleanBaseUrl(baseUrl);
  
  if (!cleanKey) throw new Error("API Key 为空");
  
  // EXPLICIT LOGGING FOR USER DEBUGGING
  const maskedKey = cleanKey.length > 8 ? `${cleanKey.substring(0, 6)}...${cleanKey.substring(cleanKey.length - 4)}` : cleanKey;
  console.log(`%c[GeminiService] TEST START`, 'background: #222; color: #bada55');
  console.log(`> Key: ${maskedKey}`);
  console.log(`> URL: ${cleanUrl || 'OFFICIAL (Default)'}`);
  
  // Use the helper to ensure headers are consistent
  const ai = createClient(cleanKey, cleanUrl);
  
  // Try priority models first, then default models
  const defaultModelValues = DEFAULT_TEXT_MODELS.map(m => m.value);
  const modelsToTry = [...new Set([...priorityModels, ...defaultModelValues])]; // Dedup
  
  let lastError: any = null;

  for (const modelName of modelsToTry) {
      if(!modelName) continue;
      try {
          console.log(`> Attempting model: ${modelName}...`);
          // FIX 400 ERROR: Explicitly add role: 'user' for proxy compatibility
          await ai.models.generateContent({
            model: modelName,
            contents: [{ 
                role: 'user', 
                parts: [{ text: 'Ping' }] 
            }]
          });
          console.log(`%c> SUCCESS with ${modelName}`, 'color: green; font-weight: bold');
          return modelName; 
      } catch (error) {
          console.warn(`> Failed model ${modelName}:`, error);
          lastError = error;
      }
  }
  
  const msg = formatError(lastError, "所有模型连接测试均失败");
  console.error(msg);
  throw new Error(msg);
};

/**
 * Image Generation
 */
export const generateImage = async (
  prompt: string,
  settings: Settings,
  aspectRatio: string,
  characterImageBase64?: string,
  styleImageBase64?: string,
  isHD: boolean = false
): Promise<string> => {
  const model = isHD ? GenerationModel.GEMINI_3_PRO_IMAGE_PREVIEW : settings.imageModel;

  const operation = async (ai: GoogleGenAI) => {
    const parts: any[] = [];
    let systemText = "";

    // 1. Add Style
    if (styleImageBase64) {
      const base64Data = styleImageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/png',
        },
      });
      systemText += "【Visual Style Reference】: Apply ONLY the art style of the FIRST image. Do NOT copy characters/content. \n";
    }

    // 2. Add Character
    if (characterImageBase64) {
      const base64Data = characterImageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/png',
        },
      });
      systemText += "【Character Reference】: Maintain character facial features, hair, and clothing. \n";
    }

    // 3. Add Prompt
    systemText += `【Description】: ${prompt}`;
    parts.push({ text: systemText });

    // FIX 400 ERROR: Explicitly add role: 'user'
    const response = await ai.models.generateContent({
        model: model,
        contents: [{ 
            role: 'user', 
            parts: parts 
        }],
        config: {
            imageConfig: { aspectRatio: aspectRatio },
        },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    if (candidate?.finishReason) {
        throw new Error(`生成阻止 (${candidate.finishReason})`);
    }

    throw new Error("API 返回空数据");
  };

  return executeGeminiCall(settings, operation, "生图失败");
};

/**
 * Analyze Roles
 */
export const analyzeRoles = async (script: string, settings: Settings): Promise<Character[]> => {
  const safeScript = script.length > 30000 ? script.substring(0, 30000) + "..." : script;

  const prompt = `你是一个专业的电影选角导演。分析剧本提取主要角色。
  输出 JSON 数组: [{"name":"名","description":"外貌描述"}]。
  剧本: ${safeScript}`;

  const operation = async (ai: GoogleGenAI) => {
      // FIX 400 ERROR: Explicitly add role: 'user'
      const response = await ai.models.generateContent({
          model: settings.textModel,
          contents: [{ 
              role: 'user', 
              parts: [{ text: prompt }] 
          }],
          config: { responseMimeType: 'application/json' }
      });
      let text = response.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed.map((c: any) => ({
                id: '', 
                name: c.name || "未知",
                description: c.description || "未知"
            }));
        }
        return [];
      } catch (e) {
        return [];
      }
  };

  return executeGeminiCall(settings, operation, "角色分析失败");
};

/**
 * Infer Batch Prompts
 */
export const inferBatchPrompts = async (
    scripts: string[],
    allCharacters: Character[],
    settings: Settings,
    prevContextSummary: string
): Promise<{ prompt: string, activeNames: string[] }[]> => {
    
    await sleep(500);

    const libContext = allCharacters.length > 0 
    ? `【可用角色库】:\n${allCharacters.map(c => `- ${c.name}: ${c.description}`).join('\n')}`
    : "无角色库";

    const prompt = `你是一个AI分镜师。分析剧本生成画面描述。
    ${libContext}
    要求: 禁用人名，禁用代词，使用外貌描述。
    输出 JSON 数组: [{"activeCharacterNames":[], "prompt":"..."}]。
    
    上文: ${prevContextSummary}
    
    剧本:
    ${scripts.map((s, i) => `${i+1}: ${s}`).join('\n')}
    `;

    const operation = async (ai: GoogleGenAI) => {
        // FIX 400 ERROR: Explicitly add role: 'user'
        const response = await ai.models.generateContent({
            model: settings.textModel,
            contents: [{ 
                role: 'user', 
                parts: [{ text: prompt }] 
            }],
            config: { responseMimeType: 'application/json' }
        });
        let text = response.text || "[]";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const json = JSON.parse(text);
            if (Array.isArray(json)) {
                return json.map((item: any) => ({
                    prompt: item.prompt || "",
                    activeNames: Array.isArray(item.activeCharacterNames) 
                        ? item.activeCharacterNames 
                        : (Array.isArray(item.activeNames) ? item.activeNames : [])
                }));
            }
        } catch (e) {}
        return Array(scripts.length).fill({ prompt: "", activeNames: [] });
    };

    try {
        return await executeGeminiCall(settings, operation, "批量推理失败");
    } catch (e) {
        console.error(e);
        return Array(scripts.length).fill({ prompt: "", activeNames: [] });
    }
};

/**
 * Infer Single Frame
 */
export const inferFrameData = async (
  currentScript: string,
  allCharacters: Character[],
  settings: Settings,
  contextBefore: string[] = [], 
  contextAfter: string[] = []
): Promise<{ prompt: string, activeNames: string[] }> => {
  
  const libContext = allCharacters.length > 0 
    ? `【角色库】:\n${allCharacters.map(c => `${c.name}:${c.description}`).join('\n')}`
    : "";

  const prompt = `AI分镜师任务。
  ${libContext}
  根据剧本生成画面描述。禁用人名代词。
  前文:${contextBefore.join('; ')}
  当前:${currentScript}
  后文:${contextAfter.join('; ')}
  
  输出 JSON: {"activeCharacterNames":[], "prompt":"..."}`;

  const operation = async (ai: GoogleGenAI) => {
      // FIX 400 ERROR: Explicitly add role: 'user'
      const response = await ai.models.generateContent({
          model: settings.textModel,
          contents: [{ 
              role: 'user', 
              parts: [{ text: prompt }] 
          }],
          config: { responseMimeType: 'application/json' }
      });
      let text = response.text || "{}";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const json = JSON.parse(text);
      return {
          prompt: json.prompt || "", 
          activeNames: Array.isArray(json.activeCharacterNames) ? json.activeCharacterNames : []
      };
  };

  return executeGeminiCall(settings, operation, "推理失败");
};

/**
 * Breakdown Script
 */
export const breakdownScript = async (scriptText: string, settings: Settings): Promise<string[]> => {
  const prompt = `拆分剧本为分镜列表。保持原文。
  输出 JSON 字符串数组: ["分镜1", "分镜2"]。
  文本：${scriptText}`;

  const operation = async (ai: GoogleGenAI) => {
      // FIX 400 ERROR: Explicitly add role: 'user'
      const response = await ai.models.generateContent({
          model: settings.textModel,
          contents: [{ 
              role: 'user', 
              parts: [{ text: prompt }] 
          }],
          config: { responseMimeType: 'application/json' }
      });
      let text = response.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
  };

  try {
      return await executeGeminiCall(settings, operation, "分镜拆解失败");
  } catch (e) {
      return scriptText.split('\n').filter(l => l.trim().length > 0);
  }
};
