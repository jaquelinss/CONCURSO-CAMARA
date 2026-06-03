import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useReward } from '../contexts/RewardContext';
import Draggable from 'react-draggable';
import { StickerImage } from './StickerImage';
import { Unlock } from 'lucide-react';

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
  const { markStickerAsUsed, activeStamper, setActiveStamper } = useReward();
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  
  // Create a safe document ID from the pathname
  const docId = `decorations_${location.pathname.replace(/[^a-zA-Z0-9]/g, '_') || 'root'}`;

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
    const handleGlobalClick = async (e: MouseEvent) => {
      // If we don't have an active stamper, ignore
      if (!activeStamper) return;
      // If the event was prevented or stopped by Post-it / Whiteboard, ignore
      if (e.defaultPrevented) return;

      if (!user) return;

      const newSticker: PlacedSticker = {
        id: activeStamper.instanceId,
        stickerId: activeStamper.stickerId,
        customUrl: activeStamper.customUrl,
        x: e.clientX + window.scrollX,
        y: e.clientY + window.scrollY,
        isLocked: false
      };

      const newStickers = [...stickers, newSticker];
      
      const docRef = doc(db, 'users', user.uid, 'settings', docId);
      await setDoc(docRef, { stickers: newStickers }, { merge: true });
      
      // Sticker stays in inventory for unlimited reuse
      setActiveStamper(null);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [user, docId, stickers, markStickerAsUsed, activeStamper, setActiveStamper]);

  // Handle remove sticker
  useEffect(() => {
    const handleRemoveSticker = async (e: Event) => {
      const customEvent = e as CustomEvent<{ instanceId: string }>;
      const { instanceId } = customEvent.detail;
      
      if (!user) return;
      
      const stickerExists = stickers.some(s => s.id === instanceId);
      if (!stickerExists) return;

      const newStickers = stickers.filter(s => s.id !== instanceId);
      setStickers(newStickers);
      
      const docRef = doc(db, 'users', user.uid, 'settings', docId);
      await setDoc(docRef, { stickers: newStickers }, { merge: true });
    };

    window.addEventListener('remove-sticker', handleRemoveSticker);
    return () => window.removeEventListener('remove-sticker', handleRemoveSticker);
  }, [user, docId, stickers]);

  const updateSticker = async (id: string, updates: Partial<PlacedSticker>) => {
    if (!user) return;
    const updated = stickers.map(s => s.id === id ? { ...s, ...updates } : s);
    const docRef = doc(db, 'users', user.uid, 'settings', docId);
    await setDoc(docRef, { stickers: updated }, { merge: true });
  };

  // removeSticker is removed because returning is now only done via the drawer

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[10]">
      {stickers.map(sticker => (
        <DraggableSticker 
          key={sticker.id}
          sticker={sticker}
          onUpdate={(updates) => updateSticker(sticker.id, updates)}
        />
      ))}
    </div>
  );
}

function DraggableSticker({ 
  sticker, 
  onUpdate
}: { 
  sticker: PlacedSticker; 
  onUpdate: (u: Partial<PlacedSticker>) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const url = sticker.customUrl || STICKERS_DEFS[sticker.stickerId];
  
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
        className="absolute inline-block group pointer-events-auto"
      >
        <StickerImage 
          src={url}
          className={`w-32 h-32 object-contain drop-shadow-md transition-opacity ${sticker.isLocked ? 'opacity-90' : 'opacity-100 cursor-move'}`}
        />
        
        {/* Hover Controls - Only visible when NOT locked. Once locked, it can only be removed from the drawer. */}
        {!sticker.isLocked && (
          <div 
            className="absolute -top-4 -right-4 bg-white/90 backdrop-blur shadow-sm border border-gray-200 rounded-lg p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ isLocked: true }); }}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
              title="Colar (travar no fundo)"
            >
              <Unlock className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Draggable>
  );
}
