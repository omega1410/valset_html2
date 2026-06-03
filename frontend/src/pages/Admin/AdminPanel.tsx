import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { adminService } from '../../services/adminService';
import { testsAdminService } from '../../services/testsAdminService';
import toast from 'react-hot-toast';

// Компонент для перетаскиваемой строки таблицы
function SortableSectionRow({ section, onEdit, onDelete, onPhoto }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <tr ref={setNodeRef} style={style} className="table-row">
      <td className="table-cell drag-handle cursor-grab text-center" {...attributes} {...listeners}>
        <svg className="w-5 h-5 inline-block text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </td>
      <td className="table-cell text-slate-600 dark:text-slate-400">{section.id}</td>
      <td className="table-cell font-medium text-slate-800 dark:text-white">{section.title}</td>
      <td className="table-cell space-x-3">
        <button onClick={() => onPhoto(section.id)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">Фото</button>
        <button onClick={() => onEdit(section.id)} className="text-blue-600 dark:text-blue-400 hover:text-blue-700">Ред.</button>
        <button onClick={() => onDelete(section.id)} className="text-red-600 dark:text-red-400 hover:text-red-700">Уд.</button>
      </td>
    </tr>
  );
}

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('sections');
  const [sections, setSections] = useState([]);
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [tests, setTests] = useState<any[]>([]);
  const [checklistTasks, setChecklistTasks] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingNews, setEditingNews] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [sectionPhotos, setSectionPhotos] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Форма для раздела
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPhotos, setFormPhotos] = useState<any[]>([]);
  
  // Форма для пользователя
  const [userEmail, setUserEmail] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('user');
  
  // Форма для теста
  const [testFormTitle, setTestFormTitle] = useState('');
  const [testFormDescription, setTestFormDescription] = useState('');
  const [testFormSectionId, setTestFormSectionId] = useState<number | null>(null);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  
  // Форма для чек-листа
  const [taskShiftType, setTaskShiftType] = useState('day');
  const [taskText, setTaskText] = useState('');
  const [taskOrder, setTaskOrder] = useState(1);
  
  // Форма для новости
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');

  // Drag-and-drop сенсоры
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    setOrderedSections(sections);
  }, [sections]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sections') {
        const data = await adminService.getSections();
        setSections(data);
      } else if (activeTab === 'users') {
        const data = await adminService.getUsers();
        setUsers(data);
      } else if (activeTab === 'tests') {
        const data = await testsAdminService.getTests();
        setTests(data);
      } else if (activeTab === 'checklists') {
        const data = await adminService.getChecklistTasks();
        setChecklistTasks(data);
      } else if (activeTab === 'news') {
        const data = await adminService.getNews();
        setNews(data);
      } else if (activeTab === 'files') {
        const data = await adminService.getFiles();
        setFiles(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // ============ РАЗДЕЛЫ ============
  const [orderedSections, setOrderedSections] = useState([]);

  const openEditModal = async (id: number) => {
    try {
      const section = await adminService.getSection(id);
      setEditingSection(section);
      setFormTitle(section.title);
      setFormContent(section.content);
      setShowModal(true);
    } catch (error) {
      toast.error('Ошибка загрузки раздела');
    }
  };

  const openPhotoModal = async (id: number) => {
    try {
      const section = await adminService.getSection(id);
      setSelectedSection(section);
      const photos = [];
      for (let i = 1; i <= 7; i++) {
        const photoKey = i === 1 ? 'photo_id' : `photo_id${i}`;
        const photo = section[photoKey];
        if (photo) {
          photos.push({ slot: i, url: photo });
        }
      }
      setSectionPhotos(photos);
      setShowPhotoModal(true);
    } catch (error) {
      toast.error('Ошибка загрузки фото');
    }
  };

  const handleAddPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || formPhotos.length === 0) return;
    
    try {
      await adminService.addPhotos(selectedSection.id, formPhotos);
      toast.success('Фото добавлены');
      setFormPhotos([]);
      await loadData();
      setRefreshKey(prev => prev + 1);
      const updatedSection = await adminService.getSection(selectedSection.id);
      setSelectedSection(updatedSection);
      const photos = [];
      for (let i = 1; i <= 7; i++) {
        const photoKey = i === 1 ? 'photo_id' : `photo_id${i}`;
        const photo = updatedSection[photoKey];
        if (photo) {
          photos.push({ slot: i, url: photo });
        }
      }
      setSectionPhotos(photos);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка добавления фото');
    }
  };

  const handleDeletePhoto = async (slot: number) => {
    if (!selectedSection) return;
    if (confirm('Удалить фото?')) {
      try {
        await adminService.deletePhoto(selectedSection.id, slot);
        toast.success('Фото удалено');
        await loadData();
        setRefreshKey(prev => prev + 1);
        const updatedSection = await adminService.getSection(selectedSection.id);
        setSelectedSection(updatedSection);
        const photos = [];
        for (let i = 1; i <= 7; i++) {
          const photoKey = i === 1 ? 'photo_id' : `photo_id${i}`;
          const photo = updatedSection[photoKey];
          if (photo) {
            photos.push({ slot: i, url: photo });
          }
        }
        setSectionPhotos(photos);
      } catch (error) {
        toast.error('Ошибка удаления фото');
      }
    }
  };

  const handleSubmitSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSection) {
        await adminService.updateSection(editingSection.id, formTitle, formContent);
        toast.success('Раздел обновлён');
      } else {
        const formData = new FormData();
        formData.append('title', formTitle);
        formData.append('content', formContent);
        formPhotos.forEach(photo => formData.append('photos', photo));
        await adminService.createSection(formData);
        toast.success('Раздел создан');
      }
      setShowModal(false);
      setEditingSection(null);
      setFormTitle('');
      setFormContent('');
      setFormPhotos([]);
      await loadData();
    } catch (error) {
      toast.error(editingSection ? 'Ошибка обновления' : 'Ошибка создания');
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (confirm('Удалить раздел?')) {
      try {
        await adminService.deleteSection(id);
        toast.success('Раздел удалён');
        await loadData();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = orderedSections.findIndex((s: any) => s.id === active.id);
      const newIndex = orderedSections.findIndex((s: any) => s.id === over?.id);
      
      const newOrder = arrayMove(orderedSections, oldIndex, newIndex);
      setOrderedSections(newOrder);
      
      const sectionIds = newOrder.map((s: any) => s.id);
      try {
        await adminService.reorderSections(sectionIds);
        toast.success('Порядок разделов сохранён');
        await loadData();
      } catch (error) {
        toast.error('Ошибка сохранения порядка');
      }
    }
  };

  // ============ ПОЛЬЗОВАТЕЛИ ============
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFirstName.trim() || !userLastName.trim()) {
      toast.error('Введите имя и фамилию');
      return;
    }
    
    const fullName = `${userFirstName} ${userLastName}`.trim();
    
    try {
      await adminService.createUser({
        email: userEmail,
        full_name: fullName,
        first_name: userFirstName,
        last_name: userLastName,
        password: userPassword,
        role: userRole,
      });
      toast.success('Пользователь создан');
      setUserEmail('');
      setUserFirstName('');
      setUserLastName('');
      setUserPassword('');
      setUserRole('user');
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка создания');
    }
  };

  const handleDeleteUser = async (id: number, userRole: string) => {
    const message = userRole === 'admin' 
      ? 'Вы действительно хотите удалить администратора? Это действие необратимо.' 
      : 'Удалить пользователя?';
    if (confirm(message)) {
      try {
        await adminService.deleteUser(id);
        toast.success('Пользователь удалён');
        await loadData();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Ошибка удаления');
      }
    }
  };

  // ============ ТЕСТЫ ============
  const openEditTestModal = async (testId: number) => {
    try {
      const data = await testsAdminService.getTest(testId);
      setEditingTest(data);
      setTestFormTitle(data.title);
      setTestFormDescription(data.description || '');
      setTestFormSectionId(data.section_id);
      setTestQuestions(data.questions || []);
      setShowTestModal(true);
    } catch (error) {
      toast.error('Ошибка загрузки теста');
    }
  };

  const resetTestForm = () => {
    setEditingTest(null);
    setTestFormTitle('');
    setTestFormDescription('');
    setTestFormSectionId(null);
    setTestQuestions([]);
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testFormTitle.trim()) {
      toast.error('Введите название теста');
      return;
    }
    
    try {
      await testsAdminService.createTest({
        title: testFormTitle,
        description: testFormDescription || null,
        section_id: testFormSectionId,
      });
      toast.success('Тест создан');
      setShowTestModal(false);
      resetTestForm();
      await loadData();
    } catch (error) {
      toast.error('Ошибка создания');
    }
  };

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;
    
    try {
      await testsAdminService.updateTest(editingTest.id, {
        title: testFormTitle,
        description: testFormDescription || null,
        section_id: testFormSectionId,
      });
      toast.success('Тест обновлён');
      setShowTestModal(false);
      resetTestForm();
      await loadData();
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const handleDeleteTest = async (testId: number) => {
    if (confirm('Удалить тест? Все вопросы будут удалены.')) {
      try {
        await testsAdminService.deleteTest(testId);
        toast.success('Тест удалён');
        await loadData();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  const addQuestionToForm = () => {
    setTestQuestions([...testQuestions, {
      question: '',
      option1: '',
      option2: '',
      option3: '',
      correct_index: 0,
      order_num: testQuestions.length + 1
    }]);
  };

  const updateQuestionInForm = (index: number, field: string, value: any) => {
    const newQuestions = [...testQuestions];
    newQuestions[index][field] = value;
    setTestQuestions(newQuestions);
  };

  const removeQuestionFromForm = (index: number) => {
    if (confirm('Удалить вопрос?')) {
      const newQuestions = [...testQuestions];
      newQuestions.splice(index, 1);
      newQuestions.forEach((q, idx) => { q.order_num = idx + 1; });
      setTestQuestions(newQuestions);
    }
  };

  const saveQuestions = async () => {
    if (!editingTest) return;
    
    for (let i = 0; i < testQuestions.length; i++) {
      const q = testQuestions[i];
      if (!q.question || !q.option1 || !q.option2 || !q.option3) {
        toast.error(`Заполните все поля вопроса ${i + 1}`);
        return;
      }
    }
    
    try {
      for (const q of testQuestions) {
        if (q.id) {
          await testsAdminService.updateQuestion(q.id, {
            question: q.question,
            option1: q.option1,
            option2: q.option2,
            option3: q.option3,
            correct_index: q.correct_index,
            order_num: q.order_num,
          });
        } else {
          await testsAdminService.addQuestion({
            test_id: editingTest.id,
            question: q.question,
            option1: q.option1,
            option2: q.option2,
            option3: q.option3,
            correct_index: q.correct_index,
            order_num: q.order_num,
          });
        }
      }
      toast.success('Вопросы сохранены');
      await loadData();
    } catch (error) {
      toast.error('Ошибка сохранения вопросов');
    }
  };

  // ============ ФАЙЛЫ ============
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await adminService.uploadFile(formData);
      toast.success('Файл загружен');
      setSelectedFile(null);
      await loadData();
    } catch (error) {
      toast.error('Ошибка загрузки');
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (confirm('Удалить файл?')) {
      try {
        await adminService.deleteFile(filename);
        toast.success('Файл удалён');
        await loadData();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  // ============ ЧЕК-ЛИСТЫ ============
  const openTaskModal = (task?: any) => {
    if (task) {
      setEditingTask(task);
      setTaskShiftType(task.shift_type);
      setTaskText(task.task_text);
      setTaskOrder(task.task_order);
    } else {
      setEditingTask(null);
      setTaskShiftType('day');
      setTaskText('');
      setTaskOrder(checklistTasks.length + 1);
    }
    setShowChecklistModal(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await adminService.updateChecklistTask(editingTask.id, {
          shift_type: taskShiftType,
          task_text: taskText,
          task_order: taskOrder,
        });
        toast.success('Задача обновлена');
      } else {
        await adminService.createChecklistTask({
          shift_type: taskShiftType,
          task_text: taskText,
          task_order: taskOrder,
        });
        toast.success('Задача создана');
      }
      setShowChecklistModal(false);
      await loadData();
    } catch (error) {
      toast.error(editingTask ? 'Ошибка обновления' : 'Ошибка создания');
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (confirm('Удалить задачу?')) {
      try {
        await adminService.deleteChecklistTask(id);
        toast.success('Задача удалена');
        await loadData();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  const handleResetDefaultTasks = async () => {
    if (confirm('Сбросить все задачи до стандартных? Все текущие задачи будут удалены.')) {
      try {
        await adminService.resetDefaultChecklistTasks();
        toast.success('Задачи сброшены до стандартных');
        await loadData();
      } catch (error) {
        toast.error('Ошибка сброса');
      }
    }
  };

  // ============ НОВОСТИ ============
  const openNewsModal = (item?: any) => {
    if (item) {
      setEditingNews(item);
      setNewsTitle(item.title);
      setNewsContent(item.content);
    } else {
      setEditingNews(null);
      setNewsTitle('');
      setNewsContent('');
    }
    setShowNewsModal(true);
  };

  const handleSubmitNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNews) {
        await adminService.updateNews(editingNews.id, { title: newsTitle, content: newsContent });
        toast.success('Новость обновлена');
      } else {
        await adminService.createNews({ title: newsTitle, content: newsContent });
        toast.success('Новость создана');
      }
      setShowNewsModal(false);
      await loadData();
    } catch (error) {
      toast.error(editingNews ? 'Ошибка обновления' : 'Ошибка создания');
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (confirm('Удалить новость?')) {
      try {
        await adminService.deleteNews(id);
        toast.success('Новость удалена');
        await loadData();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  const handleTogglePublish = async (id: number, isPublished: boolean) => {
    try {
      await adminService.updateNews(id, { is_published: !isPublished });
      toast.success(isPublished ? 'Новость скрыта' : 'Новость опубликована');
      await loadData();
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">Админ-панель</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Управление разделами, пользователями, тестами, чек-листами, новостями и файлами</p>
      </div>

      {/* Вкладки */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'users' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Пользователи
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'sections' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Разделы
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'tests' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Тесты
        </button>
        <button
          onClick={() => setActiveTab('checklists')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'checklists' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Чек-листы
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'news' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Новости
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'files' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Файлы
        </button>
      </div>

      {/* ============ РАЗДЕЛЫ ============ */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingSection(null);
                setFormTitle('');
                setFormContent('');
                setFormPhotos([]);
                setShowModal(true);
              }}
              className="btn-primary"
            >
              + Добавить раздел
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Загрузка...</div>
          ) : orderedSections.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">Нет разделов</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedSections.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="card overflow-hidden">
                  <table className="w-full">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell w-10"></th>
                        <th className="table-header-cell w-16">ID</th>
                        <th className="table-header-cell">Название</th>
                        <th className="table-header-cell w-48">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedSections.map((section: any) => (
                        <SortableSectionRow
                          key={section.id}
                          section={section}
                          onEdit={openEditModal}
                          onDelete={handleDeleteSection}
                          onPhoto={openPhotoModal}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* ============ ПОЛЬЗОВАТЕЛИ ============ */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Добавить пользователя</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Имя</label>
                  <input
                    type="text"
                    placeholder="Иван"
                    value={userFirstName}
                    onChange={(e) => setUserFirstName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Фамилия</label>
                  <input
                    type="text"
                    placeholder="Иванов"
                    value={userLastName}
                    onChange={(e) => setUserLastName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    placeholder="example@hotel.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Пароль</label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Роль</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="form-input"
                >
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <button type="submit" className="btn-secondary">Создать пользователя</button>
            </form>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">ID</th>
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Имя и Фамилия</th>
                  <th className="table-header-cell">Роль</th>
                  <th className="table-header-cell"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr key={user.id} className="table-row">
                    <td className="table-cell text-slate-600 dark:text-slate-400">{user.id}</td>
                    <td className="table-cell text-slate-600 dark:text-slate-400">{user.email}</td>
                    <td className="table-cell font-medium text-slate-800 dark:text-white">{user.full_name}</td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'admin' 
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {user.role === 'admin' ? 'Админ' : 'Пользователь'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button onClick={() => handleDeleteUser(user.id, user.role)} className="text-red-600 dark:text-red-400">Удалить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ ТЕСТЫ ============ */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetTestForm();
                setShowTestModal(true);
              }}
              className="btn-primary"
            >
              + Создать тест
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Загрузка...</div>
          ) : tests.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">Нет тестов</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tests.map((test: any) => (
                <div key={test.id} className="card p-5 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-slate-800 dark:text-white text-lg">{test.title}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditTestModal(test.id)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Редактировать"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteTest(test.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {test.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{test.description}</p>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      📝 {test.questions_count} вопросов
                    </span>
                    {test.section_id && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        Раздел {test.section_id}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openEditTestModal(test.id)}
                    className="mt-3 w-full btn-outline text-sm"
                  >
                    Редактировать вопросы
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ ЧЕК-ЛИСТЫ ============ */}
      {activeTab === 'checklists' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button onClick={() => openTaskModal()} className="btn-primary">+ Добавить задачу</button>
            <button onClick={handleResetDefaultTasks} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">Сбросить до стандартных</button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Загрузка...</div>
          ) : checklistTasks.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">Нет задач</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">ID</th>
                    <th className="table-header-cell">Смена</th>
                    <th className="table-header-cell">Порядок</th>
                    <th className="table-header-cell">Задача</th>
                    <th className="table-header-cell">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {checklistTasks.map((task: any) => (
                    <tr key={task.id} className="table-row">
                      <td className="table-cell text-slate-600 dark:text-slate-400">{task.id}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          task.shift_type === 'day' 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' 
                            : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        }`}>
                          {task.shift_type === 'day' ? 'Дневная' : 'Ночная'}
                        </span>
                       </td>
                      <td className="table-cell text-slate-600 dark:text-slate-400">{task.task_order}</td>
                      <td className="table-cell text-slate-800 dark:text-white">{task.task_text}</td>
                      <td className="table-cell space-x-3">
                        <button onClick={() => openTaskModal(task)} className="text-blue-600 dark:text-blue-400">Ред.</button>
                        <button onClick={() => handleDeleteTask(task.id)} className="text-red-600 dark:text-red-400">Уд.</button>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ НОВОСТИ ============ */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openNewsModal()} className="btn-primary">
              + Создать новость
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Загрузка...</div>
          ) : news.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">Нет новостей</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">ID</th>
                    <th className="table-header-cell">Заголовок</th>
                    <th className="table-header-cell">Автор</th>
                    <th className="table-header-cell">Статус</th>
                    <th className="table-header-cell">Дата</th>
                    <th className="table-header-cell">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {news.map((item: any) => (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell text-slate-600 dark:text-slate-400">{item.id}</td>
                      <td className="table-cell font-medium text-slate-800 dark:text-white">{item.title}</td>
                      <td className="table-cell text-slate-600 dark:text-slate-400">{item.author_name}</td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleTogglePublish(item.id, item.is_published)}
                          className={`px-2 py-1 rounded-full text-xs ${
                            item.is_published 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}
                        >
                          {item.is_published ? 'Опубликовано' : 'Скрыто'}
                        </button>
                      </td>
                      <td className="table-cell text-slate-600 dark:text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="table-cell space-x-3">
                        <button onClick={() => openNewsModal(item)} className="text-blue-600 dark:text-blue-400">Ред.</button>
                        <button onClick={() => handleDeleteNews(item.id)} className="text-red-600 dark:text-red-400">Уд.</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ ФАЙЛЫ ============ */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Загрузить файл</h3>
            <form onSubmit={handleUploadFile} className="space-y-4">
              <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="w-full text-slate-600 dark:text-slate-400" required />
              <button type="submit" className="btn-primary">Загрузить</button>
            </form>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Название</th>
                  <th className="table-header-cell">Размер</th>
                  <th className="table-header-cell"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-slate-500 dark:text-slate-400">Загрузка...</td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-slate-500 dark:text-slate-400">Нет файлов</td>
                  </tr>
                ) : (
                  files.map((file: any) => (
                    <tr key={file.name} className="table-row">
                      <td className="table-cell font-medium text-slate-800 dark:text-white">{file.name}</td>
                      <td className="table-cell text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</td>
                      <td className="table-cell">
                        <button onClick={() => handleDeleteFile(file.name)} className="text-red-600 dark:text-red-400 hover:text-red-700">Удалить</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ МОДАЛКА ТЕСТА ============ */}
      {showTestModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            style={{ zIndex: 999999, pointerEvents: 'auto', marginTop: 0 }} 
            onClick={() => setShowTestModal(false)} 
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto z-[1000000]"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                {editingTest ? 'Редактировать тест' : 'Создать тест'}
              </h2>
              <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={editingTest ? handleUpdateTest : handleCreateTest} className="space-y-4">
              <div>
                <label className="form-label">Название теста *</label>
                <input
                  type="text"
                  value={testFormTitle}
                  onChange={(e) => setTestFormTitle(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              
              <div>
                <label className="form-label">Описание (необязательно)</label>
                <textarea
                  value={testFormDescription}
                  onChange={(e) => setTestFormDescription(e.target.value)}
                  className="form-input"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="form-label">ID раздела (необязательно)</label>
                <input
                  type="number"
                  value={testFormSectionId || ''}
                  onChange={(e) => setTestFormSectionId(e.target.value ? Number(e.target.value) : null)}
                  className="form-input"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowTestModal(false)} className="btn-outline">Отмена</button>
                <button type="submit" className="btn-primary">
                  {editingTest ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
            
            {editingTest && (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Вопросы</h3>
                  <button
                    type="button"
                    onClick={addQuestionToForm}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Добавить вопрос
                  </button>
                </div>
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {testQuestions.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Нет вопросов. Добавьте первый вопрос.</p>
                  ) : (
                    testQuestions.map((q, idx) => (
                      <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <h4 className="font-medium">Вопрос {idx + 1}</h4>
                          <button type="button" onClick={() => removeQuestionFromForm(idx)} className="text-red-500 text-sm">Удалить</button>
                        </div>
                        <input type="text" placeholder="Текст вопроса" value={q.question} onChange={(e) => updateQuestionInForm(idx, 'question', e.target.value)} className="form-input" />
                        <input type="text" placeholder="Вариант 1" value={q.option1} onChange={(e) => updateQuestionInForm(idx, 'option1', e.target.value)} className="form-input" />
                        <input type="text" placeholder="Вариант 2" value={q.option2} onChange={(e) => updateQuestionInForm(idx, 'option2', e.target.value)} className="form-input" />
                        <input type="text" placeholder="Вариант 3" value={q.option3} onChange={(e) => updateQuestionInForm(idx, 'option3', e.target.value)} className="form-input" />
                        <select value={q.correct_index} onChange={(e) => updateQuestionInForm(idx, 'correct_index', Number(e.target.value))} className="form-input">
                          <option value={0}>Вариант 1</option>
                          <option value={1}>Вариант 2</option>
                          <option value={2}>Вариант 3</option>
                        </select>
                      </div>
                    ))
                  )}
                </div>
                
                {testQuestions.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <button type="button" onClick={saveQuestions} className="btn-primary">Сохранить вопросы</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ МОДАЛКА РАЗДЕЛА ============ */}
      {showModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            style={{ zIndex: 999999, pointerEvents: 'auto', marginTop: 0 }} 
            onClick={() => setShowModal(false)} 
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-[1000000]"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                {editingSection ? 'Редактировать раздел' : 'Новый раздел'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmitSection} className="space-y-4">
              <input type="text" placeholder="Название" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="form-input" required />
              <textarea placeholder="Содержание" value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={10} className="form-input" required />
              {!editingSection && (
                <input type="file" multiple accept="image/*" onChange={(e) => setFormPhotos(Array.from(e.target.files || []))} className="form-input" />
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Отмена</button>
                <button type="submit" className="btn-primary">{editingSection ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ============ МОДАЛКА ФОТО ============ */}
      {showPhotoModal && selectedSection && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            style={{ zIndex: 999999, pointerEvents: 'auto', marginTop: 0 }} 
            onClick={() => setShowPhotoModal(false)} 
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-2xl z-[1000000]"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Фото: {selectedSection.title}</h2>
              <button onClick={() => setShowPhotoModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="mb-6">
              <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Текущие фото ({sectionPhotos.length}/7)</h3>
              <div className="grid grid-cols-3 gap-3">
                {sectionPhotos.map((photo: any) => (
                  <div key={photo.slot} className="relative group">
                    <img src={`/assets/${photo.url}`} className="w-full h-32 object-cover rounded-lg" />
                    <button onClick={() => handleDeletePhoto(photo.slot)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100">✕</button>
                  </div>
                ))}
              </div>
            </div>
            {sectionPhotos.length < 7 && (
              <form onSubmit={handleAddPhotos} className="space-y-3">
                <input type="file" multiple accept="image/*" onChange={(e) => setFormPhotos(Array.from(e.target.files || []))} className="form-input" />
                <button type="submit" className="btn-primary">Загрузить</button>
              </form>
            )}
          </div>
        </>
      )}

      {/* ============ МОДАЛКА ЧЕК-ЛИСТА ============ */}
      {showChecklistModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            style={{ zIndex: 999999, pointerEvents: 'auto', marginTop: 0 }} 
            onClick={() => setShowChecklistModal(false)} 
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg z-[1000000]"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                {editingTask ? 'Редактировать задачу' : 'Новая задача'}
              </h2>
              <button onClick={() => setShowChecklistModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div>
                <label className="form-label">Тип смены</label>
                <select value={taskShiftType} onChange={(e) => setTaskShiftType(e.target.value)} className="form-input">
                  <option value="day">Дневная смена</option>
                  <option value="night">Ночная смена</option>
                </select>
              </div>

              <div>
                <label className="form-label">Порядок</label>
                <input type="number" value={taskOrder} onChange={(e) => setTaskOrder(Number(e.target.value))} className="form-input" required />
              </div>

              <div>
                <label className="form-label">Текст задачи</label>
                <textarea value={taskText} onChange={(e) => setTaskText(e.target.value)} rows={3} className="form-input" required />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowChecklistModal(false)} className="btn-outline">Отмена</button>
                <button type="submit" className="btn-primary">{editingTask ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ============ МОДАЛКА НОВОСТИ ============ */}
      {showNewsModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            style={{ zIndex: 999999, pointerEvents: 'auto', marginTop: 0 }} 
            onClick={() => setShowNewsModal(false)} 
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-lg z-[1000000]"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                {editingNews ? 'Редактировать новость' : 'Новая новость'}
              </h2>
              <button onClick={() => setShowNewsModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmitNews} className="space-y-4">
              <input
                type="text"
                placeholder="Заголовок"
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                className="form-input"
                required
              />
              <textarea
                placeholder="Текст новости"
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                rows={5}
                className="form-input"
                required
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewsModal(false)} className="btn-outline">Отмена</button>
                <button type="submit" className="btn-primary">{editingNews ? 'Сохранить' : 'Опубликовать'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};