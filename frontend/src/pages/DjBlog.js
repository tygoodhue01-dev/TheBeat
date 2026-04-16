import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mic2 } from 'lucide-react';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { getDjDetailApi, getNewsApi, mediaUrl } from '../services/api';
import { formatDateCentral } from '../utils/time';

export default function DjBlog() {
  const { id } = useParams();
  const [dj, setDj] = useState(null);
  const [allNews, setAllNews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    Promise.all([getDjDetailApi(id), getNewsApi()])
      .then(([djData, news]) => {
        setDj(djData);
        setAllNews(Array.isArray(news) ? news : []);
      })
      .catch(() => setError('DJ profile not found'));
  }, [id]);

  const djPosts = useMemo(() => {
    if (!dj) return [];
    return allNews.filter((n) => n.author_id === dj.user_id || n.author_name === dj.name);
  }, [allNews, dj]);

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
                    <Link key={post.news_id} to={`/news/${post.news_id}`} className="block bg-[#18181b] rounded-xl p-4 border border-[rgba(255,255,255,0.1)] hover:border-[#FF007F]/40 transition-colors">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-[10px] font-bold text-[#00F0FF] tracking-[1.5px]">{post.category?.toUpperCase()}</span>
                        <span className="text-[11px] text-[#71717a]">{formatDateCentral(post.created_at)}</span>
                      </div>
                      <h3 className="text-base font-bold text-white">{post.title}</h3>
                      <p className="text-sm text-[#a1a1aa] mt-1 line-clamp-2">{post.summary || ''}</p>
                    </Link>
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
