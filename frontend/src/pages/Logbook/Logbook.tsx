import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { logbookService, type LogEntry } from '../../services/logbookService';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';
import { useMobile } from '../../hooks/useMobile';
import { MobileLogbookCard } from '../../components/MobileCards/MobileLogbookCard';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export const Logbook = () => {
  const { user, isAdmin } = useAuthStore();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [importantEntries, setImportantEntries] = useState<LogEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showMyOnly, setShowMyOnly] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [formRoom, setFormRoom] = useState('');
  const [formTask, setFormTask] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formComment, setFormComment] = useState('');
  const [formImportant, setFormImportant] = useState(false);

  const isMobile = useMobile();

  // ========== АВТО-ОБНОВЛЕНИЕ ==========
  useAutoRefresh({
    queryKeys: [['logbook']],
    interval: 30000,
    enabled: !showHistory,
  });

  // Дебаунс поиска (ждём 300мс после последнего ввода)
  const debouncedSetSearch = useRef(
    debounce((value: string) => {
      setDebouncedSearch(value);
    }, 300)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);

  useEffect(() => {
    debouncedSetSearch(searchQuery);
  }, [searchQuery, debouncedSetSearch]);

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    } else {
      loadEntries();
      loadImportantEntries();
    }
  }, [filter, showMyOnly, showHistory, debouncedSearch]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      let data;
      if (showMyOnly && !isAdmin) {
        data = await logbookService.getMy();
      } else {
        data = await logbookService.getAll(filter === 'all' ? undefined : filter, debouncedSearch || undefined);
      }
      setEntries(data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const loadImportantEntries = async () => {
    try {
      const data = await logbookService.getImportant();
      setImportantEntries(data);
    } catch (error) {
      console.error('Ошибка загрузки важных задач:', error);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await logbookService.getHistory(debouncedSearch || undefined);
      setHistoryEntries(data);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
      toast.error('Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormRoom('');
    setFormTask('');
    setFormAssignee('');
    setFormComment('');
    setFormImportant(false);
    setShowModal(true);
  };

  const openEditModal = (entry: LogEntry) => {
    if (entry.status === 'completed') {
      toast.error('Нельзя редактировать выполненную задачу');
      return;
    }
    setEditingEntry(entry);
    setFormRoom(entry.room_number || '');
    setFormTask(entry.task);
    setFormAssignee(entry.assignee || '');
    setFormComment(entry.comment || '');
    setFormImportant(entry.is_important || false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTask.trim()) {
      toast.error('Заполните задачу');
      return;
    }
    try {
      if (editingEntry) {
        await logbookService.update(editingEntry.id, {
          room_number: formRoom || undefined,
          task: formTask,
          assignee: formAssignee || undefined,
          comment: formComment || undefined,
          is_important: formImportant,
        });
        toast.success('Запись обновлена');
      } else {
        await logbookService.create({
          room_number: formRoom || undefined,
          task: formTask,
          assignee: formAssignee || undefined,
          comment: formComment || undefined,
          is_important: formImportant,
        });
        toast.success('Запись создана');
      }
      setShowModal(false);
      loadEntries();
      loadImportantEntries();
    } catch (error) {
      toast.error(editingEntry ? 'Ошибка обновления' : 'Ошибка создания');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      const response = await logbookService.complete(id);
      toast.success(response.message || 'Статус изменён');
      loadEntries();
      loadImportantEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Удалить запись?')) {
      try {
        await logbookService.delete(id);
        toast.success('Запись удалена');
        if (showHistory) {
          loadHistory();
        } else {
          loadEntries();
          loadImportantEntries();
        }
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  const handleRestore = async (id: number) => {
    if (confirm('Восстановить запись?')) {
      try {
        await logbookService.restore(id);
        toast.success('Запись восстановлена');
        loadHistory();
        loadEntries();
        loadImportantEntries();
      } catch (error) {
        toast.error('Ошибка восстановления');
      }
    }
  };

  const handleToggleImportant = async (id: number) => {
    try {
      await logbookService.toggleImportant(id);
      loadEntries();
      loadImportantEntries();
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 3);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <span className="inline-block px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">✓ Выполнено</span>;
    }
    return <span className="inline-block px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 whitespace-nowrap">⟳ В работе</span>;
  };

  // Компонент таблицы (для десктопа)
  const LogbookTableComponent = ({ entries, showActions = true, isHistory = false }) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm">№</th>
            <th className="px-4 py-3 text-left text-sm">Комната</th>
            <th className="px-4 py-3 text-left text-sm">Задача</th>
            <th className="px-4 py-3 text-left text-sm">Исполнитель</th>
            <th className="px-4 py-3 text-left text-sm">Автор</th>
            <th className="px-4 py-3 text-left text-sm">Статус</th>
            <th className="px-4 py-3 text-left text-sm">Дата</th>
            {showActions && <th className="px-4 py-3 text-left text-sm">Действия</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <td className="px-4 py-3 text-sm">{entry.id}</td>
              <td className="px-4 py-3 text-sm">{entry.room_number || '—'}</td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium">{entry.task}</p>
                  {entry.comment && <p className="text-xs text-slate-400 mt-1">💬 {entry.comment}</p>}
                </div>
              </td>
              <td className="px-4 py-3 text-sm">{entry.assignee || '—'}</td>
              <td className="px-4 py-3 text-sm">{entry.author_name}</td>
              <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
              <td className="px-4 py-3 text-sm">{formatDate(entry.created_at)}</td>
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleComplete(entry.id)} className="p-1 text-emerald-600 hover:text-emerald-700" title={entry.status === 'completed' ? 'Вернуть в работу' : 'Отметить выполненным'}>
                      {entry.status === 'completed' ? '↺' : '✓'}
                    </button>
                    <button onClick={() => handleToggleImportant(entry.id)} className="p-1 text-amber-600 hover:text-amber-700" title={entry.is_important ? 'Снять важность' : 'Отметить важным'}>
                      {entry.is_important ? '★' : '☆'}
                    </button>
                    {entry.status !== 'completed' && (
                      <button onClick={() => openEditModal(entry)} className="p-1 text-blue-600 hover:text-blue-700" title="Редактировать">✎</button>
                    )}
                    <button onClick={() => handleDelete(entry.id)} className="p-1 text-red-600 hover:text-red-700" title="Удалить">✕</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">Логбук</h1>
          <p className="page-subtitle">Журнал задач и поручений</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">+ Новая задача</button>
      </div>

      {/* Поиск */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по задачам, комнатам, исполнителям, авторам, комментариям..."
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Важные задачи */}
      {!showHistory && importantEntries.length > 0 && (
        <div className="card overflow-hidden border-l-4 border-l-amber-500">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <h2 className="font-semibold text-amber-800 dark:text-amber-400">Важные задачи</h2>
            </div>
          </div>
          {isMobile ? (
            <div className="p-4 space-y-3">
              {importantEntries.map((entry) => (
                <MobileLogbookCard
                  key={entry.id}
                  entry={entry}
                  onComplete={handleComplete}
                  onToggleImportant={handleToggleImportant}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <LogbookTableComponent entries={importantEntries} />
          )}
        </div>
      )}

      {/* Фильтры */}
      <div className="flex gap-4 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setShowHistory(false); setFilter('all'); }} className={`px-3 py-1 rounded-lg text-sm transition ${!showHistory && filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Все</button>
          <button onClick={() => { setShowHistory(false); setFilter('pending'); }} className={`px-3 py-1 rounded-lg text-sm transition ${!showHistory && filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>В работе</button>
          <button onClick={() => { setShowHistory(false); setFilter('completed'); }} className={`px-3 py-1 rounded-lg text-sm transition ${!showHistory && filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Выполненные</button>
          <button onClick={() => { setShowHistory(true); loadHistory(); }} className={`px-3 py-1 rounded-lg text-sm transition ${showHistory ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>История</button>
        </div>
        {!isAdmin && !showHistory && (
          <button onClick={() => setShowMyOnly(!showMyOnly)} className={`px-3 py-1 rounded-lg text-sm transition ${showMyOnly ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Только мои</button>
        )}
      </div>

      {/* Основной список */}
      {!showHistory && (
        loading ? (
          <div className="text-center py-12 text-slate-500">Загрузка...</div>
        ) : entries.length === 0 ? (
          <div className="card p-12 text-center"><p className="text-slate-500">Нет записей</p></div>
        ) : isMobile ? (
          <div className="space-y-3">
            {entries.filter(e => !e.is_important).map((entry) => (
              <MobileLogbookCard
                key={entry.id}
                entry={entry}
                onComplete={handleComplete}
                onToggleImportant={handleToggleImportant}
                onEdit={openEditModal}
                onDelete={handleDelete}
                currentUserId={user?.id}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <LogbookTableComponent entries={entries.filter(e => !e.is_important)} />
          </div>
        )
      )}

      {/* История (архив) */}
      {showHistory && (
        loading ? (
          <div className="text-center py-12 text-slate-500">Загрузка...</div>
        ) : historyEntries.length === 0 ? (
          <div className="card p-12 text-center"><p className="text-slate-500">История пуста</p></div>
        ) : isMobile ? (
          <div className="space-y-3">
            {historyEntries.map((entry) => (
              <MobileLogbookCard
                key={entry.id}
                entry={entry}
                onComplete={handleComplete}
                onToggleImportant={handleToggleImportant}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onRestore={handleRestore}
                isHistory={true}
                currentUserId={user?.id}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">№</th>
                    <th className="px-4 py-3 text-left text-sm">Комната</th>
                    <th className="px-4 py-3 text-left text-sm">Задача</th>
                    <th className="px-4 py-3 text-left text-sm">Исполнитель</th>
                    <th className="px-4 py-3 text-left text-sm">Автор</th>
                    <th className="px-4 py-3 text-left text-sm">Статус</th>
                    <th className="px-4 py-3 text-left text-sm">Удалена</th>
                    <th className="px-4 py-3 text-left text-sm">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEntries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700/50 opacity-75">
                      <td className="px-4 py-3 text-sm">{entry.id}</td>
                      <td className="px-4 py-3 text-sm">{entry.room_number || '—'}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{entry.task}</p>
                          {entry.comment && <p className="text-xs text-slate-400 mt-1">💬 {entry.comment}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{entry.assignee || '—'}</td>
                      <td className="px-4 py-3 text-sm">{entry.author_name}</td>
                      <td className="px-4 py-3">{getStatusBadge(entry.status)}</td>
                      <td className="px-4 py-3 text-sm">{entry.deleted_at ? formatDate(entry.deleted_at) : '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleRestore(entry.id)} className="p-1 text-emerald-600 hover:text-emerald-700" title="Восстановить">↺</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Модальное окно создания/редактирования */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto z-50 shadow-2xl modal-animate">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">{editingEntry ? 'Редактировать задачу' : 'Новая задача'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Номер комнаты (необязательно)</label>
                <input type="text" value={formRoom} onChange={(e) => setFormRoom(e.target.value)} className="form-input" placeholder="Например: 1014, 2064..." />
              </div>
              <div>
                <label className="form-label">Задача *</label>
                <textarea value={formTask} onChange={(e) => setFormTask(e.target.value)} className="form-input" rows={3} placeholder="Опишите задачу..." required />
              </div>
              <div>
                <label className="form-label">Исполнитель (необязательно)</label>
                <input type="text" value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)} className="form-input" placeholder="Кто должен выполнить" />
              </div>
              <div>
                <label className="form-label">Комментарий (необязательно)</label>
                <textarea value={formComment} onChange={(e) => setFormComment(e.target.value)} className="form-input" rows={2} placeholder="Дополнительная информация..." />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_important" checked={formImportant} onChange={(e) => setFormImportant(e.target.checked)} className="w-4 h-4 text-amber-600 rounded" />
                <label htmlFor="is_important" className="form-label mb-0">Отметить как важную задачу (будет отображаться в отдельном блоке)</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Отмена</button>
                <button type="submit" className="btn-primary">{editingEntry ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
