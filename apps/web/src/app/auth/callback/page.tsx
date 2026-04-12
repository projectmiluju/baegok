"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../lib/auth-store";

const TEXT = {
  loading: "로그인 중...",
} as const;

export default function AuthCallbackPage() {
  const { setAuth, checkAuth } = useAuthStore();
  const router = useRouter();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function handleCallback() {
      try {
        await checkAuth();
        const { user } = useAuthStore.getState();
        if (user) {
          setAuth(user);
          router.replace("/dashboard");
        } else {
          router.replace("/");
        }
      } catch {
        router.replace("/");
      }
    }

    handleCallback();
  }, [checkAuth, setAuth, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: "var(--color-cta)",
            borderTopColor: "transparent",
          }}
        />
        <span style={{ color: "var(--color-text-secondary)" }}>{TEXT.loading}</span>
      </div>
    </div>
  );
}
