import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useReward } from '../contexts/RewardContext';
import Draggable from 'react-draggable';
import { StickerImage } from './StickerImage';
import { Unlock, Trash2 } from 'lucide-react';

interface PlacedSticker {
  id: string;
  stickerId: string;
  customUrl?: string;
  x: number;
  y: number;
  isLocked: boolean;
}

const STICKERS_DEFS: Record<string, string> = {
  '1': '/stickers/1.png',
  '2': '/stickers/2.png',
  '3': '/stickers/3.png',
  '4': '/stickers/4.png',
  '5': '/stickers/5.png',
  '6': '/stickers/6.png',
  '7': '/stickers/7.png',
  '8': '/stickers/8.png',
  '9': '/stickers/9.png',
  '10': '/stickers/10.png',
  '11': '/stickers/11.png',
};

export default function SiteDecorator() {
  const { user } = useAuth();
  const location = useLocation();
  const { activeStamper } = useReward();
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);

  // Per-route document ID
  const docId = `decorations_${location.pathname.replace(/[^a-zA-Z0-9]/g, '_') || 'root'}`;

  // Keep a ref to always have the latest stickers (avoids stale closure)
  const stickersRef = useRef<PlacedSticker[]>(stickers);
  useEffect(() => { stickersRef.current = stickers; }, [stickers]);

  // Also keep docId in a ref so the click handler always uses the current one
  const docIdRef = useRef(docId);
  useEffect(() => { docIdRef.current = docId; }, [docId]);

  // Fetch stickers for current route
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'settings', docId);
    
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setStickers(snap.data().stickers || []);
      } else {
        setStickers([]);
      }
    });

    return unsubscribe;
  }, [user, docId]);

  // Handle global click to place stamper
  useEffect(() => {
    if (!activeStamper || !user) return;

    const handleGlobalClick = async (e: MouseEvent) => {
      // Ignore clicks on interactive UI elements
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, textarea, select, [role="dialog"], [role="menu"], .modal, .reward-shop, .whiteboard-toolbar, .whiteboard-sidebar, .palette-popover')) return;

      const newSticker: PlacedSticker = {
        id: `decor_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        stickerId: activeStamper.stickerId,
        x: e.clientX - 64,
        y: e.clientY - 64,
        isLocked: false
      };
      
      if (activeStamper.customUrl) {
        newSticker.customUrl = activeStamper.customUrl;
      }

      const currentDocId = docIdRef.current;
      const newStickers = [...stickersRef.current, newSticker];
      setStickers(newStickers);
      
      const docRef = doc(db, 'users', user.uid, 'settings', currentDocId);
      await setDoc(docRef, { stickers: newStickers }, { merge: true });
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [user, activeStamper]);

  // Handle remove sticker via global event
  useEffect(() => {
    if (!user) return;
    const handleRemoveSticker = async (e: Event) => {
      const customEvent = e as CustomEvent<{ instanceId: string }>;
      const { instanceId } = customEvent.detail;
      
      const current = stickersRef.current;
      if (!current.some(s => s.id === instanceId)) return;

      const newStickers = current.filter(s => s.id !== instanceId);
      setStickers(newStickers);
      
      const docRef = doc(db, 'users', user.uid, 'settings', docIdRef.current);
      await setDoc(docRef, { stickers: newStickers }, { merge: true });
    };

    window.addEventListener('remove-sticker', handleRemoveSticker);
    return () => window.removeEventListener('remove-sticker', handleRemoveSticker);
  }, [user]);

  const updateSticker = async (id: string, updates: Partial<PlacedSticker>) => {
    if (!user) return;
    const updated = stickersRef.current.map(s => s.id === id ? { ...s, ...updates } : s);
    setStickers(updated);
    const docRef = doc(db, 'users', user.uid, 'settings', docIdRef.current);
    await setDoc(docRef, { stickers: updated }, { merge: true });
  };

  const removeSticker = async (id: string) => {
    if (!user) return;
    const newStickers = stickersRef.current.filter(s => s.id !== id);
    setStickers(newStickers);
    const docRef = doc(db, 'users', user.uid, 'settings', docIdRef.current);
    await setDoc(docRef, { stickers: newStickers }, { merge: true });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[10]">
      {stickers.map(sticker => (
        <DraggableSticker 
          key={sticker.id}
          sticker={sticker}
          onUpdate={(updates) => updateSticker(sticker.id, updates)}
          onRemove={() => removeSticker(sticker.id)}
        />
      ))}
    </div>
  );
}

function DraggableSticker({ 
  sticker, 
  onUpdate,
  onRemove
}: { 
  sticker: PlacedSticker; 
  onUpdate: (u: Partial<PlacedSticker>) => void;
  onRemove: () => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const url = sticker.customUrl || STICKERS_DEFS[sticker.stickerId];
  
  // Close menu when clicking anywhere else
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showMenu]);

  if (!url) return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: sticker.x, y: sticker.y }}
      disabled={sticker.isLocked}
      onStop={(_, data) => onUpdate({ x: data.x, y: data.y })}
    >
      <div 
        ref={nodeRef} 
        className="absolute inline-block pointer-events-auto"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
      >
        <StickerImage 
          src={url}
          className={`w-32 h-32 object-contain drop-shadow-md transition-opacity ${sticker.isLocked ? 'opacity-90' : 'opacity-100 cursor-move'}`}
        />
        
        {/* Right-click context menu */}
        {showMenu && (
          <div 
            className="absolute -top-2 -right-2 bg-white/95 backdrop-blur-md shadow-lg border border-gray-200 rounded-xl p-1.5 flex flex-col gap-1 pointer-events-auto z-50 animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {!sticker.isLocked && (
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdate({ isLocked: true }); setShowMenu(false); }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg text-gray-700 text-xs font-medium transition-colors whitespace-nowrap"
              >
                <Unlock className="w-3.5 h-3.5" />
                Travar no fundo
              </button>
            )}
            {sticker.isLocked && (
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdate({ isLocked: false }); setShowMenu(false); }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg text-gray-700 text-xs font-medium transition-colors whitespace-nowrap"
              >
                <Unlock className="w-3.5 h-3.5" />
                Destravar
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(); setShowMenu(false); }}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </button>
          </div>
        )}
      </div>
    </Draggable>
  );
}

