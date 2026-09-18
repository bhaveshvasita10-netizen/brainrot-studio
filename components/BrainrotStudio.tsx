'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Character={id?:string;name:string;animal?:string;prefix?:string;suffix?:string;visual_prompt?:string;personality?:string;bio?:string;is_favorite?:boolean};
type ChatMessage={role:'user'|'assistant';content:string};

const builtIn:Character[]=[
 {name:'Luna',animal:'Moon fox',personality:'gentle, witty, curious and quietly romantic',bio:'A moonlit fox who loves late-night conversations, music and little mysteries.'},
 {name:'Mika',animal:'Anime girl',personality:'energetic, teasing, loyal and optimistic',bio:'A cheerful adventurer who turns ordinary days into stories.'},
 {name:'Kai',animal:'Cyber wolf',personality:'calm, protective, clever and playful',bio:'A futuristic wolf who knows every hidden corner of the digital city.'},
 {name:'Ari',animal:'Ocean spirit',personality:'warm, thoughtful, dreamy and emotional',bio:'A sea-born companion who collects stories from every person she meets.'},
 {name:'Raven',animal:'Dark mage',personality:'sarcastic, mysterious, intelligent and caring',bio:'A powerful mage who pretends not to care, but remembers everything.'},
 {name:'Sora',animal:'Sky dragon',personality:'brave, funny, adventurous and affectionate',bio:'A young dragon who wants to explore every world beyond the clouds.'}
];

export default function BrainrotStudio(){
 const [user,setUser]=useState<User|null>(null),[email,setEmail]=useState(''),[authLoading,setAuthLoading]=useState(true),[authSending,setAuthSending]=useState(false);
 const [tab,setTab]=useState<'home'|'discover'|'chat'|'create'|'profile'>('home');
 const [saved,setSaved]=useState<Character[]>([]),[active,setActive]=useState<Character|null>(null);
 const [messages,setMessages]=useState<ChatMessage[]>([]),[draft,setDraft]=useState(''),[chatBusy,setChatBusy]=useState(false);
 const [search,setSearch]=useState(''),[category,setCategory]=useState('All'),[createName,setCreateName]=useState(''),[createBio,setCreateBio]=useState(''),[createPersonality,setCreatePersonality]=useState('');
 const [message,setMessage]=useState(''),[error,setError]=useState('');

 const loadSaved=async(u:User)=>{const {data}=await supabase.from('characters').select('id,name,animal,prefix,suffix,visual_prompt,is_favorite').eq('user_id',u.id).order('created_at',{ascending:false}).limit(50);setSaved((data||[]) as Character[])};
 useEffect(()=>{let mounted=true;supabase.auth.getUser().then(({data})=>{if(!mounted)return;setUser(data.user||null);setAuthLoading(false);if(data.user)loadSaved(data.user)});const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>{const u=s?.user||null;setUser(u);setAuthLoading(false);if(u)loadSaved(u);else setSaved([])});return()=>{mounted=false;listener.subscription.unsubscribe()}},[]);

 const all=useMemo(()=>[...saved,...builtIn.filter(b=>!saved.some(s=>s.name===b.name))],[saved]);
 const filtered=useMemo(()=>all.filter(c=>{const hay=[c.name,c.animal,c.personality,c.bio,c.visual_prompt].filter(Boolean).join(' ').toLowerCase();const matchesCategory=category==='All'||category==='Popular'||category===c.animal;return matchesCategory&&(!search||hay.includes(search.toLowerCase())||search.toLowerCase()==='romance'||search.toLowerCase()==='best friend'||search.toLowerCase()==='roleplay'||search.toLowerCase()==='adventure'||search.toLowerCase()==='comfort'||search.toLowerCase()==='anime')}),[all,search,category]);
 const categories=['All','Popular','Anime girl','Moon fox','Cyber wolf','Ocean spirit','Dark mage','Sky dragon'];

 async function sendMagicLink(e:FormEvent){e.preventDefault();const n=email.trim().toLowerCase();if(!n)return;setAuthSending(true);setError('');const {error:e2}=await supabase.auth.signInWithOtp({email:n,options:{emailRedirectTo:window.location.origin}});setAuthSending(false);e2?setError(e2.message):setMessage('Magic link sent. Check your email.')}

 function openChat(c:Character){setActive(c);setMessages([{role:'assistant',content:`Hey, I'm ${c.name}. ✨ What kind of world are we creating today?`}]);setTab('chat');setError('');setMessage('')}
 async function sendMessage(){const text=draft.trim();if(!text||!active||chatBusy)return;const next=[...messages,{role:'user' as const,content:text}];setMessages(next);setDraft('');setChatBusy(true);setError('');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({character:active,messages:next})});const d=await r.json();if(!r.ok)throw Error(d.error||'Chat failed.');setMessages([...next,{role:'assistant',content:d.reply}])}catch(e){setError(e instanceof Error?e.message:'Chat failed.')}finally{setChatBusy(false)}}
 async function saveCreated(){if(!user||!createName.trim())return;setError('');const c={user_id:user.id,name:createName.trim(),bio:createBio.trim(),personality:createPersonality.trim()||'warm, friendly and curious',animal:'Original',prefix:'',suffix:'',visual_prompt:'Original AI companion portrait, expressive face, cinematic soft lighting',status:'draft',is_favorite:false};const {data,error:e}=await supabase.from('characters').insert(c).select('id,name,animal,prefix,suffix,visual_prompt,is_favorite').single();if(e){setError(e.message);return}if(data){setSaved(x=>[data as Character,...x]);openChat({...c,...data} as Character);setCreateName('');setCreateBio('');setCreatePersonality('');setMessage('Your AI companion is ready.')}}

 if(authLoading)return <main className="soul-shell"><div className="soul-loading">Loading Soul…</div></main>;
 if(!user)return <main className="soul-shell auth-soul"><div className="auth-soul-card"><div className="soul-orb">✦</div><div className="brand">SOUL</div><h1>Meet someone who gets you.</h1><p>Discover AI companions with personality, memory and natural conversation.</p><form onSubmit={sendMagicLink}><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email address" required/><button disabled={authSending}>{authSending?'Sending…':'Continue'}</button></form>{message&&<div className="soul-notice">{message}</div>}{error&&<div className="soul-error">{error}</div>}</div></main>;

 return <main className="soul-shell">
  <header className="soul-header"><button className="brand-button" onClick={()=>setTab('home')}><span className="brand-orb">✦</span><span>SOUL</span></button><div className="header-search"><span>⌕</span><input value={search} onChange={e=>{setSearch(e.target.value);setTab('discover')}} placeholder="Search souls, stories, interests…" /></div><div className="header-actions"><button onClick={()=>setTab('create')}>＋ Create</button><button className="avatar-user" onClick={()=>setTab('profile')}>{user.email?.[0]?.toUpperCase()||'U'}</button></div></header>
  <div className="soul-layout">
   <aside className="soul-sidebar">
    <button className={tab==='home'?'side active':'side'} onClick={()=>setTab('home')}><span>⌂</span> Home</button>
    <button className={tab==='discover'?'side active':'side'} onClick={()=>setTab('discover')}><span>◉</span> Discover</button>
    <button className={tab==='chat'?'side active':'side'} onClick={()=>setTab('chat')}><span>♡</span> Messages</button>
    <button className={tab==='create'?'side active':'side'} onClick={()=>setTab('create')}><span>＋</span> Create Soul</button>
    <div className="side-divider"/>
    <div className="side-label">YOUR SOULS</div>
    {saved.slice(0,5).map(c=><button key={c.id||c.name} className="soul-mini" onClick={()=>openChat(c)}><span className="mini-avatar">{c.name[0]}</span><span>{c.name}</span></button>)}
    <div className="side-spacer"/>
    <button className={tab==='profile'?'side active':'side'} onClick={()=>setTab('profile')}><span>◯</span> Profile</button>
   </aside>
   <section className="soul-main">
    {tab==='home'&&<><div className="hero-soul"><div><div className="eyebrow-soul">YOUR PERSONAL AI UNIVERSE</div><h1>Find a soul that<br/><em>feels like yours.</em></h1><p>Talk, create, explore and build meaningful stories with AI companions made for you.</p><button className="hero-button" onClick={()=>setTab('discover')}>Explore Souls <span>→</span></button></div><div className="hero-art"><div className="hero-glow"/><div className="hero-character">✦</div><div className="floating-card">AI companion<br/><b>Online now</b></div></div></div>
      <div className="section-head"><div><h2>Made for your mood</h2><p>Pick a personality and start talking.</p></div><button onClick={()=>setTab('discover')}>See all →</button></div><div className="mood-row">{['Romance','Best friend','Anime','Roleplay','Adventure','Comfort'].map((x,i)=><button key={x} onClick={()=>{setSearch(x);setTab('discover')}}><span>{['♡','☻','✦','◈','♢','☾'][i]}</span>{x}</button>)}</div>
      <div className="section-head"><div><h2>Popular souls</h2><p>Characters people are talking to.</p></div><button onClick={()=>setTab('discover')}>View all →</button></div><div className="soul-grid">{all.slice(0,6).map((c,i)=><SoulCard key={c.id||c.name} c={c} i={i} onChat={openChat}/>)}</div></>}
    {tab==='discover'&&<><div className="discover-title"><div><div className="eyebrow-soul">DISCOVER</div><h1>Find your kind of connection.</h1><p>Explore companions, personalities and stories.</p></div></div><div className="category-row">{categories.map(x=><button key={x} className={category===x?'chosen':''} onClick={()=>setCategory(x)}>{x}</button>)}</div><div className="soul-grid">{filtered.map((c,i)=><SoulCard key={c.id||c.name} c={c} i={i} onChat={openChat}/>)}</div>{filtered.length===0&&<div className="empty-soul">No souls found. Try another search.</div>}</>}
    {tab==='chat'&&<Chat active={active} messages={messages} draft={draft} setDraft={setDraft} onSend={sendMessage} busy={chatBusy} onBack={()=>setTab('discover')}/>}
    {tab==='create'&&<div className="create-page"><div className="eyebrow-soul">CREATE YOUR SOUL</div><h1>Give your idea a personality.</h1><p>Build a companion with its own identity, voice and story.</p><div className="create-grid"><div className="preview-soul"><div className="preview-orb">✦</div><span>{createName||'Your Soul'}</span><small>{createPersonality||'Your companion personality'}</small></div><div className="create-form"><label>Name<input value={createName} onChange={e=>setCreateName(e.target.value)} placeholder="e.g. Luna"/></label><label>Personality<textarea value={createPersonality} onChange={e=>setCreatePersonality(e.target.value)} placeholder="Warm, funny, confident, mysterious…" rows={4}/></label><label>Backstory<textarea value={createBio} onChange={e=>setCreateBio(e.target.value)} placeholder="Who are they? What do they love?" rows={5}/></label><button className="hero-button" onClick={saveCreated} disabled={!createName.trim()}>Create Soul <span>→</span></button></div></div></div>}
    {tab==='profile'&&<div className="profile-page"><div className="profile-cover"><div className="profile-avatar">{user.email?.[0]?.toUpperCase()||'U'}</div></div><h1>{user.email?.split('@')[0]||'Soul User'}</h1><p>{user.email}</p><div className="profile-stats"><div><b>{saved.length}</b><span>Souls</span></div><div><b>{messages.length}</b><span>Recent messages</span></div><div><b>∞</b><span>Possibilities</span></div></div><button className="profile-signout" onClick={()=>supabase.auth.signOut()}>Sign out</button></div>}
    {error&&<div className="soul-error floating-error">{error}</div>}{message&&<div className="soul-notice floating-notice">{message}</div>}
   </section>
  </div>
 </main>;
}

function SoulCard({c,i,onChat}:{c:Character;i:number;onChat:(c:Character)=>void}){
 const gradients=['violet','rose','blue','teal','amber','pink'];
 return <article className="soul-card"><div className={`soul-picture ${gradients[i%gradients.length]}`}><div className="picture-symbol">{['☾','✦','◇','♢','☀','✧'][i%6]}</div><span className="online-dot"/></div><div className="soul-card-body"><div className="soul-card-title"><h3>{c.name}</h3><span>⋯</span></div><small>{c.animal||'AI companion'} · AI</small><p>{c.bio||c.visual_prompt||'A unique companion ready for a new conversation.'}</p><button onClick={()=>onChat(c)}>Start chat</button></div></article>;
}

function Chat({active,messages,draft,setDraft,onSend,busy,onBack}:{active:Character|null;messages:ChatMessage[];draft:string;setDraft:(x:string)=>void;onSend:()=>void;busy:boolean;onBack:()=>void}){
 if(!active)return <div className="empty-soul chat-empty"><div className="preview-orb">✦</div><h2>Choose a soul to begin.</h2><p>Open Discover and meet someone new.</p><button className="hero-button" onClick={onBack}>Discover Souls →</button></div>;
 return <div className="chat-page"><div className="chat-top"><button onClick={onBack}>←</button><div className="chat-avatar">{active.name[0]}</div><div><b>{active.name}</b><small>● Online · remembers your conversations</small></div><div className="chat-top-actions"><button>♡</button><button>⋯</button></div></div><div className="chat-messages">{messages.map((m,i)=><div key={i} className={m.role==='user'?'bubble-row user':'bubble-row'}><div className="bubble">{m.content}</div></div>)}{busy&&<div className="typing"><span/><span/><span/></div>}</div><div className="chat-composer"><button>＋</button><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onSend()}} placeholder={`Message ${active.name}…`} /><button>◉</button><button className="send" onClick={onSend} disabled={busy||!draft.trim()}>↑</button></div></div>;
}
