import { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

export const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [birthday, setBirthday] = useState(user?.birthday || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setLoading(true);
    try {
      await authService.updateProfile({ 
        first_name: firstName, 
        last_name: lastName,
        birthday: birthday || null
      });
      updateUser({ 
        first_name: firstName, 
        last_name: lastName, 
        full_name: `${firstName} ${lastName}`.trim(),
        birthday: birthday
      });
      toast.success('Профиль обновлён');
      setIsEditing(false);
    } catch (error) {
      toast.error('Ошибка обновления');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл не должен превышать 5 МБ');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/me/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка загрузки');
      }
      
      const data = await response.json();
      updateUser({ avatar: data.avatar });
      toast.success('Аватар обновлён');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!confirm('Удалить аватар?')) return;
    
    setLoading(true);
    try {
      await authService.deleteAvatar();
      updateUser({ avatar: undefined });
      toast.success('Аватар удалён');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast.error('Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const first = user?.first_name?.[0] || '';
    const last = user?.last_name?.[0] || '';
    return `${first}${last}`.toUpperCase() || user?.full_name?.[0]?.toUpperCase() || 'U';
  };

  const formatBirthday = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Мой профиль</h1>
        <p className="page-subtitle">Управление личными данными</p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Аватар */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {user?.avatar ? (
              <img
                src={`http://localhost:8000/avatars/${user.avatar}?t=${Date.now()}`}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {getInitials()}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition"
              title="Загрузить фото"
            >
              📷
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          
          {user?.avatar && (
            <button
              onClick={handleAvatarDelete}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Удалить фото
            </button>
          )}
        </div>

        {/* Email (не редактируется) */}
        <div>
          <label className="form-label">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="form-input bg-slate-50 dark:bg-slate-700/50 cursor-not-allowed"
          />
        </div>

        {/* Имя, фамилия и дата рождения */}
        {isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Имя</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="form-input"
                  placeholder="Имя"
                />
              </div>
              <div>
                <label className="form-label">Фамилия</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="form-input"
                  placeholder="Фамилия"
                />
              </div>
            </div>
            <div>
              <label className="form-label">Дата рождения</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFirstName(user?.first_name || '');
                  setLastName(user?.last_name || '');
                  setBirthday(user?.birthday || '');
                }}
                className="btn-outline"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Имя</label>
                <p className="text-slate-800 dark:text-white py-2">
                  {user?.first_name || '—'}
                </p>
              </div>
              <div>
                <label className="form-label">Фамилия</label>
                <p className="text-slate-800 dark:text-white py-2">
                  {user?.last_name || '—'}
                </p>
              </div>
            </div>
            <div>
              <label className="form-label">Дата рождения</label>
              <p className="text-slate-800 dark:text-white py-2">
                {user?.birthday ? new Date(user.birthday).toLocaleDateString('ru-RU') : '—'}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setIsEditing(true)}
                className="btn-outline"
              >
                Редактировать
              </button>
            </div>
          </div>
        )}

        {/* Роль */}
        <div>
          <label className="form-label">Роль</label>
          <input
            type="text"
            value={user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
            disabled
            className="form-input bg-slate-50 dark:bg-slate-700/50 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
};