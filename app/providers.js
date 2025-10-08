"use client";

import { AuthProvider } from "../hooks/useAuth";
import { MediaOverlayProvider } from "../components/MediaOverlayProvider";
import MediaOverlayRoot from "../components/MediaOverlayRoot";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <MediaOverlayProvider>
        {children}
        <MediaOverlayRoot />
      </MediaOverlayProvider>
    </AuthProvider>
  );
}
