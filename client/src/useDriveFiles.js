import { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:5000';

export default function useDriveFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/drive-files`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
      } else {
        setError(data.error || 'Failed to load Drive files.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { files, loading, error, reload: load };
}
