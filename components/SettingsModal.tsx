
import React, { useState, useEffect } from 'react';
import { Settings, GenerationModel, DEFAULT_TEXT_MODELS } from '../types';
import { Button } from './Button';
import { X, Save, Palette, Key, Check, AlertTriangle, Loader2, Globe, Plus, Trash2 } from 'lucide-react';
import { storage } from '../utils/storage';
import { testApiConnection } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const THEME_COLORS = [
  { name: '活力橙', value: '#f97316' },
  { name: '科技蓝', value: '#3b82f6' },
  { name: '赛博紫', value: '#8b5cf6' },
  { name: '极光绿', value: '#10b981' },
  { name: '未来青', value: '#06b6d4' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, showToast }) => {
  const [localSettings, setLocalSettings] = useState<Settings>(storage.getSettings());
  const [testing, setTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'valid' | 'invalid' | null>(null);
  
  // Custom Model State
  const [customModelInput, setCustomModelInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = storage.getSettings();
      setLocalSettings(current);
      setKeyStatus(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    let finalKey = localSettings.apiKey.trim();
    
    if (!finalKey) {
        showToast("警告：未配置 API Key，功能将无法使用", "info");
    }

    const cleanedSettings = {
        ...localSettings,
        apiKey: finalKey,
    };

    console.log('[Settings] Saving new settings, Key prefix:', finalKey.substring(0, 8));
    storage.saveSettings(cleanedSettings);
    onSave(cleanedSettings);
    onClose();
  };

  const handleTestKey = async () => {
    setTesting(true);
    const cleanUrl = localSettings.baseUrl.trim();
    const cleanKey = localSettings.apiKey.trim();
    
    try {
        // Prioritize testing the currently selected model
        const priorityModels = [localSettings.textModel];
        const workingModel = await testApiConnection(cleanKey, cleanUrl, priorityModels);
        setKeyStatus('valid');
        showToast(`连接成功 (测试模型: ${workingModel})`, "success");
    } catch (e: any) {
        setKeyStatus('invalid');
        showToast(`测试失败: ${e.message}`, "error");
    } finally {
        setTesting(false);
    }
  };

  const handleAddCustomModel = () => {
      const val = customModelInput.trim();
      if (!val) return;
      
      const existing = (localSettings.customTextModels || []);
      if (existing.some(m => m.value === val) || DEFAULT_TEXT_MODELS.some(m => m.value === val)) {
          showToast('该模型已存在', 'info');
          return;
      }

      const newModels = [...existing, { value: val, label: val }];
      setLocalSettings({
          ...localSettings,
          customTextModels: newModels,
          textModel: val // Select automatically
      });
      setCustomModelInput('');
      showToast(`已添加模型: ${val}`, 'success');
  };

  const handleRemoveCustomModel = (val: string) => {
      const newModels = (localSettings.customTextModels || []).filter(m => m.value !== val);
      let newSelected = localSettings.textModel;
      
      // If deleted active model, revert to default
      if (localSettings.textModel === val) {
          newSelected = DEFAULT_TEXT_MODELS[0].value;
      }

      setLocalSettings({
          ...localSettings,
          customTextModels: newModels,
          textModel: newSelected
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-xl text-gray-800">系统设置</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* API Configuration Section */}
          <div className="space-y-4 border-b border-gray-100 pb-6">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Key size={18} className="text-[var(--brand-color)]" /> API 连接配置
            </h4>

            {/* Base URL Input (UNLOCKED) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Globe size={14} />
                    API 接口地址 (Base URL)
                </label>
                <div className="relative">
                    <input 
                        type="text" 
                        value={localSettings.baseUrl}
                        onChange={(e) => setLocalSettings({...localSettings, baseUrl: e.target.value})}
                        placeholder="请输入代理地址 (例如: https://api.openai-proxy.com)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 font-mono text-sm focus:ring-2 focus:ring-[var(--brand-color)] outline-none"
                    />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                    如使用中转/代理，请输入完整地址。留空则尝试默认连接。
                </p>
            </div>
            
            {/* API Key Input */}
            <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-700">API Key (密钥)</label>
                 
                 <div className="flex gap-2">
                     <div className="relative flex-1">
                        <input 
                            type="password"
                            autoComplete="new-password" 
                            name="gemini_api_key_field"
                            value={localSettings.apiKey}
                            onChange={e => {
                                setLocalSettings({...localSettings, apiKey: e.target.value});
                                setKeyStatus(null);
                            }}
                            placeholder="sk-..."
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--brand-color)] outline-none text-sm font-mono pr-8 transition-colors ${
                                keyStatus === 'valid' ? 'border-green-400 bg-green-50' : 
                                keyStatus === 'invalid' ? 'border-red-400 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            {keyStatus === 'valid' && <Check size={16} className="text-green-600" />}
                            {keyStatus === 'invalid' && <AlertTriangle size={16} className="text-red-500" />}
                        </div>
                     </div>
                     <Button 
                        onClick={handleTestKey} 
                        disabled={testing || !localSettings.apiKey} 
                        variant="secondary" 
                        className="whitespace-nowrap"
                     >
                         {testing ? <Loader2 size={16} className="animate-spin mr-1"/> : "测试连接"}
                     </Button>
                 </div>
                 <p className="text-[10px] text-gray-400">
                     请确保 API Key 与上方代理地址匹配。系统会自动尝试使用 role: user 进行兼容性修复。
                 </p>
            </div>
          </div>

          {/* Models */}
          <div className="space-y-4 border-b border-gray-100 pb-6">
            <h4 className="font-semibold text-gray-900">模型选择</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Text Model Selection */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">推理/文本模型</label>
                    <div className="flex gap-2">
                        <select 
                            value={localSettings.textModel}
                            onChange={e => setLocalSettings({...localSettings, textModel: e.target.value})}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                            <optgroup label="预设模型">
                                {DEFAULT_TEXT_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </optgroup>
                            {(localSettings.customTextModels && localSettings.customTextModels.length > 0) && (
                                <optgroup label="自定义模型">
                                    {localSettings.customTextModels.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </optgroup>
                            )}
                        </select>
                        {(localSettings.customTextModels || []).some(m => m.value === localSettings.textModel) && (
                            <button 
                                onClick={() => handleRemoveCustomModel(localSettings.textModel)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded border border-red-200"
                                title="删除当前自定义模型"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                    
                    {/* Add Custom Model Input */}
                    <div className="flex gap-2 items-center mt-2">
                        <input 
                            type="text" 
                            value={customModelInput}
                            onChange={e => setCustomModelInput(e.target.value)}
                            placeholder="输入自定义模型ID..."
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-xs"
                        />
                        <Button size="sm" variant="secondary" onClick={handleAddCustomModel} disabled={!customModelInput}>
                            <Plus size={14} className="mr-1" /> 添加
                        </Button>
                    </div>
                    <p className="text-[10px] text-gray-400">
                        如代理商使用了特殊模型名称 (如 gpt-4o 映射)，请在此添加并选中。
                    </p>
                </div>

                {/* Image Model Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">生图模型</label>
                    <select 
                        value={localSettings.imageModel}
                        onChange={e => setLocalSettings({...localSettings, imageModel: e.target.value as GenerationModel})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value={GenerationModel.GEMINI_2_5_FLASH_IMAGE}>NanoBanana (Standard)</option>
                        <option value={GenerationModel.GEMINI_3_PRO_IMAGE_PREVIEW}>NanoBanana Pro (HD)</option>
                    </select>
                </div>
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-4 border-b border-gray-100 pb-6">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Palette size={18} className="text-[var(--brand-color)]" /> 主题外观
            </h4>
            <div className="flex gap-4">
                {THEME_COLORS.map(color => (
                    <button
                        key={color.value}
                        onClick={() => setLocalSettings({...localSettings, themeColor: color.value})}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${localSettings.themeColor === color.value ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color.value }}
                    />
                ))}
            </div>
          </div>

          {/* Paths */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">路径配置</h4>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">剪映草稿路径</label>
                <input 
                    type="text" 
                    value={localSettings.jianYingPath}
                    onChange={e => setLocalSettings({...localSettings, jianYingPath: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图片导出路径</label>
                <input 
                    type="text" 
                    value={localSettings.outputImgPath}
                    onChange={e => setLocalSettings({...localSettings, outputImgPath: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50"
                />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button onClick={handleSave}>
                <Save size={16} className="mr-2" />
                保存配置
            </Button>
        </div>
      </div>
    </div>
  );
};
