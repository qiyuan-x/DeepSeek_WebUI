import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  Trash2, 
  Menu, 
  X, 
  Send, 
  StopCircle, 
  ChevronDown, 
  ChevronUp, 
  Brain,
  ExternalLink,
  HelpCircle,
  Wallet,
  Coins,
  RefreshCw,
  Edit2,
  Check,
  User,
  FileText,
  Layout,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { cn, DEEPSEEK_MODELS, PRICING, Message, Conversation, PromptTemplate } from './types';
import { api } from './services/api';

export default function App() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [draftMemory, setDraftMemory] = useState("");

  // Settings
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const isThinkingMode = model === 'deepseek-reasoner';
  const toggleThinkingMode = () => {
    const newModel = isThinkingMode ? 'deepseek-chat' : 'deepseek-reasoner';
    setModel(newModel);
    if (currentConvId) {
      // Optionally update the conversation's model in the DB
      api.updateConversation(currentConvId, { model: newModel }).then(() => loadConversations());
    }
  };
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [balance, setBalance] = useState<any>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [memoryPrompt, setMemoryPrompt] = useState('');

  // Temp Settings for Modal
  const [activeSettingsTab, setActiveSettingsTab] = useState<'api' | 'theme' | 'prompts' | 'memory' | 'help'>('api');
  const [tempSettings, setTempSettings] = useState({
    apiKey: '',
    temperature: 0.7,
    theme: 'light' as 'light' | 'dark',
    bgImage: null as string | null,
    promptTemplates: [] as PromptTemplate[],
    memoryPrompt: ''
  });

  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const currentConv = conversations.find(c => c.id === currentConvId);

  // Handle scroll to track if user is at bottom
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAtBottomRef.current = atBottom;
  }, []);

  // Load initial data
  useEffect(() => {
    loadConversations();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      if (settings.apiKey) setApiKey(settings.apiKey);
      if (settings.temperature !== undefined) setTemperature(settings.temperature);
      if (settings.theme) setTheme(settings.theme);
      if (settings.bgImage) setBgImage(settings.bgImage);
      if (settings.promptTemplates) setPromptTemplates(settings.promptTemplates);
      if (settings.memoryPrompt) setMemoryPrompt(settings.memoryPrompt);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleOpenSettings = () => {
    setTempSettings({
      apiKey,
      temperature,
      theme,
      bgImage,
      promptTemplates,
      memoryPrompt
    });
    setBalance(null);
    setBalanceError(null);
    setActiveSettingsTab('api');
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    setApiKey(tempSettings.apiKey);
    setTemperature(tempSettings.temperature);
    setMemoryPrompt(tempSettings.memoryPrompt);
    
    await api.saveSettings({
      apiKey: tempSettings.apiKey,
      temperature: tempSettings.temperature,
      theme,
      bgImage,
      promptTemplates,
      memoryPrompt: tempSettings.memoryPrompt
    });
    
    setIsSettingsOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        setBgImage(result);
        setTempSettings(prev => ({ ...prev, bgImage: result }));
        await api.saveSettings({
          apiKey,
          temperature,
          theme,
          bgImage: result,
          promptTemplates,
          memoryPrompt
        });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (currentConvId) {
      loadMessages(currentConvId);
      setSystemPrompt(currentConv?.system_prompt || '');
      setIsEditingSystemPrompt(false);
    } else {
      setMessages([]);
      setSystemPrompt('');
      setIsEditingSystemPrompt(false);
    }
  }, [currentConvId, currentConv?.system_prompt]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  const loadConversations = async () => {
    const data = await api.getConversations();
    setConversations(data);
  };

  const loadMessages = async (id: string) => {
    const data = await api.getMessages(id);
    setMessages(data);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setSystemPrompt('');
    setIsEditingSystemPrompt(false);
    setIsSidebarOpen(window.innerWidth > 1024);
  };

  const handleDeleteConv = async (id: string) => {
    try {
      await api.deleteConversation(id);
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert("删除失败: " + error.message);
    }
  };

  const handleRenameConv = async (id: string) => {
    if (!editTitle.trim()) return;
    await api.updateConversation(id, { title: editTitle });
    setEditingConvId(null);
    await loadConversations();
  };

  const calculateCost = (modelId: string, inputTokens: number, outputTokens: number) => {
    const rates = PRICING[modelId as keyof typeof PRICING] || PRICING['deepseek-chat'];
    return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
  };

  const handleUpdateSystemPrompt = async (newPrompt: string) => {
    setSystemPrompt(newPrompt);
    if (currentConvId) {
      try {
        await api.updateConversation(currentConvId, { system_prompt: newPrompt });
        // Update local state for conversations list
        setConversations(prev => prev.map(c => 
          c.id === currentConvId ? { ...c, system_prompt: newPrompt } : c
        ));
      } catch (error) {
        console.error('Failed to update system prompt:', error);
      }
    }
    setIsEditingSystemPrompt(false);
  };

  const summarizeMemory = async (convId: string, currentMessages: Message[], conv: Conversation) => {
    const summarizedCount = conv.summarized_count || 0;
    // Summarize every 5 rounds (10 messages)
    const msgsToSummarize = currentMessages.slice(summarizedCount, summarizedCount + 10);
    if (msgsToSummarize.length < 10) return;

    const defaultPrompt = `你是一个对话记忆总结助手。请根据以下现有的记忆和新的对话内容，总结出最新的记忆。
要求：
1. 提取用户的核心信息、偏好、重要事实、人物关系。
2. 保持客观和简洁。
3. 直接返回总结后的记忆文本，不要有任何开场白。`;

    const customPrompt = memoryPrompt || defaultPrompt;

    const prompt = `${customPrompt}

【现有记忆】
${conv.memory || '无'}

【新对话内容】
${msgsToSummarize.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n')}
`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'deepseek-chat',
          temperature: 0.3,
          stream: false,
          apiKey: apiKey || process.env.DEEPSEEK_API_KEY
        })
      });

      const data = await response.json();
      const newMemory = data.choices?.[0]?.message?.content;
      
      if (newMemory) {
        const newSummarizedCount = summarizedCount + msgsToSummarize.length;
        await api.updateConversation(convId, { 
          memory: newMemory,
          summarized_count: newSummarizedCount
        });
        setConversations(prev => prev.map(c => 
          c.id === convId ? { ...c, memory: newMemory, summarized_count: newSummarizedCount } : c
        ));
      }
    } catch (error) {
      console.error("Failed to summarize memory:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    if (!apiKey && !process.env.DEEPSEEK_API_KEY) {
      alert('请在设置中配置您的 DeepSeek API Key。');
      setIsSettingsOpen(true);
      return;
    }

    let convId = currentConvId;
    const isFirstMessage = !convId;

    if (isFirstMessage) {
      convId = crypto.randomUUID();
      const title = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      await api.createConversation({
        id: convId,
        title,
        system_prompt: systemPrompt,
        model,
        temperature,
      });
      await loadConversations();
      setCurrentConvId(convId);
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: convId!,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    setAbortController(controller);
    const startTime = Date.now();

    let assistantMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: convId!,
      role: 'assistant',
      content: '',
      reasoning_content: '',
      created_at: new Date().toISOString(),
    };
    let fullContent = '';
    let fullReasoning = '';

    try {
      await api.saveMessage(userMsg);
      await api.saveMessage(assistantMsg);

      let chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20);
      }

      let sysPrompt = (currentConvId ? currentConv?.system_prompt : systemPrompt) || '';
      if (currentConv?.memory) {
        sysPrompt += `\n\n【历史记忆】\n${currentConv.memory}`;
      }

      setMessages(prev => [...prev, assistantMsg]);

      const response = await api.chat({
        messages: [
          { role: 'system', content: sysPrompt },
          ...chatHistory,
          { role: 'user', content: userMsg.content }
        ],
        model: model, // Always use the current toggle state
        temperature: currentConv?.temperature || temperature,
        stream: true,
        apiKey: apiKey,
        stream_options: { include_usage: true }
      }, controller.signal);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || '连接 DeepSeek 失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let isReasoning = false;
      let usage: any = null;

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              
              // Handle usage info (usually in the last chunk)
              if (data.usage) {
                usage = data.usage;
                continue;
              }

              if (!data.choices || data.choices.length === 0) continue;
              
              const delta = data.choices[0].delta;

              if (delta.reasoning_content) {
                if (!isReasoning) {
                  isReasoning = true;
                  setExpandedReasoning(prev => ({ ...prev, [assistantMsg.id]: true }));
                }
                fullReasoning += delta.reasoning_content;
                setMessages(prev => prev.map(m => 
                  m.id === assistantMsg.id ? { ...m, reasoning_content: fullReasoning } : m
                ));
              }

              if (delta.content) {
                if (isReasoning) {
                  isReasoning = false;
                  setExpandedReasoning(prev => ({ ...prev, [assistantMsg.id]: false }));
                }
                fullContent += delta.content;
                setMessages(prev => prev.map(m => 
                  m.id === assistantMsg.id ? { ...m, content: fullContent } : m
                ));
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      const finalCost = usage ? calculateCost(currentConv?.model || model, usage.prompt_tokens, usage.completion_tokens) : 0;
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;

      // Final save
      await api.saveMessage({
        ...assistantMsg,
        content: fullContent,
        reasoning_content: fullReasoning,
        tokens: usage ? usage.total_tokens : 0, 
        cost: finalCost,
        response_time: responseTime
      });

      if (usage) {
        setMessages(prev => prev.map(m => 
          m.id === assistantMsg.id ? { ...m, tokens: usage.total_tokens, cost: finalCost, response_time: responseTime } : m
        ));
      } else {
        setMessages(prev => prev.map(m => 
          m.id === assistantMsg.id ? { ...m, response_time: responseTime } : m
        ));
      }

      // Trigger memory summarization if needed
      const finalMessages = [...messages, userMsg, { ...assistantMsg, content: fullContent }];
      const summarizedCount = currentConv?.summarized_count || 0;
      if (finalMessages.length - summarizedCount >= 10) {
        summarizeMemory(convId!, finalMessages, currentConv || { id: convId!, title: '', system_prompt: '', model: '', temperature: 0, created_at: '', updated_at: '' });
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        const endTime = Date.now();
        const responseTime = (endTime - startTime) / 1000;
        const finalContent = fullContent + '\n\n[用户取消输出]';
        
        await api.saveMessage({
          ...assistantMsg,
          content: finalContent,
          reasoning_content: fullReasoning,
          tokens: 0, 
          cost: 0,
          response_time: responseTime
        });
        
        setMessages(prev => prev.map(m => 
          m.id === assistantMsg.id ? { ...m, content: finalContent, response_time: responseTime } : m
        ));
        return;
      }
      setMessages(prev => prev.filter(m => m.id !== assistantMsg.id));
      api.deleteMessage(assistantMsg.id).catch(console.error);
      alert(error.message);
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    abortController?.abort();
    setIsLoading(false);
    setAbortController(null);
  };

  const fetchBalance = async () => {
    setBalanceError(null);
    if (!tempSettings.apiKey) {
      setBalanceError('请先输入 API Key');
      return;
    }
    try {
      const data = await api.getBalance(tempSettings.apiKey);
      if (data.error) {
        setBalanceError('获取余额失败: ' + (data.error.message || data.error));
        setBalance(null);
      } else {
        setBalance(data);
      }
    } catch (e) {
      setBalanceError('获取余额失败，请检查网络或 API Key 是否正确');
      setBalance(null);
    }
  };

  const totalTokens = messages.reduce((acc, m) => acc + (m.tokens || 0), 0);
  const totalCost = messages.reduce((acc, m) => acc + (m.cost || 0), 0);

  return (
    <div className={cn(
      "flex h-screen w-screen overflow-hidden font-sans transition-colors duration-300",
      theme === 'dark' ? "bg-[#0A0A0A] text-white" : "bg-[#F8F9FA] text-[#1A1A1A]"
    )} style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={cn(
              "flex flex-col z-20 border-r transition-colors duration-300",
              theme === 'dark' ? "bg-[#111111] border-white/10" : "bg-white border-[#E5E7EB]"
            )}
          >
            <div className={cn(
              "p-4 flex items-center justify-between border-b",
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
                    onClick={() => setCurrentConvId(conv.id)}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
                      currentConvId === conv.id 
                        ? (theme === 'dark' ? "bg-white/10 text-white" : "bg-[#F3F4F6] text-[#1A1A1A]") 
                        : (theme === 'dark' ? "text-gray-400 hover:bg-white/5" : "text-[#6B7280] hover:bg-[#F9FAFB]")
                    )}
                  >
                    <MessageSquare size={16} className="shrink-0" />
                    {editingConvId === conv.id ? (
                      <input
                        autoFocus
                        className="bg-transparent outline-none w-full text-sm"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => handleRenameConv(conv.id)}
                        onKeyDown={e => e.key === 'Enter' && handleRenameConv(conv.id)}
                      />
                    ) : (
                      <span className="text-sm truncate flex-1 font-medium">{conv.title}</span>
                    )}
                    
                    <div className={cn(
                      "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 pl-2 z-30",
                      currentConvId === conv.id 
                        ? (theme === 'dark' ? "bg-[#222]" : "bg-[#F3F4F6]") 
                        : (theme === 'dark' ? "bg-[#111]" : "bg-white")
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
                          theme === 'dark' ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#1A1A1A]"
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
                          theme === 'dark' ? "hover:bg-red-500/20 text-gray-400 hover:text-red-500" : "hover:bg-red-50 text-[#6B7280] hover:text-red-500"
                        )}
                        title="直接删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={cn(
              "p-4 border-t",
              theme === 'dark' ? "border-white/10" : "border-[#F3F4F6]"
            )}>
              <button 
                onClick={handleOpenSettings}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 w-full text-sm rounded-lg transition-colors font-medium",
                  theme === 'dark' ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]"
                )}
              >
                <Settings size={18} />
                设置
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0 relative transition-colors duration-300",
        theme === 'dark' ? "bg-[#0A0A0A]/80 backdrop-blur-sm" : "bg-white/80 backdrop-blur-sm"
      )}>
        {/* Header */}
        <header className={cn(
          "h-14 flex items-center justify-between px-4 border-b shrink-0 transition-colors duration-300",
          theme === 'dark' ? "bg-[#111111]/50 border-white/10" : "bg-white/50 border-[#E5E7EB]"
        )}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                theme === 'dark' ? "hover:bg-white/5" : "hover:bg-[#F3F4F6]"
              )}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-tight">DeepSeek WebUI</h1>
              <span className={cn(
                "text-[10px] uppercase tracking-widest font-semibold",
                theme === 'dark' ? "text-gray-500" : "text-[#9CA3AF]"
              )}>
                {isThinkingMode ? "Reasoner" : "Chat"}
              </span>
            </div>

            {/* Thinking Toggle (Red Box Area) */}
            <button
              onClick={toggleThinkingMode}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full transition-all border text-[11px] font-bold uppercase tracking-wider ml-2",
                isThinkingMode 
                  ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm" 
                  : "bg-gray-50 border-gray-200 text-gray-600"
              )}
            >
              <Brain size={14} className={isThinkingMode ? "text-purple-600" : "text-gray-400"} />
              <span>{isThinkingMode ? "深度思考" : "快速回答"}</span>
              <div className={cn(
                "w-7 h-3.5 rounded-full relative transition-colors ml-1",
                isThinkingMode ? "bg-purple-400" : "bg-gray-300"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all",
                  isThinkingMode ? "left-4" : "left-0.5"
                )} />
              </div>
            </button>
          </div>

          {/* Token & Cost Display */}
          <div className="flex-1 flex justify-center">
            {currentConvId && (
              <div className={cn(
                "flex items-center gap-4 px-4 py-1.5 border rounded-2xl shadow-sm transition-colors",
                theme === 'dark' ? "bg-[#1A1A1A] border-white/10" : "bg-[#F9FAFB] border-[#E5E7EB]"
              )}>
                <div className="flex items-center gap-1.5">
                  <Coins size={14} className={theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"} />
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-wider",
                    theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
                  )}>Tokens:</span>
                  <span className={cn(
                    "text-[11px] font-mono font-bold",
                    theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                  )}>{totalTokens}</span>
                </div>
                <div className={cn("w-px h-3", theme === 'dark' ? "bg-white/10" : "bg-[#E5E7EB]")} />
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-wider",
                    theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
                  )}>预估费用:</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-600">￥{totalCost.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1 rounded-full transition-colors",
              apiKey ? (theme === 'dark' ? "bg-emerald-500/10" : "bg-emerald-50") : (theme === 'dark' ? "bg-red-500/10" : "bg-red-50")
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                apiKey ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              )} />
              <span className={cn(
                "text-xs font-medium",
                apiKey ? (theme === 'dark' ? "text-emerald-400" : "text-emerald-700") : (theme === 'dark' ? "text-red-400" : "text-red-700")
              )}>
                {apiKey ? "API 已连接" : "API 未连接"}
              </span>
            </div>
          </div>
        </header>

        {/* System Prompt Bar (人物设定) */}
        <div className={cn(
          "px-4 py-2 border-b transition-colors duration-300",
          theme === 'dark' ? "bg-[#111111]/50 border-white/10" : "bg-[#F9FAFB] border-[#E5E7EB]"
        )}>
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-bold uppercase shrink-0",
                  theme === 'dark' ? "text-gray-500" : "text-[#6B7280]"
                )}>人物设定:</span>
                {!isEditingSystemPrompt && (
                  <span className={cn(
                    "text-xs truncate max-w-[400px]",
                    theme === 'dark' ? "text-gray-300" : "text-[#4B5563]"
                  )}>
                    {currentConv?.system_prompt || systemPrompt || '未设定'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {currentConvId && (
                  <button 
                    onClick={() => {
                      setDraftMemory(currentConv?.memory || '');
                      setIsMemoryOpen(true);
                    }}
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:underline",
                      currentConv?.memory ? "text-purple-500" : (theme === 'dark' ? "text-gray-400" : "text-gray-500")
                    )}
                  >
                    <Brain size={12} />
                    记忆区
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (!isEditingSystemPrompt) {
                      setDraftSystemPrompt(currentConv?.system_prompt || systemPrompt || "");
                    }
                    setIsEditingSystemPrompt(!isEditingSystemPrompt);
                  }}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider hover:underline",
                    theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                  )}
                >
                  {isEditingSystemPrompt ? '收起' : (currentConv?.system_prompt || systemPrompt ? '修改' : '点击设定')}
                </button>
              </div>
            </div>
            
            <AnimatePresence>
              {isEditingSystemPrompt && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col gap-3 pb-1"
                >
                  {promptTemplates.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {promptTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => setDraftSystemPrompt(template.content)}
                          className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-bold transition-all border",
                            theme === 'dark' 
                              ? "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30" 
                              : "bg-white border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1A1A] hover:border-[#1A1A1A]"
                          )}
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <textarea 
                      value={draftSystemPrompt}
                      onChange={e => setDraftSystemPrompt(e.target.value)}
                      placeholder="设定 AI 角色、语气或特定规则..."
                      className={cn(
                        "w-full rounded-lg px-3 py-3 text-sm outline-none min-h-[100px] resize-none transition-colors border",
                        theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-white/20" : "bg-white border-[#E5E7EB] text-[#4B5563] focus:ring-1 focus:ring-[#1A1A1A]"
                      )}
                    />
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleUpdateSystemPrompt(draftSystemPrompt)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                          theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                        )}
                      >
                        确认
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className={cn(
                  "p-4 rounded-2xl",
                  theme === 'dark' ? "bg-white/5" : "bg-[#F3F4F6]"
                )}>
                  <Brain size={48} className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"} />
                </div>
                <h2 className="text-xl font-bold">今天我能帮您什么？</h2>
                <p className={cn(
                  "text-sm max-w-md",
                  theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
                )}>
                  开始与 DeepSeek 对话，探索无限可能。
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-2 items-start">
                <div className="flex items-center gap-2 px-1">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                    msg.role === 'user' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  )}>
                    {msg.role === 'user' ? 'user' : 'model'}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] font-medium">
                    {msg.created_at ? format(new Date(msg.created_at), 'HH:mm:ss') : ''}
                  </span>
                </div>
                
                <div className={cn(
                  "max-w-[95%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-colors",
                  msg.role === 'user' 
                    ? (theme === 'dark' ? "bg-white/5 text-white border border-white/10" : "bg-[#F3F4F6] text-[#1A1A1A] border border-[#E5E7EB]") 
                    : (theme === 'dark' ? "bg-[#111] border border-white/10 text-white" : "bg-white border border-[#E5E7EB] text-[#1A1A1A]")
                )}>
                  {/* Reasoning Content */}
                  {msg.reasoning_content && (
                    <div className="mb-3 border-l-2 border-[#D1D5DB] pl-3 py-1">
                      <button 
                        onClick={() => setExpandedReasoning(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                        className="flex items-center gap-2 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1 hover:text-[#1A1A1A] transition-colors"
                      >
                        <Brain size={12} />
                        思考过程
                        {expandedReasoning[msg.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      <AnimatePresence>
                        {expandedReasoning[msg.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="text-xs italic text-[#6B7280] whitespace-pre-wrap">
                              {msg.reasoning_content}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Main Content */}
                  <div className="prose prose-sm max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                  </div>
                </div>
                
                {/* Meta Info */}
                {(msg.tokens > 0 || msg.cost > 0 || msg.response_time > 0) && (
                  <div className="flex items-center gap-3 px-1 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">
                    {msg.tokens > 0 ? <span>{msg.tokens} Tokens</span> : null}
                    {msg.cost > 0 ? <span>￥{msg.cost.toFixed(4)}</span> : null}
                    {msg.response_time > 0 ? <span>{msg.response_time.toFixed(1)}s</span> : null}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className={cn(
          "p-4 border-t transition-colors duration-300",
          theme === 'dark' ? "bg-[#111111]/50 border-white/10" : "bg-white border-[#E5E7EB]"
        )}>
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="flex-1 relative">
              <textarea 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="给 DeepSeek 发送消息... (Ctrl + Enter 发送)"
                className={cn(
                  "w-full border-none rounded-2xl px-4 py-[14px] pr-4 text-sm leading-relaxed outline-none resize-none min-h-[52px] max-h-40 flex items-center transition-colors",
                  theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                )}
                rows={1}
              />
            </div>
            <div className="flex shrink-0">
              {isLoading ? (
                <button 
                  onClick={handleStop}
                  className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center"
                >
                  <StopCircle size={20} />
                </button>
              ) : (
                <button 
                  onClick={handleSendMessage}
                  disabled={!input.trim()}
                  className={cn(
                    "p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center",
                    theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                  )}
                >
                  <Send size={20} />
                </button>
              )}
            </div>
          </div>
          <p className={cn(
            "text-[10px] text-center mt-2 font-medium transition-colors",
            theme === 'dark' ? "text-gray-500" : "text-[#9CA3AF]"
          )}>
            DeepSeek 可能会犯错。请核查重要信息。
          </p>
        </div>

        {/* Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={cn(
                  "w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-300",
                  theme === 'dark' ? "bg-[#1A1A1A] text-white" : "bg-white text-[#1A1A1A]"
                )}
              >
                <div className={cn(
                  "p-6 border-b flex items-center justify-between",
                  theme === 'dark' ? "border-white/10" : "border-[#F3F4F6]"
                )}>
                  <div className="flex items-center gap-3">
                    <Settings className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"} />
                    <h2 className="text-lg font-bold">设置与配置</h2>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className={cn(
                    "p-2 rounded-full transition-colors",
                    theme === 'dark' ? "hover:bg-white/5" : "hover:bg-[#F3F4F6]"
                  )}>
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Settings Sidebar Tabs */}
                  <div className={cn(
                    "w-48 border-r flex flex-col p-2 gap-1",
                    theme === 'dark' ? "border-white/10 bg-white/5" : "border-[#F3F4F6] bg-[#F9FAFB]"
                  )}>
                    {[
                      { id: 'api', label: 'API & 模型', icon: Send },
                      { id: 'theme', label: '主题 & 界面', icon: Layout },
                      { id: 'prompts', label: '人物模板', icon: User },
                      { id: 'memory', label: '记忆设置', icon: Brain },
                      { id: 'help', label: '帮助中心', icon: BookOpen },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSettingsTab(tab.id as any)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                          activeSettingsTab === tab.id
                            ? (theme === 'dark' ? "bg-white text-black" : "bg-[#1A1A1A] text-white")
                            : (theme === 'dark' ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1A1A1A]")
                        )}
                      >
                        <tab.icon size={16} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {activeSettingsTab === 'api' && (
                      <div className="space-y-8">
                        {/* API Key */}
                        <section className="space-y-3">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">DeepSeek API Key</label>
                          <div className="flex gap-2">
                            <input 
                              type="password"
                              value={tempSettings.apiKey}
                              onChange={e => {
                                setTempSettings(prev => ({ ...prev, apiKey: e.target.value }));
                              }}
                              placeholder="sk-..."
                              className={cn(
                                "flex-1 border-none rounded-xl px-4 py-2.5 text-sm outline-none transition-colors",
                                theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                              )}
                            />
                            <button 
                              onClick={fetchBalance}
                              className={cn(
                                "px-4 py-2 rounded-xl transition-colors text-sm font-bold flex items-center gap-2",
                                theme === 'dark' ? "bg-white/5 text-white hover:bg-white/10" : "bg-[#F3F4F6] text-[#1A1A1A] hover:bg-[#E5E7EB]"
                              )}
                            >
                              <Wallet size={16} />
                              查询余额
                            </button>
                          </div>
                          {balance && (
                            <div className={cn(
                              "p-3 rounded-xl border flex items-center justify-between",
                              theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700"
                            )}>
                              <div className="flex items-center gap-2">
                                <Coins size={16} />
                                <span className="text-xs font-bold">可用余额:</span>
                              </div>
                              <span className="text-sm font-bold">
                                {balance.balance_infos?.[0]?.total_balance} {balance.balance_infos?.[0]?.currency}
                              </span>
                            </div>
                          )}
                          {balanceError && (
                            <div className={cn(
                              "p-3 rounded-xl border flex items-center justify-between",
                              theme === 'dark' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-100 text-red-700"
                            )}>
                              <div className="flex items-center gap-2">
                                <StopCircle size={16} />
                                <span className="text-xs font-bold">错误:</span>
                              </div>
                              <span className="text-sm font-bold">
                                {balanceError}
                              </span>
                            </div>
                          )}
                        </section>

                        {/* Temperature */}
                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Temperature (温度)</label>
                            <span className="text-xs font-bold">{tempSettings.temperature}</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="1.5"
                            step="0.1"
                            value={tempSettings.temperature}
                            onChange={e => setTempSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                            className={cn(
                              "w-full accent-[#1A1A1A]",
                              theme === 'dark' && "accent-white"
                            )}
                          />
                          <div className={cn(
                            "p-4 rounded-2xl space-y-3",
                            theme === 'dark' ? "bg-white/5" : "bg-[#F9FAFB]"
                          )}>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-[#6B7280] uppercase">
                              <HelpCircle size={12} />
                              建议参考值
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-[11px]">
                              <div className="flex flex-col gap-1">
                                <span className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"}>代码/数学: <span className="font-mono font-bold">0.0</span></span>
                                <span className="text-[#9CA3AF]">追求极致的确定性</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"}>创意写作: <span className="font-mono font-bold">1.5</span></span>
                                <span className="text-[#9CA3AF]">追求发散与想象力</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"}>通用对话: <span className="font-mono font-bold">0.7</span></span>
                                <span className="text-[#9CA3AF]">平衡准确与自然</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className={theme === 'dark' ? "text-white" : "text-[#1A1A1A]"}>翻译: <span className="font-mono font-bold">1.1</span></span>
                                <span className="text-[#9CA3AF]">兼顾直译与意译</span>
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}

                    {activeSettingsTab === 'theme' && (
                      <div className="space-y-8">
                        <section className="space-y-3">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">主题模式</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={async () => {
                                setTheme('light');
                                setTempSettings(prev => ({ ...prev, theme: 'light' }));
                                await api.saveSettings({ apiKey, temperature, theme: 'light', bgImage, promptTemplates });
                              }}
                              className={cn(
                                "p-4 text-center rounded-2xl border transition-all flex flex-col items-center gap-2",
                                theme === 'light' 
                                  ? "border-[#1A1A1A] bg-[#F9FAFB] ring-1 ring-[#1A1A1A]" 
                                  : "border-white/10 hover:border-white/30 text-gray-400"
                              )}
                            >
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <RefreshCw size={20} className="text-gray-600" />
                              </div>
                              <div className="text-sm font-bold">浅色模式</div>
                            </button>
                            <button
                              onClick={async () => {
                                setTheme('dark');
                                setTempSettings(prev => ({ ...prev, theme: 'dark' }));
                                await api.saveSettings({ apiKey, temperature, theme: 'dark', bgImage, promptTemplates });
                              }}
                              className={cn(
                                "p-4 text-center rounded-2xl border transition-all flex flex-col items-center gap-2",
                                theme === 'dark' 
                                  ? "border-white bg-white/10" 
                                  : "border-[#E5E7EB] hover:border-[#1A1A1A] text-[#6B7280]"
                              )}
                            >
                              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                                <RefreshCw size={20} className="text-gray-400" />
                              </div>
                              <div className="text-sm font-bold">深色模式</div>
                            </button>
                          </div>
                        </section>

                        <section className="space-y-3">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">背景图片</label>
                          <div className="space-y-3">
                            <div className={cn(
                              "relative h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden",
                              theme === 'dark' ? "border-white/10 hover:border-white/20" : "border-[#E5E7EB] hover:border-[#1A1A1A]"
                            )}>
                              {bgImage ? (
                                <>
                                  <img src={bgImage} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                  <button 
                                    onClick={async () => {
                                      setBgImage(null);
                                      setTempSettings(prev => ({ ...prev, bgImage: null }));
                                      await api.saveSettings({ apiKey, temperature, theme, bgImage: null, promptTemplates });
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                                  >
                                    <X size={12} />
                                  </button>
                                  <span className="relative z-10 text-[10px] font-bold uppercase bg-black/50 text-white px-2 py-1 rounded">已上传</span>
                                </>
                              ) : (
                                <>
                                  <HelpCircle size={20} className="text-[#9CA3AF]" />
                                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">上传背景图</span>
                                </>
                              )}
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </div>
                            <p className="text-[10px] text-[#9CA3AF] text-center">支持 JPG, PNG, WEBP</p>
                          </div>
                        </section>
                      </div>
                    )}

                    {activeSettingsTab === 'prompts' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">人物设定模板</label>
                          <button
                            onClick={async () => {
                              const newTemplate = { id: crypto.randomUUID(), name: '新模板', content: '' };
                              const newTemplates = [newTemplate, ...promptTemplates];
                              setPromptTemplates(newTemplates);
                              setTempSettings(prev => ({ ...prev, promptTemplates: newTemplates }));
                              await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates: newTemplates });
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                              theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                            )}
                          >
                            <Plus size={14} />
                            新建模板
                          </button>
                        </div>

                        <div className="space-y-4">
                          {promptTemplates.length === 0 ? (
                            <div className={cn(
                              "p-8 text-center rounded-2xl border-2 border-dashed",
                              theme === 'dark' ? "border-white/5 text-gray-500" : "border-[#F3F4F6] text-[#9CA3AF]"
                            )}>
                              <User size={32} className="mx-auto mb-2 opacity-20" />
                              <p className="text-xs font-medium">暂无模板，点击上方按钮新建</p>
                            </div>
                          ) : (
                            promptTemplates.map(template => (
                              <div
                                key={template.id}
                                className={cn(
                                  "p-4 rounded-2xl border transition-all space-y-3",
                                  theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-[#E5E7EB]"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    value={template.name}
                                    onChange={async (e) => {
                                      const newTemplates = promptTemplates.map(t => t.id === template.id ? { ...t, name: e.target.value } : t);
                                      setPromptTemplates(newTemplates);
                                      setTempSettings(prev => ({ ...prev, promptTemplates: newTemplates }));
                                      await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates: newTemplates });
                                    }}
                                    placeholder="模板名称"
                                    className={cn(
                                      "flex-1 bg-transparent border-none outline-none text-sm font-bold",
                                      theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                                    )}
                                  />
                                  <button
                                    onClick={async () => {
                                      const newTemplates = promptTemplates.filter(t => t.id !== template.id);
                                      setPromptTemplates(newTemplates);
                                      setTempSettings(prev => ({ ...prev, promptTemplates: newTemplates }));
                                      await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates: newTemplates });
                                    }}
                                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <textarea
                                  value={template.content}
                                  onChange={async (e) => {
                                    const newTemplates = promptTemplates.map(t => t.id === template.id ? { ...t, content: e.target.value } : t);
                                    setPromptTemplates(newTemplates);
                                    setTempSettings(prev => ({ ...prev, promptTemplates: newTemplates }));
                                    await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates: newTemplates });
                                  }}
                                  placeholder="输入人物设定内容..."
                                  className={cn(
                                    "w-full bg-transparent border-none outline-none text-xs min-h-[60px] resize-none",
                                    theme === 'dark' ? "text-gray-400" : "text-[#4B5563]"
                                  )}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {activeSettingsTab === 'memory' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">记忆提取提示词</label>
                        </div>
                        <div className="space-y-4">
                          <p className={cn("text-xs", theme === 'dark' ? "text-gray-400" : "text-[#6B7280]")}>
                            设置在自动总结记忆时，AI应该着重提取哪些信息（例如：发生了哪些事情，出现了哪些人物，人物之间的关系等）。留空则使用默认提示词。
                          </p>
                          <textarea
                            value={tempSettings.memoryPrompt}
                            onChange={e => setTempSettings(prev => ({ ...prev, memoryPrompt: e.target.value }))}
                            placeholder="例如：请着重记住发生了哪些事情，出现了哪些人物，人物之间的关系..."
                            className={cn(
                              "w-full rounded-xl px-4 py-3 text-sm outline-none min-h-[150px] resize-none transition-colors border",
                              theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] border-[#E5E7EB] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {activeSettingsTab === 'help' && (
                      <div className="space-y-8">
                        <section className="space-y-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-widest">
                            <HelpCircle size={14} />
                            常见错误码含义
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {[
                              { code: '400', label: '请求错误', desc: '参数不合法或请求格式错误' },
                              { code: '401', label: '认证失败', desc: 'API Key 错误或已失效' },
                              { code: '402', label: '余额不足', desc: '账户可用余额已耗尽' },
                              { code: '429', label: '频率限制', desc: '请求过于频繁，请稍后再试' },
                              { code: '500', label: '服务器错误', desc: 'DeepSeek 内部服务器异常' },
                              { code: '503', label: '服务繁忙', desc: '服务器负载过高，暂时无法处理' },
                            ].map(err => (
                              <div key={err.code} className={cn(
                                "p-3 rounded-xl flex items-center gap-4",
                                theme === 'dark' ? "bg-white/5" : "bg-[#F9FAFB]"
                              )}>
                                <span className={cn("text-sm font-mono font-bold w-10", theme === 'dark' ? "text-white" : "text-[#1A1A1A]")}>{err.code}</span>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">{err.label}</span>
                                  <span className="text-[10px] text-[#9CA3AF]">{err.desc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="space-y-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#6B7280] uppercase tracking-widest">
                            <ExternalLink size={14} />
                            更多资源
                          </div>
                          <div className={cn(
                            "p-4 rounded-2xl space-y-3",
                            theme === 'dark' ? "bg-white/5" : "bg-[#F3F4F6]"
                          )}>
                            <h4 className="text-xs font-bold">官方文档</h4>
                            <p className={cn(
                              "text-[10px]",
                              theme === 'dark' ? "text-gray-400" : "text-[#4B5563]"
                            )}>
                              访问 DeepSeek 开放平台获取更多关于 API 使用、计费和模型能力的详细信息。
                            </p>
                            <a 
                              href="https://api-docs.deepseek.com" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1"
                            >
                              查看文档 <ExternalLink size={10} />
                            </a>
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "p-6 border-t flex justify-end gap-3",
                  theme === 'dark' ? "border-white/10" : "border-[#F3F4F6]"
                )}>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-sm font-bold transition-colors",
                      theme === 'dark' ? "bg-white/5 text-white hover:bg-white/10" : "bg-[#F3F4F6] text-[#1A1A1A] hover:bg-[#E5E7EB]"
                    )}
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSaveSettings}
                    className={cn(
                      "px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg",
                      theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                    )}
                  >
                    保存并关闭
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Memory Modal */}
        <AnimatePresence>
          {isMemoryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "w-full max-w-lg rounded-2xl shadow-xl overflow-hidden",
                  theme === 'dark' ? "bg-[#1A1A1A] text-white" : "bg-white text-[#1A1A1A]"
                )}
              >
                <div className={cn("p-4 border-b flex justify-between items-center", theme === 'dark' ? "border-white/10" : "border-gray-200")}>
                  <h2 className="font-bold flex items-center gap-2"><Brain size={18}/> 对话记忆</h2>
                  <button onClick={() => setIsMemoryOpen(false)} className="hover:opacity-70"><X size={18}/></button>
                </div>
                <div className="p-4 flex flex-col gap-4">
                  <p className={cn("text-xs", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                    当对话超过10轮时，系统会自动总结早期对话并保存在这里。您也可以手动编辑或清除。
                  </p>
                  <textarea 
                    value={draftMemory}
                    onChange={e => setDraftMemory(e.target.value)}
                    className={cn(
                      "w-full h-40 p-3 rounded-lg border text-sm resize-none outline-none",
                      theme === 'dark' ? "border-white/10 bg-black/20 focus:border-white/30" : "border-gray-200 bg-gray-50 focus:border-gray-400"
                    )}
                    placeholder="暂无记忆..."
                  />
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={async () => {
                        if (currentConvId) {
                          await api.updateConversation(currentConvId, { memory: '', summarized_count: 0 });
                          setConversations(prev => prev.map(c => c.id === currentConvId ? { ...c, memory: '', summarized_count: 0 } : c));
                          setDraftMemory('');
                        }
                      }}
                      className="text-red-500 text-sm hover:underline"
                    >清除记忆</button>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsMemoryOpen(false)} 
                        className={cn("px-4 py-2 rounded-lg text-sm", theme === 'dark' ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200")}
                      >取消</button>
                      <button 
                        onClick={async () => {
                          if (currentConvId) {
                            await api.updateConversation(currentConvId, { memory: draftMemory });
                            setConversations(prev => prev.map(c => c.id === currentConvId ? { ...c, memory: draftMemory } : c));
                          }
                          setIsMemoryOpen(false);
                        }}
                        className={cn("px-4 py-2 rounded-lg text-sm", theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]")}
                      >保存</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
