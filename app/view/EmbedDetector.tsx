'use client';

import { useEffect } from 'react';

const LAYOUT_ID = 'view-layout-root';

export function EmbedDetector() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isEmbed = window.self !== window.top;
    const root = document.getElementById(LAYOUT_ID);
    if (root) {
      if (isEmbed) root.classList.add('view-layout--embed');
      else root.classList.remove('view-layout--embed');
    }
  }, []);
  return null;
}
