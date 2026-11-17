import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Cpu,
  Database,
  Save,
  Eye,
  EyeOff,
  Settings,
  CheckCircle2,
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
        if (res.data?.success) {
          setHealth(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch health info:', err);
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

      if (res?.success) {
        showToast('success', 'AI settings updated successfully!');
      } else {
        showToast('error', 'Failed to save settings');
      }
    } catch (err) {
      showToast('error', 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <Settings className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Settings & AI Configuration</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Configure your LLM model preferences, manage optional personal API keys, and review vector infrastructure.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="card p-6 border border-slate-200 bg-white shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-brand-600" />
          <span>User Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Full Name</span>
            <span className="font-semibold text-slate-800">{user?.name || 'User'}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Email Address</span>
            <span className="font-semibold text-slate-800 truncate block">{user?.email}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Account Created</span>
            <span className="font-semibold text-slate-700">{formatDate(user?.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* LLM & AI Provider Configuration Form */}
      <div className="card p-6 border border-slate-200 bg-white shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>LLM Provider & Generation Options</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                LLM Provider
              </label>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  if (e.target.value === 'gemini') setModel('gemini-1.5-flash');
                  if (e.target.value === 'openai') setModel('gpt-4o-mini');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:border-brand-500 focus:bg-white"
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="local">Local Contextual Fallback (Offline)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Model Name
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:border-brand-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              API Key (Optional personal override)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Gemini or OpenAI API key here..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 focus:bg-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              If left blank, the server-configured environment variable key will be used, or the system will automatically synthesize answers via the built-in intelligent fallback.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </div>

      {/* System Infrastructure Details */}
      <div className="card p-6 border border-slate-200 bg-white shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>Vector & Retrieval Infrastructure</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Vector Store Engine</span>
            <span className="font-semibold text-slate-800">
              {health?.vectorStore?.activeProvider || health?.vectorStore?.info?.provider || 'ChromaDB / Local'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Chunk Configuration</span>
            <span className="font-semibold text-slate-800">1000 chars / 150 overlap</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 block mb-1">Top-K Retrieval</span>
            <span className="font-semibold text-slate-800">5 chunks per query</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
