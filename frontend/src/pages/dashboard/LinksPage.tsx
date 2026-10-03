import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  Send,
  Plus,
  Globe,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { useTransfers } from '../../context/TransferContext';
import { useAuth } from '../../context/AuthContext';
import { LinkItem } from '../../types';

export const LinksPage: React.FC = () => {
  const { currentDevice } = useAuth();
  const { devices, initiateTransfer } = useTransfers();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = async () => {
    try {
      const res = await api.links.list();
      setLinks(res.links);
    } catch (e) {
      console.warn('Error fetching links:', e);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      const res = await api.links.create({ url: url.trim(), title: title.trim() || undefined });
      setLinks((prev) => [res.link, ...prev]);
      setUrl('');
      setTitle('');
    } catch (e) {
      alert('Failed to save link. Please check URL format.');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = (linkUrl: string, id: string) => {
    navigator.clipboard.writeText(linkUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.links.delete(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      alert('Failed to delete link');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-heading font-bold text-white">Link Sharing</h2>
        <p className="text-xs text-[#8B95A7] mt-1">
          Instantly push web URLs and rich link previews across all your connected devices.
        </p>
      </div>

      {/* Add Link Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 shadow-2xl">
        <form onSubmit={handleAddLink} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Website URL</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm pl-10"
                />
                <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Title / Note (optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reference article"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Save Link to Workspace</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Shared Links List */}
      <div className="space-y-4">
        <h3 className="text-base font-heading font-semibold text-white">Workspace Links</h3>
        {links.length === 0 ? (
          <div className="p-12 text-center rounded-2xl glass-card text-gray-500 text-xs">
            No links shared yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {links.map((link) => (
              <div
                key={link.id}
                className="p-5 rounded-2xl glass-card border border-white/5 flex flex-col justify-between hover:border-cyan-500/30 transition group"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={link.faviconUrl || `https://www.google.com/s2/favicons?domain=${link.domain}&sz=64`}
                      alt={link.domain}
                      className="w-6 h-6 rounded-md bg-white/10 p-0.5"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs font-mono text-cyan-400 font-medium">{link.domain}</span>
                  </div>

                  <h4 className="text-sm font-semibold text-white line-clamp-1 mb-1">
                    {link.title || link.domain}
                  </h4>
                  <p className="text-xs text-gray-400 truncate font-mono">{link.url}</p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                      title="Open link in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => copyUrl(link.url, link.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-white/10 transition"
                      title="Copy URL"
                    >
                      {copiedId === link.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition"
                    title="Delete link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
