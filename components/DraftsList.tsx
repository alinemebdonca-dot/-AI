import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { Button } from './Button';
import { Search, Plus, Trash2, Edit2, FileText, CheckSquare, Upload, Clock, Image as ImageIcon, MoreVertical, Film } from 'lucide-react';

interface DraftsListProps {
  projects: Project[];
  onDelete: (id: string) => void;
  onEdit: (project: Project) => void;
  onCreate: (name: string, srtFile: File | null) => void;
}

export const DraftsList: React.FC<DraftsListProps> = ({ projects, onDelete, onEdit, onCreate }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (ts: number) => {
      const d = new Date(ts);
      return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleCreateSubmit = () => {
      const name = newProjectName.trim() || `草稿 ${projects.length + 1}`;
      onCreate(name, srtFile);
      setIsCreateModalOpen(false);
      setNewProjectName('');
      setSrtFile(null);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">创作草稿箱</h1>
            <p className="text-slate-500 font-medium">管理您的分镜脚本项目</p>
        </div>
        <div className="flex items-center space-x-3">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--brand-color)] transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="搜索草稿..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)] focus:border-transparent outline-none w-64 text-sm shadow-sm transition-all"
                />
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="py-2.5 px-6 rounded-xl shadow-lg shadow-[var(--brand-color)]/30 hover:-translate-y-0.5 transition-transform">
                <Plus size={20} className="mr-2" />
                新建剧本
            </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Create Card */}
        <div 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--brand-color)] hover:bg-[var(--brand-color)]/5 transition-all group min-h-[240px]"
        >
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Plus size={32} className="text-slate-400 group-hover:text-[var(--brand-color)] transition-colors" />
            </div>
            <h3 className="font-bold text-slate-500 group-hover:text-[var(--brand-color)]">创建新项目</h3>
        </div>

        {/* Project Cards */}
        {filteredProjects.map((project) => (
            <div 
                key={project.id} 
                onClick={() => onEdit(project)}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all group relative flex flex-col min-h-[240px]"
            >
                {/* Status Dot */}
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-indigo-500">
                        <Film size={24} />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            title="删除"
                         >
                             <Trash2 size={16} />
                         </button>
                    </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 leading-tight group-hover:text-[var(--brand-color)] transition-colors">
                    {project.name}
                </h3>

                <div className="mt-auto space-y-3">
                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 bg-slate-50 p-3 rounded-lg">
                        <div className="flex items-center gap-1.5">
                            <FileText size={14} className="text-slate-400"/>
                            <span>{project.frames.length} 镜</span>
                        </div>
                        <div className="w-px h-3 bg-slate-300"></div>
                        <div className="flex items-center gap-1.5">
                            <ImageIcon size={14} className="text-slate-400"/>
                            <span>{project.frames.filter(f=>f.imageUrl).length} 图</span>
                        </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{formatDate(project.updatedAt)}</span>
                        </div>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                            {project.status || '进行中'}
                        </span>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
          <div className="text-center py-20">
              <p className="text-slate-400">未找到相关草稿</p>
          </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in-95">
                  <h3 className="font-bold text-2xl mb-6 text-slate-800">新建分镜剧本</h3>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">剧本名称</label>
                          <input 
                              type="text" 
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--brand-color)] focus:bg-white outline-none transition-all font-medium"
                              placeholder="例如：赛博朋克 2077 先导片"
                              value={newProjectName}
                              onChange={e => setNewProjectName(e.target.value)}
                              autoFocus
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">初始导入 (可选)</label>
                          <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${srtFile ? 'border-green-400 bg-green-50/50' : 'border-slate-300 hover:border-[var(--brand-color)] hover:bg-[var(--brand-color)]/5'}`}>
                                <input type="file" accept=".srt" hidden onChange={e => setSrtFile(e.target.files?.[0] || null)} />
                                {srtFile ? (
                                    <div className="text-center animate-in fade-in zoom-in">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-600">
                                            <CheckSquare size={20} />
                                        </div>
                                        <span className="text-sm text-green-700 font-bold block max-w-[200px] truncate px-2">{srtFile.name}</span>
                                        <span className="text-xs text-green-600">点击更换文件</span>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <Upload className="mx-auto mb-2 opacity-50" size={24} />
                                        <span className="text-sm font-medium">点击上传 .srt 字幕文件</span>
                                        <p className="text-xs opacity-60 mt-1">自动识别时间轴生成分镜</p>
                                    </div>
                                )}
                          </label>
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8">
                      <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="text-slate-500">取消</Button>
                      <Button onClick={handleCreateSubmit} className="shadow-lg shadow-[var(--brand-color)]/20">开始创作</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};