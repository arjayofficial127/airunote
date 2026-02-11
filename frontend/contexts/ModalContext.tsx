'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ModalState {
  isOpen: boolean;
}

interface ModalContextValue {
  // Register a modal by ID
  registerModal: (modalId: string) => void;
  // Unregister a modal
  unregisterModal: (modalId: string) => void;
  // Open a modal by ID
  openModal: (modalId: string) => void;
  // Close a modal by ID
  closeModal: (modalId: string) => void;
  // Toggle a modal by ID
  toggleModal: (modalId: string) => void;
  // Get modal state
  getModalState: (modalId: string) => boolean;
  // Subscribe to modal state changes
  subscribe: (modalId: string, callback: (isOpen: boolean) => void) => () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  // Map of modalId -> state
  const [modalStates, setModalStates] = useState<Map<string, ModalState>>(new Map());
  // Map of modalId -> callbacks
  const [subscribers, setSubscribers] = useState<Map<string, Set<(isOpen: boolean) => void>>>(new Map());

  const registerModal = useCallback((modalId: string) => {
    setModalStates((prev) => {
      const next = new Map(prev);
      if (!next.has(modalId)) {
        next.set(modalId, { isOpen: false });
      }
      return next;
    });
  }, []);

  const unregisterModal = useCallback((modalId: string) => {
    setModalStates((prev) => {
      const next = new Map(prev);
      next.delete(modalId);
      return next;
    });
    setSubscribers((prev) => {
      const next = new Map(prev);
      next.delete(modalId);
      return next;
    });
  }, []);

  const openModal = useCallback((modalId: string) => {
    setModalStates((prev) => {
      const next = new Map(prev);
      const current = next.get(modalId) || { isOpen: false };
      next.set(modalId, { isOpen: true });
      return next;
    });
    
    // Notify subscribers
    const callbacks = subscribers.get(modalId);
    if (callbacks) {
      callbacks.forEach((callback) => callback(true));
    }
  }, [subscribers]);

  const closeModal = useCallback((modalId: string) => {
    setModalStates((prev) => {
      const next = new Map(prev);
      const current = next.get(modalId) || { isOpen: false };
      next.set(modalId, { isOpen: false });
      return next;
    });
    
    // Notify subscribers
    const callbacks = subscribers.get(modalId);
    if (callbacks) {
      callbacks.forEach((callback) => callback(false));
    }
  }, [subscribers]);

  const toggleModal = useCallback((modalId: string) => {
    const currentState = modalStates.get(modalId)?.isOpen || false;
    if (currentState) {
      closeModal(modalId);
    } else {
      openModal(modalId);
    }
  }, [modalStates, openModal, closeModal]);

  const getModalState = useCallback((modalId: string): boolean => {
    return modalStates.get(modalId)?.isOpen || false;
  }, [modalStates]);

  const subscribe = useCallback((modalId: string, callback: (isOpen: boolean) => void) => {
    setSubscribers((prev) => {
      const next = new Map(prev);
      if (!next.has(modalId)) {
        next.set(modalId, new Set());
      }
      next.get(modalId)!.add(callback);
      return next;
    });

    // Return unsubscribe function
    return () => {
      setSubscribers((prev) => {
        const next = new Map(prev);
        const callbacks = next.get(modalId);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            next.delete(modalId);
          }
        }
        return next;
      });
    };
  }, []);

  const value: ModalContextValue = {
    registerModal,
    unregisterModal,
    openModal,
    closeModal,
    toggleModal,
    getModalState,
    subscribe,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

// Safe version that returns null if context is not available (for components that may render outside ModalProvider)
export function useModalSafe(): ModalContextValue | null {
  return useContext(ModalContext);
}

