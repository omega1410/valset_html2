import { memo } from 'react';
import { CheckIcon, EditIcon, StarIcon, TrashIcon, RotateCcwIcon } from 'lucide-react';

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
  
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 3);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${hours}:${minutes} (${day}.${month}.${year})`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 3);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} (${day}.${month}.${year})`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="inline-block px-2 py-1 text-xs rounded-full bg-emerald-200 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 whitespace-nowrap transition-all duration-300 font-medium">
          Выполнено
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 whitespace-nowrap transition-all duration-300">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse-status"></span>
        В работе
      </span>
    );
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="w-[70px] px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500">
              Комната
            </th>
            <th className="w-auto px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500">
              Задача
            </th>
            {!isHistory && (
              <th className="w-[120px] px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500">
                Исполнитель
              </th>
            )}
            <th className="w-[100px] px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500">
              Автор
            </th>
            <th className="w-[90px] px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500">
              Статус
            </th>
            {!isHistory && (
              <th className="w-[130px] px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500">
                Время
              </th>
            )}
            {isHistory && (
              <th className="w-[130px] px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500">
                Удалена
              </th>
            )}
            <th className="w-[110px] px-4 py-2 text-right text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500">
              Действия
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const isCompleted = entry.status === 'completed';
            const isDeleted = entry.is_deleted || entry.deleted_at;
            
            return (
              <tr 
                key={entry.id} 
                className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition stagger-fade ${
                  isCompleted ? 'opacity-60' : ''
                } ${isDeleted ? 'opacity-55 hover:opacity-80' : ''}`}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {entry.room_number || '—'}
                </td>
                
                <td className="px-4 py-3">
                  <div className="relative">
                    <p className={`text-sm font-medium text-slate-800 dark:text-white break-words ${isCompleted ? 'line-through' : ''}`}>
                      {entry.task}
                    </p>
                    {entry.comment && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 break-words">
                        💬 {entry.comment}
                      </p>
                    )}
                  </div>
                </td>
                
                {!isHistory && (
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {entry.assignee || '—'}
                  </td>
                )}
                
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {entry.author_name}
                </td>
                
                <td className="px-4 py-3 whitespace-nowrap">
                  {!isHistory ? getStatusBadge(entry.status) : (
                    <span className="inline-block px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      {entry.status === 'completed' ? 'Выполнено' : 'В работе'}
                    </span>
                  )}
                </td>
                
                {!isHistory && (
                  <td className="px-4 py-3 text-sm font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {formatDateTime(entry.created_at)}
                  </td>
                )}
                
                {isHistory && (
                  <td className="px-4 py-3 text-sm font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {entry.deleted_at ? formatDate(entry.deleted_at) : '—'}
                  </td>
                )}
                
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2 items-center">
                    {!isHistory && onComplete && (
                      <button
                        onClick={() => onComplete(entry.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md border transition ${
                          entry.status === 'completed'
                            ? 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                        }`}
                        title={entry.status === 'completed' ? 'Вернуть в работу' : 'Выполнить'}
                      >
                        {entry.status === 'completed' ? <RotateCcwIcon size={14} /> : <CheckIcon size={14} />}
                      </button>
                    )}
                    
                    {!isHistory && onToggleImportant && entry.status !== 'completed' && (
                      <button
                        onClick={() => onToggleImportant(entry.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md border transition ${
                          entry.is_important
                            ? 'border-amber-200 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                        }`}
                        title={entry.is_important ? 'Снять важность' : 'Отметить важным'}
                      >
                        <StarIcon size={14} fill={entry.is_important ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    
                    {!isHistory && onEdit && (entry.author_id === currentUserId || isAdmin) && entry.status !== 'completed' && (
                      <button
                        onClick={() => onEdit(entry)}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 transition"
                        title="Редактировать"
                      >
                        <EditIcon size={14} />
                      </button>
                    )}
                    
                    {!isHistory && onDelete && (entry.author_id === currentUserId || isAdmin) && (
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 transition"
                        title="Удалить"
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                    
                    {isHistory && onRestore && (
                      <button
                        onClick={() => onRestore(entry.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 transition"
                        title="Восстановить"
                      >
                        <RotateCcwIcon size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

LogbookTable.displayName = 'LogbookTable';
