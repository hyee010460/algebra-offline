import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BookOpenIcon = ({ className="w-6 h-6" }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>);
const PlusIcon = ({ className="w-6 h-6" }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>);

export default function App() {
  const [activeTab, setActiveTab] = useState('announcements');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('announcement');
  const [formData, setFormData] = useState({ title: '', content: '', author: '', link: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [handouts, setHandouts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // 管理員狀態

  // 切換管理模式的函數 (記得把 '1234' 改成您自己的密碼)
  const toggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      return;
    }
    const password = prompt("請輸入管理員密碼：");
    if (password === import.meta.env.VITE_ADMIN) {
      setIsAdmin(true);
      alert("已進入管理模式");
    } else {
      alert("密碼錯誤");
    }
  };

  useEffect(() => {
    const unsubAnnouncements = onSnapshot(collection(db, 'study_announcements'), (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });
    const unsubHandouts = onSnapshot(collection(db, 'study_handouts'), (snapshot) => {
      setHandouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });
    return () => { unsubAnnouncements(); unsubHandouts(); };
  }, []);

  const openAddModal = (type) => {
    setModalType(type);
    setEditingId(null);
    setFormData({ title: '', content: '', author: '', link: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (item, type) => {
    setModalType(type);
    setEditingId(item.id);
    setFormData({ title: item.title, content: item.content, author: item.author || '', link: item.link || '' });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setFormData({ title: '', content: '', author: '', link: '' }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    setIsUploading(true);
    const collectionName = modalType === 'announcement' ? 'study_announcements' : 'study_handouts';
    try {
      if (editingId) {
        await updateDoc(doc(db, collectionName, editingId), { title: formData.title, content: formData.content, author: formData.author || '管理員', link: formData.link || '' });
      } else {
        const docId = Date.now().toString();
        await setDoc(doc(db, collectionName, docId), { ...formData, date: new Date().toISOString().split('T')[0], createdAt: Date.now() });
      }
      closeModal();
    } catch (error) { alert(error.message); } finally { setIsUploading(false); }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm('確定要刪除嗎？')) return;
    const collectionName = type === 'announcement' ? 'study_announcements' : 'study_handouts';
    try { await deleteDoc(doc(db, collectionName, id)); } catch (error) { alert(error.message); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={toggleAdmin}>
            <div className="bg-blue-600 text-white p-2 rounded-lg"><BookOpenIcon className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold text-slate-900">Algebra Offline</h1>
          </div>
          {isAdmin && (
            <div className="flex space-x-2">
              <button onClick={() => openAddModal('announcement')} className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-2 rounded-md hover:bg-slate-200">發布公告</button>
              <button onClick={() => openAddModal('handout')} className="text-sm font-medium text-white bg-blue-600 px-3 py-2 rounded-md hover:bg-blue-700">發布講義</button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex space-x-6 border-b border-slate-200 mb-8">
          <button onClick={() => setActiveTab('announcements')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'announcements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>研討公告</button>
          <button onClick={() => setActiveTab('handouts')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'handouts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>講義連結</button>
        </div>
        <div className="grid gap-6">
          {(activeTab === 'announcements' ? announcements : handouts).map(item => (
            <article key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
                {isAdmin && (
                  <div className="flex space-x-2">
                    <button onClick={() => openEditModal(item, activeTab === 'announcements' ? 'announcement' : 'handout')} className="text-slate-400 hover:text-blue-600 text-sm">編輯</button>
                    <button onClick={() => handleDelete(item.id, activeTab === 'announcements' ? 'announcement' : 'handout')} className="text-slate-400 hover:text-red-600 text-sm">刪除</button>
                  </div>
                )}
              </div>
              <div className="text-sm text-slate-500 mb-4">{item.date} • 作者：{item.author}</div>
              <div className="whitespace-pre-wrap">{item.content}</div>
              {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="inline-block mt-4 text-blue-600 hover:underline bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium">🔗 點此開啟講義連結</a>}
            </article>
          ))}
        </div>
      </main>
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6">{editingId ? '編輯' : '新增'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="標題" required className="w-full border p-2 rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <input type="text" placeholder="發布者" className="w-full border p-2 rounded" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
              {modalType === 'handout' && <input type="url" placeholder="講義網址 (選填)" className="w-full border p-2 rounded bg-blue-50" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} />}
              <textarea placeholder="內容..." required rows={5} className="w-full border p-2 rounded" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">確認發布</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
