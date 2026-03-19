export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const resolveMediaUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  try {
    return new URL(value, API_BASE_URL).toString();
  } catch {
    return value;
  }
};

export const toRelativeApiPath = (value) => {
  if (!value) return value;

  try {
    const decodedUrl = new URL(value);
    const apiUrl = new URL(API_BASE_URL);

    if (decodedUrl.origin === apiUrl.origin) {
      return `${decodedUrl.pathname}${decodedUrl.search}`;
    }
  } catch {
    return value;
  }

  return value;
};
