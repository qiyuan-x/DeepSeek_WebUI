import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [memoryTab, setMemoryTab] = useState<'profile' | 'summary' | 'other'>('profile');
  const [memories, setMemories] = useState<any[]>([]);

  const [isAuthRequired, setIsAuthRequired] = useState(false);

  useEffect(() => {
    const handleAuthRequired = () => setIsAuthRequired(true);
    window.addEventListener('webui-auth-required', handleAuthRequired);
    return () => window.removeEventListener('webui-auth-required', handleAuthRequired);
  }, []);

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
  const systemPromptRef = useRef(systemPrompt);
  useEffect(() => {
    systemPromptRef.current = systemPrompt;
  }, [systemPrompt]);
  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState("");
  const [desiredPlot, setDesiredPlot] = useState("");
  const [desiredCharacters, setDesiredCharacters] = useState("");
  const [draftDesiredPlot, setDraftDesiredPlot] = useState("");
  const [draftDesiredCharacters, setDraftDesiredCharacters] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [balance, setBalance] = useState<any>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [previousTheme, setPreviousTheme] = useState<'light' | 'dark'>('light');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [storyTemplates, setStoryTemplates] = useState<PromptTemplate[]>([]);
  const [useTieredMemory, setUseTieredMemory] = useState(true);

  // Temp Settings for Modal
  const [activeSettingsTab, setActiveSettingsTab] = useState<'api' | 'theme' | 'templates' | 'advanced' | 'help'>('api');
  const [tempSettings, setTempSettings] = useState({
    apiKey: '',
    temperature: 0.7,
    theme: 'light' as 'light' | 'dark',
    bgImage: null as string | null,
    promptTemplates: [] as PromptTemplate[],
    storyTemplates: [] as PromptTemplate[],
    useTieredMemory: true,
    isPaintingEnabled: false,
    paintingProvider: 'jimeng',
    paintingApiKey: '',
    quickGenerate: false
  });

  // Story Mode & Painting State
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [isStorySetupOpen, setIsStorySetupOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExitingStoryMode, setIsExitingStoryMode] = useState(false);
  const [isPaintingEnabled, setIsPaintingEnabled] = useState(false);
  const [paintingProvider, setPaintingProvider] = useState('jimeng');
  const [paintingApiKey, setPaintingApiKey] = useState('');
  const [quickGenerate, setQuickGenerate] = useState(false);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [extractedPrompt, setExtractedPrompt] = useState("");
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);

  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const isUserInteractingRef = useRef(false);

  const currentConv = conversations.find(c => c.id === currentConvId);

  // Handle scroll to track if user is at bottom
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAtBottomRef.current = atBottom;
  }, []);

  const handleInteractionStart = () => {
    isUserInteractingRef.current = true;
  };

  const handleInteractionEnd = () => {
    setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 1000);
  };

  // Load initial data
  useEffect(() => {
    // Check for secret key in URL
    const urlParams = new URLSearchParams(window.location.search);
    const keyFromUrl = urlParams.get('key');
    if (keyFromUrl) {
      localStorage.setItem('webui_secret_key', keyFromUrl);
      // Remove key from URL to prevent sharing it accidentally
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    loadConversations();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      if (settings && !settings.error) {
        if (settings.apiKey) setApiKey(settings.apiKey);
        if (settings.temperature !== undefined) setTemperature(settings.temperature);
        if (settings.theme) setTheme(settings.theme);
        if (settings.bgImage) setBgImage(settings.bgImage);
        if (settings.promptTemplates) setPromptTemplates(settings.promptTemplates);
        if (settings.storyTemplates) setStoryTemplates(settings.storyTemplates);
        if (settings.useTieredMemory !== undefined) setUseTieredMemory(settings.useTieredMemory);
        if (settings.isPaintingEnabled !== undefined) setIsPaintingEnabled(settings.isPaintingEnabled);
        if (settings.paintingProvider) setPaintingProvider(settings.paintingProvider);
        if (settings.paintingApiKey) setPaintingApiKey(settings.paintingApiKey);
        if (settings.quickGenerate !== undefined) setQuickGenerate(settings.quickGenerate);
      }
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
      storyTemplates,
      useTieredMemory,
      isPaintingEnabled,
      paintingProvider,
      paintingApiKey,
      quickGenerate
    });
    setBalance(null);
    setBalanceError(null);
    setActiveSettingsTab('api');
    setIsSettingsOpen(true);
    setIsSidebarOpen(false);
  };

  const handleOpenMemory = async () => {
    setIsMemoryOpen(true);
    try {
      if (!currentConvId) {
        setMemories([]);
        return;
      }
      const currentConv = conversations.find(c => c.id === currentConvId);
      const data = await api.getMemories(currentConv?.title);
      setMemories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setApiKey(tempSettings.apiKey);
    setTemperature(tempSettings.temperature);
    setUseTieredMemory(tempSettings.useTieredMemory);
    setIsPaintingEnabled(tempSettings.isPaintingEnabled);
    setPaintingProvider(tempSettings.paintingProvider);
    setPaintingApiKey(tempSettings.paintingApiKey);
    setQuickGenerate(tempSettings.quickGenerate);
    
    await api.saveSettings({
      apiKey: tempSettings.apiKey,
      temperature: tempSettings.temperature,
      theme,
      bgImage,
      promptTemplates,
      useTieredMemory: tempSettings.useTieredMemory,
      isPaintingEnabled: tempSettings.isPaintingEnabled,
      paintingProvider: tempSettings.paintingProvider,
      paintingApiKey: tempSettings.paintingApiKey,
      quickGenerate: tempSettings.quickGenerate
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
          storyTemplates,
          useTieredMemory
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const lastLoadedConvId = useRef<string | null>(null);

  useEffect(() => {
    if (currentConvId !== lastLoadedConvId.current) {
      lastLoadedConvId.current = currentConvId;
      if (currentConvId) {
        loadMessages(currentConvId);
        const conv = conversations.find(c => c.id === currentConvId);
        setSystemPrompt(conv?.system_prompt || '');
        setIsEditingSystemPrompt(false);
        if (conv?.is_story_mode) {
          setIsStoryMode(true);
          setDesiredPlot(conv.desired_plot || '');
          setDesiredCharacters(conv.desired_characters || '');
          setTheme('dark');
        } else {
          setIsStoryMode(false);
          setDesiredPlot('');
          setDesiredCharacters('');
          setTheme(prev => prev === 'dark' && previousTheme !== 'dark' ? previousTheme : prev);
        }
      } else {
        setMessages([]);
        setIsEditingSystemPrompt(false);
        setIsStoryMode(false);
        setDesiredPlot('');
        setDesiredCharacters('');
        setTheme(prev => prev === 'dark' && previousTheme !== 'dark' ? previousTheme : prev);
      }
    }
  }, [currentConvId, conversations, previousTheme]);

  useEffect(() => {
    if (isAtBottomRef.current && !isUserInteractingRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async (id: string) => {
    try {
      const data = await api.getMessages(id);
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewChat = () => {
    setCurrentConvId(null);
    setMessages([]);
    setSystemPrompt('');
    setDraftSystemPrompt('');
    setIsEditingSystemPrompt(false);
    setIsStoryMode(false);
    setDesiredPlot('');
    setDesiredCharacters('');
    setTheme(prev => prev === 'dark' && previousTheme !== 'dark' ? previousTheme : prev);
    setIsSidebarOpen(window.innerWidth > 1024);
  };

  const handleDeleteConv = async (id: string) => {
    try {
      await api.deleteConversation(id);
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
        setSystemPrompt('');
        setDraftSystemPrompt('');
        setIsEditingSystemPrompt(false);
        setIsStoryMode(false);
        setDesiredPlot('');
        setDesiredCharacters('');
        setTheme(prev => prev === 'dark' && previousTheme !== 'dark' ? previousTheme : prev);
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

  const handleUpdateSystemPrompt = async (newPrompt: string, newPlot?: string, newCharacters?: string) => {
    setSystemPrompt(newPrompt);
    systemPromptRef.current = newPrompt;
    if (newPlot !== undefined) setDesiredPlot(newPlot);
    if (newCharacters !== undefined) setDesiredCharacters(newCharacters);
    
    if (currentConvId) {
      try {
        await api.updateConversation(currentConvId, { 
          system_prompt: newPrompt,
          desired_plot: newPlot !== undefined ? newPlot : desiredPlot,
          desired_characters: newCharacters !== undefined ? newCharacters : desiredCharacters
        });
        // Update local state for conversations list
        setConversations(prev => prev.map(c => 
          c.id === currentConvId ? { 
            ...c, 
            system_prompt: newPrompt,
            desired_plot: newPlot !== undefined ? newPlot : desiredPlot,
            desired_characters: newCharacters !== undefined ? newCharacters : desiredCharacters
          } : c
        ));
      } catch (error) {
        console.error('Failed to update system prompt:', error);
      }
    }
    setIsEditingSystemPrompt(false);
  };




  const handleExtractPrompt = async (messageId: string, text: string) => {
    if (!apiKey) {
      alert("请先配置 API Key");
      return;
    }
    
    setTargetMessageId(messageId);
    
    // Set message to generating state
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: true } : m));
    
    try {
      if (quickGenerate) {
        // Skip extraction dialog, just extract and generate
        const { prompt } = await api.extractPrompt(text, apiKey);
        await executeImageGeneration(messageId, prompt);
      } else {
        const { prompt } = await api.extractPrompt(text, apiKey);
        setExtractedPrompt(prompt);
        setIsPromptDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to extract prompt:", error);
      alert("提取提示词失败，请重试");
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: false } : m));
    }
  };

  const executeImageGeneration = async (messageId: string, prompt: string) => {
    try {
      const { imageUrl } = await api.generateImage(prompt, paintingProvider, paintingApiKey);
      
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, imageUrl, isGeneratingImage: false } : m));
      
      // Update message in DB
      const msgToUpdate = messages.find(m => m.id === messageId);
      if (msgToUpdate) {
        await api.saveMessage({ ...msgToUpdate, imageUrl });
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
      alert("生成图片失败，请重试");
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isGeneratingImage: false } : m));
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    if (!apiKey && !process.env.DEEPSEEK_API_KEY) {
      alert('请在设置中配置您的 DeepSeek API Key。');
      setIsSettingsOpen(true);
      return;
    }

    let baseSysPrompt = systemPromptRef.current;
    let currentDesiredPlot = desiredPlot;
    let currentDesiredCharacters = desiredCharacters;
    
    if (isEditingSystemPrompt) {
      baseSysPrompt = draftSystemPrompt;
      currentDesiredPlot = draftDesiredPlot;
      currentDesiredCharacters = draftDesiredCharacters;
      handleUpdateSystemPrompt(draftSystemPrompt, draftDesiredPlot, draftDesiredCharacters);
      setIsEditingSystemPrompt(false);
    }

    let finalSysPrompt = baseSysPrompt;
    if (isStoryMode && (currentDesiredPlot || currentDesiredCharacters)) {
      finalSysPrompt += `\n\n【故事命运线指引】\n`;
      if (currentDesiredPlot) finalSysPrompt += `期望的情节：${currentDesiredPlot}\n`;
      if (currentDesiredCharacters) finalSysPrompt += `期望出现的人物：${currentDesiredCharacters}\n`;
      finalSysPrompt += `请注意：请根据以上指引逐步推进剧情，不要一次性完成所有期望的情节，要保持故事的悬念和互动性。`;
    }

    let convId = currentConvId;
    let convTitle = currentConv?.title;
    const isFirstMessage = !convId;

    if (isFirstMessage) {
      convId = uuidv4();
      convTitle = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      if (isStoryMode) {
        convTitle += " (故事模式)";
      }
      await api.createConversation({
        id: convId,
        title: convTitle,
        system_prompt: baseSysPrompt,
        model,
        temperature,
        is_story_mode: isStoryMode,
        desired_plot: isStoryMode ? currentDesiredPlot : undefined,
        desired_characters: isStoryMode ? currentDesiredCharacters : undefined
      });
      await loadConversations();
      setCurrentConvId(convId);
    }

    const userMsg: Message = {
      id: uuidv4(),
      conversation_id: convId!,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    isAtBottomRef.current = true;
    setTimeout(() => scrollToBottom(), 50);

    const controller = new AbortController();
    setAbortController(controller);
    const startTime = Date.now();

    let assistantMsg: Message = {
      id: uuidv4(),
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

      let chatHistory = messages.map(m => ({ 
        role: m.role, 
        content: m.content.trim() === '' ? '(未完成的回复)' : m.content 
      }));

      if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20);
      }

      let finalMessages = [
        ...(finalSysPrompt ? [{ role: 'system', content: finalSysPrompt }] : []),
        ...chatHistory,
        { role: 'user', content: userMsg.content }
      ];

      // Merge consecutive messages with the same role
      const mergedFinal: any[] = [];
      for (const msg of finalMessages) {
        if (mergedFinal.length > 0 && mergedFinal[mergedFinal.length - 1].role === msg.role) {
          mergedFinal[mergedFinal.length - 1].content += '\n\n' + msg.content;
        } else {
          mergedFinal.push({ ...msg });
        }
      }

      setMessages(prev => [...prev, assistantMsg]);

      const response = await api.chat({
        messages: mergedFinal,
        model: model, // Always use the current toggle state
        temperature: currentConv?.temperature || temperature,
        stream: true,
        apiKey: apiKey,
        stream_options: { include_usage: true },
        useTieredMemory: useTieredMemory,
        conversationId: convId,
        conversationName: convTitle || "未命名对话"
      }, controller.signal);

      if (!response.ok) {
        const text = await response.text();
        let errMsg = '连接 DeepSeek 失败';
        try {
          const err = JSON.parse(text);
          errMsg = typeof err.error === 'string' ? err.error : err.error?.message || errMsg;
        } catch (e) {
          if (response.status === 413) {
            errMsg = '对话内容过长，超出了服务器限制。请开启新对话或清理历史记录。';
          } else {
            errMsg = `服务器错误 (${response.status}): ${text.substring(0, 100)}`;
          }
        }
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let isReasoning = false;
      let usage: any = null;
      let buffer = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
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

      if (buffer) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.usage) {
                usage = data.usage;
                continue;
              }
              if (!data.choices || data.choices.length === 0) continue;
              const delta = data.choices[0].delta;
              if (delta.reasoning_content) {
                fullReasoning += delta.reasoning_content;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, reasoning_content: fullReasoning } : m));
              }
              if (delta.content) {
                fullContent += delta.content;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent } : m));
              }
            } catch (e) {}
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

    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      
      if (error.name === 'AbortError') {
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

      if (fullContent.trim() !== '' || fullReasoning.trim() !== '') {
        const finalContent = fullContent + `\n\n[网络连接中断: ${error.message}]`;
        
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
      } else {
        setMessages(prev => prev.filter(m => m.id !== assistantMsg.id));
        api.deleteMessage(assistantMsg.id).catch(console.error);
        alert(error.message);
      }
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

  if (isAuthRequired) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[#0A0A0A] text-white font-sans">
        <div className="w-full max-w-md p-8 bg-[#111111] rounded-2xl border border-white/10 shadow-2xl mx-4">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 rounded-full object-cover shadow-lg" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-2">DeepSeek WebUI</h1>
          <p className="text-center text-gray-400 mb-8 text-sm">请输入服务端提供的访问密钥</p>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const key = formData.get('key') as string;
            try {
              const res = await api.verifyKey(key);
              if (res.success) {
                localStorage.setItem('webui_secret_key', key);
                setIsAuthRequired(false);
                window.location.reload();
              } else {
                alert('密钥错误，请重试');
              }
            } catch (err) {
              alert('验证失败，请检查网络或服务端状态');
            }
          }}>
            <input
              type="password"
              name="key"
              placeholder="输入访问密钥..."
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors mb-4"
              required
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              进入系统
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-[100dvh] w-full overflow-hidden font-sans transition-colors duration-300",
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
                    onClick={() => {
                      setCurrentConvId(conv.id);
                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
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
          "h-14 flex items-center justify-between px-2 sm:px-4 border-b shrink-0 transition-colors duration-300 overflow-x-auto hide-scrollbar",
          theme === 'dark' ? "bg-[#111111]/50 border-white/10" : "bg-white/50 border-[#E5E7EB]"
        )}>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "p-1.5 sm:p-2 rounded-lg transition-colors",
                theme === 'dark' ? "hover:bg-white/5" : "hover:bg-[#F3F4F6]"
              )}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex flex-col hidden sm:flex">
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
                "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full transition-all border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:ml-2 shrink-0",
                isThinkingMode 
                  ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm" 
                  : "bg-gray-50 border-gray-200 text-gray-600"
              )}
            >
              <Brain size={12} className={cn("sm:w-3.5 sm:h-3.5", isThinkingMode ? "text-purple-600" : "text-gray-400")} />
              <span className="hidden sm:inline">{isThinkingMode ? "深度思考" : "快速回答"}</span>
              <span className="sm:hidden">{isThinkingMode ? "深度" : "快速"}</span>
              <div className={cn(
                "w-6 sm:w-7 h-3 sm:h-3.5 rounded-full relative transition-colors ml-0.5 sm:ml-1",
                isThinkingMode ? "bg-purple-400" : "bg-gray-300"
              )}>
                <div className={cn(
                  "absolute top-[1px] sm:top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all",
                  isThinkingMode ? "left-3 sm:left-4" : "left-[1px] sm:left-0.5"
                )} />
              </div>
            </button>

            {/* Story Mode Button */}
            {!isStoryMode && (
              <button
                onClick={() => {
                  setPreviousTheme(theme);
                  setIsTransitioning(true);
                }}
                className={cn(
                  "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full transition-all border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ml-1 sm:ml-2 shadow-sm hover:shadow-md shrink-0",
                  "bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent hover:from-indigo-600 hover:to-purple-700"
                )}
              >
                <span className="text-xs sm:text-sm">🌌</span>
                <span className="hidden sm:inline">进入故事模式</span>
                <span className="sm:hidden">故事</span>
              </button>
            )}
            {isStoryMode && (
              <button
                onClick={() => {
                  setIsExitingStoryMode(true);
                }}
                className={cn(
                  "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full transition-all border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ml-1 sm:ml-2 shadow-sm shrink-0",
                  "bg-white/10 border-white/20 text-white hover:bg-white/20"
                )}
              >
                <span className="text-xs sm:text-sm">🚪</span>
                <span className="hidden sm:inline">退出故事模式</span>
                <span className="sm:hidden">退出</span>
              </button>
            )}
          </div>

          {/* Token & Cost Display */}
          <div className="flex-1 hidden md:flex justify-center shrink-0 mx-2">
            {currentConvId && (
              <div className={cn(
                "flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-1.5 border rounded-2xl shadow-sm transition-colors",
                theme === 'dark' ? "bg-[#1A1A1A] border-white/10" : "bg-[#F9FAFB] border-[#E5E7EB]"
              )}>
                <div className="flex items-center gap-1.5">
                  <Coins size={14} className={theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"} />
                  <span className={cn(
                    "text-[10px] lg:text-[11px] font-bold uppercase tracking-wider hidden lg:inline",
                    theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
                  )}>Tokens:</span>
                  <span className={cn(
                    "text-[10px] lg:text-[11px] font-mono font-bold",
                    theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                  )}>{totalTokens}</span>
                </div>
                <div className={cn("w-px h-3", theme === 'dark' ? "bg-white/10" : "bg-[#E5E7EB]")} />
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[10px] lg:text-[11px] font-bold uppercase tracking-wider hidden lg:inline",
                    theme === 'dark' ? "text-gray-400" : "text-[#6B7280]"
                  )}>预估费用:</span>
                  <span className="text-[10px] lg:text-[11px] font-mono font-bold text-emerald-600">￥{totalCost.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={handleOpenMemory}
              className={cn(
                "p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2",
                theme === 'dark' ? "text-gray-400 hover:text-purple-400 hover:bg-purple-500/10" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
              )}
              title="查看全局记忆"
            >
              <Brain size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-[10px] sm:text-xs font-medium hidden sm:inline">记忆库</span>
            </button>
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

        {/* System Prompt Bar (AI设定) / Story Destiny Line */}
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
                )}>{isStoryMode ? "故事命运线与底层设定:" : "AI设定:"}</span>
                {!isEditingSystemPrompt && (
                  <span className={cn(
                    "text-xs truncate max-w-[400px]",
                    theme === 'dark' ? "text-gray-300" : "text-[#4B5563]"
                  )}>
                    {isStoryMode ? (desiredPlot || desiredCharacters || systemPrompt || '未设定') : (systemPrompt || '未设定')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    if (!isEditingSystemPrompt) {
                      setDraftSystemPrompt(systemPrompt || "");
                      setDraftDesiredPlot(desiredPlot || "");
                      setDraftDesiredCharacters(desiredCharacters || "");
                    }
                    setIsEditingSystemPrompt(!isEditingSystemPrompt);
                  }}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider hover:underline",
                    theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                  )}
                >
                  {isEditingSystemPrompt ? '收起' : (systemPrompt || isStoryMode ? '修改' : '点击设定')}
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
                      placeholder="设定AI的回复规则。这是AI遵循的最底层的规则..."
                      className={cn(
                        "w-full rounded-lg px-3 py-3 text-sm outline-none min-h-[100px] resize-none transition-colors border",
                        theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-white/20" : "bg-white border-[#E5E7EB] text-[#4B5563] focus:ring-1 focus:ring-[#1A1A1A]"
                      )}
                    />
                    {isStoryMode && (
                      <>
                        <textarea 
                          value={draftDesiredPlot}
                          onChange={e => setDraftDesiredPlot(e.target.value)}
                          placeholder="期望的情节 (例如：接下来主角会遇到一个神秘的商人...)"
                          className={cn(
                            "w-full rounded-lg px-3 py-3 text-sm outline-none min-h-[80px] resize-none transition-colors border mt-2",
                            theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-white/20" : "bg-white border-[#E5E7EB] text-[#4B5563] focus:ring-1 focus:ring-[#1A1A1A]"
                          )}
                        />
                        <textarea 
                          value={draftDesiredCharacters}
                          onChange={e => setDraftDesiredCharacters(e.target.value)}
                          placeholder="期望出现的人物 (例如：一个名叫艾莉丝的精灵法师...)"
                          className={cn(
                            "w-full rounded-lg px-3 py-3 text-sm outline-none min-h-[80px] resize-none transition-colors border mt-2",
                            theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:ring-1 focus:ring-white/20" : "bg-white border-[#E5E7EB] text-[#4B5563] focus:ring-1 focus:ring-[#1A1A1A]"
                          )}
                        />
                      </>
                    )}
                    <div className="flex justify-end mt-2">
                      <button 
                        onClick={() => {
                          handleUpdateSystemPrompt(draftSystemPrompt, draftDesiredPlot, draftDesiredCharacters);
                          setIsEditingSystemPrompt(false);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-colors",
                          theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                        )}
                      >
                        {isStoryMode ? "修改故事命运线" : "确认"}
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
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          onMouseDown={handleInteractionStart}
          onMouseUp={handleInteractionEnd}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className={cn(
                  "p-2 rounded-full shadow-md",
                  theme === 'dark' ? "bg-white/5" : "bg-white"
                )}>
                  <img src="/logo.png" alt="Logo" className="w-16 h-16 rounded-full object-cover" />
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

                  {/* AI Painting UI */}
                  {msg.role === 'assistant' && isPaintingEnabled && (
                    <div className="mt-4 border-t border-white/10 pt-3 flex flex-col gap-3">
                      {!msg.imageUrl && !msg.isGeneratingImage && (
                        <button
                          onClick={() => handleExtractPrompt(msg.id, msg.content)}
                          className={cn(
                            "flex items-center gap-2 self-start px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                            theme === 'dark' 
                              ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white" 
                              : "bg-[#F9FAFB] border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1A1A1A]"
                          )}
                        >
                          <Edit2 size={14} />
                          🖌️ 描绘此场景/人物
                        </button>
                      )}
                      
                      {msg.isGeneratingImage && (
                        <div className="flex flex-col gap-2 items-center justify-center p-6 border-2 border-dashed rounded-xl border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-white/5">
                          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                            AI 正在作画中，请稍候...
                          </span>
                        </div>
                      )}

                      {msg.imageUrl && (
                        <div className="relative group rounded-xl overflow-hidden border border-white/10 shadow-sm">
                          <img 
                            src={msg.imageUrl} 
                            alt="Generated by AI" 
                            className="w-full h-auto object-cover max-h-[512px]"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <a 
                              href={msg.imageUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                              title="在新标签页打开"
                            >
                              <ExternalLink size={20} />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                placeholder="给 DeepSeek 发送消息..."
                className={cn(
                  "w-full border-none rounded-2xl px-4 py-[14px] pr-4 text-sm leading-relaxed outline-none resize-none min-h-[52px] max-h-40 flex items-center transition-colors",
                  theme === 'dark' ? "bg-white/5 text-white placeholder:text-gray-500 focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] placeholder:text-gray-400 focus:ring-1 focus:ring-[#1A1A1A]"
                )}
                rows={1}
              />
            </div>
            <div className="flex shrink-0">
              {isLoading ? (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleStop();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleStop();
                  }}
                  className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center"
                >
                  <StopCircle size={20} />
                </button>
              ) : (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    if (!input.trim()) return;
                    handleSendMessage();
                  }}
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
            "text-[10px] text-center mt-2 font-medium transition-colors flex items-center justify-center gap-2",
            theme === 'dark' ? "text-gray-500" : "text-[#9CA3AF]"
          )}>
            <span>DeepSeek 可能会犯错。请核查重要信息。</span>
            <span className="opacity-50">v1.0.2</span>
          </p>
        </div>

        {/* Memory Modal */}
        <AnimatePresence>
          {isMemoryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/20 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={cn(
                  "w-full h-full sm:h-auto sm:max-h-[80vh] max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col",
                  theme === 'dark' ? "bg-[#1A1A1A] border border-white/10" : "bg-white border border-[#E5E7EB]"
                )}
              >
                <div className={cn(
                  "p-4 border-b flex justify-between items-center shrink-0",
                  theme === 'dark' ? "border-white/10" : "border-[#E5E7EB]"
                )}>
                  <h3 className={cn(
                    "text-lg font-semibold flex items-center gap-2",
                    theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                  )}>
                    <Brain className="text-purple-500" size={20} />
                    当前对话记忆 (PowerMem)
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const formattedData = {
                          userProfile: memories.filter(m => m.entity_key.includes('用户画像')),
                          conversationSummaries: memories.filter(m => m.entity_key.includes('对话总结')),
                          otherMemories: memories.filter(m => !m.entity_key.includes('用户画像') && !m.entity_key.includes('对话总结'))
                        };
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formattedData, null, 2));
                        const downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href", dataStr);
                        downloadAnchorNode.setAttribute("download", "memories.json");
                        document.body.appendChild(downloadAnchorNode);
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                      }}
                      className={cn(
                        "p-2 rounded-lg transition-colors text-sm flex items-center gap-1",
                        theme === 'dark' ? "text-purple-400 hover:bg-purple-500/10" : "text-purple-600 hover:bg-purple-50"
                      )}
                      title="导出为JSON文件"
                    >
                      <ExternalLink size={16} />
                      <span className="hidden sm:inline">导出JSON</span>
                    </button>
                    <button 
                      onClick={() => setIsMemoryOpen(false)} 
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        theme === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                      )}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <div className={cn(
                  "border-b flex",
                  theme === 'dark' ? "border-white/10" : "border-[#E5E7EB]"
                )}>
                  <button
                    onClick={() => setMemoryTab('profile')}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                      memoryTab === 'profile' 
                        ? (theme === 'dark' ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600")
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    用户画像
                  </button>
                  <button
                    onClick={() => setMemoryTab('summary')}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                      memoryTab === 'summary' 
                        ? (theme === 'dark' ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600")
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    对话总结
                  </button>
                  <button
                    onClick={() => setMemoryTab('other')}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                      memoryTab === 'other' 
                        ? (theme === 'dark' ? "border-purple-500 text-purple-400" : "border-purple-600 text-purple-600")
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    其他记忆
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  {(() => {
                    const displayedMemories = memories.filter(m => {
                      if (memoryTab === 'profile') return m.entity_key.includes('用户画像');
                      if (memoryTab === 'summary') return m.entity_key.includes('对话总结');
                      return !m.entity_key.includes('用户画像') && !m.entity_key.includes('对话总结');
                    });

                    if (displayedMemories.length === 0) {
                      return (
                        <div className={cn(
                          "text-center py-12",
                          theme === 'dark' ? "text-gray-500" : "text-gray-400"
                        )}>
                          暂无{memoryTab === 'profile' ? '用户画像' : memoryTab === 'summary' ? '对话总结' : '其他记忆'}数据~
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {displayedMemories.map((m, i) => (
                          <div key={i} className={cn(
                            "p-4 rounded-xl border flex flex-col gap-2",
                            theme === 'dark' ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"
                          )}>
                            <div className="flex justify-between items-start">
                              <span className={cn(
                                "font-semibold",
                                theme === 'dark' ? "text-white" : "text-gray-900"
                              )}>{m.entity_key}</span>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                theme === 'dark' ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"
                              )}>权重: {m.weight}</span>
                            </div>
                            <p className={cn(
                              "text-sm leading-relaxed",
                              theme === 'dark' ? "text-gray-300" : "text-gray-700"
                            )}>{m.entity_value}</p>
                            <div className={cn(
                              "text-xs mt-1",
                              theme === 'dark' ? "text-gray-500" : "text-gray-400"
                            )}>最后访问: {new Date(m.last_accessed.replace(' ', 'T') + 'Z').toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/20 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={cn(
                  "w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-300",
                  theme === 'dark' ? "bg-[#1A1A1A] text-white" : "bg-white text-[#1A1A1A]"
                )}
              >
                <div className={cn(
                  "p-4 sm:p-6 border-b flex items-center justify-between shrink-0",
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

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                  {/* Settings Sidebar Tabs */}
                  <div className={cn(
                    "w-full md:w-48 border-b md:border-b-0 md:border-r flex flex-nowrap md:flex-col p-2 gap-1 overflow-x-auto shrink-0 hide-scrollbar",
                    theme === 'dark' ? "border-white/10 bg-white/5" : "border-[#F3F4F6] bg-[#F9FAFB]"
                  )}>
                    {[
                      { id: 'api', label: 'API & 模型', icon: Send },
                      { id: 'theme', label: '主题 & 界面', icon: Layout },
                      { id: 'templates', label: '模板设置', icon: User },
                      { id: 'advanced', label: '高级设置', icon: Settings },
                      { id: 'help', label: '帮助中心', icon: BookOpen },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSettingsTab(tab.id as any)}
                        className={cn(
                          "flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
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

                  <div className="flex-1 overflow-y-auto p-4 md:p-6">
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

                    {activeSettingsTab === 'advanced' && (
                      <div className="space-y-8">
                        {/* Memory Settings */}
                        <section className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">层级记忆管理 (Tiered Memory)</label>
                              <p className={cn("text-[10px]", theme === 'dark' ? "text-gray-500" : "text-[#9CA3AF]")}>
                                开启后，系统将使用 SQLite 存储长期事实，并根据当前对话自动检索。
                              </p>
                            </div>
                            <button
                              onClick={() => setTempSettings(prev => ({ ...prev, useTieredMemory: !prev.useTieredMemory }))}
                              className={cn(
                                "w-12 h-6 rounded-full relative transition-colors",
                                tempSettings.useTieredMemory ? "bg-emerald-500" : "bg-gray-300"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                                tempSettings.useTieredMemory ? "left-7" : "left-1"
                              )} />
                            </button>
                          </div>
                        </section>

                        {/* AI Painting Settings */}
                        <section className="space-y-4 pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold flex items-center gap-2">
                              <span className="text-lg">🎨</span> AI 绘画总开关
                            </label>
                            <button
                              onClick={() => setTempSettings(prev => ({ ...prev, isPaintingEnabled: !prev.isPaintingEnabled }))}
                              className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                tempSettings.isPaintingEnabled ? "bg-emerald-500" : (theme === 'dark' ? "bg-white/20" : "bg-gray-300")
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm",
                                tempSettings.isPaintingEnabled ? "left-6.5" : "left-0.5"
                              )} />
                            </button>
                          </div>
                          <p className={cn("text-xs", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                            开启后，AI 消息气泡底部将显示“描绘此景/此人”按钮，可将文字转化为精美图像。
                          </p>
                        </section>

                        {tempSettings.isPaintingEnabled && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                          >
                            <section className="space-y-3">
                              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">服务商选择</label>
                              <select
                                value={tempSettings.paintingProvider}
                                onChange={e => setTempSettings(prev => ({ ...prev, paintingProvider: e.target.value }))}
                                className={cn(
                                  "w-full border-none rounded-xl px-4 py-3 text-sm outline-none transition-colors appearance-none",
                                  theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                                )}
                              >
                                <option value="jimeng">火山引擎 - 即梦 (Jimeng)</option>
                                {/* Future providers can be added here */}
                              </select>
                            </section>

                            <section className="space-y-3">
                              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">API Key</label>
                              <input 
                                type="password"
                                value={tempSettings.paintingApiKey}
                                onChange={e => setTempSettings(prev => ({ ...prev, paintingApiKey: e.target.value }))}
                                placeholder="输入对应服务商的 API Key..."
                                className={cn(
                                  "w-full border-none rounded-xl px-4 py-3 text-sm outline-none transition-colors",
                                  theme === 'dark' ? "bg-white/5 text-white focus:ring-1 focus:ring-white/20" : "bg-[#F3F4F6] text-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]"
                                )}
                              />
                            </section>

                            <section className="space-y-3 pt-2">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={tempSettings.quickGenerate}
                                  onChange={e => setTempSettings(prev => ({ ...prev, quickGenerate: e.target.checked }))}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium">开启一键直出（跳过提示词确认直接生成）</span>
                              </label>
                            </section>
                          </motion.div>
                        )}
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
                                await api.saveSettings({ apiKey, temperature, theme: 'light', bgImage, promptTemplates, storyTemplates });
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
                                await api.saveSettings({ apiKey, temperature, theme: 'dark', bgImage, promptTemplates, storyTemplates });
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
                                      await api.saveSettings({ apiKey, temperature, theme, bgImage: null, promptTemplates, storyTemplates });
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

                    {activeSettingsTab === 'templates' && (
                      <div className="space-y-8">
                        {/* AI Setting Templates */}
                        <section className="space-y-6">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">AI设定模板</label>
                            <button
                              onClick={async () => {
                                const newTemplate = { id: uuidv4(), name: '新AI设定', content: '' };
                                const newTemplates = [newTemplate, ...promptTemplates];
                                setPromptTemplates(newTemplates);
                                setTempSettings(prev => ({ ...prev, promptTemplates: newTemplates }));
                                await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates: newTemplates, storyTemplates });
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
                                <p className="text-xs font-medium">暂无AI设定模板，点击上方按钮新建</p>
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
                                        await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates: newTemplates, storyTemplates });
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
                                        await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates: newTemplates, storyTemplates });
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
                                      await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates: newTemplates, storyTemplates });
                                    }}
                                    placeholder="输入AI底层设定内容 (直接作为System Prompt)..."
                                    className={cn(
                                      "w-full bg-transparent border-none outline-none text-xs min-h-[60px] resize-none",
                                      theme === 'dark' ? "text-gray-400" : "text-[#4B5563]"
                                    )}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        </section>

                        {/* Story World Templates */}
                        <section className="space-y-6 pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">故事世界模板</label>
                            <button
                              onClick={async () => {
                                const newTemplate = { id: uuidv4(), name: '新故事世界', content: '' };
                                const newTemplates = [newTemplate, ...storyTemplates];
                                setStoryTemplates(newTemplates);
                                setTempSettings(prev => ({ ...prev, storyTemplates: newTemplates }));
                                await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates, storyTemplates: newTemplates });
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
                            {storyTemplates.length === 0 ? (
                              <div className={cn(
                                "p-8 text-center rounded-2xl border-2 border-dashed",
                                theme === 'dark' ? "border-white/5 text-gray-500" : "border-[#F3F4F6] text-[#9CA3AF]"
                              )}>
                                <BookOpen size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-medium">暂无故事世界模板，点击上方按钮新建</p>
                              </div>
                            ) : (
                              storyTemplates.map(template => (
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
                                        const newTemplates = storyTemplates.map(t => t.id === template.id ? { ...t, name: e.target.value } : t);
                                        setStoryTemplates(newTemplates);
                                        setTempSettings(prev => ({ ...prev, storyTemplates: newTemplates }));
                                        await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates, storyTemplates: newTemplates });
                                      }}
                                      placeholder="模板名称"
                                      className={cn(
                                        "flex-1 bg-transparent border-none outline-none text-sm font-bold",
                                        theme === 'dark' ? "text-white" : "text-[#1A1A1A]"
                                      )}
                                    />
                                    <button
                                      onClick={async () => {
                                        const newTemplates = storyTemplates.filter(t => t.id !== template.id);
                                        setStoryTemplates(newTemplates);
                                        setTempSettings(prev => ({ ...prev, storyTemplates: newTemplates }));
                                        await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates, storyTemplates: newTemplates });
                                      }}
                                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <textarea
                                    value={template.content}
                                    onChange={async (e) => {
                                      const newTemplates = storyTemplates.map(t => t.id === template.id ? { ...t, content: e.target.value } : t);
                                      setStoryTemplates(newTemplates);
                                      setTempSettings(prev => ({ ...prev, storyTemplates: newTemplates }));
                                      await api.saveSettings({ apiKey, temperature, theme, bgImage, promptTemplates, storyTemplates: newTemplates });
                                    }}
                                    placeholder="输入故事设定内容 (仅在开始时发送一次)..."
                                    className={cn(
                                      "w-full bg-transparent border-none outline-none text-xs min-h-[60px] resize-none",
                                      theme === 'dark' ? "text-gray-400" : "text-[#4B5563]"
                                    )}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        </section>
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
                  "p-4 sm:p-6 border-t flex justify-end gap-3 shrink-0",
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

        {/* Memory Modal Removed */}

        {/* Story Mode Transition Overlay */}
        <AnimatePresence>
          {(isTransitioning || isExitingStoryMode) && (
            <motion.div 
              className="fixed inset-0 z-[100] pointer-events-none overflow-hidden flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                style={{ width: '150vmax', height: '150vmax' }}
                className="absolute rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 opacity-100 blur-3xl"
                initial={isTransitioning ? { scale: 0 } : { scale: 1 }}
                animate={isTransitioning ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                onAnimationComplete={() => {
                  if (isTransitioning) {
                    setIsTransitioning(false);
                    setIsStoryMode(true);
                    if (theme !== 'dark') {
                      setTheme('dark');
                    }
                    setIsEditingSystemPrompt(true);
                  } else if (isExitingStoryMode) {
                    setIsExitingStoryMode(false);
                    setIsStoryMode(false);
                    setIsEditingSystemPrompt(false);
                    setTheme(previousTheme);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>



        {/* Prompt Confirmation Dialog */}
        <AnimatePresence>
          {isPromptDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border flex flex-col",
                  theme === 'dark' ? "bg-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
                )}
              >
                <div className={cn(
                  "p-5 border-b flex justify-between items-center",
                  theme === 'dark' ? "border-white/10" : "border-gray-100"
                )}>
                  <h3 className={cn("text-lg font-bold", theme === 'dark' ? "text-white" : "text-gray-900")}>
                    确认绘画提示词
                  </h3>
                  <button 
                    onClick={() => {
                      setIsPromptDialogOpen(false);
                      if (targetMessageId) {
                        setMessages(prev => prev.map(m => m.id === targetMessageId ? { ...m, isGeneratingImage: false } : m));
                      }
                    }}
                    className={cn(
                      "p-1.5 rounded-full transition-colors",
                      theme === 'dark' ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                    )}
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="p-5 space-y-4">
                  <p className={cn("text-sm", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>
                    AI 已提取场景描述，您可以修改或直接生成图片：
                  </p>
                  <textarea
                    value={extractedPrompt}
                    onChange={e => setExtractedPrompt(e.target.value)}
                    className={cn(
                      "w-full h-32 rounded-xl p-3 text-sm outline-none resize-none border transition-colors",
                      theme === 'dark' 
                        ? "bg-white/5 border-white/10 text-white focus:border-indigo-500" 
                        : "bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-500"
                    )}
                  />
                </div>

                <div className={cn(
                  "p-5 border-t flex justify-end gap-3",
                  theme === 'dark' ? "border-white/10" : "border-gray-100"
                )}>
                  <button 
                    onClick={() => {
                      setIsPromptDialogOpen(false);
                      if (targetMessageId) {
                        setMessages(prev => prev.map(m => m.id === targetMessageId ? { ...m, isGeneratingImage: false } : m));
                      }
                    }}
                    className={cn(
                      "px-5 py-2 rounded-lg text-sm font-medium transition-colors",
                      theme === 'dark' ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      setIsPromptDialogOpen(false);
                      if (targetMessageId) {
                        executeImageGeneration(targetMessageId, extractedPrompt);
                      }
                    }}
                    className="px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    生成图片
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
