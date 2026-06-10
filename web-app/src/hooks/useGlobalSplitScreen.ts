import { useState, useEffect } from 'react';

export function useGlobalSplitScreen() {
  const [splitMode, setSplitMode] = useState<boolean>(() => {
    return localStorage.getItem('global_split_active') === 'true';
  });
  const [splitWidth, setSplitWidth] = useState<number>(() => {
    return Number(localStorage.getItem('global_split_width')) || 50;
  });
  const [splitSide, setSplitSide] = useState<'right' | 'left'>(() => {
    return (localStorage.getItem('global_split_side') as 'right' | 'left') || 'right';
  });

  useEffect(() => {
    const handleSplitChanged = () => {
      setSplitMode(localStorage.getItem('global_split_active') === 'true');
      setSplitWidth(Number(localStorage.getItem('global_split_width')) || 50);
      setSplitSide((localStorage.getItem('global_split_side') as 'right' | 'left') || 'right');
    };

    window.addEventListener('global-split-changed', handleSplitChanged);
    return () => window.removeEventListener('global-split-changed', handleSplitChanged);
  }, []);

  return { splitMode, splitWidth, splitSide };
}
