
import React, { useState } from 'react';
import { Activity, CheckCircle, AlertCircle, Banana, Key, ArrowRight, Lock } from 'lucide-react';
import { storage } from '../utils/storage';

interface AuthModalProps {
  onAuthenticated: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthenticated }) => {
  const [keyCode, setKeyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async () => {
    if (!keyCode.trim()) {
        setErrorMsg('请输入卡密');
        return;
    }
    
    setIsVerifying(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Setup Timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s Timeout

    try {
        let hwId = localStorage.getItem('hw_id');
        if (!hwId) {
            hwId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('hw_id', hwId);
        }

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyCode: keyCode.trim(), hardwareId: hwId }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await res.json();

        if (res.ok) {
            storage.setAuth(data.token, data.user);
            setSuccessMsg('验证通过');
            
            // IMMEDIATE JUMP: Reduced delay from 800ms to 100ms
            setTimeout(() => {
                onAuthenticated();
            }, 100);
        } else {
            setErrorMsg(data.error || '登录失败');
            setIsVerifying(false);
        }

    } catch (e: any) {
        if (e.name === 'AbortError') {
            setErrorMsg('连接超时，请检查网络');
        } else {
            setErrorMsg('无法连接到服务器');
        }
        setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-hidden">
        {/* Decorative Background Blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--brand-color)] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Card Container */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-white/40 relative z-10">
            
            {/* Top Brand Area */}
            <div className="relative pt-10 pb-6 flex flex-col items-center">
                <div className="w-20 h-20 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/30 mb-5 transform hover:scale-110 transition-all duration-500 cursor-default group">
                    <Banana size={48} className="text-white fill-white/20 animate-bounce" />
                </div>

                <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-1">
                    欢迎登录
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                    香蕉 AI 智能分镜系统
                </p>
            </div>

            {/* Input Area */}
            <div className="px-8 pb-8 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase tracking-wider">Access Key (卡密)</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Key className="text-gray-400 group-focus-within:text-[var(--brand-color)] transition-colors" size={18} />
                        </div>
                        <input 
                            type="text" 
                            value={keyCode}
                            onChange={(e) => {
                                setKeyCode(e.target.value);
                                setErrorMsg('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-[var(--brand-color)]/20 focus:border-[var(--brand-color)] outline-none transition-all font-mono text-gray-800 font-bold placeholder-gray-400 text-base shadow-inner"
                            placeholder="BJ-XXXX-XXXX-XXXX"
                        />
                    </div>
                </div>

                {/* Messages */}
                {errorMsg && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2 border border-red-100">
                        <AlertCircle size={18} className="shrink-0" />
                        <span className="font-medium">{errorMsg}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2 border border-green-100">
                        <CheckCircle size={18} className="shrink-0" />
                        <span className="font-medium">{successMsg}</span>
                    </div>
                )}

                {/* Big Login Button */}
                <button 
                    onClick={handleLogin} 
                    disabled={isVerifying || !keyCode}
                    className="w-full group relative py-4 bg-gradient-to-r from-[var(--brand-color)] to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                        {isVerifying ? (
                            <>
                                <Activity className="animate-spin" size={20} />
                                <span>验证中...</span>
                            </>
                        ) : (
                            <>
                                <span className="text-lg">立即登录</span>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </div>
                    {/* Button Shine Effect */}
                    <div className="absolute inset-0 h-full w-full bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                </button>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1.5 font-medium">
                    <Lock size={10} />
                    安全加密连接 · 请联系管理员获取卡密
                </p>
            </div>
        </div>
    </div>
  );
};
