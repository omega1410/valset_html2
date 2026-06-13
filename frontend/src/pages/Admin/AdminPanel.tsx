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
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useMobile } from '../../hooks/useMobile';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useQueryClient } from '@tanstack/react-query';
import { 
  FileText, 
  Users, 
  BookOpen, 
  ClipboardList, 
  Newspaper, 
  FolderOpen, 
  MessageSquare,
  Trash2,
  Edit3,
  Plus,
  X,
  HelpCircle,
  Bug,
  Lightbulb,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

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
  const isMobile = useMobile();
  const queryClient = useQueryClient();
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
  
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPhotos, setFormPhotos] = useState<any[]>([]);
  
  const [userEmail, setUserEmail] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('user');
  
  const [testFormTitle, setTestFormTitle] = useState('');
  const [testFormDescription, setTestFormDescription] = useState('');
  const [testFormSectionId, setTestFormSectionId] = useState<number | null>(null);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  
  const [taskShiftType, setTaskShiftType] = useState('day');
  const [taskText, setTaskText] = useState('');
  const [taskOrder, setTaskOrder] = useState(1);
  const [taskHint, setTaskHint] = useState('');
  
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');

  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [commentText, setCommentText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [orderedSections, setOrderedSections] = useState([]);

  const formatFeedbackDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 3);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ========== АВТО-ОБНОВЛЕНИЕ ==========
  useAutoRefresh({
    queryKeys: [
      ['admin', 'sections'],
      ['admin', 'tests'],
      ['admin', 'checklists'],
      ['admin', 'news'],
      ['admin', 'users'],
      ['admin', 'files'],
      ['admin', 'feedback']
    ],
    interval: 15000,
    enabled: true,
    onRefresh: () => {
      if (activeTab === 'sections') {
        loadSectionsData();
      } else if (activeTab === 'tests') {
        loadTestsData();
      } else if (activeTab === 'checklists') {
        loadChecklistsData();
      } else if (activeTab === 'news') {
        loadNewsData();
      } else if (activeTab === 'users') {
        loadUsersData();
      } else if (activeTab === 'files') {
        loadFilesData();
      } else if (activeTab === 'feedback') {
        loadFeedback();
      }
    }
  });

  useEffect(() => {
    setOrderedSections(sections);
  }, [sections]);

  // ========== ФУНКЦИИ ЗАГРУЗКИ ДАННЫХ ==========
  const loadSectionsData = async () => {
    try {
      const data = await adminService.getSections();
      setSections(data);
    } catch (error) {
      console.error('Ошибка загрузки разделов:', error);
    }
  };

  const loadUsersData = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const loadTestsData = async () => {
    try {
      const data = await testsAdminService.getTests();
      setTests(data);
    } catch (error) {
      console.error('Ошибка загрузки тестов:', error);
    }
  };

  const loadChecklistsData = async () => {
    try {
      const data = await adminService.getChecklistTasks();
      setChecklistTasks(data);
    } catch (error) {
      console.error('Ошибка загрузки чек-листов:', error);
    }
  };

  const loadNewsData = async () => {
    try {
      const data = await adminService.getNews();
      setNews(data);
    } catch (error) {
      console.error('Ошибка загрузки новостей:', error);
    }
  };

  const loadFilesData = async () => {
    try {
      const data = await adminService.getFiles();
      setFiles(data);
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sections') {
        await loadSectionsData();
      } else if (activeTab === 'users') {
        await loadUsersData();
      } else if (activeTab === 'tests') {
        await loadTestsData();
      } else if (activeTab === 'checklists') {
        await loadChecklistsData();
      } else if (activeTab === 'news') {
        await loadNewsData();
      } else if (activeTab === 'files') {
        await loadFilesData();
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const [list, stats] = await Promise.all([
        api.get('/feedback/admin/feedback').then(r => r.data),
        api.get('/feedback/admin/feedback/stats/summary').then(r => r.data)
      ]);
      setFeedbackList(list);
      setFeedbackStats(stats);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Ошибка загрузки фидбэка');
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedback();
    } else {
      loadData();
    }
  }, [activeTab]);

  // ========== FEEDBACK ФУНКЦИИ ==========
  const updateFeedbackStatus = async (id: number, status: string) => {
    try {
      await api.put(`/feedback/admin/feedback/${id}`, { status });
      toast.success('Статус обновлён');
      loadFeedback();
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const openCommentModal = (feedback: any) => {
    setSelectedFeedback(feedback);
    setCommentText(feedback.admin_comment || '');
    setShowCommentModal(true);
  };

  const saveComment = async () => {
    if (!selectedFeedback) return;
    try {
      await api.put(`/feedback/admin/feedback/${selectedFeedback.id}`, { comment: commentText });
      toast.success('Комментарий сохранён');
      setShowCommentModal(false);
      loadFeedback();
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
  };

  const deleteFeedback = async (id: number) => {
    if (confirm('Удалить сообщение?')) {
      try {
        await api.delete(`/feedback/admin/feedback/${id}`);
        toast.success('Сообщение удалено');
        loadFeedback();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  // ========== РАЗДЕЛЫ ==========
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
      await loadSectionsData();
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
        await loadSectionsData();
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'sections'] });
      await loadSectionsData();
    } catch (error) {
      toast.error(editingSection ? 'Ошибка обновления' : 'Ошибка создания');
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (confirm('Удалить раздел?')) {
      try {
        await adminService.deleteSection(id);
        toast.success('Раздел удалён');
        queryClient.invalidateQueries({ queryKey: ['admin', 'sections'] });
        await loadSectionsData();
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
        await loadSectionsData();
      } catch (error) {
        toast.error('Ошибка сохранения порядка');
      }
    }
  };

  // ========== ПОЛЬЗОВАТЕЛИ ==========
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await loadUsersData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка создания');
    }
  };

  const handleDeleteUser = async (id: number, userRole: string) => {
    const message = userRole === 'admin' ? 'Вы действительно хотите удалить администратора?' : 'Удалить пользователя?';
    if (confirm(message)) {
      try {
        await adminService.deleteUser(id);
        toast.success('Пользователь удалён');
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        await loadUsersData();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Ошибка удаления');
      }
    }
  };

  // ========== ТЕСТЫ ==========
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] });
      await loadTestsData();
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] });
      await loadTestsData();
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const handleDeleteTest = async (testId: number) => {
    if (confirm('Удалить тест? Все вопросы будут удалены.')) {
      try {
        await testsAdminService.deleteTest(testId);
        toast.success('Тест удалён');
        queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] });
        await loadTestsData();
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

  const removeQuestionFromForm = async (index: number) => {
    const question = testQuestions[index];
    
    if (!confirm('Удалить вопрос?')) return;
    
    if (question.id) {
      try {
        await testsAdminService.deleteQuestion(question.id);
        toast.success('Вопрос удалён');
        queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] });
      } catch (error) {
        toast.error('Ошибка удаления вопроса');
        return;
      }
    }
    
    const newQuestions = [...testQuestions];
    newQuestions.splice(index, 1);
    newQuestions.forEach((q, idx) => { q.order_num = idx + 1; });
    setTestQuestions(newQuestions);
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] });
      await loadTestsData();
    } catch (error) {
      toast.error('Ошибка сохранения вопросов');
    }
  };

  // ========== ФАЙЛЫ ==========
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await adminService.uploadFile(formData);
      toast.success('Файл загружен');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'files'] });
      await loadFilesData();
    } catch (error) {
      toast.error('Ошибка загрузки');
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (confirm('Удалить файл?')) {
      try {
        await adminService.deleteFile(filename);
        toast.success('Файл удалён');
        queryClient.invalidateQueries({ queryKey: ['admin', 'files'] });
        await loadFilesData();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  // ========== ЧЕК-ЛИСТЫ ==========
  const openTaskModal = (task?: any) => {
    if (task) {
      setEditingTask(task);
      setTaskShiftType(task.shift_type);
      setTaskText(task.task_text);
      setTaskOrder(task.task_order);
      setTaskHint(task.hint || '');
    } else {
      setEditingTask(null);
      setTaskShiftType('day');
      setTaskText('');
      setTaskOrder(checklistTasks.length + 1);
      setTaskHint('');
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
          hint: taskHint || null,
        });
        toast.success('Задача обновлена');
      } else {
        await adminService.createChecklistTask({
          shift_type: taskShiftType,
          task_text: taskText,
          task_order: taskOrder,
          hint: taskHint || null,
        });
        toast.success('Задача создана');
      }
      setShowChecklistModal(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'checklists'] });
      await loadChecklistsData();
    } catch (error) {
      toast.error(editingTask ? 'Ошибка обновления' : 'Ошибка создания');
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (confirm('Удалить задачу?')) {
      try {
        await adminService.deleteChecklistTask(id);
        toast.success('Задача удалена');
        queryClient.invalidateQueries({ queryKey: ['admin', 'checklists'] });
        await loadChecklistsData();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  // ========== НОВОСТИ ==========
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
      await loadNewsData();
    } catch (error) {
      toast.error(editingNews ? 'Ошибка обновления' : 'Ошибка создания');
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (confirm('Удалить новость?')) {
      try {
        await adminService.deleteNews(id);
        toast.success('Новость удалена');
        queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
        await loadNewsData();
      } catch (error) {
        toast.error('Ошибка удаления');
      }
    }
  };

  const handleTogglePublish = async (id: number, isPublished: boolean) => {
    try {
      await adminService.updateNews(id, { is_published: !isPublished });
      toast.success(isPublished ? 'Новость скрыта' : 'Новость опубликована');
      queryClient.invalidateQueries({ queryKey: ['admin', 'news'] });
      await loadNewsData();
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFeedbackTypeLabel = (type: string) => {
    switch(type) {
      case 'bug': return 'Баг';
      case 'feature': return 'Предложение';
      case 'question': return 'Вопрос';
      default: return type;
    }
  };

  const getFeedbackStatusLabel = (status: string) => {
    switch(status) {
      case 'new': return 'Новое';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Завершено';
      default: return status;
    }
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch(type) {
      case 'bug': return <Bug size={14} />;
      case 'feature': return <Lightbulb size={14} />;
      case 'question': return <HelpCircle size={14} />;
      default: return <MessageSquare size={14} />;
    }
  };

  const getFeedbackStatusIcon = (status: string) => {
    switch(status) {
      case 'new': return <AlertCircle size={14} />;
      case 'in_progress': return <Clock size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      default: return null;
    }
  };

  // ========== МОБИЛЬНЫЕ КАРТОЧКИ ==========
  const MobileUserCard = ({ user }: { user: any }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium text-slate-800 dark:text-white">{user.full_name}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${user.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'}`}>
          {user.role === 'admin' ? 'Админ' : 'Пользователь'}
        </span>
      </div>
      <div className="text-sm text-slate-500 mb-3">{user.email}</div>
      <div className="flex justify-end">
        <button onClick={() => handleDeleteUser(user.id, user.role)} className="text-red-600 text-sm flex items-center gap-1">
          <Trash2 size={14} /> Удалить
        </button>
      </div>
    </div>
  );

  const MobileTestCard = ({ test }: { test: any }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-slate-800 dark:text-white">{test.title}</h3>
        <div className="flex gap-2">
          <button onClick={() => openEditTestModal(test.id)} className="text-blue-600 dark:text-blue-400">
            <Edit3 size={16} />
          </button>
          <button onClick={() => handleDeleteTest(test.id)} className="text-red-600 dark:text-red-400">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {test.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{test.description}</p>}
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-500 dark:text-slate-400">📘 {test.questions_count} вопросов</span>
        {test.section_id && <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">Раздел {test.section_id}</span>}
      </div>
      <button onClick={() => openEditTestModal(test.id)} className="mt-3 w-full btn-outline text-sm py-2 flex items-center justify-center gap-2">
        <Edit3 size={14} /> Редактировать вопросы
      </button>
    </div>
  );

  const MobileChecklistCard = ({ task }: { task: any }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-2">
        <span className={`px-2 py-0.5 rounded-full text-xs ${task.shift_type === 'day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
          {task.shift_type === 'day' ? 'Дневная' : 'Ночная'}
        </span>
        <span className="text-xs text-slate-400">Порядок: {task.task_order}</span>
      </div>
      <p className="text-slate-800 dark:text-white text-sm mb-2">{task.task_text}</p>
      {task.hint && (
        <div className="mb-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
          💡 Подсказка: {task.hint}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={() => openTaskModal(task)} className="text-blue-600 text-sm flex items-center gap-1">
          <Edit3 size={14} /> Ред.
        </button>
        <button onClick={() => handleDeleteTask(task.id)} className="text-red-600 text-sm flex items-center gap-1">
          <Trash2 size={14} /> Уд.
        </button>
      </div>
    </div>
  );

  const MobileNewsCard = ({ item }: { item: any }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-slate-800 dark:text-white flex-1">{item.title}</h3>
        <button
          onClick={() => handleTogglePublish(item.id, item.is_published)}
          className={`px-2 py-0.5 rounded-full text-xs ${item.is_published ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
        >
          {item.is_published ? 'Опубликовано' : 'Скрыто'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-2">{item.author_name} • {new Date(item.created_at).toLocaleDateString('ru-RU')}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={() => openNewsModal(item)} className="text-blue-600 text-sm flex items-center gap-1">
          <Edit3 size={14} /> Ред.
        </button>
        <button onClick={() => handleDeleteNews(item.id)} className="text-red-600 text-sm flex items-center gap-1">
          <Trash2 size={14} /> Уд.
        </button>
      </div>
    </div>
  );

  const MobileFileCard = ({ file }: { file: any }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-slate-500" />
          <span className="font-medium text-slate-800 dark:text-white break-words flex-1">{file.name}</span>
        </div>
        <span className="text-xs text-slate-400">{formatFileSize(file.size)}</span>
      </div>
      <div className="flex gap-2 justify-end mt-2">
        <button onClick={() => handleDeleteFile(file.name)} className="text-red-600 text-sm flex items-center gap-1">
          <Trash2 size={14} /> Удалить
        </button>
      </div>
    </div>
  );

  const MobileFeedbackCard = ({ item }: { item: any }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border ${item.status === 'new' ? 'border-l-4 border-l-amber-500' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${item.type === 'bug' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : item.type === 'feature' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
              {getFeedbackTypeIcon(item.type)} {getFeedbackTypeLabel(item.type)}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${item.status === 'new' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : item.status === 'in_progress' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
              {getFeedbackStatusIcon(item.status)} {getFeedbackStatusLabel(item.status)}
            </span>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">{formatFeedbackDate(item.created_at)}</div>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">От: {item.user_name} ({item.user_email})</div>
      </div>
      <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{item.subject}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{item.message}</p>
      {item.admin_comment && (
        <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Ответ админа:</span>{' '}
          <span className="text-slate-600 dark:text-slate-400">{item.admin_comment}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
        <select
          value={item.status}
          onChange={(e) => updateFeedbackStatus(item.id, e.target.value)}
          className="text-sm px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="new">Новое</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Завершено</option>
        </select>
        <button onClick={() => openCommentModal(item)} className="text-sm px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition flex items-center gap-1">
          <MessageSquare size={14} /> Комментарий
        </button>
        <button onClick={() => deleteFeedback(item.id)} className="text-sm px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition flex items-center gap-1">
          <Trash2 size={14} /> Удалить
        </button>
      </div>
    </div>
  );

  // ========== РЕНДЕР ==========
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">Админ-панель</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Управление разделами, пользователями, тестами, чек-листами, новостями и файлами</p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 min-w-max">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-medium transition flex items-center gap-2 ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>
            <Users size={16} /> Пользователи
          </button>
          <button onClick={() => setActiveTab('sections')} className={`px-4 py-2 font-medium transition flex items-center gap-2 ${activeTab === 'sections' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>
            <BookOpen size={16} /> Разделы
          </button>
          <button onClick={() => setActiveTab('tests')} className={`px-4 py-2 font-medium transition flex items-center gap-2 ${activeTab === 'tests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>
            <ClipboardList size={16} /> Тесты
          </button>
          <button onClick={() => setActiveTab('checklists')} className={`px-4 py-2 font-medium transition flex items-center gap-2 ${activeTab === 'checklists' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>
            <CheckCircle size={16} /> Чек-листы
          </button>
          <button onClick={() => setActiveTab('news')} className={`px-4 py-2 font-medium transition flex items-center gap-2 ${activeTab === 'news' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>
            <Newspaper size={16} /> Новости
          </button>
          <button onClick={() => setActiveTab('files')} className={`px-4 py-2 font-medium transition flex items-center gap-2 ${activeTab === 'files' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>
            <FolderOpen size={16} /> Файлы
          </button>
          <button onClick={() => setActiveTab('feedback')} className={`px-4 py-2 font-medium transition flex items-center gap-2 ${activeTab === 'feedback' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>
            <MessageSquare size={16} /> Фидбэк
          </button>
        </div>
      </div>

      {activeTab === 'sections' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditingSection(null); setFormTitle(''); setFormContent(''); setFormPhotos([]); setShowModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Добавить раздел
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12">Загрузка...</div>
          ) : orderedSections.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500">Нет разделов</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedSections.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="card overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[500px]">
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
                        <SortableSectionRow key={section.id} section={section} onEdit={openEditModal} onDelete={handleDeleteSection} onPhoto={openPhotoModal} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Users size={18} /> Добавить пользователя
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Имя</label>
                  <input type="text" placeholder="Иван" value={userFirstName} onChange={(e) => setUserFirstName(e.target.value)} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">Фамилия</label>
                  <input type="text" placeholder="Иванов" value={userLastName} onChange={(e) => setUserLastName(e.target.value)} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" placeholder="example@hotel.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="form-input" required />
                </div>
                <div>
                  <label className="form-label">Пароль</label>
                  <input type="password" placeholder="••••••" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} className="form-input" required />
                </div>
              </div>
              <div>
                <label className="form-label">Роль</label>
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)} className="form-input">
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <button type="submit" className="btn-secondary flex items-center gap-2">
                <Plus size={16} /> Создать пользователя
              </button>
            </form>
          </div>
          {loading ? (
            <div className="text-center py-12">Загрузка...</div>
          ) : isMobile ? (
            <div className="space-y-3">{users.map((user: any) => (<MobileUserCard key={user.id} user={user} />))}</div>
          ) : (
            <div className="card overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[600px]">
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
                      <td className="table-cell">{user.id}</td>
                      <td className="table-cell">{user.email}</td>
                      <td className="table-cell font-medium">{user.full_name}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {user.role === 'admin' ? 'Админ' : 'Пользователь'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button onClick={() => handleDeleteUser(user.id, user.role)} className="text-red-600 flex items-center gap-1">
                          <Trash2 size={14} /> Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { resetTestForm(); setShowTestModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Создать тест
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12">Загрузка...</div>
          ) : tests.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500">Нет тестов</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">{tests.map((test: any) => (<MobileTestCard key={test.id} test={test} />))}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tests.map((test: any) => (
                <div key={test.id} className="card p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{test.title}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => openEditTestModal(test.id)} className="text-blue-600">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDeleteTest(test.id)} className="text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {test.description && <p className="text-sm text-slate-500 mb-3">{test.description}</p>}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">📘 {test.questions_count} вопросов</span>
                    {test.section_id && <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">Раздел {test.section_id}</span>}
                  </div>
                  <button onClick={() => openEditTestModal(test.id)} className="mt-3 w-full btn-outline text-sm py-2 flex items-center justify-center gap-2">
                    <Edit3 size={14} /> Редактировать вопросы
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'checklists' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openTaskModal()} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Добавить задачу
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12">Загрузка...</div>
          ) : checklistTasks.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500">Нет задач</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">{checklistTasks.map((task: any) => (<MobileChecklistCard key={task.id} task={task} />))}</div>
          ) : (
            <div className="card overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">ID</th>
                    <th className="table-header-cell">Смена</th>
                    <th className="table-header-cell">Порядок</th>
                    <th className="table-header-cell">Задача</th>
                    <th className="table-header-cell">Подсказка</th>
                    <th className="table-header-cell">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {checklistTasks.map((task: any) => (
                    <tr key={task.id} className="table-row">
                      <td className="table-cell">{task.id}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs ${task.shift_type === 'day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {task.shift_type === 'day' ? 'Дневная' : 'Ночная'}
                        </span>
                      </td>
                      <td className="table-cell">{task.task_order}</td>
                      <td className="table-cell">{task.task_text}</td>
                      <td className="table-cell text-xs text-slate-500 max-w-xs truncate">{task.hint || '—'}</td>
                      <td className="table-cell space-x-3">
                        <button onClick={() => openTaskModal(task)} className="text-blue-600">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} className="text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'news' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openNewsModal()} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Создать новость
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12">Загрузка...</div>
          ) : news.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500">Нет новостей</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">{news.map((item: any) => (<MobileNewsCard key={item.id} item={item} />))}</div>
          ) : (
            <div className="card overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[650px]">
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
                      <td className="table-cell">{item.id}</td>
                      <td className="table-cell font-medium">{item.title}</td>
                      <td className="table-cell">{item.author_name}</td>
                      <td className="table-cell">
                        <button onClick={() => handleTogglePublish(item.id, item.is_published)} className={`px-2 py-1 rounded-full text-xs ${item.is_published ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.is_published ? 'Опубликовано' : 'Скрыто'}
                        </button>
                      </td>
                      <td className="table-cell">{new Date(item.created_at).toLocaleDateString('ru-RU')}</td>
                      <td className="table-cell space-x-3">
                        <button onClick={() => openNewsModal(item)} className="text-blue-600">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDeleteNews(item.id)} className="text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FolderOpen size={18} /> Загрузить файл
            </h3>
            <form onSubmit={handleUploadFile} className="space-y-4">
              <input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="w-full" required />
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Загрузить
              </button>
            </form>
          </div>
          {loading ? (
            <div className="text-center py-12">Загрузка...</div>
          ) : isMobile ? (
            <div className="space-y-3">{files.map((file: any) => (<MobileFileCard key={file.name} file={file} />))}</div>
          ) : (
            <div className="card overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Название</th>
                    <th className="table-header-cell">Размер</th>
                    <th className="table-header-cell"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file: any) => (
                    <tr key={file.name} className="table-row">
                      <td className="table-cell font-medium flex items-center gap-2">
                        <FileText size={16} className="text-slate-500" />
                        {file.name}
                      </td>
                      <td className="table-cell">{formatFileSize(file.size)}</td>
                      <td className="table-cell">
                        <button onClick={() => handleDeleteFile(file.name)} className="text-red-600 flex items-center gap-1">
                          <Trash2 size={14} /> Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare size={20} /> Обратная связь
            </h2>
            <button onClick={() => loadFeedback()} className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">
              Обновить
            </button>
          </div>
          {feedbackLoading ? (
            <div className="text-center py-12">Загрузка...</div>
          ) : feedbackList.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-500">Нет сообщений</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">{feedbackList.map((item: any) => (<MobileFeedbackCard key={item.id} item={item} />))}</div>
          ) : (
            <>
              {feedbackStats && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-200">{feedbackStats.total}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-300">Всего</div>
                  </div>
                  <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-200">{feedbackStats.by_status?.new || 0}</div>
                    <div className="text-xs text-amber-600 dark:text-amber-300">Новые</div>
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-200">{feedbackStats.by_status?.in_progress || 0}</div>
                    <div className="text-xs text-purple-600 dark:text-purple-300">В работе</div>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">{feedbackStats.by_status?.completed || 0}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-300">Завершены</div>
                  </div>
                  <div className="bg-rose-100 dark:bg-rose-900/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-rose-700 dark:text-rose-200">{feedbackStats.by_type?.bug || 0}</div>
                    <div className="text-xs text-rose-600 dark:text-rose-300">Баги</div>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-200">{feedbackStats.by_type?.feature || 0}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-300">Предложения</div>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {feedbackList.map((item: any) => (
                  <div key={item.id} className={`card p-4 ${item.status === 'new' ? 'border-l-4 border-l-amber-500' : ''}`}>
                    <div className="flex justify-between flex-wrap gap-3 mb-3">
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${item.type === 'bug' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : item.type === 'feature' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          {getFeedbackTypeIcon(item.type)} {getFeedbackTypeLabel(item.type)}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${item.status === 'new' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : item.status === 'in_progress' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                          {getFeedbackStatusIcon(item.status)} {getFeedbackStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{formatFeedbackDate(item.created_at)}</div>
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-2">{item.subject}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{item.message}</p>
                    <div className="text-xs text-slate-400 mb-3">От: {item.user_name} ({item.user_email})</div>
                    {item.admin_comment && (
                      <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Ответ админа:</span> {item.admin_comment}
                      </div>
                    )}
                    <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <select value={item.status} onChange={(e) => updateFeedbackStatus(item.id, e.target.value)} className="text-sm px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer">
                        <option value="new">Новое</option>
                        <option value="in_progress">В работе</option>
                        <option value="completed">Завершено</option>
                      </select>
                      <button onClick={() => openCommentModal(item)} className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition flex items-center gap-1">
                        <MessageSquare size={14} /> Комментарий
                      </button>
                      <button onClick={() => deleteFeedback(item.id)} className="text-sm px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition flex items-center gap-1">
                        <Trash2 size={14} /> Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Модальные окна */}
      {showTestModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[999999]" onClick={() => setShowTestModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-[calc(100%-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto z-[1000000]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingTest ? 'Редактировать тест' : 'Создать тест'}</h2>
              <button onClick={() => setShowTestModal(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editingTest ? handleUpdateTest : handleCreateTest} className="space-y-4">
              <div>
                <label className="form-label">Название теста *</label>
                <input type="text" value={testFormTitle} onChange={(e) => setTestFormTitle(e.target.value)} className="form-input" required />
              </div>
              <div>
                <label className="form-label">Описание</label>
                <textarea value={testFormDescription} onChange={(e) => setTestFormDescription(e.target.value)} className="form-input" rows={2} />
              </div>
              <div>
                <label className="form-label">ID раздела</label>
                <input type="number" value={testFormSectionId || ''} onChange={(e) => setTestFormSectionId(e.target.value ? Number(e.target.value) : null)} className="form-input" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowTestModal(false)} className="btn-outline">Отмена</button>
                <button type="submit" className="btn-primary">{editingTest ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
            {editingTest && (
              <div className="mt-8 pt-6 border-t">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Вопросы</h3>
                  <button type="button" onClick={addQuestionToForm} className="text-sm text-blue-600 flex items-center gap-1">
                    <Plus size={14} /> Добавить вопрос
                  </button>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {testQuestions.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Нет вопросов</p>
                  ) : (
                    testQuestions.map((q, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <h4 className="font-medium">Вопрос {idx+1}</h4>
                          <button type="button" onClick={() => removeQuestionFromForm(idx)} className="text-red-500 text-sm flex items-center gap-1">
                            <Trash2 size={14} /> Удалить
                          </button>
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
                <div className="flex justify-end mt-4">
                  <button type="button" onClick={saveQuestions} className="btn-primary">Сохранить вопросы</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[999999]" onClick={() => setShowModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto z-[1000000]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingSection ? 'Редактировать раздел' : 'Новый раздел'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400">
                <X size={20} />
              </button>
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

      {showPhotoModal && selectedSection && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[999999]" onClick={() => setShowPhotoModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto z-[1000000]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Фото: {selectedSection.title}</h2>
              <button onClick={() => setShowPhotoModal(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="mb-6">
              <h3 className="font-medium mb-3">Текущие фото ({sectionPhotos.length}/7)</h3>
              <div className="grid grid-cols-3 gap-3">
                {sectionPhotos.map((photo: any) => (
                  <div key={photo.slot} className="relative group">
                    <img src={`/assets/${photo.url}`} className="w-full h-32 object-cover rounded-lg" />
                    <button onClick={() => handleDeletePhoto(photo.slot)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100">
                      <X size={12} />
                    </button>
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

      {showChecklistModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[999999]" onClick={() => setShowChecklistModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto z-[1000000]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingTask ? 'Редактировать задачу' : 'Новая задача'}</h2>
              <button onClick={() => setShowChecklistModal(false)} className="text-slate-400">
                <X size={20} />
              </button>
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
              <div>
                <label className="form-label">Подсказка (необязательно)</label>
                <textarea value={taskHint} onChange={(e) => setTaskHint(e.target.value)} rows={3} className="form-input" placeholder="Дополнительная информация для сотрудника..." />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowChecklistModal(false)} className="btn-outline">Отмена</button>
                <button type="submit" className="btn-primary">{editingTask ? 'Сохранить' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {showNewsModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[999999]" onClick={() => setShowNewsModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto z-[1000000]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingNews ? 'Редактировать новость' : 'Новая новость'}</h2>
              <button onClick={() => setShowNewsModal(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitNews} className="space-y-4">
              <input type="text" placeholder="Заголовок" value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)} className="form-input" required />
              <textarea placeholder="Текст новости" value={newsContent} onChange={(e) => setNewsContent(e.target.value)} rows={5} className="form-input" required />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewsModal(false)} className="btn-outline">Отмена</button>
                <button type="submit" className="btn-primary">{editingNews ? 'Сохранить' : 'Опубликовать'}</button>
              </div>
            </form>
          </div>
        </>
      )}

      {showCommentModal && selectedFeedback && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowCommentModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-xl p-6 w-[calc(100%-2rem)] max-w-lg z-50">
            <h3 className="text-lg font-semibold mb-4">Комментарий к сообщению</h3>
            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={4} placeholder="Введите комментарий..." />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowCommentModal(false)} className="btn-outline">Отмена</button>
              <button onClick={saveComment} className="btn-primary">Сохранить</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
