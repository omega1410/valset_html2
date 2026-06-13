import { useState, useRef } from 'react';

interface SaveButtonProps {
  onClick: () => Promise<void>;
  defaultText?: string;
  className?: string;
}

export const SaveButton = ({ onClick, defaultText = 'Сохранить', className = '' }: SaveButtonProps) => {
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = async () => {
    if (state !== 'idle') return;
    
    setState('loading');
    
    try {
      await onClick();
      setState('success');
      
      timeoutRef.current = setTimeout(() => {
        setState('idle');
      }, 1500);
    } catch (error) {
      setState('idle');
      throw error;
    }
  };

  return (
    <button
      type="submit"
      onClick={handleClick}
      disabled={state !== 'idle'}
      className={`relative overflow-hidden transition-all duration-300 ${
        state === 'loading' ? 'bg-blue-400 cursor-wait' : 
        state === 'success' ? 'bg-emerald-600' : 
        'btn-primary'
      } ${className}`}
      style={{ minWidth: '120px' }}
    >
      <span className={`inline-flex items-center justify-center gap-2 transition-all duration-300 ${
        state === 'loading' ? 'opacity-0 absolute' : 
        state === 'success' ? 'opacity-0 absolute' : 
        'opacity-100'
      }`}>
        {defaultText}
      </span>
      
      <span className={`inline-flex items-center justify-center transition-all duration-300 ${
        state === 'loading' ? 'opacity-100' : 'opacity-0 absolute'
      }`}>
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </span>
      
      <span className={`inline-flex items-center justify-center gap-2 transition-all duration-300 ${
        state === 'success' ? 'opacity-100' : 'opacity-0 absolute'
      }`}>
        ✓ Готово!
      </span>
    </button>
  );
};

export default SaveButton;
