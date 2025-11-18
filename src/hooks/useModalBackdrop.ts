import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to add a backdrop overlay when modals, popovers, or selects are open in Capacitor native apps
 */
export function useModalBackdrop() {
  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    if (!isNative) return;

    let backdrop: HTMLDivElement | null = null;

    const createBackdrop = () => {
      if (backdrop) return;
      
      backdrop = document.createElement('div');
      backdrop.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]';
      backdrop.style.pointerEvents = 'auto';
      backdrop.id = 'capacitor-modal-backdrop';
      document.body.appendChild(backdrop);

      // Close any open popovers/selects when clicking backdrop
      backdrop.addEventListener('click', () => {
        // Trigger click outside event
        document.body.click();
      });
    };

    const removeBackdrop = () => {
      if (backdrop) {
        backdrop.remove();
        backdrop = null;
      }
    };

    const checkForOpenModals = () => {
      const hasOpenPopover = document.querySelector('[data-radix-popover-content][data-state="open"]');
      const hasOpenSelect = document.querySelector('[data-radix-select-content][data-state="open"]');
      const hasOpenDialog = document.querySelector('[data-radix-dialog-content][data-state="open"]');

      if (hasOpenPopover || hasOpenSelect || hasOpenDialog) {
        createBackdrop();
      } else {
        removeBackdrop();
      }
    };

    // Check initially
    checkForOpenModals();

    // Watch for changes
    const observer = new MutationObserver(checkForOpenModals);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state']
    });

    // Also check on a timer as fallback
    const interval = setInterval(checkForOpenModals, 100);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      removeBackdrop();
    };
  }, []);
}

