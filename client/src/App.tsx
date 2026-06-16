import { useState } from 'react';

export default function App() {
  const [loading, setLoading] = useState<boolean>(false);
  const [readmeText, setReadmeText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const generateReadme = async () => {
    setLoading(true);
    setErrorMessage('');
    setReadmeText('');

    try {
      // React reaches directly out to our Express server pipeline
      const response = await fetch('http://localhost:5000/generate-readme');
      const payload = await response.json();

      if (payload.status === 'success') {
        setReadmeText(payload.data.markdownContent);
      } else {
        setErrorMessage(payload.error || 'An unexpected error occurred.');
      }
    } catch (error: any) {
      setErrorMessage('Could not connect to the backend server. Make sure your server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header Panel */}
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#38bdf8', marginBottom: '10px' }}>
            🤖 AI Readme Document Generator
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            Scan your workspace folders and build markdown documentation instantly using Gemini AI.
          </p>
        </header>

        {/* Action Trigger Block */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <button 
            onClick={generateReadme}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#64748b' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '14px 28px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          >
            {loading ? '⏳ Analyzing Workspace & Writing...' : '⚡ Scan & Generate README.md'}
          </button>
        </div>

        {/* Dynamic State Handlers */}
        {errorMessage && (
          <div style={{
            backgroundColor: '#7f1d1d',
            border: '1px solid #f87171',
            color: '#fca5a5',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        {/* Output Text Window Result Display */}
        {readmeText && (
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #334155',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}>
              <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>📄 Generated Markdown Code</span>
              <button 
                onClick={() => navigator.clipboard.writeText(readmeText)}
                style={{
                  backgroundColor: '#334155',
                  color: '#e2e8f0',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#475569')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
              >
                📋 Copy Text
              </button>
            </div>
            
            <pre style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'Courier New, Courier, monospace',
              color: '#cbd5e1',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              margin: '0'
            }}>
              {readmeText}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}
