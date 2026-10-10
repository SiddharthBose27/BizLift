export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem("bizlift_user") || "null"); } catch { return null; }
};

export const getStoredPermissions = () => getStoredUser()?.permissions || [];

export const hasPermission = (permission) => {
  const permissions = getStoredPermissions();
  return permissions.includes("*") || permissions.includes(permission);
};

export const clearAuth = () => {
  localStorage.removeItem("bizlift_token");
  localStorage.removeItem("bizlift_user");
  sessionStorage.removeItem("selected_office");
  sessionStorage.removeItem("selected_vendor");
};
