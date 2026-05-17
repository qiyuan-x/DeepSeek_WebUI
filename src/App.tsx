import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './types';
import { api } from './services/api';

import { useChatStore } from './store/chatStore';
import { useUIStore } from './store/uiStore';
import { useSettingStore } from './store/settingStore';
import { useStoryStore } from './store/storyStore';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { ChatInput } from './components/ChatInput';
import { MessageList } from './components/MessageList';
import { MemoryModal } from './components/MemoryModal';
import { StoryDiscussionModal } from './components/StoryDiscussionModal';
import { PromptConfirmationDialog } from './components/PromptConfirmationDialog';
import { ImageGalleryModal } from './components/ImageGalleryModal';
import { SystemPromptBar } from './components/SystemPromptBar';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { useChatLogic } from './hooks/useChatLogic';

export default function App() {
  // Global State
  const { conversations, setConversations, currentConvId, setCurrentConvId, loadConversations } = useChatStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  // Local State
  const [memories, setMemories] = useState<any[]>([]);
  const [isAuthRequired, setIsAuthRequired] = useState(false);

  useEffect(() => {
    const handleAuthRequired = () => setIsAuthRequired(true);
    window.addEventListener('webui-auth-required', handleAuthRequired);
    return () => window.removeEventListener('webui-auth-required', handleAuthRequired);
  }, []);

  // Settings
  const { apiKey, model, temperature, isThinkingMode } = useSettingStore(s => s.llmConfig);
  const { theme, globalTheme, bgImage, bgImages, bgImageInterval } = useSettingStore(s => s.uiConfig);
  const { useTieredMemory } = useSettingStore(s => s.memoryConfig);
  const { isPaintingEnabled, paintingProvider, paintingApiKey } = useSettingStore(s => s.paintingConfig);
  const { promptTemplates, storyTemplates, quickGenerate } = useSettingStore(s => s.systemConfig);
  const { loadSettings, setSettings } = useSettingStore();

  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  useEffect(() => {
    if (!bgImages || bgImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % bgImages.length);
    }, (bgImageInterval || 300) * 1000);
    return () => clearInterval(interval);
  }, [bgImages, bgImageInterval]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [theme]);

  const activeBgImage = bgImages && bgImages.length > 0 
    ? bgImages[currentBgIndex] 
    : bgImage;

  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState("");
  
  // Story Mode & Painting State
  const { 
    isStoryMode, setIsStoryMode, isTransitioning, setIsTransitioning, 
    isExitingStoryMode, setIsExitingStoryMode 
  } = useStoryStore();
  const { isStorySetupOpen, setStorySetupOpen, isPromptDialogOpen, setPromptDialogOpen, setSettingsOpen, isStoryDiscussionOpen, setStoryDiscussionOpen, isMemoryOpen, setMemoryOpen, isImageGalleryOpen } = useUIStore();
  const [extractedPrompt, setExtractedPrompt] = useState("");
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);
  
  const {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    handleSendMessage,
    handleStop,
    discussionMessages,
    discussionInput,
    setDiscussionInput,
    handleSendDiscussionMessage,
    isDiscussionLoading,
    nextPlotGuidance,
    setNextPlotGuidance,
    executeImageGeneration,
    handleUpdateSystemPrompt,
    handleScroll,
    chatContainerRef,
    messagesEndRef,
    handleNewChat,
    systemPrompt,
    setSystemPrompt,
    handleToggleThinkingMode,
    sessionDiscussionCost
  } = useChatLogic();

  useEffect(() => {
    loadConversations();
    loadSettings();
  }, []);

  const handleOpenMemory = async () => {
    setMemoryOpen(true);
    try {
      if (!currentConvId) {
        setMemories([]);
        return;
      }
      const currentConv = conversations.find(c => c.id === currentConvId);
      const data = await api.getMemories(currentConv?.title, currentConvId);
      setMemories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const totalTokens = messages.reduce((acc, m) => acc + (m.tokens || 0) + (m.memory_tokens || 0) + (m.painting_tokens || 0), 0);
  const totalCost = messages.reduce((acc, m) => acc + (m.cost || 0) + (m.memory_cost || 0) + (m.painting_cost || 0), 0) + sessionDiscussionCost;
  const totalMemoryCost = messages.reduce((acc, m) => acc + (m.memory_cost || 0), 0);
  const totalMemoryTokens = messages.reduce((acc, m) => acc + (m.memory_tokens || 0), 0);

  if (isAuthRequired) {
    return <AuthScreen setIsAuthRequired={setIsAuthRequired} api={api} />;
  }

  return (
    <div className={cn(
      "flex h-[100dvh] w-full overflow-hidden font-sans transition-colors duration-300 antialiased",
      theme === 'dark' ? "bg-[#0A0A0A] text-white" : "bg-[#F8F9FA] text-[#1A1A1A]"
    )} style={{ textRendering: 'optimizeLegibility' }}>
      {/* Background Image Layer */}
      {activeBgImage && (
        <motion.div 
          key={activeBgImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundImage: `url(${activeBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      )}
      
      <div className="relative z-10 flex h-[100dvh] w-full">
        <Sidebar 
          handleNewChat={handleNewChat} 
        />

        {/* Main Content */}
        <main className={cn(
          "flex-1 flex flex-col min-w-0 relative transition-colors duration-300",
          theme === 'dark' ? "bg-[#0A0A0A]/80 backdrop-blur-sm" : "bg-white/80 backdrop-blur-sm"
        )}>
        {/* Header */}
        <Header
          currentConvId={currentConvId}
          totalTokens={totalTokens}
          totalCost={totalCost}
          totalMemoryCost={totalMemoryCost}
          handleOpenMemory={handleOpenMemory}
        />

        {/* Chat Area */}
        <MessageList 
          messages={messages}
          setMessages={setMessages}
          chatContainerRef={chatContainerRef}
          handleScroll={handleScroll}
          messagesEndRef={messagesEndRef}
          setStoryDiscussionOpen={setStoryDiscussionOpen}
          setTargetMessageId={setTargetMessageId}
          setExtractedPrompt={setExtractedPrompt}
          setPromptDialogOpen={setPromptDialogOpen}
          api={api}
        />

        {/* System Prompt Bar (AI设定) / Story Destiny Line */}
        <AnimatePresence>
          {isEditingSystemPrompt && (
            <SystemPromptBar
              systemPrompt={systemPrompt}
              isEditingSystemPrompt={isEditingSystemPrompt}
              setIsEditingSystemPrompt={setIsEditingSystemPrompt}
              draftSystemPrompt={draftSystemPrompt}
              setDraftSystemPrompt={setDraftSystemPrompt}
              handleUpdateSystemPrompt={handleUpdateSystemPrompt}
            />
          )}
        </AnimatePresence>

        {/* Input Area */}
        <ChatInput 
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          handleSendMessage={handleSendMessage}
          handleStop={handleStop}
          isThinkingMode={isThinkingMode}
          toggleThinkingMode={handleToggleThinkingMode}
          isEditingSystemPrompt={isEditingSystemPrompt}
          setIsEditingSystemPrompt={setIsEditingSystemPrompt}
        />

        {/* Memory Modal */}
        <AnimatePresence>
          {isMemoryOpen && <MemoryModal memories={memories} totalMemoryTokens={totalMemoryTokens} totalMemoryCost={totalMemoryCost} totalMessages={messages.length} />}
        </AnimatePresence>

        {/* Settings Modal */}
        <SettingsModal />

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
                  } else if (isExitingStoryMode) {
                    setIsExitingStoryMode(false);
                    setIsStoryMode(false);
                    setIsEditingSystemPrompt(false);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>



        {/* Story Discussion Modal */}
        <AnimatePresence>
          {isStoryDiscussionOpen && (
            <StoryDiscussionModal
              nextPlotGuidance={nextPlotGuidance}
              setNextPlotGuidance={setNextPlotGuidance}
              discussionMessages={discussionMessages}
              discussionInput={discussionInput}
              setDiscussionInput={setDiscussionInput}
              handleSendDiscussionMessage={handleSendDiscussionMessage}
              isDiscussionLoading={isDiscussionLoading}
            />
          )}
        </AnimatePresence>

        {/* Prompt Confirmation Dialog */}
        <AnimatePresence>
          {isPromptDialogOpen && (
            <PromptConfirmationDialog
              extractedPrompt={extractedPrompt}
              setExtractedPrompt={setExtractedPrompt}
              targetMessageId={targetMessageId}
              messages={messages}
              setMessages={setMessages}
              executeImageGeneration={executeImageGeneration}
            />
          )}
        </AnimatePresence>

        {/* Image Gallery Modal */}
        <AnimatePresence>
          {isImageGalleryOpen && (
            <ImageGalleryModal messages={messages} />
          )}
        </AnimatePresence>
      </main>
      </div>
    </div>
  );
}
