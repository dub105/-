import { useState, useEffect, useCallback, useRef } from "react";

// ─── constants ───────────────────────────────────────────────────
const C = {
  bg:"#0f1117", surf:"#181c27", surf2:"#1f2437", surf3:"#252c42",
  border:"#2a3050", border2:"#374060",
  text:"#e2e8f0", sub:"#64748b", dim:"#94a3b8",
  ok:"#4ade80", warn:"#fbbf24", danger:"#f87171", accent:"#f59e0b", blue:"#60a5fa",
};
const PALETTE = ["#6ee7b7","#a78bfa","#60a5fa","#fb923c","#f472b6","#facc15","#34d399","#f87171","#38bdf8","#c084fc"];
const ICONS   = ["💊","🔬","🦠","🛡️","🧬","🩺","🧪","🫀","🫁","🧠","💉","🩻","📖","📋","⚗️","🔭","🎯","🌡️"];
const DAYS    = ["日","月","火","水","木","金","土"];
const UL      = {
  1:{label:"未習",   bg:"rgba(248,113,113,.12)",color:"#fca5a5",bd:"rgba(248,113,113,.25)"},
  2:{label:"不確か", bg:"rgba(251,191,36,.12)", color:"#fcd34d",bd:"rgba(251,191,36,.25)"},
  3:{label:"理解済", bg:"rgba(74,222,128,.12)", color:"#86efac",bd:"rgba(74,222,128,.25)"},
};
const NAV = [
  {view:"dashboard", icon:"📊", label:"ダッシュボード",  group:"学習"},
  {view:"plan",      icon:"🤖", label:"学習計画 AI提案", group:"学習"},
  {view:"checklist", icon:"☑️", label:"理解度チェック",   group:"学習"},
  {view:"schedule",  icon:"📅", label:"週間スケジュール", group:"学習"},
  {view:"timer",     icon:"⏱️", label:"記録・レポート",   group:"学習"},
  {view:"subjects",  icon:"📚", label:"科目管理",         group:"管理"},
  {view:"exams",     icon:"🎯", label:"試験・目標管理",   group:"管理"},
  {view:"memo",      icon:"📝", label:"科目メモ",         group:"管理"},
];

// ─── utils ───────────────────────────────────────────────────────
const uid  = () => Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const dsOf = (d=new Date()) => d.toISOString().slice(0,10);
const TODAY = new Date();
function daysUntil(s){ if(!s)return null; const n=new Date();n.setHours(0,0,0,0);return Math.ceil((new Date(s+"T00:00:00")-n)/86400000); }
function fmtMins(m){ return m>=60?`${Math.floor(m/60)}時間${m%60?m%60+"分":""}`:m+"分"; }
function fmtSecs(s){ const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; return h>0?`${h}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`:`${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`; }
function secsToMins(s){ return Math.round(s/60); }

// ─── seed ────────────────────────────────────────────────────────
function makeSeed(){
  const [pId,paId,mId,iId]=[uid(),uid(),uid(),uid()];
  const subjects=[
    {id:pId,  name:"薬理学",  icon:"💊",color:"#6ee7b7",note:""},
    {id:paId, name:"病理学",  icon:"🔬",color:"#a78bfa",note:""},
    {id:mId,  name:"微生物学",icon:"🦠",color:"#60a5fa",note:""},
    {id:iId,  name:"免疫学",  icon:"🛡️",color:"#fb923c",note:""},
  ];
  const themes=[],topics=[];
  [{sid:pId,tms:[{n:"自律神経薬",tps:[{n:"アドレナリン受容体の分類",lv:2},{n:"β遮断薬の作用機序",lv:1},{n:"コリン作動薬・抗コリン薬",lv:1}]},{n:"抗菌薬",tps:[{n:"β-ラクタム系の作用点",lv:3},{n:"マクロライド系の特徴",lv:2},{n:"アミノグリコシド系",lv:1}]}]},
   {sid:paId,tms:[{n:"炎症の基礎",tps:[{n:"急性炎症の5徴候",lv:3},{n:"炎症メディエーター",lv:2},{n:"肉芽腫性炎症",lv:1}]},{n:"腫瘍病理",tps:[{n:"良性腫瘍 vs 悪性腫瘍の鑑別",lv:2},{n:"癌遺伝子・癌抑制遺伝子",lv:1}]}]},
   {sid:mId, tms:[{n:"グラム陽性球菌",tps:[{n:"黄色ブドウ球菌の病原因子",lv:2},{n:"溶連菌感染症",lv:2},{n:"肺炎球菌の莢膜",lv:1}]}]},
   {sid:iId, tms:[{n:"獲得免疫",tps:[{n:"T細胞の分化とサブセット",lv:2},{n:"B細胞・抗体産生",lv:3},{n:"MHC クラスI/II",lv:1}]}]},
  ].forEach(({sid,tms})=>tms.forEach(({n,tps})=>{const tid=uid();themes.push({id:tid,subjectId:sid,name:n});tps.forEach(({n:tn,lv})=>topics.push({id:uid(),themeId:tid,subjectId:sid,name:tn,level:lv}));}));
  const d1=new Date(TODAY);d1.setDate(TODAY.getDate()+18);
  const d2=new Date(TODAY);d2.setDate(TODAY.getDate()+40);
  const exams=[{id:uid(),name:"薬理学 中間試験",date:dsOf(d1),subjectId:pId,note:"持ち込み不可",type:"exam"},{id:uid(),name:"病理学 期末試験",date:dsOf(d2),subjectId:paId,note:"",type:"exam"}];
  const schedules=[];
  [pId,paId,mId,iId,pId].forEach((sid,i)=>{const d=new Date(TODAY);d.setDate(TODAY.getDate()+i);schedules.push({id:uid(),subjectId:sid,date:dsOf(d),dur:[60,90,90,60,120][i],note:""});});
  const memos={[pId]:"", [paId]:"", [mId]:"", [iId]:""};
  return {subjects,themes,topics,schedules,exams,memos,planTasks:null,studyLogs:[]};
}
const BLANK_STATE = () => ({subjects:[], themes:[], topics:[], schedules:[], exams:[], memos:{}, planTasks:null, studyLogs:[]});

function ensureFields(d){
  const b = BLANK_STATE();
  const out = {...b, ...d};
  if(!Array.isArray(out.studyLogs)) out.studyLogs = [];
  if(!Array.isArray(out.exams))     out.exams = [];
  if(!Array.isArray(out.schedules)) out.schedules = [];
  if(!Array.isArray(out.themes))    out.themes = [];
  if(!Array.isArray(out.topics))    out.topics = [];
  if(typeof out.memos !== "object" || Array.isArray(out.memos)) out.memos = {};
  out.exams = out.exams.map(e=>({...e, type: e.type||"exam"}));
  return out;
}

function loadState(){
  try {
    const raw = localStorage.getItem("medstudy_v6") || localStorage.getItem("medstudy_v5");
    if(raw){ const d=JSON.parse(raw); if(d) return ensureFields(d); }
  } catch(e){}
  return BLANK_STATE();
}

// ─── shared UI ───────────────────────────────────────────────────
function Btn({children,variant="ghost",size="md",disabled=false,style:sx={},...p}){
  const base={display:"inline-flex",alignItems:"center",gap:5,border:"none",borderRadius:8,fontFamily:"'Noto Sans JP',sans-serif",fontWeight:700,cursor:disabled?"not-allowed":"pointer",whiteSpace:"nowrap",transition:"filter .12s",opacity:disabled?0.5:1};
  const sz={sm:{padding:"6px 13px",fontSize:11},md:{padding:"8px 16px",fontSize:12},xs:{padding:"4px 10px",fontSize:10}};
  const vr={accent:{background:C.accent,color:"#000"},blue:{background:C.blue,color:"#000"},green:{background:C.ok,color:"#000"},ghost:{background:"rgba(255,255,255,0.07)",color:C.text,border:`1px solid ${C.border}`},danger:{background:"rgba(248,113,113,0.12)",color:C.danger,border:`1px solid rgba(248,113,113,0.25)`}};
  return <button disabled={disabled} style={{...base,...sz[size],...vr[variant],...sx}} {...p}>{children}</button>;
}
function PBar({pct,color,height=8,style:sx={}}){return <div style={{height,background:"rgba(255,255,255,0.07)",borderRadius:height/2,overflow:"hidden",...sx}}><div style={{height:"100%",borderRadius:height/2,background:color,width:`${pct}%`,transition:"width .5s ease"}}/></div>;}
function UBadge({level,active,onClick}){const u=UL[level];return <span onClick={onClick} style={{display:"inline-flex",alignItems:"center",padding:"4px 11px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",userSelect:"none",border:`1px solid ${u.bd}`,background:u.bg,color:u.color,opacity:active?1:0.28,transition:"opacity .15s"}}>{u.label}</span>;}
function SecLabel({children}){return <div style={{display:"flex",alignItems:"center",gap:8,margin:"0 0 14px",fontSize:11,fontWeight:700,color:C.sub}}>{children}<div style={{flex:1,height:1,background:C.border}}/></div>;}
function Modal({open,onClose,title,children,width=460}){if(!open)return null;return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(3px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:C.surf,border:`1px solid ${C.border2}`,borderRadius:14,padding:28,width,maxWidth:"96vw",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}><div style={{fontSize:16,fontWeight:700,marginBottom:22}}>{title}</div>{children}</div></div>;}
function FGrp({label,children}){return <div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:6}}>{label}</div>{children}</div>;}
function FInput({style:sx={},...p}){return <input style={{width:"100%",padding:"10px 13px",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"'Noto Sans JP',sans-serif",fontSize:13,outline:"none",...sx}} {...p}/>;}
function FSelect({children,style:sx={},...p}){return <select style={{width:"100%",padding:"10px 13px",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"'Noto Sans JP',sans-serif",fontSize:13,outline:"none",appearance:"none",...sx}} {...p}>{children}</select>;}
function useToast(){const [msg,setMsg]=useState("");const [vis,setVis]=useState(false);const t=useRef(null);const toast=useCallback(m=>{setMsg(m);setVis(true);clearTimeout(t.current);t.current=setTimeout(()=>setVis(false),2400);},[]);const Toast=()=><div style={{position:"fixed",bottom:22,right:22,background:C.surf3,border:`1px solid ${C.border2}`,borderRadius:10,padding:"11px 18px",fontSize:13,fontWeight:500,zIndex:999,opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(6px)",transition:"all .22s",pointerEvents:"none"}}>{msg}</div>;return {toast,Toast};}

// ─── WeekGrid ────────────────────────────────────────────────────
function WeekGrid({off,schedules,getSubj}){
  const base=new Date(TODAY);base.setDate(TODAY.getDate()-TODAY.getDay()+off*7);
  return <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:10}}>{Array.from({length:7},(_,i)=>{
    const d=new Date(base);d.setDate(base.getDate()+i);
    const dStr=dsOf(d),isT=dStr===dsOf(TODAY);
    return <div key={i} style={{background:isT?"rgba(245,158,11,0.07)":"rgba(255,255,255,0.02)",border:`1px solid ${isT?C.accent:C.border}`,borderRadius:8,padding:"12px 10px",minHeight:88}}>
      <div style={{fontSize:11,fontWeight:700,color:isT?C.accent:C.sub,marginBottom:4}}>{DAYS[d.getDay()]}</div>
      <div style={{fontSize:20,fontWeight:700,fontFamily:"'DM Mono',monospace",marginBottom:8,lineHeight:1}}>{d.getDate()}</div>
      {schedules.filter(s=>s.date===dStr).map(sc=>{const s=getSubj(sc.subjectId);return <span key={sc.id} style={{display:"block",fontSize:10,fontWeight:600,padding:"3px 7px",borderRadius:4,marginBottom:3,background:`${s?.color||C.accent}22`,color:s?.color||C.accent}}>{s?.icon||""} {sc.dur}分</span>;})}
    </div>;
  })}</div>;
}

// ─── Views (defined OUTSIDE App) ─────────────────────────────────

function VDashboard({S,getSubj,subjProg,nextExam,weekOff,openEM}){
  const all=S.topics,done=all.filter(t=>t.level===3).length,weak=all.filter(t=>t.level<3).length,total=all.length,pct=total?Math.round(done/total*100):0;
  const ne=nextExam();
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:16}}>
      {[{lbl:"全体理解度",val:total?pct+"%":"—",note:"全トピック平均",color:pct>=70?C.ok:pct>=40?C.warn:C.danger},{lbl:"理解済",val:done,note:`全${total}トピック中`,color:C.ok},{lbl:"要復習",val:weak,note:"未習・不確か",color:C.warn},{lbl:"直近の試験",val:ne?daysUntil(ne.date)+"日":"—",note:ne?ne.name:"試験を登録",color:ne&&daysUntil(ne.date)<=14?C.danger:C.text}]
        .map(s=><div key={s.lbl} style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 20px"}}><div style={{fontSize:12,color:C.sub,marginBottom:10}}>{s.lbl}</div><div style={{fontSize:30,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:-1,lineHeight:1,color:s.color}}>{s.val}</div><div style={{fontSize:11,color:C.sub,marginTop:6}}>{s.note}</div></div>)}
    </div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px",marginBottom:16}}>
      <SecLabel>科目別 理解度進捗</SecLabel>
      {S.subjects.length?S.subjects.map(s=>{const p=subjProg(s.id);const pt=p?.pct||0;return <div key={s.id} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:13,fontWeight:600}}>{s.icon} {s.name}</span><span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:C.sub}}>{p?`${p.done}/${p.total} · ${pt}%`:"トピックなし"}</span></div><PBar pct={pt} color={s.color}/></div>}):<div style={{textAlign:"center",padding:"20px 0",color:C.sub,fontSize:13}}>科目を追加してください<br/><span style={{fontSize:11,marginTop:6,display:"block"}}>「科目管理」→「📋 一括インポート」から過去のデータを復元できます</span></div>}
    </div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px",marginBottom:16}}>
      <SecLabel>試験カウントダウン</SecLabel>
      {S.exams.length?<div style={{display:"flex",flexDirection:"column",gap:12}}>{[...S.exams].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4).map(e=>{const d=daysUntil(e.date),isGoal=e.type==="goal";const ac=d<0?C.ok:isGoal?(d<=30?C.warn:d<=90?C.blue:C.sub):(d<=14?C.danger:d<=30?C.warn:C.ok);const lbl=d<0?"終了":d===0?"本日！":String(d);const unit=d<0||d===0?"":"日後";return <div key={e.id} style={{background:C.surf2,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 20px",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,left:0,width:4,height:"100%",background:ac}}/><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:isGoal?"rgba(96,165,250,0.15)":"rgba(245,158,11,0.15)",color:isGoal?C.blue:C.accent}}>{isGoal?"📌 目標":"🎯 試験"}</span></div><div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{e.name}</div><div style={{fontSize:11,color:C.sub,marginBottom:10}}>{e.date}</div><div style={{fontSize:40,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:-2,lineHeight:1,color:ac}}>{lbl}<span style={{fontSize:14,color:C.sub,fontWeight:400,marginLeft:4}}>{unit}</span></div></div>;})}</div>:<div style={{textAlign:"center",padding:"20px 0",color:C.sub,fontSize:13}}>試験を登録してください</div>}
    </div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px",marginBottom:16}}>
      <SecLabel>要復習トピック <span style={{color:C.sub,fontSize:11,fontWeight:400}}>不確か・未習</span></SecLabel>
      {S.topics.filter(t=>t.level<3).slice(0,8).map(t=>{const th=S.themes.find(x=>x.id===t.themeId),s=getSubj(t.subjectId),u=UL[t.level];return <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"12px 14px",borderRadius:10,marginBottom:6}}><div style={{width:8,height:8,borderRadius:"50%",background:s?.color||C.blue,flexShrink:0,marginTop:5}}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{t.name}</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>{s?.icon} {s?.name} › {th?.name}</div></div><span style={{display:"inline-flex",padding:"4px 11px",borderRadius:20,fontSize:11,fontWeight:700,background:u.bg,color:u.color,border:`1px solid ${u.bd}`,flexShrink:0}}>{u.label}</span></div>;})}
      {!S.topics.filter(t=>t.level<3).length&&<div style={{textAlign:"center",padding:"20px 0",color:C.sub,fontSize:13}}>🎉 要復習トピックはありません！</div>}
    </div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px"}}>
      <SecLabel>今週のスケジュール</SecLabel>
      <WeekGrid off={0} schedules={S.schedules} getSubj={getSubj}/>
    </div>
  </div>;
}

function VPlan({S,getSubj,nextExam,planHours,setPlanHours,pasteText,setPasteText,planErr,setPlanErr,copied,setCopied,applyPastedPlan,toggleTask,clearPlan,fmtMins}){
  const tasks=Array.isArray(S.planTasks)?S.planTasks:[];
  const done=tasks.filter(t=>t.completed).length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;
  const buildPrompt=()=>{
    if(!S.subjects.length)return "";
    const totalMins=Math.round(planHours*60);
    const ne=nextExam();
    const urgentNote=ne&&daysUntil(ne.date)<=7?"\n警告: "+ne.name+"まで残り"+daysUntil(ne.date)+"日。最優先にしてください。":"";
    const lines=S.subjects.map(s=>{const ts=S.topics.filter(t=>t.subjectId===s.id);const weak=ts.filter(t=>t.level===1).map(t=>t.name);const unsure=ts.filter(t=>t.level===2).map(t=>t.name);const rem=ts.filter(t=>t.level!==3).map(t=>t.name);const ex=S.exams.filter(e=>e.subjectId===s.id).sort((a,b)=>a.date.localeCompare(b.date))[0];const p=S.topics.filter(t=>t.subjectId===s.id);const done=p.filter(t=>t.level===3).length;const pct=p.length?Math.round(done/p.length*100):0;return s.name+": 試験"+(ex?"まで"+daysUntil(ex.date)+"日":"日未設定")+", 理解度"+pct+"%, 未習["+(weak.join(",")||"なし")+"], 不確か["+(unsure.join(",")||"なし")+"], 未完了["+(rem.join(",")||"なし")+"]";}).join("\n");
    const subjNames=S.subjects.map(s=>s.name).join("・");
    return "あなたは医学生の学習コーチです。今日の学習計画をJSON配列のみで返してください（前置き・説明・コードブロック記号は一切不要）。\n\n学習可能時間: "+planHours+"時間（"+totalMins+"分）"+urgentNote+"\n\n科目状況:\n"+lines+"\n\n返答形式（この配列のみ）:\n[{\"subject\":\""+subjNames+"のどれか\",\"title\":\"タスク名\",\"detail\":\"学習方法1〜2文\",\"minutes\":数値}]\n\n条件: minutesの合計="+totalMins+", タスク3〜5件, 未習・試験近い科目を優先";
  };
  const prompt=buildPrompt();
  const copyPrompt=()=>{if(!prompt)return;navigator.clipboard.writeText(prompt).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}).catch(()=>{});};
  return <div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px",marginBottom:14}}>
      <SecLabel>STEP 1 — 提案文をコピーしてチャットに送る</SecLabel>
      <div style={{fontSize:12,color:C.sub,marginBottom:16,lineHeight:1.75}}>下のボタンで提案文をコピーし、<strong style={{color:C.text}}>このClaudeチャット</strong>に貼り付けて送信してください。</div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <span style={{fontSize:13,color:C.sub}}>今日の学習時間：</span>
        <input type="number" value={planHours} min={0.5} max={12} step={0.5} onChange={e=>setPlanHours(parseFloat(e.target.value)||3)} style={{width:72,padding:"8px 12px",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,outline:"none",fontFamily:"'Noto Sans JP',sans-serif"}}/>
        <span style={{fontSize:13,color:C.sub}}>時間</span>
        <Btn variant="accent" onClick={copyPrompt}>{copied?"✅ コピーしました！":"📋 提案文をコピー"}</Btn>
      </div>
      <textarea readOnly value={prompt} style={{width:"100%",height:90,padding:"10px 12px",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,color:C.dim,fontSize:11,lineHeight:1.6,resize:"none",fontFamily:"monospace",outline:"none"}}/>
    </div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px",marginBottom:14}}>
      <SecLabel>STEP 2 — Claudeの返答を貼り付けて反映</SecLabel>
      <div style={{fontSize:12,color:C.sub,marginBottom:12,lineHeight:1.75}}>Claudeが返してきたJSON（[ から始まる部分）をそのまま貼り付けてください。</div>
      <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder="ここにClaudeの返答を貼り付けてください..." style={{width:"100%",height:100,padding:"10px 12px",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12,lineHeight:1.6,resize:"vertical",fontFamily:"monospace",outline:"none"}}/>
      <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
        <Btn variant="blue" onClick={()=>applyPastedPlan(pasteText)} disabled={!pasteText.trim()}>✅ 計画を反映</Btn>
        {tasks.length>0&&<Btn variant="ghost" size="sm" onClick={clearPlan}>クリア</Btn>}
      </div>
      {planErr&&<div style={{fontSize:11,color:C.danger,marginTop:12,lineHeight:1.6,background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,padding:"10px 12px",whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{planErr}</div>}
    </div>
    {tasks.length>0&&<div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:700,flex:1}}>今日の計画</div>
        <span style={{fontSize:12,color:C.sub}}>{done}/{tasks.length} 完了</span>
        <div style={{width:80,height:5,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:C.ok,width:pct+"%",transition:"width .3s"}}/></div>
        <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:C.sub}}>{pct}%</span>
      </div>
      {tasks.map(t=>{const s=getSubj(t.subject)||S.subjects[0];return <div key={t.id} onClick={()=>toggleTask(t.id)} style={{background:C.surf2,border:`1px solid ${t.completed?"rgba(74,222,128,0.3)":C.border}`,borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer",opacity:t.completed?0.6:1,marginBottom:8,transition:"opacity .2s"}}><div style={{width:20,height:20,borderRadius:5,flexShrink:0,marginTop:2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,border:t.completed?"1.5px solid "+C.ok:"1.5px solid "+C.border2,background:t.completed?C.ok:"transparent",color:"#000",transition:"all .15s"}}>{t.completed?"✓":""}</div><div style={{width:30,height:30,borderRadius:7,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,background:`${s?.color||C.blue}22`}}>{s?.icon||"📖"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,marginBottom:3,textDecoration:t.completed?"line-through":"none"}}>{t.title}</div><div style={{fontSize:11,color:C.sub,lineHeight:1.55}}>{t.detail}</div><div style={{fontSize:10,color:C.accent,fontFamily:"'DM Mono',monospace",marginTop:4}}>{s?.icon} {s?.name} · {fmtMins(t.minutes)}</div></div></div>;})}
    </div>}
    {!tasks.length&&<div style={{textAlign:"center",padding:"32px 0",color:C.sub}}><div style={{fontSize:28,marginBottom:10}}>🤖</div><div style={{fontSize:13}}>「計画を反映」を押すと今日の学習プランが表示されます</div></div>}
  </div>;
}

function VChecklist({S,getSubj,subjProg,clSubj,setClSubj,openTM,openPM,delTheme,delTopic,setLv,setView,openThemes,setOpenThemes}){
  const aClSubj=clSubj||S.subjects[0]?.id||null;
  const subj=getSubj(aClSubj);
  const themes=S.themes.filter(t=>t.subjectId===aClSubj);
  return <div>
    <div style={{display:"flex",gap:5,marginBottom:22,flexWrap:"wrap"}}>
      {S.subjects.map(s=><div key={s.id} onClick={()=>setClSubj(s.id)} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:s.id===aClSubj?"rgba(245,158,11,0.14)":"transparent",color:s.id===aClSubj?C.accent:C.sub,transition:"all .12s"}}>{s.icon} {s.name}</div>)}
    </div>
    {!S.subjects.length?<div style={{textAlign:"center",padding:"40px 0",color:C.sub}}><div style={{fontSize:28,marginBottom:10}}>📚</div><div style={{fontSize:13,marginBottom:14}}>まず科目を追加してください</div><Btn variant="accent" onClick={()=>setView("subjects")}>科目管理へ</Btn></div>
    :!themes.length?<div style={{textAlign:"center",padding:"40px 0",color:C.sub}}><div style={{fontSize:28,marginBottom:10}}>☑️</div><div style={{fontSize:13,marginBottom:14}}>テーマがありません</div><Btn variant="accent" onClick={openTM}>＋ テーマを追加</Btn></div>
    :<>{themes.map(th=>{const tps=S.topics.filter(t=>t.themeId===th.id);const done=tps.filter(t=>t.level===3).length;const pct=tps.length?Math.round(done/tps.length*100):0;const isOpen=openThemes[th.id]===true;return <div key={th.id} style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:10}}>
      <div onClick={()=>setOpenThemes(p=>({...p,[th.id]:!isOpen}))} style={{display:"flex",alignItems:"center",gap:10,padding:"13px 16px",background:C.surf2,cursor:"pointer"}}>
        <span style={{fontSize:9,color:C.sub,transition:"transform .2s",transform:isOpen?"rotate(90deg)":"none",flexShrink:0}}>▶</span>
        <span style={{fontSize:13,fontWeight:600,flex:1}}>{th.name}</span>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}><div style={{width:60,height:5,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:subj?.color||C.blue,width:pct+"%"}}/></div><span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:C.sub,minWidth:32,textAlign:"right"}}>{done}/{tps.length}</span></div>
        <button onClick={e=>{e.stopPropagation();delTheme(th.id);}} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:14,padding:"3px 7px",borderRadius:5}}>✕</button>
      </div>
      {isOpen&&<div style={{padding:"10px 14px 12px",borderTop:`1px solid ${C.border}`}}>
        {tps.map(tp=><div key={tp.id} style={{padding:"12px 14px",borderRadius:10,marginBottom:6,background:C.surf3}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:10}}><span style={{fontSize:13,fontWeight:600,lineHeight:1.5,flex:1}}>{tp.name}</span><button onClick={()=>delTopic(tp.id)} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:14,padding:"2px 6px",borderRadius:5,flexShrink:0,marginTop:1}}>✕</button></div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[1,2,3].map(lv=><UBadge key={lv} level={lv} active={tp.level===lv} onClick={()=>setLv(tp.id,lv)}/>)}</div>
        </div>)}
        <div onClick={()=>openPM(th.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",borderRadius:8,border:`1px dashed ${C.border2}`,color:C.sub,fontSize:12,cursor:"pointer",marginTop:4}}>＋ トピックを追加</div>
      </div>}
    </div>;})}
    <Btn variant="ghost" onClick={openTM} style={{marginTop:12}}>＋ テーマを追加</Btn></>}
  </div>;
}

function VSchedule({S,getSubj,weekOff,setWeekOff,openSchM,delSched}){
  const base=new Date(TODAY);base.setDate(TODAY.getDate()-TODAY.getDay()+weekOff*7);
  const last=new Date(base);last.setDate(base.getDate()+6);
  return <div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:14,fontWeight:700}}>{base.getMonth()+1}/{base.getDate()} 〜 {last.getMonth()+1}/{last.getDate()}</div>
        <div style={{display:"flex",gap:7}}><Btn variant="ghost" size="xs" onClick={()=>setWeekOff(p=>p-1)}>◀ 前週</Btn><Btn variant="ghost" size="xs" onClick={()=>setWeekOff(0)}>今週</Btn><Btn variant="ghost" size="xs" onClick={()=>setWeekOff(p=>p+1)}>次週 ▶</Btn></div>
      </div>
      <WeekGrid off={weekOff} schedules={S.schedules} getSubj={getSubj}/>
    </div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div style={{fontSize:14,fontWeight:700}}>予定リスト</div><Btn variant="ghost" size="sm" onClick={openSchM}>＋ 予定を追加</Btn></div>
      {[...S.schedules].sort((a,b)=>a.date.localeCompare(b.date)).map(sc=>{const s=getSubj(sc.subjectId);return <div key={sc.id} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"12px 14px",borderRadius:10,marginBottom:6}}><div style={{width:8,height:8,borderRadius:"50%",background:s?.color||C.blue,flexShrink:0,marginTop:5}}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{s?.icon} {s?.name||"不明"} — {sc.dur}分</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>{sc.date}{sc.note?" · "+sc.note:""}</div></div><button onClick={()=>delSched(sc.id)} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:14,padding:"3px 7px",borderRadius:5}}>✕</button></div>;})}
      {!S.schedules.length&&<div style={{textAlign:"center",padding:"20px 0",color:C.sub,fontSize:13}}>予定がありません</div>}
    </div>
  </div>;
}

function VTimer({S,getSubj,timerRunning,timerSecs,timerSubj,setTimerSubj,timerNote,setTimerNote,timerTaskId,setTimerTaskId,startTimer,pauseTimer,resetTimer,saveSession,reportTab,setReportTab,studyLogs,deleteLog,addManualLog,fmtMins,fmtSecs}){
  const [showManual,setShowManual]=useState(false);
  const [mSubj,setMSubj]=useState(timerSubj||S.subjects[0]?.id||"");
  const [mMins,setMMins]=useState(30);
  const [mNote,setMNote]=useState("");
  const [mDate,setMDate]=useState(dsOf());
  const todayStr=dsOf();
  const todayLogs=studyLogs.filter(l=>l.date===todayStr).sort((a,b)=>b.ts-a.ts);
  const todayMins=todayLogs.reduce((a,l)=>a+l.mins,0);
  const weekStart=new Date(TODAY);weekStart.setDate(TODAY.getDate()-((TODAY.getDay()+6)%7));weekStart.setHours(0,0,0,0);
  const weekDates=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);return dsOf(d);});
  const weekLogs=studyLogs.filter(l=>weekDates.includes(l.date));
  const weekMins=weekLogs.reduce((a,l)=>a+l.mins,0);
  const scopeLogs=reportTab==="daily"?todayLogs:weekLogs;
  const totalMins=reportTab==="daily"?todayMins:weekMins;
  const bySubj={};scopeLogs.forEach(l=>{bySubj[l.subjectId]=(bySubj[l.subjectId]||0)+l.mins;});
  const weekBarData=["月","火","水","木","金","土","日"].map((lbl,i)=>({d:weekDates[i],lbl,mins:weekLogs.filter(l=>l.date===weekDates[i]).reduce((a,l)=>a+l.mins,0)}));
  const maxBar=Math.max(...weekBarData.map(b=>b.mins),60);
  return <div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"22px 24px",marginBottom:14}}>
      <SecLabel>⏱ ストップウォッチ</SecLabel>
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{fontSize:56,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:-2,lineHeight:1,color:timerRunning?C.ok:C.text}}>{fmtSecs(timerSecs)}</div>
        <div style={{fontSize:12,color:C.sub,marginTop:6}}>{timerRunning?"計測中...":"停止中"}</div>
      </div>
      {/* ── Task selector (today's plan tasks) ── */}
      {Array.isArray(S.planTasks)&&S.planTasks.length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:C.sub,marginBottom:6}}>今日の計画から選択（任意）</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {/* "なし" option */}
            <div onClick={()=>{setTimerTaskId(null);setTimerNote("");}}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:9,border:"1px solid "+(timerTaskId===null?C.accent:C.border),background:timerTaskId===null?"rgba(245,158,11,0.08)":"rgba(255,255,255,0.02)",cursor:"pointer",transition:"all .12s"}}>
              <div style={{width:16,height:16,borderRadius:"50%",border:"2px solid "+(timerTaskId===null?C.accent:C.sub),background:timerTaskId===null?C.accent:"transparent",flexShrink:0}}/>
              <span style={{fontSize:12,color:timerTaskId===null?C.accent:C.sub}}>タスクを指定しない</span>
            </div>
            {S.planTasks.filter(t=>!t.completed).map(t=>{
              const s=getSubj(t.subject)||S.subjects[0];
              const isSelected=timerTaskId===t.id;
              return (
                <div key={t.id} onClick={()=>{
                  setTimerTaskId(isSelected?null:t.id);
                  if(!isSelected){
                    setTimerSubj(t.subject||S.subjects[0]?.id);
                    setTimerNote(t.title);
                  } else {
                    setTimerNote("");
                  }
                }}
                  style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:9,border:"1px solid "+(isSelected?C.accent:C.border),background:isSelected?"rgba(245,158,11,0.08)":"rgba(255,255,255,0.02)",cursor:"pointer",transition:"all .12s"}}>
                  <div style={{width:16,height:16,borderRadius:"50%",border:"2px solid "+(isSelected?C.accent:C.sub),background:isSelected?C.accent:"transparent",flexShrink:0,marginTop:2}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:isSelected?C.text:C.dim,marginBottom:2}}>{t.title}</div>
                    <div style={{fontSize:10,color:s?.color||C.accent}}>{s?.icon} {s?.name} · {fmtMins(t.minutes)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{marginBottom:14}}><div style={{fontSize:12,color:C.sub,marginBottom:6}}>科目</div><FSelect value={timerSubj||S.subjects[0]?.id||""} onChange={e=>setTimerSubj(e.target.value)}>{S.subjects.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</FSelect></div>
      <div style={{marginBottom:16}}><div style={{fontSize:12,color:C.sub,marginBottom:6}}>メモ（任意）</div><FInput value={timerNote} onChange={e=>setTimerNote(e.target.value)} placeholder="例: β遮断薬 復習、過去問演習"/></div>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        {!timerRunning?<Btn variant="green" onClick={startTimer} style={{minWidth:100,justifyContent:"center"}}>▶ 開始</Btn>:<Btn variant="ghost" onClick={pauseTimer} style={{minWidth:100,justifyContent:"center"}}>⏸ 一時停止</Btn>}
        <Btn variant="ghost" onClick={resetTimer} style={{minWidth:80,justifyContent:"center"}}>↺ リセット</Btn>
        <Btn variant="accent" onClick={saveSession} disabled={timerSecs<60} style={{minWidth:120,justifyContent:"center"}}>💾 記録する</Btn>
      </div>
    </div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"22px 24px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <SecLabel style={{margin:0,flex:1}}>📊 学習レポート</SecLabel>
        <div style={{display:"flex",gap:5}}>{[["daily","今日"],["weekly","今週"]].map(([k,lbl])=><div key={k} onClick={()=>setReportTab(k)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",background:reportTab===k?"rgba(245,158,11,0.14)":"transparent",color:reportTab===k?C.accent:C.sub}}>{lbl}</div>)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        {[{lbl:"学習時間",val:fmtMins(totalMins),color:C.accent},{lbl:"セッション数",val:scopeLogs.length+"回",color:C.blue},{lbl:"科目数",val:Object.keys(bySubj).length+"科目",color:C.ok}].map(s=><div key={s.lbl} style={{background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px",textAlign:"center"}}><div style={{fontSize:11,color:C.sub,marginBottom:6}}>{s.lbl}</div><div style={{fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace",color:s.color}}>{s.val}</div></div>)}
      </div>
      {reportTab==="weekly"&&<div style={{marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10}}>日別学習時間</div>
        <div style={{display:"flex",gap:6,alignItems:"flex-end",height:100}}>{weekBarData.map(b=>{const h=maxBar>0?Math.round((b.mins/maxBar)*88):0;const isT=b.d===todayStr;return <div key={b.d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{fontSize:9,color:C.sub,fontFamily:"'DM Mono',monospace"}}>{b.mins>0?b.mins+"m":""}</div><div style={{width:"100%",height:88,display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",height:h||2,background:isT?C.accent:C.blue,borderRadius:"4px 4px 0 0",opacity:isT?1:0.6,transition:"height .4s ease",minHeight:2}}/></div><div style={{fontSize:10,fontWeight:700,color:isT?C.accent:C.sub}}>{b.lbl}</div></div>;})}
        </div>
      </div>}
      {Object.keys(bySubj).length>0&&<div style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.sub,marginBottom:10}}>科目別内訳</div>{Object.entries(bySubj).sort((a,b)=>b[1]-a[1]).map(([sid,mins])=>{const s=getSubj(sid);const pct=totalMins?Math.round(mins/totalMins*100):0;return <div key={sid} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,fontWeight:600}}>{s?.icon} {s?.name||"不明"}</span><span style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:C.sub}}>{fmtMins(mins)} ({pct}%)</span></div><PBar pct={pct} color={s?.color||C.accent} height={6}/></div>;})}</div>}
      {scopeLogs.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:C.sub,fontSize:13}}>記録がありません</div>}
    </div>
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"22px 24px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <SecLabel style={{margin:0,flex:1}}>📋 {reportTab==="daily"?"今日の":"今週の"}セッション履歴</SecLabel>
        <Btn variant="ghost" size="sm" onClick={()=>setShowManual(v=>!v)}>{showManual?"閉じる":"＋ 手動追加"}</Btn>
      </div>
      {showManual&&<div style={{background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:11,color:C.sub,marginBottom:5}}>科目</div><FSelect value={mSubj} onChange={e=>setMSubj(e.target.value)}>{S.subjects.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</FSelect></div>
          <div><div style={{fontSize:11,color:C.sub,marginBottom:5}}>学習時間（分）</div><FInput type="number" value={mMins} min={1} step={5} onChange={e=>setMMins(parseInt(e.target.value)||30)}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:11,color:C.sub,marginBottom:5}}>日付</div><FInput type="date" value={mDate} onChange={e=>setMDate(e.target.value)}/></div>
          <div><div style={{fontSize:11,color:C.sub,marginBottom:5}}>メモ（任意）</div><FInput value={mNote} onChange={e=>setMNote(e.target.value)} placeholder="内容メモ"/></div>
        </div>
        <Btn variant="accent" size="sm" onClick={()=>{addManualLog(mSubj,mMins,mNote,mDate);setMNote("");setShowManual(false);}}>記録する</Btn>
      </div>}
      {scopeLogs.length===0?<div style={{textAlign:"center",padding:"20px 0",color:C.sub,fontSize:13}}>セッションがありません</div>
      :scopeLogs.slice().sort((a,b)=>b.ts-a.ts).map(l=>{const s=getSubj(l.subjectId);const time=new Date(l.ts).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});return <div key={l.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",borderRadius:10,marginBottom:6,background:C.surf2}}><div style={{width:36,height:36,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,background:(s?.color||C.accent)+"22"}}>{s?.icon||"📖"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:s?.color||C.accent}}>{s?.name||"不明"}</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>{l.date} {time}{l.note?" · "+l.note:""}</div></div><div style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:C.text,flexShrink:0}}>{fmtMins(l.mins)}</div><button onClick={()=>deleteLog(l.id)} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:14,padding:"3px 6px",borderRadius:5,flexShrink:0}}>✕</button></div>;})}
    </div>
  </div>;
}

// ─── Import parser ────────────────────────────────────────────────
// Accepts free-form text like:
//   薬理学
//     自律神経薬
//       β遮断薬の作用機序
//       コリン作動薬
//     抗菌薬
//       β-ラクタム系
//   病理学
//     炎症の基礎
//       急性炎症の5徴候
function parseImportText(text, palette, icons) {
  // Normalize: convert tabs to spaces (1 tab = 2 spaces)
  const normalized = text.replace(/\t/g, "  ");
  const rawLines = normalized.split("\n");

  // Filter blank lines, collect with indent
  const lines = rawLines
    .map(l => ({ raw: l, indent: l.match(/^( *)/)[1].length, text: l.trim() }))
    .filter(l => l.text && !l.text.startsWith("#") && !l.text.startsWith("//"));

  if (!lines.length) return { subjects:[], themes:[], topics:[] };

  // Detect the 3 distinct indent levels automatically
  const indentLevels = [...new Set(lines.map(l => l.indent))].sort((a,b)=>a-b);
  // level 0 = subject, level 1 = theme, level 2+ = topic
  const lvl0 = indentLevels[0] ?? 0;          // subject indent (usually 0)
  const lvl1 = indentLevels[1] ?? lvl0 + 2;   // theme indent
  const lvl2 = indentLevels[2] ?? lvl1 + 2;   // topic indent

  const subjects = [], themes = [], topics = [];
  let curSubj = null, curTheme = null;
  const usedColors = [];

  lines.forEach(({ indent, text }) => {
    if (indent <= lvl0) {
      // Subject
      const color = palette[usedColors.length % palette.length];
      usedColors.push(color);
      const icon = icons[subjects.length % icons.length];
      curSubj = { id: uid(), name: text, icon, color, note: "" };
      subjects.push(curSubj);
      curTheme = null;
    } else if (indent <= lvl1) {
      // Theme
      if (!curSubj) return;
      curTheme = { id: uid(), subjectId: curSubj.id, name: text };
      themes.push(curTheme);
    } else {
      // Topic
      if (!curSubj || !curTheme) return;
      topics.push({ id: uid(), themeId: curTheme.id, subjectId: curSubj.id, name: text, level: 1 });
    }
  });
  return { subjects, themes, topics };
}


function VSubjects({S,getSubj,subjProg,openSM,delSubj,importSubjects,restoreFromStorage}){
  const [importText,setImportText]=useState("");
  const [importErr,setImportErr]=useState("");
  const [showImport,setShowImport]=useState(false);
  const [importResult,setImportResult]=useState(null);
  const PAL=["#6ee7b7","#a78bfa","#60a5fa","#fb923c","#f472b6","#facc15","#34d399","#f87171","#38bdf8","#c084fc"];
  const ICO=["💊","🔬","🦠","🛡️","🧬","🩺","🧪","🫀","🫁","🧠","💉","🩻","📖","📋","⚗️","🔭","🎯","🌡️"];

  const handlePreview=()=>{
    setImportErr("");
    if(!importText.trim()){setImportErr("テキストを入力してください");return;}
    try{
      const r=parseImportText(importText,PAL,ICO);
      if(!r.subjects.length){setImportErr("科目が見つかりませんでした。書式を確認してください。");return;}
      setImportResult(r);
    }catch(e){setImportErr("解析エラー: "+e.message);}
  };
  const handleImport=()=>{
    if(!importResult)return;
    importSubjects(importResult);
    setShowImport(false);setImportText("");setImportResult(null);
  };

  const example="薬理学\n  自律神経薬\n    β遮断薬の作用機序\n    コリン作動薬\n  抗菌薬\n    β-ラクタム系\n病理学\n  炎症の基礎\n    急性炎症の5徴候";

  // Check what's in storage right now
  const storageInfo = (() => {
    try {
      const raw = localStorage.getItem("medstudy_v6");
      if (!raw) return null;
      const d = JSON.parse(raw);
      return { subjects: d.subjects?.length||0, themes: d.themes?.length||0, topics: d.topics?.length||0 };
    } catch(e) { return null; }
  })();

  return (
    <div>
      {/* Storage status */}
      {storageInfo && storageInfo.subjects > 0 && S.subjects.length === 0 && (
        <div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:10,padding:"14px 18px",marginBottom:16,fontSize:13}}>
          <div style={{fontWeight:700,color:C.accent,marginBottom:6}}>⚠️ ストレージにデータが見つかりました</div>
          <div style={{fontSize:12,color:C.dim,marginBottom:10}}>
            {"保存データ: "+storageInfo.subjects+"科目 · "+storageInfo.themes+"テーマ · "+storageInfo.topics+"トピック"}
          </div>
          <Btn variant="accent" size="sm" onClick={()=>{
            try{
              const raw=localStorage.getItem("medstudy_v6");
              const d=JSON.parse(raw);
              restoreFromStorage(d);
            }catch(e){}
          }}>🔄 データを復元する</Btn>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:700}}>科目管理</div>
          <div style={{fontSize:12,color:C.sub,marginTop:3}}>科目の追加・編集・削除</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" onClick={()=>{setShowImport(v=>!v);setImportResult(null);setImportErr("");}}>📋 一括インポート</Btn>
          <Btn variant="accent" onClick={()=>openSM(null)}>＋ 科目を追加</Btn>
        </div>
      </div>

      {showImport && (
        <div style={{background:C.surf,border:"1px solid "+C.accent,borderRadius:10,padding:"20px 22px",marginBottom:18}}>
          <SecLabel>📋 テキストから一括インポート</SecLabel>
          <div style={{fontSize:12,color:C.sub,marginBottom:10,lineHeight:1.8}}>
            字下げなし → 科目　スペース2つ → テーマ　スペース4つ → トピック
          </div>
          <div style={{background:C.surf2,border:"1px solid "+C.border,borderRadius:8,padding:"10px 12px",marginBottom:10,fontSize:11,color:C.dim,fontFamily:"monospace",lineHeight:1.8,whiteSpace:"pre"}}>
            {example}
          </div>
          <textarea
            value={importText}
            onChange={e=>{setImportText(e.target.value);setImportResult(null);}}
            placeholder={example}
            style={{width:"100%",height:180,padding:"10px 12px",background:C.surf2,border:"1px solid "+C.border,borderRadius:8,color:C.text,fontSize:12,lineHeight:1.7,resize:"vertical",fontFamily:"monospace",outline:"none",marginBottom:10}}
          />
          {importErr && (
            <div style={{fontSize:11,color:C.danger,marginBottom:10,padding:"8px 12px",background:"rgba(248,113,113,0.08)",borderRadius:8,border:"1px solid rgba(248,113,113,0.2)"}}>
              {importErr}
            </div>
          )}
          {importResult && (
            <div style={{fontSize:12,color:C.ok,marginBottom:12,padding:"10px 14px",background:"rgba(74,222,128,0.08)",borderRadius:8,border:"1px solid rgba(74,222,128,0.2)"}}>
              <div>{"✅ "+importResult.subjects.length+"科目 · "+importResult.themes.length+"テーマ · "+importResult.topics.length+"トピックを検出しました"}</div>
              <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}>
                {importResult.subjects.map(s=>(
                  <span key={s.id} style={{fontSize:11,padding:"2px 9px",borderRadius:10,background:s.color+"22",color:s.color}}>{s.icon+" "+s.name}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <Btn variant="ghost" onClick={handlePreview}>🔍 プレビュー</Btn>
            {importResult && <Btn variant="green" onClick={handleImport}>✅ インポートする</Btn>}
            <Btn variant="ghost" size="sm" onClick={()=>{setShowImport(false);setImportText("");setImportResult(null);setImportErr("");}}>キャンセル</Btn>
          </div>
        </div>
      )}

      {!S.subjects.length ? (
        <div style={{background:C.surf,border:"1px solid "+C.border,borderRadius:10,padding:"40px 0",textAlign:"center",color:C.sub}}>
          <div style={{fontSize:28,marginBottom:10}}>📚</div>
          <div style={{fontSize:13,marginBottom:16}}>科目がありません</div>
          <Btn variant="accent" onClick={()=>openSM(null)}>＋ 科目を追加</Btn>
        </div>
      ) : S.subjects.map(s=>{
        const p=subjProg(s.id);
        return (
          <div key={s.id} style={{background:C.surf2,border:"1px solid "+C.border,borderRadius:10,padding:"20px 22px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,background:s.color+"22"}}>{s.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:16,fontWeight:700,color:s.color}}>{s.name}</div>
                <div style={{fontSize:12,color:C.sub,marginTop:2}}>
                  {S.themes.filter(t=>t.subjectId===s.id).length}テーマ · {p?p.total+"トピック · 理解済"+p.pct+"%":"トピックなし"}{s.note?" · "+s.note:""}
                </div>
              </div>
            </div>
            {p && <PBar pct={p.pct} color={s.color} height={6} style={{marginBottom:14}}/>}
            <div style={{display:"flex",gap:10,borderTop:"1px solid "+C.border,paddingTop:14}}>
              <Btn variant="ghost" size="sm" onClick={()=>openSM(s.id)} style={{flex:1,justifyContent:"center"}}>✏️ 編集</Btn>
              <Btn variant="danger" size="sm" onClick={()=>delSubj(s.id)} style={{flex:1,justifyContent:"center"}}>🗑️ 削除</Btn>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function VExams({S,getSubj,subjProg,delExam,openEM}){
  const [tab,setTab]=useState("all");
  const sorted=[...S.exams].sort((a,b)=>a.date.localeCompare(b.date));
  const filtered=tab==="all"?sorted:sorted.filter(e=>(e.type||"exam")===tab);
  const examCnt=sorted.filter(e=>(e.type||"exam")==="exam").length;
  const goalCnt=sorted.filter(e=>e.type==="goal").length;
  return <div>
    <div style={{display:"flex",gap:6,marginBottom:18}}>{[["all","すべて",sorted.length],["exam","🎯 試験",examCnt],["goal","📌 目標",goalCnt]].map(([key,lbl,cnt])=><div key={key} onClick={()=>setTab(key)} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:tab===key?"rgba(245,158,11,0.14)":"transparent",color:tab===key?C.accent:C.sub,transition:"all .12s"}}>{lbl} <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,opacity:.7}}>({cnt})</span></div>)}</div>
    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:16}}>{filtered.map(e=>{const isGoal=e.type==="goal",d=daysUntil(e.date);const ac=d<0?C.ok:isGoal?(d<=30?C.warn:d<=90?C.blue:C.sub):(d<=14?C.danger:d<=30?C.warn:C.ok);const lbl=d<0?"終了":d===0?"本日！":"あと"+d+"日";const s=getSubj(e.subjectId),p=s?subjProg(s.id):null;return <div key={e.id} style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px",borderLeft:"4px solid "+ac}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:isGoal?"rgba(96,165,250,0.15)":"rgba(245,158,11,0.15)",color:isGoal?C.blue:C.accent}}>{isGoal?"📌 学習目標":"🎯 試験"}</span></div><div style={{fontSize:16,fontWeight:700,lineHeight:1.4}}>{e.name}</div></div><button onClick={()=>delExam(e.id)} style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:14,padding:"3px 7px",borderRadius:5,flexShrink:0}}>✕</button></div><div style={{fontSize:12,color:C.sub,marginBottom:8}}>{isGoal?"目標日: ":"試験日: "}{e.date}{e.note?" · "+e.note:""}</div>{s&&<span style={{fontSize:11,fontWeight:700,color:s.color,background:s.color+"22",padding:"2px 9px",borderRadius:10,display:"inline-block",marginBottom:14}}>{s.icon} {s.name}</span>}{!s&&<div style={{marginBottom:14}}/>}<div style={{fontSize:40,fontWeight:700,fontFamily:"'DM Mono',monospace",color:ac,letterSpacing:-2,lineHeight:1,marginBottom:p?14:0}}>{lbl}</div>{p&&<div style={{marginTop:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:7}}><span style={{fontWeight:600,color:s.color}}>{s.icon} 理解度</span><span style={{fontFamily:"'DM Mono',monospace",color:C.sub}}>{p.pct}%</span></div><PBar pct={p.pct} color={s.color}/></div>}</div>;})}
    </div>
    {!filtered.length&&<div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"40px 0",textAlign:"center",color:C.sub}}><div style={{fontSize:28,marginBottom:10}}>{tab==="goal"?"📌":"🎯"}</div><div style={{fontSize:13}}>登録がありません</div></div>}
    <Btn variant="ghost" onClick={openEM}>＋ 追加</Btn>
  </div>;
}

function VMemo({S,getSubj,memoSubj,setMemoSubj,upd}){
  const aMemoSubj=memoSubj||S.subjects[0]?.id||null;
  const s=getSubj(aMemoSubj);
  return <div>
    <div style={{display:"flex",gap:5,marginBottom:22,flexWrap:"wrap"}}>{S.subjects.map(sub=><div key={sub.id} onClick={()=>setMemoSubj(sub.id)} style={{padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",background:sub.id===aMemoSubj?"rgba(245,158,11,0.14)":"transparent",color:sub.id===aMemoSubj?C.accent:C.sub}}>{sub.icon} {sub.name}</div>)}</div>
    {s&&<div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:"20px 22px"}}><div style={{fontSize:14,fontWeight:700,color:s.color,marginBottom:16}}>{s.icon} {s.name} — メモ</div><textarea defaultValue={S.memos[s.id]||""} onChange={e=>upd(n=>{n.memos={...n.memos,[s.id]:e.target.value};})} placeholder="重要ポイント、暗記事項、苦手箇所などを自由に記述..." style={{width:"100%",minHeight:320,padding:"12px 14px",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:"'Noto Sans JP',sans-serif",fontSize:13,lineHeight:1.75,outline:"none",resize:"vertical"}}/></div>}
    {!S.subjects.length&&<div style={{textAlign:"center",padding:"40px 0",color:C.sub,fontSize:13}}>科目を追加してください</div>}
  </div>;
}

// ─── Main App ────────────────────────────────────────────────────
export default function App(){
  const [S,setS]=useState(loadState);
  const [view,setView]=useState("dashboard");
  const [weekOff,setWeekOff]=useState(0);
  const [clSubj,setClSubj]=useState(null);
  const [memoSubj,setMemoSubj]=useState(null);
  const [openThemes,setOpenThemes]=useState({});
  const {toast,Toast}=useToast();
  // Plan
  const [planHours,setPlanHours]=useState(3);
  const [pasteText,setPasteText]=useState("");
  const [copied,setCopied]=useState(false);
  const [planErr,setPlanErr]=useState("");
  // Timer
  const [timerRunning,setTimerRunning]=useState(false);
  const [timerSecs,setTimerSecs]=useState(0);
  const [timerSubj,setTimerSubj]=useState(null);
  const [timerNote,setTimerNote]=useState("");
  const [timerTaskId,setTimerTaskId]=useState(null); // linked plan task
  const [reportTab,setReportTab]=useState("daily");
  const timerRef=useRef(null);
  const timerStartRef=useRef(null); // Date.now() when timer last started
  const timerBaseRef=useRef(0);     // accumulated secs before current start
  // Modals
  const [modal,setModal]=useState(null);
  const [confirmCfg,setConfirmCfg]=useState(null);
  const [editSId,setEditSId]=useState(null);
  const [smName,setSmName]=useState(""); const [smNote,setSmNote]=useState(""); const [smColor,setSmColor]=useState(PALETTE[0]); const [smIcon,setSmIcon]=useState(ICONS[0]);
  const [thSubj,setThSubj]=useState(""); const [thName,setThName]=useState("");
  const [tpTheme,setTpTheme]=useState(""); const [tpName,setTpName]=useState(""); const [tpLv,setTpLv]=useState(1);
  const [scSubj,setScSubj]=useState(""); const [scDate,setScDate]=useState(dsOf()); const [scDur,setScDur]=useState(60); const [scNote,setScNote]=useState("");
  const [exName,setExName]=useState(""); const [exDate,setExDate]=useState(""); const [exSubj,setExSubj]=useState(""); const [exNote,setExNote]=useState(""); const [exType,setExType]=useState("exam");

  useEffect(()=>{
    try{ localStorage.setItem("medstudy_v6", JSON.stringify(S)); }catch(e){}
  },[S]);

  useEffect(()=>{
    // Restore running timer from localStorage (survives page reload)
    try{
      const saved=localStorage.getItem("medstudy_timer");
      if(saved){
        const {startTs,baseSecs}=JSON.parse(saved);
        const elapsed=Math.floor((Date.now()-startTs)/1000);
        timerStartRef.current=startTs;
        timerBaseRef.current=baseSecs;
        setTimerSecs(baseSecs+elapsed);
        setTimerRunning(true);
        timerRef.current=setInterval(()=>{
          setTimerSecs(Math.floor((Date.now()-timerStartRef.current)/1000)+timerBaseRef.current);
        },500);
      }
    }catch(e){}
    return ()=>clearInterval(timerRef.current);
  },[]);

  // Snap display to correct time when returning from background
  useEffect(()=>{
    const onVisible=()=>{
      if(timerStartRef.current!==null){
        setTimerSecs(Math.floor((Date.now()-timerStartRef.current)/1000)+timerBaseRef.current);
      }
    };
    document.addEventListener("visibilitychange",onVisible);
    return ()=>document.removeEventListener("visibilitychange",onVisible);
  },[]);

  const upd=fn=>setS(prev=>{const n=JSON.parse(JSON.stringify(prev));fn(n);return n;});
  const getSubj=id=>S.subjects.find(s=>s.id===id);
  const subjProg=sid=>{const ts=S.topics.filter(t=>t.subjectId===sid);if(!ts.length)return null;const done=ts.filter(t=>t.level===3).length;return{total:ts.length,done,pct:Math.round(done/ts.length*100)};};
  const nextExam=()=>S.exams.filter(e=>daysUntil(e.date)>=0&&(e.type||"exam")==="exam").sort((a,b)=>a.date.localeCompare(b.date))[0]||null;

  // Subject CRUD
  const openSM=(id=null)=>{setEditSId(id);const s=id?getSubj(id):null;setSmName(s?.name||"");setSmNote(s?.note||"");setSmColor(s?.color||PALETTE[0]);setSmIcon(s?.icon||ICONS[0]);setModal("subject");};
  const saveSubj=()=>{if(!smName.trim()){toast("科目名を入力してください");return;}upd(n=>{if(editSId){const i=n.subjects.findIndex(s=>s.id===editSId);if(i>=0)n.subjects[i]={...n.subjects[i],name:smName.trim(),color:smColor,icon:smIcon,note:smNote.trim()};}else{const id=uid();n.subjects.push({id,name:smName.trim(),color:smColor,icon:smIcon,note:smNote.trim()});n.memos[id]="";}});setModal(null);toast(editSId?"科目を更新しました":"科目を追加しました");};
  const delSubj=id=>{setConfirmCfg({message:"この科目と関連するテーマ・トピックをすべて削除しますか？\nこの操作は取り消せません。",onOk:()=>{upd(n=>{n.subjects=n.subjects.filter(s=>s.id!==id);n.themes=n.themes.filter(t=>t.subjectId!==id);n.topics=n.topics.filter(t=>t.subjectId!==id);delete n.memos[id];});if(clSubj===id)setClSubj(null);if(memoSubj===id)setMemoSubj(null);toast("削除しました");}});};
  // Theme CRUD
  const openTM=()=>{if(!S.subjects.length){toast("先に科目を追加してください");return;}setThSubj(clSubj||S.subjects[0].id);setThName("");setModal("theme");};
  const addTheme=()=>{if(!thName.trim()){toast("テーマ名を入力してください");return;}upd(n=>{n.themes.push({id:uid(),subjectId:thSubj,name:thName.trim()});});setModal(null);toast("テーマを追加しました");};
  const delTheme=id=>{setConfirmCfg({message:"このテーマと関連トピックをすべて削除しますか？",onOk:()=>{upd(n=>{n.themes=n.themes.filter(t=>t.id!==id);n.topics=n.topics.filter(t=>t.themeId!==id);});toast("削除しました");}});};
  // Topic CRUD
  const openPM=(tid=null)=>{if(!S.themes.length){toast("先にテーマを追加してください");return;}setTpTheme(tid||S.themes[0]?.id);setTpName("");setTpLv(1);setModal("topic");};
  const addTopic=()=>{if(!tpName.trim()||!tpTheme){toast("テーマとトピック名を入力してください");return;}const th=S.themes.find(t=>t.id===tpTheme);upd(n=>{n.topics.push({id:uid(),themeId:tpTheme,subjectId:th.subjectId,name:tpName.trim(),level:tpLv});});setModal(null);toast("トピックを追加しました");};
  const delTopic=id=>upd(n=>{n.topics=n.topics.filter(t=>t.id!==id);});
  const setLv=(id,lv)=>upd(n=>{const t=n.topics.find(x=>x.id===id);if(t)t.level=lv;});
  // Schedule CRUD
  const openSchM=()=>{if(!S.subjects.length){toast("先に科目を追加してください");return;}setScSubj(clSubj||S.subjects[0].id);setScDate(dsOf());setScDur(60);setScNote("");setModal("schedule");};
  const addSched=()=>{if(!scDate){toast("日付を選択してください");return;}upd(n=>{n.schedules.push({id:uid(),subjectId:scSubj,date:scDate,dur:scDur,note:scNote.trim()});});setModal(null);toast("予定を追加しました");};
  const delSched=id=>upd(n=>{n.schedules=n.schedules.filter(x=>x.id!==id);});
  // Exam CRUD
  const openEM=()=>{setExName("");setExDate("");setExSubj("");setExNote("");setExType("exam");setModal("exam");};
  const addExam=()=>{if(!exName.trim()||!exDate){toast("試験名と日付を入力してください");return;}upd(n=>{n.exams.push({id:uid(),name:exName.trim(),date:exDate,subjectId:exSubj,note:exNote.trim(),type:exType});});setModal(null);toast(exType==="exam"?"試験を追加しました":"目標を追加しました");};
  const delExam=id=>upd(n=>{n.exams=n.exams.filter(x=>x.id!==id);});
  // Plan
  const applyPastedPlan=text=>{setPlanErr("");try{const cleaned=text.replace(/```[\w]*\n?/g,"").trim();const match=cleaned.match(/\[[\s\S]*\]/);if(!match)throw new Error("JSON配列が見つかりませんでした");const tasks=JSON.parse(match[0]);if(!Array.isArray(tasks)||!tasks.length)throw new Error("タスクリストが空です");const nameToId={};S.subjects.forEach(s=>{nameToId[s.name]=s.id;});upd(n=>{n.planTasks=tasks.map((t,i)=>({...t,id:String(Date.now())+"_"+i,completed:false,subject:nameToId[t.subject]||S.subjects.find(s=>s.id===t.subject)?.id||S.subjects[0]?.id}));});setPasteText("");toast("計画を反映しました ✅");}catch(e){setPlanErr("エラー: "+e.message);}};
  const toggleTask=id=>upd(n=>{if(Array.isArray(n.planTasks))n.planTasks=n.planTasks.map(t=>t.id===id?{...t,completed:!t.completed}:t);});
  const clearPlan=()=>{upd(n=>{n.planTasks=null;});setPasteText("");toast("計画をクリアしました");};
  // Timer — timestamp-based so background / screen-off doesn't stop the count
  const startTimer=()=>{
    if(timerRunning)return;
    timerStartRef.current=Date.now();
    timerBaseRef.current=timerSecs;
    try{ localStorage.setItem("medstudy_timer",JSON.stringify({startTs:timerStartRef.current,baseSecs:timerBaseRef.current})); }catch(e){}
    setTimerRunning(true);
    timerRef.current=setInterval(()=>{
      setTimerSecs(Math.floor((Date.now()-timerStartRef.current)/1000)+timerBaseRef.current);
    },500);
  };
  const pauseTimer=()=>{
    setTimerRunning(false);
    clearInterval(timerRef.current);
    timerStartRef.current=null;
    try{ localStorage.removeItem("medstudy_timer"); }catch(e){}
  };
  const resetTimer=()=>{pauseTimer();setTimerSecs(0);timerBaseRef.current=0;};
  const saveSession=()=>{
    const mins=secsToMins(timerSecs);
    if(mins<1){toast("1分未満は記録できません");return;}
    const subjId=timerSubj||S.subjects[0]?.id;
    if(!subjId){toast("先に科目を追加してください");return;}
    // If a plan task is linked, use its title as note (if no manual note)
    const linkedTask=timerTaskId&&Array.isArray(S.planTasks)?S.planTasks.find(t=>t.id===timerTaskId):null;
    const noteToSave=timerNote.trim()||(linkedTask?linkedTask.title:"");
    upd(n=>{
      if(!n.studyLogs)n.studyLogs=[];
      n.studyLogs.push({id:uid(),subjectId:subjId,date:dsOf(),mins,note:noteToSave,planTaskId:timerTaskId||null,ts:Date.now()});
      // Auto-complete the linked task
      if(timerTaskId&&Array.isArray(n.planTasks)){
        n.planTasks=n.planTasks.map(t=>t.id===timerTaskId?{...t,completed:true}:t);
      }
    });
    toast(fmtMins(mins)+"を記録しました"+(linkedTask?" · "+linkedTask.title+"を完了":"")+" ✅");
    try{ localStorage.removeItem("medstudy_timer"); }catch(e){}
    resetTimer();setTimerNote("");setTimerTaskId(null);
  };
  const addManualLog=(subjId,mins,note,date)=>{if(mins<1||!subjId)return;upd(n=>{if(!n.studyLogs)n.studyLogs=[];n.studyLogs.push({id:uid(),subjectId:subjId,date:date||dsOf(),mins,note:note||"",ts:Date.now()});});toast("記録しました");};
  const deleteLog=id=>upd(n=>{n.studyLogs=(n.studyLogs||[]).filter(l=>l.id!==id);});

  // ── Restore from storage ──
  const restoreFromStorage = (d) => {
    const fixed = ensureFields(JSON.parse(JSON.stringify(d)));
    setS(fixed);
    toast("データを復元しました ✅");
  };

  // ── Bulk import ──
  const importSubjects = ({subjects:newS, themes:newT, topics:newTp}) => {
    upd(n=>{
      // Merge: add new subjects (skip if same name already exists)
      newS.forEach(s=>{
        if(!n.subjects.find(x=>x.name===s.name)){
          n.subjects.push(s);
          n.memos[s.id]="";
        }
      });
      // Merge themes
      newT.forEach(t=>{
        // Find matching subject by name (in case IDs differ)
        const existSubj = n.subjects.find(s=>s.name===newS.find(ns=>ns.id===t.subjectId)?.name);
        if(existSubj && !n.themes.find(x=>x.name===t.name&&x.subjectId===existSubj.id)){
          n.themes.push({...t, subjectId:existSubj.id});
        }
      });
      // Merge topics
      newTp.forEach(tp=>{
        const origTheme = newT.find(t=>t.id===tp.themeId);
        const origSubj  = newS.find(s=>s.id===tp.subjectId);
        const existSubj = n.subjects.find(s=>s.name===origSubj?.name);
        const existTheme= n.themes.find(t=>t.name===origTheme?.name&&t.subjectId===existSubj?.id);
        if(existTheme && !n.topics.find(x=>x.name===tp.name&&x.themeId===existTheme.id)){
          n.topics.push({...tp, themeId:existTheme.id, subjectId:existSubj.id});
        }
      });
    });
    toast("インポートしました ✅");
  };

  const ne=nextExam();
  const studyLogs=S.studyLogs||[];

  const viewProps={S,getSubj,subjProg,nextExam,openEM};
  const views={
    dashboard:<VDashboard {...viewProps} weekOff={weekOff}/>,
    plan:<VPlan S={S} getSubj={getSubj} nextExam={nextExam} planHours={planHours} setPlanHours={setPlanHours} pasteText={pasteText} setPasteText={setPasteText} planErr={planErr} setPlanErr={setPlanErr} copied={copied} setCopied={setCopied} applyPastedPlan={applyPastedPlan} toggleTask={toggleTask} clearPlan={clearPlan} fmtMins={fmtMins}/>,
    checklist:<VChecklist S={S} getSubj={getSubj} subjProg={subjProg} clSubj={clSubj} setClSubj={setClSubj} openTM={openTM} openPM={openPM} delTheme={delTheme} delTopic={delTopic} setLv={setLv} setView={setView} openThemes={openThemes} setOpenThemes={setOpenThemes}/>,
    schedule:<VSchedule S={S} getSubj={getSubj} weekOff={weekOff} setWeekOff={setWeekOff} openSchM={openSchM} delSched={delSched}/>,
    timer:<VTimer S={S} getSubj={getSubj} timerRunning={timerRunning} timerSecs={timerSecs} timerSubj={timerSubj} setTimerSubj={setTimerSubj} timerNote={timerNote} setTimerNote={setTimerNote} timerTaskId={timerTaskId} setTimerTaskId={setTimerTaskId} startTimer={startTimer} pauseTimer={pauseTimer} resetTimer={resetTimer} saveSession={saveSession} reportTab={reportTab} setReportTab={setReportTab} studyLogs={studyLogs} deleteLog={deleteLog} addManualLog={addManualLog} fmtMins={fmtMins} fmtSecs={fmtSecs}/>,
    subjects:<VSubjects S={S} getSubj={getSubj} subjProg={subjProg} openSM={openSM} delSubj={delSubj} importSubjects={importSubjects} restoreFromStorage={restoreFromStorage}/>,
    exams:<VExams S={S} getSubj={getSubj} subjProg={subjProg} delExam={delExam} openEM={openEM}/>,
    memo:<VMemo S={S} getSubj={getSubj} memoSubj={memoSubj} setMemoSubj={setMemoSubj} upd={upd}/>,
  };

  return <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text,fontFamily:"'Noto Sans JP',sans-serif",fontSize:14,lineHeight:1.65}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap');@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${C.border2};border-radius:3px}::-webkit-scrollbar-track{background:transparent}`}</style>

    {/* Sidebar */}
    <div style={{width:232,flexShrink:0,background:C.surf,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflowY:"auto"}}>
      <div style={{padding:"22px 20px 18px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`}}>
        <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#6ee7b7,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🔬</div>
        <div><div style={{fontSize:13,fontWeight:700}}>MedStudy</div><div style={{fontSize:10,color:C.sub,marginTop:2}}>基礎医学 学習管理</div></div>
      </div>
      {["学習","管理"].map(group=><div key={group} style={{padding:"18px 0 4px"}}>
        <div style={{fontSize:10,fontWeight:700,color:C.sub,padding:"0 20px 6px",opacity:.7}}>{group}</div>
        {NAV.filter(n=>n.group===group).map(n=><div key={n.view} onClick={()=>setView(n.view)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 20px",fontSize:13,fontWeight:500,cursor:"pointer",borderLeft:`2px solid ${view===n.view?C.accent:"transparent"}`,color:view===n.view?C.text:C.dim,background:view===n.view?"rgba(245,158,11,0.08)":"transparent",transition:"all .12s"}}><span style={{fontSize:15,opacity:.8}}>{n.icon}</span>{n.label}</div>)}
      </div>)}
    </div>

    {/* Main */}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
      <div style={{height:56,flexShrink:0,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",background:C.surf}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:15,fontWeight:700}}>{NAV.find(n=>n.view===view)?.label||""}</div>
          {!localStorage.getItem("medstudy_v6") &&
            <span style={{fontSize:10,color:C.danger,background:"rgba(248,113,113,0.1)",padding:"2px 8px",borderRadius:6}}>ストレージ空</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:C.surf2,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 14px",fontFamily:"'DM Mono',monospace",fontSize:11,color:C.accent}}>📅 {ne?ne.name+" "+daysUntil(ne.date)+"日後":"試験を登録"}</div>
          <Btn variant="accent" size="sm" onClick={()=>setModal("quickadd")}>＋ 追加</Btn>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"22px 28px 48px"}}>{views[view]}</div>
    </div>

    {/* Modals */}
    <Modal open={modal==="quickadd"} onClose={()=>setModal(null)} title="何を追加しますか？" width={320}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[["☑️","テーマ",()=>{setModal(null);openTM();}],["📌","トピック",()=>{setModal(null);openPM(null);}],["📅","学習予定",()=>{setModal(null);openSchM();}],["🎯","試験・目標",()=>{setModal(null);openEM();}]].map(([ico,lbl,fn])=><button key={lbl} onClick={fn} style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${C.border}`,borderRadius:8,padding:"18px 8px",cursor:"pointer",color:C.text,display:"flex",flexDirection:"column",alignItems:"center",gap:6,fontSize:20,fontFamily:"'Noto Sans JP',sans-serif"}}>{ico}<span style={{fontSize:11,color:C.sub}}>{lbl}</span></button>)}</div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}><Btn variant="ghost" size="sm" onClick={()=>setModal(null)}>閉じる</Btn></div>
    </Modal>
    <Modal open={modal==="subject"} onClose={()=>setModal(null)} title={editSId?"科目を編集":"科目を追加"}>
      <FGrp label="科目名"><FInput value={smName} onChange={e=>setSmName(e.target.value)} placeholder="例: 薬理学、生理学、解剖学"/></FGrp>
      <FGrp label="アイコン"><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{ICONS.map(ic=><div key={ic} onClick={()=>setSmIcon(ic)} style={{width:32,height:32,borderRadius:7,border:`1px solid ${ic===smIcon?C.accent:C.border}`,background:ic===smIcon?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.05)",fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{ic}</div>)}</div></FGrp>
      <FGrp label="カラー"><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{PALETTE.map(c=><div key={c} onClick={()=>setSmColor(c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:`2px solid ${c===smColor?"#fff":"transparent"}`,cursor:"pointer",transform:c===smColor?"scale(1.2)":"scale(1)",transition:"transform .12s"}}/>)}</div></FGrp>
      <FGrp label="メモ（任意）"><FInput value={smNote} onChange={e=>setSmNote(e.target.value)} placeholder="例: 教科書名、担当教員など"/></FGrp>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:22}}><Btn variant="ghost" onClick={()=>setModal(null)}>キャンセル</Btn><Btn variant="accent" onClick={saveSubj}>保存</Btn></div>
    </Modal>
    <Modal open={modal==="theme"} onClose={()=>setModal(null)} title="テーマを追加">
      <FGrp label="科目"><FSelect value={thSubj} onChange={e=>setThSubj(e.target.value)}>{S.subjects.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</FSelect></FGrp>
      <FGrp label="テーマ名"><FInput value={thName} onChange={e=>setThName(e.target.value)} placeholder="例: 自律神経薬、炎症の基礎"/></FGrp>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:22}}><Btn variant="ghost" onClick={()=>setModal(null)}>キャンセル</Btn><Btn variant="accent" onClick={addTheme}>追加</Btn></div>
    </Modal>
    <Modal open={modal==="topic"} onClose={()=>setModal(null)} title="トピックを追加">
      <FGrp label="テーマ"><FSelect value={tpTheme} onChange={e=>setTpTheme(e.target.value)}>{S.subjects.map(s=>{const ts=S.themes.filter(t=>t.subjectId===s.id);if(!ts.length)return null;return <optgroup key={s.id} label={s.icon+" "+s.name}>{ts.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>;})}</FSelect></FGrp>
      <FGrp label="トピック名"><FInput value={tpName} onChange={e=>setTpName(e.target.value)} placeholder="例: 作用機序、副作用、臨床応用"/></FGrp>
      <FGrp label="初期理解度"><FSelect value={tpLv} onChange={e=>setTpLv(parseInt(e.target.value))}><option value={1}>🔴 未習</option><option value={2}>🟡 不確か</option><option value={3}>🟢 理解済</option></FSelect></FGrp>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:22}}><Btn variant="ghost" onClick={()=>setModal(null)}>キャンセル</Btn><Btn variant="accent" onClick={addTopic}>追加</Btn></div>
    </Modal>
    <Modal open={modal==="schedule"} onClose={()=>setModal(null)} title="学習予定を追加">
      <FGrp label="科目"><FSelect value={scSubj} onChange={e=>setScSubj(e.target.value)}>{S.subjects.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</FSelect></FGrp>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><FGrp label="日付"><FInput type="date" value={scDate} onChange={e=>setScDate(e.target.value)}/></FGrp><FGrp label="時間（分）"><FInput type="number" value={scDur} onChange={e=>setScDur(parseInt(e.target.value)||60)} min={10} step={10}/></FGrp></div>
      <FGrp label="内容メモ（任意）"><FInput value={scNote} onChange={e=>setScNote(e.target.value)} placeholder="例: 過去問演習、総復習"/></FGrp>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:22}}><Btn variant="ghost" onClick={()=>setModal(null)}>キャンセル</Btn><Btn variant="accent" onClick={addSched}>追加</Btn></div>
    </Modal>
    <Modal open={modal==="exam"} onClose={()=>setModal(null)} title="試験・目標を追加">
      <FGrp label="種別"><div style={{display:"flex",gap:8}}>{[["exam","🎯 試験"],["goal","📌 学習目標"]].map(([key,lbl])=><div key={key} onClick={()=>setExType(key)} style={{flex:1,padding:"10px 0",borderRadius:8,textAlign:"center",fontSize:13,fontWeight:700,cursor:"pointer",border:`1px solid ${exType===key?C.accent:C.border}`,background:exType===key?"rgba(245,158,11,0.12)":"transparent",color:exType===key?C.accent:C.sub,transition:"all .15s"}}>{lbl}</div>)}</div></FGrp>
      <FGrp label={exType==="exam"?"試験名":"目標名"}><FInput value={exName} onChange={e=>setExName(e.target.value)} placeholder={exType==="exam"?"例: 薬理学 期末試験":"例: 解剖学 基礎マスター"}/></FGrp>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><FGrp label={exType==="exam"?"試験日":"学習完了目標日"}><FInput type="date" value={exDate} onChange={e=>setExDate(e.target.value)}/></FGrp><FGrp label="科目"><FSelect value={exSubj} onChange={e=>setExSubj(e.target.value)}><option value="">科目なし（総合）</option>{S.subjects.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</FSelect></FGrp></div>
      <FGrp label="メモ（任意）"><FInput value={exNote} onChange={e=>setExNote(e.target.value)} placeholder={exType==="exam"?"例: 持ち込み不可":"例: 教科書3周、過去問完了"}/></FGrp>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:22}}><Btn variant="ghost" onClick={()=>setModal(null)}>キャンセル</Btn><Btn variant="accent" onClick={addExam}>追加</Btn></div>
    </Modal>

    {confirmCfg&&<div onClick={()=>setConfirmCfg(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(3px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:C.surf,border:`1px solid ${C.border2}`,borderRadius:14,padding:28,width:340,maxWidth:"92vw",boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}><div style={{fontSize:15,fontWeight:700,marginBottom:14}}>⚠️ 確認</div><div style={{fontSize:13,color:C.dim,lineHeight:1.7,marginBottom:24,whiteSpace:"pre-wrap"}}>{confirmCfg.message}</div><div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn variant="ghost" onClick={()=>setConfirmCfg(null)}>キャンセル</Btn><button style={{background:C.danger,color:"#000",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:700,fontSize:13,cursor:"pointer"}} onClick={()=>{confirmCfg.onOk();setConfirmCfg(null);}}>削除する</button></div></div></div>}
    <Toast/>
  </div>;
}
