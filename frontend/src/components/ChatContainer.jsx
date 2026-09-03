import React, { useState, useEffect, useRef, Component } from 'react';
import { PanelLeftOpen, Rocket, FileText, Fingerprint, User, Copy, Check, Edit3, RefreshCw, ChevronLeft, ChevronRight, Volume2, Fingerprint as FingerprintIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MessageInput from './MessageInput';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-red-500 p-4 border border-red-500 rounded bg-red-500/10">Render error: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

const ChatContainer = ({ 
  activeChat, createNewChat, setAttachedFilesForChat, updateChatActivity, handleSendMessage,
  editMessageAndResubmit, regenerateResponse, switchVariant, isSidebarOpen, setIsSidebarOpen,
  isGenerating, stopGeneration, selectedModel, setSelectedModel, selectedVibe, setSelectedVibe, theme
}) => {
  const [greeting, setGreeting] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageText, setEditMessageText] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const editInputRef = useRef(null);
  const bottomRef = useRef(null);

  const greetingsList = [
    "Neural link established. Accessing timeline data...",
    "Clone initialized. Awaiting your inquiry.",
    "First principles matrix loaded. What shall we deconstruct?",
    "I am bound to the timeline of Elon Musk. Ask me anything.",
    "Ready to simulate responses based on historical data. Go ahead.",
    "Digital twin online. What is our objective today?",
  ];

  useEffect(() => {
    setGreeting(greetingsList[Math.floor(Math.random() * greetingsList.length)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id]);

  const isChatActive = activeChat && (activeChat.messages.length > 0);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat?.messages, isGenerating]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const startEditing = (id, text) => {
    setEditingMessageId(id);
    setEditMessageText(text);
  };

  const handleEditSubmit = (msgId) => {
    if (editMessageText.trim() && activeChat) {
      editMessageAndResubmit(activeChat.id, msgId, editMessageText);
    }
    setEditingMessageId(null);
    setEditMessageText('');
  };

  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      const textLength = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(textLength, textLength);
    }
  }, [editingMessageId]);

  const sanitizeForSpeech = (text) => {
    return text.replace(/#+\s/g, '').replace(/(\*\*|\*|__|_)/g, '').replace(/\[Source:.*?\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/```[\s\S]*?```/g, '').replace(/`/g, '').replace(/\n/g, '. ');
  };

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      else window.speechSynthesis.speak(new SpeechSynthesisUtterance(sanitizeForSpeech(text)));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative min-w-[320px] bg-main text-tx-primary transition-colors">
      
      {/* Top Toggle for Sidebar */}
      <div className="absolute top-4 left-4 z-10">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            aria-label="Open sidebar"
            aria-expanded="false"
            className="p-2 text-tx-muted hover:text-tx-primary hover:bg-hover rounded-lg transition-colors bg-panel/50 backdrop-blur-md border border-bd-subtle shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <PanelLeftOpen size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      <main className="flex-1 overflow-y-auto relative flex flex-col items-center" aria-live="polite" role="log">
        
        {/* Landing State */}
        <div className={`w-full max-w-3xl px-4 flex flex-col justify-center min-h-full transition-all duration-700 ease-in-out ${isChatActive ? 'hidden' : 'flex'}`}>
          <div className="flex flex-col items-center text-center animate-fade-in-up">
            <div className="w-20 h-20 rounded-full border border-accent/30 bg-accent/5 flex items-center justify-center mb-8 relative">
               <div className="absolute inset-0 rounded-full bg-accent/20 animate-pulse-slow blur-xl"></div>
               <FingerprintIcon size={40} strokeWidth={1} className="text-accent" />
            </div>
            
            <h1 className="text-2xl md:text-4xl font-light font-spectral tracking-wide mb-3 text-tx-primary leading-tight max-w-2xl">
              {greeting}
            </h1>
            
            <div className="flex items-center gap-2 bg-panel/50 backdrop-blur-md border border-bd-subtle rounded-xl p-3 mb-12 max-w-lg shadow-sm">
              <FingerprintIcon size={24} className="text-accent shrink-0" />
              <p className="text-sm font-sans text-tx-secondary text-left leading-relaxed">
                WEB3BUILDERS Engine can synthesize a digital clone of <span className="font-semibold text-tx-primary">any person</span> using their historical timeline data. For this demonstration, you are interacting with the persona of <span className="font-semibold text-accent">Elon Musk</span>.
              </p>
            </div>
            
            <div className="w-full">
              <MessageInput 
                activeChat={activeChat} createNewChat={createNewChat} setAttachedFilesForChat={setAttachedFilesForChat}
                updateChatActivity={updateChatActivity} handleSendMessage={handleSendMessage} isChatActive={false}
                isGenerating={isGenerating} stopGeneration={stopGeneration} selectedModel={selectedModel}
                setSelectedModel={setSelectedModel} selectedVibe={selectedVibe} setSelectedVibe={setSelectedVibe}
              />
            </div>
          </div>
        </div>

        {/* Active Chat Stream */}
        <div className={`w-full max-w-4xl px-4 py-8 flex-col gap-6 transition-opacity duration-700 ${isChatActive ? 'flex' : 'hidden'}`}>
          {activeChat?.messages.map((msg, i) => (
            <div key={i} className={`group w-full flex flex-col md:flex-row gap-4 animate-fade-in-up ${msg.role === 'user' ? 'opacity-90' : 'opacity-100'}`}>
              
              {/* Avatar */}
              <div className="flex-shrink-0 pt-1 hidden md:block">
                {msg.role === 'user' ? (
                  <div className="w-10 h-10 rounded-full bg-panel border border-bd-strong flex items-center justify-center text-tx-muted shadow-sm">
                    <User size={18} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/40 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(6,182,212,0.15)] relative">
                    <Fingerprint size={20} strokeWidth={1.5} />
                    {isGenerating && i === activeChat.messages.length - 1 && (
                       <div className="absolute inset-0 rounded-full border border-accent animate-ping opacity-30"></div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Header */}
              <div className="flex items-center gap-2 md:hidden">
                {msg.role === 'user' ? (
                  <div className="w-6 h-6 rounded-full bg-panel border border-bd-strong flex items-center justify-center text-tx-muted"><User size={12} /></div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/40 flex items-center justify-center text-accent"><Fingerprint size={12} /></div>
                )}
                <span className="text-xs font-semibold tracking-wider text-tx-muted uppercase">{msg.role === 'user' ? 'You' : 'Elon Musk [Clone]'}</span>
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0 bg-transparent rounded-2xl md:pt-0">
                
                {/* Header (Desktop) */}
                <div className="hidden md:flex items-center mb-2">
                  <span className="text-xs font-semibold tracking-widest text-tx-muted uppercase">
                    {msg.role === 'user' ? 'You' : 'Elon Musk [Clone]'}
                  </span>
                </div>

                {/* Attachments */}
                {msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {msg.files.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-panel border border-bd-subtle px-3 py-1.5 rounded-lg text-xs font-medium text-tx-secondary shadow-sm">
                        <FileText size={14} className="text-tx-muted" />
                        <span className="truncate max-w-[200px]">{f.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text Area */}
                {editingMessageId === msg.id ? (
                  <div className="flex flex-col gap-3">
                    <textarea 
                      ref={editInputRef} value={editMessageText} onChange={(e) => setEditMessageText(e.target.value)}
                      rows={Math.max(3, editMessageText.split('\n').length)}
                      className="w-full bg-input border border-accent/50 rounded-xl focus:ring-1 focus:ring-accent/50 resize-none p-4 text-[15px] leading-relaxed text-tx-primary shadow-inner outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingMessageId(null)} className="px-4 py-2 text-xs font-medium rounded-lg bg-panel border border-bd-strong hover:bg-hover text-tx-secondary transition-colors">Cancel</button>
                      <button onClick={() => handleEditSubmit(msg.id)} className="px-4 py-2 text-xs font-medium rounded-lg bg-accent text-accent-text hover:bg-accent-hover transition-colors shadow-md">Re-process</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-tx-primary">
                    {!msg.text && msg.role === 'assistant' && (
                      <div className="py-2">
                        {isGenerating ? (
                          <span className="animate-pulse text-accent font-mono text-sm flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-accent inline-block animate-bounce"></span> Processing neural pathways...
                          </span>
                        ) : (
                          <span className="italic text-sm text-red-400">Stream interrupted.</span>
                        )}
                      </div>
                    )}
                    {msg.text && (
                      <ErrorBoundary>
                        <div className={`prose prose-p:leading-relaxed prose-pre:bg-input prose-pre:border prose-pre:border-bd-subtle prose-pre:text-tx-primary max-w-none text-[15px] ${theme === 'dark' ? 'prose-invert' : ''}`}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                      </ErrorBoundary>
                    )}
                  </div>
                )}
                
                {/* Actions Toolbar */}
                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                  {msg.role === 'user' && !editingMessageId && (
                    <button onClick={() => startEditing(msg.id, msg.text)} className="p-1.5 text-tx-muted hover:text-accent rounded-md bg-panel/50 hover:bg-panel border border-transparent hover:border-bd-subtle transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" title="Edit Parameters" aria-label="Edit message">
                      <Edit3 size={14} aria-hidden="true" />
                    </button>
                  )}

                  {msg.role === 'assistant' && msg.variants && msg.variants.length > 1 && (
                    <div className="flex items-center gap-1 mr-2 bg-panel/50 border border-bd-subtle rounded-md px-1 py-0.5 text-xs text-tx-muted font-medium select-none">
                      <button onClick={() => switchVariant(activeChat.id, msg.id, -1)} disabled={msg.activeVariantIndex === 0} className="p-1 hover:text-tx-primary disabled:opacity-30 disabled:hover:text-tx-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent" aria-label="Previous variant">
                        <ChevronLeft size={14} aria-hidden="true" />
                      </button>
                      <span className="px-1" aria-label={`Variant ${msg.activeVariantIndex + 1} of ${msg.variants.length}`}>{msg.activeVariantIndex + 1} / {msg.variants.length}</span>
                      <button onClick={() => switchVariant(activeChat.id, msg.id, 1)} disabled={msg.activeVariantIndex === msg.variants.length - 1} className="p-1 hover:text-tx-primary disabled:opacity-30 disabled:hover:text-tx-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent" aria-label="Next variant">
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  
                  {msg.text && msg.role === 'assistant' && !isGenerating && (
                    <button onClick={() => regenerateResponse(activeChat.id, msg.id)} className="p-1.5 text-tx-muted hover:text-accent rounded-md bg-panel/50 hover:bg-panel border border-transparent hover:border-bd-subtle transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" title="Regenerate Output" aria-label="Regenerate response">
                      <RefreshCw size={14} aria-hidden="true" />
                    </button>
                  )}

                  {msg.text && msg.role === 'assistant' && !isGenerating && (
                    <button onClick={() => handleSpeak(msg.text)} className="p-1.5 text-tx-muted hover:text-accent rounded-md bg-panel/50 hover:bg-panel border border-transparent hover:border-bd-subtle transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" title="Synthesize Voice" aria-label="Read aloud">
                      <Volume2 size={14} aria-hidden="true" />
                    </button>
                  )}

                  {msg.text && (
                    <button onClick={() => handleCopy(msg.id, msg.text)} className="p-1.5 text-tx-muted hover:text-accent rounded-md bg-panel/50 hover:bg-panel border border-transparent hover:border-bd-subtle transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" title="Copy Output" aria-label={copiedMessageId === msg.id ? "Copied" : "Copy message"}>
                      {copiedMessageId === msg.id ? <Check size={14} className="text-green-500" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Spacer for bottom input */}
          <div ref={bottomRef} className="h-4" />
        </div>
      </main>

      {/* Docked Input */}
      <div className={`w-full flex justify-center bg-gradient-to-t from-main via-main to-transparent relative z-20 transition-all duration-700 ${isChatActive ? 'opacity-100 translate-y-0 pb-6 pt-4' : 'opacity-0 translate-y-10 pointer-events-none absolute bottom-0 left-0 right-0'}`}>
          <div className="w-full max-w-3xl px-4">
             <MessageInput 
                activeChat={activeChat} createNewChat={createNewChat} setAttachedFilesForChat={setAttachedFilesForChat}
                updateChatActivity={updateChatActivity} handleSendMessage={handleSendMessage} isChatActive={true}
                isGenerating={isGenerating} stopGeneration={stopGeneration} selectedModel={selectedModel}
                setSelectedModel={setSelectedModel} selectedVibe={selectedVibe} setSelectedVibe={setSelectedVibe}
              />
          </div>
      </div>
    </div>
  );
};

export default ChatContainer;
