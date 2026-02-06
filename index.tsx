
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import logoImage from './assets/NM Media Collage logo.png';
import { 
  Users, 
  BookOpen, 
  Bell, 
  LayoutDashboard, 
  LogOut, 
  Plus, 
  Search, 
  UserCircle, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Send,
  X,
  Clock,
  CheckCircle,
  FileText,
  Database,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Home,
  CreditCard,
  MapPin,
  MoreVertical,
  Trash2,
  DollarSign,
  Menu,
  ShieldAlert,
  UserPlus,
  ArrowRight,
  Key,
  ShieldQuestion,
  Info,
  AlertCircle,
  Filter,
  Lock,
  Megaphone,
  CreditCard as CreditIcon,
  UserMinus,
  Timer,
  GraduationCap,
  ClipboardList,
  CheckSquare,
  AlertOctagon,
  Award,
  BookMarked,
  Tag,
  ArrowLeft,
  Edit3,
  Save,
  Bold,
  Italic,
  List,
  Heading1,
  Link2,
  Star,
  ExternalLink,
  ClipboardCheck
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// --- Supabase Config ---
const SUPABASE_URL = "https://rwjjczpasnwrkuxfdsez.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3ampjenBhc253cmt1eGZkc2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjQ3MjAsImV4cCI6MjA4NTAwMDcyMH0.s3-cjr0zXNPpRvM2vcGPzw5m0UfyTdHK4iAQA1X23lw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Types ---
type AppState = 'welcome' | 'auth' | 'pending' | 'authenticated';
type Role = 'admin' | 'student';
type AdminLevel = 'overall' | 'class' | 'none';
type ToastType = 'success' | 'error' | 'info' | 'warning';
type ModalType = 'student' | 'admin' | 'fee' | 'notice' | 'password' | 'assignment' | 'submission' | 'faculty' | 'pay_fee' | 'fee_approval' | 'none';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface PortalUser {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  role: Role;
  admin_level: AdminLevel;
  is_approved: boolean;
  suspended_until?: string | null;
  metadata?: {
    managed_course?: string;
    is_president?: boolean;
    [key: string]: any;
  };
}

interface Student { 
  id: string; 
  name: string; 
  email: string; 
  course: string; 
  year: number; 
  gpa: number; 
  attendance: number; 
  phone?: string;
  status: 'active' | 'postponed';
  metadata?: {
    is_president?: boolean;
    [key: string]: any;
  };
}
interface Course { id: string; name: string; code: string; department: string; students: number; outline?: string; }
interface Notice { id: string; title: string; content: string; date: string; priority: 'high' | 'medium' | 'low'; }
interface Fee { 
  id: string; 
  student_id: string; 
  amount: number; 
  description: string; 
  status: 'paid' | 'pending' | 'overdue' | 'processing' | 'denied'; 
  due_date: string; 
  type: 'tuition' | 'exam'; 
  reference_number?: string;
}

interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  is_exam: boolean;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  score?: number;
  graded_by?: string;
  type: 'regular' | 'supplementary';
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<PortalUser[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modalType, setModalType] = useState<ModalType>('none');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId) || null, [courses, selectedCourseId]);
  const pendingUsers = useMemo(() => allUsers.filter(u => !u.is_approved), [allUsers]);
  const managedUsers = useMemo(() => allUsers.filter(u => u.is_approved), [allUsers]);

  const showToast = (message: string, type: ToastType = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const generateId = () => crypto.randomUUID();

  // --- Data Fetch ---
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [s, c, n, f, uAll, a, sub] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('courses').select('*'),
        supabase.from('notices').select('*').order('date', { ascending: false }),
        supabase.from('fees').select('*').order('due_date', { ascending: false }),
        supabase.from('portal_users').select('*'),
        supabase.from('assignments').select('*'),
        supabase.from('submissions').select('*')
      ]);
      setStudents(s.data || []);
      setCourses(c.data || []);
      setNotices(n.data || []);
      setFees(f.data || []);
      setAllUsers(uAll.data || []);
      setAssignments(a.data || []);
      setSubmissions(sub.data || []);
    } catch (err) {
      showToast("Sync Error.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchPublicCourses = async () => {
      const { data } = await supabase.from('courses').select('*');
      if (data) setCourses(data);
    };
    fetchPublicCourses();
  }, []);

  useEffect(() => {
    if (appState === 'authenticated' && currentUser) fetchData();
  }, [appState, currentUser, fetchData]);

  // --- Core Handlers ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).toLowerCase();
    const password = formData.get('password') as string;

    try {
      if (authMode === 'signup') {
        const fullName = formData.get('name') as string;
        const appMetadata = {
          phone: formData.get('phone'),
          dob: formData.get('dob'),
          gender: formData.get('gender'),
          address: formData.get('address'),
          qualifications: formData.get('qualifications'),
          course: formData.get('course'),
          currency: formData.get('currency'),
          paymentPlan: formData.get('paymentPlan')
        };

        const { error } = await supabase.from('portal_users').insert([{
          id: generateId(),
          email, password, full_name: fullName, role: 'student', admin_level: 'none', is_approved: false,
          metadata: appMetadata
        }]);
        
        if (error) showToast(error.message, "error");
        else { showToast("Admission application submitted.", "success"); setAppState('pending'); }
      } else {
        const { data, error } = await supabase.from('portal_users').select('*').eq('email', email).eq('password', password).maybeSingle();
        if (error) showToast("DB Unreachable.", "error");
        else if (!data) showToast("Invalid credentials.", "error");
        else if (data.suspended_until && new Date(data.suspended_until) > new Date()) showToast("Account Suspended.", "error");
        else if (!data.is_approved && data.role !== 'admin') {
          setAppState('pending');
        } else {
          setCurrentUser(data);
          setAppState('authenticated');
          showToast(`Welcome back, ${data.full_name}`, "success");
        }
      }
    } finally { setLoading(false); }
  };

  const logout = () => {
    setCurrentUser(null);
    setAppState('welcome');
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
    setSelectedCourseId(null);
  };

  const approveUser = async (user: PortalUser) => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase.from('portal_users').update({ is_approved: true }).eq('id', user.id);
      if (updateError) throw updateError;

      if (user.role === 'student') {
        const { error: insertError } = await supabase.from('students').insert([{
          id: user.id,
          name: user.full_name,
          email: user.email,
          course: user.metadata?.course || 'Media Foundations',
          phone: user.metadata?.phone || '',
          year: 1, gpa: 0, attendance: 100, status: 'active',
          metadata: { ...user.metadata, is_president: false }
        }]);
        if (insertError) throw insertError;
      }
      
      showToast(`${user.full_name} identity confirmed.`, "success");
      await fetchData();
    } catch(err: any) {
      showToast(err.message, "error");
    } finally { setLoading(false); }
  };

  const handleDeleteUser = async (user: PortalUser) => {
    if (!confirm(`Are you sure you want to remove ${user.full_name} from the cloud?`)) return;
    setLoading(true);
    try {
      const { error: pError } = await supabase.from('portal_users').delete().eq('id', user.id);
      if (pError) throw pError;

      if (user.role === 'student') {
        const { error: sError } = await supabase.from('students').delete().eq('id', user.id);
      }

      showToast(`${user.full_name} purged from registry.`, "info");
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleClassPresident = async (user: PortalUser) => {
    const isPresident = !user.metadata?.is_president;
    const newMetadata = { ...user.metadata, is_president: isPresident };
    
    setLoading(true);
    try {
      await supabase.from('portal_users').update({ metadata: newMetadata }).eq('id', user.id);
      if (user.role === 'student') {
        await supabase.from('students').update({ metadata: newMetadata }).eq('id', user.id);
      }
      showToast(isPresident ? "Assigned as Class President." : "Presidential duties revoked.", "success");
      await fetchData();
    } catch(err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await supabase.from('assignments').insert([{
      id: generateId(),
      course_id: fd.get('course_id'),
      title: fd.get('title'),
      description: fd.get('description'),
      due_date: fd.get('due_date'),
      max_score: parseInt(fd.get('max_score') as string),
      is_exam: fd.get('is_exam') === 'true'
    }]);
    setModalType('none');
    showToast("Workload posted.", "success");
    fetchData();
  };

  const handleAddAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const level = fd.get('admin_level') as AdminLevel;
    const { error } = await supabase.from('portal_users').insert([{
      id: generateId(),
      email: fd.get('email'),
      password: fd.get('password'),
      full_name: fd.get('name'),
      role: 'admin',
      admin_level: level,
      is_approved: true,
      metadata: { managed_course: fd.get('managed_course') }
    }]);
    if (error) showToast(error.message, "error");
    else { showToast(`New Admin added.`, "success"); fetchData(); setModalType('none'); }
  };

  const handleCreateFaculty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from('courses').insert([{
      id: generateId(),
      name: fd.get('name'),
      code: fd.get('code'),
      department: fd.get('department'),
      students: 0
    }]);
    if (error) showToast(error.message, "error");
    else { showToast("Faculty established.", "success"); fetchData(); setModalType('none'); }
  };

  const handleCreateFee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const courseName = fd.get('course_name') as string;
    const amount = parseFloat(fd.get('amount') as string);
    const description = fd.get('description') as string;
    const due_date = fd.get('due_date') as string;
    const type = fd.get('type') as any;

    const facultyStudents = students.filter(s => s.course === courseName);
    if (facultyStudents.length === 0) {
      showToast("Selected faculty has no active cohorts.", "warning");
      return;
    }

    setLoading(true);
    const feeRecords = facultyStudents.map(s => ({
      id: generateId(),
      student_id: s.id,
      amount,
      description,
      due_date,
      type,
      status: 'pending'
    }));

    const { error } = await supabase.from('fees').insert(feeRecords);
    if (error) showToast(error.message, "error");
    else { showToast(`Fee distributed to ${facultyStudents.length} recipients.`, "success"); fetchData(); setModalType('none'); }
    setLoading(false);
  };

  const handleSubmitPaymentReference = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFee) return;
    const fd = new FormData(e.currentTarget);
    const ref = fd.get('reference_number') as string;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('fees')
        .update({ reference_number: ref, status: 'processing' })
        .eq('id', selectedFee.id);
      
      if (error) throw error;
      showToast("Reference submitted. Waiting for admin approval.", "success");
      setModalType('none');
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (fee: Fee) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('fees')
        .update({ status: 'paid' })
        .eq('id', fee.id);
      
      if (error) throw error;
      showToast("Payment confirmed and indexed.", "success");
      setModalType('none');
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDenyPayment = async (fee: Fee) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('fees')
        .update({ status: 'denied' })
        .eq('id', fee.id);
      
      if (error) throw error;
      showToast("Payment request denied. Reference saved for records.", "info");
      setModalType('none');
      await fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourse = async (courseId: string, updates: Partial<Course>) => {
    const { error } = await supabase.from('courses').update(updates).eq('id', courseId);
    if (error) showToast(error.message, "error");
    else { showToast("Faculty data updated.", "success"); fetchData(); }
  };

  const handleUpdateProfile = async (userId: string, updates: Partial<PortalUser>) => {
    const { error } = await supabase.from('portal_users').update(updates).eq('id', userId);
    if (error) showToast(error.message, "error");
    else { 
      showToast("Security updated.", "success"); 
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      }
      fetchData();
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: "You are the NewMarx Media AI Support assistant. You help students and admins with technical support, course information, and general inquiries about the Academic Cloud Ecosystem. Be professional, helpful, and concise."
        }
      });

      const aiText = response.text || "I'm having trouble processing that right now.";
      setChatHistory(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (err) {
      showToast("AI Link Failure.", "error");
      setChatHistory(prev => [...prev, { role: 'ai', text: "Error: Neural Link Sync interrupted. Please try again." }]);
    }
  };

  const SidebarItem = ({ icon, label, active, onClick }: any) => (
    <button 
      onClick={() => {
        onClick();
        setIsSidebarOpen(false);
      }} 
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}`}
    >
      {icon} <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );

  const Modal = ({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 relative overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
        <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">{title}</h3>
        {children}
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-xl transition-all">
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cohort Size</p><h3 className="text-2xl sm:text-3xl font-black text-slate-900">{students.length}</h3></div>
          <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center shrink-0"><Users /></div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-xl transition-all">
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faculty Units</p><h3 className="text-2xl sm:text-3xl font-black text-slate-900">{courses.length}</h3></div>
          <div className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center shrink-0"><BookMarked /></div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-xl transition-all">
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Financial State</p><h3 className="text-2xl sm:text-3xl font-black text-slate-900">{fees.filter(f => f.status === 'paid').length}/{fees.length}</h3></div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><DollarSign /></div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-xl transition-all">
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Broadcasts</p><h3 className="text-2xl sm:text-3xl font-black text-slate-900">{notices.length}</h3></div>
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0"><Bell /></div>
        </div>
      </div>
    </div>
  );

  const Curriculum = () => {
    if (selectedCourseId) return <CourseDetailPage courseId={selectedCourseId} onBack={() => setSelectedCourseId(null)} />;

    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Academic Workload</h3>
          <div className="flex gap-4">
            {currentUser?.admin_level === 'overall' && (
              <button onClick={() => setModalType('faculty')} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-black transition-all">
                <Plus size={18}/> New Faculty
              </button>
            )}
            {currentUser?.role === 'admin' && (
              <button onClick={() => setModalType('assignment')} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all">
                <Plus size={18}/> New Assignment
              </button>
            )}
          </div>
        </div>

        <section>
          <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><BookOpen size={20} className="text-indigo-600"/> Faculty Units</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(c => (
              <div 
                key={c.id} 
                onClick={() => setSelectedCourseId(c.id)}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={24} className="text-indigo-600" /></div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">{c.code}</p>
                <h5 className="text-lg font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{c.name}</h5>
                <p className="text-xs text-slate-400 font-medium mb-4">{c.department}</p>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs"><Users size={14}/> {students.filter(s => s.course === c.name).length} Registered</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const CourseDetailPage = ({ courseId, onBack }: { courseId: string, onBack: () => void }) => {
    const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(course?.name || '');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const isMasterAdmin = currentUser?.admin_level === 'overall';
    const isFacultyAdmin = currentUser?.admin_level === 'class' && currentUser?.metadata?.managed_course === course?.name;
    const canEdit = isMasterAdmin || isFacultyAdmin;

    if (!course) return null;

    const insertFormat = (prefix: string, suffix: string = '') => {
      if (!textareaRef.current) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const text = textareaRef.current.value;
      const selectedText = text.substring(start, end);
      const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      textareaRef.current.value = newText;
      textareaRef.current.focus();
    };

    return (
      <div className="space-y-12 animate-in slide-in-from-right-4 duration-500">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors">
          <ArrowLeft size={16}/> Back to Curriculum
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex-1 w-full">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">{course.code}</p>
            {isEditingName ? (
              <div className="flex items-center gap-3">
                <input 
                  autoFocus
                  className="text-4xl font-black text-slate-900 tracking-tight bg-slate-50 border-b-2 border-indigo-600 outline-none w-full"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                />
                <button onClick={() => { handleUpdateCourse(course.id, { name: tempName }); setIsEditingName(false); }} className="p-3 bg-indigo-600 text-white rounded-xl"><Save size={20}/></button>
              </div>
            ) : (
              <div className="flex items-center gap-4 group">
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">{course.name}</h3>
                {canEdit && <button onClick={() => setIsEditingName(true)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={20}/></button>}
              </div>
            )}
            <p className="text-slate-500 font-medium mt-2">{course.department} Faculty</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <FileText className="text-indigo-600" /> Course Outline
                </h4>
                {canEdit && (
                  <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                    <button onClick={() => insertFormat('# ', '')} title="Heading" className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Heading1 size={18}/></button>
                    <button onClick={() => insertFormat('**', '**')} title="Bold" className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Bold size={18}/></button>
                    <button onClick={() => insertFormat('*', '*')} title="Italic" className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Italic size={18}/></button>
                    <button onClick={() => insertFormat('- ', '')} title="List" className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><List size={18}/></button>
                    <button onClick={() => insertFormat('[', '](url)')} title="Link" className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Link2 size={18}/></button>
                  </div>
                )}
              </div>
              
              {canEdit ? (
                <form onSubmit={(e) => { e.preventDefault(); handleUpdateCourse(course.id, { outline: textareaRef.current?.value }); }} className="space-y-6">
                  <textarea 
                    ref={textareaRef}
                    name="outline" 
                    defaultValue={course.outline || ''} 
                    className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2rem] font-medium outline-none focus:border-indigo-600 transition-colors min-h-[400px] text-slate-700"
                  />
                  <button type="submit" className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl transition-all">
                    Sync Outline
                  </button>
                </form>
              ) : (
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{course.outline || 'Faculty curriculum pending publication.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RegistryManager = () => (
    <div className="space-y-12 animate-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Identity Control</h3>
        {currentUser?.admin_level === 'overall' && (
          <button onClick={() => setModalType('admin')} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all">
            <UserPlus size={18}/> Add Administrator
          </button>
        )}
      </div>

      <section>
        <h4 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><Clock size={20} className="text-amber-500"/> Pending Approval</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingUsers.map(u => (
            <div key={u.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">{u.full_name[0]}</div>
                <div><h4 className="font-black text-slate-900">{u.full_name}</h4><p className="text-xs text-slate-400 font-medium">{u.email}</p></div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => approveUser(u)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all">Approve</button>
                <button onClick={() => handleDeleteUser(u)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all">Reject</button>
              </div>
            </div>
          ))}
          {pendingUsers.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-[2.5rem]">Registry is clear.</div>}
        </div>
      </section>

      <div className="pt-12 border-t border-slate-200">
        <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-8">System Registry</h3>
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identity</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Hierarchy</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role Details</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {managedUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 font-black text-slate-900 text-sm">
                    <div className="flex items-center gap-3">
                      {u.full_name}
                      {u.metadata?.is_president && <Star size={14} className="text-amber-500 fill-amber-500"/>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{u.email}</span>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest ${u.admin_level === 'overall' ? 'bg-purple-100 text-purple-700' : u.admin_level === 'class' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-400'}`}>
                      {u.role === 'admin' ? (u.admin_level === 'overall' ? 'MASTER ADMIN' : 'FACULTY ADMIN') : 'STUDENT'}
                    </span>
                  </td>
                  <td className="p-6">
                    {u.metadata?.managed_course && <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{u.metadata.managed_course}</span>}
                    {u.metadata?.is_president && <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase tracking-widest">CLASS PRESIDENT</span>}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      {currentUser?.admin_level === 'overall' && u.role === 'student' && (
                        <button onClick={() => toggleClassPresident(u)} className={`p-2 rounded-lg transition-all ${u.metadata?.is_president ? 'bg-amber-100 text-amber-600' : 'text-slate-300 hover:bg-slate-50 hover:text-amber-500'}`} title="Toggle President Role">
                          <Star size={18}/>
                        </button>
                      )}
                      {currentUser?.id !== u.id && (
                        <button onClick={() => handleDeleteUser(u)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const FinancePage = () => {
    const displayFees = useMemo(() => {
      if (currentUser?.role === 'admin') return fees;
      const studentId = students.find(s => s.email === currentUser?.email)?.id;
      return fees.filter(f => f.student_id === studentId);
    }, [fees, currentUser, students]);

    const stats = useMemo(() => {
      const filtered = displayFees;
      return {
        total: filtered.reduce((acc, f) => acc + f.amount, 0),
        paid: filtered.filter(f => f.status === 'paid').reduce((acc, f) => acc + f.amount, 0),
        pending: filtered.filter(f => f.status === 'pending' || f.status === 'processing').reduce((acc, f) => acc + f.amount, 0)
      };
    }, [displayFees]);

    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Financial Records</h3>
          {currentUser?.role === 'admin' && currentUser?.admin_level === 'overall' && (
            <button onClick={() => setModalType('fee')} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg"><Plus size={18}/> Distribute Fee</button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Allocated</p>
            <h4 className="text-2xl font-black text-slate-900">MK {stats.total.toLocaleString()}</h4>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Settled Funds</p>
            <h4 className="text-2xl font-black text-emerald-600">MK {stats.paid.toLocaleString()}</h4>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding Balance</p>
            <h4 className="text-2xl font-black text-amber-600">MK {stats.pending.toLocaleString()}</h4>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-xl font-black text-slate-900 flex items-center gap-2"><CreditIcon size={20} className="text-indigo-600"/> Ledger Items</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayFees.map(f => {
              const student = students.find(s => s.id === f.student_id);
              const statusColors = {
                paid: 'bg-emerald-50 text-emerald-600',
                pending: 'bg-amber-50 text-amber-600',
                processing: 'bg-indigo-50 text-indigo-600 animate-pulse',
                overdue: 'bg-red-50 text-red-600',
                denied: 'bg-slate-100 text-slate-600'
              };

              return (
                <div key={f.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all relative">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest ${statusColors[f.status]}`}>{f.status}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.type}</span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 mb-1">MK {f.amount.toLocaleString()}</h4>
                  <p className="text-sm text-slate-500 font-medium mb-6">{f.description}</p>
                  
                  {f.reference_number && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Reference</p>
                      <p className="text-xs font-black text-slate-900 flex items-center gap-2"><ClipboardCheck size={14} className="text-indigo-600"/> {f.reference_number}</p>
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                    <div className="text-[10px] font-bold text-slate-400">Due: {new Date(f.due_date).toLocaleDateString()}</div>
                    {currentUser?.role === 'admin' ? (
                      <div className="flex items-center gap-2">
                        {(f.status === 'processing' || f.status === 'pending' || f.status === 'denied') && (
                          <button onClick={() => { setSelectedFee(f); setModalType('fee_approval'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg">Review</button>
                        )}
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{student?.name}</p>
                      </div>
                    ) : (
                      f.status === 'pending' && (
                        <button 
                          onClick={() => { setSelectedFee(f); setModalType('pay_fee'); }} 
                          className="px-6 py-3 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                        >
                          Submit Proof
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
            {displayFees.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-[2.5rem]">Financial ledger empty.</div>}
          </div>
        </div>
      </div>
    );
  };

  const BroadcastsPage = () => (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Global Broadcasts</h3>
        {currentUser?.role === 'admin' && (
          <button onClick={() => setModalType('notice')} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg"><Megaphone size={18}/> New Notice</button>
        )}
      </div>
      <div className="space-y-6">
        {notices.map(n => (
          <div key={n.id} className={`bg-white p-8 rounded-[2.5rem] border ${n.priority === 'high' ? 'border-red-100 bg-red-50/20' : 'border-slate-100'} shadow-sm hover:shadow-xl transition-all relative overflow-hidden`}>
            {n.priority === 'high' && <div className="absolute top-0 right-0 p-3 bg-red-600 text-white font-black text-[8px] uppercase tracking-widest rounded-bl-2xl">Urgent</div>}
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${n.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}><Bell size={24}/></div>
              <div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">{n.title}</h4>
                <p className="text-xs text-slate-400 font-medium">{new Date(n.date).toLocaleString()}</p>
              </div>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{n.content}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const SettingsPage = () => (
    <div className="space-y-12 animate-in fade-in duration-700">
      <h3 className="text-3xl font-black text-slate-900 tracking-tight">Cloud Security</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h4 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3"><Key className="text-indigo-600" /> Identity Credentials</h4>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleUpdateProfile(currentUser?.id!, { password: fd.get('password') as string }); }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Access Code</label>
              <input name="password" type="password" defaultValue={currentUser?.password || ''} required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-600 transition-colors" />
            </div>
            <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl">Update Access Code</button>
          </form>
        </div>
      </div>
    </div>
  );

  if (appState === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[3rem] p-12 text-center shadow-2xl">
          <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center text-white mb-8 mx-auto animate-pulse"><Clock size={40} /></div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Admission Pending</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">Your application for NewMarx Media is currently being reviewed. Access will be granted once identity is verified.</p>
          <button onClick={() => setAppState('welcome')} className="w-full py-5 bg-slate-100 text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Back to Home</button>
        </div>
      </div>
    );
  }

  if (appState !== 'authenticated' || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-y-auto relative">
        <div className="w-full max-w-xl bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl animate-in zoom-in duration-500 z-10">
          <div className="text-center mb-10">
            <div className="logo-container mb-6 mx-auto">
              <img src={logoImage} alt="NewMarx Media Logo" className="logo-image" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">NewMarx Media</h1>
            <p className="text-slate-500 font-medium text-sm italic">Academic Cloud Ecosystem</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <input name="name" placeholder="Full Legal Name" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" />
                <textarea name="qualifications" placeholder="Qualifications" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" rows={2} />
                <select name="course" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                  <option value="">Target Major</option>
                  {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            )}
            <input name="email" type="email" placeholder="Campus Email" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" />
            <input name="password" type="password" placeholder="Access Code" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" />
            <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : (authMode === 'login' ? 'Enter Cloud' : 'Apply for Entry')}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-8 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600">
            {authMode === 'login' ? "New Cohort Member? Apply" : "Already applied? Secure Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 md:px-10 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
          <div className="logo-container shrink-0">
            <img src={logoImage} alt="NewMarx Media Logo" className="logo-image" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 capitalize tracking-tight truncate max-w-[150px] sm:max-w-none">{activeTab}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-900">{currentUser.full_name}</p>
            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">
              {currentUser.role === 'admin' ? (currentUser.admin_level === 'overall' ? 'MASTER ADMIN' : 'FACULTY ADMIN') : 'STUDENT'}
            </p>
          </div>
          <button onClick={logout} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><LogOut size={20}/></button>
        </div>
      </header>

      <div className="flex">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[55] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
        )}
        <aside className={`w-72 fixed h-screen bg-slate-950 p-6 flex flex-col space-y-2 pt-24 z-[60] transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:flex`}>
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Overview" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Users size={20}/>} label="Records" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
          <SidebarItem icon={<BookOpen size={20}/>} label="Workload" active={activeTab === 'courses'} onClick={() => setActiveTab('courses')} />
          <SidebarItem icon={<CreditCard size={20}/>} label="Finance" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
          <SidebarItem icon={<Bell size={20}/>} label="Broadcasts" active={activeTab === 'notices'} onClick={() => setActiveTab('notices')} />
          {currentUser.role === 'admin' && <SidebarItem icon={<ShieldCheck size={20}/>} label="Registry" active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} />}
          <SidebarItem icon={<Settings size={20}/>} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </aside>

        <main className="flex-1 lg:pl-72 p-6 md:p-10 max-w-[1600px] mx-auto min-h-screen transition-all duration-300">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'approvals' && <RegistryManager />}
          {activeTab === 'courses' && <Curriculum />}
          {activeTab === 'finance' && <FinancePage />}
          {activeTab === 'notices' && <BroadcastsPage />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'students' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <h3 className="text-3xl font-black text-slate-900 tracking-tight">Academic Cloud Index</h3>
               <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-x-auto">
                 <table className="w-full text-left min-w-[700px]">
                   <thead className="bg-slate-50/50 border-b border-slate-100">
                     <tr>
                       <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                       <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Major/Faculty</th>
                       <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Designation</th>
                       <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">GPA</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {students.map(s => (
                       <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                         <td className="p-6 font-black text-slate-900 text-sm">{s.name}<br/><span className="text-[10px] text-slate-400 font-medium">{s.email}</span></td>
                         <td className="p-6 text-sm font-black text-slate-700">{s.course}</td>
                         <td className="p-6">
                            {s.metadata?.is_president && (
                              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                <Star size={12} className="fill-amber-600"/> Class President
                              </span>
                            )}
                         </td>
                         <td className="p-6 font-black text-indigo-600">{s.gpa}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {modalType === 'pay_fee' && selectedFee && (
        <Modal title={`Payment Proof Submission`} onClose={() => setModalType('none')}>
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <h5 className="font-black text-slate-900 mb-1">{selectedFee.description}</h5>
              <p className="text-2xl font-black text-indigo-600">MK {selectedFee.amount.toLocaleString()}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Required Action</p>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">Please provide the unique bank/mobile transaction reference number for verification.</p>
            </div>
            <form onSubmit={handleSubmitPaymentReference} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Reference Number</label>
                <input 
                  name="reference_number" 
                  placeholder="e.g. TXN-123456789" 
                  required 
                  className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-black outline-none focus:border-indigo-600 transition-colors" 
                />
              </div>
              <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl">
                {loading ? <Loader2 className="animate-spin mx-auto"/> : 'Synchronize Payment'}
              </button>
            </form>
          </div>
        </Modal>
      )}

      {modalType === 'fee_approval' && selectedFee && (
        <Modal title={`Review Payment: ${selectedFee.description}`} onClose={() => setModalType('none')}>
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payer</p>
                  <p className="text-lg font-black text-slate-900">{students.find(s => s.id === selectedFee.student_id)?.name || 'Unknown Student'}</p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Faculty</p>
                  <p className="text-lg font-black text-indigo-600">{students.find(s => s.id === selectedFee.student_id)?.course || 'N/A'}</p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount</p>
                  <p className="text-3xl font-black text-indigo-600">MK {selectedFee.amount.toLocaleString()}</p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Reference</p>
                  <p className="text-lg font-black text-slate-900 flex items-center gap-2"><ClipboardCheck size={18} className={selectedFee.reference_number ? "text-emerald-600" : "text-slate-400"}/> {selectedFee.reference_number || 'Not provided'}</p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</p>
                  <p className="text-sm font-bold capitalize text-slate-600">{selectedFee.status}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Due Date</p>
                  <p className="text-sm font-bold text-slate-600">{new Date(selectedFee.due_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleDenyPayment(selectedFee)} 
                disabled={loading}
                className="py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Deny'}
              </button>
              <button 
                onClick={() => handleApprovePayment(selectedFee)} 
                disabled={loading}
                className="py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalType === 'faculty' && (
        <Modal title="Establish New Faculty" onClose={() => setModalType('none')}>
          <form onSubmit={handleCreateFaculty} className="space-y-6">
            <input name="name" placeholder="Faculty Name" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-600" />
            <input name="code" placeholder="Faculty Code" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-600" />
            <input name="department" placeholder="Department" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-600" />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl">Initialize Faculty</button>
          </form>
        </Modal>
      )}

      {modalType === 'fee' && (
        <Modal title="Distribute Faculty Fee" onClose={() => setModalType('none')}>
          <form onSubmit={handleCreateFee} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recipient Faculty</label>
              <select name="course_name" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-600">
                <option value="">Choose Target Faculty...</option>
                {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <input name="amount" type="number" placeholder="Amount (MK)" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-600" />
            <input name="description" placeholder="Description" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-600" />
            <div className="grid grid-cols-2 gap-4">
              <input name="due_date" type="date" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-600" />
              <select name="type" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-600">
                <option value="tuition">Tuition</option>
                <option value="exam">Examination</option>
              </select>
            </div>
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl">Broadcast Financial Order</button>
          </form>
        </Modal>
      )}

      {modalType === 'admin' && (
        <Modal title="Add System Administrator" onClose={() => setModalType('none')}>
          <form onSubmit={handleAddAdmin} className="space-y-6">
            <input name="name" placeholder="Full Identity Name" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-medium outline-none" />
            <input name="email" type="email" placeholder="Campus Email" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-medium outline-none" />
            <input name="password" type="password" placeholder="Secure Access Code" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-medium outline-none" />
            <select name="admin_level" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" onChange={(e) => {
              const facultySelect = document.getElementById('faculty-select-group');
              if (e.target.value === 'class') facultySelect?.classList.remove('hidden');
              else facultySelect?.classList.add('hidden');
            }}>
              <option value="overall">Master Administrator</option>
              <option value="class">Faculty Administrator</option>
            </select>
            <div id="faculty-select-group" className="space-y-2 hidden">
              <select name="managed_course" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none">
                <option value="">Choose Faculty...</option>
                {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl">Confirm Admission</button>
          </form>
        </Modal>
      )}

      {/* AI Bot Toggle */}
      <button onClick={() => setIsAiOpen(!isAiOpen)} className={`fixed bottom-6 right-6 sm:bottom-10 sm:right-10 w-16 h-16 sm:w-20 sm:h-20 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex items-center justify-center transition-all duration-500 z-[70] ${isAiOpen ? 'bg-slate-950 text-white rotate-[360deg]' : 'bg-indigo-600 text-white shadow-indigo-500/40 hover:scale-105'}`}>
        {isAiOpen ? <X size={28} /> : <Sparkles size={28} />}
      </button>

      {/* AI Bot Window */}
      {isAiOpen && (
        <div className="fixed bottom-24 right-6 sm:bottom-36 sm:right-10 w-[90vw] sm:w-[420px] h-[70vh] sm:h-[650px] bg-white border border-slate-200 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl z-[65] flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
          <div className="bg-[#0F172A] p-6 sm:p-8 text-white flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shrink-0"><Sparkles size={24} /></div>
            <div>
              <h4 className="text-lg font-black tracking-tight">NM AI Support</h4>
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Neural Link Sync</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/50">
            {chatHistory.map((c, i) => (
              <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed ${c.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none font-medium'}`}>{c.text}</div>
              </div>
            ))}
          </div>
          <div className="p-4 sm:p-6 bg-white border-t border-slate-100 flex gap-3">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} placeholder="Inquire..." className="flex-1 bg-slate-100 border-none rounded-2xl px-6 text-sm font-black outline-none" />
            <button onClick={handleChat} className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg active:scale-95"><Send size={20} /></button>
          </div>
        </div>
      )}

      {/* Toast System */}
      <div className="fixed top-24 right-6 z-[120] space-y-3 pointer-events-none w-full max-w-[320px]">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 w-full ${t.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-xs font-black uppercase tracking-widest truncate">{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
