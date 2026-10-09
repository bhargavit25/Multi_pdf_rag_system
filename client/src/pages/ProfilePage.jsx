import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Cpu,
  Key,
  Database,
  Layers,
  Save,
  CheckCircle2,
  Sliders,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { formatDate } from '../utils/formatters';
import api from '../services/api';

export function ProfilePage() {
  const { user, updatePreferences } = useAuth();
  const { showToast } = useToast();

  const [provider, setProvider] = useState(user?.apiKeyPreferences?.llmProvider || 'gemini');
  const [apiKey, setApiKey] = useState(user?.apiKeyPreferences?.llmApiKey || '');
  const [model, setModel] = useState(user?.apiKeyPreferences?.llmModel || 'gemini-1.5-flash');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    if (user?.apiKeyPreferences) {
      if (user.apiKeyPreferences.llmProvider) setProvider(user.apiKeyPreferences.llmProvider);
      if (user.apiKeyPreferences.llmApiKey) setApiKey(user.apiKeyPreferences.llmApiKey);
      if (user.apiKeyPreferences.llmModel) setModel(user.apiKeyPreferences.llmModel);
    }
  }, [user]);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data.success) {
          setHealth(res.data.data);
        }
      } catch {
        // silent
      }
    };
    fetchHealth();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updatePreferences({
        llmProvider: provider,
        llmApiKey: apiKey.trim(),
        llmModel: model,
      });

      if (res.success) {
        showToast('AI preferences saved successfully!', 'success');
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch {
      showToast('An error occurred while saving', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Profile & AI Model Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Configure your LLM provider, manage personal API keys, and review vector infrastructure.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-brand-400" />
          <span>User Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Full Name</span>
            <span className="font-semibold text-white">{user?.name || 'User'}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Email Address</span>
            <span className="font-semibold text-white truncate block">{user?.email}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Member Since</span>
            <span className="font-semibold text-slate-300">{formatDate(user?.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* LLM & AI Provider Configuration Form */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>LLM Provider & RAG Configuration</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                LLM Provider
              </label>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  if (e.target.value === 'gemini') setModel('gemini-1.5-flash');
                  if (e.target.value === 'openai') setModel('gpt-4o-mini');
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="local">Local Contextual Fallback (Offline)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Model Name
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash'}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              API Key (Optional personal key override)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Gemini or OpenAI API key here..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              If left blank, the server's environment variable key will be used, or the system will automatically synthesize answers via the built-in RAG fallback.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              icon={Save}
              loading={saving}
            >
              Save AI Settings
            </Button>
          </div>
        </form>
      </div>

      {/* System Infrastructure Details */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>RAG Infrastructure Status</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Vector Store Engine</span>
            <span className="font-semibold text-white">
              {health?.vectorStore?.info?.provider || 'ChromaDB / Local'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Chunk Parameters</span>
            <span className="font-semibold text-white">1000 chars / 150 overlap</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-400 block mb-1">Retrieval Top-K</span>
            <span className="font-semibold text-white">5 chunks per query</span>
          </div>
        </div>
      </div>
    </div>
  );
}
