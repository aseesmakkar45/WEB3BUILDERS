import React, { useRef, useEffect, useState } from 'react';
import { Paperclip, Mic, ArrowUp, X, Rocket, Zap, Square, Sparkles, Brain } from 'lucide-react';
import LightboxModal from './LightboxModal';
import ModelSelector from './ModelSelector';
import VibeSelector from './VibeSelector';

const MessageInput = ({ 
  activeChat, createNewChat, setAttachedFilesForChat, updateChatActivity, handleSendMessage, 
  isChatActive, isGenerating, stopGeneration, selectedModel, setSelectedModel, selectedVibe, setSelectedVibe 
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const attachedFiles = activeChat?.attachedFiles || [];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 300)}px`;
    }
  }, [text]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length > 1) return;
      if (textareaRef.current) textareaRef.current.focus();
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSubmit = () => {
    if (text.trim() || attachedFiles.length > 0) {
      handleSendMessage(text, attachedFiles);
      setText('');
    }
  };

  const handlePillClick = (prompt) => {
    setText(prompt);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const updateFiles = (newFiles) => {
    let targetChatId = activeChat?.id || createNewChat();
    setAttachedFilesForChat(targetChatId, [...(activeChat?.attachedFiles || []), ...newFiles]);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      updateFiles(Array.from(e.target.files));
      e.target.value = null;
    }
  };

  const removeFile = (indexToRemove, e) => {
    e.stopPropagation();
    if (activeChat) {
      setAttachedFilesForChat(activeChat.id, attachedFiles.filter((_, idx) => idx !== indexToRemove));
    }
  };

  const handleFileClick = (file) => {
    if (file.type && file.type.startsWith('image/')) {
      setActiveLightboxImage({ url: URL.createObjectURL(file), name: file.name });
    } else {
      const objectUrl = URL.createObjectURL(file);
      const tempLink = document.createElement('a');
      tempLink.href = objectUrl;
      tempLink.download = file.name || 'downloaded_file';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `voice_query_${Date.now()}.webm`, { type: 'audio/webm' });
          updateFiles([audioFile]);
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Microphone access denied:', err);
        alert('Could not access microphone. Please ensure microphone permissions are granted.');
      }
    }
  };

  const hasContent = text.trim().length > 0 || attachedFiles.length > 0;

  return (
    <div className="w-full">
      {activeLightboxImage && (
        <LightboxModal 
          imageUrl={activeLightboxImage.url} fileName={activeLightboxImage.name} 
          onClose={() => { URL.revokeObjectURL(activeLightboxImage.url); setActiveLightboxImage(null); }} 
        />
      )}

      {/* Input Container */}
      <div className="bg-panel/80 backdrop-blur-xl rounded-2xl shadow-lg border border-bd-subtle p-2 transition-all duration-300 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)] focus-within:border-accent/50">
        
        {/* Attached Files Chips */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border-b border-bd-subtle mb-1">
            {attachedFiles.map((file, idx) => (
              <div key={idx} onClick={() => handleFileClick(file)} className="flex items-center gap-1.5 bg-input border border-bd-strong rounded-lg px-2.5 py-1 text-xs text-tx-secondary hover:bg-hover transition-colors cursor-pointer group">
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button onClick={(e) => removeFile(idx, e)} className="text-tx-muted hover:text-red-400 rounded-full p-0.5"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 relative">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
          
          <button onClick={() => fileInputRef.current?.click()} className="p-3 text-tx-muted hover:text-accent rounded-full hover:bg-accent/10 transition-colors shrink-0 mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" title="Attach context (PDF, Code, Data)" aria-label="Attach context">
            <Paperclip size={20} aria-hidden="true" />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Interrogate neural link..."
            aria-label="Message input"
            rows={1}
            className="flex-1 max-h-[300px] min-h-[44px] bg-transparent resize-none border-none focus:outline-none focus:ring-0 outline-none text-tx-primary placeholder-tx-muted py-3 px-2 overflow-y-auto font-sans text-[15px] focus-visible:ring-0"
          />

          <div className="flex items-center gap-2 shrink-0 pr-1 pb-1">
            <div className="hidden sm:flex items-center gap-1">
              <VibeSelector selectedVibe={selectedVibe} setSelectedVibe={setSelectedVibe} />
              <ModelSelector selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
            </div>

            {(!hasContent || isRecording) && !isGenerating && (
              <button onClick={handleMicClick} className={`p-3 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${isRecording ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-input text-tx-muted hover:text-accent hover:bg-accent/10 focus-visible:ring-accent'}`} title="Voice Interrogation" aria-label="Voice input">
                <Mic size={18} className={isRecording ? 'animate-pulse text-red-500' : ''} aria-hidden="true" />
              </button>
            )}
            
            {hasContent && !isRecording && !isGenerating && (
              <button onClick={handleSubmit} className="p-3 rounded-full transition-all bg-accent text-accent-text hover:bg-accent-hover shadow-md hover:shadow-lg transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent focus-visible:ring-offset-main" aria-label="Send message">
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            )}

            {isGenerating && (
              <button onClick={stopGeneration} className="p-3 rounded-full transition-all bg-accent text-accent-text hover:bg-accent-hover shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent focus-visible:ring-offset-main" title="Abort Execution" aria-label="Stop generation">
                <Square size={18} className="fill-current" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile selectors row */}
        <div className="flex sm:hidden items-center justify-between gap-2 p-2 border-t border-bd-subtle mt-2">
          <VibeSelector selectedVibe={selectedVibe} setSelectedVibe={setSelectedVibe} />
          <ModelSelector selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
        </div>
      </div>
      
      {!isChatActive && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8 animate-fade-in-up">
          <button onClick={() => handlePillClick("What are your thoughts on settling Mars?")} className="bg-panel border border-bd-subtle hover:border-accent/50 rounded-full px-4 py-2 text-xs text-tx-secondary font-medium transition-all hover:bg-accent/5 shadow-sm flex items-center gap-2">
            <Rocket size={14} className="text-accent" /> Mars Colonization
          </button>
          <button onClick={() => handlePillClick("How would you optimize a pizza delivery chain using first principles?")} className="bg-panel border border-bd-subtle hover:border-accent/50 rounded-full px-4 py-2 text-xs text-tx-secondary font-medium transition-all hover:bg-accent/5 shadow-sm flex items-center gap-2">
            <Zap size={14} className="text-yellow-500" /> First Principles Pizza
          </button>
          <button onClick={() => handlePillClick("Are we living in a computer simulation?")} className="bg-panel border border-bd-subtle hover:border-accent/50 rounded-full px-4 py-2 text-xs text-tx-secondary font-medium transition-all hover:bg-accent/5 shadow-sm flex items-center gap-2">
            <Brain size={14} className="text-purple-500" /> Simulation Theory
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
