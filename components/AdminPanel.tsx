import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { RefreshCw, Trash2, Copy, Plus, X, Search } from 'lucide-react';
import { storage } from '../utils/storage';

interface AdminPanelProps {
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Generate Form
    const [genCount, setGenCount] = useState(1);
    const [genDays, setGenDays] = useState(30);
    const [genPrefix, setGenPrefix] = useState('BJ');

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('baojian_auth_token');
            const res = await fetch('/api/admin/keys', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setKeys(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        const token = localStorage.getItem('baojian_auth_token');
        const res = await fetch('/api/admin/generate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ count: genCount, days: genDays, prefix: genPrefix })
        });
        if (res.ok) {
            fetchKeys();
        }
    };

    const handleDelete = async (code: string) => {
        if (!confirm('确定删除此卡密？')) return;
        const token = localStorage.getItem('baojian_auth_token');
        await fetch(`/api/admin/keys/${code}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchKeys();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('已复制');
    };

    const formatDate = (ts: number) => ts ? new Date(ts).toLocaleDateString() : '-';

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-lg text-gray-800">卡密管理后台</h2>
                    <button onClick={onClose}><X /></button>
                </div>

                <div className="p-4 grid grid-cols-4 gap-4 bg-white border-b border-gray-100">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">生成数量</label>
                        <input type="number" value={genCount} onChange={e => setGenCount(Number(e.target.value))} className="border rounded p-1" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">有效期(天)</label>
                        <input type="number" value={genDays} onChange={e => setGenDays(Number(e.target.value))} className="border rounded p-1" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">前缀</label>
                        <input value={genPrefix} onChange={e => setGenPrefix(e.target.value)} className="border rounded p-1" />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleGenerate} className="w-full"><Plus size={16} className="mr-2"/> 生成卡密</Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                            <tr>
                                <th className="p-3">卡密</th>
                                <th className="p-3">状态</th>
                                <th className="p-3">天数</th>
                                <th className="p-3">生成时间</th>
                                <th className="p-3">激活时间</th>
                                <th className="p-3">过期时间</th>
                                <th className="p-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {keys.map(key => (
                                <tr key={key.key_code} className="hover:bg-gray-50">
                                    <td className="p-3 font-mono cursor-pointer" onClick={() => copyToClipboard(key.key_code)} title="点击复制">
                                        {key.key_code}
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                            key.status === 'unused' ? 'bg-blue-100 text-blue-700' :
                                            key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {key.status === 'unused' ? '未激活' : key.status === 'active' ? '使用中' : '已过期'}
                                        </span>
                                    </td>
                                    <td className="p-3">{key.duration_days}</td>
                                    <td className="p-3 text-gray-500">{formatDate(key.created_at)}</td>
                                    <td className="p-3 text-gray-500">{formatDate(key.activated_at)}</td>
                                    <td className="p-3 text-gray-500">{formatDate(key.expires_at)}</td>
                                    <td className="p-3 text-right flex justify-end gap-2">
                                        <button onClick={() => copyToClipboard(key.key_code)} className="p-1 hover:bg-gray-200 rounded"><Copy size={14}/></button>
                                        <button onClick={() => handleDelete(key.key_code)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {loading && <div className="text-center py-4">加载中...</div>}
                </div>
            </div>
        </div>
    );
};