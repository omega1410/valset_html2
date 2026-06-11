import { useState, useRef, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'rag' | 'free'>('rag');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuthStore();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { role: 'assistant', content: 'Здравствуйте! Я AI-ассистент. Задавайте вопросы по работе отеля.' }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!isAuthenticated) {
      toast.error('Авторизуйтесь для использования чата');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await aiService.chat(userMessage, mode);
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      toast.error('Ошибка при получении ответа');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте позже.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await aiService.clearHistory();
      setMessages([{ role: 'assistant', content: 'История чата очищена. Задавайте вопросы!' }]);
      toast.success('История очищена');
    } catch (error) {
      toast.error('Ошибка очистки');
    }
  };

  if (!isAuthenticated) return null;

  const modeLabel = mode === 'rag' ? 'По базе знаний' : 'Свободный режим';

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 px-4 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 text-white"
        style={{ height: '48px' }}
        title="Чат с GPT"
      >
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">Assistant GPT</span>
        <span className="text-sm font-medium whitespace-nowrap sm:hidden">GPT</span>
      </button>

      {isOpen && (
        <>
          {/* Затемнение фона для мобилок */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          <div
            ref={modalRef}
            className={`fixed bg-white dark:bg-slate-800 flex flex-col z-50 shadow-xl
              ${isMobile 
                ? 'inset-0 rounded-none' 
                : 'bottom-20 right-6 w-96 h-[500px] rounded-xl border border-slate-200 dark:border-slate-700'
              }`}
            style={!isMobile ? { bottom: '80px', right: '24px' } : {}}
          >
            {/* Шапка */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-blue-600 text-white rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">AI-помощник</h3>
                  <p className="text-xs text-blue-100">{modeLabel}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode(mode === 'rag' ? 'free' : 'rag')}
                    className="px-2 py-1 text-xs bg-white/20 rounded hover:bg-white/30 transition"
                  >
                    {mode === 'rag' ? 'По БД' : 'Свободный'}
                  </button>
                  <button onClick={clearHistory} className="text-white/70 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}               
              <div ref={messagesEndRef} />
            </div>

            {/* Поле ввода */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Задайте вопрос..."
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition dark:bg-slate-700 dark:text-white"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                {mode === 'rag' ? 'Режим: ответы по базе знаний' : 'Режим: свободный диалог'}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
};
