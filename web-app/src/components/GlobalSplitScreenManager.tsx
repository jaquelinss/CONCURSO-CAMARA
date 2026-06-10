import { useEffect, useRef } from 'react';
import { useGlobalSplitScreen } from '../hooks/useGlobalSplitScreen';

export default function GlobalSplitScreenManager() {
  const { splitMode, splitWidth, splitSide } = useGlobalSplitScreen();
  const splitDragging = useRef(false);

  useEffect(() => {
    const handleToggle = () => {
      const current = localStorage.getItem('global_split_active') === 'true';
      const next = !current;
      localStorage.setItem('global_split_active', String(next));
      window.dispatchEvent(new Event('global-split-changed'));
    };
    window.addEventListener('toggle-global-split', handleToggle);
    return () => window.removeEventListener('toggle-global-split', handleToggle);
  }, []);

  // Auto-disable split mode on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && localStorage.getItem('global_split_active') === 'true') {
        localStorage.setItem('global_split_active', 'false');
        window.dispatchEvent(new Event('global-split-changed'));
      }
    };
    window.addEventListener('resize', handleResize);
    // Call once on mount to handle initial small screens
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (splitMode) {
      document.body.style.transition = 'padding-right 0.3s ease, padding-left 0.3s ease';
      if (splitSide === 'right') {
        document.body.style.paddingRight = `${splitWidth}%`;
        document.body.style.paddingLeft = '0px';
      } else {
        document.body.style.paddingLeft = `${splitWidth}%`;
        document.body.style.paddingRight = '0px';
      }
    } else {
      document.body.style.paddingRight = '0px';
      document.body.style.paddingLeft = '0px';
    }

    return () => {
      document.body.style.paddingRight = '0px';
      document.body.style.paddingLeft = '0px';
    };
  }, [splitMode, splitWidth, splitSide]);

  if (!splitMode) return null;

  return (
    <>
      <div 
        className={`fixed top-16 bottom-0 z-[40] pointer-events-none`}
        style={{ width: `${splitWidth}%`, [splitSide === 'right' ? 'right' : 'left']: 0 }}
      />
      {/* Draggable split divider */}
      <div 
        className="fixed top-16 bottom-0 w-4 cursor-col-resize hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-colors z-[100] flex items-center justify-center group"
        style={{ [splitSide === 'right' ? 'right' : 'left']: `calc(${splitWidth}% - 8px)` }}
        onPointerDown={(e) => {
          // Only start drag if we didn't click a button inside the divider
          if ((e.target as HTMLElement).closest('button')) return;
          
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
          let newWidth;
          if (splitSide === 'right') {
             newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
          } else {
             newWidth = (e.clientX / window.innerWidth) * 100;
          }
          if (newWidth > 20 && newWidth < 80) {
            localStorage.setItem('global_split_width', newWidth.toString());
            window.dispatchEvent(new Event('global-split-changed'));
            document.body.style.transition = 'none';
          }
        }}
        onPointerUp={(e) => {
          if (!splitDragging.current) return;
          splitDragging.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
          localStorage.setItem('global_split_width', splitWidth.toString());
          window.dispatchEvent(new Event('global-split-changed'));
          document.body.style.transition = 'padding-right 0.3s ease, padding-left 0.3s ease';
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
          document.body.style.transition = 'padding-right 0.3s ease, padding-left 0.3s ease';
          // Restore iframe pointer events
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            iframe.style.pointerEvents = 'auto';
          });
        }}
      >
        {/* Visible Handle with Swap Button */}
        <div className="flex flex-col gap-2 opacity-50 group-hover:opacity-100 transition-opacity items-center">
          <div className="w-1.5 h-12 bg-indigo-400 rounded-full shadow-sm" />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const newSide = splitSide === 'right' ? 'left' : 'right';
              localStorage.setItem('global_split_side', newSide);
              window.dispatchEvent(new Event('global-split-changed'));
            }}
            className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-indigo-500 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700 pointer-events-auto"
            title={`Mudar para o lado ${splitSide === 'right' ? 'esquerdo' : 'direito'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
          </button>
          <div className="w-1.5 h-12 bg-indigo-400 rounded-full shadow-sm" />
        </div>
      </div>
    </>
  );
}
