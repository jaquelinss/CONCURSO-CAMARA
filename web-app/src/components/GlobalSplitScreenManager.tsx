import { useEffect, useState, useRef } from 'react';

export default function GlobalSplitScreenManager() {
  const [splitMode, setSplitMode] = useState<boolean>(() => {
    return localStorage.getItem('global_split_active') === 'true';
  });
  const [splitWidth, setSplitWidth] = useState<number>(() => {
    return Number(localStorage.getItem('global_split_width')) || 50;
  });
  const splitDragging = useRef(false);

  useEffect(() => {
    const handleToggle = () => {
      setSplitMode(prev => {
        const next = !prev;
        localStorage.setItem('global_split_active', String(next));
        window.dispatchEvent(new Event('global-split-changed'));
        return next;
      });
    };
    window.addEventListener('toggle-global-split', handleToggle);
    return () => window.removeEventListener('toggle-global-split', handleToggle);
  }, []);

  useEffect(() => {
    if (splitMode) {
      document.body.style.transition = 'padding-right 0.3s ease';
      document.body.style.paddingRight = `${splitWidth}%`;
    } else {
      document.body.style.paddingRight = '0px';
    }

    return () => {
      // Don't clean up on unmount necessarily unless we really want to,
      // but since this is global, we can clean up if it unmounts.
      document.body.style.paddingRight = '0px';
    };
  }, [splitMode, splitWidth]);

  if (!splitMode) return null;

  return (
    <>
      <div 
        className="fixed top-16 right-0 bottom-0 z-[40] pointer-events-none"
        style={{ width: `${splitWidth}%` }}
      />
      {/* Draggable split divider */}
      <div 
        className="fixed top-16 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-600 transition-colors z-[100]"
        style={{ right: `calc(${splitWidth}% - 4px)` }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          splitDragging.current = true;
          // Disable iframe pointer events globally during resize
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'none';
          });
        }}
        onPointerMove={(e) => {
          if (!splitDragging.current) return;
          const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
          if (newWidth > 20 && newWidth < 80) {
            setSplitWidth(newWidth);
            document.body.style.transition = 'none';
          }
        }}
        onPointerUp={(e) => {
          splitDragging.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
          localStorage.setItem('global_split_width', splitWidth.toString());
          window.dispatchEvent(new Event('global-split-changed'));
          document.body.style.transition = 'padding-right 0.3s ease';
          // Restore iframe pointer events
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
          });
        }}
        onPointerCancel={(e) => {
          splitDragging.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
          localStorage.setItem('global_split_width', splitWidth.toString());
          window.dispatchEvent(new Event('global-split-changed'));
          document.body.style.transition = 'padding-right 0.3s ease';
          // Restore iframe pointer events
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
          });
        }}
      />
    </>
  );
}
