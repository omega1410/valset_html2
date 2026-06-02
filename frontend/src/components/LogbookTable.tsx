import { memo } from 'react';

interface LogbookTableProps {
  entries: any[];
  onComplete?: (id: number) => void;
  onEdit?: (entry: any) => void;
  onDelete?: (id: number) => void;
  onToggleImportant?: (id: number) => void;
  onRestore?: (id: number) => void;
  showActions?: boolean;
  isHistory?: boolean;
  currentUserId?: number;
  isAdmin?: boolean;
}

export const LogbookTable = memo(({ 
  entries, 
  onComplete, 
  onEdit, 
  onDelete, 
  onToggleImportant,
  onRestore,
  showActions = true,
  isHistory = false,
  currentUserId,
  isAdmin
}: LogbookTableProps) => {
  
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

  if (entries.length === 0) {
    return <div className="text-center py-8 text-slate-500">Нет записей</div>;
  }

  return (
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
                    {!isHistory && entry.status !== 'completed' && onComplete && (
                      <button onClick={() => onComplete(entry.id)} className="text-emerald-600 hover:text-emerald-700" title="Выполнить">✓</button>
                    )}
                    {!isHistory && entry.status !== 'completed' && onToggleImportant && (
                      <button onClick={() => onToggleImportant(entry.id)} className="text-amber-600 hover:text-amber-700" title="Важное">⭐</button>
                    )}
                    {!isHistory && onEdit && (entry.author_id === currentUserId || isAdmin) && (
                      <button onClick={() => onEdit(entry)} className="text-blue-600 hover:text-blue-700" title="Редактировать">✎</button>
                    )}
                    {onDelete && (entry.author_id === currentUserId || isAdmin) && (
                      <button onClick={() => onDelete(entry.id)} className="text-red-600 hover:text-red-700" title="Удалить">✕</button>
                    )}
                    {isHistory && onRestore && (
                      <button onClick={() => onRestore(entry.id)} className="text-emerald-600 hover:text-emerald-700" title="Восстановить">↺</button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

LogbookTable.displayName = 'LogbookTable';