"use client";

import React from "react";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { img, tmdbFetch, type TmdbItem, type TmdbResponse } from "@/lib/tmdb";

export default function LoginClient({ initialPosters = [] }: { initialPosters?: string[] }) {
  const { signInWithGoogle, user } = useFirebaseAuth();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [posters, setPosters] = React.useState<string[]>(initialPosters);
  const { signInWithEmail, signUpWithEmail, resetPassword } = useFirebaseAuth();
  const [tab, setTab] = React.useState<'signin'|'signup'|'reset'>('signin');
  const [showEmail, setShowEmail] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const emailInputRef = React.useRef<HTMLInputElement | null>(null);

  const onGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error("Google sign-in failed", e);
      setBusy(false);
    }
  };

  const onHoverMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget as HTMLButtonElement & { style: CSSStyleDeclaration };
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", String(e.clientX - r.left));
    el.style.setProperty("--y", String(e.clientY - r.top));
    el.style.setProperty("--w", String(r.width));
    el.style.setProperty("--h", String(r.height));
  };

  // Client-side: optionally fetch more to enrich the pool
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const collect = async (path: string, search?: Record<string, any>) => {
          const data = await tmdbFetch<TmdbResponse>(path, search as any);
          return (data?.results || []) as TmdbItem[];
        };
        const [trMovie, trTv] = await Promise.all([
          collect("trending/movie/week", { page: 1 }),
          collect("trending/tv/week", { page: 1 }),
        ]);
        const all: TmdbItem[] = [...trMovie, ...trTv];
        const urls = all
          .map((it) => (it.poster_path ? img.poster(it.poster_path, "w342") : undefined))
          .filter((u): u is string => !!u);
        const seen = new Set<string>(initialPosters);
        const extra: string[] = [];
        for (const u of urls) {
          if (!seen.has(u)) {
            seen.add(u);
            extra.push(u);
          }
          if (extra.length >= 40) break;
        }
        if (!cancelled && extra.length) setPosters((p) => (p.length ? p : initialPosters).concat(extra));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
    // only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preconnect to TMDB CDN and preload a few images to speed up paint
  React.useEffect(() => {
    try {
      const head = document.head || document.getElementsByTagName('head')[0];
      const mk = (rel: string, href: string) => { const l = document.createElement('link'); l.rel = rel; l.href = href; return l; };
      const links: HTMLLinkElement[] = [mk('preconnect','https://image.tmdb.org'), mk('dns-prefetch','https://image.tmdb.org')];
      links.forEach(l => { if (!head.querySelector(`link[rel="${l.rel}"][href="${l.href}"]`)) head.appendChild(l); });
      return () => { links.forEach(l => { try { head.removeChild(l); } catch {} }); };
    } catch {}
  }, []);

  React.useEffect(() => {
    if (!posters || posters.length === 0) return;
    try {
      const head = document.head || document.getElementsByTagName('head')[0];
      posters.slice(0, 10).forEach((href) => {
        if (!head.querySelector(`link[rel="preload"][as="image"][href="${href}"]`)) {
          const l = document.createElement('link');
          l.rel = 'preload';
          l.as = 'image';
          l.href = href;
          head.appendChild(l);
        }
      });
    } catch {}
  }, [posters]);

  // Redirect on login
  React.useEffect(() => {
    if (user) router.replace('/entertainment');
  }, [user, router]);

  return (
    <div className="relative min-h-[100svh] text-white overflow-hidden">
      <style>{`
        .google-btn{position:relative;isolation:isolate;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:rgba(0,0,0,0.08)}
        .google-btn::before{content:"";position:absolute;inset:-2px;border-radius:14px;background:radial-gradient(120px 60px at var(--mx,50%) var(--my,50%), rgba(99,102,241,.35), rgba(236,72,153,.25), transparent 60%);filter:blur(16px);opacity:0;transition:opacity .25s ease;z-index:-1}
        .google-btn:hover{transform:translateY(-1px)}
        .google-btn:hover::before{--mx:calc(var(--x)/var(--w)*100%);--my:calc(var(--y)/var(--h)*100%);opacity:1}
        .heading-title{font-weight:800;line-height:1.05;letter-spacing:-.02em;font-size:clamp(2.4rem,6.5vw + .4rem,5.6rem);margin:0 0 .35rem 0;background:linear-gradient(90deg,#fff,#f5caff 40%,#c7d2fe 75%,#ffffff);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 2px 8px rgba(0,0,0,.35)}
        .backdrop{position:absolute;inset:0;background:radial-gradient(120% 120% at 10% 10%, rgba(0,0,0,.55), rgba(0,0,0,.35), rgba(0,0,0,.15), rgba(0,0,0,.06), transparent 100%), linear-gradient(to bottom, rgba(0,0,0,.35), rgba(0,0,0,.08), rgba(0,0,0,0))}
        .tile{position:relative;aspect-ratio:2/3;border-radius:18px;overflow:hidden;background:#0b0f1a;box-shadow:0 8px 28px rgba(0,0,0,.35)}
        .img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.96}
      `}</style>

      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,#1e293b_0%,#0b1020_50%,#070a14_100%)]" />
        <div className="backdrop" />
        {(() => {
          const sources = posters.length ? posters : [
            'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#272935"/><stop offset="100%" stop-color="#0f1017"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>'),
          ];
          // Build a unique pool for the visible grid so every tile shows a different poster
          const perCol = 16; // visible items per column before duplication
          const colCount = 5;
          const totalNeeded = perCol * colCount;
          const uniquePool: string[] = [];
          const seen = new Set<string>();
          for (const u of sources) {
            if (!seen.has(u)) { seen.add(u); uniquePool.push(u); }
            if (uniquePool.length >= totalNeeded) break;
          }
          // If not enough unique posters, pad with placeholders (still unique vs posters)
          for (let i = 0; uniquePool.length < totalNeeded; i++) {
            uniquePool.push(`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450'><rect width='100%' height='100%' fill='${i%2?"#10131b":"#0c0f18"}'/></svg>`)}`);
          }
          // Distribute unique pool across columns without overlap
          const cols: string[][] = [];
          for (let c = 0; c < colCount; c++) {
            const start = c * perCol;
            cols.push(uniquePool.slice(start, start + perCol));
          }
          const duration = [56, 60, 52, 58, 62];
          return (
            <div className="absolute inset-0 w-[99%] mx-auto h-full flex space-x-0 md:space-x-1 px-0 md:px-1">
              {cols.map((items, idx)=> (
                <div key={idx} className={`relative h-full overflow-hidden w-1/3 md:w-1/5 ${idx>=3? 'hidden md:block':''}`}>
                  <div className="absolute inset-0">
                    <motion.div
                      className="flex flex-col will-change-transform transform-gpu"
                      initial={{ y: idx%2===1 ? '-50%' : '0%' }}
                      animate={{ y: idx%2===1 ? '0%' : '-50%' }}
                      transition={{ duration: duration[idx%duration.length], ease: 'linear', repeat: Infinity }}
                    >
                      {items.concat(items).map((src, j)=> {
                        const isTmdb = typeof src === 'string' && src.includes('image.tmdb.org');
                        const small = isTmdb ? src.replace('/w342','/w185') : src;
                        const big = isTmdb ? src : src;
                        return (
                          <div key={j} className="tile w-[94%] md:w-[90%] lg:w-[86%] self-center max-w-[340px] mt-0 mb-1 md:mb-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={small} srcSet={isTmdb ? `${small} 185w, ${big} 342w` : undefined} sizes="(max-width: 768px) 40vw, 18vw" alt="poster" className="img" decoding="async" loading={j < 6 ? 'eager' : 'lazy'} />
                          </div>
                        );
                      })}
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="relative z-10 min-h-[100svh] flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="heading-title">
            <span className="text-[#f0abfc]">Lights.</span> <span className="text-[#93c5fd]">Camera.</span> <span className="text-[#60a5fa]">Connect.</span>
          </h1>
          <p className="mt-2 text-neutral-300">Sign in to continue</p>
        </div>

        <div className="w-full max-w-[420px] mx-auto space-y-4">

          <button
            aria-label="Continue with Google"
            className="google-btn w-full inline-flex items-center justify-center gap-3 rounded-xl bg-white text-gray-900 hover:text-gray-950 transition shadow-lg shadow-blue-900/30 px-5 py-3.5 text-[15px] sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px]"
            onMouseMove={onHoverMove}
            onClick={onGoogle}
            disabled={busy}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.64-.2-2.43H12v4.6h6.46c-.28 1.48-1.15 2.73-2.45 3.57v2.96h3.96c2.32-2.13 3.66-5.27 3.66-8.7z"/>
              <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.97l-3.96-2.96c-1.1.74-2.5 1.18-4.14 1.18-3.18 0-5.88-2.15-6.84-5.04H1.1v3.16A12 12 0 0 0 12 24z"/>
              <path fill="#FBBC05" d="M5.16 14.21A7.2 7.2 0 0 1 4.78 12c0-.77.13-1.51.38-2.21V6.63H1.1A12 12 0 0 0 0 12c0 1.94.46 3.77 1.1 5.37l4.06-3.16z"/>
              <path fill="#EA4335" d="M12 4.75c1.79 0 3.4.62 4.66 1.85l3.5-3.5C18.06 1.26 15.3 0 12 0A12 12 0 0 0 1.1 6.63l4.06 3.16C6.11 6.9 8.82 4.75 12 4.75z"/>
            </svg>
            {busy ? "Redirecting…" : "Continue with Google"}
          </button>

          <button
            aria-label="Continue with Email"
            className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition shadow-lg shadow-blue-900/20 px-5 py-3.5 text-[15px] sm:text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px]"
            onClick={()=>{ setShowEmail(true); setTab('signin'); setTimeout(()=> emailInputRef.current?.focus(), 0); }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
              <path d="m22 6-10 7L2 6"/>
            </svg>
            Continue with Email
          </button>

          {showEmail && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-3 flex items-center gap-2 text-sm">
                <button onClick={()=>setTab('signin')} className={`px-3 py-1.5 rounded-md ${tab==='signin'?'bg-white text-black':'text-white/80 hover:bg-white/10'}`}>Sign in</button>
                <button onClick={()=>setTab('signup')} className={`px-3 py-1.5 rounded-md ${tab==='signup'?'bg-white text-black':'text-white/80 hover:bg-white/10'}`}>Sign up</button>
                <button onClick={()=>setTab('reset')} className={`ml-auto px-3 py-1.5 rounded-md ${tab==='reset'?'bg-white text-black':'text-white/80 hover:bg-white/10'}`}>Reset</button>
              </div>

              {tab!== 'reset' && (
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 space-y-3">
                  {tab==='signup' && (
                    <div>
                      <label className="block text-sm text-neutral-300 mb-1">Name</label>
                      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white outline-none focus:border-white/30" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1">Email</label>
                    <input ref={emailInputRef} value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white outline-none focus:border-white/30" />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1">Password</label>
                    <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="••••••••" className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white outline-none focus:border-white/30" />
                  </div>
                  {error && <div className="text-sm text-red-300">{error}</div>}
                  <div className="flex gap-3">
                    {tab==='signin' ? (
                      <button
                        onClick={async ()=>{ setError(null); try{ await signInWithEmail(email, password); } catch(e:any){ setError(e?.message||'Sign in failed'); } }}
                        className="px-4 py-2 rounded-md bg-white text-black text-sm font-semibold"
                      >Sign in</button>
                    ) : (
                      <button
                        onClick={async ()=>{
                          setError(null);
                          try{
                            await signUpWithEmail(email, password, name);
                          } catch(e:any){
                            const msg = e?.message || 'Sign up failed';
                            setError(msg);
                            if (e?.code === 'auth/email-already-in-use' || /already in use/i.test(msg)) {
                              setTab('signin');
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-md bg-white text-black text-sm font-semibold"
                      >Create account</button>
                    )}
                    <button onClick={()=>setTab('reset')} className="text-sm text-neutral-300 hover:text-white">Forgot password?</button>
                  </div>
                </div>
              )}

              {tab==='reset' && (
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 space-y-3">
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1">Email</label>
                    <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white outline-none focus:border-white/30" />
                  </div>
                  {error && <div className="text-sm text-red-300">{error}</div>}
                  <div className="flex gap-3">
                    <button
                      onClick={async ()=>{ setError(null); try{ await resetPassword(email); alert('Reset email sent if account exists.'); setTab('signin'); } catch(e:any){ setError(e?.message||'Reset failed'); } }}
                      className="px-4 py-2 rounded-md bg-white text-black text-sm font-semibold"
                    >Send reset link</button>
                    <button onClick={()=>setTab('signin')} className="text-sm text-neutral-300 hover:text-white">Back to sign in</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
