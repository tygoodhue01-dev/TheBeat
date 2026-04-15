import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getNewsDetailApi } from '../services/api';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowLeft } from 'lucide-react';
import { formatDateCentral } from '../utils/time';

export default function NewsDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getNewsDetailApi(id).then(setArticle).catch(() => setError('Article not found'));
  }, [id]);

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
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
