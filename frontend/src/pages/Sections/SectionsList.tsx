import { useEffect, useState } from 'react';
import { sectionsService } from '../../services/sectionsService';
import { SearchBar } from '../../components/Sections/SearchBar';
import { SectionCard } from '../../components/Sections/SectionCard';

export const SectionsList = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setLoading(true);
    try {
      const data = await sectionsService.getSections();
      setSections(data.items || []);
    } catch (error) {
      console.error('Ошибка загрузки разделов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    
    setLoading(true);
    try {
      const results = await sectionsService.searchSections(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayedSections = searchResults !== null ? searchResults : sections;

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">База знаний</h1>
        <p className="page-subtitle">Инструкции, правила и регламенты работы</p>
      </div>

      <SearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
        onClear={() => {
          setSearchQuery('');
          setSearchResults(null);
        }}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayedSections.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">Ничего не найдено</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedSections.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
};