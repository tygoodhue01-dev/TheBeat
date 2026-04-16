import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createDjPostApi, deleteDjPostApi, getMyDjPostsApi, updateDjPostApi } from '../services/api';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { formatDateCentral } from '../utils/time';

const CATS = ['general', 'music', 'events', 'local', 'contests'];

export default function DjBlogManager() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    const roles = Array.isArray(user?.roles) && user.roles.length ? user.roles : [user?.role || 'listener'];
    if (!user || !roles.includes('dj')) {
      navigate('/');
      return;
    }
    getMyDjPostsApi().then(setPosts).finally(() => setLoading(false));
  }, [authLoading, user, navigate]);

  const savePost = async () => {
    if (!editing?.title || !editing?.content) return alert('Title and content are required');
    try {
      if (editing.news_id) {
        const updated = await updateDjPostApi(editing.news_id, editing);
        setPosts((curr) => curr.map((p) => (p.news_id === updated.news_id ? updated : p)));
      } else {
        const created = await createDjPostApi(editing);
        setPosts((curr) => [created, ...curr]);
      }
      setEditing(null);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div data-testid="dj-blog-manager-page">
      <WebNavBar />
      <main className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-[1px]">DJ Blog Manager</h1>
            <p className="text-sm text-[#a1a1aa] mt-1">Create and manage blog posts tied to your DJ profile.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing({ title: '', summary: '', content: '', category: 'general', image_url: '' })}
            className="inline-flex items-center gap-2 rounded-full bg-[#FF007F] px-4 py-2 text-xs font-extrabold tracking-[1px] text-white"
            data-testid="dj-blog-new-post"
          >
            <Plus size={14} /> NEW POST
          </button>
        </div>

        {loading ? (
          <p className="text-[#71717a]">Loading posts...</p>
        ) : posts.length === 0 ? (
          <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)]">
            <p className="text-[#71717a] text-sm">No blog posts yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.news_id} className="bg-[#18181b] rounded-xl p-4 border border-[rgba(255,255,255,0.1)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[1.5px] text-[#00F0FF]">{p.category?.toUpperCase()}</p>
                    <h3 className="text-base font-bold text-white truncate">{p.title}</h3>
                    <p className="text-[11px] text-[#71717a] mt-1">{formatDateCentral(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={`/news/${p.news_id}`} className="px-2 py-1 text-[11px] text-[#a1a1aa] hover:text-white">View</Link>
                    <button type="button" onClick={() => setEditing({ ...p })} className="p-1.5 hover:bg-white/5 rounded">
                      <Edit3 size={14} className="text-[#00F0FF]" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Delete "${p.title}"?`)) return;
                        await deleteDjPostApi(p.news_id);
                        setPosts((curr) => curr.filter((x) => x.news_id !== p.news_id));
                      }}
                      className="p-1.5 hover:bg-white/5 rounded"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editing && (
        <div className="fixed inset-0 z-[240] bg-black/75 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-[700px] rounded-xl border border-white/10 bg-[#18181b] p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold text-white mb-3">{editing.news_id ? 'Edit DJ Post' : 'New DJ Post'}</h2>
            <input
              value={editing.title || ''}
              onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))}
              placeholder="Post title"
              className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.12)] rounded-lg px-4 py-3 text-sm text-white focus:border-[#FF007F] focus:outline-none"
            />
            <input
              value={editing.summary || ''}
              onChange={(e) => setEditing((p) => ({ ...p, summary: e.target.value }))}
              placeholder="Short summary"
              className="w-full mt-2 bg-[#09090b] border border-[rgba(255,255,255,0.12)] rounded-lg px-4 py-3 text-sm text-white focus:border-[#FF007F] focus:outline-none"
            />
            <input
              value={editing.image_url || ''}
              onChange={(e) => setEditing((p) => ({ ...p, image_url: e.target.value }))}
              placeholder="Image URL (optional)"
              className="w-full mt-2 bg-[#09090b] border border-[rgba(255,255,255,0.12)] rounded-lg px-4 py-3 text-sm text-white focus:border-[#FF007F] focus:outline-none"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditing((p) => ({ ...p, category: c }))}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[1px] border ${editing.category===c ? 'bg-[#00F0FF] border-[#00F0FF] text-[#09090b]' : 'bg-[#09090b] border-[rgba(255,255,255,0.1)] text-[#71717a]'}`}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
            <textarea
              rows={8}
              value={editing.content || ''}
              onChange={(e) => setEditing((p) => ({ ...p, content: e.target.value }))}
              placeholder="Write your DJ blog post..."
              className="w-full mt-2 bg-[#09090b] border border-[rgba(255,255,255,0.12)] rounded-lg px-4 py-3 text-sm text-white focus:border-[#FF007F] focus:outline-none resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={savePost} className="flex-1 rounded-full bg-[#FF007F] py-2.5 text-xs font-extrabold tracking-[1px] text-white">SAVE POST</button>
              <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-full bg-[#27272a] py-2.5 text-xs font-extrabold tracking-[1px] text-white">CANCEL</button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
