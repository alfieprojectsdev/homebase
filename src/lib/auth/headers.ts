export function getAuthHeaders() {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  return {
    'Content-Type': 'application/json',
    ...(cookies.token ? { Cookie: `token=${cookies.token}` } : {}),
  };
}
