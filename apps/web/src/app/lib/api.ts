const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FetchOptions extends RequestInit {
  skipRedirect?: boolean;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipRedirect, ...fetchOptions } = options;

  const headers: HeadersInit = {
    ...fetchOptions.headers,
  };

  if (fetchOptions.method && ["POST", "PUT", "PATCH"].includes(fetchOptions.method)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && !skipRedirect) {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      message: "요청 처리 중 오류가 발생했습니다",
    }));
    const errData = errorBody as { error?: string; message?: string };
    throw new Error(errData.error || errData.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
