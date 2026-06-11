import { LogEntry } from '../../services/logbookService';

interface MobileLogbookCardProps {
  entry: LogEntry;
  onComplete: (id: number) => void;
  onToggleImportant: (id: number) => void;
  onEdit: (entry: LogEntry) => void;
  onDelete: (id: number) => void;
  onRestore?: (id: number) => void;
  isHistory?: boolean;
  currentUserId?: number;
  isAdmin?: boolean;
}

export const MobileLogbookCard = ({
  entry,
  onComplete,
  onToggleImportant,
  onEdit,
  onDelete,
  onRestore,
  isHistory = false,
  currentUserId,
  isAdmin
}: MobileLogbookCardProps) => {
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
      return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700">✓ Выполнено</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700">⟳ В работе</span>;
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 mb-3 shadow-sm border ${entry.is_important ? 'border-l-4 border-l-amber-500' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">№{entry.id}</span>
          {getStatusBadge(entry.status)}
          {entry.is_important === true && (
            <span className="text-amber-500 text-sm">⭐</span>
          )}
        </div>
        <span className="text-xs text-slate-400">{formatDate(entry.created_at)}</span>
      </div>
      
      <h3 className="font-medium text-slate-800 dark:text-white mb-1">{entry.task}</h3>
      
      <div className="grid grid-cols-2 gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
        <div>🚪 Комната: {entry.room_number || '—'}</div>
        <div>👤 Исполнитель: {entry.assignee || '—'}</div>
        <div>✍️ Автор: {entry.author_name}</div>
        {entry.comment && <div className="col-span-2">💬 {entry.comment}</div>}
      </div>
      
      {!isHistory && (
        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <button onClick={() => onComplete(entry.id)} className="flex-1 px-3 py-1.5 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 rounded-lg">
            {entry.status === 'completed' ? '↺ Вернуть' : '✓ Выполнить'}
          </button>
          <button onClick={() => onToggleImportant(entry.id)} className="px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 rounded-lg">
            {entry.is_important ? '☆ Убрать' : '⭐ Важное'}
          </button>
          {entry.status !== 'completed' && (
            <button onClick={() => onEdit(entry)} className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 rounded-lg">
              ✎
            </button>
          )}
          <button onClick={() => onDelete(entry.id)} className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 rounded-lg">
            ✕
          </button>
        </div>
      )}
      
      {isHistory && onRestore && (
        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <button onClick={() => onRestore(entry.id)} className="flex-1 px-3 py-1.5 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 rounded-lg">
            ↺ Восстановить
          </button>
        </div>
      )}
    </div>
  );
};
