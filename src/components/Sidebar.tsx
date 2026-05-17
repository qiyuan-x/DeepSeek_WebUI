import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MessageSquare, BookOpen, Edit2, Trash2, Settings, Check } from 'lucide-react';
import { cn } from '../types';
import { api } from '../services/api';
import { useChatStore } from '../store/chatStore';
import { useUIStore } from '../store/uiStore';
import { useSettingStore } from '../store/settingStore';

interface SidebarProps {
  handleNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ handleNewChat }) => {
  const { conversations, currentConvId, setCurrentConvId, loadConversations } = useChatStore();
  const { isSidebarOpen, setSidebarOpen, setSettingsOpen } = useUIStore();
  const { theme } = useSettingStore(s => s.uiConfig);

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [longPressConvId, setLongPressConvId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (id: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setLongPressConvId(id);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleRenameConv = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    await api.updateConversation(id, { title: editTitle });
    setEditingConvId(null);
    loadConversations();
  };

  const handleDeleteConv = async (id: string) => {
    if (deletingId === id) {
      await api.deleteConversation(id);
      setDeletingId(null);
      if (currentConvId === id) {
        handleNewChat();
      }
      loadConversations();
    } else {
      setDeletingId(id);
      // Auto-cancel delete confirmation after 3 seconds
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isSidebarOpen && (
        <>
          {/* Mobile Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={cn(
              "flex flex-col z-40 border-r transition-colors duration-300 fixed md:relative h-[100dvh] shrink-0 top-0 left-0 shadow-2xl md:shadow-none overflow-hidden",
              theme === 'dark' ? "bg-[#111111] border-white/10" : "bg-white border-[#E5E7EB]"
            )}
          >
            <div className="flex flex-col w-[280px] h-full shrink-0">
              <div className={cn(
              "p-4 flex items-center justify-between border-b shrink-0",
              theme === 'dark' ? "border-white/10" : "border-[#F3F4F6]"
            )}>
              <button 
                onClick={handleNewChat}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full justify-center text-sm font-medium",
                  theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                )}
              >
                <Plus size={16} />
                新建对话
              </button>
            </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#9CA3AF] italic">
                暂无历史记录
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onTouchStart={() => handleTouchStart(conv.id)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  onClick={() => {
                    if (longPressConvId === conv.id) {
                      setLongPressConvId(null);
                      return;
                    }
                    setLongPressConvId(null);
                    setCurrentConvId(conv.id);
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
                    currentConvId === conv.id 
                      ? (theme === 'dark' ? "bg-white/10 text-white" : "bg-[#F3F4F6] text-[#1A1A1A]") 
                      : (theme === 'dark' ? "text-gray-400 hover:bg-white/5" : "text-[#6B7280] hover:bg-[#F9FAFB]")
                  )}
                >
                  {conv.is_story_mode ? (
                    <BookOpen size={16} className="shrink-0 text-purple-400" />
                  ) : (
                    <MessageSquare size={16} className="shrink-0" />
                  )}
                  {editingConvId === conv.id ? (
                    <input
                      autoFocus
                      className="bg-transparent outline-none w-full text-sm pr-12"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => handleRenameConv(conv.id)}
                      onKeyDown={e => e.key === 'Enter' && handleRenameConv(conv.id)}
                    />
                  ) : (
                    <span className="text-sm truncate flex-1 font-medium pr-12">{conv.title}</span>
                  )}
                  
                  <div className={cn(
                    "flex items-center gap-1 transition-opacity absolute right-2 z-30",
                    "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                  )}>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingConvId(conv.id);
                        setEditTitle(conv.title);
                      }}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        theme === 'dark' ? "hover:bg-white/10 text-gray-300 hover:text-white" : "hover:bg-[#E5E7EB] text-[#4B5563] hover:text-[#1A1A1A]"
                      )}
                      title="重命名"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteConv(conv.id);
                      }}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        deletingId === conv.id
                          ? (theme === 'dark' ? "bg-red-500 text-white" : "bg-red-500 text-white")
                          : (theme === 'dark' ? "hover:bg-red-500/20 text-gray-300 hover:text-red-500" : "hover:bg-red-50 text-[#4B5563] hover:text-red-500")
                      )}
                      title={deletingId === conv.id ? "再次点击确认删除" : "直接删除"}
                    >
                      {deletingId === conv.id ? <Check size={14} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={cn(
            "p-4 border-t shrink-0",
            theme === 'dark' ? "border-white/10" : "border-[#F3F4F6]"
          )}>
            <button 
              onClick={() => {
                setSettingsOpen(true);
                setSidebarOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 w-full text-sm rounded-lg transition-colors font-medium",
                theme === 'dark' ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]"
              )}
            >
              <Settings size={18} />
              设置
            </button>
          </div>
            </div>
        </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
