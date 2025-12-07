
import React, { useState, useRef } from 'react';
import { StyleReference, AspectRatio } from '../types';
import { Button } from './Button';
import { Plus, Upload, Wand2, X, Image as ImageIcon, Trash2, Edit2, CheckCircle, Palette } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { storage } from '../utils/storage';
import { ImageViewer } from './ImageViewer';

interface StyleLibraryProps {
  styles: StyleReference[];
  activeStyleId?: string;
  onAddStyle: (style: StyleReference) => void;
  onDeleteStyle: (id: string) => void;
  onSetActiveStyle: (id: string | undefined) => void; // undefined to unselect
}

export const StyleLibrary: React.FC<StyleLibraryProps> = ({ 
  styles, 
  activeStyleId, 
  onAddStyle, 
  onDeleteStyle, 
  onSetActiveStyle
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStyleImage, setNewStyleImage] = useState<string | null>(null);
  const [newStylePrompt, setNewStylePrompt] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const settings = storage.getSettings();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStyleImage(reader.result as string);
        if (!newStyleName) {
            setNewStyleName(file.name.split('.')[0]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateStyle = async () => {
    if (!newStylePrompt) return;
    setIsGenerating(true);
    try {
      const prompt = `Artistic Style Reference, highly detailed texture, atmospheric lighting, NO characters, NO text, pure style demonstration: ${newStylePrompt}`;
      // Use 16:9 for style references generally
      const img = await generateImage(prompt, settings, '16:9');
      setNewStyleImage(img);
      if (!newStyleName) {
          setNewStyleName(newStylePrompt.slice(0, 10));
      }
    } catch (e: any) {
      alert(`生成失败: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (newStyleName && newStyleImage) {
      const styleData: StyleReference = {
        id: `style_${Date.now()}_${Math.random()}`,
        name: newStyleName,
        imageUrl: newStyleImage
      };
      onAddStyle(styleData);
      // Clean up
      setNewStyleName('');
      setNewStyleImage(null);
      setNewStylePrompt('');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
        <div>
            <h3 className="font-bold flex items-center gap-2 text-gray-900">
                <Palette size={18} className="text-purple-600"/> 风格参考库
            </h3>
            <p className="text-xs text-gray-500 mt-1">
                选择一个风格以统全剧画风 (不含人物)
            </p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> 添加
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
        {/* No Style Option */}
        <div 
            onClick={() => onSetActiveStyle(undefined)}
            className={`cursor-pointer rounded-lg border-2 p-2 flex flex-col items-center justify-center gap-2 h-32 transition-all ${!activeStyleId ? 'border-purple-600 bg-purple-50' : 'border-dashed border-gray-300 hover:bg-gray-50'}`}
        >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <X size={16} className="text-gray-500"/>
            </div>
            <span className="text-xs font-bold text-gray-600">不使用风格</span>
        </div>

        {styles.map(style => {
            const isActive = style.id === activeStyleId;
            return (
                <div 
                    key={style.id} 
                    className={`relative group rounded-lg border-2 overflow-hidden cursor-pointer transition-all h-32 ${isActive ? 'border-purple-600 ring-2 ring-purple-200' : 'border-transparent hover:border-gray-300'}`}
                    onClick={() => onSetActiveStyle(style.id)}
                >
                    <img src={style.imageUrl} className="w-full h-full object-cover" alt={style.name} />
                    
                    {/* Overlay Label */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-center">
                        <span className="text-xs text-white font-medium truncate block">{style.name}</span>
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                        <div className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-0.5">
                            <CheckCircle size={14} />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setPreviewImage(style.imageUrl); }}
                            className="bg-black/50 text-white p-1 rounded hover:bg-black/70"
                        >
                            <ImageIcon size={12} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteStyle(style.id); }}
                            className="bg-red-500/80 text-white p-1 rounded hover:bg-red-600"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Add Style Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">添加新风格</h3>
                    <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400"/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">风格名称</label>
                        <input 
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-purple-500 outline-none"
                            placeholder="例如：赛博朋克, 水墨画..."
                            value={newStyleName}
                            onChange={e => setNewStyleName(e.target.value)}
                        />
                    </div>

                    <div className="aspect-video bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative overflow-hidden">
                        {newStyleImage ? (
                            <img src={newStyleImage} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center text-gray-400">
                                <ImageIcon size={32} className="mx-auto mb-2"/>
                                <p className="text-xs">上传或AI生成风格参考图</p>
                            </div>
                        )}
                        {isGenerating && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                         <div className="flex gap-2">
                             <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                             <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
                                <Upload size={14} className="mr-2"/> 本地上传
                             </Button>
                         </div>
                         <div className="flex gap-2">
                             <input 
                                className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs"
                                placeholder="输入风格描述词..."
                                value={newStylePrompt}
                                onChange={e => setNewStylePrompt(e.target.value)}
                             />
                             <Button size="sm" onClick={handleGenerateStyle} disabled={!newStylePrompt || isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white">
                                <Wand2 size={14}/>
                             </Button>
                         </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>取消</Button>
                    <Button onClick={handleSubmit} disabled={!newStyleName || !newStyleImage}>保存风格</Button>
                </div>
            </div>
        </div>
      )}

      <ImageViewer 
        isOpen={!!previewImage}
        imageUrl={previewImage || ''}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};
