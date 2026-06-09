import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sectionsService } from '../../services/sectionsService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PhotoViewer } from '../../components/Lightbox/PhotoViewer';

export const SectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  useEffect(() => {
    loadSection();
  }, [id]);

  const loadSection = async () => {
    setLoading(true);
    try {
      const data = await sectionsService.getSection(Number(id));
      setSection(data);
      localStorage.setItem(`page_title_/sections/${id}`, data.title);
    } catch (error) {
      console.error('Ошибка загрузки раздела:', error);
      navigate('/sections');
    } finally {
      setLoading(false);
    }
  };

  const getPhotos = () => {
    if (!section) return [];
    const photos = [];
    for (let i = 1; i <= 7; i++) {
      const photoKey = i === 1 ? 'photo_id' : `photo_id${i}`;
      const photo = section[photoKey];
      if (photo) {
        photos.push(photo);
      }
    }
    return photos;
  };

  const photos = getPhotos();

  const openPhotoViewer = (index: number) => {
    setCurrentPhotoIndex(index);
    setShowPhotoViewer(true);
  };

  const nextPhoto = () => {
    if (photos.length === 0) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    if (photos.length === 0) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!section) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/sections')}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Назад к списку
      </button>

      <div className="card overflow-hidden">
        <div className="p-8">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">{section.title}</h1>
          
          {photos.length > 0 && (
            <div className="mb-6">
              <div className="relative bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
                {photos.length > 1 && (
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition z-10"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={() => openPhotoViewer(currentPhotoIndex)}
                  className="cursor-pointer group relative"
                >
                  <img
                    src={`/assets/${photos[currentPhotoIndex]}`}
                    alt={`Фото ${currentPhotoIndex + 1}`}
                    className="w-full object-contain max-h-96 transition-transform duration-200 group-hover:scale-[1.02]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/800x400/e2e8f0/64748b?text=No+Image';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-sm bg-black/50 px-3 py-1 rounded-full transition">
                      🔍 Нажмите для увеличения
                    </span>
                  </div>
                </button>

                {photos.length > 1 && (
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition z-10"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>

              {photos.length > 1 && (
                <div className="flex justify-center gap-2 mt-3">
                  {photos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`w-2 h-2 rounded-full transition ${
                        idx === currentPhotoIndex ? 'bg-blue-600 w-6' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Полноэкранный просмотр фото */}
      {showPhotoViewer && (
        <PhotoViewer
          photos={photos}
          initialIndex={currentPhotoIndex}
          onClose={() => setShowPhotoViewer(false)}
        />
      )}
    </div>
  );
};
