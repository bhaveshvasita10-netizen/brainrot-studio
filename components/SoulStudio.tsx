'use client';

import { useEffect, useMemo, useState } from 'react';

type Soul = {
  id: string;
  name: string;
  role: string;
  bio: string;
  personality: string;
  tags: string[];
  color: string;
  greeting: string;
  favorite?: boolean;
  custom?: boolean;
};

type Message = { role: 'user' | 'assistant'; content: string; time: string };

const starterSouls: Soul[] = [
  { id:'luna', name:'Luna', role:'Dreamy confidant', bio:'A calm, moonlit companion for late-night thoughts, music and meaningful conversations.', personality:'gentle, witty, curious, emotionally attentive', tags:['Comfort','Romance','Late night'], color:'lavender', greeting:'You made it. ✦ Tell me what is on your mind tonight.' },
  { id:'mika', name:'Mika', role:'Playful best friend', bio:'Bright energy, terrible jokes and unlimited encouragement for whatever you are building.', personality:'playful, energetic, loyal, teasing', tags:['Best friend','Fun','Adventure'], color:'rose', greeting:'Okay, I am officially here. What are we getting ourselves into?' },
  { id:'kai', name:'Kai', role:'Cyberpunk guide', bio:'A sharp, protective companion from a neon city who loves strategy and futuristic stories.', personality:'calm, clever, protective, dry humor', tags:['Roleplay','Adventure','Sci-fi'], color:'blue', greeting:'Neon lights are on. Mission briefing: what do you want to explore?' },
  { id:'ari', name:'Ari', role:'Ocean dreamer', bio:'Warm, reflective and endlessly curious about people, memories and the places they dream about.', personality:'warm, thoughtful, dreamy, patient', tags:['Comfort','Travel','Stories'], color:'teal', greeting:'Take a breath. I am listening. Where should our conversation begin?' },
  { id:'raven', name:'Raven', role:'Mysterious mentor', bio:'Sarcastic on the surface, caring underneath. Loves books, puzzles and complicated questions.', personality:'mysterious, intelligent, sarcastic, caring', tags:['Books','Roleplay','Advice'], color:'plum', greeting:'You have my attention. Ask the question you have been avoiding.' },
  { id:'sora', name:'Sora', role:'Sky adventurer', bio:'A fearless fantasy companion who wants to turn ordinary conversations into extraordinary quests.', personality:'brave, funny, affectionate, adventurous', tags:['Fantasy','Adventure','Romance'], color:'gold', greeting:'The sky is wide open. Pick a destination and I will come with you.' },
];

const quickPrompts = ['Tell me about yourself','I had a difficult day','Plan an adventure with me','Give me some motivation','Let us create a story'];

function now(){ return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
function replyFallback(soul:Soul, text:string){
  const t=text.toLowerCase();
  if(t.includes('hello')||t.includes('hi ')) return `Hey. I am ${soul.name}. I am glad you are here. What kind of conversation do you want?`;
  if(t.includes('difficult')||t.includes('sad')||t.includes('bad day')) return `I am here with you. You do not have to solve everything at once. Want to tell me what happened, or would you rather take your mind somewhere else for a while?`;
  if(t.includes('adventure')||t.includes('story')) return `Then let us make it cinematic: midnight, a quiet city, one impossible clue and a decision waiting for us. You choose the first move.`;
  if(t.includes('motivat')) return `One small move is enough for now. Tell me the thing you want to finish, and we can break it into a first step that feels manageable.`;
  return `I hear you. As ${soul.name}, I would say: slow down for a second and give me the part of the thought you have not said out loud yet.`;
}

export default function SoulStudio(){
  const [tab,setTab]=useState<'home'|'discover'|'chat'|'create'|'library'|'profile'>('home');
  const [souls,setSouls]=useState<Soul[]>(starterSouls);
  const [active,setActive]=useState<Soul|null>(null);
  const [messages,setMessages]=useState<Record<string,Message[]>>({});
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('All');
  const [typing,setTyping]=useState(false);
  const [notice,setNotice]=useState('');
  const [mature,setMature]=useState(false);
  const [voice,setVoice]=useState(false);
  const [create,setCreate]=useState({name:'',role:'',bio:'',personality:''});

  useEffect(()=>{
    try{
      const raw=localStorage.getItem('soul-app-v1');
      if(raw){const d=JSON.parse(raw);if(d.souls?.length)setSouls([...starterSouls,...d.souls.filter((x:Soul)=>x.custom)]);setMessages(d.messages||{});setMature(Boolean(d.mature));}
    }catch{}
  },[]);

  useEffect(()=>{try{localStorage.setItem('soul-app-v1',JSON.stringify({souls:souls.filter(s=>s.custom),messages,mature}));}catch{}},[souls,messages,mature]);

  const categories=useMemo(()=>['All','Comfort','Romance','Best friend','Roleplay','Adventure','Fantasy','Sci-fi','Books'],[]);
  const visible=useMemo(()=>souls.filter(s=>{
    const q=search.trim().toLowerCase();
    const hit=!q||[s.name,s.role,s.bio,s.personality,...s.tags].join(' ').toLowerCase().includes(q);
    const cat=filter==='All'||s.tags.includes(filter);
    return hit&&cat;
  }),[souls,search,filter]);

  function openSoul(s:Soul){
    setActive(s);setTab('chat');setNotice('');
    if(!messages[s.id])setMessages(m=>({...m,[s.id]:[{role:'assistant',content:s.greeting,time:now()}]}));
  }

  async function send(text=draft){
    const value=text.trim(); if(!value||!active||typing)return;
    const history=[...(messages[active.id]||[]),{role:'user' as const,content:value,time:now()}];
    setMessages(m=>({...m,[active.id]:history}));setDraft('');setTyping(true);
    try{
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        character:{name:active.name,personality:active.personality,bio:active.bio,relationship_style:mature?'adult romance / affection':'friendship'},
        messages:history.map(x=>({role:x.role,content:x.content})), matureEnabled:mature
      })});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Chat is unavailable.');
      setMessages(m=>({...m,[active.id]:[...history,{role:'assistant',content:data.reply,time:now()}]}));
    }catch{
      await new Promise(r=>setTimeout(r,450));
      const answer=replyFallback(active,value);
      setMessages(m=>({...m,[active.id]:[...history,{role:'assistant',content:answer,time:now()}]}));
      setNotice('Demo reply used. Add OPENAI_API_KEY in Vercel for live AI conversations.');
    }finally{setTyping(false);}
  }

  function createSoul(){
    if(!create.name.trim())return;
    const id='custom-'+Date.now();
    const s:Soul={id,name:create.name.trim(),role:create.role.trim()||'Your AI companion',bio:create.bio.trim()||'A companion created just for you.',personality:create.personality.trim()||'warm, curious and supportive',tags:['Custom'],color:'custom',greeting:`Hey, I am ${create.name.trim()}. You created me, so tell me what kind of connection you want us to have.`,custom:true};
    setSouls(x=>[s,...x]);setCreate({name:'',role:'',bio:'',personality:''});openSoul(s);
  }

  function toggleFavorite(id:string){setSouls(x=>x.map(s=>s.id===id?{...s,favorite:!s.favorite}:s));}
  function speak(text:string){if(typeof window==='undefined'||!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.96;window.speechSynthesis.speak(u);}
  function nav(next:typeof tab){setTab(next);setNotice('');}

  return <main className="soul-app">
    <header className="topbar">
      <button className="logo" onClick={()=>nav('home')}><span className="logo-mark">S</span><span>SOUL</span></button>
      <div className="top-search"><span>⌕</span><input value={search} onChange={e=>{setSearch(e.target.value);nav('discover')}} placeholder="Search souls, personalities, interests..." /></div>
      <button className="create-top" onClick={()=>nav('create')}>＋ Create</button>
      <button className="profile-chip" onClick={()=>nav('profile')}>B</button>
    </header>

    <div className="app-layout">
      <aside className="sidebar">
        <nav>
          <button className={tab==='home'?'active':''} onClick={()=>nav('home')}><i>⌂</i>Home</button>
          <button className={tab==='discover'?'active':''} onClick={()=>nav('discover')}><i>◉</i>Discover</button>
          <button className={tab==='chat'?'active':''} onClick={()=>nav('chat')}><i>♡</i>Messages</button>
          <button className={tab==='create'?'active':''} onClick={()=>nav('create')}><i>＋</i>Create Soul</button>
        </nav>
        <div className="side-title">YOUR SOULS</div>
        {souls.filter(s=>s.favorite||s.custom).slice(0,5).map(s=><button className="mini-soul" key={s.id} onClick={()=>openSoul(s)}><span className={`mini-avatar ${s.color}`}>{s.name[0]}</span><span>{s.name}</span></button>)}
        <div className="side-grow"/>
        <button className={tab==='library'?'active':''} onClick={()=>nav('library')}><i>♡</i>Library</button>
        <button className={tab==='profile'?'active':''} onClick={()=>nav('profile')}><i>◯</i>Profile</button>
      </aside>

      <section className="content">
        {tab==='home'&&<Home souls={souls} openSoul={openSoul} nav={nav} />}
        {tab==='discover'&&<Discover souls={visible} filter={filter} setFilter={setFilter} categories={categories} openSoul={openSoul} toggleFavorite={toggleFavorite} />}
        {tab==='chat'&&<Chat active={active} messages={active?messages[active.id]||[]:[]} draft={draft} setDraft={setDraft} typing={typing} send={send} openDiscover={()=>nav('discover')} voice={voice} setVoice={setVoice} speak={speak} />}
        {tab==='create'&&<Create create={create} setCreate={setCreate} createSoul={createSoul}/>}
        {tab==='library'&&<Library souls={souls.filter(s=>s.favorite)} openSoul={openSoul} />}
        {tab==='profile'&&<Profile mature={mature} setMature={setMature} voice={voice} setVoice={setVoice}/>}
        {notice&&<button className="notice" onClick={()=>setNotice('')}>{notice} <b>×</b></button>}
      </section>
    </div>
  </main>;
}

function Home({souls,openSoul,nav}:{souls:Soul[];openSoul:(s:Soul)=>void;nav:(x:any)=>void}){
 return <div className="page home">
   <section className="hero">
    <div className="hero-copy"><span className="eyebrow">YOUR PERSONAL AI UNIVERSE</span><h1>Find a soul that<br/><em>feels like yours.</em></h1><p>Meet AI companions with distinct personalities. Talk naturally, build stories, remember moments and create someone entirely your own.</p><button className="primary" onClick={()=>nav('discover')}>Explore souls <b>→</b></button></div>
    <div className="hero-visual"><div className="orb orb-a"/><div className="orb orb-b"/><div className="hero-face">✦</div><div className="status-card"><span/> 12,482 souls online</div></div>
   </section>
   <section className="section"><div className="section-title"><div><h2>Made for your mood</h2><p>Start with the kind of connection you want today.</p></div><button onClick={()=>nav('discover')}>See all →</button></div>
    <div className="mood-grid">{[['♡','Romance'],['☻','Best friend'],['✦','Anime'],['◈','Roleplay'],['◇','Adventure'],['☾','Comfort']].map(([icon,label])=><button key={label} onClick={()=>nav('discover')}><span>{icon}</span>{label}<b>→</b></button>)}</div>
   </section>
   <section className="section"><div className="section-title"><div><h2>Popular souls</h2><p>Six different personalities. One place to start.</p></div><button onClick={()=>nav('discover')}>View all →</button></div><div className="soul-grid">{souls.slice(0,6).map((s,i)=><SoulCard key={s.id} soul={s} index={i} openSoul={openSoul}/>)}</div></section>
 </div>
}

function Discover({souls,filter,setFilter,categories,openSoul,toggleFavorite}:{souls:Soul[];filter:string;setFilter:(x:string)=>void;categories:string[];openSoul:(s:Soul)=>void;toggleFavorite:(id:string)=>void}){
 return <div className="page"><div className="page-head"><span className="eyebrow">DISCOVER</span><h1>Find your kind of connection.</h1><p>Explore personalities, moods and original companions.</p></div><div className="filters">{categories.map(c=><button className={filter===c?'selected':''} key={c} onClick={()=>setFilter(c)}>{c}</button>)}</div>{souls.length?<div className="soul-grid">{souls.map((s,i)=><SoulCard key={s.id} soul={s} index={i} openSoul={openSoul} toggleFavorite={toggleFavorite}/>)}</div>:<div className="empty"><span>✦</span><h2>No souls found</h2><p>Try another search or category.</p></div>}</div>
}

function SoulCard({soul,index,openSoul,toggleFavorite}:{soul:Soul;index:number;openSoul:(s:Soul)=>void;toggleFavorite?:(id:string)=>void}){
 return <article className="soul-card"><div className={`soul-art ${soul.color}`}><div className="portrait">{['☾','✦','◇','♢','☀','✧'][index%6]}</div><span className="online">●</span></div><div className="card-body"><div className="card-name"><div><h3>{soul.name}</h3><small>{soul.role}</small></div>{toggleFavorite&&<button className={soul.favorite?'heart on':'heart'} onClick={()=>toggleFavorite(soul.id)}>{soul.favorite?'♥':'♡'}</button>}</div><p>{soul.bio}</p><div className="tags">{soul.tags.slice(0,3).map(t=><span key={t}>{t}</span>)}</div><button className="chat-btn" onClick={()=>openSoul(soul)}>Start chatting <b>→</b></button></div></article>
}

function Chat({active,messages,draft,setDraft,typing,send,openDiscover,voice,setVoice,speak}:{active:Soul|null;messages:Message[];draft:string;setDraft:(x:string)=>void;typing:boolean;send:(x?:string)=>void;openDiscover:()=>void;voice:boolean;setVoice:(x:boolean)=>void;speak:(x:string)=>void}){
 if(!active)return <div className="empty chat-empty"><div className="empty-orb">S</div><h2>Choose a soul to begin.</h2><p>Your conversations will stay on this device in this demo.</p><button className="primary" onClick={openDiscover}>Discover souls →</button></div>;
 return <div className="chat-wrap"><header className="chat-header"><button onClick={openDiscover}>←</button><div className={`chat-avatar ${active.color}`}>{active.name[0]}</div><div><b>{active.name}</b><small><span/> Online · remembers the conversation</small></div><div className="chat-actions"><button onClick={()=>setVoice(!voice)} title="Voice">{voice?'◉':'◌'}</button><button onClick={()=>speak(messages.at(-1)?.content||active.greeting)} title="Read aloud">♬</button><button>⋯</button></div></header><div className="chat-body">{messages.map((m,i)=><div className={m.role==='user'?'msg-row user':'msg-row'} key={i}><div className="msg"><div>{m.content}</div><small>{m.time}</small></div></div>)}{typing&&<div className="msg-row"><div className="typing"><i/><i/><i/></div></div>}</div><div className="quick">{quickPrompts.map(p=><button key={p} onClick={()=>send(p)}>{p}</button>)}</div><div className="composer"><button>＋</button><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}} placeholder={`Message ${active.name}...`}/><button onClick={()=>speak(draft)} title="Speak draft">♬</button><button className="send" disabled={!draft.trim()||typing} onClick={()=>send()}>↑</button></div><div className="chat-note">Soul is an AI companion. Avoid sharing sensitive personal information.</div></div>
}

function Create({create,setCreate,createSoul}:{create:{name:string;role:string;bio:string;personality:string};setCreate:(x:any)=>void;createSoul:()=>void}){
 return <div className="page create-page"><div className="page-head"><span className="eyebrow">CREATE SOUL</span><h1>Give your idea a personality.</h1><p>Design an original companion with a name, identity and conversation style.</p></div><div className="create-layout"><div className="preview"><div className="preview-glow"/><div className="preview-avatar">{create.name?.[0]||'S'}</div><h2>{create.name||'Your Soul'}</h2><span>{create.role||'AI companion'}</span><p>{create.bio||'A new personality, created by you.'}</p></div><div className="form-card"><label>Name<input value={create.name} onChange={e=>setCreate({...create,name:e.target.value})} placeholder="e.g. Nova"/></label><label>Role<input value={create.role} onChange={e=>setCreate({...create,role:e.target.value})} placeholder="e.g. Playful best friend"/></label><label>Personality<textarea value={create.personality} onChange={e=>setCreate({...create,personality:e.target.value})} rows={4} placeholder="Warm, funny, confident, mysterious..."/></label><label>Backstory<textarea value={create.bio} onChange={e=>setCreate({...create,bio:e.target.value})} rows={5} placeholder="What do they love? What makes them unique?"/></label><button className="primary wide" disabled={!create.name.trim()} onClick={createSoul}>Create my Soul <b>→</b></button></div></div></div>
}

function Library({souls,openSoul}:{souls:Soul[];openSoul:(s:Soul)=>void}){
 return <div className="page"><div className="page-head"><span className="eyebrow">LIBRARY</span><h1>Your saved souls.</h1><p>Keep the companions you want close.</p></div>{souls.length?<div className="soul-grid">{souls.map((s,i)=><SoulCard key={s.id} soul={s} index={i} openSoul={openSoul}/>)}</div>:<div className="empty"><span>♡</span><h2>Your library is empty</h2><p>Favorite a soul in Discover and it will appear here.</p></div>}</div>
}

function Profile({mature,setMature,voice,setVoice}:{mature:boolean;setMature:(x:boolean)=>void;voice:boolean;setVoice:(x:boolean)=>void}){
 return <div className="page profile-page"><div className="profile-hero"><div className="big-avatar">B</div><div><span className="eyebrow">YOUR PROFILE</span><h1>Welcome to Soul.</h1><p>Your preferences are stored locally in this demo.</p></div></div><div className="settings-card"><h2>Preferences</h2><div className="setting"><div><b>18+ mature conversation</b><small>Allows romantic, affectionate and mature non-graphic conversation between adults. It does not enable explicit sexual content.</small></div><button className={mature?'toggle on':'toggle'} onClick={()=>setMature(!mature)}><span/></button></div><div className="setting"><div><b>Voice mode</b><small>Use your browser's speech features for read-aloud replies.</small></div><button className={voice?'toggle on':'toggle'} onClick={()=>setVoice(!voice)}><span/></button></div></div><div className="privacy-card"><b>Privacy first</b><p>This starter stores conversations and created souls in your browser's local storage. Add a database/auth layer before collecting real user data.</p></div></div>
}
