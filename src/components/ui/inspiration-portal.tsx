'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Globe, MousePointer2, Camera, Check, ExternalLink, Move, Minimize2, Maximize2, Loader2, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface InspirationPortalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectionComplete: (urls: string[]) => void;
}

export function InspirationPortal({ isOpen, onClose, initialQuery, onSelectionComplete }: InspirationPortalProps) {
  const [url, setUrl] = useState(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(initialQuery || 'design inspiration')}`);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  // Script per l'intervallo di rimozione dei login wall e gestione Shift+Click
  // Nota: In produzione questo verrebbe iniettato tramite Electron preload
  const INJECTED_CODE = `
    const removeModals = () => {
      ['div[role="dialog"]', '[data-test-id="login-modal-default"]'].forEach(s => {
        document.querySelectorAll(s).forEach(el => el.remove());
      });
      document.body.style.overflow = 'auto';
    };
    setInterval(removeModals, 1000);
  `;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'IMAGE_SELECTED') {
        setSelectedImages(prev => {
          if (prev.includes(event.data.url)) return prev;
          return [...prev, event.data.url];
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed z-[100] bg-[#0a0a0a] border border-white/10 shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 ease-out flex flex-col",
      isMaximized 
        ? "inset-4" 
        : "bottom-8 right-8 w-[600px] h-[700px] sm:w-[800px]"
    )}>
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            <Globe className="w-3 h-3" />
            Visual Discovery Engine
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all"
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/40 hover:text-red-400 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbox / Selected List */}
      <div className="flex items-center gap-4 p-3 bg-white/[0.01] border-b border-white/5">
        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {selectedImages.length === 0 ? (
            <div className="flex items-center gap-2 text-[10px] font-medium text-white/20 italic ml-2">
              <MousePointer2 className="w-3 h-3" />
              Esplora Pinterest e premi <span className="bg-white/10 text-white px-1.5 py-0.5 rounded uppercase font-black text-[8px] not-italic">Shift + Click</span> per "clippare" le reference
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {selectedImages.map((src, i) => (
                <div key={i} className="group relative w-10 h-10 rounded-lg overflow-hidden border border-accent/30 flex-shrink-0 animate-in zoom-in slide-in-from-left-2 duration-300">
                  <img src={src} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setSelectedImages(prev => prev.filter(u => u !== src))}
                    className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <div className="text-[10px] font-black text-accent ml-2 flex items-center gap-1.5">
                <Check className="w-3 h-3" />
                {selectedImages.length} Reference Pronte
              </div>
            </div>
          )}
        </div>

        {selectedImages.length > 0 && (
          <Button 
            size="sm" 
            onClick={() => {
              onSelectionComplete(selectedImages);
              onClose();
            }}
            className="bg-accent hover:bg-accent/80 text-white text-[10px] font-black uppercase tracking-widest px-4 h-8 rounded-xl shadow-lg shadow-accent/20 animate-in fade-in slide-in-from-right-4"
          >
            Genera Blueprint
          </Button>
        )}
      </div>

      {/* Browser View Container */}
      <div className="flex-1 relative bg-white/[0.02]">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Inizializzazione Engine...</div>
          </div>
        )}
        
        {/* Usiamo un iframe per simulare il browser flottante. */}
        <iframe 
          src={url}
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-white/5 bg-black text-[8px] font-medium text-white/20 flex justify-between items-center px-4">
        <div className="flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-accent" />
          MODALITÀ "VISUAL MIMICRY" ATTIVA • ANALISI PARAMETRICA BASATA SU FOTO SELEZIONATE
        </div>
        <div>INCÓGNITO PERSISTENTE • DOM-INJECTION ACTIVE</div>
      </div>
    </div>
  );
}
