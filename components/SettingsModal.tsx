
import React, { useState, useEffect } from 'react';
import { Settings, GenerationModel, TEXT_MODELS } from '../types';
import { Button } from './Button';
import { X, Save, Palette, Key, Check, AlertTriangle, Loader2, Globe, ShoppingBag, ExternalLink } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(storage.getSettings());
      setKeyStatus(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    let finalKey = localSettings.apiKey.trim().replace(/[\s\uFEFF\xA0]+/g, '');
    
    if (!finalKey) {
        showToast("警告：未配置 API Key，功能将无法使用", "info");
    }

    // Ensure BaseURL is correct if user cleared it
    let finalBaseUrl = localSettings.baseUrl?.trim().replace(/\/+$/, '');
    if (!finalBaseUrl) {
        finalBaseUrl = 'https://api.xxapi.xyz';
    }

    const cleanedSettings = {
        ...localSettings,
        apiKey: finalKey,
        baseUrl: finalBaseUrl
    };

    storage.saveSettings(cleanedSettings);
    onSave(cleanedSettings);
    onClose();
  };

  const handleTestKey = async () => {
    setTesting(true);
    // Sanitize before testing
    const cleanUrl = localSettings.baseUrl?.trim().replace(/\/+$/, '') || 'https://api.xxapi.xyz';
    const cleanKey = localSettings.apiKey.trim().replace(/[\s\uFEFF\xA0]+/g, '');
    
    const modelToTest = localSettings.textModel || 'gemini-2.5-flash';

    try {
        await testApiConnection(cleanKey, cleanUrl, modelToTest);
        setKeyStatus('valid');
        showToast(`连接成功 (模型: ${modelToTest})`, "success");
    } catch (e: any) {
        setKeyStatus('invalid');
        showToast(`测试失败: ${e.message}`, "error");
    } finally {
        setTesting(false);
    }
  };

  const handleGoToRecharge = () => {
      const url = localSettings.baseUrl || 'https://api.xxapi.xyz';
      window.open(url, '_blank');
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

            {/* Base URL Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Globe size={14} />
                    API 接口地址
                </label>
                <input 
                    type="text" 
                    value={localSettings.baseUrl}
                    onChange={e => setLocalSettings({...localSettings, baseUrl: e.target.value})}
                    onBlur={() => {
                        let url = localSettings.baseUrl.trim();
                        if (!url) url = 'https://api.xxapi.xyz'; // Restore default if empty
                        setLocalSettings(prev => ({...prev, baseUrl: url}));
                    }}
                    placeholder="https://api.xxapi.xyz"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-color)] outline-none text-sm font-mono transition-colors"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                    系统默认使用接口：<b>https://api.xxapi.xyz</b>，您也可以配置其他兼容 OpenAI/Gemini 格式的代理地址。
                </p>
            </div>
            
            {/* API Key Input */}
            <div className="space-y-2">
                 <div className="flex justify-between items-center">
                     <label className="block text-sm font-medium text-gray-700">API Key (密钥)</label>
                     <button 
                        onClick={handleGoToRecharge}
                        className="text-xs text-[var(--brand-color)] hover:underline flex items-center gap-1 font-bold"
                     >
                         <ShoppingBag size={12} />
                         前往购买/充值 Key
                     </button>
                 </div>
                 
                 <div className="flex gap-2">
                     <div className="relative flex-1">
                        <input 
                            type="password"
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
                     请确保您的 Key 有足够的余额。如果连接失败，请检查接口地址和 Key 是否匹配。
                 </p>

                 {/* Big Recharge Button */}
                 <div className="pt-2">
                     <Button 
                        onClick={handleGoToRecharge} 
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-none shadow-orange-500/20 py-3"
                     >
                         <ShoppingBag size={18} className="mr-2" />
                         获取 / 充值 API Key
                         <ExternalLink size={14} className="ml-2 opacity-70" />
                     </Button>
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

          {/* Models */}
          <div className="space-y-4 border-b border-gray-100 pb-6">
            <h4 className="font-semibold text-gray-900">模型选择</h4>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">推理/文本模型</label>
                    <select 
                        value={localSettings.textModel}
                        onChange={e => setLocalSettings({...localSettings, textModel: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                        {TEXT_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">生图模型</label>
                    <select 
                        value={localSettings.imageModel}
                        onChange={e => setLocalSettings({...localSettings, imageModel: e.target.value as GenerationModel})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value={GenerationModel.GEMINI_2_5_FLASH_IMAGE}>NanoBanana</option>
                        <option value={GenerationModel.GEMINI_3_PRO_IMAGE_PREVIEW}>NanoBanana Pro</option>
                    </select>
                </div>
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
