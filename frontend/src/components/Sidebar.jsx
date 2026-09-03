import React, { useState, useEffect, useRef } from 'react';
import { PanelLeftClose, Plus, Pin, Trash2, Edit3, Search, Activity, Cpu, Moon, Sun, ShieldAlert, Fingerprint } from 'lucide-react';

const Sidebar = ({ 
  isOpen, setIsOpen, chats, activeChatId, setActiveChatId, 
  createNewChat, deleteChat, renameChat, pinChat, theme, toggleTheme, isMobile
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingChatId]);

  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 260) newWidth = 260;
      if (newWidth > 450) newWidth = 450;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) setIsResizing(false);
    };

    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isMobile]);

  // Accessibility: close on escape when mobile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobile && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isOpen, setIsOpen]);

  const handleRenameSubmit = (id) => {
    if (editTitle.trim()) {
      renameChat(id, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const pinnedChats = chats.filter(c => c.isPinned && c.title.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.lastUsedTime - a.lastUsedTime);
  const unpinnedChats = chats.filter(c => !c.isPinned && c.title.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => b.lastUsedTime - a.lastUsedTime);

  const renderChatItem = (chat) => {
    const isActive = activeChatId === chat.id;
    const isEditing = editingChatId === chat.id;

    return (
      <button 
        key={chat.id} 
        onClick={() => { 
          if (!isEditing) {
            setActiveChatId(chat.id);
            if (isMobile) setIsOpen(false);
          }
        }}
        aria-label={`Switch to chat ${chat.title}`}
        aria-current={isActive ? 'page' : undefined}
        className={`group relative flex items-center w-full text-left px-3 py-2.5 rounded-lg transition-all cursor-pointer animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isActive 
            ? 'bg-accent/10 text-accent font-medium border border-accent/20' 
            : 'text-tx-muted hover:bg-hover hover:text-tx-primary border border-transparent'
        }`}
      >
        <Activity size={16} className={`shrink-0 mr-3 ${isActive ? 'text-accent' : 'opacity-50'}`} aria-hidden="true" />
        
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit(chat.id);
              if (e.key === 'Escape') setEditingChatId(null);
            }}
            onBlur={() => handleRenameSubmit(chat.id)}
            aria-label="Edit chat title"
            className="flex-1 bg-input border border-accent/50 rounded px-2 py-0.5 text-sm outline-none w-full text-tx-primary"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate text-sm tracking-wide">{chat.title}</span>
        )}

        {!isEditing && (
          <div className={`absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l ${isActive ? 'from-accent/10' : 'from-hover'} pl-3`}>
            <span onClick={(e) => { e.stopPropagation(); pinChat(chat.id); }} role="button" tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') {e.stopPropagation(); pinChat(chat.id);}}} className={`p-1.5 rounded-md hover:bg-bd-strong text-tx-muted hover:text-tx-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${chat.isPinned ? 'text-accent hover:text-accent' : ''}`} aria-label={chat.isPinned ? "Unpin chat" : "Pin chat"} title={chat.isPinned ? "Unpin" : "Pin"}>
              <Pin size={14} className={chat.isPinned ? "fill-current" : ""} />
            </span>
            <span onClick={(e) => { e.stopPropagation(); setEditTitle(chat.title); setEditingChatId(chat.id); }} role="button" tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') {e.stopPropagation(); setEditTitle(chat.title); setEditingChatId(chat.id);}}} className="p-1.5 rounded-md hover:bg-bd-strong text-tx-muted hover:text-tx-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent" aria-label="Rename chat" title="Rename">
              <Edit3 size={14} />
            </span>
            <span onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} role="button" tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') {e.stopPropagation(); deleteChat(chat.id);}}} className="p-1.5 rounded-md hover:bg-red-500/20 text-tx-muted hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500" aria-label="Delete chat" title="Delete">
              <Trash2 size={14} />
            </span>
          </div>
        )}
      </button>
    );
  };

  const sidebarStyle = isMobile 
    ? { transform: isOpen ? 'translateX(0)' : 'translateX(-100%)', width: '300px' }
    : { width: isOpen ? sidebarWidth : 0 };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <aside 
        style={sidebarStyle} 
        aria-label="Sidebar Navigation"
        className={`${isMobile ? 'fixed inset-y-0 left-0 z-40' : 'relative z-20 flex-shrink-0'} bg-panel border-r border-bd-subtle transition-all duration-300 ease-in-out h-full overflow-hidden flex flex-col shadow-xl`}
      >
        <div className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col ${isMobile ? 'w-[300px]' : 'min-w-[260px]'}`}>
          
          {/* Header */}
          <header className="p-4 flex items-center justify-between border-b border-bd-subtle shrink-0">
            <div className="flex items-center gap-2">
               <Cpu size={20} className="text-accent" aria-hidden="true" />
               <h1 className="font-spectral font-bold tracking-widest uppercase text-tx-primary text-sm">WEB3BUILDERS Engine</h1>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleTheme} aria-label={theme === 'dark' ? "Switch to light theme" : "Switch to dark theme"} className="p-2 text-tx-muted hover:text-tx-primary hover:bg-hover rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>
              <button onClick={() => setIsOpen(false)} aria-label="Close sidebar" aria-expanded={isOpen} className="p-2 text-tx-muted hover:text-tx-primary hover:bg-hover rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <PanelLeftClose size={20} aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* Persona Profile Dossier */}
          <section className="px-5 py-6 flex flex-col items-center border-b border-bd-subtle relative overflow-hidden shrink-0" aria-label="Persona Details">
            <div className="absolute top-0 inset-x-0 h-32 bg-accent/5 blur-3xl pointer-events-none" aria-hidden="true"></div>
            
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full border-2 border-accent/30 p-1 flex items-center justify-center relative z-10">
                 <div className="w-full h-full rounded-full bg-main overflow-hidden border border-bd-strong flex items-center justify-center">
                    <Fingerprint size={48} strokeWidth={1} className="text-accent opacity-80 animate-pulse-slow" aria-hidden="true" />
                 </div>
              </div>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-panel rounded-full flex items-center justify-center z-20" aria-label="Status: Active">
                <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
              </div>
            </div>
            
            <h2 className="font-spectral text-xl font-bold text-tx-primary tracking-wide mb-1">Elon Musk</h2>
            <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20 mb-4 tracking-wider uppercase">
              Active Neural Clone
            </span>

            <div className="w-full bg-main/50 border border-bd-subtle rounded-lg p-3 backdrop-blur-sm relative group cursor-default">
              <div className="flex items-start gap-2">
                <ShieldAlert size={16} className="text-yellow-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[11px] leading-relaxed text-tx-secondary">
                  WEB3BUILDERS can clone <span className="text-tx-primary font-medium">any human personality</span> using timeline data. For demonstration, this clone is configured to the persona of Elon Musk.
                </p>
              </div>
            </div>
          </section>

          {/* Neural Links (Chats) */}
          <nav className="flex-1 flex flex-col p-4 overflow-hidden" aria-label="Neural Links Navigation">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-xs font-semibold text-tx-muted tracking-widest uppercase">Neural Links</h3>
              <button onClick={() => { createNewChat(); if (isMobile) setIsOpen(false); }} aria-label="Establish New Link" className="p-1.5 bg-accent text-accent-text hover:bg-accent-hover hover:text-white rounded-md transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover">
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="relative mb-4 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" aria-hidden="true" />
              <input
                type="text"
                aria-label="Search neural links"
                placeholder="Search streams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-input border border-bd-subtle focus:border-accent/50 focus:ring-1 focus:ring-accent/50 rounded-lg text-sm text-tx-primary transition-all outline-none"
              />
            </div>
            
            <div className="space-y-1 flex-1 overflow-y-auto">
              {pinnedChats.length > 0 && (
                <div className="mb-4">
                  <div className="space-y-1">{pinnedChats.map(renderChatItem)}</div>
                </div>
              )}
              {unpinnedChats.length > 0 && (
                <div className="space-y-1">{unpinnedChats.map(renderChatItem)}</div>
              )}
              {pinnedChats.length === 0 && unpinnedChats.length === 0 && chats.length > 0 && (
                <div className="text-center py-8 text-tx-muted text-sm">No active links</div>
              )}
            </div>
          </nav>
        </div>

        {/* Resize Handle */}
        {isOpen && !isMobile && (
          <div onMouseDown={() => setIsResizing(true)} aria-hidden="true" className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-accent/50 active:bg-accent transition-colors z-30" />
        )}
      </aside>
    </>
  );
};

export default Sidebar;
