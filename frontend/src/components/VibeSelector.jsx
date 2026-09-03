import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Flame, Cpu, Sparkles } from 'lucide-react';

const VIBE_MODES = [
  { id: "x_mode", name: "🔥 X Mode", subtext: "Punchy, witty & direct.", icon: <Flame size={14} className="text-orange-500" /> },
  { id: "first_principles", name: "🚀 First Principles", subtext: "Hardcore engineering.", icon: <Cpu size={14} className="text-blue-500" /> },
  { id: "visionary", name: "🌌 Visionary", subtext: "Civilizational scale.", icon: <Sparkles size={14} className="text-purple-500" /> }
];

const VibeSelector = ({ selectedVibe, setSelectedVibe }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeVibe = VIBE_MODES.find(v => v.id === selectedVibe) || VIBE_MODES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-hover transition-colors text-tx-secondary font-medium text-xs border border-bd-subtle bg-panel/70 shadow-sm">
        <span>{activeVibe.icon}</span>
        <span className="font-semibold text-tx-primary truncate max-w-[80px] sm:max-w-none">{activeVibe.name}</span>
        <ChevronDown size={13} className={`text-tx-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 sm:right-0 sm:left-auto mb-2 w-64 bg-panel rounded-xl shadow-xl border border-bd-strong z-50 overflow-hidden animate-fade-in-up origin-bottom">
          <div className="px-3 py-2 border-b border-bd-subtle bg-input">
            <span className="text-[10px] font-bold uppercase tracking-wider text-tx-muted">Persona Modulation</span>
          </div>
          <div className="p-1.5 flex flex-col gap-1">
            {VIBE_MODES.map((vibe) => (
              <button
                key={vibe.id}
                onClick={() => { setSelectedVibe(vibe.id); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${selectedVibe === vibe.id ? 'bg-accent/10 border border-accent/20' : 'hover:bg-hover border border-transparent'}`}
              >
                <div className="mt-0.5 shrink-0">{vibe.icon}</div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold tracking-wide ${selectedVibe === vibe.id ? 'text-accent' : 'text-tx-primary'}`}>{vibe.name}</span>
                  <span className="text-[10px] leading-snug text-tx-muted mt-0.5">{vibe.subtext}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default VibeSelector;
