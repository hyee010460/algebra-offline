import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
// 這裡多引入了 updateDoc 來處理資料更新
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// ==========================================
// 1. Firebase 設定 (請記得貼上您的專屬金鑰！)
// ==========================================
// 請將原本寫死金鑰的地方改為這樣：
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

// ==========================================
// 2. 介面圖示元件
// ==========================================
const BookOpenIcon = ({ className="w-6 h-6" }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>);
const PlusIcon = ({ className="w-6 h-6" }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>);

// ==========================================
// 3. 網站主程式
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('announcements');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('announcement');
  const [formData, setFormData] = useState({ title: '', content: '', author: '', link: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [handouts, setHandouts] = useState([]);
  
  // 新增：用來記錄目前正在編輯哪一筆資料的 ID (如果是 null 代表是新增)
  const [editingId, setEditingId] = useState(null);

  // 從 Firestore 實時讀取資料
  useEffect(() => {
    const unsubAnnouncements = onSnapshot(collection(db, 'study_announcements'), (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });
    const unsubHandouts = onSnapshot(collection(db, 'study_handouts'), (snapshot) => {
      setHandouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });
    return () => { unsubAnnouncements(); unsubHandouts(); };
  }, []);

  // 開啟「新增」視窗的專用函數 (確保清空之前的資料)
  const openAddModal = (type) => {
    setModalType(type);
    setEditingId(null);
    setFormData({ title: '', content: '', author: '', link: '' });
    setIsModalOpen(true);
  };

  // 開啟「編輯」視窗的專用函數 (帶入舊資料)
  const openEditModal = (item, type) => {
    setModalType(type);
    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
      author: item.author || '',
      link: item.link || ''
    });
    setIsModalOpen(true);
  };

  // 關閉視窗並清空狀態
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', content: '', author: '', link: '' });
  };

  // 處理表單送出 (判斷是新增還是修改)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    setIsUploading(true);

    const collectionName = modalType === 'announcement' ? 'study_announcements' : 'study_handouts';
    
    try {
      if (editingId) {
        // 【修改模式】更新現有資料
        await updateDoc(doc(db, collectionName, editingId), {
          title: formData.title,
          content: formData.content,
          author: formData.author || '管理員',
          link: formData.link || ''
        });
      } else {
        // 【新增模式】建立全新資料
        const docId = Date.now().toString();
        const newItem = {
          date: new Date().toISOString().split('T')[0],
          title: formData.title,
          content: formData.content,
          author: formData.author || '管理員',
          link: formData.link || '', 
          createdAt: Date.now()
        };
        await setDoc(doc(db, collectionName, docId), newItem);
      }
      
      closeModal(); // 成功後關閉視窗
    } catch (error) {
      alert('作業失敗：' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 刪除資料
  const handleDelete = async (id, type) => {
    if (!window.confirm('確定要刪除這筆資料嗎？此動作無法復原。')) return;
    const collectionName = type === 'announcement' ? 'study_announcements' : 'study_handouts';
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      alert('刪除失敗：' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* 頂部導覽列 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg"><BookOpenIcon className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold text-slate-900">Algebra Offline</h1>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => openAddModal('announcement')} className="flex items-center space-x-1 text-sm font-medium text-slate-600 hover:text-blue-600 bg-slate-100 px-3 py-2 rounded-md">
              <PlusIcon className="w-4 h-4" /><span>發布公告</span>
            </button>
            <button onClick={() => openAddModal('handout')} className="flex items-center space-x-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md">
              <PlusIcon className="w-4 h-4" /><span>發布講義</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex space-x-6 border-b border-slate-200 mb-8">
          <button onClick={() => setActiveTab('announcements')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'announcements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            研討公告
          </button>
          <button onClick={() => setActiveTab('handouts')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'handouts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            講義連結
          </button>
        </div>

        <div className="grid gap-6">
          {(activeTab === 'announcements' ? announcements : handouts).map(item => (
            <article key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative group">
              
              {/* 加入編輯與刪除按鈕 */}
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => openEditModal(item, activeTab === 'announcements' ? 'announcement' : 'handout')}
                    className="text-slate-400 hover:text-blue-600 text-sm font-medium transition-colors bg-slate-50 hover:bg-blue-50 px-2 py-1 rounded"
                  >
                    編輯
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id, activeTab === 'announcements' ? 'announcement' : 'handout')}
                    className="text-slate-400 hover:text-red-600 text-sm font-medium transition-colors bg-slate-50 hover:bg-red-50 px-2 py-1 rounded"
                  >
                    刪除
                  </button>
                </div>
              </div>

              <div className="text-sm text-slate-500 mb-4">{item.date} • 主講 / 作者：{item.author}</div>
              <div className="whitespace-pre-wrap text-slate-700">{item.content}</div>
              
              {item.link && (
                <a href={item.link} target="_blank" rel="noreferrer" className="inline-block mt-4 text-blue-600 hover:underline bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium">
                  🔗 點此開啟講義連結
                </a>
              )}
            </article>
          ))}
          {(activeTab === 'announcements' ? announcements : handouts).length === 0 && (
            <div className="text-center py-12 text-slate-500">目前尚無資料，趕快來發布第一篇吧！</div>
          )}
        </div>
      </main>

      {/* 新增/編輯的彈出視窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl">
            <form onSubmit={handleSubmit} className="p-6">
              
              {/* 根據狀態改變標題文字 */}
              <h2 className="text-2xl font-bold mb-6">
                {editingId 
                  ? (modalType === 'announcement' ? '編輯公告' : '編輯講義') 
                  : (modalType === 'announcement' ? '發布新公告' : '新增講義連結')}
              </h2>
              
              <div className="space-y-4">
                <input type="text" placeholder="標題" required className="w-full border p-2 rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                <input type="text" placeholder="發布者 / 主講人" className="w-full border p-2 rounded" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
                
                {modalType === 'handout' && (
                  <input type="url" placeholder="講義網址 (選填，例如 Google Drive 連結)" className="w-full border p-2 rounded bg-blue-50" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} />
                )}

                <textarea placeholder={modalType === 'announcement' ? "內容說明..." : "講義簡介或備註..."} required rows={5} className="w-full border p-2 rounded" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded hover:bg-slate-50">取消</button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                  {isUploading ? '處理中...' : (editingId ? '儲存修改' : '確認發布')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}