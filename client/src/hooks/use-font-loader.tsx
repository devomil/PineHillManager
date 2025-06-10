import { useEffect } from 'react';

export function useFontLoader() {
  useEffect(() => {
    const ensureBrandFont = () => {
      // Apply Great Vibes font to all brand elements
      const brandElements = document.querySelectorAll('.brand-title, .pine-hill-title, [data-brand="pine-hill"]');
      brandElements.forEach(el => {
        (el as HTMLElement).style.fontFamily = '"Great Vibes", cursive';
      });
    };

    // Load font and apply immediately
    if ('fonts' in document) {
      document.fonts.load('400 1em "Great Vibes"').then(ensureBrandFont);
    }

    // Also apply on DOM changes (for dynamic content)
    const observer = new MutationObserver(() => {
      ensureBrandFont();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    // Initial application
    ensureBrandFont();

    return () => {
      observer.disconnect();
    };
  }, []);
}