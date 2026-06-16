import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ===================================================================
   DOCUENGINE PRO v3.0
   Documentation Generation Platform
   
   Clean, simple, boxed UI for users at any stage.
   Pages: Dashboard | Generator | Repositories | Archives | Settings
   =================================================================== */

interface SavedDocument {
  _id: string;
  projectPath: string;
  markdownContent: string;
  createdAt: string;
  configOptions: string[];
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type PageKey = 'dashboard' | 'generator' | 'repositories' | 'archives' | 'settings';

/* ===================================================================
   UTILITY FUNCTIONS
   =================================================================== */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ===================================================================
   THEME — Clean Midnight
   =================================================================== */

const C = {
  bg: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  border: '#334155',
  text: '#F1F5F9',
  muted: '#94A3B8',
  accent: '#3B82F6',
  accentHover: '#2563EB',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  inputBg: '#0F172A',
};

/* ===================================================================
   MAIN APP
   =================================================================== */

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const pushToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ---- Generator State ---- */
  const [repoUrl, setRepoUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [genMode, setGenMode] = useState<'simple' | 'detailed' | 'complete'>('simple');
  const [genSteps, setGenSteps] = useState<string[]>([]);
  const [showWorkspace, setShowWorkspace] = useState(false);

  /* ---- Repositories State ---- */
  const mockRepos = [
    { name: 'react-ecommerce', score: 84, lang: 'TypeScript', status: 'healthy', desc: 'Full-stack e-commerce platform' },
    { name: 'nestjs-api-gateway', score: 91, lang: 'TypeScript', status: 'healthy', desc: 'API gateway with microservices' },
    { name: 'data-pipeline-engine', score: 67, lang: 'Python', status: 'warning', desc: 'Real-time data processing' },
    { name: 'ml-training-platform', score: 78, lang: 'Python', status: 'healthy', desc: 'ML training orchestration' },
    { name: 'saas-boilerplate', score: 95, lang: 'TypeScript', status: 'healthy', desc: 'Production SaaS starter' },
  ];

  const mockHistory: SavedDocument[] = useMemo(() => {
    const now = Date.now();
    return [
      { _id: 'h1', projectPath: 'react-ecommerce', markdownContent: '# Ecommerce\n\nFull-stack platform.', createdAt: new Date(now - 120000).toISOString(), configOptions: ['detailed'] },
      { _id: 'h2', projectPath: 'nestjs-api-gateway', markdownContent: '# API Gateway\n\nMicroservices gateway.', createdAt: new Date(now - 3600000).toISOString(), configOptions: ['complete'] },
      { _id: 'h3', projectPath: 'ml-training-platform', markdownContent: '# ML Platform\n\nTraining infrastructure.', createdAt: new Date(now - 7200000).toISOString(), configOptions: ['detailed'] },
      { _id: 'h4', projectPath: 'saas-boilerplate', markdownContent: '# SaaS Boilerplate\n\nStarter kit.', createdAt: new Date(now - 14400000).toISOString(), configOptions: ['simple'] },
    ];
  }, []);

  /* ---- Boot: health check ---- */
  useEffect(() => {
    const check = async (url: string) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      try { await fetch(url, { signal: controller.signal }); return true; }
      catch { return false; }
      finally { clearTimeout(t); }
    };
    check('http://localhost:5000/').then(() => {});
    check('http://localhost:8000/').then(() => {});
  }, []);

  /* ================================================================
     GENERATION HANDLER
     ================================================================ */

  const handleGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || repoUrl.trim().length < 8) return;
    setGenerating(true);
    setShowWorkspace(false);

    const steps = ['Analyzing repository…', 'Fetching files…', 'Building structure…', 'Generating documentation…', 'Finalizing…'];
    setGenSteps(steps);

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
      setGenSteps((prev) => prev.map((s, idx) => idx <= i ? s : steps[i]));
    }

    const mock = `# ${repoUrl.split('/').pop() || 'Repository'}

> Generated by DocuEngine Pro

## Overview

This README provides comprehensive documentation for the repository.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Features

- Feature 1
- Feature 2
- Feature 3

## Tech Stack

- React
- TypeScript
- Node.js

## License

MIT`;

    setGeneratedText(mock);
    setShowWorkspace(true);
    setGenerating(false);
    pushToast('✅ Documentation generated successfully', 'success');
  }, [repoUrl, pushToast]);

  /* ================================================================
     NAVIGATION
     ================================================================ */

  const navItems: Array<{ key: PageKey; label: string; desc: string }> = [
    { key: 'dashboard', label: 'Dashboard', desc: 'Overview & statistics' },
    { key: 'generator', label: 'Generator', desc: 'Create new documentation' },
    { key: 'repositories', label: 'Repositories', desc: 'Browse all repositories' },
    { key: 'archives', label: 'Archives', desc: 'Historical documents' },
    { key: 'settings', label: 'Settings', desc: 'Configure preferences' },
  ];

  const pageLabels: Record<PageKey, string> = {
    dashboard: 'Dashboard',
    generator: 'Documentation Generator',
    repositories: 'Repositories',
    archives: 'Archives',
    settings: 'Settings',
  };

  /* ================================================================
     RENDER: SIDEBAR
     ================================================================ */

  const renderSidebar = () => (
    <aside style={{
      width: sidebarOpen ? 220 : 0,
      minWidth: sidebarOpen ? 220 : 0,
      background: C.surface,
      borderRight: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 200ms ease, min-width 200ms ease',
      overflow: 'hidden',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6,
            background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 13,
          }}>D</div>
          <div>
            <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>DocuEngine Pro</div>
            <div style={{ fontSize: 10.5, color: C.muted }}>v3.0.0</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map((item) => {
          const active = activePage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActivePage(item.key)}
              style={{
                appearance: 'none', border: 'none',
                background: active ? `${C.accent}15` : 'transparent',
                color: active ? C.text : C.muted,
                borderRadius: 6,
                padding: '8px 12px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                transition: 'all 120ms ease',
              }}
            >
              <div>{item.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{item.desc}</div>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
        <div>Workspace: Default</div>
      </div>
    </aside>
  );

  /* ================================================================
     RENDER: HEADER
     ================================================================ */

  const renderHeader = () => (
    <header style={{
      padding: '12px 24px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: C.surface,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setSidebarOpen((p) => !p)}
          style={{
            appearance: 'none', border: `1px solid ${C.border}`,
            background: 'transparent', color: C.muted,
            borderRadius: 4, padding: '4px 8px', cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {sidebarOpen ? '←' : '→'}
        </button>
        <span style={{ fontWeight: 600, color: C.text, fontSize: 15 }}>
          {pageLabels[activePage]}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.success, display: 'inline-block' }} />
        <span>All systems operational</span>
      </div>
    </header>
  );

  /* ================================================================
     PAGE: DASHBOARD
     ================================================================ */

  const renderDashboard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>Dashboard</div>
        <div style={{ fontSize: 13, color: C.muted }}>Overview of your documentation workspace.</div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Documents Generated', value: '128', change: '+12 this week' },
          { label: 'Repositories', value: '46', change: '+3 this week' },
          { label: 'Average Quality', value: '92%', change: '+2.4% vs last week' },
          { label: 'System Uptime', value: '99.8%', change: 'Last 30 days' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, color: C.text, fontSize: 14, marginBottom: 12 }}>Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { action: 'Generated README', repo: 'react-ecommerce', time: '2 min ago' },
              { action: 'Updated documentation', repo: 'nestjs-api-gateway', time: '1 hour ago' },
              { action: 'Analyzed repository', repo: 'ml-training-platform', time: '3 hours ago' },
              { action: 'Score improved', repo: 'saas-boilerplate', time: '6 hours ago' },
            ].map((act, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.text }}>{act.action}</div>
                  <div style={{ fontSize: 11.5, color: C.muted }}>{act.repo} · {act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, color: C.text, fontSize: 14, marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => setActivePage('generator')} style={{
              appearance: 'none', border: `1px solid ${C.accent}`, background: `${C.accent}12`,
              color: C.accent, borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
              textAlign: 'left', fontWeight: 500, fontSize: 13,
            }}>
              Generate New Documentation →
            </button>
            <button onClick={() => setActivePage('repositories')} style={{
              appearance: 'none', border: `1px solid ${C.border}`, background: 'transparent',
              color: C.text, borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
              textAlign: 'left', fontWeight: 500, fontSize: 13,
            }}>
              Browse Repositories →
            </button>
            <button onClick={() => setActivePage('archives')} style={{
              appearance: 'none', border: `1px solid ${C.border}`, background: 'transparent',
              color: C.text, borderRadius: 6, padding: '10px 14px', cursor: 'pointer',
              textAlign: 'left', fontWeight: 500, fontSize: 13,
            }}>
              View Archives →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ================================================================
     PAGE: GENERATOR
     ================================================================ */

  const renderGenerator = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>Documentation Generator</div>
        <div style={{ fontSize: 13, color: C.muted }}>Paste a GitHub repository URL to generate documentation.</div>
      </div>

      {!showWorkspace && (
        <>
          {/* Input Card */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
            <form onSubmit={handleGenerate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: C.text, marginBottom: 6, fontWeight: 500 }}>
                  GitHub Repository URL
                </label>
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: C.inputBg, border: `1px solid ${C.border}`,
                    borderRadius: 6, color: C.text, outline: 'none',
                    fontSize: 13, boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: C.text, marginBottom: 6, fontWeight: 500 }}>
                  Generation Mode
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { key: 'simple' as const, label: 'Simple', desc: 'Core README only' },
                    { key: 'detailed' as const, label: 'Detailed', desc: 'README + Setup + Contributing' },
                    { key: 'complete' as const, label: 'Complete', desc: 'Full documentation suite' },
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setGenMode(mode.key)}
                      style={{
                        flex: 1, appearance: 'none',
                        border: `1px solid ${genMode === mode.key ? C.accent : C.border}`,
                        background: genMode === mode.key ? `${C.accent}12` : 'transparent',
                        color: genMode === mode.key ? C.accent : C.text,
                        borderRadius: 6, padding: '10px', cursor: 'pointer',
                        textAlign: 'center', transition: 'all 120ms ease',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12.5 }}>{mode.label}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || repoUrl.trim().length < 8}
                style={{
                  width: '100%', appearance: 'none', border: 'none',
                  background: generating ? C.border : C.accent,
                  color: 'white', borderRadius: 6, padding: '10px',
                  cursor: generating || repoUrl.trim().length < 8 ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: 13, opacity: generating ? 0.6 : 1,
                }}
              >
                {generating ? 'Generating…' : 'Generate Documentation'}
              </button>
            </form>
          </div>

          {/* Progress Steps */}
          {generating && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, color: C.text, fontSize: 13, marginBottom: 12 }}>Progress</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {genSteps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 13 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: i < genSteps.length - 1 ? C.success : C.accent,
                      color: 'white', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 9, fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {i < genSteps.length - 1 ? '✓' : '◉'}
                    </span>
                    <span style={{ color: i < genSteps.length - 1 ? C.success : C.text }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Workspace (shown after generation) */}
      {showWorkspace && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>README.md</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowWorkspace(false); setRepoUrl(''); setGeneratedText(''); }}
                style={{
                  appearance: 'none', border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.muted, borderRadius: 6,
                  padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                }}
              >
                New Generation
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([generatedText], { type: 'text/markdown;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'README.md';
                  document.body.appendChild(a); a.click(); a.remove();
                  setTimeout(() => URL.revokeObjectURL(url), 1500);
                  pushToast('📥 File downloaded', 'success');
                }}
                style={{
                  appearance: 'none', border: 'none',
                  background: C.accent, color: 'white', borderRadius: 6,
                  padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                }}
              >
                Download
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 400 }}>
            {/* Editor */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.muted, fontWeight: 600 }}>
                MARKDOWN EDITOR
              </div>
              <textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                style={{
                  flex: 1, resize: 'none', background: C.inputBg,
                  border: 'none', color: C.text, padding: 12,
                  fontFamily: 'ui-monospace, monospace', fontSize: 12.5,
                  lineHeight: 1.6, outline: 'none',
                }}
              />
            </div>

            {/* Preview */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.muted, fontWeight: 600 }}>
                PREVIEW
              </div>
              <div style={{
                flex: 1, padding: 16, overflow: 'auto',
                color: C.text, fontSize: 13.5, lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {generatedText.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <div key={i} style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{line.slice(2)}</div>;
                  if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, marginTop: 6, color: C.accent }}>{line.slice(3)}</div>;
                  if (line.startsWith('> ')) return <div key={i} style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: 10, color: C.muted, fontStyle: 'italic', marginBottom: 4 }}>{line.slice(2)}</div>;
                  if (line.startsWith('- ')) return <div key={i} style={{ paddingLeft: 14, marginBottom: 2 }}>• {line.slice(2)}</div>;
                  if (line.startsWith('```')) return <div key={i} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '2px 8px', fontFamily: 'monospace', fontSize: 12, color: C.accent, marginBottom: 2 }}>{line}</div>;
                  if (/^\d+\.\s/.test(line)) return <div key={i} style={{ paddingLeft: 6, marginBottom: 2 }}>{line}</div>;
                  return <div key={i} style={{ marginBottom: 2, color: line.trim() ? C.text : 'transparent' }}>{line || '\u00A0'}</div>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ================================================================
     PAGE: REPOSITORIES
     ================================================================ */

  const renderRepositories = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>Repositories</div>
        <div style={{ fontSize: 13, color: C.muted }}>Browse and manage your repositories.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
        {mockRepos.map((repo) => (
          <div key={repo.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>{repo.name}</div>
              <div style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                background: repo.status === 'healthy' ? `${C.success}15` : `${C.warning}15`,
                color: repo.status === 'healthy' ? C.success : C.warning,
              }}>
                {repo.score}
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{repo.desc}</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: C.muted }}>
              <span>{repo.lang}</span>
              <span>·</span>
              <span style={{ color: repo.status === 'healthy' ? C.success : C.warning }}>{repo.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ================================================================
     PAGE: ARCHIVES
     ================================================================ */

  const renderArchives = () => {
    const [confirmId, setConfirmId] = useState<string | null>(null);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>Archives</div>
          <div style={{ fontSize: 13, color: C.muted }}>Previously generated documents.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {mockHistory.map((doc) => (
            <div key={doc._id} style={{
              background: C.card, border: `1px solid ${confirmId === doc._id ? C.error : C.border}`,
              borderRadius: 8, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'border-color 120ms ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <div>
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 13.5 }}>{doc.projectPath}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{timeAgo(doc.createdAt)} · {doc.configOptions[0]} mode</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{
                  appearance: 'none', border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.text, borderRadius: 4,
                  padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                }}>
                  Open
                </button>
                <button
                  onClick={() => {
                    if (confirmId === doc._id) {
                      setConfirmId(null);
                      pushToast('🗑️ Record deleted', 'info');
                    } else {
                      setConfirmId(doc._id);
                      setTimeout(() => setConfirmId(null), 3000);
                    }
                  }}
                  style={{
                    appearance: 'none',
                    border: `1px solid ${confirmId === doc._id ? C.error : `${C.muted}40`}`,
                    background: confirmId === doc._id ? `${C.error}12` : 'transparent',
                    color: confirmId === doc._id ? C.error : C.muted,
                    borderRadius: 4, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  }}
                >
                  {confirmId === doc._id ? 'Confirm' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ================================================================
     PAGE: SETTINGS
     ================================================================ */

  const renderSettings = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>Settings</div>
        <div style={{ fontSize: 13, color: C.muted }}>Configure your preferences.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          {
            title: 'Editor',
            items: [
              { label: 'Font Size', value: '14px', type: 'text' },
              { label: 'Line Height', value: '1.6', type: 'text' },
              { label: 'Word Wrap', value: 'Enabled', type: 'badge' as const, color: C.success },
            ],
          },
          {
            title: 'Generation',
            items: [
              { label: 'Default Mode', value: 'Detailed', type: 'text' },
              { label: 'AI Model', value: 'Standard', type: 'text' },
              { label: 'Max Output', value: '4,096 chars', type: 'text' },
            ],
          },
          {
            title: 'Export',
            items: [
              { label: 'Default Format', value: 'Markdown', type: 'text' },
              { label: 'Include Metadata', value: 'Yes', type: 'badge' as const, color: C.success },
              { label: 'Auto-download', value: 'No', type: 'badge' as const, color: C.muted },
            ],
          },
          {
            title: 'Notifications',
            items: [
              { label: 'Email Alerts', value: 'Enabled', type: 'badge' as const, color: C.success },
              { label: 'Generation Alerts', value: 'Enabled', type: 'badge' as const, color: C.success },
              { label: 'Monitoring Alerts', value: 'Disabled', type: 'badge' as const, color: C.muted },
            ],
          },
        ].map((section) => (
          <div key={section.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 600, color: C.text, fontSize: 14, marginBottom: 12 }}>{section.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {section.items.map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, color: C.muted }}>{item.label}</span>
                  {item.type === 'badge' ? (
                    <span style={{
                      padding: '1px 8px', borderRadius: 3, fontSize: 11.5, fontWeight: 500,
                      background: `${item.color}15`, color: item.color,
                    }}>
                      {item.value}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12.5, color: C.text }}>{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Data Management */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, color: C.text, fontSize: 14, marginBottom: 12 }}>Data Management</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Export All Data', color: C.accent },
            { label: 'Clear History', color: C.warning },
            { label: 'Create Backup', color: C.success },
          ].map((action) => (
            <button key={action.label} style={{
              appearance: 'none', border: `1px solid ${action.color}40`,
              background: `${action.color}08`, color: action.color,
              borderRadius: 6, padding: '8px 14px', cursor: 'pointer',
              fontWeight: 500, fontSize: 12.5,
            }}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ================================================================
     MAIN LAYOUT
     ================================================================ */

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif',
      display: 'flex',
    }}>
      {renderSidebar()}

      <div style={{
        flex: 1,
        marginLeft: sidebarOpen ? 220 : 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 200ms ease',
        minHeight: '100vh',
      }}>
        {renderHeader()}

        <main style={{
          flex: 1,
          padding: '20px 24px',
          maxWidth: 1100,
          width: '100%',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}>
          {activePage === 'dashboard' && renderDashboard()}
          {activePage === 'generator' && renderGenerator()}
          {activePage === 'repositories' && renderRepositories()}
          {activePage === 'archives' && renderArchives()}
          {activePage === 'settings' && renderSettings()}
        </main>
      </div>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', top: 72, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
          {toasts.map((t) => {
            const bg = t.type === 'success' ? `${C.success}15` : t.type === 'error' ? `${C.error}15` : `${C.accent}12`;
            const border = t.type === 'success' ? `${C.success}30` : t.type === 'error' ? `${C.error}30` : `${C.accent}25`;
            return (
              <div key={t.id} style={{
                background: bg, border: `1px solid ${border}`,
                borderRadius: 6, padding: '8px 12px',
                color: C.text, fontSize: 13, fontWeight: 500,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                animation: 'slideIn 0.2s ease',
              }}>
                {t.message}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.12); border-radius: 2px; }
        input::placeholder { color: #475569; }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}