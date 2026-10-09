import { env } from "@/config/env";

// Generated paths are relative (/api/v1/...); the host comes from VITE_API_URL.
const baseURL = env.API_URL;

let activeRefreshPromise: Promise<boolean> | null = null;

// Every thrown error is a problem object with a `detail`, so toasts that show
// `error.detail` are never empty (FE-09).
const networkProblem = {
  type: "about:blank",
  status: 0,
  title: "Network error",
  detail: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
};

async function request(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw networkProblem;
  }
}

async function readProblem(response: Response) {
  const problem = await response.json().catch(() => null);
  return {
    type: "about:blank",
    status: response.status,
    title: "Unexpected error",
    ...problem,
    detail:
      problem?.detail || "El servidor respondió con un error inesperado.",
  };
}

export const customInstance = async <T>(
  url: string,
  {
    method,
    params,
    headers,
    body,
  }: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    params?: Record<string, any>;
    body?: BodyInit | null;
    responseType?: string;
    headers?: HeadersInit;
  },
): Promise<T> => {
  let targetUrl = `${baseURL}${url}`;

  if (params) {
    targetUrl += "?" + new URLSearchParams(params);
  }

  const response = await request(targetUrl, {
    method,
    body,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await readProblem(response);

    // If 401 Unauthorized, try to refresh the token and retry the request
    if (response.status === 401 && !url.includes("/users/refresh")) {
      try {
        if (!activeRefreshPromise) {
          const refreshUrl = `${baseURL}/api/v1/users/refresh`;

          activeRefreshPromise = fetch(refreshUrl, {
            method: "POST",
            credentials: "include",
          })
            .then((res) => res.ok)
            .catch(() => false)
            .finally(() => {
              activeRefreshPromise = null;
            });
        }

        const refreshSuccessful = await activeRefreshPromise;

        if (refreshSuccessful) {
          const retryResponse = await request(targetUrl, {
            method,
            body,
            headers,
            credentials: "include",
          });

          if (retryResponse.ok) {
            return retryResponse.json();
          } else {
            const retryError = await readProblem(retryResponse);
            throw retryError;
          }
        }
      } catch (refreshError) {
        throw errorData;
      }
    }

    throw errorData;
  }

  if (response.status === 204) {
    return null as unknown as T;
  }
  return response.json();
};

export default customInstance;
