import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { logbookService, type LogEntry } from '../../services/logbookService';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';
import { useMobile } from '../../hooks/useMobile';
import { MobileLogbookCard } from '../../components/MobileCards/MobileLogbookCard';
import { LogbookTable } from '../../components/LogbookTable';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { 
  Search, 
  Plus, 
  X, 
  Star, 
  CheckCircle, 
  Clock, 
  ListTodo,
  ClipboardList,
  RotateCcw,
} from 'lucide-react';

// Хук для анимированного счётчика
const useAnimatedNumber = (targetValue: number, duration = 800) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (targetValue === 0) {
      setCurrentValue(0);
      return;
    }
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrentValue(Math.floor(targetValue * eased));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetValue, duration]);
  
  return currentValue;
};

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
  const searchRef = useRef<HTMLInputElement>(null);
  
  const [formRoom, setFormRoom] = useState('');
  const [formTask, setFormTask] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formComment, setFormComment] = useState('');
  const [formImportant, setFormImportant] = useState(false);
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success'>('idle');

  const isMobile = useMobile();

  // Обычные задачи (без важных) для основного списка
  const regularEntries = entries.filter(e => !e.is_important);

  // Все отображаемые записи (то, что видит пользователь на экране)
  const allVisibleEntries = !showHistory 
    ? [...importantEntries, ...regularEntries]  // важные + обычные
    : historyEntries;

  // Счётчики считаем от всех отображаемых записей
  const totalCount = allVisibleEntries.length;
  const pendingCount = allVisibleEntries.filter(e => e.status === 'pending').length;
  const completedCount = allVisibleEntries.filter(e => e.status === 'completed').length;

  // Анимированные значения счётчиков
  const animatedTotal = useAnimatedNumber(totalCount);
  const animatedPending = useAnimatedNumber(pendingCount);
  const animatedCompleted = useAnimatedNumber(completedCount);

  // ========== АВТО-ОБНОВЛЕНИЕ ==========
  useAutoRefresh({
    queryKeys: [['logbook']],
    interval: 30000,
    enabled: !showHistory,
  });

  // Дебаунс поиска
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
    
    setButtonState('loading');
    
    try {
      if (editingEntry) {
        await logbookService.update(editingEntry.id, {
          room_number: formRoom || undefined,
          task: formTask,
          assignee: formAssignee || undefined,
          comment: formComment === '' ? null : (formComment || undefined),
          is_important: formImportant,
        });
        toast.success('Запись обновлена');
      } else {
        await logbookService.create({
          room_number: formRoom || undefined,
          task: formTask,
          assignee: formAssignee || undefined,
          comment: formComment === '' ? null : (formComment || undefined),
          is_important: formImportant,
        });
        toast.success('Запись создана');
      }
      
      setButtonState('success');
      setTimeout(() => {
        setButtonState('idle');
        setShowModal(false);
      }, 1000);
      
      loadEntries();
      loadImportantEntries();
    } catch (error) {
      setButtonState('idle');
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
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Удалить запись?</span>
        <button 
          onClick={async () => { 
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
            toast.dismiss(t.id);
          }} 
          className="text-red-600 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
        >
          Удалить
        </button>
        <button 
          onClick={() => toast.dismiss(t.id)} 
          className="text-slate-500 text-sm px-2 py-1 rounded hover:bg-slate-100"
        >
          Отмена
        </button>
      </div>
    ), { duration: 5000 });
  };

  const handleRestore = async (id: number) => {
    try {
      await logbookService.restore(id);
      toast.success('Запись восстановлена');
      loadHistory();
      loadEntries();
      loadImportantEntries();
    } catch (error) {
      toast.error('Ошибка восстановления');
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

  const EmptyState = ({ message, submessage }: { message: string; submessage?: string }) => (
    <div className="py-16 text-center">
      <ClipboardList size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
      {submessage && <p className="text-xs text-slate-400 mt-1">{submessage}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ========== ТОПБАР ========== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Журнал смены</h1>
          <p className="page-subtitle">Задачи и поручения</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} />
          <span>Новая задача</span>
        </button>
      </div>

      {/* ========== СТАТИСТИКА (3 блока с анимацией) ========== */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center stagger-fade" style={{ animationDelay: `0s` }}>
          <ListTodo size={18} className="mx-auto mb-1 text-slate-400" />
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{animatedTotal}</div>
          <div className="text-xs text-slate-500">Всего задач</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center stagger-fade" style={{ animationDelay: `0.08s` }}>
          <Clock size={18} className="mx-auto mb-1 text-amber-500" />
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{animatedPending}</div>
          <div className="text-xs text-slate-500">В работе</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center stagger-fade" style={{ animationDelay: `0.16s` }}>
          <CheckCircle size={18} className="mx-auto mb-1 text-emerald-500" />
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{animatedCompleted}</div>
          <div className="text-xs text-slate-500">Выполнено</div>
        </div>
      </div>

      {/* ========== ПОИСКОВАЯ СТРОКА ========== */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по задачам, комнатам, исполнителям..."
          className="w-full pl-9 pr-9 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition dark:bg-slate-800 dark:text-white text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ========== ФИЛЬТРЫ (таб-бар) ========== */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            onClick={() => { setShowHistory(false); setFilter('all'); }}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              !showHistory && filter === 'all'
                ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => { setShowHistory(false); setFilter('pending'); }}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              !showHistory && filter === 'pending'
                ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            В работе
          </button>
          <button
            onClick={() => { setShowHistory(false); setFilter('completed'); }}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              !showHistory && filter === 'completed'
                ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Выполненные
          </button>
          <button
            onClick={() => { setShowHistory(true); loadHistory(); }}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              showHistory
                ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <span className="flex items-center gap-1">
              <RotateCcw size={10} />
              История
            </span>
          </button>
        </div>
        {!isAdmin && !showHistory && (
          <button
            onClick={() => setShowMyOnly(!showMyOnly)}
            className={`px-3 py-1.5 rounded-full text-xs transition ${
              showMyOnly
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Только мои
          </button>
        )}
      </div>

      {/* ========== СЕКЦИЯ ВАЖНЫХ ЗАДАЧ ========== */}
      {!showHistory && importantEntries.length > 0 && (
        <div className="bg-amber-50/30 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30 overflow-hidden">
          <div className="px-4 py-2 border-b border-amber-200 dark:border-amber-800/30 flex items-center gap-2 bg-amber-100/50 dark:bg-amber-900/20">
            <Star size={14} className="text-amber-500 fill-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">Важные</span>
            <span className="text-xs text-amber-600 dark:text-amber-500 ml-auto bg-amber-200/50 dark:bg-amber-800/50 px-1.5 py-0.5 rounded-full">
              {importantEntries.length}
            </span>
          </div>
          {isMobile ? (
            <div className="p-4 space-y-3">
              {importantEntries.map((entry, idx) => (
                <div key={entry.id} className="stagger-fade" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <MobileLogbookCard
                    entry={entry}
                    onComplete={handleComplete}
                    onToggleImportant={handleToggleImportant}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    currentUserId={user?.id}
                    isAdmin={isAdmin}
                  />
                </div>
              ))}
            </div>
          ) : (
            <LogbookTable
              entries={importantEntries}
              onComplete={handleComplete}
              onToggleImportant={handleToggleImportant}
              onEdit={openEditModal}
              onDelete={handleDelete}
              currentUserId={user?.id}
              isAdmin={isAdmin}
            />
          )}
        </div>
      )}

      {/* ========== ОСНОВНОЙ СПИСОК ========== */}
      {!showHistory && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Загрузка...</div>
          ) : regularEntries.length === 0 && importantEntries.length === 0 ? (
            <EmptyState 
              message="Задач нет" 
              submessage="Создайте первую запись в журнале смены" 
            />
          ) : regularEntries.length === 0 && importantEntries.length > 0 ? (
            <EmptyState message="Нет обычных задач" />
          ) : isMobile ? (
            <div className="p-4 space-y-3">
              {regularEntries.map((entry, idx) => (
                <div key={entry.id} className="stagger-fade" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <MobileLogbookCard
                    entry={entry}
                    onComplete={handleComplete}
                    onToggleImportant={handleToggleImportant}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    currentUserId={user?.id}
                    isAdmin={isAdmin}
                  />
                </div>
              ))}
            </div>
          ) : (
            <LogbookTable
              entries={regularEntries}
              onComplete={handleComplete}
              onToggleImportant={handleToggleImportant}
              onEdit={openEditModal}
              onDelete={handleDelete}
              currentUserId={user?.id}
              isAdmin={isAdmin}
            />
          )}
        </div>
      )}

      {/* ========== ИСТОРИЯ ========== */}
      {showHistory && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Загрузка...</div>
          ) : historyEntries.length === 0 ? (
            <EmptyState message="История пуста" />
          ) : isMobile ? (
            <div className="p-4 space-y-3">
              {historyEntries.map((entry, idx) => (
                <div key={entry.id} className="stagger-fade" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <MobileLogbookCard
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
                </div>
              ))}
            </div>
          ) : (
            <LogbookTable
              entries={historyEntries}
              isHistory={true}
              onRestore={handleRestore}
              onDelete={handleDelete}
              currentUserId={user?.id}
              isAdmin={isAdmin}
            />
          )}
        </div>
      )}

      {/* ========== МОДАЛЬНОЕ ОКНО ========== */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto z-50 shadow-2xl modal-animate">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                {editingEntry ? 'Редактировать задачу' : 'Новая задача'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Номер комнаты</label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="form-input"
                    placeholder="1014"
                  />
                </div>
                <div>
                  <label className="form-label">Исполнитель</label>
                  <input
                    type="text"
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                    className="form-input"
                    placeholder="Кто выполнит"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Задача *</label>
                <textarea
                  value={formTask}
                  onChange={(e) => setFormTask(e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="Опишите задачу..."
                  required
                />
              </div>

              <div>
                <label className="form-label">Комментарий</label>
                <textarea
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  className="form-input"
                  rows={2}
                  placeholder="Дополнительная информация..."
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">Важная задача</span>
                <button
                  type="button"
                  onClick={() => setFormImportant(!formImportant)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    formImportant ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform ${
                      formImportant ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={buttonState !== 'idle'}
                  className={`relative overflow-hidden px-6 py-2 rounded-lg text-white font-medium transition-all duration-300 min-w-[120px] ${
                    buttonState === 'loading' ? 'bg-blue-400 cursor-wait' : 
                    buttonState === 'success' ? 'bg-emerald-600' : 
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center gap-2 transition-all duration-300 ${
                    buttonState === 'loading' || buttonState === 'success' ? 'opacity-0 absolute' : 'opacity-100'
                  }`}>
                    {editingEntry ? 'Сохранить' : 'Создать'}
                  </span>
                  
                  <span className={`inline-flex items-center justify-center transition-all duration-300 ${
                    buttonState === 'loading' ? 'opacity-100' : 'opacity-0 absolute'
                  }`}>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  
                  <span className={`inline-flex items-center justify-center gap-2 transition-all duration-300 ${
                    buttonState === 'success' ? 'opacity-100' : 'opacity-0 absolute'
                  }`}>
                    ✓ Готово!
                  </span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
