
export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export enum GenerationModel {
  GEMINI_2_5_FLASH_IMAGE = 'gemini-2.5-flash-image',
  GEMINI_3_PRO_IMAGE_PREVIEW = 'gemini-3-pro-image-preview',
}

export const TEXT_MODELS = [
  { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
  { value: 'gemini-3-pro-preview', label: 'gemini-3-pro-preview' },
  { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro' },
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
];

export interface Settings {
  apiKey: string; // Changed from apiKeys[] to single apiKey
  baseUrl: string; // Custom Proxy URL
  textModel: string;
  imageModel: GenerationModel;
  jianYingPath: string;
  outputImgPath: string;
  themeColor: string;
}

export interface Character {
  id: string;
  name: string;
  description: string; // 角色外貌描述
  referenceImage?: string; // Base64
}

export interface StyleReference {
  id: string;
  name: string;
  imageUrl: string; // Base64
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  status: '草稿' | '生成中' | '已完成';
  localCharacters: Character[]; // 故事专用角色库
  styles?: StyleReference[]; // 故事专用风格库
  activeStyleId?: string; // 当前激活的风格ID
  frames: StoryboardFrame[];
  promptPrefix?: string; // 全局画面描述词前缀
}

export interface StoryboardFrame {
  id: string;
  scriptContent: string; // Row 1: 剧本/分镜内容
  visualPrompt?: string; // Row 2: 画面描述词
  characterIds: string[]; // Row 3: 关联角色ID
  imageUrl?: string; // Row 4: 图片
  isMirrored?: boolean; // 图片镜像状态
  isHD?: boolean; // 是否高清
  aspectRatio: AspectRatio;
  model: GenerationModel;
  startTime?: string; // SRT Timecode
  endTime?: string;
  selected?: boolean; // UI Selection state
}

export type ViewState = 'drafts' | 'characters' | 'settings' | 'editor';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
