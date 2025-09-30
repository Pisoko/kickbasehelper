'use client';

import { useEffect } from 'react';

export default function BuyMeACoffeeWidget() {
  useEffect(() => {
    // Clean up any existing widgets
    const existingScript = document.querySelector('script[data-name="BMC-Widget"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    const existingWidget = document.querySelector('#bmc-wbtn');
    if (existingWidget) {
      existingWidget.remove();
    }

    const existingFallback = document.querySelector('#bmc-fallback-widget');
    if (existingFallback) {
      existingFallback.remove();
    }

    // Create the script element
    const script = document.createElement('script');
    
    script.setAttribute('data-name', 'BMC-Widget');
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js';
    script.setAttribute('data-id', 'pis0k0');
    script.setAttribute('data-description', 'Support me on Buy me a coffee!');
    script.setAttribute('data-message', 'Vielen Dank, dass du meine Arbeit unterstützt! 🎉');
    script.setAttribute('data-color', '#40DCA5');
    script.setAttribute('data-position', 'Right');
    script.setAttribute('data-x_margin', '18');
    script.setAttribute('data-y_margin', '18');
    script.async = true;
    
    // Add to head first
    document.head.appendChild(script);
    
    script.onload = function () {
      console.log('Buy Me A Coffee widget script loaded');
      // Trigger DOMContentLoaded event
      const evt = document.createEvent('Event');
      evt.initEvent('DOMContentLoaded', false, false);
      window.dispatchEvent(evt);
      

      
      // Check if widget appeared
      setTimeout(() => {
        const widget = document.querySelector('#bmc-wbtn');
        if (widget) {
          console.log('Buy Me A Coffee widget is now visible!');
        } else {
          console.log('Widget script loaded but widget not visible, creating fallback...');
          createFallbackWidget();
        }
      }, 2000);
    };

    script.onerror = function () {
      console.error('Failed to load Buy Me A Coffee widget script, creating fallback...');
      createFallbackWidget();
    };

    function createFallbackWidget() {
      // Remove any existing fallback
      const existingFallback = document.querySelector('#bmc-fallback-widget');
      if (existingFallback) {
        existingFallback.remove();
      }

      // Create fallback widget
      const fallbackWidget = document.createElement('div');
      fallbackWidget.id = 'bmc-fallback-widget';
      fallbackWidget.innerHTML = `
         <a href="https://www.buymeacoffee.com/pis0k0" target="_blank" rel="noopener noreferrer"
            style="
               position: fixed;
               bottom: 18px;
               right: 18px;
               background-color: #40DCA5;
               color: white;
               padding: 6px 8px;
               border-radius: 6px;
               text-decoration: none;
               font-family: Arial, sans-serif;
               font-size: 11px;
               font-weight: 500;
               box-shadow: 0 2px 8px rgba(0,0,0,0.2);
               z-index: 999999;
               transition: all 0.2s ease;
               display: flex;
               align-items: center;
               gap: 4px;
               min-width: auto;
               white-space: nowrap;
             "
            onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.3)'; this.style.backgroundColor='#36B896'"
             onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.2)'; this.style.backgroundColor='#40DCA5'"
         >
           ☕ Buy me a coffee
         </a>
       `;
      
      document.body.appendChild(fallbackWidget);
      console.log('Fallback Buy Me A Coffee widget created');
    }

    // Cleanup function
    return () => {
      const scriptToRemove = document.querySelector('script[data-name="BMC-Widget"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
      
      const widgetToRemove = document.querySelector('#bmc-wbtn');
      if (widgetToRemove) {
        widgetToRemove.remove();
      }
      
      const fallbackToRemove = document.querySelector('#bmc-fallback-widget');
      if (fallbackToRemove) {
        fallbackToRemove.remove();
      }
    };
  }, []);

  return <div id="supportByBMC"></div>;
}