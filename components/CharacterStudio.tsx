'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Character = { id?: string; animal:string; prefix:string; suffix:string; name:string; is_favorite?:boolean };
type YoutubeAccount = { id:string; channelName:string; channelId:string };
const icons = ['🐯','🦈','🐙','🦖','🐼','🦄','🐊','🦁','🐸','🐵'];

export default function CharacterStudio(){
  const [user,setUser]=useState<User|null>(null),[email,setEmail]=useState(''),[authLoading,setAuthLoading]=useState(true),[authSending,setAuthSending]=useState(false);
  const [characters,setCharacters]=useState<Character[]>([]),[saved,setSaved]=useState<Character[]>([]),[loading,setLoading]=useState(false),[saving,setSaving]=useState(''),[count,setCount]=useState(10),[message,setMessage]=useState('');
  const [youtube,setYoutube]=useState<YoutubeAccount|null>(null),[youtubeBusy,setYoutubeBusy]=useState(false);

  async function loadSaved(currentUser:User){
    const {data,error}=await supabase.from('characters').select('id,name,animal,prefix,suffix,is_favorite').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(24);
    if(!error)setSaved(data??[]);
  }

  async function loadYoutube(currentUser:User){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token||session.user.id!==currentUser.id){setYoutube(null);return;}
    const response=await fetch('/api/youtube/status',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    setYoutube(data.account??null);
  }

  useEffect(()=>{
    let mounted=true;
    supabase.auth.getUser().then(({data})=>{if(!mounted)return;setUser(data.user??null);setAuthLoading(false);if(data.user){loadSaved(data.user);loadYoutube(data.user);}});
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{const nextUser=session?.user??null;setUser(nextUser);setAuthLoading(false);if(nextUser){loadSaved(nextUser);loadYoutube(nextUser);}else{setSaved([]);setYoutube(null);}});
    return()=>{mounted=false;listener.subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    if(params.get('youtube')==='connected'){setMessage('YouTube connected successfully.');window.history.replaceState({},'',window.location.pathname);if(user)loadYoutube(user);}
  },[user]);

  async function sendMagicLink(event:FormEvent){
    event.preventDefault();const normalized=email.trim().toLowerCase();if(!normalized)return;setAuthSending(true);setMessage('');
    const {error}=await supabase.auth.signInWithOtp({email:normalized,options:{emailRedirectTo:window.location.origin}});setAuthSending(false);setMessage(error?error.message:'Magic link sent. Check your email to enter Brainrot Studio.');
  }
  async function signOut(){await supabase.auth.signOut();setCharacters([]);setSaved([]);setYoutube(null);}
  async function connectYoutube(){
    if(!user){setMessage('Sign in first to connect YouTube.');return;}
    setYoutubeBusy(true);setMessage('');
    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token)throw new Error('Your login session expired. Please sign in again.');
      const response=await fetch('/api/youtube/connect',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error??'Unable to start YouTube connection.');
      if(data.url)window.location.assign(data.url);else throw new Error('YouTube authorization URL was not returned.');
    }catch(error){setMessage(error instanceof Error?error.message:'YouTube connection failed.');setYoutubeBusy(false);}
  }
  async function disconnectYoutube(){
    const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return;
    setYoutubeBusy(true);setMessage('');
    const response=await fetch('/api/youtube/disconnect',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`} });
    const data=await response.json().catch(()=>({}));
    setYoutubeBusy(false);
    if(!response.ok){setMessage(data.error??'Unable to disconnect YouTube.');return;}
    setYoutube(null);setMessage('YouTube disconnected.');
  }
  async function spin(){
    setLoading(true);setMessage('');try{const response=await fetch(`/api/animals/random?count=${count}`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error??'Randomizer failed');setCharacters(data.characters??[]);}catch(error){setMessage(error instanceof Error?error.message:'Randomizer failed');}finally{setLoading(false);}
  }
  async function save(character:Character){
    if(!user){setMessage('Sign in first to save characters.');return;}setSaving(character.name);setMessage('');
    const visualPrompt=`Original kid-friendly surreal 3D cartoon character, ${character.name}, based on a ${character.animal.toLowerCase()}, exaggerated playful proportions, expressive face, colorful cinematic lighting, clean family-friendly design, no existing copyrighted characters.`;
    const {error}=await supabase.from('characters').insert({user_id:user.id,name:character.name,animal:character.animal,prefix:character.prefix,suffix:character.suffix,visual_prompt:visualPrompt,status:'draft',is_favorite:false});
    setSaving('');if(error){setMessage(error.message);return;}setMessage(`${character.name} saved.`);await loadSaved(user);
  }
  async function favorite(character:Character){
    if(!user||!character.id)return;const {error}=await supabase.from('characters').update({is_favorite:!character.is_favorite}).eq('id',character.id).eq('user_id',user.id);if(!error)await loadSaved(user);
  }

  if(authLoading)return <main className="page"><div className="loading-screen">Loading Brainrot Studio…</div></main>;
  if(!user)return <main className="page auth-page"><div className="auth-card card"><div className="logo-mark">🧠</div><div className="eyebrow">BRAINROT STUDIO AI</div><h1>Build ridiculous original cartoons.</h1><p className="muted">Sign in with a magic link to save your characters and build videos.</p><form onSubmit={sendMagicLink} className="auth-form"><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" required/><button className="btn primary" disabled={authSending}>{authSending?'SENDING…':'SEND MAGIC LINK'}</button></form>{message&&<div className="notice">{message}</div>}<div className="auth-note">Your creative library is private to your account.</div></div></main>;
  return <main className="page"><div className="topbar"><div><div className="eyebrow">AI CARTOON FACTORY</div><h1>Brainrot Studio 🧠</h1><p>Original surreal characters, built for the next generation of videos.</p></div><div className="top-actions"><div className="db-pill"><span/> SUPABASE CONNECTED</div>{youtube?<div className="db-pill">▶ {youtube.channelName}</div>:<button className="btn primary" onClick={connectYoutube} disabled={youtubeBusy}>{youtubeBusy?'OPENING…':'▶ CONNECT YOUTUBE'}</button>}{youtube&&<button className="btn ghost" onClick={disconnectYoutube} disabled={youtubeBusy}>{youtubeBusy?'…':'Disconnect'}</button>}<button className="btn ghost" onClick={signOut}>Sign out</button></div></div>
    <section className="card studio-card"><div className="section-title-row"><div><div className="eyebrow">CHARACTER STUDIO</div><h2>Spin a batch</h2></div><div className="controls"><select value={count} onChange={e=>setCount(Number(e.target.value))}>{[1,5,10,25].map(v=><option key={v} value={v}>{v} characters</option>)}</select><button className="btn primary" onClick={spin} disabled={loading}>{loading?'SPINNING…':'🎲 SPIN'}</button></div></div>{message&&<div className="notice">{message}</div>}<div className="character-grid">{characters.length===0?<div className="empty-state"><div>🎲</div><b>Press SPIN</b><span>Create your first original characters.</span></div>:characters.map((character,index)=><article className="character-card" key={`${character.name}-${index}`}><div className="avatar">{icons[index%icons.length]}</div><div className="character-copy"><h3>{character.name}</h3><p>{character.animal} · {character.prefix} · {character.suffix}</p><button className="save-btn" onClick={()=>save(character)} disabled={saving===character.name}>{saving===character.name?'SAVING…':'＋ Save to library'}</button></div></article>)}</div></section>
    <section className="card library-card"><div className="section-title-row"><div><div className="eyebrow">CHARACTER LIBRARY</div><h2>Your saved characters</h2></div><span className="muted">{saved.length} shown</span></div>{saved.length===0?<div className="library-empty">No saved characters yet. Spin above and save your first one.</div>:<div className="saved-grid">{saved.map(character=><div className="saved-item" key={character.id}><div><b>{character.name}</b><small>{character.animal}</small></div><button aria-label={`Favorite ${character.name}`} onClick={()=>favorite(character)}>{character.is_favorite?'★':'☆'}</button></div>)}</div>}</section>
    <div className="roadmap"><b>Production path:</b> character image → story → scenes → voice → video → YouTube scheduler.</div>
  </main>;
}
