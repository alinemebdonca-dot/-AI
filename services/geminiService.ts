
import { GoogleGenAI } from "@google/genai";
import { GenerationModel, Settings, Character } from "../types";

// Helper to clean Base URL for New API / One API compatibility
const cleanBaseUrl = (url?: string): string | undefined => {
    if (!url || !url.trim()) return undefined; 
    
    let cleaned = url.trim();
    
    // 1. Remove trailing slashes
    cleaned = cleaned.replace(/\/+$/, '');
    
    // 2. Remove version suffixes often pasted by mistake (SDK adds these automatically)
    // Many New API users might paste "https://api.com/v1", but SDK wants "https://api.com"
    if (cleaned.endsWith('/v1beta')) {
        cleaned = cleaned.substring(0, cleaned.length - 7);
    } else if (cleaned.endsWith('/v1')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    
    // Remove trailing slash again just in case
    cleaned = cleaned.replace(/\/+$/, '');

    // If user explicitly entered the official URL, treat it as undefined (default)
    if (cleaned === 'https://generativelanguage.googleapis.com') return undefined;
    
    return cleaned;
};

// Helper to clean API Key
const cleanApiKey = (key: string): string => {
    if (!key) return "";
    // Remove all whitespace, newlines, and non-breaking spaces
    // Also remove common prefixes like "Bearer " if user pasted header
    return key.replace(/[\s\uFEFF\xA0]+/g, '').replace(/^Bearer/i, '');
};

// Helper to format error messages
const formatError = (error: any, context: string): string => {
  let msg = error instanceof Error ? error.message : String(error);
  
  if (msg.includes('400')) msg = '请求无效 (400) - 请检查 API Key 是否正确，或代理地址是否支持该模型';
  else if (msg.includes('401')) msg = 'API Key 无效或未授权 (401) - 请检查余额或 Key 是否正确';
  else if (msg.includes('403')) msg = 'API Key 权限不足 (403)';
  else if (msg.includes('404')) msg = '地址错误 (404) - 请检查代理地址是否正确 (不要填 /v1beta)';
  else if (msg.includes('429')) msg = '请求过于频繁/额度耗尽 (429)';
  else if (msg.includes('500')) msg = 'AI 服务内部错误 (500)';
  else if (msg.includes('503')) msg = '服务暂时不可用 (503)';
  else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) msg = '网络连接失败 (检查网络/代理配置)';
  
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
            // Only retry on transient errors or rate limits
            if (msg.includes('429') || msg.includes('503') || msg.includes('Quota exceeded') || msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
                if (attempt < maxRetries) {
                    const waitTime = baseDelay * Math.pow(2, attempt); // 2s, 4s, 8s
                    console.warn(`Hit rate limit or network error. Retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${maxRetries})`);
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
 * Execute an API operation with Single Key and Retry Logic
 * Removed Key Rotation as requested.
 */
const executeGeminiCall = async <T>(
    settings: Settings, 
    operation: (ai: GoogleGenAI) => Promise<T>,
    contextName: string
): Promise<T> => {
    const key = cleanApiKey(settings.apiKey);
    
    if (!key) {
        throw new Error("未配置 API Key，请在系统设置中添加并充值");
    }

    const baseUrl = cleanBaseUrl(settings.baseUrl);

    try {
        // Initialize SDK with cleaned params
        const clientOptions: any = { apiKey: key };
        
        // Only inject baseUrl if it's a custom proxy (New API / One API)
        if (baseUrl) {
            clientOptions.baseUrl = baseUrl;
        }

        const ai = new GoogleGenAI(clientOptions);
        
        // Wrap the AI call in a retry block to ensure stability
        return await retryOperation(() => operation(ai));

    } catch (error: any) {
        const errorMsg = formatError(error, contextName);
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
};

/**
 * Test API Connection (Single Key + URL)
 */
export const testApiConnection = async (apiKey: string, baseUrl: string, model: string = 'gemini-2.5-flash'): Promise<boolean> => {
  const cleanKey = cleanApiKey(apiKey);
  const cleanUrl = cleanBaseUrl(baseUrl);
  
  if (!cleanKey) throw new Error("API Key 为空");
  
  const clientOptions: any = { apiKey: cleanKey };
  if (cleanUrl) {
      clientOptions.baseUrl = cleanUrl;
  }
  
  const ai = new GoogleGenAI(clientOptions);
  
  try {
      await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: 'Ping' }] }
      });
      return true;
  } catch (error) {
      console.error("Connection Test Error:", error);
      const msg = formatError(error, "连接测试失败");
      throw new Error(msg);
  }
};

/**
 * Image Generation with Style and Character Consistency
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

    // 1. Add Style Image
    if (styleImageBase64) {
      const base64Data = styleImageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/png',
        },
      });
      systemText += "【Visual Style Reference (Important)】: Analyze the art style, color palette, lighting, and rendering technique of the FIRST provided image. Apply ONLY this visual style to the generation. Do NOT copy the characters, background content, or composition of the style reference image. \n";
    }

    // 2. Add Character Image
    if (characterImageBase64) {
      const base64Data = characterImageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/png',
        },
      });
      systemText += "【Character Reference】: Maintain the character's facial features, hair, and clothing consistent with the provided character reference image. \n";
    }

    // 3. Add Prompt
    systemText += `【Description】: ${prompt}`;
    parts.push({ text: systemText });

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: parts },
        config: {
            imageConfig: { aspectRatio: aspectRatio },
        },
    });

    // Robust check for content parts
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    // Safety check fallback
    if (candidate?.finishReason) {
        throw new Error(`生成被阻止 (Reason: ${candidate.finishReason}) - 请尝试修改描述词避免敏感内容`);
    }

    throw new Error("API 返回了空数据 (可能触发了安全拦截或模型未响应)");
  };

  return executeGeminiCall(settings, operation, "生图失败");
};

/**
 * Analyze Script for Roles
 */
export const analyzeRoles = async (script: string, settings: Settings): Promise<Character[]> => {
  const safeScript = script.length > 50000 ? script.substring(0, 50000) + "...(truncated)" : script;

  const prompt = `你是一个专业的电影选角导演。请分析以下剧本内容，提取所有主要出现的角色。
  
  【提取要求】：
  1. 忽略“旁白”、“画外音”、“字幕”、“群众”等非具体人物。
  2. **重要**：description 字段必须严格遵守以下格式规范：
     "一个[年龄段][性别]，[数字]岁，[发型及发色]，身穿[衣着及颜色]"。
     例如："一个青年男性，25岁，黑色短发，身穿白色T恤和蓝色牛仔裤"。
  3. 如果剧本未提及具体外貌，请根据角色身份进行合理的专业想象补全，必须包含衣服和颜色。
  
  【输出格式】：
  必须严格输出为纯 JSON 对象数组，不要包含 Markdown 标记或 \`\`\`json 前缀。
  示例：
  [
    { "name": "李明", "description": "一个高中生男性，17岁，黑色齐刘海短发，身穿蓝白相间的运动校服" },
    { "name": "王老师", "description": "一个中年女性，45岁，棕色盘发，身穿米色职业套装" }
  ]

  【剧本内容】：
  ${safeScript}`;

  const operation = async (ai: GoogleGenAI) => {
      const response = await ai.models.generateContent({
          model: settings.textModel,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
      });
      let text = response.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            return parsed.map((c: any) => ({
                id: '', 
                name: c.name || "未知角色",
                description: c.description || "一个未知角色，外貌模糊"
            }));
        }
        return [];
      } catch (e) {
        console.error("Failed to parse roles JSON", text);
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
    
    // Add a small delay before batch request to prevent burst rate limiting
    await sleep(500);

    const libContext = allCharacters.length > 0 
    ? `【可用角色库（必须严格复用以下外貌描述）】：\n${allCharacters.map(c => `- 角色名: "${c.name}" => 外貌描述: "${c.description}"`).join('\n')}`
    : "【可用角色库】：无";

    const prompt = `你是一个专业的AI电影分镜师。请分析以下一组连续的剧本分镜（共 ${scripts.length} 行），生成相应的画面描述词。
    
    ${libContext}

    【核心指令 - 必须严格遵守】：
    1. **禁止出现角色名字**：描述词中绝对不能出现“李明”、“小红”等名字，必须用【可用角色库】中的“外貌描述”替换。
    2. **禁止使用代词**：绝对禁止出现“他”、“她”、“它”、“他们”。必须重复使用完整的角色外貌描述。
    3. **单人镜头格式**：[角色外貌描述]，[表情]，[动作]，[景别]，[场景]，[色调]。
       - 例：一个青年男性，20岁，黑色短发，身穿黑色T恤，黑色长裤，表情惊讶，正在奔跑，中景 Medium Shot，街道夜景，赛博朋克霓虹色调。
    4. **多人镜头格式**：[角色A外貌]，[表情动作]；[角色B外貌]，[表情动作]，[互动细节]，[景别]，[场景]。
       - 例：一个青年男性，黑色短发，黑色T恤，黑色长裤，表情愤怒，挥舞拳头；一个中年男性，灰色头发，身穿西装，表情恐惧，向后退缩，前者揪住后者的衣领，全景 Wide Shot，办公室，冷色调。
    5. **角色识别**：在 activeCharacterNames 中列出出场的角色原名。

    【输出格式】：
    必须严格输出为纯 JSON 对象数组。
    键名必须为 "activeCharacterNames" (数组) 和 "prompt" (字符串)。
    
    参考上文：${prevContextSummary}
    
    待分析剧本：
    ${scripts.map((s, i) => `分镜${i+1}: ${s}`).join('\n')}
    `;

    const operation = async (ai: GoogleGenAI) => {
        const response = await ai.models.generateContent({
            model: settings.textModel,
            contents: prompt,
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
        } catch (e) {
            console.error("Batch JSON parse error", e);
        }
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
 * Infer Single Frame Data (Context Aware)
 */
export const inferFrameData = async (
  currentScript: string,
  allCharacters: Character[],
  settings: Settings,
  contextBefore: string[] = [], 
  contextAfter: string[] = []
): Promise<{ prompt: string, activeNames: string[] }> => {
  
  const libContext = allCharacters.length > 0 
    ? `【可用角色库】：\n${allCharacters.map(c => `- ${c.name}: ${c.description}`).join('\n')}`
    : "【可用角色库】：无";

  // Improve context presentation to include both script and previous visual prompts
  // Context is expected to be strings like "[剧本]: xxx; [已有画面]: yyy"
  const formattedContextBefore = contextBefore.map((c, i) => `上文-${contextBefore.length - i}: ${c}`).join('\n');
  const formattedContextAfter = contextAfter.map((c, i) => `下文+${i+1}: ${c}`).join('\n');

  const prompt = `你是一个专业的AI电影分镜师。
  
  ${libContext}
  
  请根据【前文情境】为【当前分镜】生成画面描述词。
  **一致性要求**：请仔细阅读前文的画面描述，确保当前画面的动作、环境、光影与前文保持连续和逻辑一致。
  
  【前文情境】：
  ${formattedContextBefore || "无"}
  
  【当前分镜剧本】：
  "${currentScript}"
  
  【后文预告】：
  ${formattedContextAfter || "无"}
  
  【严格要求】：
  1. **禁止出现人名**，必须替换为角色外貌描述。
  2. **禁止使用代词** (他/她/它)。
  3. **单人格式**：[角色描述]，[表情]，[动作]，[景别]，[场景]，[色调]。
  4. **多人格式**：[角色A描述]，[动作]；[角色B描述]，[动作]，[互动]，[景别]。
  
  输出格式 JSON:
  {
    "activeCharacterNames": ["角色名"], 
    "prompt": "一个青年男性，黑色短发... (此处为生成的完整提示词)"
  }
  `;

  const operation = async (ai: GoogleGenAI) => {
      const response = await ai.models.generateContent({
          model: settings.textModel,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
      });
      let text = response.text || "{}";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const json = JSON.parse(text);
      return {
          prompt: json.prompt || "", 
          activeNames: Array.isArray(json.activeCharacterNames) 
              ? json.activeCharacterNames 
              : (Array.isArray(json.activeNames) ? json.activeNames : [])
      };
  };

  return executeGeminiCall(settings, operation, "推理失败");
};

/**
 * Breakdown Script
 */
export const breakdownScript = async (scriptText: string, settings: Settings): Promise<string[]> => {
  const prompt = `你是一位专业电影导演。请将以下文本智能拆分为单独的分镜脚本。
  1. 按动作、对话或场景变化进行拆分。
  2. 保持原文内容，不要改写，只是断句。
  
  输出纯 JSON 字符串数组格式：["分镜1内容", "分镜2内容"]。
  文本：${scriptText}`;

  const operation = async (ai: GoogleGenAI) => {
      const response = await ai.models.generateContent({
          model: settings.textModel,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
      });
      let text = response.text || "[]";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
  };

  try {
      return await executeGeminiCall(settings, operation, "分镜拆解失败");
  } catch (e) {
      console.error(e);
      return scriptText.split('\n').filter(l => l.trim().length > 0);
  }
};
