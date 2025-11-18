import { useEffect, useRef, RefObject } from 'react';
import { Capacitor } from '@capacitor/core';

interface UseAutoScrollOnInputOptions {
  /**
   * Ref to the submit button or form element to scroll into view
   */
  submitButtonRef?: RefObject<HTMLElement>;
  /**
   * Ref to the form container
   */
  formRef?: RefObject<HTMLElement>;
  /**
   * Whether to enable auto-scroll (default: true for native apps)
   */
  enabled?: boolean;
  /**
   * Delay in milliseconds before scrolling (default: 300ms for keyboard animation)
   */
  scrollDelay?: number;
  /**
   * Offset from bottom in pixels to ensure button is visible above keyboard
   */
  bottomOffset?: number;
}

/**
 * Custom hook to auto-scroll when input fields (especially password) are focused
 * Ensures submit buttons remain visible above the keyboard on mobile devices
 */
export const useAutoScrollOnInput = (options: UseAutoScrollOnInputOptions = {}) => {
  const {
    submitButtonRef,
    formRef,
    enabled = Capacitor.isNativePlatform(),
    scrollDelay = 300,
    bottomOffset = 100,
  } = options;

  const inputRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    const handleInputFocus = (event: Event) => {
      // Get the actual input element from the event
      const target = (event.target || event.currentTarget) as HTMLInputElement | HTMLTextAreaElement;
      
      if (!target) {
        console.log('[useAutoScrollOnInput] No target found');
        return;
      }
      
      // Check if it's an input, textarea, or inside PhoneInput
      const isTextarea = target.tagName === 'TEXTAREA';
      const isInput = target.tagName === 'INPUT';
      const isPhoneInput = target.classList?.contains('PhoneInputInput') || 
                          target.closest('.PhoneInput') !== null;
      
      // Reject if not a supported element
      if (!isTextarea && !isInput && !isPhoneInput) {
        return;
      }
      
      // For inputs, check type
      if (isInput && target.type) {
        const supportedTypes = ['password', 'text', 'email', 'tel', 'number', 'search'];
        if (!supportedTypes.includes(target.type) && !isPhoneInput) {
          return;
        }
      }

      console.log('[useAutoScrollOnInput] ✅ Input focused:', target.type || target.tagName, 'id:', target.id, 'isPhoneInput:', isPhoneInput);

      // Find the form that contains this input (or use formRef, or document as fallback)
      // Priority: 1) actual <form> tag, 2) formRef.current, 3) closest card/container, 4) document.body
      let form: HTMLElement | null = target.closest('form');
      
      // If no form tag found, try using formRef as container (common for TalentOnboarding)
      if (!form && formRef?.current) {
        // Check if target is inside formRef
        if (formRef.current.contains(target)) {
          form = formRef.current;
        }
      }
      
      // If still no container, use the closest parent div with form-like classes
      if (!form) {
        form = target.closest('div[class*="form"], div[class*="card"], div[class*="container"], [role="form"]') || document.body;
      }
      
      // Final fallback - always use document.body if nothing else works
      if (!form) {
        form = document.body;
      }
      
      // Log for debugging (only in development or if form not found)
      if (!form || form === document.body) {
        console.log('[useAutoScrollOnInput] ⚠️ Using fallback container:', form === document.body ? 'document.body' : 'custom container', 'formRef:', formRef?.current ? 'exists' : 'missing');
      } else {
        console.log('[useAutoScrollOnInput] ✅ Form container found:', form.tagName, form.className || '(no class)');
      }

      // For native apps, use window/document scrolling (form scrolls naturally)
      // For web, find the scrollable container
      let scrollContainer: HTMLElement = document.documentElement;
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // On native, the page scrolls naturally - use window/document
        scrollContainer = document.documentElement;
      } else if (formRef?.current) {
        // On web, try to use form ref if it's scrollable
        const formStyle = window.getComputedStyle(formRef.current);
        if (formStyle.overflowY === 'auto' || formStyle.overflowY === 'scroll' || formStyle.overflow === 'auto' || formStyle.overflow === 'scroll') {
          scrollContainer = formRef.current;
        }
      } else {
        // Find the closest scrollable parent
        let parent: HTMLElement | null = target.parentElement;
        while (parent && parent !== document.body) {
          const style = window.getComputedStyle(parent);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
            scrollContainer = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }

      // GENTLE SCROLL: ALWAYS scroll to show next field when input is focused
      // Simplified logic - always scroll, but gently (small amount)
      const scrollToNextField = () => {
        console.log('[useAutoScrollOnInput] scrollToNextField called for:', target.type || target.tagName);
        
        // Use visual viewport if available (better for mobile keyboards)
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const targetRect = target.getBoundingClientRect();
        const safeAreaBottom = isNative ? 34 : 0;

        // Find all form inputs (including PhoneInput, textarea, etc.)
        const allInputs: HTMLElement[] = [];
        
        // Get all standard inputs
        const standardInputs = form.querySelectorAll<HTMLElement>(
          'input[type="text"], input[type="email"], input[type="password"], input[type="tel"], input[type="number"], input[type="search"], textarea'
        );
        allInputs.push(...Array.from(standardInputs));
        
        // Get PhoneInput components (they have a nested input)
        const phoneInputs = form.querySelectorAll<HTMLElement>('.PhoneInput input, .PhoneInputInput, [class*="PhoneInput"] input');
        phoneInputs.forEach((phoneInput) => {
          if (!allInputs.includes(phoneInput)) {
            allInputs.push(phoneInput);
          }
        });

        console.log('[useAutoScrollOnInput] Found', allInputs.length, 'inputs in form');

        // Sort inputs by their position in the DOM (top to bottom)
        const sortedInputs = allInputs.sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectA.top - rectB.top;
        });

        // Find the current input's index (handle PhoneInput which has nested inputs)
        const currentIndex = sortedInputs.findIndex((input) => {
          if (input === target) return true;
          if (input.contains(target)) return true;
          // For PhoneInput, the actual input might be nested
          if (target.closest('.PhoneInput') === input.closest('.PhoneInput')) return true;
          return false;
        });
        
        console.log('[useAutoScrollOnInput] Current input index:', currentIndex, 'out of', sortedInputs.length);

        // Find the next input field (skip disabled/hidden inputs)
        let nextInput: HTMLElement | null = null;
        for (let i = currentIndex + 1; i < sortedInputs.length; i++) {
          const input = sortedInputs[i];
          const rect = input.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          const isNotDisabled = !input.hasAttribute('disabled') && input.getAttribute('aria-disabled') !== 'true';
          
          if (isVisible && isNotDisabled) {
            nextInput = input;
            console.log('[useAutoScrollOnInput] Next input found:', input.type || input.tagName, 'at index', i);
            break;
          }
        }

        // ALWAYS SCROLL on EVERY input focus - based on CURRENT viewport position
        // Goal: Position the next field in a comfortable viewing area above keyboard
        const comfortablePadding = 60; // Comfortable space above keyboard
        const keyboardTop = viewportHeight - safeAreaBottom;
        const idealNextFieldTop = 100; // Ideal position for next field (from top of viewport)
        const maxScrollPerStep = 150; // Max scroll per focus (gentle, not aggressive)
        
        if (nextInput) {
          const nextRect = nextInput.getBoundingClientRect();
          const nextFieldTop = nextRect.top; // Position relative to viewport top
          const nextFieldBottom = nextRect.bottom;
          
          // Goal: Position next field at idealNextFieldTop from viewport top
          // If next field is currently at nextFieldTop, we need to scroll by (nextFieldTop - idealNextFieldTop)
          const scrollNeeded = nextFieldTop - idealNextFieldTop;
          
          // Always scroll to position next field, but gently - cap the amount per step
          let scrollAmount = scrollNeeded;
          if (Math.abs(scrollAmount) > maxScrollPerStep) {
            // If we need to scroll a lot, scroll in steps (only scroll maxScrollPerStep)
            scrollAmount = scrollAmount > 0 ? maxScrollPerStep : -maxScrollPerStep;
          }
          
          // ALWAYS scroll if there's any movement needed (at least 10px)
          // Lower threshold ensures every focus triggers a scroll to position the next field
          if (Math.abs(scrollAmount) > 10) {
            console.log('[useAutoScrollOnInput] 📍 Positioning next field. Current top:', nextFieldTop.toFixed(0), 'px. Target:', idealNextFieldTop, 'px. Scrolling:', scrollAmount.toFixed(0), 'px');
            
            if (scrollContainer === document.documentElement) {
              window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            } else {
              scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            }
          } else {
            // If next field is already very close to ideal position, check if it's hidden by keyboard
            // If next field bottom is below keyboard top, scroll down to show it
            if (nextFieldBottom > keyboardTop - comfortablePadding) {
              const scrollToShow = nextFieldBottom - (keyboardTop - comfortablePadding);
              const scrollAmount = Math.min(scrollToShow, maxScrollPerStep);
              
              if (scrollAmount > 10) {
                console.log('[useAutoScrollOnInput] 📍 Next field hidden by keyboard. Scrolling', scrollAmount.toFixed(0), 'px to reveal it');
                
                if (scrollContainer === document.documentElement) {
                  window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                } else {
                  scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
              }
            }
          }
        } else {
          // No next input - ensure current input is visible above keyboard
          const currentBottom = targetRect.bottom;
          const currentTop = targetRect.top;
          
          // Check if current input is hidden by keyboard
          if (currentBottom > keyboardTop - comfortablePadding) {
            // Scroll down to show current input
            const scrollNeeded = currentBottom - (keyboardTop - comfortablePadding);
            const scrollAmount = Math.min(scrollNeeded, maxScrollPerStep);
            
            if (scrollAmount > 10) {
              console.log('[useAutoScrollOnInput] 📍 Current input hidden by keyboard. Scrolling', scrollAmount.toFixed(0), 'px');
              
              if (scrollContainer === document.documentElement) {
                window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
              } else {
                scrollContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
              }
            }
          } else if (currentTop < 50) {
            // Current input is too high (might be covered by header) - scroll up a bit
            const scrollUp = 50 - currentTop;
            const scrollAmount = Math.min(scrollUp, maxScrollPerStep);
            
            if (scrollAmount > 10) {
              console.log('[useAutoScrollOnInput] 📍 Current input too high. Scrolling UP', scrollAmount.toFixed(0), 'px');
              
              if (scrollContainer === document.documentElement) {
                window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
              } else {
                scrollContainer.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
              }
            }
          }
        }
      };

      // GENTLE SCROLL: ALWAYS execute on every input focus
      // Use multiple attempts to ensure scrolling happens
      
      console.log('[useAutoScrollOnInput] 🔄 Setting up scroll attempts for:', target.type || target.tagName);
      
      // Immediate scroll attempt
      requestAnimationFrame(() => {
        if (document.activeElement === target) {
          console.log('[useAutoScrollOnInput] ⚡ Immediate scroll attempt');
          scrollToNextField();
        }
      });
      
      // First delayed attempt (after keyboard starts appearing)
      setTimeout(() => {
        if (document.activeElement === target) {
          console.log('[useAutoScrollOnInput] ⏱️ First delayed scroll attempt');
          scrollToNextField();
        }
      }, scrollDelay);
      
      // Second delayed attempt (after keyboard fully appears)
      setTimeout(() => {
        if (document.activeElement === target) {
          console.log('[useAutoScrollOnInput] ⏱️⏱️ Second delayed scroll attempt');
          scrollToNextField();
        }
      }, scrollDelay + 300);
    };

    // SIMPLIFIED: Attach listeners directly to document with event delegation
    // This guarantees ALL inputs get scroll behavior, no matter when they're added
    const attachListeners = () => {
      // Wait a bit longer to ensure form is fully rendered (especially for conditional forms like TalentOnboarding)
      setTimeout(() => {
        // Method 1: Event delegation on document (catches everything) - PRIMARY METHOD
        document.removeEventListener('focusin', handleInputFocus, true);
        document.addEventListener('focusin', handleInputFocus, { passive: true, capture: true });
        
        // Method 2: Also attach directly to all existing inputs (backup)
        // Use more comprehensive selectors to catch all inputs including PhoneInput
        const supportedInputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          'input[type="text"], input[type="email"], input[type="password"], input[type="tel"], input[type="number"], input[type="search"], textarea, .PhoneInputInput, .PhoneInput input, [class*="PhoneInput"] input, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="file"])'
        );

        const formContainer = formRef?.current;
        console.log('[useAutoScrollOnInput] 📌 Attaching listeners. Form container:', formContainer ? 'found' : 'not found', 'Inputs found:', supportedInputs.length);

        supportedInputs.forEach((input) => {
          // Remove existing listeners first (prevent duplicates)
          input.removeEventListener('focus', handleInputFocus, true);
          input.removeEventListener('focusin', handleInputFocus, true);
          // Add both focus and focusin events to catch everything
          input.addEventListener('focus', handleInputFocus, { passive: true, capture: true });
          input.addEventListener('focusin', handleInputFocus, { passive: true, capture: true });
        });
      }, 200); // Slightly longer delay for complex forms like TalentOnboarding
    };

    // Attach listeners immediately
    attachListeners();

    // Use MutationObserver to re-attach listeners when new inputs are added
    // This is especially important for TalentOnboarding which has conditional fields
    const observer = new MutationObserver((mutations) => {
      // Check if any new inputs were added
      const hasNewInputs = mutations.some((mutation) => {
        return Array.from(mutation.addedNodes).some((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            return element.tagName === 'INPUT' || 
                   element.tagName === 'TEXTAREA' ||
                   element.querySelector('input, textarea, .PhoneInput') !== null;
          }
          return false;
        });
      });
      
      if (hasNewInputs) {
        console.log('[useAutoScrollOnInput] 🔄 New inputs detected, re-attaching listeners');
        // Re-attach when DOM changes (debounced)
        setTimeout(attachListeners, 200);
      }
    });

    // Observe document body for any changes (also observe formRef if available)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    // Also observe formRef if it exists (for faster detection of changes within the form)
    if (formRef?.current) {
      observer.observe(formRef.current, {
        childList: true,
        subtree: true,
      });
    }

    // Also handle select dropdowns
    const selectTriggers = document.querySelectorAll('[role="combobox"]');
    const handleSelectOpen = (event: Event) => {
      const trigger = event.target as HTMLElement;
      if (trigger) {
        setTimeout(() => {
          const triggerRect = trigger.getBoundingClientRect();
          const isNative = Capacitor.isNativePlatform();
          const safeAreaTop = isNative ? 44 : 0;
          const fixedHeaderHeight = isNative ? 64 : 0;
          const topOffset = safeAreaTop + fixedHeaderHeight + 20;
          
          if (triggerRect.top < topOffset) {
            trigger.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          }
        }, 100);
      }
    };

    selectTriggers.forEach((trigger) => {
      trigger.addEventListener('click', handleSelectOpen);
    });

    return () => {
      // Remove listener from document
      document.removeEventListener('focusin', handleInputFocus, true);
      
      // Remove listeners from all inputs
      const allInputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input, textarea, .PhoneInputInput, .PhoneInput input, [class*="PhoneInput"] input'
      );
      allInputs.forEach((input) => {
        input.removeEventListener('focus', handleInputFocus, true);
        input.removeEventListener('focusin', handleInputFocus, true);
      });
      
      selectTriggers.forEach((trigger) => {
        trigger.removeEventListener('click', handleSelectOpen);
      });
      
      observer.disconnect();
    };
  }, [enabled, submitButtonRef, formRef, scrollDelay, bottomOffset]);

  // REMOVE THE SECOND useEffect (lines 357-501) - it's causing aggressive scrolling
  // The gentle scroll logic above is sufficient

  return { inputRefs };
};

