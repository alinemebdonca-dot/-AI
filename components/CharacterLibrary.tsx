import React, { useState, useRef, useEffect } from 'react';
import { Character, AspectRatio } from '../types';
import { Button } from './Button';
import { Plus, Upload, Wand2, X, Image as ImageIcon, Trash2, Edit2, Save, Download, Globe, ZoomIn } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { storage } from '../utils/storage';
import { ASPECT_RATIOS } from '../constants';
import { ImageViewer } from './ImageViewer';

interface CharacterLibraryProps {
  characters: Character[];
  onAddCharacter: (char: Character) => void;
  onUpdateCharacter?: (char: Character) => void;
  onDeleteCharacter: (id: string) => void;
  title?: string;
  compact?: boolean;
  
  // New props for sync
  globalCharacters?: Character[]; // Passed only when used as Local Lib
  onImportFromGlobal?: (char: Character) => void;
  onExportToGlobal?: (char: Character) => void;
}

export const CharacterLibrary: React.FC<CharacterLibraryProps> = ({ 
  characters, 
  onAddCharacter, 
  onUpdateCharacter,
  onDeleteCharacter,
  title = "主体角色库",
  compact = false,
  globalCharacters = [],
  onImportFromGlobal,
  onExportToGlobal
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGlobalImportOpen, setIsGlobalImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newChar, setNewChar] = useState<Partial<Character>>({});
  const [genRatio, setGenRatio] = useState<AspectRatio>('3:4');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Image Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, id: string} | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const settings = storage.getSettings();

  const handleOpenModal = (char?: Character) => {
    if (char) {
        setEditingId(char.id);
        setNewChar({...char});
    } else {
        setEditingId(null);
        setNewChar({});
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewChar(prev => ({ ...prev, referenceImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateReference = async () => {
    if (!newChar.description) return;
    setIsGenerating(true);
    try {
      const prompt = `Character Design Sheet, white background, full body shot: ${newChar.description}`;
      const img = await generateImage(prompt, settings, genRatio);
      setNewChar(prev => ({ ...prev, referenceImage: img }));
    } catch (e: any) {
      alert(`生成失败: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (newChar.name && newChar.description) {
      const charData = {
        id: editingId || `char_${Date.now()}_${Math.random()}`,
        name: newChar.name,
        description: newChar.description,
        referenceImage: newChar.referenceImage || ''
      } as Character;

      if (editingId && onUpdateCharacter) {
        onUpdateCharacter(charData);
      } else {
        onAddCharacter(charData);
      }
      setIsModalOpen(false);
      setNewChar({});
      setEditingId(null);
    }
  };

  return (
    <div className={`h-full overflow-y-auto ${compact ? 'p-4' : 'p-8 max-w-7xl mx-auto'}`}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div>
            <h1 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-gray-900`}>{title}</h1>
            {!compact && <p className="text-gray-500 text-sm mt-1">管理故事中的常驻角色，保持画面一致性。</p>}
        </div>
        <div className="flex gap-2">
            {onImportFromGlobal && (
                <Button size={compact ? 'sm' : 'md'} variant="secondary" onClick={() => setIsGlobalImportOpen(true)}>
                    <Globe size={18} className="mr-2" />
                    从全局库导入
                </Button>
            )}
            <Button onClick={() => handleOpenModal()} size={compact ? 'sm' : 'md'}>
                <Plus size={18} className="mr-2" />
                添加角色
            </Button>
        </div>
      </div>

      <div className={`grid ${compact ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}`}>
        {characters.map((char) => (
          <div 
            key={char.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow relative"
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, id: char.id });
            }}
          >
            <div className={`${compact ? 'aspect-square' : 'aspect-[3/4]'} bg-gray-100 relative overflow-hidden group/img`}>
                {char.referenceImage ? (
                    <>
                        <img src={char.referenceImage} alt={char.name} className="w-full h-full object-cover" />
                        <button 
                            onClick={() => setPreviewImage(char.referenceImage!)}
                            className="absolute bottom-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                        >
                            <ZoomIn size={14} />
                        </button>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <UsersIcon size={compact ? 32 : 48} />
                    </div>
                )}
                
                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <div className="flex gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(char); }} 
                            className="p-2 bg-white rounded-full text-brand-600 hover:bg-brand-50" 
                            title="编辑"
                        >
                            <Edit2 size={16} />
                        </button>
                    </div>
                    {onExportToGlobal && (
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={(e) => { e.stopPropagation(); onExportToGlobal(char); }} 
                            className="scale-75 origin-center"
                        >
                            <Upload size={14} className="mr-1" /> 存入全局库
                        </Button>
                    )}
                </div>
            </div>
            <div className="p-3">
                <h3 className="font-bold text-gray-900 text-sm">{char.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{char.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
          <div 
            className="fixed bg-white border border-gray-200 shadow-xl rounded-lg py-1 z-50 w-32 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
              <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setContextMenu(null); 
                    setTimeout(() => onDeleteCharacter(contextMenu.id), 50); 
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                  <Trash2 size={14} /> 删除角色
              </button>
          </div>
      )}

      {/* Global Import Modal */}
      {isGlobalImportOpen && onImportFromGlobal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl h-[80vh] flex flex-col">
                   <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                        <h3 className="font-bold text-lg">从全局库导入角色</h3>
                        <button onClick={() => setIsGlobalImportOpen(false)}><X /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4">
                        {globalCharacters.length === 0 && <p className="text-gray-500 col-span-3 text-center py-10">全局库为空</p>}
                        {globalCharacters.map(gc => (
                            <div key={gc.id} className="border border-gray-200 rounded-lg p-3 flex flex-col items-center gap-2">
                                <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden">
                                    {gc.referenceImage ? <img src={gc.referenceImage} className="w-full h-full object-cover" /> : <UsersIcon size={24}/>}
                                </div>
                                <span className="font-bold text-sm">{gc.name}</span>
                                <Button size="sm" onClick={() => { onImportFromGlobal(gc); setIsGlobalImportOpen(false); }}>导入</Button>
                            </div>
                        ))}
                   </div>
              </div>
          </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <h2 className="text-xl font-bold">{editingId ? '编辑角色' : '新建角色'}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
                            <input 
                                type="text" 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                value={newChar.name || ''}
                                onChange={e => setNewChar({...newChar, name: e.target.value})}
                                placeholder="例如：陈侦探"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">外貌描述 (中文)</label>
                            <textarea 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32 resize-none focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                placeholder="30岁男性，黑色风衣，短发，冷峻表情..."
                                value={newChar.description || ''}
                                onChange={e => setNewChar({...newChar, description: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">参考图</label>
                        <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
                            {newChar.referenceImage ? (
                                <img src={newChar.referenceImage} alt="Ref" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-4">
                                    <ImageIcon className="mx-auto text-gray-300 mb-2" size={32} />
                                    <p className="text-xs text-gray-500">上传或AI生成</p>
                                </div>
                            )}
                            {isGenerating && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                             <div className="grid grid-cols-2 gap-2">
                                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={14} className="mr-2" /> 本地上传
                                </Button>
                                <div className="flex items-center gap-1">
                                    <select 
                                        className="text-xs border border-gray-300 rounded px-1 py-1.5 bg-white flex-1"
                                        value={genRatio}
                                        onChange={(e) => setGenRatio(e.target.value as AspectRatio)}
                                    >
                                        {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <Button size="sm" onClick={handleGenerateReference} disabled={!newChar.description || isGenerating} className="flex-1">
                                        <Wand2 size={14} className="mr-1" /> AI生图
                                    </Button>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end space-x-3">
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>取消</Button>
                    <Button onClick={handleSubmit} disabled={!newChar.name || !newChar.description}>
                        <Save size={16} className="mr-2" /> 保存角色
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Image Previewer */}
      <ImageViewer 
        isOpen={!!previewImage} 
        imageUrl={previewImage || ''} 
        onClose={() => setPreviewImage(null)} 
      />
    </div>
  );
};

const UsersIcon = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);