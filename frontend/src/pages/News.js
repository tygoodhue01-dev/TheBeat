import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNewsApi } from '../services/api';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';

const CATEGORIES = ['all', 'music', 'events', 'local', 'contests'];

export default function News() {
  const [news, setNews] = useState([]);
  const [cat, setCat] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getNewsApi(cat === 'all' ? '' : cat).then(d => { setNews(d); setLoading(false); });
  }, [cat]);

  return (
    <div data-testid="news-page">
      <WebNavBar />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <h1 className="text-[24px] sm:text-[28px] font-black text-white tracking-[3px] font-display">NEWS</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Stay in the loop with The Beat 515</p>

        <div className="flex gap-2 mt-6 overflow-x-auto pb-2" data-testid="news-category-filter">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} data-testid={`news-filter-${c}`}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-[1px] whitespace-nowrap border transition-all
                ${cat === c ? 'bg-[#FF007F] border-[#FF007F] text-white' : 'bg-[#18181b] border-[rgba(255,255,255,0.1)] text-[#a1a1aa] hover:bg-[#27272a]'}`}>
              {c.toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#71717a]">Loading...</div>
        ) : news.length === 0 ? (
          <div className="text-center py-16 text-[#71717a]">No news articles yet</div>
        ) : (
          <div className="flex flex-wrap gap-5 mt-6">
            {/* Featured first article */}
            {news.length > 0 && (
              <Link to={`/news/${news[0].news_id}`} className="w-full rounded-xl overflow-hidden h-[260px] sm:h-[320px] relative group" data-testid="featured-news">
                {news[0].image_url ? (
                  <img src={news[0].image_url} alt={news[0].title} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full bg-[#27272a] rounded-xl" />
                )}
                <div className="absolute inset-0 bg-black/45 rounded-xl" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-7">
                  <span className="text-[11px] font-bold text-[#00F0FF] tracking-[2px]">{news[0].category?.toUpperCase()}</span>
                  <span className="text-[11px] text-[#71717a] ml-4">{new Date(news[0].created_at).toLocaleDateString()}</span>
                  <h3 className="text-[20px] sm:text-[28px] font-extrabold text-white mt-1.5 group-hover:text-[#FF007F] transition-colors">{news[0].title}</h3>
                  <p className="text-sm text-white/70 mt-2 leading-5">{news[0].summary}</p>
                  <p className="text-xs text-[#71717a] mt-2">By {news[0].author_name}</p>
                </div>
              </Link>
            )}

            {/* Grid */}
            {news.slice(1).map(a => (
              <Link key={a.news_id} to={`/news/${a.news_id}`}
                className="w-full sm:w-[48%] lg:w-[31%] min-w-0 bg-[#18181b] rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)] group" data-testid={`news-item-${a.news_id}`}>
                {a.image_url && (
                  <img src={a.image_url} alt={a.title} className="w-full h-[160px] object-cover" />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-[#00F0FF] tracking-[2px]">{a.category?.toUpperCase()}</span>
                    <span className="text-[10px] text-[#71717a]">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-[#FF007F] transition-colors">{a.title}</h4>
                  <p className="text-xs text-[#a1a1aa] mt-2 leading-5 line-clamp-2">{a.summary}</p>
                  <p className="text-xs text-[#71717a] mt-2">By {a.author_name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
