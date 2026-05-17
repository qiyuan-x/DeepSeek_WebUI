import { useState, useRef, useCallback, useEffect } from 'react';

export const useChatScroll = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 150;
    
    isAtBottomRef.current = isAtBottom;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return {
    chatContainerRef,
    messagesEndRef,
    isAtBottomRef,
    handleScroll,
    scrollToBottom
  };
};
