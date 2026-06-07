import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { logbookService, type LogEntry } from '../../services/logbookService';
import toast from 'react-hot-toast';

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
  
  const [formRoom, setFormRoom] = useState('');
  const [formTask, setFormTask] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formComment, setFormComment] = useState('');
  const [formImportant, setFormImportant] = useState(false);

  const formatAuthorName = (fullName: string) => {
    if (!fullName || fullName === '—') return '—';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const lastNameInitial = lastName.charAt(0);
    return `${firstName} ${lastNameInitial}.`;
  };

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    } else {
      loadEntries();
      loadImportantEntries();
    }
  }, [filter, showMyOnly, showHistory]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      let data;
      if (showMyOnly && !isAdmin) {
        data = await logbookService.getMy();
      } else {
        data = await logbookService.getAll(filter === 'all' ? undefined : filter);
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
      const data = await logbookService.getHistory();
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
        if (showHistory) {
          loadHistory();
        } else {
          loadEntries();
          loadImportantEntries();
        }
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <span className="inline-block px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">✓ Выполнено</span>;
    }
    return <span className="inline-block px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 whitespace-nowrap">⏳ В работе</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Логбук</h1>
          <p className="page-subtitle">Журнал задач и поручений</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">+ Новая задача</button>
      </div>

      {!showHistory && importantEntries.length > 0 && (
        <div className="card overflow-hidden border-l-4 border-l-amber-500">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <h2 className="font-semibold text-amber-800 dark:text-amber-400">Важные задачи</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell w-16">№</th>
                  <th className="table-header-cell w-32">Номер комнаты</th>
                  <th className="table-header-cell">Задача</th>
                  <th className="table-header-cell w-40">Исполнитель</th>
                  <th className="table-header-cell w-40">Автор</th>
                  <th className="table-header-cell w-28">Статус</th>
                  <th className="table-header-cell w-44">Дата</th>
                  <th className="table-header-cell w-32">Действия</th>
                </tr>
              </thead>
              <tbody>
                {importantEntries.map((entry) => (
                  <tr key={entry.id} className="table-row bg-amber-50/30 dark:bg-amber-900/10">
                    <td className="table-cell text-slate-500">{entry.id}</td>
                    <td className="table-cell font-mono text-sm">{entry.room_number || '—'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500">⭐</span>
                        <p className="font-medium text-slate-800 dark:text-white">{entry.task}</p>
                      </div>
                      {entry.comment && <p className="text-xs text-slate-400 mt-1 ml-5">💬 {entry.comment}</p>}
                    </td>
                    <td className="table-cell">{entry.assignee || '—'}</td>
                    <td className="table-cell whitespace-nowrap">{formatAuthorName(entry.author_name)}</td>
                    <td className="table-cell">{getStatusBadge(entry.status)}</td>
                    <td className="table-cell text-sm text-slate-500 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                    <td className="table-cell whitespace-nowrap">
                      <div className="flex gap-1">
                        <button onClick={() => handleComplete(entry.id)} className="w-7 h-7 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 flex items-center justify-center text-sm" title={entry.status === 'completed' ? 'Вернуть в работу' : 'Отметить выполненным'}>
                          {entry.status === 'completed' ? '↺' : '✓'}
                        </button>
                        {(entry.author_id === user?.id || isAdmin) && entry.status !== 'completed' && (
                          <button onClick={() => openEditModal(entry)} className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 flex items-center justify-center text-sm" title="Редактировать">✎</button>
                        )}
                        <button onClick={() => handleToggleImportant(entry.id)} className="w-7 h-7 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 flex items-center justify-center text-sm" title="Снять отметку важности">⭐</button>
                        {(entry.author_id === user?.id || isAdmin) && (
                          <button onClick={() => handleDelete(entry.id)} className="w-7 h-7 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 flex items-center justify-center text-sm" title="Удалить">✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-4 flex-wrap items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => { setShowHistory(false); setFilter('all'); }} className={`px-3 py-1 rounded-lg text-sm transition ${!showHistory && filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Все</button>
          <button onClick={() => { setShowHistory(false); setFilter('pending'); }} className={`px-3 py-1 rounded-lg text-sm transition ${!showHistory && filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>В работе</button>
          <button onClick={() => { setShowHistory(false); setFilter('completed'); }} className={`px-3 py-1 rounded-lg text-sm transition ${!showHistory && filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Выполненные</button>
          <button onClick={() => { setShowHistory(true); loadHistory(); }} className={`px-3 py-1 rounded-lg text-sm transition ${showHistory ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>История</button>
        </div>
        {!isAdmin && !showHistory && (
          <button onClick={() => setShowMyOnly(!showMyOnly)} className={`px-3 py-1 rounded-lg text-sm transition ${showMyOnly ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>Только мои</button>
        )}
      </div>

      {!showHistory && (
        loading ? <div className="text-center py-12 text-slate-500">Загрузка...</div> :
        entries.length === 0 ? <div className="card p-12 text-center"><p className="text-slate-500">Нет записей</p></div> :
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell w-16">№</th>
                  <th className="table-header-cell w-32">Номер комнаты</th>
                  <th className="table-header-cell">Задача</th>
                  <th className="table-header-cell w-40">Исполнитель</th>
                  <th className="table-header-cell w-32">Автор</th>
                  <th className="table-header-cell w-28">Статус</th>
                  <th className="table-header-cell w-44">Дата</th>
                  <th className="table-header-cell w-32">Действия</th>
                </tr>
              </thead>
              <tbody>
                {entries.filter(e => !e.is_important).map((entry) => (
                  <tr key={entry.id} className="table-row">
                    <td className="table-cell text-slate-500">{entry.id}</td>
                    <td className="table-cell font-mono text-sm">{entry.room_number || '—'}</td>
                    <td className="table-cell">
                      <div className="max-w-md">
                        <p className="font-medium text-slate-800 dark:text-white">{entry.task}</p>
                        {entry.comment && <p className="text-xs text-slate-400 mt-1">💬 {entry.comment}</p>}
                      </div>
                    </td>
                    <td className="table-cell">{entry.assignee || '—'}</td>
                    <td className="table-cell whitespace-nowrap">{formatAuthorName(entry.author_name)}</td>
                    <td className="table-cell">{getStatusBadge(entry.status)}</td>
                    <td className="table-cell text-sm text-slate-500 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                    <td className="table-cell whitespace-nowrap">
                      <div className="flex gap-1">
                        <button onClick={() => handleComplete(entry.id)} className="w-7 h-7 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 flex items-center justify-center text-sm" title={entry.status === 'completed' ? 'Вернуть в работу' : 'Отметить выполненным'}>
                          {entry.status === 'completed' ? '↺' : '✓'}
                        </button>
                        {(entry.author_id === user?.id || isAdmin) && entry.status !== 'completed' && (
                          <>
                            <button onClick={() => openEditModal(entry)} className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 flex items-center justify-center text-sm" title="Редактировать">✎</button>
                            <button onClick={() => handleToggleImportant(entry.id)} className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 flex items-center justify-center text-sm" title="Отметить как важное">☆</button>
                          </>
                        )}
                        {(entry.author_id === user?.id || isAdmin) && (
                          <button onClick={() => handleDelete(entry.id)} className="w-7 h-7 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 flex items-center justify-center text-sm" title="Удалить">✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showHistory && (
        loading ? <div className="text-center py-12 text-slate-500">Загрузка...</div> :
        historyEntries.length === 0 ? <div className="card p-12 text-center"><p className="text-slate-500">История пуста</p></div> :
        <div className="card overflow-hidden opacity-75">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell w-16">№</th>
                  <th className="table-header-cell w-32">Номер комнаты</th>
                  <th className="table-header-cell">Задача</th>
                  <th className="table-header-cell w-40">Исполнитель</th>
                  <th className="table-header-cell w-32">Автор</th>
                  <th className="table-header-cell w-28">Статус</th>
                  <th className="table-header-cell w-44">Удалена</th>
                  <th className="table-header-cell w-24">Действия</th>
                </tr>
              </thead>
              <tbody>
                {historyEntries.map((entry) => (
                  <tr key={entry.id} className="table-row">
                    <td className="table-cell text-slate-500">{entry.id}</td>
                    <td className="table-cell font-mono text-sm">{entry.room_number || '—'}</td>
                    <td className="table-cell">
                      <p className="font-medium text-slate-800 dark:text-white">{entry.task}</p>
                      {entry.comment && <p className="text-xs text-slate-400 mt-1">💬 {entry.comment}</p>}
                    </td>
                    <td className="table-cell">{entry.assignee || '—'}</td>
                    <td className="table-cell whitespace-nowrap">{formatAuthorName(entry.author_name)}</td>
                    <td className="table-cell">{getStatusBadge(entry.status)}</td>
                    <td className="table-cell text-sm text-slate-500 whitespace-nowrap">{entry.deleted_at ? formatDate(entry.deleted_at) : '—'}</td>
                    <td className="table-cell whitespace-nowrap">
                      {isAdmin && <button onClick={() => handleRestore(entry.id)} className="w-7 h-7 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 flex items-center justify-center text-sm" title="Восстановить">↺</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 999999, marginTop: 0 }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', zIndex: 1000000 }} className="dark:!bg-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">{editingEntry ? 'Редактировать задачу' : 'Новая задача'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="form-label">Номер комнаты</label><input type="text" value={formRoom} onChange={(e) => setFormRoom(e.target.value)} className="form-input" placeholder="Например: 1014, 2064..." /></div>
              <div><label className="form-label">Задача *</label><textarea value={formTask} onChange={(e) => setFormTask(e.target.value)} className="form-input" rows={3} placeholder="Опишите задачу..." required /></div>
              <div><label className="form-label">Исполнитель</label><input type="text" value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)} className="form-input" placeholder="Кто должен выполнить" /></div>
              <div><label className="form-label">Комментарий (необязательно)</label><textarea value={formComment} onChange={(e) => setFormComment(e.target.value)} className="form-input" rows={2} placeholder="Дополнительная информация..." /></div>
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
