const API_BASE = "/api";

export const getApiBase = () => API_BASE;

export const getStoredToken = () => localStorage.getItem("bizlift_token");

export const getWorkspaceContext = () => {
  const officeId = sessionStorage.getItem("selected_office") || "";
  const vendorId = sessionStorage.getItem("selected_vendor") || "";

  return { officeId, vendorId };
};

export const apiUrl = (path) => {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) {
    return path.replace(/^https?:\/\/[^/]+/, "");
  }
  return path.startsWith("/") ? path : `/${path}`;
};

export const withWorkspace = (url) => {
  const normalizedUrl = apiUrl(url);
  const { officeId, vendorId } = getWorkspaceContext();
  const separator = normalizedUrl.includes("?") ? "&" : "?";

  return `${normalizedUrl}${separator}officeId=${encodeURIComponent(
    officeId,
  )}&vendorId=${encodeURIComponent(vendorId)}`;
};

export const apiFetch = async (
  url,
  { includeWorkspace = true, headers = {}, ...options } = {},
) => {
  const token = getStoredToken();
  const finalUrl = includeWorkspace ? withWorkspace(url) : apiUrl(url);

  const response = await fetch(finalUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("bizlift_token");
    localStorage.removeItem("bizlift_user");
    sessionStorage.removeItem("selected_office");
    sessionStorage.removeItem("selected_vendor");
  }

  return response;
};
