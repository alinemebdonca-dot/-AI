
import { Project, Character, Settings, GenerationModel } from '../types';

const KEYS = {
  PROJECTS: 'baojian_projects',
  CHARACTERS: 'baojian_characters',
  SETTINGS: 'baojian_settings',
  AUTH_TOKEN: 'baojian_auth_token',
  AUTH_USER: 'baojian_user'
};

const DEFAULT_SETTINGS: Settings = {
  apiKey: '', 
  baseUrl: '', // Changed from official URL to empty string
  textModel: 'gemini-2.5-pro', 
  imageModel: GenerationModel.GEMINI_2_5_FLASH_IMAGE,
  customTextModels: [],
  jianYingPath: 'C:/Users/Admin/AppData/Local/JianYingPro/User Data/Projects/',
  outputImgPath: 'D:/AI_Output/',
  themeColor: '#f97316'
};

export const storage = {
  // --- Projects ---
  loadProjects: async (): Promise<Project[]> => {
      const local = localStorage.getItem(KEYS.PROJECTS);
      return local ? JSON.parse(local) : [];
  },

  getProjectsSync: (): Project[] => {
    const data = localStorage.getItem(KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  },

  saveProjects: async (projects: Project[]) => {
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
  },

  saveSingleProject: async (project: Project) => {
      const projects = storage.getProjectsSync();
      const idx = projects.findIndex(p => p.id === project.id);
      const updated = idx >= 0 
        ? projects.map(p => p.id === project.id ? project : p)
        : [project, ...projects];
      
      localStorage.setItem(KEYS.PROJECTS, JSON.stringify(updated));
  },

  deleteProject: async (id: string) => {
      const projects = storage.getProjectsSync().filter(p => p.id !== id);
      localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
  },

  // --- Characters ---
  loadCharacters: async (): Promise<Character[]> => {
      const local = localStorage.getItem(KEYS.CHARACTERS);
      return local ? JSON.parse(local) : [];
  },

  getCharactersSync: (): Character[] => {
      const data = localStorage.getItem(KEYS.CHARACTERS);
      return data ? JSON.parse(data) : [];
  },

  saveCharacters: async (chars: Character[]) => {
      localStorage.setItem(KEYS.CHARACTERS, JSON.stringify(chars));
  },

  // --- Settings ---
  loadSettings: async (): Promise<Settings> => {
      return storage.getSettingsSync();
  },

  getSettingsSync: (): Settings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    const localSettings = data ? JSON.parse(data) : DEFAULT_SETTINGS;
    
    // Cleanup old fields
    if ('apiKeys' in localSettings) {
        delete (localSettings as any).apiKeys;
    }

    // Ensure customTextModels exists
    if (!localSettings.customTextModels) {
        localSettings.customTextModels = [];
    }

    // NO LOCKING: Allow whatever is in storage or default
    return { ...DEFAULT_SETTINGS, ...localSettings };
  },

  getSettings: (): Settings => {
    return storage.getSettingsSync();
  },

  saveSettings: async (settings: Settings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- Auth ---
  setAuth: (token: string, user: any) => {
      localStorage.setItem(KEYS.AUTH_TOKEN, token);
      localStorage.setItem(KEYS.AUTH_USER, JSON.stringify(user));
  },

  getAuthToken: () => {
      return localStorage.getItem(KEYS.AUTH_TOKEN);
  },

  clearAuth: () => {
      localStorage.removeItem(KEYS.AUTH_TOKEN);
      localStorage.removeItem(KEYS.AUTH_USER);
  },
  
  getProjects: () => storage.getProjectsSync(),
  getCharacters: () => storage.getCharactersSync(),
};

export const getSettings = storage.getSettingsSync;
