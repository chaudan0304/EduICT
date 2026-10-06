async function request(path, body) {
  const response = await fetch(`/api/onedrive/${path}`, {
    ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    credentials: 'same-origin', signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Không thể xử lý OneDrive.'), { statusCode: response.status });
  return result;
}

export const oneDriveStatus = () => request('status');
export const connectOneDrive = clientId => request('connect', { clientId });
export const pollOneDrive = () => request('poll', {});
export const disconnectOneDrive = () => request('disconnect', {});
export const fetchOneDriveFolder = id => request(`folder${id ? `?id=${encodeURIComponent(id)}` : ''}`);
export const importOneDriveFiles = items => request('imports', { items, confirmEmbed: true });
export const fetchOneDriveImport = id => request(`imports/${encodeURIComponent(id)}`);
export const cancelOneDriveImport = id => request(`imports/${encodeURIComponent(id)}`, {});
