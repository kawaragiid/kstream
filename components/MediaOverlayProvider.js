"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const MediaOverlayContext = createContext(null);

export function MediaOverlayProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    media: null,
    origin: null,
    options: {},
  });

  const openMedia = useCallback((media, options = {}) => {
    if (!media) return;
    setState({
      isOpen: true,
      media,
      origin: options.origin || null,
      options,
    });
  }, []);

  const closeMedia = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const resetMedia = useCallback(() => {
    setState({
      isOpen: false,
      media: null,
      origin: null,
      options: {},
    });
  }, []);

  const value = useMemo(
    () => ({
      isOpen: state.isOpen,
      media: state.media,
      origin: state.origin,
      options: state.options,
      openMedia,
      closeMedia,
      resetMedia,
    }),
    [state, openMedia, closeMedia, resetMedia]
  );

  return <MediaOverlayContext.Provider value={value}>{children}</MediaOverlayContext.Provider>;
}

export function useMediaOverlay() {
  const context = useContext(MediaOverlayContext);
  if (!context) {
    throw new Error("useMediaOverlay must be used within a MediaOverlayProvider");
  }
  return context;
}
