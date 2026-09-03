import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatContainer from './components/ChatContainer';
import { PlusCircle } from 'lucide-react';

function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('legalAiSelectedModel') || "Gemma 4 26B MoE";
  });
  
  useEffect(() => {
    localStorage.setItem('legalAiSelectedModel', selectedModel);
  }, [selectedModel]);

  const [selectedVibe, setSelectedVibe] = useState(() => {
    return localStorage.getItem('legalAiSelectedVibe') || "x_mode";
  });
  
  useEffect(() => {
    localStorage.setItem('legalAiSelectedVibe', selectedVibe);
  }, [selectedVibe]);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [generatingChats, setGeneratingChats] = useState({});
  const abortControllersRef = useRef({});

  // Mobile Detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Theme Management
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('appTheme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('appTheme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const stopGeneration = (chatId) => {
    if (abortControllersRef.current[chatId]) {
      abortControllersRef.current[chatId].abort();
      setGeneratingChats(prev => ({ ...prev, [chatId]: false }));
      delete abortControllersRef.current[chatId];
    }
  };

  // Derive active chat
  const activeChat = chats.find(c => c.id === activeChatId) || null;

  // Dynamic Browser Title
  useEffect(() => {
    if (activeChat) {
      document.title = `${activeChat.title} - PersonaTwin.ai`;
    } else {
      document.title = "New Chat - PersonaTwin.ai";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.title]);

  // Chat Management Methods
  const createNewChat = () => {
    const newChat = {
      id: (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Date.now().toString(),
      title: 'New Chat',
      messages: [],
      attachedFiles: [],
      isPinned: false,
      createdAt: Date.now(),
      lastUsedTime: Date.now()
    };
    setChats(prev => [...prev, newChat]);
    setActiveChatId(newChat.id);
    return newChat.id;
  };

  const deleteChat = (id) => {
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null); // Will default to empty state
    }
  };

  const renameChat = (id, newTitle) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const pinChat = (id) => {
    setChats(prev => {
      const chatToPin = prev.find(c => c.id === id);
      if (!chatToPin) return prev;
      
      if (!chatToPin.isPinned) {
        const currentPins = prev.filter(c => c.isPinned).length;
        if (currentPins >= 5) {
          alert('You can only pin up to 5 chats at a time.');
          return prev;
        }
      }
      
      return prev.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c);
    });
  };

  const setAttachedFilesForChat = (id, files) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, attachedFiles: files } : c));
  };

  const updateChatActivity = (id) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, lastUsedTime: Date.now() } : c));
  };

  const callStreamAPI = async (chatId, text, files, assistantMessageId) => {
    setGeneratingChats(prev => ({ ...prev, [chatId]: true }));
    abortControllersRef.current[chatId] = new AbortController();

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('chatId', chatId);
      formData.append('model_requested', selectedModel);
      formData.append('vibe_mode', selectedVibe);
      if (files && files.length > 0) {
        files.forEach(f => formData.append('files', f));
      }

      const response = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        body: formData,
        signal: abortControllersRef.current[chatId].signal
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("[Stream Engine] Connection closed cleanly by server.");
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        console.log("[Stream Engine] Chunk received over the wire:", chunk);
        
        const parts = chunk.split('data: ');
        
        for (let i = 1; i < parts.length; i++) {
          let data = parts[i].split('\n\n')[0];
          if (data === '[DONE]') {
            console.log("[Stream Engine] Connection closed cleanly by server.");
            return;
          }
          
          if (data === '\\n') data = '\n';
          currentText += data;
          
          setChats(prev => prev.map(c => {
            if (c.id === chatId) {
              return {
                ...c,
                messages: c.messages.map(m => {
                  if (m.id === assistantMessageId) {
                    if (m.variants !== undefined) {
                      const newVariants = [...m.variants];
                      newVariants[m.activeVariantIndex] = currentText;
                      return { ...m, text: currentText, variants: newVariants };
                    }
                    return { ...m, text: currentText };
                  }
                  return m;
                })
              };
            }
            return c;
          }));
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("[Stream Engine] Stream aborted by user.");
      } else {
        console.error("[Stream Engine] Critical network streaming failure:", err);
      }
    } finally {
      setGeneratingChats(prev => ({ ...prev, [chatId]: false }));
      delete abortControllersRef.current[chatId];
    }
  };

  const handleSendMessage = (text, files) => {
    let targetChatId = activeChatId;
    if (!targetChatId) {
      targetChatId = createNewChat();
    }
    
    const userMessageId = (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Date.now().toString() + '-u';
    const assistantMessageId = (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Date.now().toString() + '-a';
    
    const userMessage = { id: userMessageId, role: 'user', text, files };
    const assistantMessage = { id: assistantMessageId, role: 'assistant', text: '', variants: [''], activeVariantIndex: 0 };
    
    setChats(prev => prev.map(c => {
      if (c.id === targetChatId) {
        const newTitle = c.title === 'New Chat' ? (text.slice(0, 30) + (text.length > 30 ? '...' : '')) || 'Chat' : c.title;
        return { 
          ...c, 
          title: newTitle,
          messages: [...c.messages, userMessage, assistantMessage],
          lastUsedTime: Date.now(),
          attachedFiles: []
        };
      }
      return c;
    }));
    
    setTimeout(() => {
      callStreamAPI(targetChatId, text, files, assistantMessageId);
    }, 600);
  };

  const editMessageAndResubmit = (chatId, messageId, newText) => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        const msgIndex = c.messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return c;
        
        // Truncate messages after this point
        const newMessages = c.messages.slice(0, msgIndex + 1);
        newMessages[msgIndex] = { ...newMessages[msgIndex], text: newText };
        
        // Setup new assistant message
        const assistantMessageId = (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : Date.now().toString() + '-a';
        const assistantMessage = { id: assistantMessageId, role: 'assistant', text: '', variants: [''], activeVariantIndex: 0 };
        
        // Call API
        setTimeout(() => {
          callStreamAPI(chatId, newText, newMessages[msgIndex].files || [], assistantMessageId);
        }, 300);

        return { 
          ...c, 
          messages: [...newMessages, assistantMessage],
          lastUsedTime: Date.now()
        };
      }
      return c;
    }));
  };

  const regenerateResponse = (chatId, assistantMessageId) => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        const msgIndex = c.messages.findIndex(m => m.id === assistantMessageId);
        if (msgIndex === -1 || msgIndex === 0) return c; // Cannot regenerate if no user prompt precedes it
        
        const assistantMsg = c.messages[msgIndex];
        const userMsg = c.messages[msgIndex - 1]; 
        
        const newVariants = [...(assistantMsg.variants || [assistantMsg.text]), ''];
        const newIndex = newVariants.length - 1;
        
        // Truncate messages after this regenerated message to fork the history
        const newMessages = c.messages.slice(0, msgIndex + 1);
        newMessages[msgIndex] = { ...assistantMsg, variants: newVariants, activeVariantIndex: newIndex, text: '' };

        setTimeout(() => {
          callStreamAPI(chatId, userMsg.text, userMsg.files || [], assistantMessageId);
        }, 300);

        return { ...c, messages: newMessages, lastUsedTime: Date.now() };
      }
      return c;
    }));
  };

  const switchVariant = (chatId, assistantMessageId, direction) => {
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          messages: c.messages.map(m => {
            if (m.id === assistantMessageId && m.variants) {
              const newIndex = m.activeVariantIndex + direction;
              if (newIndex >= 0 && newIndex < m.variants.length) {
                return { ...m, activeVariantIndex: newIndex, text: m.variants[newIndex] };
              }
            }
            return m;
          })
        };
      }
      return c;
    }));
  };

  // Drag and Drop Handling
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're leaving the window, not just a child element
    if (e.clientX === 0 || e.clientY === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      
      let targetChatId = activeChatId;
      if (!targetChatId) {
        targetChatId = createNewChat();
      }

      setChats(prev => prev.map(c => {
        if (c.id === targetChatId) {
          return { ...c, attachedFiles: [...c.attachedFiles, ...droppedFiles], lastUsedTime: Date.now() };
        }
        return c;
      }));
    }
  }, [activeChatId]);

  useEffect(() => {
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragOver, handleDragLeave, handleDrop]);

  return (
    <div className="h-screen w-screen flex bg-main overflow-hidden font-sans relative">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        chats={chats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        createNewChat={createNewChat}
        deleteChat={deleteChat}
        renameChat={renameChat}
        pinChat={pinChat}
        theme={theme}
        toggleTheme={toggleTheme}
        isMobile={isMobile}
      />
      <ChatContainer 
        activeChat={activeChat}
        createNewChat={createNewChat}
        setAttachedFilesForChat={setAttachedFilesForChat}
        updateChatActivity={updateChatActivity}
        handleSendMessage={handleSendMessage}
        editMessageAndResubmit={editMessageAndResubmit}
        regenerateResponse={regenerateResponse}
        switchVariant={switchVariant}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isGenerating={generatingChats[activeChatId] || false}
        stopGeneration={() => stopGeneration(activeChatId)}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedVibe={selectedVibe}
        setSelectedVibe={setSelectedVibe}
        theme={theme}
        isMobile={isMobile}
      />

      {/* Global Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-main/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-4 border-dashed border-accent/40 m-4 rounded-xl pointer-events-none animate-fade-in">
          <div className="flex flex-col items-center animate-scale-in">
            <PlusCircle size={64} className="text-accent mb-4 animate-bounce" />
            <h2 className="text-3xl font-spectral font-medium text-tx-primary">Drop your files to attach to this neural link</h2>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
