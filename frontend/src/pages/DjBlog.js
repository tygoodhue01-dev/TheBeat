import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mic2 } from 'lucide-react';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { getDjDetailApi, getDjPostsApi, mediaUrl, getCommentsApi, createCommentApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDateCentral } from '../utils/time';

export default function DjBlog() {
  const { id } = useParams();
  const { user } = useAuth();
  const [dj, setDj] = useState(null);
  const [djPosts, setDjPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [draftByPost, setDraftByPost] = useState({});
  const [statusByPost, setStatusByPost] = useState({});
  const [submittingPostId, setSubmittingPostId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    Promise.all([getDjDetailApi(id), getDjPostsApi(id)])
      .then(([djData, posts]) => {
        setDj(djData);
        setDjPosts(Array.isArray(posts) ? posts : []);
      })
      .catch(() => setError('DJ profile not found'));
  }, [id]);

  useEffect(() => {
    if (!djPosts.length) {
      setCommentsByPost({});
      return;
    }
    Promise.all(
      djPosts.map((post) =>
        getCommentsApi('dj_post', post.post_id).then((items) => [post.post_id, items]).catch(() => [post.post_id, []])
      )
    ).then((entries) => {
      const next = {};
      entries.forEach(([postId, items]) => { next[postId] = items; });
      setCommentsByPost(next);
    });
  }, [djPosts]);

  const submitComment = async (postId) => {
    const content = (draftByPost[postId] || '').trim();
    if (!content || submittingPostId) return;
    setSubmittingPostId(postId);
    setStatusByPost((prev) => ({ ...prev, [postId]: '' }));
    try {
      await createCommentApi({ post_type: 'dj_post', post_id: postId, content });
      setDraftByPost((prev) => ({ ...prev, [postId]: '' }));
      setStatusByPost((prev) => ({ ...prev, [postId]: 'Comment submitted. It will appear after approval.' }));
    } catch (err) {
      setStatusByPost((prev) => ({ ...prev, [postId]: err.message || 'Could not submit comment.' }));
    } finally {
      setSubmittingPostId('');
    }
  };

  return (
    <div data-testid="dj-blog-page">
      <WebNavBar />
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-[#FF007F] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        {error ? (
          <p className="text-center text-[#71717a] py-16">{error}</p>
        ) : !dj ? (
          <p className="text-center text-[#71717a] py-16">Loading DJ profile...</p>
        ) : (
          <>
            <section className="bg-[#18181b] rounded-xl p-5 sm:p-6 border border-[rgba(255,255,255,0.1)]">
              <div className="flex items-center gap-4">
                {dj.avatar_url ? (
                  <img src={dj.avatar_data_url || mediaUrl(dj.avatar_url, dj.updated_at || dj.user_id)} alt={dj.name} className="w-20 h-20 rounded-full object-cover border border-[rgba(255,255,255,0.2)]" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#FF007F] flex items-center justify-center">
                    <span className="text-3xl font-black text-white">{dj.name?.charAt(0)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-[1px] truncate">{dj.name}</h1>
                  <p className="text-[11px] font-bold text-[#00F0FF] tracking-[2px] mt-1">DJ BLOG & PROFILE</p>
                  <p className="text-sm text-[#a1a1aa] mt-2 leading-relaxed">{dj.bio || 'On-air host at The Beat 515.'}</p>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Mic2 size={16} className="text-[#FF007F]" />
                <h2 className="text-lg font-extrabold text-white tracking-[1px]">Latest from {dj.name}</h2>
              </div>
              {djPosts.length === 0 ? (
                <div className="bg-[#18181b] rounded-xl p-6 border border-[rgba(255,255,255,0.1)]">
                  <p className="text-sm text-[#71717a]">No DJ posts yet. Check back soon.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {djPosts.map((post) => (
                    <article key={post.post_id} className="block bg-[#18181b] rounded-xl p-4 border border-[rgba(255,255,255,0.1)]">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-[10px] font-bold text-[#00F0FF] tracking-[1.5px]">{post.category?.toUpperCase()}</span>
                        <span className="text-[11px] text-[#71717a]">{formatDateCentral(post.created_at)}</span>
                      </div>
                      <h3 className="text-base font-bold text-white">{post.title}</h3>
                      <p className="text-sm text-[#a1a1aa] mt-1">{post.summary || ''}</p>
                      <p className="text-sm text-[#a1a1aa] mt-2 whitespace-pre-wrap">{post.content}</p>
                      <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                        <h4 className="text-xs font-extrabold tracking-[1.5px] text-white mb-2">COMMENTS</h4>
                        {user ? (
                          <div className="mb-3">
                            <textarea
                              value={draftByPost[post.post_id] || ''}
                              onChange={(e) => setDraftByPost((prev) => ({ ...prev, [post.post_id]: e.target.value }))}
                              rows={2}
                              maxLength={800}
                              placeholder="Write a comment..."
                              className="w-full bg-[#09090b] border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#71717a] focus:border-[#FF007F] focus:outline-none resize-none"
                            />
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[11px] text-[#71717a]">{(draftByPost[post.post_id] || '').length}/800</span>
                              <button
                                type="button"
                                onClick={() => submitComment(post.post_id)}
                                disabled={submittingPostId === post.post_id || !(draftByPost[post.post_id] || '').trim()}
                                className="rounded-full bg-[#FF007F] px-3 py-1.5 text-[10px] font-extrabold tracking-[1px] text-white disabled:opacity-50"
                              >
                                {submittingPostId === post.post_id ? 'POSTING...' : 'POST COMMENT'}
                              </button>
                            </div>
                            {statusByPost[post.post_id] ? <p className="text-[11px] text-[#a1a1aa] mt-1">{statusByPost[post.post_id]}</p> : null}
                          </div>
                        ) : (
                          <p className="text-[12px] text-[#71717a] mb-3">
                            <Link to="/login" className="text-[#00F0FF] hover:underline">Sign in</Link> to comment.
                          </p>
                        )}
                        {(commentsByPost[post.post_id] || []).length === 0 ? (
                          <p className="text-[12px] text-[#71717a]">No comments yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {(commentsByPost[post.post_id] || []).map((c) => (
                              <div key={c.comment_id} className="rounded-lg bg-[#09090b] border border-[rgba(255,255,255,0.08)] p-2.5">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <p className="text-[12px] font-bold text-white">{c.user_name || 'Listener'}</p>
                                  <p className="text-[10px] text-[#71717a]">{formatDateCentral(c.created_at)}</p>
                                </div>
                                <p className="text-[12px] text-[#a1a1aa] whitespace-pre-wrap">{c.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
