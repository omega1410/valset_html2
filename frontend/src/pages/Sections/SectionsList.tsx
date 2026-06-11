import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSections, useSearchSections } from '../../hooks/useSections';
import { SearchBar } from '../../components/Sections/SearchBar';
import { CardSkeleton } from '../../components/SkeletonLoader';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export const SectionsList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Обычные разделы
  const { data: sectionsData, isLoading: sectionsLoading } = useSections(currentPage, itemsPerPage);
  // Поиск
  const { data: searchResults, isLoading: searchLoading, isFetching } = useSearchSections(searchQuery);
  
  const isLoading = searchQuery ? searchLoading : sectionsLoading;
  
  // Безопасно получаем массив разделов
  const displayedSections = searchQuery 
    ? (searchResults || [])
    : (sectionsData?.items || []);
  
  const totalPages = searchQuery ? 1 : Math.ceil((sectionsData?.total || 0) / itemsPerPage);

  // ========== АВТО-ОБНОВЛЕНИЕ РАЗДЕЛОВ ==========
  useAutoRefresh({
    queryKeys: [['sections']],
    interval: 30000,
    enabled: !searchQuery,
  });

  const handleClear = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Обрезаем контент для превью
  const getPreviewContent = (content: string) => {
    return content.length > 120 ? content.substring(0, 120) + '...' : content;
  };

  // Компонент пагинации
  const Pagination = () => {
    if (totalPages <= 1) return null;
    
    const pageNumbers = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          ← Назад
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}
        
        {pageNumbers.map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 rounded-lg transition ${
              currentPage === page
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {page}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              {totalPages}
            </button>
          </>
        )}
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          Вперед →
        </button>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">База знаний</h1>
        <p className="page-subtitle">Инструкции, правила и регламенты работы</p>
      </div>

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={() => {}}
        onClear={handleClear}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : displayedSections.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery ? 'Ничего не найдено' : 'Нет разделов'}
          </p>
          {searchQuery && (
            <button
              onClick={handleClear}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              Очистить поиск
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedSections.map((section: any) => (
              <Link
                key={section.id}
                to={`/sections/${section.id}`}
                state={{ title: section.title }}
                className="card p-5 hover:shadow-md transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 block group hover:-translate-y-1"
              >
                <h3 className="font-semibold text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {section.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
                  {getPreviewContent(section.content)}
                </p>
                <div className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1 transition-all duration-200 group-hover:gap-2">
                  Подробнее 
                  <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Пагинация - показываем только если не в поиске */}
          {!searchQuery && <Pagination />}
        </>
      )}
      
      {isFetching && searchQuery && (
        <div className="text-center text-sm text-slate-400 animate-pulse">
          Поиск...
        </div>
      )}
    </div>
  );
};
