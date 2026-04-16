import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getNewsDetailApi, getCommentsApi, createCommentApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowLeft } from 'lucide-react';
import { formatDateCentral } from '../utils/time';

export default function NewsDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getNewsDetailApi(id).then(setArticle).catch(() => setError('Article not found'));
  }, [id]);

  useEffect(() => {
    getCommentsApi('news', id).then(setComments).catch(() => setComments([]));
  }, [id]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const content = commentText.trim();
    if (!content || commentLoading) return;
    setCommentLoading(true);
    setCommentStatus('');
    try {
      await createCommentApi({ post_type: 'news', post_id: id, content });
      setCommentText('');
      setCommentStatus('Comment submitted. It will appear after approval.');
    } catch (err) {
      setCommentStatus(err.message || 'Could not submit comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <div data-testid="news-detail-page">
      <WebNavBar />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Link to="/news" className="inline-flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-[#FF007F] mb-6 transition-colors" data-testid="news-back-btn">
          <ArrowLeft size={16} /> Back to News
        </Link>
        {error ? (
          <p className="text-center text-[#71717a] py-16">{error}</p>
        ) : !article ? (
          <p className="text-center text-[#71717a] py-16">Loading...</p>
        ) : (
          <>
            {article.image_url && (
              <img src={article.image_url} alt={article.title} className="w-full h-[220px] sm:h-[280px] object-cover rounded-xl mb-6" />
            )}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
              <span className="text-[11px] font-bold text-[#00F0FF] tracking-[2px]">{article.category?.toUpperCase()}</span>
              <span className="text-xs text-[#71717a]">{formatDateCentral(article.created_at)}</span>
              <span className="text-xs text-[#71717a]">By {article.author_name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 font-display" data-testid="news-detail-title">{article.title}</h1>
            <div className="text-[#a1a1aa] leading-relaxed whitespace-pre-wrap" data-testid="news-detail-content">
              {article.content}
            </div>
            <section className="mt-10 pt-8 border-t border-[rgba(255,255,255,0.08)]" data-testid="news-comments-section">
              <h2 className="text-lg font-extrabold text-white tracking-[1px] mb-4">Comments</h2>
              {user ? (
                <form onSubmit={handleSubmitComment} className="mb-6">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    maxLength={800}
                    placeholder="Share your thoughts..."
                    className="w-full bg-[#18181b] border border-[rgba(255,255,255,0.12)] rounded-lg px-4 py-3 text-sm text-white placeholder:text-[#71717a] focus:border-[#FF007F] focus:outline-none resize-none"
                    data-testid="news-comment-input"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-[#71717a]">{commentText.length}/800</span>
                    <button
                      type="submit"
                      disabled={commentLoading || !commentText.trim()}
                      className="rounded-full bg-[#FF007F] px-4 py-2 text-[11px] font-extrabold tracking-[1px] text-white disabled:opacity-50"
                      data-testid="news-comment-submit"
                    >
                      {commentLoading ? 'POSTING...' : 'POST COMMENT'}
                    </button>
                  </div>
                  {commentStatus ? <p className="text-xs text-[#a1a1aa] mt-2">{commentStatus}</p> : null}
                </form>
              ) : (
                <p className="text-sm text-[#71717a] mb-6">
                  <Link to="/login" className="text-[#00F0FF] hover:underline">Sign in</Link> to leave a comment.
                </p>
              )}
              {comments.length === 0 ? (
                <p className="text-sm text-[#71717a]">No comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.comment_id} className="bg-[#18181b] border border-[rgba(255,255,255,0.08)] rounded-lg p-3.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-white">{c.user_name || 'Listener'}</p>
                        <p className="text-[11px] text-[#71717a]">{formatDateCentral(c.created_at)}</p>
                      </div>
                      <p className="text-sm text-[#a1a1aa] whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
