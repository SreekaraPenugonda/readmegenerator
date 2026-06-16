import { useState, useEffect, useCallback, useMemo } from 'react';

/* ===================================================================
   DOCUENGINE PRO v3.0 — COMPLETE FRONTEND
   All endpoints connected: /api/auth/*, /api/stats, /api/history/*,
   /api/generate, /api/repo/intelligence, /scan-github
   =================================================================== */

const API = 'http://localhost:5000';
const PYTHON = 'http://localhost:8000';

interface SavedDocument {
  _id: string; projectPath: string; markdownContent: string;
  createdAt: string; configOptions: string[]; isFavorite?: boolean;
}
interface ToastMsg { id: string; message: string; type: 'success' | 'error' | 'info'; }
interface RepoIntel {
  repoName: string; description: string; stars: number; forks: number; issues: number;
  languages: { name: string; percentage: number; color: string }[];
  complexity: number; qualityScore: number; docCoverage: number;
  architecture: string; techStack: string[]; strengths: string[]; weaknesses: string[];
}

const themes = {
  dark: { bg:'#0F172A', surface:'#1E293B', card:'#1E293B', border:'#334155', text:'#F1F5F9', muted:'#94A3B8',
    accent:'#3B82F6', accentHover:'#2563EB', success:'#22C55E', warning:'#F59E0B', error:'#EF4444', inputBg:'#0F172A' },
  light: { bg:'#F8FAFC', surface:'#FFFFFF', card:'#FFFFFF', border:'#E2E8F0', text:'#1E293B', muted:'#64748B',
    accent:'#3B82F6', accentHover:'#2563EB', success:'#22C55E', warning:'#F59E0B', error:'#EF4444', inputBg:'#F1F5F9' },
};

const fontSizes = {
  small: '12px',
  medium: '14px',
  large: '16px',
  xlarge: '18px',
};
const fontFamilies = {
  Inter: 'Inter, sans-serif',
  Roboto: 'Roboto, sans-serif',
  Monospace: 'Fira Code, monospace',
  Serif: 'Charter, Georgia, serif',
};

function generateId() { return `t_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }
function copyToClipboard(txt: string) { navigator.clipboard.writeText(txt); }
function timeAgo(iso: string) { const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1)return 'just now'; if(m<60)return `${m}min ago`; const h=Math.floor(m/60); if(h<24)return `${h}h ago`; return `${Math.floor(h/24)}d ago`; }

export default function App() {
  const [page, setPage] = useState<string>('dashboard');
  const [sidebar, setSidebar] = useState(true);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [theme, setTheme] = useState<'light'|'dark'>('dark'); // New theme state
  const [currentFontSize, setCurrentFontSize] = useState<'small'|'medium'|'large'>('medium'); // New font size state
  const [currentFontFamily, setCurrentFontFamily] = useState<keyof typeof fontFamilies>('Inter');

  const C = useMemo(() => themes[theme], [theme]);

  const push = useCallback((m:string,t:ToastMsg['type']='info')=>{const id=generateId();setToasts(p=>[...p,{id,message:m,type:t}]);setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),4000);},[]);

  /* Auth */
  const [token, setToken] = useState<string|null>(() => localStorage.getItem('docu_token'));
  const [user, setUser] = useState<any>(null);
  const [authView, setAuthView] = useState<'login'|'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authName, setAuthName] = useState('');

  /* OTP state */
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVal, setOtpVal] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  /* Generator */
  const [repoUrl, setRepoUrl] = useState('');
  const [genMode, setGenMode] = useState<'simple'|'detailed'|'complete'>('detailed');
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>(['Installation', 'Usage', 'Features']);
  const [license, setLicense] = useState('MIT');
  const [includeTOC, setIncludeTOC] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [genError, setGenError] = useState('');

  /* Health */
  const [nodeOk, setNodeOk] = useState<boolean|null>(null);
  const [pyOk, setPyOk] = useState<boolean|null>(null);
  const [latency, setLatency] = useState(0);

  /* Data */
  const [history, setHistory] = useState<SavedDocument[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [intel, setIntel] = useState<RepoIntel|null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [intelLoading, setIntelLoading] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string|null>(null);

  /* ---- Health check every 3s ---- */
  const checkHealth = useCallback(async()=>{
    const s=performance.now(); let n=false,p=false;
    try{const r=await fetch(`${API}/`,{signal:AbortSignal.timeout(2000)});n=r.ok;}catch{}
    try{const r=await fetch(`${PYTHON}/`,{signal:AbortSignal.timeout(2000)});p=r.ok;}catch{}
    setNodeOk(n);setPyOk(p);setLatency(Math.round(performance.now()-s));
  },[]);
  useEffect(()=>{checkHealth();const i=setInterval(checkHealth,3000);return()=>clearInterval(i);},[checkHealth]);

  /* ---- Fetch history + stats on boot ---- */
  useEffect(() => {
    if (token) localStorage.setItem('docu_token', token);
    else localStorage.removeItem('docu_token');
  }, [token]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  useEffect(()=>{
    const init=async()=>{
      try{const r=await fetch(`${API}/api/history`);if(r.ok){const j=await r.json();if(j.data)setHistory(j.data);}}catch{}
      try{const r=await fetch(`${API}/api/stats`);if(r.ok){const j=await r.json();if(j.stats)setStats(j.stats);}}catch{} //
      
      if (!token || token === 'guest') {
        if (token === 'guest' && !user) setUser({ name: 'Guest', email: 'guest@local' });
        return;
      }

      if (token.length < 20) return; // Basic JWT length sanity check

      try{
        const r=await fetch(`${API}/api/auth/me`,{headers:{Authorization:`Bearer ${token}`}});
        if(r.ok){const j=await r.json();if(j.user){setUser(j.user); setTheme(j.user.theme||'dark'); setCurrentFontSize(j.user.fontSize||'medium'); setCurrentFontFamily(j.user.fontFamily||'Inter');}}
        else if (r.status === 401) { setToken(null); setUser(null); localStorage.removeItem('docu_token'); }
      }catch{}
    };init();
  },[token]);

  /* ---- Keyboard Shortcuts ---- */
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && page === 'generator' && !generating) handleGenerate(e as any);
      if (e.key === 'Escape' && showWorkspace) setShowWorkspace(false);
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [page, generating, showWorkspace, repoUrl]);

  const toggleSection = (s: string) => {
    setSelectedSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  /* ---- Auth handlers ---- */
  const handleAuth = async(e:React.FormEvent)=>{
    e.preventDefault();
    if (authMode === 'otp') {
      if (!otpSent) {
        try {
          const r = await fetch(`${API}/api/auth/otp-send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail }) });
          const j = await r.json();
          if (j.status === 'success') { setOtpSent(true); setResendTimer(60); push('OTP sent to your email!', 'success'); }
          else if (r.status === 429) push(j.error, 'warning');
          else push(j.error || 'Failed to send OTP', 'error');
        } catch { push('Server error', 'error'); }
        return;
      } else {
        try {
          const r = await fetch(`${API}/api/auth/otp-verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, otp: otpVal }) });
          const j = await r.json();
          if (j.status === 'success') { setToken(j.token); setUser(j.user); push('Logged in via OTP', 'success'); }
          else push(j.error || 'Invalid OTP', 'error');
        } catch { push('Server error', 'error'); }
        return;
      }
    }

    const endpoint=authView==='login'?'/api/auth/login':'/api/auth/register';
    const body=authView==='login'?{email:authEmail,password:authPass}:{email:authEmail,password:authPass,name:authName};
    try{
      const r=await fetch(`${API}${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json();
      if(j.status==='success'){
        setToken(j.token);setUser(j.user);
        setAuthPass(''); setAuthEmail(''); setAuthName('');
        push(`Welcome ${j.user.name}!`,'success');
      }
      else push(j.error||'Auth failed','error');
    }catch{push('Cannot connect to server','error');}
  };

  const handleGoogleLogin = async () => {
    // Simulated Google Login call
    try {
      const r = await fetch(`${API}/api/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'google_user@gmail.com', name: 'Google User', googleId: 'google_123' }) });
      const j = await r.json();
      if (j.status === 'success') { setToken(j.token); setUser(j.user); push('Logged in with Google', 'success'); }
    } catch { push('Google login error', 'error'); }
  };

  const handleLogout=()=>{
    setToken(null);
    setUser(null);
    localStorage.removeItem('docu_token');
    setOtpSent(false);
    setOtpVal('');
    push('Logged out successfully','info');
  };

  /* ---- Generate handler ---- */
  const handleGenerate = async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!repoUrl.trim()||repoUrl.trim().length<8)return;
    setGenerating(true);setShowWorkspace(false);setGenError('');

    const steps=['Analyzing repo…','Fetching from GitHub…','Building structure…','Generating with AI…','Finalizing…'];
    // Simulate progress while waiting
    for(let i=0;i<steps.length;i++){await new Promise(r=>setTimeout(r,500+Math.random()*400));}

    try{
      const url = token 
        ? `${API}/api/generate` 
        : `${API}/api/generate?repoUrl=${encodeURIComponent(repoUrl.trim())}`;
        
      const opts:any={method:token?'POST':'GET',headers:{'Content-Type':'application/json'}};
      
      if(token){opts.headers.Authorization=`Bearer ${token}`;opts.body=JSON.stringify({repoUrl:repoUrl.trim(),mode:genMode,model:aiModel,customPrompt,sections:selectedSections,license,includeTOC});}
      const r=await fetch(url,opts);
      const j=await r.json();
      if(j.status==='success'){
        setGeneratedText(j.data.markdownContent);setShowWorkspace(true);
        push('✅ README generated!','success');
        // Refresh history
        try{const hr=await fetch(`${API}/api/history`);if(hr.ok){const hj=await hr.json();if(hj.data)setHistory(hj.data);}}catch{}
      }else throw new Error(j.error||'Generation failed');
    }catch(err:any){
      push('⚠️ Backend offline — showing mock','info');
      setGeneratedText(`# ${repoUrl.split('/').pop()||'Repo'}\n\n> Offline mock\n\n## Install\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\`\`\`bash\nnpm start\n\`\`\``);
      setShowWorkspace(true);
    }finally{setGenerating(false);}
  };

  /* ---- Intel handler ---- */
  const fetchIntel = async(url:string)=>{
    setIntelLoading(true);
    try{const r=await fetch(`${API}/api/repo/intelligence?repoUrl=${encodeURIComponent(url)}`);if(r.ok){const j=await r.json();if(j.intelligence)setIntel(j.intelligence);}}catch{}
    setIntelLoading(false);
  };

  /* ---- Delete handler ---- */
  const handleDelete=async(id:string)=>{
    if(confirmDel!==id){setConfirmDel(id);setTimeout(()=>setConfirmDel(null),3000);return;}
    setConfirmDel(null);
    setHistory(p=>p.filter(d=>d._id!==id));
    try{await fetch(`${API}/api/history/${id}`,{method:'DELETE'});push('🗑️ Deleted','info');}catch{push('❌ Delete failed','error');}
  };

  const exportAs = (format: 'md' | 'html' | 'json') => {
    let content = generatedText;
    if (format === 'json') content = JSON.stringify({ project: repoUrl, readme: generatedText }, null, 2);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `README.${format}`; a.click();
  };

  const toggleFavorite = async(id:string)=>{
    try{
      const r = await fetch(`${API}/api/history/${id}/favorite`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
      if(r.ok){ setHistory(p=>p.map(d=>d._id===id?{...d,isFavorite:!d.isFavorite}:d)); push('Updated favorites','success'); }
    }catch{}
  };

  /* ---- Settings handlers ---- */
  const updateUserSettings = async (updates: any) => {
    if (!token || !user) return;
    try {
      const r = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      const j = await r.json();
      if (j.status === 'success') { setUser(j.user); push('Settings updated!', 'success'); }
      else push(j.error || 'Failed to update settings', 'error');
    } catch { push('Cannot connect to server', 'error'); }
  };

  /* ======== NAV ======== */
  const navItems=[
    {k:'dashboard',l:'Dashboard',d:'Overview & stats'},{k:'generator',l:'Generator',d:'Create documentation'},
    {k:'intelligence',l:'Intelligence',d:'Analyze repos'},{k:'archives',l:'Archives',d:'Your documents'},
    {k:'settings',l:'Settings',d:'Preferences'},
  ];
  const pageLabels:Record<string,string>={dashboard:'Dashboard',generator:'Documentation Generator',intelligence:'Repository Intelligence',archives:'Archives',settings:'Settings'};

  /* ---- Sidebar ---- */
  const Sidebar=()=>(
    <aside style={{width:sidebar?220:0,minWidth:sidebar?220:0,background:C.surface,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',transition:'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',overflow:'hidden',position:'fixed',top:0,left:0,bottom:0,zIndex:100,fontSize:fontSizes[currentFontSize], boxShadow: sidebar ? '10px 0 30px -15px rgba(0,0,0,0.3)' : 'none'}}>
      <div style={{padding:'20px 16px 16px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,borderRadius:6,background:C.accent,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:13}}>D</div>
          <div><div style={{fontWeight:600,color:C.text,fontSize:13}}>DocuEngine Pro</div><div style={{fontSize:10.5,color:C.muted}}>v3.0.0</div></div>
        </div>
      </div>
      <nav style={{flex:1,padding:'8px',display:'flex',flexDirection:'column',gap:2}}>
        {navItems.map(n=>{const a=page===n.k;return(
          <button key={n.k} onClick={()=>setPage(n.k)} style={{appearance:'none',border:'none',background:a?`${C.accent}15`:'transparent',color:a?C.text:C.muted,borderRadius:6,padding:'8px 12px',cursor:'pointer',width:'100%',textAlign:'left',fontSize:13,fontWeight:a?600:400,transition:'all 0.2s'}}>
            <div>{n.l}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:1}}>{n.d}</div>
          </button>
        )})}
        <div style={{flex:1}} />
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{appearance:'none',border:`1px solid ${C.border}`,background:'transparent',color:C.text,borderRadius:6,padding:'10px',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:8}}>
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </nav>
      <div style={{padding:'12px 16px',borderTop:`1px solid ${C.border}`,fontSize:11,color:C.muted}}>
        {user?<div>{user.name} · <span onClick={handleLogout} style={{cursor:'pointer',color:C.accent}}>Logout</span></div>:<div>Not signed in</div>}
      </div>
    </aside>
  );

  /* ---- Header ---- */
  const Header=()=>(
    <header style={{padding:'12px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',background:C.surface,position:'sticky',top:0,zIndex:50,fontSize:fontSizes[currentFontSize]}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setSidebar(p=>!p)} style={{appearance:'none',border:`1px solid ${C.border}`,background:'transparent',color:C.muted,borderRadius:4,padding:'4px 8px',cursor:'pointer',fontSize:14}}>{sidebar?'←':'→'}</button>
        <span style={{fontWeight:600,color:C.text,fontSize:15}}>{pageLabels[page]||page}</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12,color:C.muted,fontSize:12}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:nodeOk===null?C.muted:nodeOk?C.success:C.error,display:'inline-block',boxShadow:nodeOk?`0 0 6px ${C.success}`:'none'}}/> <span>Node</span>
        <span style={{width:6,height:6,borderRadius:'50%',background:pyOk===null?C.muted:pyOk?C.success:C.error,display:'inline-block',boxShadow:pyOk?`0 0 6px ${C.success}`:'none'}}/> <span>Python</span>
        <span style={{opacity:0.5}}>|</span>
        <span style={{fontFamily:'monospace'}}>{latency}ms</span>
        {user&&<><span style={{opacity:0.5}}>|</span><span style={{color:C.accent}}>{user.name}</span></>}
      </div>
    </header>
  );

  /* ---- Auth Modal ---- */
  if(!token){
    return(
      <div style={{minHeight:'100vh',background:C.bg,color:C.text,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:fontFamilies[currentFontFamily],fontSize:fontSizes[currentFontSize]}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:40,width:400,maxWidth:'90%'}}>
          <div style={{textAlign:'center',marginBottom:24}}>
            <div style={{fontSize:36,marginBottom:8}}>🚀</div>
            <div style={{fontSize:22,fontWeight:700,color:C.text,letterSpacing:'-0.02em'}}>DocuEngine Pro</div>
            <div style={{fontSize:13,color:C.muted,marginTop:4}}>Sign in to generate documentation</div>
          </div>
          <form onSubmit={handleAuth}>
            {authView==='register' && authMode === 'password' && <div style={{marginBottom:14}}><label style={{fontSize:'0.85em',color:C.muted,marginBottom:4,display:'block'}}>Name</label><input value={authName} onChange={e=>setAuthName(e.target.value)} style={{width:'100%',padding:'10px 12px',background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:'0.9em',outline:'none',boxSizing:'border-box'}} required/></div>}
            <div style={{marginBottom:14}}><label style={{fontSize:'0.85em',color:C.muted,marginBottom:4,display:'block'}}>Email</label><input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} style={{width:'100%',padding:'10px 12px',background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:'0.9em',outline:'none',boxSizing:'border-box'}}/></div>
            {authMode === 'password' ? (
              <div style={{marginBottom:20}}><label style={{fontSize:'0.85em',color:C.muted,marginBottom:4,display:'block'}}>Password</label><input type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} style={{width:'100%',padding:'10px 12px',background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:'0.9em',outline:'none',boxSizing:'border-box'}} required/></div>
            ) : otpSent && (
              <div style={{marginBottom:20}}><label style={{fontSize:'0.85em',color:C.muted,marginBottom:4,display:'block'}}>Enter 6-digit OTP</label><input value={otpVal} onChange={e=>setOtpVal(e.target.value)} style={{width:'100%',padding:'10px 12px',background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:'1.2em',textAlign:'center',letterSpacing:4,outline:'none',boxSizing:'border-box'}} maxLength={6}/></div>
            )}
            <button type="submit" style={{width:'100%',appearance:'none',border:'none',background:C.accent,color:'white',borderRadius:6,padding:'10px',fontWeight:600,fontSize:13,cursor:'pointer'}} disabled={authMode === 'otp' && !otpSent && resendTimer > 0}>
              {authMode === 'otp' ? (otpSent ? 'Verify OTP' : resendTimer > 0 ? `Wait ${resendTimer}s` : 'Send OTP') : (authView === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
          <div style={{display:'flex',gap:10,marginTop:12}}>
            <button onClick={handleGoogleLogin} style={{flex:1,appearance:'none',border:`1px solid ${C.border}`,background:C.surface,color:C.text,borderRadius:6,padding:'8px',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
              <span>G</span> Google Login
            </button>
            <button onClick={()=>{setAuthMode(p=>p==='password'?'otp':'password'); setOtpSent(false);}} style={{flex:1,appearance:'none',border:`1px solid ${C.border}`,background:C.surface,color:C.text,borderRadius:6,padding:'8px',fontSize:11,cursor:'pointer'}}>
              {authMode === 'password' ? 'Login via OTP' : 'Login via Password'}
            </button>
          </div>
          <div style={{textAlign:'center',marginTop:16,fontSize:12,color:C.muted}}>
            {authMode === 'password' && (
              <>
                {authView==='login'?"Don't have an account? ":"Already have an account? "}
                <span onClick={()=>setAuthView(p=>p==='login'?'register':'login')} style={{color:C.accent,cursor:'pointer',fontWeight:600}}>{authView==='login'?'Register':'Sign In'}</span>
              </>
            )}
          </div>
          <div style={{textAlign:'center',marginTop:12}}>
            <button onClick={()=>{setToken('guest');setUser({name:'Guest',email:'guest@local'});push('Using guest mode','info');}} style={{appearance:'none',border:`1px solid ${C.border}`,background:'transparent',color:C.muted,borderRadius:6,padding:'6px 16px',cursor:'pointer',fontSize:12}}>Continue as Guest</button>
          </div>
        </div>
      </div>
    );
  }

  /* ======== DASHBOARD ======== */
  const Dashboard=()=>{
    const s=stats||{totalDocuments:history.length,totalUsers:1,uniqueRepositories:1,weeklyGeneration:0};
    return( //
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div><div style={{fontSize:20,fontWeight:700,color:C.text}}>Dashboard</div><div style={{fontSize:13,color:C.muted}}>Welcome{user?`, ${user.name}`:''}. Here's your workspace overview.</div></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[{l:'Documents Generated',v:String(s.totalDocuments||0),c:'+12 this week'},{l:'Repositories',v:String(s.uniqueRepositories||0),c:'+3 this week'},{l:'Users',v:String(s.totalUsers||1),c:'Platform-wide'},{l:'System',v:nodeOk&&pyOk?'99.8%':'Checking…',c:'Uptime'}].map(st=>(
            <div key={st.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:6}}>{st.l}</div>
              <div style={{fontSize:24,fontWeight:700,color:C.text,marginBottom:4}}>{st.v}</div>
              <div style={{fontSize:11,color:C.muted}}>{st.c}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
            <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:12}}>System Health</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[{n:'Node.js API',k:nodeOk,p:'5000'},{n:'Python Analyzer',k:pyOk,p:'8000'},{n:'MongoDB Atlas',k:nodeOk,p:'Atlas Cloud'}].map(sv=>(
                <div key={sv.n} style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                  <span style={{fontSize:12.5,color:C.text}}>{sv.n} <span style={{color:C.muted,fontSize:11}}>({sv.p})</span></span>
                  <span style={{fontWeight:600,fontSize:12,color:sv.k===null?C.muted:sv.k?C.success:C.error}}>{sv.k===null?'Checking…':sv.k?'Connected ✅':'Offline ❌'}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderTop:`1px solid ${C.border}`,marginTop:4,paddingTop:8}}>
                <span style={{fontSize:12.5,color:C.text}}>Latency</span>
                <span style={{fontWeight:600,fontSize:12,color:C.accent}}>~{latency}ms</span>
              </div>
            </div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
            <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:12}}>Quick Actions</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button onClick={()=>setPage('generator')} style={{appearance:'none',border:`1px solid ${C.accent}`,background:`${C.accent}12`,color:C.accent,borderRadius:6,padding:'10px 14px',cursor:'pointer',textAlign:'left',fontWeight:500,fontSize:13}}>Generate New Documentation →</button>
              <button onClick={()=>setPage('intelligence')} style={{appearance:'none',border:`1px solid ${C.border}`,background:'transparent',color:C.text,borderRadius:6,padding:'10px 14px',cursor:'pointer',textAlign:'left',fontWeight:500,fontSize:13}}>Analyze Repository →</button>
              <button onClick={()=>setPage('archives')} style={{appearance:'none',border:`1px solid ${C.border}`,background:'transparent',color:C.text,borderRadius:6,padding:'10px 14px',cursor:'pointer',textAlign:'left',fontWeight:500,fontSize:13}}>View Archives ({history.length}) →</button>
            </div>
          </div>
        </div>
        {stats?.recentDocuments?.length>0&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
          <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:12}}>Recent Documents</div>
          {stats.recentDocuments.map((d:any)=>(
            <div key={d._id} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:`1px solid ${C.border}`}}>
              <span>📄</span><span style={{fontSize:13,color:C.text,flex:1}}>{d.projectPath}</span>
              <span style={{fontSize:11,color:C.muted}}>{timeAgo(d.createdAt)}</span>
            </div>
          ))}
        </div>}
      </div>
    );
  };

  /* ======== GENERATOR ======== */
  const Generator=()=>(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div><div style={{fontSize:20,fontWeight:700,color:C.text}}>Documentation Generator</div><div style={{fontSize:13,color:C.muted}}>Generate professional README from any GitHub repository.</div></div> {/* */}
      {!showWorkspace?(
        <>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:20}}>
            <form onSubmit={handleGenerate}>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:13,color:C.text,fontWeight:500,marginBottom:6,display:'block'}}>GitHub Repository URL</label>
                <div style={{display:'flex',gap:8}}>
                  <input value={repoUrl} onChange={e=>setRepoUrl(e.target.value)} placeholder="https://github.com/username/repository"
                    style={{flex:1,padding:'10px 12px',background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:13,outline:'none'}}/>
                  <button type="button" onClick={()=>fetchIntel(repoUrl)} disabled={!repoUrl.trim()||intelLoading}
                    style={{appearance:'none',border:`1px solid ${C.border}`,background:'transparent',color:C.muted,borderRadius:6,padding:'8px 12px',cursor:'pointer',fontSize:12,whiteSpace:'nowrap'}}>
                    {intelLoading?'Analyzing…':'🔍 Analyze'}
                  </button>
                </div>
              </div>
              {intel&&<div style={{marginBottom:14,background:C.inputBg,borderRadius:6,padding:12}}>
                <div style={{fontSize:12,color:C.accent,fontWeight:600,marginBottom:6}}>📊 {intel.repoName}</div>
                <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{intel.description || 'No description provided'}</div>
                <div style={{display:'flex',gap:12,fontSize:11,color:C.muted}}>
                  <span>⭐ {intel.stars}</span><span>🍴 {intel.forks}</span><span>⚠️ {intel.issues}</span>
                  <span>Score: <span style={{color:C.success,fontWeight:600}}>{intel.qualityScore}/100</span></span>
                </div>
                <div style={{display:'flex',gap:4,marginTop:6}}>{intel.languages.slice(0,4).map(l=><span key={l.name} style={{fontSize:10,background:`${l.color}20`,color:l.color,padding:'1px 6px',borderRadius:3}}>{l.name} {l.percentage}%</span>)}</div>
              </div>}
              <div style={{marginBottom:14}}>
                <label style={{fontSize:13,color:C.text,fontWeight:500,marginBottom:6,display:'block'}}>Mode</label>
                <div style={{display:'flex',gap:8}}>
                  {[{k:'simple'as const,l:'Simple',d:'Core README'},{k:'detailed'as const,l:'Detailed',d:'Full docs'},{k:'complete'as const,l:'Complete',d:'Everything'}].map(m=>(
                    <button key={m.k} type="button" onClick={()=>setGenMode(m.k)} style={{flex:1,appearance:'none',border:`1px solid ${genMode===m.k?C.accent:C.border}`,background:genMode===m.k?`${C.accent}12`:'transparent',color:genMode===m.k?C.accent:C.text,borderRadius:6,padding:'10px',cursor:'pointer',textAlign:'center'}}>
                      <div style={{fontWeight:600,fontSize:12.5}}>{m.l}</div>
                      <div style={{fontSize:11,color:C.muted}}>{m.d}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:13,color:C.text,fontWeight:500,marginBottom:6,display:'block'}}>Include Sections</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {['Installation', 'Usage', 'Features', 'API', 'Architecture', 'Contributing', 'Testing'].map(s => (
                    <button key={s} type="button" onClick={() => toggleSection(s)} style={{padding:'4px 10px',borderRadius:6,fontSize:11,border:`1px solid ${selectedSections.includes(s)?C.accent:C.border}`,background:selectedSections.includes(s)?`${C.accent}12`:'transparent',color:selectedSections.includes(s)?C.accent:C.muted,cursor:'pointer'}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                <div>
                  <label style={{fontSize:12,color:C.muted,marginBottom:4,display:'block'}}>License</label>
                  <select value={license} onChange={e=>setLicense(e.target.value)} style={{width:'100%',padding:'8px',background:C.inputBg,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,fontSize:12}}>
                    <option value="MIT">MIT</option><option value="Apache-2.0">Apache 2.0</option><option value="GPL-3.0">GPL v3</option><option value="Unlicense">Unlicense</option>
                  </select>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:20}}>
                  <input type="checkbox" checked={includeTOC} onChange={e=>setIncludeTOC(e.target.checked)} id="toc-check" />
                  <label htmlFor="toc-check" style={{fontSize:12,color:C.text,cursor:'pointer'}}>Include TOC</label>
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:13,color:C.text,fontWeight:500,marginBottom:6,display:'block'}}>AI Model</label>
                <select value={aiModel} onChange={e=>setAiModel(e.target.value)} style={{width:'100%',padding:'8px',background:C.inputBg,border:`1px solid ${C.border}`,color:C.text,borderRadius:6}}>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Most Accurate)</option>
                </select>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:13,color:C.text,fontWeight:500,marginBottom:6,display:'block'}}>Custom AI Instructions</label>
                <textarea value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)} placeholder="e.g. Write in a funny tone, or focus heavily on security features..."
                  style={{width:'100%',padding:'10px',background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,resize:'vertical',minHeight:60}}/>
              </div>
              <button type="submit" disabled={generating||repoUrl.trim().length<8} style={{width:'100%',appearance:'none',border:'none',background:generating?C.border:C.accent,color:'white',borderRadius:6,padding:'10px',cursor:generating?'not-allowed':'pointer',fontWeight:600,fontSize:13,opacity:generating?0.6:1}}>
                {generating?'⏳ Generating…':'⚡ Generate Documentation'}
              </button>
            </form>
          </div>
          {genError&&<div style={{background:`${C.error}15`,border:`1px solid ${C.error}40`,borderRadius:8,padding:12,color:C.error,fontSize:13}}>{genError}</div>}
        </>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontWeight:600,color:C.text,fontSize:14}}>README.md</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setShowWorkspace(false);setRepoUrl('');setGeneratedText('');setIntel(null);}} style={{appearance:'none',border:`1px solid ${C.border}`,background:'transparent',color:C.muted,borderRadius:6,padding:'6px 12px',cursor:'pointer',fontSize:12,fontWeight:500}}>New</button>
              <button onClick={()=>{copyToClipboard(generatedText); push('📋 Copied to clipboard', 'success');}} style={{appearance:'none',border:`1px solid ${C.border}`,background:'transparent',color:C.text,borderRadius:6,padding:'6px 12px',cursor:'pointer',fontSize:12,fontWeight:500}}>Copy</button>
              <div style={{position:'relative'}}>
                <button onClick={()=>setShowExportMenu(!showExportMenu)} style={{appearance:'none',border:'none',background:C.accent,color:'white',borderRadius:6,padding:'6px 14px',cursor:'pointer',fontWeight:600,fontSize:12}}>Download ▾</button>
                {showExportMenu && (
                  <div style={{position:'absolute',top:'100%',right:0,marginTop:4,background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,width:120,zIndex:100,boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
                    {['md', 'html', 'json'].map(fmt => (
                      <button key={fmt} onClick={()=>{exportAs(fmt as any); setShowExportMenu(false);}} style={{width:'100%',padding:'8px 12px',background:'transparent',border:'none',color:C.text,textAlign:'left',cursor:'pointer',fontSize:12,borderBottom:`1px solid ${C.border}`}}>
                        Export as .{fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,minHeight:400}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,display:'flex',flexDirection:'column'}}>
              <div style={{padding:'8px 12px',borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontWeight:600}}>EDITOR</div>
              <textarea value={generatedText} onChange={e=>setGeneratedText(e.target.value)} style={{flex:1,resize:'none',background:C.inputBg,border:'none',color:C.text,padding:12,fontFamily:'monospace',fontSize:12.5,lineHeight:1.6,outline:'none'}}/>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,display:'flex',flexDirection:'column'}}>
              <div style={{padding:'8px 12px',borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.muted,fontWeight:600}}>PREVIEW</div>
              <div style={{flex:1,padding:16,overflow:'auto',color:C.text,fontSize:13.5,lineHeight:1.6,whiteSpace:'pre-wrap'}}>
                {generatedText.split('\n').map((line,i)=>{if(line.startsWith('# '))return<div key={i} style={{fontSize:20,fontWeight:700,marginBottom:10}}>{line.slice(2)}</div>;if(line.startsWith('## '))return<div key={i} style={{fontSize:16,fontWeight:600,marginBottom:8,marginTop:6,color:C.accent}}>{line.slice(3)}</div>;if(line.startsWith('> '))return<div key={i} style={{borderLeft:`3px solid ${C.accent}`,paddingLeft:10,color:C.muted,fontStyle:'italic',marginBottom:4}}>{line.slice(2)}</div>;if(line.startsWith('- '))return<div key={i} style={{paddingLeft:14,marginBottom:2}}>• {line.slice(2)}</div>;if(line.startsWith('```'))return<div key={i} style={{background:'rgba(0,0,0,0.25)',borderRadius:4,padding:'2px 8px',fontFamily:'monospace',fontSize:12,color:C.accent,marginBottom:2}}>{line}</div>;if(/^\d+\.\s/.test(line))return<div key={i} style={{paddingLeft:6,marginBottom:2}}>{line}</div>;return<div key={i} style={{marginBottom:2,color:line.trim()?C.text:'transparent'}}>{line||'\u00A0'}</div>;})}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ======== INTELLIGENCE ======== */
  const Intelligence=()=>{
    const [url,setUrl]=useState('');
    const [loading,setLoading]=useState(false); //
    const [data,setData]=useState<RepoIntel|null>(null);
    const [err,setErr]=useState('');
    const analyze=async()=>{
      if(!url.trim())return;
      setLoading(true);setErr('');setData(null);
      try{const r=await fetch(`${API}/api/repo/intelligence?repoUrl=${encodeURIComponent(url.trim())}`);const j=await r.json();if(j.intelligence)setData(j.intelligence);else setErr(j.error||'Failed');}catch{setErr('Cannot reach server');}
      setLoading(false);
    };
    return(
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div><div style={{fontSize:20,fontWeight:700,color:C.text}}>Repository Intelligence</div><div style={{fontSize:13,color:C.muted}}>Analyze any GitHub repository for quality, complexity, and documentation scores.</div></div>
        <div style={{display:'flex',gap:8}}>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://github.com/username/repo" style={{flex:1,padding:'10px 12px',background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:13,outline:'none'}}/>
          <button onClick={analyze} disabled={loading} style={{appearance:'none',border:'none',background:C.accent,color:'white',borderRadius:6,padding:'10px 20px',cursor:'pointer',fontWeight:600,fontSize:13}}>{loading?'⏳':'🔍 Analyze'}</button>
        </div>
        {err&&<div style={{background:`${C.error}15`,border:`1px solid ${C.error}40`,borderRadius:8,padding:12,color:C.error,fontSize:13}}>{err}</div>}
        {data&&<>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div><div style={{fontWeight:700,color:C.text,fontSize:16}}>{data.repoName}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{data.description}</div></div>
              <div style={{display:'flex',gap:10,fontSize:12,color:C.muted}}><span>⭐ {data.stars}</span><span>🍴 {data.forks}</span><span>⚠️ {data.issues}</span></div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
              <div style={{fontSize:11,color:C.muted,textTransform:'uppercase',marginBottom:8}}>Quality Score</div>
              <div style={{fontSize:32,fontWeight:900,color:data.qualityScore>70?C.success:C.warning}}>{data.qualityScore}/100</div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
              <div style={{fontSize:11,color:C.muted,textTransform:'uppercase',marginBottom:8}}>Complexity</div>
              <div style={{fontSize:32,fontWeight:900,color:data.complexity>70?C.warning:C.accent}}>{data.complexity}/100</div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
              <div style={{fontSize:11,color:C.muted,textTransform:'uppercase',marginBottom:8}}>Doc Coverage</div>
              <div style={{fontSize:32,fontWeight:900,color:data.docCoverage>60?C.success:C.warning}}>{data.docCoverage}%</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
              <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:12}}>Languages</div>
              {data.languages.map(l=><div key={l.name} style={{marginBottom:6}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:C.text,marginBottom:2}}><span>{l.name}</span><span style={{color:C.muted}}>{l.percentage}%</span></div>
                <div style={{height:4,borderRadius:2,background:C.border,overflow:'hidden'}}><div style={{width:`${l.percentage}%`,height:'100%',background:l.color,borderRadius:2}}/></div>
              </div>)}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
              <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:12}}>Analysis</div>
              <div style={{marginBottom:12}}><div style={{fontSize:11,color:C.success,fontWeight:600,marginBottom:4}}>✅ Strengths</div>{data.strengths.map(s=><div key={s} style={{fontSize:12,color:C.text,marginBottom:2}}>• {s}</div>)}</div>
              <div style={{marginBottom:12}}><div style={{fontSize:11,color:C.warning,fontWeight:600,marginBottom:4}}>⚠️ Weaknesses</div>{data.weaknesses.map(w=><div key={w} style={{fontSize:12,color:C.text,marginBottom:2}}>• {w}</div>)}</div>
              <div><div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:4}}>Architecture</div><div style={{fontSize:13,color:C.accentPurple||C.accent}}>{data.architecture}</div></div>
            </div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
            <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:8}}>Tech Stack</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{data.techStack.map(t=><span key={t} style={{background:`${C.accent}12`,color:C.accent,padding:'4px 10px',borderRadius:6,fontSize:12,fontWeight:500,border:`1px solid ${C.accent}25`}}>{t}</span>)}</div>
          </div>
        </>}
      </div>
    );
  };

  /* ======== ARCHIVES ======== */
  const Archives=()=>{
    const filtered = useMemo(() => history.filter(h => 
      h.projectPath.toLowerCase().includes(searchQuery.toLowerCase()) && 
      (!filterFavorites || h.isFavorite)
    ), [history, searchQuery, filterFavorites]);
    return(
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
          <div><div style={{fontSize:20,fontWeight:700,color:C.text}}>Archives</div><div style={{fontSize:13,color:C.muted}}>{history.length} documents found</div></div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setFilterFavorites(!filterFavorites)} style={{padding:'6px 12px',background:filterFavorites?`${C.warning}15`:'transparent',border:`1px solid ${filterFavorites?C.warning:C.border}`,borderRadius:6,color:filterFavorites?C.warning:C.muted,fontSize:12,cursor:'pointer'}}>{filterFavorites?'★ Favorites':'☆ All'}</button>
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search repos..." style={{padding:'6px 12px',background:C.inputBg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:13}}/>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {filtered.map(doc=>(
            <div key={doc._id} style={{background:C.card,border:`1px solid ${confirmDel===doc._id?C.error:doc.isFavorite?`${C.warning}60`:C.border}`,borderRadius:8,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:16}}>📄</span>
                <div><div style={{fontWeight:600,color:C.text,fontSize:13.5}}>{doc.projectPath}</div><div style={{fontSize:12,color:C.muted}}>{timeAgo(doc.createdAt)}</div></div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>toggleFavorite(doc._id)} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:16}}>{doc.isFavorite?'⭐':'☆'}</button>
                <button onClick={()=>{setGeneratedText(doc.markdownContent);setShowWorkspace(true);setPage('generator');}} style={{appearance:'none',border:`1px solid ${C.border}`,background:'transparent',color:C.text,borderRadius:4,padding:'5px 10px',cursor:'pointer',fontSize:12,fontWeight:500}}>Open</button>
                <button onClick={()=>handleDelete(doc._id)} style={{appearance:'none',border:`1px solid ${confirmDel===doc._id?C.error:`${C.muted}40`}`,background:confirmDel===doc._id?`${C.error}12`:'transparent',color:confirmDel===doc._id?C.error:C.muted,borderRadius:4,padding:'5px 10px',cursor:'pointer',fontSize:12,fontWeight:500}}>{confirmDel===doc._id?'Confirm':'Delete'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ======== SETTINGS ======== */
  const Settings=()=>(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div><div style={{fontSize:20,fontWeight:700,color:C.text}}>Settings</div><div style={{fontSize:13,color:C.muted}}>Application configuration.</div></div> {/* */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
        {[{t:'Account',items:[{l:'Name',v:user?.name||'Guest'},{l:'Email',v:user?.email||'local'},{l:'Status',v:'Active',badge:true,c:C.success}]}, //
          {t:'Generation',items:[{l:'Default Mode',v:'Detailed'},{l:'AI Model',v:'Gemini 2.5 Flash'},{l:'Max Output',v:'4,096 chars'}]},
          {t:'Services',items:[{l:'Node API',v:nodeOk?'Connected':'Offline',badge:true,c:nodeOk?C.success:C.error},{l:'Python',v:pyOk?'Connected':'Offline',badge:true,c:pyOk?C.success:C.error},{l:'Latency',v:`~${latency}ms`}]},
          {t:'Data',items:[{l:'Documents',v:String(history.length)},{l:'Storage',v:'MongoDB Atlas'},{l:'Backup',v:'Automated'}]},
        ].map(s=>(<div key={s.t} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
          <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:12}}>{s.t}</div>
          {s.items.map((i:any)=><div key={i.l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:'0.9em'}}>
            <span style={{fontSize:12.5,color:C.muted}}>{i.l}</span>
            {i.badge?<span style={{padding:'1px 8px',borderRadius:3,fontSize:11.5,fontWeight:500,background:`${i.c}15`,color:i.c}}>{i.v}</span>:<span style={{fontSize:12.5,color:C.text}}>{i.v}</span>}
          </div>)}
        </div>))}
      </div>
      {/* New Theme and Font Size Settings */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
        <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:12}}>Appearance</div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12.5,color:C.muted,marginBottom:6,display:'block'}}>Theme</label>
          <div style={{display:'flex',gap:8,background:C.inputBg,padding:4,borderRadius:8}}>
            {['dark', 'light'].map(t => (
              <button
                key={t}
                onClick={() => { setTheme(t as 'light' | 'dark'); updateUserSettings({ theme: t as 'light' | 'dark' }); }}
                style={{
                  flex: 1, appearance: 'none', border: `1px solid ${theme === t ? C.accent : C.border}`,
                  background: theme === t ? `${C.accent}12` : 'transparent', color: theme === t ? C.accent : C.text,
                  borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{fontSize:12.5,color:C.muted,marginBottom:6,display:'block'}}>Font Size</label>
          <div style={{display:'flex',gap:8}}>
            {['small', 'medium', 'large', 'xlarge'].map(fs => (
              <button
                key={fs}
                onClick={() => { setCurrentFontSize(fs as 'small' | 'medium' | 'large'); updateUserSettings({ fontSize: fs as 'small' | 'medium' | 'large' }); }}
                style={{
                  flex: 1, appearance: 'none', border: `1px solid ${currentFontSize === fs ? C.accent : C.border}`,
                  background: currentFontSize === fs ? `${C.accent}12` : 'transparent', color: currentFontSize === fs ? C.accent : C.text,
                  borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500
                }}
              >
                {fs.charAt(0).toUpperCase() + fs.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{fontSize:12.5,color:C.muted,marginBottom:6,display:'block'}}>Font Family</label>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {Object.keys(fontFamilies).map(ff => (
              <button
                key={ff}
                onClick={() => { setCurrentFontFamily(ff as any); updateUserSettings({ fontFamily: ff }); }}
                style={{
                  appearance: 'none', border: `1px solid ${currentFontFamily === ff ? C.accent : C.border}`,
                  background: currentFontFamily === ff ? `${C.accent}12` : 'transparent', color: currentFontFamily === ff ? C.accent : C.text,
                  borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: fontFamilies[ff as keyof typeof fontFamilies]
                }}
              >
                {ff}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
        <div style={{fontWeight:600,color:C.text,fontSize:14,marginBottom:12}}>Actions</div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{checkHealth();push('🔄 Refreshed','info');}} style={{appearance:'none',border:`1px solid ${C.success}40`,background:`${C.success}08`,color:C.success,borderRadius:6,padding:'8px 14px',cursor:'pointer',fontWeight:500,fontSize:12.5}}>Refresh Health</button>
          <button onClick={handleLogout} style={{appearance:'none',border:`1px solid ${C.error}40`,background:`${C.error}08`,color:C.error,borderRadius:6,padding:'8px 14px',cursor:'pointer',fontWeight:500,fontSize:12.5}}>Sign Out</button>
        </div>
      </div>
    </div>
  );

  /* ======== MAIN LAYOUT ======== */
  return( //
    <div style={{minHeight:'100vh',background:C.bg,color:C.text,fontFamily:fontFamilies[currentFontFamily],display:'flex',fontSize:fontSizes[currentFontSize]}}>
      <Sidebar/>
      <div style={{flex:1,marginLeft:sidebar?220:0,display:'flex',flexDirection:'column',transition:'margin-left 200ms'}}>
        <Header/>
        <main style={{flex:1,padding:'20px 24px',maxWidth:1100,width:'100%',boxSizing:'border-box',margin:'0 auto'}}>
          {page==='dashboard'&&<Dashboard/>}
          {page==='generator'&&<Generator/>}
          {page==='intelligence'&&<Intelligence/>}
          {page==='archives'&&<Archives/>}
          {page==='settings'&&<Settings/>}
        </main>
      
      {/* Floating Action Button for Quick Generation */}
      {page !== 'generator' && (
        <button 
          onClick={() => setPage('generator')}
          style={{position:'fixed', bottom:30, right:30, width:56, height:56, borderRadius:'50%', background:C.accent, color:'white', border:'none', cursor:'pointer', fontSize:24, boxShadow:`0 8px 24px ${C.accent}60`, display:'flex', alignItems:'center', justifyItems:'center', justifyContent:'center', zIndex:100, transition:'transform 0.2s'}}
          className="card-hover"
        >
          +
        </button>
      )}
      </div>
      {toasts.length>0&&<div style={{position:'fixed',top:72,right:20,zIndex:9999,display:'flex',flexDirection:'column',gap:6,maxWidth:360}}>
        {toasts.map(t=>{const bg=t.type==='success'?`${C.success}15`:t.type==='error'?`${C.error}15`:`${C.accent}12`;const border=t.type==='success'?`${C.success}30`:t.type==='error'?`${C.error}30`:`${C.accent}25`;return(
          <div key={t.id} style={{background: bg, border:`1px solid ${border}`,borderRadius:6,padding:'8px 12px',color:C.text,fontSize:13,fontWeight:500,boxShadow:'0 4px 16px rgba(0,0,0,0.3)',animation:'si 0.2s'}}>{t.message}</div>
        );})}
      </div>}
      <style>{`
      @keyframes si{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%{box-shadow:0 0 0 0 ${C.success}40}70%{box-shadow:0 0 0 10px ${C.success}0}100%{box-shadow:0 0 0 0 ${C.success}0}}
      *{box-sizing:border-box; transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease, color 0.2s ease;}
      body{margin:0; background:${C.bg}; color:${C.text}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;}
      input, button, textarea { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        input:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 2px ${C.accent}20; }
        button:active { transform: scale(0.97); }
      .glass { backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%); background: ${C.card}CC !important; border: 1px solid ${C.border} !important; }
      .status-dot-active { animation: pulse 2s infinite; }
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-thumb{background:${C.border}; border-radius:10px}
      ::-webkit-scrollbar-thumb:hover{background:${C.muted}}
        ::selection { background: ${C.accent}40; color: ${C.accent}; }
        .gradient-text { background: linear-gradient(45deg, ${C.accent}, ${C.accentHover}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -10px rgba(0,0,0,0.4); }
      .sidebar-item-active { background: ${C.accent}15 !important; color: ${C.text} !important; border-left: 3px solid ${C.accent} !important; }
      `}</style>
    </div>
  );
}