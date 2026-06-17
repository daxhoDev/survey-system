const baseURL = ""; // use your own URL or environment variable

let activeRefreshPromise: Promise<boolean> | null = null;

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

  const response = await fetch(targetUrl, {
    method,
    body,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json();

    // If 401 Unauthorized, try to refresh the token and retry the request
    if (response.status === 401 && !url.includes("/users/refresh")) {
      try {
        if (!activeRefreshPromise) {
          const apiIndex = url.indexOf("/api/v1/");
          const host = apiIndex !== -1 ? url.substring(0, apiIndex) : "";
          const refreshUrl = `${host}/api/v1/users/refresh`;

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
          const retryResponse = await fetch(targetUrl, {
            method,
            body,
            headers,
            credentials: 'include'
          });

          if (retryResponse.ok) {
            return retryResponse.json();
          } else {
            const retryError = await retryResponse.json();
            throw retryError;
          }
        }
      } catch (refreshError) {
        throw errorData;
      }
    }

    throw errorData;
  }

  return response.json();
};

export default customInstance;
