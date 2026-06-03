import { useState, useEffect, useRef } from 'react';
import { feedbackService } from '../../services/feedbackService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export const FeedbackButton = () => {
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('bug');
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне окна
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Заполните тему и сообщение');
      return;
    }
    
    setLoading(true);
    try {
      await feedbackService.sendFeedback({ subject, message, type });
      toast.success('Спасибо за обратную связь!');
      setIsOpen(false);
      setSubject('');
      setMessage('');
      setType('bug');
    } catch (error) {
      toast.error('Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Круглая кнопка фидбека */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-12 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center text-white"
        style={{ height: '48px' }}
        title="Обратная связь"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Модальное окно */}
      {isOpen && (
        <>
          {/* Затемнение фона */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />
          
          {/* Окно фидбека */}
          <div
            ref={modalRef}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg z-50"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Обратная связь</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Тип сообщения</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="form-input"
                >
                  <option value="bug">Баг / Ошибка</option>
                  <option value="feature">Предложение</option>
                  <option value="question">Вопрос</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">Тема *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="form-input"
                  placeholder="Кратко опишите проблему"
                  required
                />
              </div>
              
              <div>
                <label className="form-label">Сообщение *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="form-input"
                  rows={5}
                  placeholder="Подробно опишите ситуацию..."
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-outline"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </form>
            
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 text-center">
              Сообщение будет отправлено разработчику.
            </p>
          </div>
        </>
      )}
    </>
  );
};