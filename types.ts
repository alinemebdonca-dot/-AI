
export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export enum GenerationModel {
  GEMINI_2_5_FLASH_IMAGE = 'gemini-2.5-flash-image',
  GEMINI_3_PRO_IMAGE_PREVIEW = 'gemini-3-pro-image-preview',
}

// Default models provided by the system
export const DEFAULT_TEXT_MODELS = [
  { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
  { value: 'gemini-3-pro-preview', label: 'gemini-3-pro-preview' },
  { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro' },
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
];

export interface Settings {
  apiKey: string;
  baseUrl: string;
  textModel: string;
  imageModel: GenerationModel;
  // New field for user-defined models
  customTextModels?: { value: string; label: string }[];
  jianYingPath: string;
  outputImgPath: string;
  themeColor: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  referenceImage?: string;
}

export interface StyleReference {
  id: string;
  name: string;
  imageUrl: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  status: '草稿' | '生成中' | '已完成';
  localCharacters: Character[];
  styles?: StyleReference[];
  activeStyleId?: string;
  frames: StoryboardFrame[];
  promptPrefix?: string;
}

export interface StoryboardFrame {
  id: string;
  scriptContent: string;
  visualPrompt?: string;
  characterIds: string[];
  imageUrl?: string;
  isMirrored?: boolean;
  isHD?: boolean;
  aspectRatio: AspectRatio;
  model: GenerationModel;
  startTime?: string;
  endTime?: string;
  selected?: boolean;
}

export type ViewState = 'drafts' | 'characters' | 'settings' | 'editor';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
