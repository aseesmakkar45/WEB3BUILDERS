import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Target, Brain } from 'lucide-react';

const MODELS = [
  { name: "Gemma 4 26B MoE", subtext: "Fast, efficient responses.", icon: <Target size={14} /> },
  { name: "Gemma 4 31B Dense", subtext: "Deeper analysis, slightly slower.", icon: <Brain size={14} /> }
];

const ModelSelector = ({ selectedModel, setSelectedModel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeModel = MODELS.find(m => m.name === selectedModel) || MODELS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-hover transition-colors text-tx-secondary font-medium text-xs group border border-bd-subtle bg-panel/70">
        <span className="text-accent">{activeModel.icon}</span>
        <span className="tracking-wide text-tx-primary truncate max-w-[90px] sm:max-w-none">{selectedModel}</span>
        <ChevronDown size={13} className={`text-tx-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-panel rounded-xl shadow-xl border border-bd-strong z-50 overflow-hidden animate-fade-in-up origin-bottom">
          <div className="p-1.5 flex flex-col gap-0.5">
            {MODELS.map((model) => (
              <button
                key={model.name}
                onClick={() => { setSelectedModel(model.name); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-3 ${selectedModel === model.name ? 'bg-accent/10 border border-accent/10' : 'hover:bg-hover border border-transparent'}`}
              >
                <div className={`mt-0.5 ${selectedModel === model.name ? 'text-accent' : 'text-tx-muted'}`}>{model.icon}</div>
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold tracking-wide ${selectedModel === model.name ? 'text-accent' : 'text-tx-primary'}`}>{model.name}</span>
                  <span className="text-[10px] leading-tight text-tx-muted mt-0.5">{model.subtext}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default ModelSelector;
