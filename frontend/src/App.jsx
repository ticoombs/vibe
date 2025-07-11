import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');
  const [path, setPath] = useState(() => decodeURIComponent(window.location.pathname.slice(1)) || "");
  const [history, setHistory] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loginError, setLoginError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Simple in-memory cache for folder listings
  const [folderCache, setFolderCache] = useState({});

  useEffect(() => {
    if (!token) return;
    // Only use cache if it is non-empty (avoid caching errors)
    if (folderCache[path] && Array.isArray(folderCache[path]) && folderCache[path].length > 0) {
      setAllFiles(folderCache[path]);
      return;
    }
    fetch(`/files?sort=name&order=asc&path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) {
          setToken('');
          localStorage.removeItem('token');
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAllFiles(data);
          setFolderCache(prev => ({ ...prev, [path]: data }));
        } else {
          setAllFiles([]);
        }
      });
  }, [path, token]);

  function naturalCompare(a, b) {
    // Use Intl.Collator with numeric option for natural sort
    return new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare(a, b);
  }

  useEffect(() => {
    let sorted = [...allFiles];
    // Always sort folders first, then files
    sorted.sort((a, b) => {
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;
      let vA, vB;
      if (sort === 'name') {
        vA = a.name;
        vB = b.name;
        const cmp = naturalCompare(vA, vB);
        return order === 'asc' ? cmp : -cmp;
      } else if (sort === 'size') { vA = a.size; vB = b.size; }
      else if (sort === 'modified') { vA = a.modified; vB = b.modified; }
      if (vA < vB) return order === 'asc' ? -1 : 1;
      if (vA > vB) return order === 'asc' ? 1 : -1;
      return 0;
    });
    setFiles(sorted);
  }, [allFiles, sort, order]);

  useEffect(() => {
    if (path !== decodeURIComponent(window.location.pathname.slice(1))) {
      window.history.replaceState(null, '', '/' + encodeURIComponent(path));
    }
  }, [path]);

  const enterFolder = (folderName) => {
    setHistory([...history, path]);
    setPath(path ? `${path}/${folderName}` : folderName);
  };

  const goUp = () => {
    if (history.length > 0) {
      setPath(history[history.length - 1]);
      setHistory(history.slice(0, -1));
    } else {
      setPath("");
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    })
      .then(res => res.json())
      .then(data => {
        if (data.access_token) {
          setToken(data.access_token);
          localStorage.setItem('token', data.access_token);
          setLoginError('');
        } else {
          setLoginError('Invalid credentials');
        }
      });
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
  };

  const handleHeaderClick = (col) => {
    if (sort === col) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('asc'); }
  };

  // Download handler for files with auth and one-time token
  const handleDownload = async (fileName) => {
    // Encode each path segment for both endpoints
    const filePath = path ? path + '/' + fileName : fileName;
    const segments = filePath.split('/').map(encodeURIComponent);
    const encodedPath = segments.join('/');
    try {
      // Request a one-time token with encoded path
      const res = await fetch(`/download-token/${encodedPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to get download token');
      const data = await res.json();
      const downloadUrl = `/download/${encodedPath}?token=${encodeURIComponent(data.token)}`;
      // Create a temporary <a> and click it to start download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Download failed. Please try again.');
    }
  };

  // Copy link handler for files
  const handleCopyLink = async (fileName) => {
    const filePath = path ? path + '/' + fileName : fileName;
    const segments = filePath.split('/').map(encodeURIComponent);
    const encodedPath = segments.join('/');
    try {
      const res = await fetch(`/download-token/${encodedPath}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to get download token');
      const data = await res.json();
      const downloadUrl = `${window.location.origin}/download/${encodedPath}?token=${encodeURIComponent(data.token)}`;
      await navigator.clipboard.writeText(downloadUrl);
      alert('Download link copied to clipboard!');
    } catch (e) {
      alert('Failed to copy link. Please try again.');
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handleLogin} style={{ background: '#23272f', padding: 0, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', minWidth: 320 }}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '90%', marginBottom: 16, padding: 10, borderRadius: 6, border: '1px solid #444', background: '#181c24', color: '#fff', fontSize: 16 }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '90%', marginBottom: 16, padding: 10, borderRadius: 6, border: '1px solid #444', background: '#181c24', color: '#fff', fontSize: 16 }} />
          {loginError && <div style={{ color: '#ff5252', marginBottom: 12 }}>{loginError}</div>}
          <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 6, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh'}}>
      <div style={{ maxWidth: '85vw', width: '100%', margin: '0 auto', padding: 32, background: 'none', borderRadius: 0, boxShadow: 'none', marginTop: 0, position: 'relative' }}>
        <button
          onClick={handleLogout}
          style={{ position: 'absolute', top: 24, right: 32, background: '#23272f', color: '#b0b0b0', border: '1px solid #b0b0b0', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 16, fontFamily: 'monospace' }}
          aria-label="Logout"
        >Logout</button>
        {/* <h1 style={{ fontWeight: 700, fontSize: 32, marginBottom: 8, color: '#90caf9', letterSpacing: 1, fontFamily: 'monospace' }}>Files</h1> */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        </div>
        <div style={{ marginBottom: 12, fontSize: 15, color: '#b0b0b0', wordBreak: 'break-all', fontFamily: 'monospace' }}>Path: /{path}</div>
        <div style={{ borderRadius: 8, background: '#23272f', width: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.10)' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 16, color: '#b0b0b0', fontFamily: 'monospace' }} role="table" aria-label="File list">
            <colgroup>
              <col style={{ width: 'auto' }} />
              <col style={{ width: '120px', display: window.innerWidth <= 600 ? 'none' : undefined }} />
              <col style={{ width: '120px', display: window.innerWidth <= 600 ? 'none' : undefined }} />
              <col style={{ width: '120px', whiteSpace: 'nowrap' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#23272f' }}>
                <th scope="col" style={{ textAlign: 'justify', padding: '12px 6px', fontWeight: 700, letterSpacing: 0.5, color: '#b0b0b0', cursor: 'pointer', borderBottom: '1px solid #444', fontFamily: 'monospace' }} onClick={() => handleHeaderClick('name')} tabIndex={0} aria-sort={sort === 'name' ? order : 'none'}> Name {sort === 'name' && (order === 'asc' ? '▲' : '▼')}</th>
                {window.innerWidth > 600 && (
                  <th scope="col" style={{ textAlign: 'right', padding: '12px 6px', color: '#b0b0b0', cursor: 'pointer', borderBottom: '1px solid #444', fontFamily: 'monospace' }} onClick={() => handleHeaderClick('size')} tabIndex={0} aria-sort={sort === 'size' ? order : 'none'}> Size {sort === 'size' && (order === 'asc' ? '▲' : '▼')}</th>
                )}
                {window.innerWidth > 600 && (
                  <th scope="col" style={{ textAlign: 'justify', padding: '12px 6px', color: '#b0b0b0', cursor: 'pointer', borderBottom: '1px solid #444', fontFamily: 'monospace' }} onClick={() => handleHeaderClick('modified')} tabIndex={0} aria-sort={sort === 'modified' ? order : 'none'}> Modified {sort === 'modified' && (order === 'asc' ? '▲' : '▼')}</th>
                )}
                <th scope="col" style={{ textAlign: 'center', padding: '12px 6px', color: '#b0b0b0', borderBottom: '1px solid #444', fontFamily: 'monospace', minWidth: 100, width: 120, whiteSpace: 'nowrap' }}>⬇️</th>
              </tr>
            </thead>
            <tbody>
              {path && (
                <tr
                  style={{ cursor: 'pointer', background: '#23272f' }}
                  onClick={goUp}
                  tabIndex={0}
                  aria-label="Go up one folder"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') goUp(); }}
                >
                  <td colSpan={window.innerWidth > 600 ? 4 : 2} style={{ wordBreak: 'break-all', padding: '10px 12px 10px 10px', color: '#b0b0b0', fontFamily: 'monospace', textAlign: 'justify' }}>
                    <span style={{ fontWeight: 600, fontSize: 16, fontFamily: 'monospace' }}>..</span>
                  </td>
                </tr>
              )}
              {files.map(file => (
                <tr key={file.name} style={{ borderBottom: '1px solid #444', background: file.is_dir ? '#23272f' : 'transparent' }}>
                  <td style={{ wordBreak: 'break-all', padding: '10px 12px 10px 10px', fontWeight: file.is_dir ? 600 : 400, color: file.is_dir ? '#b0b0b0' : '#fff', fontFamily: 'monospace', textAlign: 'justify' }}>
                    {file.is_dir ? (
                      <button style={{ background: 'none', border: 'none', color: '#b0b0b0', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontWeight: 600, fontSize: 16, fontFamily: 'monospace' }} onClick={() => enterFolder(file.name)} aria-label={`Enter folder ${file.name}`}> <span role="img" aria-label="folder">📂</span> {file.name} </button>
                    ) : file.name}
                  </td>
                  {window.innerWidth > 600 && (
                    <td style={{ textAlign: 'right', padding: '10px 6px', fontFamily: 'monospace' }}>{file.is_dir ? '-' : (file.size / (1024 * 1024)).toFixed(2) + ' MB'}</td>
                  )}
                  {window.innerWidth > 600 && (
                    <td style={{ padding: '10px 6px', fontFamily: 'monospace', textAlign: 'justify' }}>{new Date(file.modified * 1000).toLocaleString()}</td>
                  )}
                  <td style={{ textAlign: 'center', padding: '10px 6px', fontFamily: 'monospace', minWidth: 100, width: 120 }}>
                    {!file.is_dir && (
                      <>
                        <a
                          href="#"
                          onClick={e => { e.preventDefault(); handleDownload(file.name); }}
                          style={{
                            color: '#23272f',
                            background: '#b0b0b0',
                            fontWeight: 600,
                            border: '1px solid #b0b0b0',
                            borderRadius: 4,
                            padding: window.innerWidth > 600 ? '4px 24px' : '4px 10px',
                            fontFamily: 'monospace',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            cursor: 'pointer',
                            fontSize:  window.innerWidth > 600 ? 15 : 18,
                            textDecoration: 'none',
                            outline: 'none',
                            marginRight: 8,
                          }}
                          aria-label={`Download ${file.name}`}
                          title="Left click to download, or right click and 'Save As'"
                          data-filename={file.name}
                        >⬇️</a>
                        <button
                          onClick={() => handleCopyLink(file.name)}
                          style={{
                            color: '#23272f',
                            background: '#b0b0b0',
                            fontWeight: 600,
                            border: '1px solid #b0b0b0',
                            borderRadius: 4,
                            padding: window.innerWidth > 600 ? '4px 12px' : '4px 8px',
                            fontFamily: 'monospace',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            cursor: 'pointer',
                            fontSize:  window.innerWidth > 600 ? 15 : 18,
                            textDecoration: 'none',
                            outline: 'none',
                          }}
                          aria-label={`Copy link for ${file.name}`}
                          title="Copy download link to clipboard"
                        >📋</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
