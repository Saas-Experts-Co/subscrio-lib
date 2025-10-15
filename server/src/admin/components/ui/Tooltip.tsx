import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateTooltipPosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top + scrollY - 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + 8;
        left = triggerRect.left + scrollX + triggerRect.width / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + triggerRect.height / 2;
        left = triggerRect.left + scrollX - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollY + triggerRect.height / 2;
        left = triggerRect.right + scrollX + 8;
        break;
    }

    setTooltipPosition({ top, left });
  };

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      updateTooltipPosition();
      setIsVisible(true);
    }, 500);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      const handleScroll = () => updateTooltipPosition();
      const handleResize = () => updateTooltipPosition();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible, position]);

  const getTooltipClasses = () => {
    const baseClasses = 'px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded-md shadow-lg dark:bg-gray-700 whitespace-nowrap transition-opacity duration-300 pointer-events-none';
    const positionClasses = {
      top: '-translate-x-1/2 -translate-y-full',
      bottom: '-translate-x-1/2',
      left: '-translate-y-1/2 -translate-x-full',
      right: '-translate-y-1/2',
    };
    
    return `${baseClasses} ${positionClasses[position]} ${className}`;
  };

  const tooltipElement = isVisible ? (
    <div
      className={`fixed z-[9999] ${getTooltipClasses()}`}
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
      }}
    >
      {content}
      <div className={`absolute w-2 h-2 bg-gray-800 dark:bg-gray-700 transform rotate-45 ${
        position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
        position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
        position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
        'left-[-4px] top-1/2 -translate-y-1/2'
      }`}></div>
    </div>
  ) : null;

  return (
    <>
      <div 
        ref={triggerRef}
        className="inline-block" 
        onMouseEnter={showTooltip} 
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>
      {typeof document !== 'undefined' && createPortal(tooltipElement, document.body)}
    </>
  );
};