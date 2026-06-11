import { useEffect, useState } from 'react';
import { filesService } from '../../services/filesService';
import toast from 'react-hot-toast';
import { FilesSkeleton } from '../../components/SkeletonLoader';
import { useMobile } from '../../hooks/useMobile';

export const FilesList = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useMobile();

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFiles(files);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = files.filter(file => 
        file.name.toLowerCase().includes(query)
      );
      setFilteredFiles(filtered);
    }
  }, [searchQuery, files]);

  const loadFiles = async () => {
    try {
      const data = await filesService.getFiles();
      setFiles(data);
      setFilteredFiles(data);
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
      toast.error('Ошибка загрузки списка файлов');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc': case 'docx': return '📝';
      case 'xls': case 'xlsx': return '📊';
      case 'jpg': case 'jpeg': case 'png': return '🖼️';
      default: return '📁';
    }
  };

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'PDF';
      case 'doc': case 'docx': return 'Word';
      case 'xls': case 'xlsx': return 'Excel';
      case 'jpg': case 'jpeg': case 'png': return 'Изображение';
      default: return ext?.toUpperCase() || 'Файл';
    }
  };

  // Мобильная карточка файла
  const MobileFileCard = ({ file }: { file: any }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-3 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <div className="text-3xl">{getFileIcon(file.name)}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-800 dark:text-white text-sm break-words">{file.name}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span>{getFileType(file.name)}</span>
            <span>{formatFileSize(file.size)}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <a
          href={filesService.getDownloadUrl(file.name)}
          download
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Скачать
        </a>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Документы</h1>
        <p className="page-subtitle">Бланки, формы и нормативные документы</p>
      </div>

      {/* ПОИСК */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск документов по названию..."
          className="w-full px-4 py-3 pl-11 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition dark:bg-slate-800 dark:text-white"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Результаты поиска */}
      {searchQuery && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Найдено: {filteredFiles.length} {filteredFiles.length === 1 ? 'файл' : filteredFiles.length < 5 ? 'файла' : 'файлов'}
        </p>
      )}

      {loading ? (
        <FilesSkeleton />
      ) : filteredFiles.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery ? 'Ничего не найдено' : 'Нет доступных файлов'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Очистить поиск
            </button>
          )}
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredFiles.map((file, index) => (
            <MobileFileCard key={index} file={file} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Тип</th>
                  <th className="table-header-cell">Название</th>
                  <th className="table-header-cell">Формат</th>
                  <th className="table-header-cell">Размер</th>
                  <th className="table-header-cell w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell text-2xl">{getFileIcon(file.name)}</td>
                    <td className="table-cell font-medium text-slate-800 dark:text-white break-words max-w-md">
                      {file.name}
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        {getFileType(file.name)}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</td>
                    <td className="table-cell">
                      <a
                        href={filesService.getDownloadUrl(file.name)}
                        download
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Скачать
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
