
import React from 'react';
import { Home, Users, Settings, PenTool, LayoutDashboard, Banana } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    const isActive = currentView === view;
    return (
        <button
            onClick={() => onChangeView(view)}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
              isActive 
                ? 'bg-[var(--brand-color)] text-white shadow-lg shadow-[var(--brand-color)]/30 translate-x-1' 
                : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'
            }`}
        >
            <Icon size={20} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span className={`font-medium tracking-wide ${isActive ? 'font-bold' : ''}`}>{label}</span>
        </button>
    );
  };

  return (
    <div className="w-72 bg-slate-50/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col h-screen fixed left-0 top-0 z-30 shadow-sm">
      {/* Brand */}
      <div className="p-8 flex items-center space-x-3">
        <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-yellow-500/20 shrink-0">
          <Banana size={28} className="text-white fill-white/20 animate-bounce" />
        </div>
        <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">香蕉 AI</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">NanoBanana Pro</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 mb-8">
        <button 
            onClick={() => onChangeView('drafts')}
            className="w-full bg-white border border-slate-200 text-slate-700 hover:border-[var(--brand-color)] hover:text-[var(--brand-color)] py-4 rounded-2xl flex items-center justify-center space-x-2 font-bold shadow-sm hover:shadow-md transition-all group"
        >
            <PenTool size={18} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            <span>开始新创作</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        <div className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">工作台</div>
        <NavItem view="drafts" icon={LayoutDashboard} label="我的草稿" />
        <NavItem view="characters" icon={Users} label="主体角色库" />
        
        <div className="pt-6 mt-6 border-t border-slate-200/60">
            <div className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">系统</div>
            <button 
                onClick={() => onChangeView('settings')}
                className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all duration-200"
            >
                <Settings size={20} className="text-slate-400" />
                <span className="font-medium tracking-wide">系统设置</span>
            </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-6">
         <div className="bg-slate-100 rounded-xl p-4 flex items-center space-x-3 border border-slate-200">
             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                 V3
             </div>
             <div className="flex-1 overflow-hidden">
                 <div className="text-xs font-bold text-slate-700 truncate">本地离线版</div>
                 <div className="text-[10px] text-slate-400 truncate">数据存储在本地</div>
             </div>
         </div>
      </div>
    </div>
  );
};
