import { useState } from 'react';
import { useSections, useSearchSections } from '../../hooks/useSections';
import { SearchBar } from '../../components/Sections/SearchBar';
import { SectionCard } from '../../components/Sections/SectionCard';
import { CardSkeleton } from '../../components/SkeletonLoader';

export const SectionsList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page] = useState(1);
  
  // Обычные разделы
  const { data: sectionsData, isLoading: sectionsLoading } = useSections(page);
  // Поиск
  const { data: searchResults, isLoading: searchLoading, isFetching } = useSearchSections(searchQuery);
  
  const isLoading = searchQuery ? searchLoading : sectionsLoading;
  
  // БЕЗОПАСНО получаем массив разделов - проверяем что данные существуют
  const displayedSections = searchQuery 
    ? (searchResults || [])  // 👈 Если searchResults undefined - пустой массив
    : (sectionsData?.items || []); // 👈 Если sectionsData undefined - пустой массив

  const handleClear = () => {
    setSearchQuery('');
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
        onSearch={() => {}} // поиск автоматический при изменении
        onClear={handleClear}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedSections.map((section: any) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
      )}
      
      {isFetching && searchQuery && (
        <div className="text-center text-sm text-slate-400 animate-pulse">
          Поиск...
        </div>
      )}
    </div>
  );
};