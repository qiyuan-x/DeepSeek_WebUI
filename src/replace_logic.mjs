import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');

const startStr = '  // Local State';
const endStr = '  if (isAuthRequired) {';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + `  // Local State
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [isAuthRequired, setIsAuthRequired] = useState(false);

  useEffect(() => {
    const handleAuthRequired = () => setIsAuthRequired(true);
    window.addEventListener('webui-auth-required', handleAuthRequired);
    return () => window.removeEventListener('webui-auth-required', handleAuthRequired);
  }, []);

  // Settings
  const { 
    apiKey, model, temperature, theme, globalTheme, bgImage, 
    promptTemplates, storyTemplates, useTieredMemory, isPaintingEnabled, 
    paintingProvider, paintingApiKey, quickGenerate, loadSettings, setSettings 
  } = useSettingStore();

  const isThinkingMode = model === 'deepseek-reasoner';
  const toggleThinkingMode = () => {
    const newModel = isThinkingMode ? 'deepseek-chat' : 'deepseek-reasoner';
    setSettings({ model: newModel });
    if (currentConvId) {
      api.updateConversation(currentConvId, { model: newModel }).then(() => loadConversations());
    }
  };

  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState("");
  
  // Story Mode & Painting State
  const { 
    isStoryMode, setIsStoryMode, isTransitioning, setIsTransitioning, 
    isExitingStoryMode, setIsExitingStoryMode 
  } = useStoryStore();
  const { isStorySetupOpen, setStorySetupOpen, isPromptDialogOpen, setPromptDialogOpen, setSettingsOpen, isStoryDiscussionOpen, setIsStoryDiscussionOpen } = useUIStore();
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
    sessionDiscussionCost
  } = useChatLogic();

  useEffect(() => {
    loadConversations();
    loadSettings();
  }, []);

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

  const totalTokens = messages.reduce((acc, m) => acc + (m.tokens || 0), 0);
  const totalCost = messages.reduce((acc, m) => acc + (m.cost || 0), 0) + sessionDiscussionCost;
  const totalMemoryCost = messages.reduce((acc, m) => acc + (m.memory_cost || 0), 0);
  const totalMemoryTokens = messages.reduce((acc, m) => acc + (m.memory_tokens || 0), 0);

` + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Successfully replaced logic');
} else {
  console.log('Could not find start or end string');
}
