import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC8mDTC6D0yqmXdo7VQVyx7DnrIjwGg-6I",
  authDomain: "mps-poker-bec02.firebaseapp.com",
  projectId: "mps-poker-bec02",
  storageBucket: "mps-poker-bec02.firebasestorage.app",
  messagingSenderId: "719392847742",
  appId: "1:719392847742:web:086a74b5b6f0394ccee52f"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BUY_IN=1000, TAX=0.2;
const NAMES=["IO","PN","CW","BT","AK","DS","PK","SC","YS","SY","DT","JN","KC","JW","DH"];
const MON=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const f=n=>Math.round(n).toLocaleString();
const fs=n=>n===0?"—":(n>0?"+$"+f(n):"-$"+f(Math.abs(n)));
const lbl=iso=>{if(!iso)return"";const[y,m,d]=iso.split("-");return d+"-"+MON[+m-1]+"-"+y.slice(2);};
const card={background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:14,padding:12,marginBottom:12};

function mkSettle(comp){
  const pay=comp.filter(p=>p.net<0).map(p=>({name:p.name,amt:-p.net})).sort((a,b)=>b.amt-a.amt);
  const rec=comp.filter(p=>p.net>0).map(p=>({name:p.name,amt:p.net})).sort((a,b)=>b.amt-a.amt);
  const tx=[],p=pay.map(x=>({...x})),r=rec.map(x=>({...x}));
  let i=0,j=0;
  while(i<p.length&&j<r.length){
    const a=Math.min(p[i].amt,r[j].amt);
    if(a>0)tx.push({from:p[i].name,to:r[j].name,amount:Math.round(a)});
    p[i].amt-=a;r[j].amt-=a;
    if(!p[i].amt)i++;if(!r[j].amt)j++;
  }
  return tx;
}

// ── CALENDAR ─────────────────────────────────────────────────────
function Cal({date,setDate}){
  const[show,setShow]=useState(false);
  const[c,setC]=useState(()=>{const d=new Date();return{y:d.getFullYear(),m:d.getMonth()};});
  const{y,m}=c,first=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate();
  const iso=d=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const td=new Date().toISOString().split("T")[0];
  return(
    <div style={{position:"relative"}}>
      <button onClick={()=>setShow(s=>!s)} style={{fontSize:14,border:"none",background:"transparent",color:"#e2e8f0",cursor:"pointer",padding:0,fontWeight:700}}>{lbl(date)} ▾</button>
      {show&&<div style={{position:"absolute",top:26,left:0,background:"#1e293b",border:"1px solid #334155",borderRadius:12,zIndex:200,padding:10,width:230,boxShadow:"0 12px 32px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <button onClick={()=>setC(c=>c.m===0?{y:c.y-1,m:11}:{y:c.y,m:c.m-1})} style={{background:"none",border:"none",color:"#94a3b8",fontSize:18,cursor:"pointer"}}>‹</button>
          <span style={{color:"#e2e8f0",fontWeight:700,fontSize:13}}>{MON[m]} {y}</span>
          <button onClick={()=>setC(c=>c.m===11?{y:c.y+1,m:0}:{y:c.y,m:c.m+1})} style={{background:"none",border:"none",color:"#94a3b8",fontSize:18,cursor:"pointer"}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:3}}>
          {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,color:"#64748b",fontWeight:700}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
          {[...Array(first).fill(null),...Array.from({length:dim},(_,i)=>i+1)].map((d,i)=>
            !d?<div key={i}/>:
            <button key={i} onClick={()=>{setDate(iso(d));setShow(false);}} style={{width:"100%",aspectRatio:"1",borderRadius:"50%",border:"none",cursor:"pointer",fontSize:12,
              background:iso(d)===date?"#4ade80":iso(d)===td?"rgba(74,222,128,.15)":"transparent",
              color:iso(d)===date?"#14532d":iso(d)===td?"#4ade80":"#e2e8f0",fontWeight:iso(d)===date||iso(d)===td?700:400}}>{d}</button>
          )}
        </div>
      </div>}
    </div>
  );
}

// ── SETTLEMENT ROW ────────────────────────────────────────────────
function SRow({t}){
  const[done,setDone]=useState(false);
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)",opacity:done?.4:1,marginBottom:6,background:done?"var(--color-background-secondary)":"var(--color-background-primary)"}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:"#fde8e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#a32d2d",flexShrink:0}}>{t.from}</div>
      <div style={{flex:1}}><div style={{fontSize:11,color:"var(--color-text-secondary)"}}>pays</div><div style={{fontSize:14,fontWeight:700}}>{t.to}</div></div>
      <div style={{fontSize:16,fontWeight:800,color:"#1a7a3e",marginRight:4}}>${f(t.amount)}</div>
      <label style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",fontSize:10,color:"var(--color-text-secondary)",gap:1}}>
        <input type="checkbox" checked={done} onChange={()=>setDone(d=>!d)} style={{width:17,height:17}}/>done
      </label>
    </div>
  );
}

// ── SUMMARY POPUP ─────────────────────────────────────────────────
function Summary({date,comp,stl,totTax,extras,prevK,curK,rebate,topL,onClose}){
  const pool=comp.reduce((s,p)=>s+p.buyIn,0);
  return(
    <div style={{background:"#ffffff",borderRadius:16,marginBottom:12,border:"1px solid #e2e8f0",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,.08)"}}>
      <div style={{background:"#1a1a2e",padding:"14px 16px",borderBottom:"1px solid #e2e8f0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:".1em"}}>MPS POKER NIGHT</div>
            <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>♠ {lbl(date)}</div>
            <div style={{fontSize:12,color:"#4ade80"}}>{comp.length} players · ${f(pool)} pool</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",border:"none",color:"#94a3b8",fontSize:13,padding:"4px 9px",borderRadius:7,cursor:"pointer"}}>✕</button>
        </div>
      </div>
      <div style={{padding:"12px 16px",background:"#fff"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginBottom:8}}>RESULTS</div>
        {[...comp].sort((a,b)=>b.winnings-a.winnings).map(p=>(
          <div key={p.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
            <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,
              background:p.winnings>0?"#14532d":p.winnings<0?"#2d1a1a":"#1e293b",
              color:p.winnings>0?"#16a34a":p.winnings<0?"#dc2626":"#64748b"}}>{p.name}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:"#94a3b8"}}>{p.rebuys}x · {f(p.chips)} chips</div>
              {p.name===topL?.name&&rebate>0&&<div style={{fontSize:10,color:"#fbbf24"}}>rebate +${f(rebate)}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:800,color:p.winnings>0?"#16a34a":p.winnings<0?"#dc2626":"#64748b"}}>{p.winnings===0?"—":(p.winnings>0?"+$":"−$")+f(Math.abs(p.winnings))}</div>
              {p.tax>0&&<div style={{fontSize:9,color:"#15803d"}}>tax ${f(p.tax)}</div>}
            </div>
          </div>
        ))}
        <div style={{height:1,background:"#e2e8f0",margin:"10px 0"}}/>
        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginBottom:8}}>SETTLEMENT</div>
        {stl.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:700,color:"#dc2626",minWidth:28}}>{t.from}</span>
          <span style={{fontSize:11,color:"#94a3b8"}}>→</span>
          <span style={{fontSize:13,fontWeight:700,color:"#16a34a",flex:1}}>{t.to}</span>
          <span style={{fontSize:14,fontWeight:800,color:"#1e293b"}}>${f(t.amount)}</span>
        </div>)}
        <div style={{height:1,background:"#e2e8f0",margin:"10px 0"}}/>
        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginBottom:8}}>KITTY</div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>Tax</span><span style={{fontSize:13,fontWeight:600,color:"#16a34a"}}>+${f(totTax)}</span></div>
        {extras.map((e,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>{e.label}</span><span style={{fontSize:13,fontWeight:600,color:"#dc2626"}}>-${f(e.amount)}</span></div>)}
        {rebate>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>Rebate ({topL?.name})</span><span style={{fontSize:13,fontWeight:600,color:"#dc2626"}}>-${f(rebate)}</span></div>}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>Previous</span><span style={{fontSize:13,color:"#475569",fontWeight:600}}>${f(prevK)}</span></div>
        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:"#16a34a",fontWeight:600}}>Current Kitty</span>
          <span style={{fontSize:20,fontWeight:800,color:"#16a34a"}}>${f(curK)}</span>
        </div>
        <div style={{textAlign:"center",marginTop:10,fontSize:11,color:"#94a3b8"}}>Screenshot & share to MPS 🃏</div>
      </div>
    </div>
  );
}

// ── SPARKLINE ─────────────────────────────────────────────────────
function Spark({values,color}){
  if(!values||values.length<2)return null;
  const w=60,h=22,pad=2;
  const mn=Math.min(...values),mx=Math.max(...values),rng=mx-mn||1;
  const pts=values.map((v,i)=>{
    const x=pad+(i/(values.length-1))*(w-pad*2);
    const y=h-pad-((v-mn)/rng)*(h-pad*2);
    return`${x},${y}`;
  }).join(" ");
  return(<svg width={w} height={h} style={{display:"block"}}><polyline points={pts} fill="none" stroke={color||"#4ade80"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/></svg>);
}

// ── LEADERBOARD ───────────────────────────────────────────────────
function Leaderboard({history,onClose}){
  const[selMonth,setSelMonth]=useState(null);
  const[sortLB,setSortLB]=useState("net-desc");
  const[filterPlayer,setFilterPlayer]=useState("");

  const months=useMemo(()=>{
    const s=new Set(history.map(h=>h.date.slice(0,7)));
    return[...s].sort((a,b)=>b.localeCompare(a));
  },[history]);

  useEffect(()=>{if(months.length&&!selMonth)setSelMonth(months[0]);},[months]);

  // Build per-player stats from all history
  const EXCLUDE=["FC","RN"];
  const buildStats=(sessions)=>{
    const map={};
    sessions.forEach(s=>{
      (s.players||[]).filter(p=>!EXCLUDE.includes(p.name)).forEach(p=>{
        if(!map[p.name])map[p.name]={name:p.name,sessions:0,wins:0,losses:0,totalNet:0,grossWin:0,grossLoss:0,totalTax:0,totalRebate:0,netHistory:[]};
        const d=map[p.name];
        const pRebate=p.rebate||0;
        const pNet=(p.winnings||0)-(p.tax||0)+pRebate;
        d.sessions++;
        d.totalNet+=pNet;
        d.grossWin+=(p.winnings||0)>0?(p.winnings||0):0;
        d.grossLoss+=(p.winnings||0)<0?(p.winnings||0):0;
        d.totalTax+=p.tax||0;
        d.totalRebate+=pRebate;
        d.netHistory.push(pNet);
        if(pNet>0)d.wins++;else if(pNet<0)d.losses++;
      });
    });
    return Object.values(map);
  };

  const sortStats=(arr,key)=>{
    const s=[...arr];
    if(key==="net-desc") return s.sort((a,b)=>b.totalNet-a.totalNet);
    if(key==="net-asc")  return s.sort((a,b)=>a.totalNet-b.totalNet);
    if(key==="win-desc") return s.sort((a,b)=>b.grossWin-a.grossWin);
    if(key==="loss-asc") return s.sort((a,b)=>a.grossLoss-b.grossLoss);
    if(key==="sess-desc") return s.sort((a,b)=>b.sessions-a.sessions);
    return s;
  };

  const allStats=useMemo(()=>sortStats(buildStats(history).filter(p=>!filterPlayer||p.name.toLowerCase().includes(filterPlayer.toLowerCase())),sortLB),[history,sortLB,filterPlayer]);
  const monthStats=useMemo(()=>sortStats(buildStats(history.filter(h=>h.date.startsWith(selMonth||""))).filter(p=>!filterPlayer||p.name.toLowerCase().includes(filterPlayer.toLowerCase())),sortLB),[history,selMonth,sortLB,filterPlayer]);

  const attendance=useMemo(()=>{
    const EXCL=["FC","RN"];
    const map={};
    history.forEach(s=>{(s.players||[]).filter(p=>!EXCL.includes(p.name)).forEach(p=>{map[p.name]=(map[p.name]||0)+1;});});
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[history]);

  const medal=(i)=>i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;

  // Compact stat row
  const StatRow=({p,i})=>{
    const isPos=p.totalNet>=0;
    return(
      <div style={{display:"grid",gridTemplateColumns:"22px 28px 1fr 64px 64px 70px",gap:3,alignItems:"center",
        padding:"6px 8px",borderRadius:9,marginBottom:4,
        background:i===0?"#0d2818":i===1?"#1a1a2e":i===2?"#1a1800":"#f8fafc",
        border:`1px solid ${i===0?"#14532d":i===1?"#1e293b":i===2?"#713f12":"#e2e8f0"}`}}>
        <div style={{fontSize:i<3?12:10,fontWeight:700,color:i<3?"inherit":"#94a3b8",textAlign:"center"}}>{medal(i)}</div>
        <div style={{width:26,height:26,borderRadius:"50%",background:isPos?"#14532d":"#2d1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:isPos?"#4ade80":"#f87171"}}>{p.name}</div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:i<3?"#fff":"#1e293b",lineHeight:1.2}}>{p.name} <span style={{fontWeight:400,fontSize:9,color:"#64748b"}}>{p.sessions}s·{p.wins}W{p.losses}L{p.totalRebate>0?` R+$${f(p.totalRebate)}`:""}</span></div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#4ade80"}}>+${f(p.grossWin)}</div>
          <div style={{fontSize:8,color:"#64748b"}}>{p.wins}W</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#f87171"}}>-${f(Math.abs(p.grossLoss))}</div>
          <div style={{fontSize:8,color:"#64748b"}}>{p.losses}L</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,fontWeight:800,color:isPos?"#4ade80":"#f87171"}}>{isPos?"+$":"-$"}{f(Math.abs(p.totalNet))}</div>
          <div style={{fontSize:8,color:"#64748b"}}>avg {isPos?"+":"-"}${f(Math.abs(Math.round(p.totalNet/(p.sessions||1))))}</div>
        </div>
      </div>
    );
  };

  return(
    <div style={{...card,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:15,fontWeight:700}}>🏆 Leaderboard</span>
        <button onClick={onClose} style={{fontSize:13,padding:"3px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)",cursor:"pointer"}}>Close</button>
      </div>

      {/* Filter + Sort */}
      <div style={{marginBottom:8}}>
        <input value={filterPlayer} onChange={e=>setFilterPlayer(e.target.value)} placeholder="🔍 Filter player..." style={{width:"100%",fontSize:11,padding:"5px 8px",borderRadius:7,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#1e293b",marginBottom:6,boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          <span style={{fontSize:9,color:"#94a3b8",alignSelf:"center"}}>Sort:</span>
          {[["net-desc","Net ↓"],["net-asc","Net ↑"],["win-desc","Win ↓"],["loss-asc","Loss ↑"],["sess-desc","Sessions ↓"]].map(([v,l])=>(
            <button key={v} onClick={()=>setSortLB(v)} style={{fontSize:9,padding:"2px 7px",borderRadius:5,border:"none",fontWeight:sortLB===v?700:400,background:sortLB===v?"#185fa5":"#e2e8f0",color:sortLB===v?"#fff":"#64748b",cursor:"pointer"}}>{l}</button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div style={{display:"grid",gridTemplateColumns:"22px 28px 1fr 64px 64px 70px",gap:3,padding:"2px 8px",marginBottom:4}}>
        <div/><div/>
        <div style={{fontSize:9,fontWeight:700,color:"#64748b",letterSpacing:".05em"}}>PLAYER</div>
        <div style={{fontSize:9,fontWeight:700,color:"#4ade80",textAlign:"right"}}>G.WIN</div>
        <div style={{fontSize:9,fontWeight:700,color:"#f87171",textAlign:"right"}}>G.LOSS</div>
        <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textAlign:"right"}}>NET</div>
      </div>

      {/* ── OVERALL ── */}
      <div style={{background:"#1a3a6e",borderRadius:7,padding:"4px 8px",marginBottom:6,marginTop:4}}>
        <span style={{fontSize:10,fontWeight:700,color:"#93c5fd",letterSpacing:".06em"}}>📊 OVERALL ALL-TIME</span>
      </div>
      {allStats.map((p,i)=><StatRow key={p.name} p={p} i={i}/>)}

      {/* ── MONTHLY ── */}
      <div style={{background:"#1a3a6e",borderRadius:7,padding:"4px 8px",marginBottom:6,marginTop:10}}>
        <span style={{fontSize:10,fontWeight:700,color:"#93c5fd",letterSpacing:".06em"}}>📅 MONTHLY</span>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:8,overflowX:"auto",paddingBottom:3}}>
        {months.map(m=>{const[y,mo]=m.split("-");return(
          <button key={m} onClick={()=>setSelMonth(m)} style={{flexShrink:0,fontSize:10,padding:"3px 8px",borderRadius:7,border:"none",fontWeight:selMonth===m?700:400,background:selMonth===m?"#185fa5":"#e2e8f0",color:selMonth===m?"#fff":"#64748b",cursor:"pointer"}}>
            {MON[+mo-1]}{y.slice(2)}
          </button>
        );})}
      </div>
      {monthStats.length===0?<div style={{textAlign:"center",padding:10,color:"#94a3b8",fontSize:12}}>No data</div>:monthStats.map((p,i)=><StatRow key={p.name} p={p} i={i}/>)}

      {/* ── ATTENDANCE ── */}
      <div style={{background:"#1a3a6e",borderRadius:7,padding:"4px 8px",marginBottom:6,marginTop:10}}>
        <span style={{fontSize:10,fontWeight:700,color:"#93c5fd",letterSpacing:".06em"}}>🎯 ATTENDANCE ({history.length} sessions)</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
        {attendance.map(([name,count])=>{
          const pct=Math.round((count/history.length)*100);
          return(
            <div key={name} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 6px",borderRadius:8,background:"#f8fafc",border:"1px solid #e2e8f0"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"#e8f4fd",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#185fa5",flexShrink:0}}>{name}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:10,fontWeight:700}}>{name}</span>
                  <span style={{fontSize:9,color:"#64748b"}}>{count}/{history.length}</span>
                </div>
                <div style={{height:4,background:"#e2e8f0",borderRadius:2,marginTop:2}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct>=80?"#4ade80":pct>=50?"#facc15":"#f87171",borderRadius:2}}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── YTD TABLE ─────────────────────────────────────────────────────
function YTD({history,onClose}){
  const year=new Date().getFullYear().toString();
  const[sortYTD,setSortYTD]=useState("net-desc");
  const[filterYTD,setFilterYTD]=useState("");
  const[yearFilter,setYearFilter]=useState(year);

  const availYears=useMemo(()=>{
    const s=new Set(history.map(h=>h.date.slice(0,4)));
    return[...s].sort((a,b)=>b.localeCompare(a));
  },[history]);

  const sessions=useMemo(()=>[...history].filter(h=>h.date.startsWith(yearFilter)).sort((a,b)=>a.date.localeCompare(b.date)),[history,yearFilter]);

  // Per player YTD totals — sorted by net desc
  const ytd=useMemo(()=>{
    const map={};
    const EXCL_YTD=["FC","RN"];
    sessions.forEach(sess=>{
      (sess.players||[]).filter(p=>!EXCL_YTD.includes(p.name)).forEach(p=>{
        if(!map[p.name])map[p.name]={name:p.name,attend:0,grossWin:0,grossLoss:0,tax:0,rebate:0,net:0,turnover:0};
        const pRebate=p.rebate||0;
        const pWin=p.winnings||0;
        map[p.name].attend++;
        map[p.name].grossWin+=pWin>0?pWin:0;
        map[p.name].grossLoss+=pWin<0?pWin:0;
        map[p.name].tax+=p.tax||0;
        map[p.name].rebate+=pRebate;
        map[p.name].net+=pWin-(p.tax||0)+pRebate;
        map[p.name].turnover+=Math.abs(pWin-(p.tax||0)+pRebate);
      });
    });
    const arr=Object.values(map);
    if(sortYTD==="net-desc")  arr.sort((a,b)=>b.net-a.net);
    if(sortYTD==="net-asc")   arr.sort((a,b)=>a.net-b.net);
    if(sortYTD==="win-desc")  arr.sort((a,b)=>b.grossWin-a.grossWin);
    if(sortYTD==="loss-asc")  arr.sort((a,b)=>a.grossLoss-b.grossLoss);
    if(sortYTD==="att-desc")  arr.sort((a,b)=>b.attend-a.attend);
    if(sortYTD==="name-asc")  arr.sort((a,b)=>a.name.localeCompare(b.name));
    return filterYTD?arr.filter(p=>p.name.toLowerCase().includes(filterYTD.toLowerCase())):arr;
  },[sessions,sortYTD,filterYTD]);

  // Players ordered by YTD net desc for column headers
  const ytdPlayers=useMemo(()=>ytd.map(p=>p.name),[ytd]);

  return(
    <div style={{...card,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:15,fontWeight:700}}>📊 YTD {yearFilter}</span>
        <button onClick={onClose} style={{fontSize:13,padding:"3px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)",cursor:"pointer"}}>Close</button>
      </div>

      {/* Year + Filter + Sort controls */}
      <div style={{marginBottom:10}}>
        {/* Year selector */}
        <div style={{display:"flex",gap:5,marginBottom:6,overflowX:"auto",paddingBottom:2}}>
          {availYears.map(y=>(
            <button key={y} onClick={()=>setYearFilter(y)} style={{flexShrink:0,fontSize:11,padding:"3px 10px",borderRadius:7,border:"none",fontWeight:yearFilter===y?700:400,background:yearFilter===y?"#1a3a6e":"#e2e8f0",color:yearFilter===y?"#fff":"#64748b",cursor:"pointer"}}>{y}</button>
          ))}
        </div>
        {/* Player filter */}
        <input value={filterYTD} onChange={e=>setFilterYTD(e.target.value)} placeholder="🔍 Filter player..." style={{width:"100%",fontSize:11,padding:"5px 8px",borderRadius:7,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#1e293b",marginBottom:6,boxSizing:"border-box"}}/>
        {/* Sort */}
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          <span style={{fontSize:9,color:"#94a3b8",alignSelf:"center"}}>Sort:</span>
          {[["net-desc","Net ↓"],["net-asc","Net ↑"],["win-desc","Win ↓"],["loss-asc","Loss ↑"],["att-desc","Att ↓"],["name-asc","Name"]].map(([v,l])=>(
            <button key={v} onClick={()=>setSortYTD(v)} style={{fontSize:9,padding:"2px 7px",borderRadius:5,border:"none",fontWeight:sortYTD===v?700:400,background:sortYTD===v?"#185fa5":"#e2e8f0",color:sortYTD===v?"#fff":"#64748b",cursor:"pointer"}}>{l}</button>
          ))}
        </div>
      </div>

      {sessions.length===0?<div style={{textAlign:"center",padding:16,color:"#94a3b8"}}>No sessions this year</div>:<>

        {/* YTD Summary table */}
        <div style={{overflowX:"auto",marginBottom:12}}>
          <table style={{borderCollapse:"collapse",width:"100%",fontSize:11}}>
            <thead>
              <tr style={{background:"#1a1a2e"}}>
                <th style={{padding:"6px 6px",textAlign:"left",color:"#94a3b8",fontWeight:700,fontSize:10,position:"sticky",left:0,background:"#1a1a2e"}}>Player</th>
                <th style={{padding:"6px 4px",textAlign:"right",color:"#64748b",fontWeight:700,fontSize:10}}>Att</th>
                <th style={{padding:"6px 4px",textAlign:"right",color:"#4ade80",fontWeight:700,fontSize:10}}>G.Win</th>
                <th style={{padding:"6px 4px",textAlign:"right",color:"#f87171",fontWeight:700,fontSize:10}}>G.Loss</th>
                <th style={{padding:"6px 4px",textAlign:"right",color:"#fbbf24",fontWeight:700,fontSize:10}}>Tax</th>
                <th style={{padding:"6px 4px",textAlign:"right",color:"#a78bfa",fontWeight:700,fontSize:10}}>Rebate</th>
                <th style={{padding:"6px 6px",textAlign:"right",color:"#e2e8f0",fontWeight:700,fontSize:10}}>Net</th>
              </tr>
            </thead>
            <tbody>
              {ytd.map((p,i)=>(
                <tr key={p.name} style={{borderBottom:"0.5px solid #e2e8f0",background:i%2===0?"#fff":"#f8fafc"}}>
                  <td style={{padding:"5px 6px",fontWeight:700,position:"sticky",left:0,background:i%2===0?"#fff":"#f8fafc"}}>{p.name}</td>
                  <td style={{padding:"5px 4px",textAlign:"right",color:"#64748b"}}>{p.attend}</td>
                  <td style={{padding:"5px 4px",textAlign:"right",color:"#1a7a3e",fontWeight:600}}>{p.grossWin>0?"+$"+f(p.grossWin):"—"}</td>
                  <td style={{padding:"5px 4px",textAlign:"right",color:"#a32d2d",fontWeight:600}}>{p.grossLoss<0?"-$"+f(Math.abs(p.grossLoss)):"—"}</td>
                  <td style={{padding:"5px 4px",textAlign:"right",color:"#ba7517"}}>{p.tax>0?"$"+f(p.tax):"—"}</td>
                  <td style={{padding:"5px 4px",textAlign:"right",color:"#7c3aed"}}>{p.rebate>0?"+$"+f(p.rebate):"—"}</td>
                  <td style={{padding:"5px 6px",textAlign:"right",fontWeight:800,color:p.net>0?"#1a7a3e":p.net<0?"#a32d2d":"#64748b"}}>{fs(p.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Session by session results grid */}
        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginBottom:8,marginTop:4}}>SESSION RESULTS (Net after tax & rebate)</div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",fontSize:10,minWidth:"100%"}}>
            <thead>
              <tr style={{background:"#0f172a"}}>
                <th style={{padding:"5px 6px",textAlign:"left",color:"#64748b",fontWeight:700,whiteSpace:"nowrap",position:"sticky",left:0,background:"#0f172a",minWidth:60}}>Date</th>
                {ytdPlayers.map(n=><th key={n} style={{padding:"5px 5px",textAlign:"right",color:"#94a3b8",fontWeight:700,minWidth:52}}>{n}</th>)}
                <th style={{padding:"5px 5px",textAlign:"right",color:"#64748b",fontWeight:700,minWidth:40}}>#</th>
                <th style={{padding:"5px 5px",textAlign:"right",color:"#60a5fa",fontWeight:700,minWidth:60}}>Turnover</th>
              </tr>
              {/* Attendance row */}
              <tr style={{background:"#1a3a6e"}}>
                <td style={{padding:"4px 6px",color:"#93c5fd",fontWeight:700,position:"sticky",left:0,background:"#1a3a6e",fontSize:9}}>ATTEND</td>
                {ytdPlayers.map(n=>{
                  const p=ytd.find(x=>x.name===n);
                  return <td key={n} style={{padding:"4px 5px",textAlign:"right",color:"#93c5fd",fontWeight:700}}>{p?p.attend:0}</td>;
                })}
                <td/><td/>
              </tr>
              {/* YTD Winning row */}
              <tr style={{background:"#0d2818"}}>
                <td style={{padding:"4px 6px",color:"#4ade80",fontWeight:700,position:"sticky",left:0,background:"#0d2818",fontSize:9}}>YTD WIN</td>
                {ytdPlayers.map(n=>{
                  const p=ytd.find(x=>x.name===n);
                  const v=p?p.grossWin:0;
                  return <td key={n} style={{padding:"4px 5px",textAlign:"right",fontWeight:700,color:"#4ade80"}}>{v>0?"+$"+f(v):"—"}</td>;
                })}
                <td/><td/>
              </tr>
              {/* YTD Losses row */}
              <tr style={{background:"#2d1a1a"}}>
                <td style={{padding:"4px 6px",color:"#f87171",fontWeight:700,position:"sticky",left:0,background:"#2d1a1a",fontSize:9}}>YTD LOSS</td>
                {ytdPlayers.map(n=>{
                  const p=ytd.find(x=>x.name===n);
                  const v=p?p.grossLoss:0;
                  return <td key={n} style={{padding:"4px 5px",textAlign:"right",fontWeight:700,color:"#f87171"}}>{v<0?"-$"+f(Math.abs(v)):"—"}</td>;
                })}
                <td/><td/>
              </tr>
              {/* YTD Net row */}
              <tr style={{background:"#1a1a2e",borderBottom:"2px solid #334155"}}>
                <td style={{padding:"5px 6px",color:"#e2e8f0",fontWeight:800,position:"sticky",left:0,background:"#1a1a2e",fontSize:9,letterSpacing:".04em"}}>YTD NET</td>
                {ytdPlayers.map(n=>{
                  const p=ytd.find(x=>x.name===n);
                  const v=p?p.net:0;
                  return(
                    <td key={n} style={{padding:"5px 5px",textAlign:"right",fontWeight:800,color:v>0?"#4ade80":v<0?"#f87171":"#94a3b8"}}>
                      {v===0?"—":fs(v)}
                    </td>
                  );
                })}
                <td style={{padding:"5px 5px",textAlign:"right",color:"#94a3b8"}}>{sessions.length}s</td>
                <td/>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sess,si)=>{
                const pMap={};
                let sessTO=0;
                (sess.players||[]).forEach(p=>{
                  const pRebate=p.rebate||0;
                  const pNet=(p.winnings||0)-(p.tax||0)+pRebate;
                  pMap[p.name]=pNet;
                  sessTO+=Math.abs(pNet);
                });
                // Turnover = sum of winners net (half of total pool movement)
                const winnerTO=(sess.players||[]).filter(p=>{
                  const pRebate=p.rebate||0;
                  return (p.winnings||0)-(p.tax||0)+pRebate>0;
                }).reduce((s,p)=>{
                  const pRebate=p.rebate||0;
                  return s+(p.winnings||0)-(p.tax||0)+pRebate;
                },0);
                const bg=si%2===0?"#fff":"#f8fafc";
                return(
                  <tr key={sess.date} style={{borderBottom:"0.5px solid #e2e8f0",background:bg}}>
                    <td style={{padding:"4px 6px",fontWeight:700,whiteSpace:"nowrap",position:"sticky",left:0,background:bg,color:"#1e293b"}}>{lbl(sess.date)}</td>
                    {ytdPlayers.map(n=>{
                      const v=pMap[n];
                      return(
                        <td key={n} style={{padding:"4px 5px",textAlign:"right",fontWeight:600,
                          color:v===undefined?"transparent":v>0?"#1a7a3e":v<0?"#a32d2d":"#64748b",
                          background:v===undefined?"transparent":v>0?"#d4f7e0":v<0?"#fde8e8":"transparent"}}>
                          {v===undefined?"":v===0?"—":fs(v)}
                        </td>
                      );
                    })}
                    <td style={{padding:"4px 5px",textAlign:"right",color:"#64748b"}}>{(sess.players||[]).length}</td>
                    <td style={{padding:"4px 5px",textAlign:"right",color:"#3b82f6",fontWeight:600}}>${f(winnerTO*2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}

// ── HISTORY ───────────────────────────────────────────────────────
function Hist({history,onClose}){
  const[sel,setSel]=useState(null);
  const[search,setSearch]=useState("");
  const[sortH,setSortH]=useState("date-desc"); // date-desc | date-asc | kitty-desc | kitty-asc | players-desc
  const[filterMonth,setFilterMonth]=useState("all");

  const months=useMemo(()=>{
    const s=new Set(history.map(h=>h.date.slice(0,7)));
    return[...s].sort((a,b)=>b.localeCompare(a));
  },[history]);

  const filtered=useMemo(()=>{
    let list=[...history];
    if(filterMonth!=="all") list=list.filter(s=>s.date.startsWith(filterMonth));
    if(search.trim()) list=list.filter(s=>
      lbl(s.date).toLowerCase().includes(search.toLowerCase())||
      (s.players||[]).some(p=>p.name.toLowerCase().includes(search.toLowerCase()))
    );
    list.sort((a,b)=>{
      if(sortH==="date-desc") return b.date.localeCompare(a.date);
      if(sortH==="date-asc")  return a.date.localeCompare(b.date);
      if(sortH==="kitty-desc") return (b.kittyEnd||0)-(a.kittyEnd||0);
      if(sortH==="kitty-asc")  return (a.kittyEnd||0)-(b.kittyEnd||0);
      if(sortH==="players-desc") return (b.players||[]).length-(a.players||[]).length;
      return 0;
    });
    return list;
  },[history,filterMonth,search,sortH]);

  const h=sel?history.find(x=>x.date===sel):null;
  const totEx=h?(h.extras||[]).reduce((s,e)=>s+Number(e.amount||0),0):0;
  const selBtn=(val,cur,set,label)=>(
    <button onClick={()=>set(val)} style={{fontSize:10,padding:"3px 8px",borderRadius:6,border:"none",fontWeight:cur===val?700:400,background:cur===val?"#185fa5":"#e2e8f0",color:cur===val?"#fff":"#64748b",cursor:"pointer",whiteSpace:"nowrap"}}>{label}</button>
  );

  return(
    <div style={{...card,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:15,fontWeight:700}}>{h?lbl(h.date):"History"}</span>
        <button onClick={()=>h?setSel(null):onClose()} style={{fontSize:13,padding:"3px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)",cursor:"pointer"}}>
          {h?"← Back":"Close"}
        </button>
      </div>

      {!h&&<>
        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search date or player..." style={{width:"100%",fontSize:12,padding:"6px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#1e293b",marginBottom:8,boxSizing:"border-box"}}/>
        {/* Month filter */}
        <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4,marginBottom:6}}>
          {selBtn("all",filterMonth,setFilterMonth,"All")}
          {months.map(m=>{const[y,mo]=m.split("-");return selBtn(m,filterMonth,setFilterMonth,MON[+mo-1]+" "+y.slice(2));})}
        </div>
        {/* Sort */}
        <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:"#94a3b8",alignSelf:"center"}}>Sort:</span>
          {selBtn("date-desc",sortH,setSortH,"Date ↓")}
          {selBtn("date-asc",sortH,setSortH,"Date ↑")}
        </div>
        <div style={{fontSize:11,color:"#94a3b8",marginBottom:8}}>{filtered.length} session{filtered.length!==1?"s":""}</div>
        {filtered.length===0
          ?<p style={{textAlign:"center",color:"var(--color-text-secondary)"}}>No sessions found.</p>
          :filtered.map(s=><div key={s.date} onClick={()=>setSel(s.date)} style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",background:"var(--color-background-secondary)",borderRadius:10,marginBottom:7,cursor:"pointer"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>{lbl(s.date)}</div>
              {(()=>{
                const netContrib=(s.totTax||0)-(s.rebate||0)-((s.extras||[]).filter(e=>!(e.label||"").toLowerCase().includes("rebate")).reduce((sum,e)=>sum+Number(e.amount||0),0));
                return <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{(s.players||[]).length} players · <span style={{color:netContrib>=0?"#1a7a3e":"#a32d2d",fontWeight:600}}>{netContrib>=0?"+":"-"}${f(Math.abs(netContrib))} to kitty</span> · ${f(s.kittyEnd)}</div>;
              })()}
            </div>
            <span style={{color:"var(--color-text-tertiary)"}}>›</span>
          </div>)
        }
      </>}

      {h&&<>
        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginBottom:6}}>RESULTS</div>
        <div style={{overflowX:"auto",marginBottom:10}}>
          <table style={{borderCollapse:"collapse",width:"100%",fontSize:11}}>
            <thead><tr style={{background:"var(--color-background-secondary)"}}>
              {["Player","Buys","Final","W/L","Tax","Rebate","Net"].map(c=><th key={c} style={{padding:"5px 6px",textAlign:c==="Player"?"left":"right",fontSize:10,color:"var(--color-text-secondary)",fontWeight:700}}>{c}</th>)}
            </tr></thead>
            <tbody>{(h.players||[]).map(p=>{
              const pRebate=p.rebate||0;
              const pNet=(p.winnings||0)-(p.tax||0)+pRebate;
              return(
                <tr key={p.name} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                  <td style={{padding:"5px 6px",fontWeight:700}}>{p.name}</td>
                  <td style={{padding:"5px 6px",textAlign:"right"}}>{p.rebuys}x</td>
                  <td style={{padding:"5px 6px",textAlign:"right"}}>{f(p.finalChips)}</td>
                  <td style={{padding:"5px 6px",textAlign:"right",color:(p.winnings||0)>0?"#1a7a3e":(p.winnings||0)<0?"#a32d2d":"inherit",fontWeight:600}}>{(p.winnings||0)>0?"+":""}{f(p.winnings||0)}</td>
                  <td style={{padding:"5px 6px",textAlign:"right",color:"#ba7517"}}>{(p.tax||0)>0?f(p.tax):""}</td>
                  <td style={{padding:"5px 6px",textAlign:"right",color:"#7c3aed"}}>{pRebate>0?"+$"+f(pRebate):""}</td>
                  <td style={{padding:"5px 6px",textAlign:"right",fontWeight:700,color:pNet>0?"#1a7a3e":pNet<0?"#a32d2d":"inherit"}}>{pNet>0?"+":""}{f(pNet)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>

        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginBottom:6}}>SETTLEMENT</div>
        {(h.settlement||[]).map((t,i)=><div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:"var(--color-background-secondary)",borderRadius:8,marginBottom:5}}>
          <span style={{fontWeight:700,color:"#a32d2d"}}>{t.from}</span>
          <span style={{color:"var(--color-text-secondary)",flex:1}}>→ {t.to}</span>
          <span style={{fontWeight:700,color:"#1a7a3e"}}>${f(t.amount)}</span>
        </div>)}

        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginTop:10,marginBottom:6}}>KITTY MOVEMENT</div>
        {(()=>{
          const expenses=(h.extras||[]).filter(e=>!(e.label||"").toLowerCase().includes("rebate"));
          const totExpenses=expenses.reduce((s,e)=>s+Number(e.amount||0),0);
          const netContrib=(h.totTax||0)-(h.rebate||0)-totExpenses;
          return(
            <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 12px",border:"1px solid #e2e8f0",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,color:"#64748b"}}>Previous kitty</span>
                <span style={{fontSize:12,fontWeight:600}}>${f(h.prevKitty||0)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,color:"#64748b"}}>Tax collected</span>
                <span style={{fontSize:12,fontWeight:600,color:"#1a7a3e"}}>+${f(h.totTax||0)}</span>
              </div>
              {(h.rebate||0)>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,color:"#64748b"}}>Rebate</span>
                <span style={{fontSize:12,fontWeight:600,color:"#a32d2d"}}>-${f(h.rebate)}</span>
              </div>}
              {expenses.map((e,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:"#64748b"}}>{e.label}</span>
                  <span style={{fontSize:12,fontWeight:600,color:"#a32d2d"}}>-${f(e.amount)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:netContrib>=0?"#d4f7e0":"#fde8e8",borderRadius:8,padding:"8px 10px",marginTop:8}}>
                <span style={{fontSize:12,fontWeight:700,color:netContrib>=0?"#1a7a3e":"#a32d2d"}}>Net to kitty</span>
                <span style={{fontSize:15,fontWeight:800,color:netContrib>=0?"#1a7a3e":"#a32d2d"}}>{netContrib>=0?"+":"-"}${f(Math.abs(netContrib))}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:"#1a1a2e",borderRadius:8,marginTop:6}}>
                <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>Closing kitty</span>
                <span style={{fontSize:16,fontWeight:800,color:"#4ade80"}}>${f(h.kittyEnd)}</span>
              </div>
            </div>
          );
        })()}
      </>}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────
// Unique device ID so we don't echo our own writes back
const _deviceId=Math.random().toString(36).slice(2);

export default function App(){
  const td=new Date().toISOString().split("T")[0];
  const[date,setDate]=useState(td);
  const[players,setPlayers]=useState(()=>NAMES.map(n=>({name:n,inSession:false,rebuys:0,finalChips:""})));
  const[history,setHistory]=useState([]);
  const[view,setView]=useState("game"); // game | hist | board | ytd
  const[playerTab,setPlayerTab]=useState("players"); // players | session
  const[landscape,setLandscape]=useState(false);
  const[showSum,setShowSum]=useState(false);
  const[extras,setExtras]=useState([]);
  const[newLabel,setNewLabel]=useState("");
  const[newAmt,setNewAmt]=useState("");
  const[newName,setNewName]=useState("");
  const[confirmNew,setConfirmNew]=useState(false);
  const[saving,setSaving]=useState(false);
  const[loading,setLoading]=useState(true);

  // ── Live history listener ─────────────────────────────────────────
  useEffect(()=>{
    const unsub=onSnapshot(collection(db,"sessions"),(snap)=>{
      const data=snap.docs.map(d=>d.data()).sort((a,b)=>a.date.localeCompare(b.date));
      setHistory(data);
      setLoading(false);
    },(err)=>{console.error("Firestore:",err);setLoading(false);});
    return()=>unsub();
  },[]);

  // ── Live game state sync ──────────────────────────────────────────
  // Writes current game state to Firestore "live/current" doc on every change
  // All devices read from it in real time
  const liveRef=doc(db,"live","current");

  useEffect(()=>{
    const unsub=onSnapshot(liveRef,(snap)=>{
      if(!snap.exists())return;
      const d=snap.data();
      // Only apply if from another device (avoid overwriting local edits)
      if(d._source===_deviceId)return;
      setDate(d.date||new Date().toISOString().split("T")[0]);
      setPlayers(d.players||NAMES.map(n=>({name:n,inSession:false,rebuys:0,finalChips:""})));
      setExtras(d.extras||[]);
    });
    return()=>unsub();
  },[]);

  // Debounce live writes — push state to Firestore 800ms after last change
  useEffect(()=>{
    const t=setTimeout(()=>{
      setDoc(liveRef,{
        date,
        players,
        extras,
        _source:_deviceId,
        _ts:Date.now()
      }).catch(()=>{});
    },800);
    return()=>clearTimeout(t);
  },[date,players,extras]);

  const prevK=useMemo(()=>{
    const past=history.filter(h=>h.date<date).sort((a,b)=>b.date.localeCompare(a.date));
    return past.length?past[0].kittyEnd:2948;
  },[history,date]);

  const sess=players.filter(p=>p.inSession);
  const tog=n=>setPlayers(ps=>ps.map(p=>p.name===n?{...p,inSession:!p.inSession,rebuys:p.inSession?0:1}:p));
  const chgR=(n,d)=>setPlayers(ps=>ps.map(p=>p.name===n?{...p,rebuys:Math.max(1,p.rebuys+d)}:p));
  const setF=(n,v)=>setPlayers(ps=>ps.map(p=>p.name===n?{...p,finalChips:v}:p));
  const addG=()=>{const n=newName.trim().toUpperCase();if(!n||players.find(p=>p.name===n))return;setPlayers(ps=>[...ps,{name:n,inSession:true,rebuys:1,finalChips:""}]);setNewName("");};

  const comp=useMemo(()=>sess.map(p=>{
    const buyIn=p.rebuys*BUY_IN,chips=Number(p.finalChips)||0,winnings=Math.round((chips-buyIn)/2),tax=winnings>0?Math.round(winnings*TAX):0;
    return{...p,buyIn,chips,winnings,tax,net:winnings-tax};
  }),[sess]);

  const totW=comp.reduce((s,p)=>s+(p.winnings>0?p.winnings:0),0);
  const totL=comp.reduce((s,p)=>s+(p.winnings<0?p.winnings:0),0);
  const totTax=comp.reduce((s,p)=>s+p.tax,0);
  const tally=sess.length>0&&totW+totL===0;
  const totEx=extras.reduce((s,e)=>s+Number(e.amount||0),0);
  const topL=comp.length?comp.reduce((a,b)=>a.winnings<b.winnings?a:b):null;
  const rebate=topL&&topL.winnings<0?Math.round(Math.abs(topL.winnings)*.1):0;
  const curK=prevK+totTax-totEx-rebate;
  const stl=useMemo(()=>mkSettle(comp),[comp]);

  const save=async()=>{
    setSaving(true);
    const entry={date,kittyEnd:curK,rebate,topLoser:topL?.name||null,
      players:comp.map(p=>({name:p.name,rebuys:p.rebuys,finalChips:p.chips,winnings:p.winnings,tax:p.tax,
        rebate:p.name===topL?.name?rebate:0,
        net:p.name===topL?.name?(p.winnings-p.tax+rebate):(p.winnings-p.tax)
      })),
      settlement:stl,extras:extras.map(e=>({...e})),totTax,prevKitty:prevK};
    try{await setDoc(doc(db,"sessions",date),entry);}
    catch(e){alert("Save failed: "+e.message);}
    setSaving(false);
    setShowSum(true);
  };

  const newSess=()=>{
    const freshPlayers=NAMES.map(n=>({name:n,inSession:false,rebuys:0,finalChips:""}));
    const nextDate=new Date();nextDate.setDate(nextDate.getDate()+1);
    const nd=nextDate.toISOString().split("T")[0];
    setPlayers(freshPlayers);
    setExtras([]);setConfirmNew(false);setShowSum(false);
    setDate(nd);
    // Push cleared state to live doc immediately
    setDoc(doc(db,"live","current"),{date:nd,players:freshPlayers,extras:[],_source:_deviceId,_ts:Date.now()}).catch(()=>{});
  };

  const navBtn=(v,label)=>(
    <button onClick={()=>setView(v)} style={{flex:1,fontSize:11,padding:"5px 4px",borderRadius:8,border:"none",
      fontWeight:view===v?700:400,background:view===v?"#185fa5":"transparent",
      color:view===v?"#fff":"#94a3b8",cursor:"pointer"}}>{label}</button>
  );

  return(
    <div style={{padding:10,fontFamily:"system-ui,sans-serif",background:"#f1f5f9",minHeight:"100vh",maxWidth:520,margin:"0 auto"}}>

      {/* Header */}
      <div style={{background:"#1a1a2e",borderRadius:14,padding:"10px 14px",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{fontSize:22}}>♠</span>
          <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:"#fff"}}>RiverRat MPS</div><Cal date={date} setDate={setDate}/></div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"#94a3b8"}}>playing</div>
            <div style={{fontSize:20,fontWeight:800,color:"#4ade80"}}>{sess.length}</div>
            <div style={{fontSize:8,color:"#4ade80",opacity:0.7}}>● LIVE</div>
          </div>
        </div>
        {/* Nav tabs */}
        <div style={{display:"flex",background:"rgba(255,255,255,.08)",borderRadius:10,padding:3,gap:2}}>
          {navBtn("game","🃏 Game")}
          {navBtn("hist","📋 History")}
          {navBtn("board","🏆 Board")}
          {navBtn("ytd","📊 YTD")}
        </div>
      </div>

      {loading&&<div style={{textAlign:"center",padding:20,color:"#64748b"}}>Loading...</div>}

      {/* Summary always visible on game tab */}
      {view==="game"&&showSum&&<Summary date={date} comp={comp} stl={stl} totTax={totTax} extras={extras} prevK={prevK} curK={curK} rebate={rebate} topL={topL} onClose={()=>setShowSum(false)}/>}

      {view==="hist"&&<Hist history={history} onClose={()=>setView("game")}/>}
      {view==="board"&&<Leaderboard history={history} onClose={()=>setView("game")}/>}
      {view==="ytd"&&<YTD history={history} onClose={()=>setView("game")}/>}

      {view==="game"&&<>
        {/* Players */}
        <div style={card}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:15,fontWeight:700}}>🃏 Players</span>
            <div style={{display:"flex",background:"#e2e8f0",borderRadius:8,padding:2,gap:1}}>
              {[["players","All"],["session","Session"]].map(([v,l])=>(
                <button key={v} onClick={()=>setPlayerTab(v)} style={{fontSize:12,padding:"4px 10px",borderRadius:6,fontWeight:playerTab===v?700:400,background:playerTab===v?"#fff":"transparent",border:"none",cursor:"pointer",color:playerTab===v?"#1e293b":"#64748b"}}>{l}{v==="session"&&sess.length>0?` (${sess.length})`:""}</button>
              ))}
            </div>
          </div>

          {/* ALL PLAYERS TAB — In/Out tiles */}
          {playerTab==="players"&&<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:8}}>
              {players.map(p=><button key={p.name} onClick={()=>tog(p.name)} style={{padding:"8px 4px",borderRadius:10,border:p.inSession?"2px solid #4ade80":"1px solid #cbd5e1",background:p.inSession?"#d4f7e0":"#fff",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:p.inSession?"#185fa5":"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:p.inSession?"#fff":"#94a3b8"}}>{p.name}</div>
                <div style={{fontSize:11,fontWeight:600,color:p.inSession?"#1a7a3e":"#94a3b8"}}>{p.inSession?"In":"Out"}</div>
              </button>)}
            </div>
            <div style={{display:"flex",gap:6}}>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Add guest (e.g. RN)" onKeyDown={e=>e.key==="Enter"&&addG()} style={{fontSize:13,padding:"6px 10px",flex:1,borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",color:"#1e293b"}}/>
              <button onClick={addG} style={{fontSize:13,padding:"6px 12px",borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700}}>+ Add</button>
            </div>
          </>}

          {/* SESSION TAB — detailed rows */}
          {playerTab==="session"&&<>
            {sess.length>0&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:6}}>
              <button onClick={()=>setLandscape(l=>!l)} style={{fontSize:10,padding:'3px 9px',borderRadius:6,border:'none',background:'#e2e8f0',color:'#475569',cursor:'pointer',fontWeight:600}}>{landscape?'📱 Portrait':'🖥️ Landscape'}</button>
            </div>}
            {sess.length===0
              ?<div style={{textAlign:"center",padding:"16px 0",color:"#94a3b8",fontSize:13}}>No players in session yet.<br/><span style={{fontSize:12}}>Go to "All" tab to add players</span></div>
              :<>
                {landscape
                  /* ── LANDSCAPE TABLE ── */
                  ?<div style={{overflowX:'auto'}}>
                    <table style={{borderCollapse:'collapse',width:'100%',fontSize:12}}>
                      <thead><tr style={{background:'#1a1a2e'}}>
                        <th style={{padding:'6px 8px',textAlign:'left',color:'#94a3b8',fontWeight:700,fontSize:10}}>Player</th>
                        <th style={{padding:'6px 8px',textAlign:'center',color:'#94a3b8',fontWeight:700,fontSize:10}}>Rebuys</th>
                        <th style={{padding:'6px 8px',textAlign:'right',color:'#94a3b8',fontWeight:700,fontSize:10}}>Buy-in</th>
                        <th style={{padding:'6px 8px',textAlign:'right',color:'#94a3b8',fontWeight:700,fontSize:10}}>Final Chips</th>
                        <th style={{padding:'6px 8px',textAlign:'right',color:'#4ade80',fontWeight:700,fontSize:10}}>Winnings</th>
                        <th style={{padding:'6px 8px',textAlign:'right',color:'#fbbf24',fontWeight:700,fontSize:10}}>Tax</th>
                        <th style={{padding:'6px 8px',textAlign:'right',color:'#94a3b8',fontWeight:700,fontSize:10}}>Net</th>
                        <th style={{padding:'6px 8px',textAlign:'center',color:'#94a3b8',fontWeight:700,fontSize:10}}></th>
                      </tr></thead>
                      <tbody>{sess.map((p,si)=>{
                        const c=comp.find(x=>x.name===p.name),w=c?.winnings??0,tx=c?.tax??0,isTop=topL?.name===p.name;
                        const pNet=w-tx+(isTop?rebate:0);
                        return(<tr key={p.name} style={{borderBottom:'0.5px solid #e2e8f0',background:isTop?'#fffbeb':si%2===0?'#fff':'#f8fafc'}}>
                          <td style={{padding:'6px 8px',fontWeight:700,color:'#185fa5'}}>{p.name}{isTop&&rebate>0?<span style={{fontSize:9,background:'#fef3c7',color:'#92400e',borderRadius:3,padding:'1px 4px',marginLeft:4,fontWeight:700}}>R</span>:null}</td>
                          <td style={{padding:'6px 8px',textAlign:'center'}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                              <button onClick={()=>chgR(p.name,-1)} style={{width:22,height:22,borderRadius:'50%',border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>−</button>
                              <span style={{fontWeight:800,minWidth:20,textAlign:'center'}}>{p.rebuys}</span>
                              <button onClick={()=>chgR(p.name,1)} style={{width:22,height:22,borderRadius:'50%',border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>
                            </div>
                          </td>
                          <td style={{padding:'6px 8px',textAlign:'right',fontWeight:600}}>${f(p.rebuys*BUY_IN)}</td>
                          <td style={{padding:'6px 8px',textAlign:'right'}}><input type='number' value={p.finalChips} onChange={e=>setF(p.name,e.target.value)} placeholder='0' style={{fontSize:12,fontWeight:700,width:80,border:'1px solid #e2e8f0',borderRadius:5,padding:'3px 5px',textAlign:'right',color:'#1e293b'}}/></td>
                          <td style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:w>0?'#1a7a3e':w<0?'#a32d2d':'#94a3b8'}}>{w===0?'—':(w>0?'+':'')+f(w)}</td>
                          <td style={{padding:'6px 8px',textAlign:'right',color:'#ba7517'}}>{tx>0?f(tx):''}</td>
                          <td style={{padding:'6px 8px',textAlign:'right',fontWeight:800,color:pNet>0?'#1a7a3e':pNet<0?'#a32d2d':'#94a3b8'}}>{pNet===0?'—':(pNet>0?'+':'')+f(pNet)}</td>
                          <td style={{padding:'6px 8px',textAlign:'center'}}><button onClick={()=>tog(p.name)} style={{fontSize:10,padding:'2px 6px',borderRadius:5,border:'1px solid #fca5a5',background:'#fef2f2',color:'#dc2626',cursor:'pointer'}}>✕</button></td>
                        </tr>);
                      })}</tbody>
                    </table>
                  </div>
                  /* ── PORTRAIT CARDS ── */
                  :<>{sess.map(p=>{
                  const c=comp.find(x=>x.name===p.name),w=c?.winnings??0,tx=c?.tax??0,isTop=topL?.name===p.name;
                  return(<div key={p.name} style={{marginBottom:6,borderRadius:10,border:isTop?"1.5px solid #fbbf24":"1px solid #e2e8f0",padding:"8px 10px",background:isTop?"#fffbeb":"#fff"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <button onClick={()=>tog(p.name)} style={{width:32,height:32,borderRadius:"50%",background:"#e8f4fd",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#185fa5",flexShrink:0,border:"none",cursor:"pointer"}}>{p.name}</button>
                      {isTop&&rebate>0&&<span style={{fontSize:9,background:"#fef3c7",color:"#92400e",borderRadius:4,padding:"1px 5px",fontWeight:700}}>REBATE +${f(rebate)}</span>}
                      <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:"auto"}}>
                        <button onClick={()=>chgR(p.name,-1)} style={{width:26,height:26,borderRadius:"50%",border:"1px solid #e2e8f0",background:"#f8fafc",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>−</button>
                        <div style={{textAlign:"center",minWidth:28}}><div style={{fontSize:15,fontWeight:800}}>{p.rebuys}</div><div style={{fontSize:9,color:"#94a3b8"}}>x$1k</div></div>
                        <button onClick={()=>chgR(p.name,1)} style={{width:26,height:26,borderRadius:"50%",border:"1px solid #e2e8f0",background:"#f8fafc",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>+</button>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,marginTop:7}}>
                      <div style={{flex:1,background:"#f8fafc",borderRadius:8,padding:"5px 8px"}}><div style={{fontSize:10,color:"#94a3b8"}}>Buy-in</div><div style={{fontSize:14,fontWeight:700}}>${f(p.rebuys*BUY_IN)}</div></div>
                      <div style={{flex:1,background:"#f8fafc",borderRadius:8,padding:"5px 8px"}}><div style={{fontSize:10,color:"#94a3b8"}}>Final chips</div><input type="number" value={p.finalChips} onChange={e=>setF(p.name,e.target.value)} placeholder="0" style={{fontSize:14,fontWeight:700,width:"100%",border:"none",background:"transparent",color:"#1e293b",padding:0}}/></div>
                      <div style={{flex:1,background:w>0?"#d4f7e0":w<0?"#fde8e8":"#f8fafc",borderRadius:8,padding:"5px 8px"}}><div style={{fontSize:10,color:"#94a3b8"}}>Winnings</div><div style={{fontSize:14,fontWeight:700,color:w>0?"#1a7a3e":w<0?"#a32d2d":"#94a3b8"}}>{w>0?"+":""}{f(w)}</div>{tx>0&&<div style={{fontSize:9,color:"#ba7517"}}>tax ${f(tx)}</div>}</div>
                    </div>
                  </div>);
                })}</>}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginTop:6}}>
                  {[{l:"Losses",v:"$"+f(totL),c:"#a32d2d"},{l:"Winnings",v:"$"+f(totW),c:"#1a7a3e"},{l:"Tally",v:tally?"OK":"Off",c:tally?"#1a7a3e":"#a32d2d"},{l:"Tax",v:"$"+f(totTax),c:"#ba7517"}].map(x=>(
                    <div key={x.l} style={{background:"#f8fafc",borderRadius:8,padding:"7px 8px",border:"1px solid #e2e8f0"}}><div style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>{x.l}</div><div style={{fontSize:13,fontWeight:700,color:x.c}}>{x.v}</div></div>
                  ))}
                </div>
              </>
            }
          </>}
        </div>

        {/* Settlement */}
        <div style={card}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>💸 Settlement</div>
          {stl.length===0?<div style={{textAlign:"center",padding:"10px 0",color:"#94a3b8",fontSize:14}}>{sess.length===0?"Add players above":"All balanced"}</div>:stl.map((t,i)=><SRow key={i} t={t}/>)}
        </div>

        {/* Kitty */}
        <div style={card}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>🏦 Kitty</div>
          {[{l:"Previous kitty",v:"$"+f(prevK)},{l:"Tax collected",v:"+$"+f(totTax),c:"#1a7a3e"},
            ...extras.map(e=>({l:e.label,v:"-$"+f(e.amount),c:"#a32d2d"})),
            {l:`Rebate (${topL?.name||"—"})`,v:rebate>0?"-$"+f(rebate):"—",c:rebate>0?"#a32d2d":"#94a3b8"}
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f8fafc",borderRadius:8,marginBottom:5,border:"1px solid #e2e8f0"}}>
              <span style={{fontSize:13,color:"#64748b"}}>{r.l}</span><span style={{fontSize:14,fontWeight:600,color:r.c||"#1e293b"}}>{r.v}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",background:"#1a1a2e",borderRadius:12,marginBottom:10}}>
            <span style={{fontSize:14,color:"#94a3b8",fontWeight:600}}>Current kitty</span><span style={{fontSize:20,fontWeight:800,color:"#4ade80"}}>${f(curK)}</span>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:7}}>EXPENSES</div>
          {extras.map(e=><div key={e.id} style={{display:"flex",alignItems:"center",gap:6,background:"#f8fafc",borderRadius:8,padding:"6px 10px",marginBottom:5,border:"1px solid #e2e8f0"}}>
            <input value={e.label} onChange={ev=>setExtras(es=>es.map(x=>x.id===e.id?{...x,label:ev.target.value}:x))} style={{fontSize:13,flex:1,border:"none",background:"transparent",color:"#1e293b"}}/>
            <span style={{fontSize:12,color:"#94a3b8"}}>$</span>
            <input type="number" value={e.amount} onChange={ev=>setExtras(es=>es.map(x=>x.id===e.id?{...x,amount:Number(ev.target.value)}:x))} style={{fontSize:13,width:65,textAlign:"right",border:"none",background:"transparent",color:"#1e293b",fontWeight:600}}/>
            <button onClick={()=>setExtras(es=>es.filter(x=>x.id!==e.id))} style={{fontSize:13,color:"#94a3b8",border:"none",background:"none",cursor:"pointer"}}>✕</button>
          </div>)}
          <div style={{display:"flex",gap:6}}>
            <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Expense item" style={{fontSize:13,padding:"5px 9px",flex:1,borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",color:"#1e293b"}}/>
            <input type="number" value={newAmt} onChange={e=>setNewAmt(e.target.value)} placeholder="$" style={{fontSize:13,padding:"5px 8px",width:60,borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",color:"#1e293b"}}/>
            <button onClick={()=>{if(!newLabel.trim())return;setExtras(es=>[...es,{id:Date.now(),label:newLabel.trim(),amount:Number(newAmt)||0}]);setNewLabel("");setNewAmt("");}} style={{fontSize:13,padding:"5px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700}}>+ Add</button>
          </div>
        </div>

        {/* Actions */}
        <div style={{display:"flex",gap:8,marginBottom:24}}>
          <button onClick={save} disabled={saving} style={{flex:1,fontSize:15,fontWeight:700,padding:13,borderRadius:12,border:"none",background:saving?"#94a3b8":"#1a7a3e",color:"#fff",cursor:"pointer"}}>{saving?"Saving...":"💾 Save + Summary"}</button>
          {confirmNew
            ?<div style={{display:"flex",gap:6}}>
              <button onClick={newSess} style={{fontSize:14,fontWeight:700,padding:"13px 12px",borderRadius:12,border:"none",background:"#dc2626",color:"#fff",cursor:"pointer"}}>Confirm</button>
              <button onClick={()=>setConfirmNew(false)} style={{fontSize:14,fontWeight:700,padding:"13px 12px",borderRadius:12,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer"}}>Cancel</button>
            </div>
            :<button onClick={()=>setConfirmNew(true)} style={{fontSize:15,fontWeight:700,padding:"13px 16px",borderRadius:12,border:"none",background:"#1e293b",color:"#94a3b8",cursor:"pointer"}}>🆕 New</button>
          }
        </div>
      </>}
    </div>
  );
}
