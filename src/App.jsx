import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection } from "firebase/firestore";

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

const BUY_IN=1000,TAX=0.2;
const NAMES=["IO","PN","CW","BT","AK","DS","PK","SC","YS","SY","DT","JN","KC","JW","DH","FC"];
const MON=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const f=n=>Math.round(n).toLocaleString();
const lbl=iso=>{if(!iso)return"";const[y,m,d]=iso.split("-");return d+"-"+MON[+m-1]+"-"+y.slice(2);};
const card={background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:14,padding:12,marginBottom:12};

function mkSettle(comp,topName,rebate){
  const adj=comp.map(p=>p.name===topName?{...p,net:p.net+rebate}:p);
  const pay=adj.filter(p=>p.net<0).map(p=>({name:p.name,amt:-p.net})).sort((a,b)=>b.amt-a.amt);
  const rec=adj.filter(p=>p.net>0).map(p=>({name:p.name,amt:p.net})).sort((a,b)=>b.amt-a.amt);
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

function SRow({t,comp}){
  const[done,setDone]=useState(false);
  const winner=comp.find(p=>p.name===t.to);
  const tax=winner?.tax||0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,border:"0.5px solid var(--color-border-tertiary)",opacity:done?.4:1,marginBottom:6,background:done?"var(--color-background-secondary)":"var(--color-background-primary)"}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:"#fde8e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#a32d2d",flexShrink:0}}>{t.from}</div>
      <div style={{flex:1}}><div style={{fontSize:11,color:"var(--color-text-secondary)"}}>pays</div><div style={{fontSize:14,fontWeight:700}}>{t.to}</div></div>
      <div style={{textAlign:"right",marginRight:4}}>
        <div style={{fontSize:16,fontWeight:800,color:"#1a7a3e"}}>${f(t.amount)}</div>
      </div>
      {tax>0&&<div style={{textAlign:"right",background:"#fef9ec",borderRadius:7,padding:"3px 8px",minWidth:60}}>
        <div style={{fontSize:9,color:"#ba7517",fontWeight:700}}>tax→SY</div>
        <div style={{fontSize:13,fontWeight:800,color:"#ba7517"}}>${f(tax)}</div>
      </div>}
      <label style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",fontSize:10,color:"var(--color-text-secondary)",gap:1}}>
        <input type="checkbox" checked={done} onChange={()=>setDone(d=>!d)} style={{width:17,height:17}}/>done
      </label>
    </div>
  );
}

function Summary({date,comp,stl,totTax,rebate,topL,extras,prevK,curK,onClose}){
  const pool=comp.reduce((s,p)=>s+p.buyIn,0);
  return(
    <div style={{background:"#0f172a",borderRadius:16,marginBottom:12,border:"1px solid #1e293b",overflow:"hidden"}}>
      <div style={{background:"#1a1a2e",padding:"14px 16px",borderBottom:"1px solid #1e293b"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontSize:10,color:"#64748b",fontWeight:700,letterSpacing:".1em"}}>MPS POKER NIGHT</div>
            <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>♠ {lbl(date)}</div>
            <div style={{fontSize:12,color:"#4ade80"}}>{comp.length} players · ${f(pool)} pool</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",border:"none",color:"#94a3b8",fontSize:13,padding:"4px 9px",borderRadius:7,cursor:"pointer"}}>✕</button>
        </div>
      </div>
      <div style={{padding:"12px 16px"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginBottom:8}}>RESULTS</div>
        {[...comp].sort((a,b)=>b.winnings-a.winnings).map(p=>{
          const isTop=topL?.name===p.name;
          return(
            <div key={p.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,
                background:p.winnings>0?"#14532d":p.winnings<0?isTop?"#450a0a":"#2d1a1a":"#1e293b",
                color:p.winnings>0?"#4ade80":p.winnings<0?"#f87171":"#64748b"}}>{p.name}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#94a3b8"}}>{p.rebuys}x · {f(p.chips)} chips</div>
                {isTop&&<div style={{fontSize:10,color:"#fca5a5",fontWeight:700}}>TOP LOSER · rebate ${f(rebate)}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:14,fontWeight:800,color:p.winnings>0?"#4ade80":p.winnings<0?"#f87171":"#64748b"}}>{p.winnings===0?"—":(p.winnings>0?"+$":"−$")+f(Math.abs(p.winnings))}</div>
                {p.tax>0&&<div style={{fontSize:9,color:"#86efac"}}>tax ${f(p.tax)}</div>}
              </div>
            </div>
          );
        })}
        <div style={{height:1,background:"#1e293b",margin:"10px 0"}}/>
        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginBottom:8}}>SETTLEMENT</div>
        {stl.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:13,fontWeight:700,color:"#f87171",minWidth:28}}>{t.from}</span>
          <span style={{fontSize:11,color:"#475569"}}>→</span>
          <span style={{fontSize:13,fontWeight:700,color:"#4ade80",flex:1}}>{t.to}</span>
          <span style={{fontSize:14,fontWeight:800,color:"#e2e8f0"}}>${f(t.amount)}</span>
        </div>)}
        <div style={{height:1,background:"#1e293b",margin:"10px 0"}}/>
        <div style={{fontSize:10,fontWeight:700,color:"#475569",letterSpacing:".08em",marginBottom:8}}>KITTY</div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>Tax</span><span style={{fontSize:13,fontWeight:600,color:"#4ade80"}}>+${f(totTax)}</span></div>
        {extras.map((e,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>{e.label}</span><span style={{fontSize:13,fontWeight:600,color:"#f87171"}}>-${f(e.amount)}</span></div>)}
        {rebate>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>Rebate ({topL?.name})</span><span style={{fontSize:13,fontWeight:600,color:"#f87171"}}>-${f(rebate)}</span></div>}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,color:"#64748b"}}>Previous</span><span style={{fontSize:13,color:"#94a3b8",fontWeight:600}}>${f(prevK)}</span></div>
        <div style={{background:"#0d2818",borderRadius:10,padding:"10px 14px",marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:"#4ade80",fontWeight:600}}>Current Kitty</span>
          <span style={{fontSize:20,fontWeight:800,color:"#4ade80"}}>${f(curK)}</span>
        </div>
        <div style={{textAlign:"center",marginTop:10,fontSize:11,color:"#334155"}}>Screenshot & share to MPS 🃏</div>
      </div>
    </div>
  );
}

function Hist({history,onClose}){
  const[sel,setSel]=useState(null);
  const h=sel?history.find(x=>x.date===sel):null;
  const sorted=[...history].sort((a,b)=>b.date.localeCompare(a.date));
  return(
    <div style={{...card,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:15,fontWeight:700}}>{h?lbl(h.date):"History"}</span>
        <button onClick={()=>h?setSel(null):onClose()} style={{fontSize:13,padding:"3px 10px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)",cursor:"pointer"}}>
          {h?"← Back":"Close"}
        </button>
      </div>
      {!h&&(sorted.length===0?<p style={{textAlign:"center",color:"var(--color-text-secondary)"}}>No sessions yet.</p>:
        sorted.map(s=><div key={s.date} onClick={()=>setSel(s.date)} style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",background:"var(--color-background-secondary)",borderRadius:10,marginBottom:7,cursor:"pointer"}}>
          <div><div style={{fontSize:14,fontWeight:700}}>{lbl(s.date)}</div><div style={{fontSize:12,color:"var(--color-text-secondary)"}}>{(s.players||[]).length} players · ${f(s.kittyEnd)}</div></div>
          <span style={{color:"var(--color-text-tertiary)"}}>›</span>
        </div>)
      )}
      {h&&<>
        <div style={{overflowX:"auto",marginBottom:10}}>
          <table style={{borderCollapse:"collapse",width:"100%",fontSize:12}}>
            <thead><tr style={{background:"var(--color-background-secondary)"}}>
              {["Player","Buys","Final","W/L","Tax","Net"].map(c=><th key={c} style={{padding:"5px 7px",textAlign:c==="Player"?"left":"right",fontSize:11,color:"var(--color-text-secondary)",fontWeight:700}}>{c}</th>)}
            </tr></thead>
            <tbody>{(h.players||[]).map(p=><tr key={p.name} style={{borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <td style={{padding:"5px 7px",fontWeight:700}}>{p.name}</td>
              <td style={{padding:"5px 7px",textAlign:"right"}}>{p.rebuys}x</td>
              <td style={{padding:"5px 7px",textAlign:"right"}}>{f(p.finalChips)}</td>
              <td style={{padding:"5px 7px",textAlign:"right",color:p.winnings>0?"#1a7a3e":p.winnings<0?"#a32d2d":"inherit",fontWeight:600}}>{p.winnings>0?"+":""}{f(p.winnings)}</td>
              <td style={{padding:"5px 7px",textAlign:"right",color:"#ba7517"}}>{p.tax>0?f(p.tax):""}</td>
              <td style={{padding:"5px 7px",textAlign:"right",fontWeight:600,color:p.net>0?"#1a7a3e":p.net<0?"#a32d2d":"inherit"}}>{p.net>0?"+":""}{f(p.net)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {(h.settlement||[]).map((t,i)=><div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:"var(--color-background-secondary)",borderRadius:8,marginBottom:5}}>
          <span style={{fontWeight:700,color:"#a32d2d"}}>{t.from}</span><span style={{color:"var(--color-text-secondary)",flex:1}}>to {t.to}</span><span style={{fontWeight:700,color:"#1a7a3e"}}>${f(t.amount)}</span>
        </div>)}
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:"#1a1a2e",borderRadius:10,marginTop:8}}>
          <span style={{fontSize:13,color:"#94a3b8",fontWeight:600}}>Closing kitty</span>
          <span style={{fontSize:18,fontWeight:800,color:"#4ade80"}}>${f(h.kittyEnd)}</span>
        </div>
      </>}
    </div>
  );
}

export default function App(){
  const td=new Date().toISOString().split("T")[0];
  const[date,setDate]=useState(td);
  const[players,setPlayers]=useState(()=>NAMES.map(n=>({name:n,inSession:false,rebuys:0,finalChips:""})));
  const[showAll,setShowAll]=useState(false);
  const[history,setHistory]=useState([]);
  const[showHist,setShowHist]=useState(false);
  const[showSum,setShowSum]=useState(false);
  const[extras,setExtras]=useState([]);
  const[newLabel,setNewLabel]=useState("");
  const[newAmt,setNewAmt]=useState("");
  const[newName,setNewName]=useState("");
  const[confirmNew,setConfirmNew]=useState(false);
  const[saving,setSaving]=useState(false);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    getDocs(collection(db,"sessions")).then(snap=>{
      const data=snap.docs.map(d=>d.data()).sort((a,b)=>a.date.localeCompare(b.date));
      setHistory(data);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

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
  const stl=useMemo(()=>mkSettle(comp,topL?.name,rebate),[comp,topL,rebate]);

  const save=async()=>{
    setSaving(true);
    const entry={date,kittyEnd:curK,players:comp.map(p=>({name:p.name,rebuys:p.rebuys,finalChips:p.chips,winnings:p.winnings,tax:p.tax,net:p.net})),settlement:stl,extras:extras.map(e=>({...e})),totTax,rebate,prevKitty:prevK};
    try{
      await setDoc(doc(db,"sessions",date),entry);
      const updated=[...history.filter(x=>x.date!==date),entry].sort((a,b)=>a.date.localeCompare(b.date));
      setHistory(updated);
    }catch(e){alert("Save failed: "+e.message);}
    setSaving(false);
    setShowSum(true);
  };

  const newSess=()=>{
    setPlayers(ps=>ps.filter(p=>NAMES.includes(p.name)).map(p=>({...p,inSession:false,rebuys:0,finalChips:""})));
    setExtras([]);setConfirmNew(false);setShowSum(false);
    const t=new Date();t.setDate(t.getDate()+1);
    setDate(t.toISOString().split("T")[0]);setShowAll(false);
  };

  return(
    <div style={{padding:10,fontFamily:"system-ui,sans-serif",background:"#f1f5f9",minHeight:"100vh",maxWidth:520,margin:"0 auto"}}>

      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,background:"#1a1a2e",borderRadius:14,padding:"10px 14px"}}>
        <span style={{fontSize:22}}>♠</span>
        <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Hold'em Tracker</div><Cal date={date} setDate={setDate}/></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#94a3b8"}}>playing</div><div style={{fontSize:20,fontWeight:800,color:"#4ade80"}}>{sess.length}</div></div>
        <button onClick={()=>setShowHist(s=>!s)} style={{fontSize:12,padding:"5px 10px",borderRadius:8,border:"none",background:"rgba(255,255,255,.1)",color:"#94a3b8",cursor:"pointer"}}>{showHist?"Hide":"History"}</button>
      </div>

      {loading&&<div style={{textAlign:"center",padding:20,color:"#64748b"}}>Loading history...</div>}
      {showHist&&<Hist history={history} onClose={()=>setShowHist(false)}/>}
      {showSum&&<Summary date={date} comp={comp} stl={stl} totTax={totTax} rebate={rebate} topL={topL} extras={extras} prevK={prevK} curK={curK} onClose={()=>setShowSum(false)}/>}

      <div style={card}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:15,fontWeight:700}}>🃏 Players</span>
          <div style={{display:"flex",background:"#e2e8f0",borderRadius:8,padding:2,gap:1}}>
            {[["Session",false],["All",true]].map(([l,v])=><button key={l} onClick={()=>setShowAll(v)} style={{fontSize:12,padding:"4px 10px",borderRadius:6,fontWeight:showAll===v?700:400,background:showAll===v?"#fff":"transparent",border:"none",cursor:"pointer"}}>{l}</button>)}
          </div>
        </div>

        {showAll&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
          {players.map(p=><button key={p.name} onClick={()=>tog(p.name)} style={{padding:"8px 4px",borderRadius:10,border:p.inSession?"2px solid #4ade80":"1px solid #cbd5e1",background:p.inSession?"#d4f7e0":"#fff",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{width:34,height:34,borderRadius:"50%",background:p.inSession?"#185fa5":"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:p.inSession?"#fff":"#94a3b8"}}>{p.name}</div>
            <div style={{fontSize:11,fontWeight:600,color:p.inSession?"#1a7a3e":"#94a3b8"}}>{p.inSession?"In":"Out"}</div>
          </button>)}
        </div>}

        {sess.length===0&&<div style={{textAlign:"center",padding:"12px 0",color:"#94a3b8",fontSize:14}}>Tap "All" to add players</div>}

        {sess.map(p=>{
          const c=comp.find(x=>x.name===p.name),w=c?.winnings??0,tx=c?.tax??0,isTop=topL?.name===p.name;
          return(<div key={p.name} style={{marginBottom:6,borderRadius:10,border:isTop?"1.5px solid #fca5a5":"1px solid #e2e8f0",padding:"8px 10px",background:isTop?"#fff8f0":"#fff"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"#e8f4fd",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#185fa5",flexShrink:0}}>{p.name}</div>
              {isTop&&<span style={{fontSize:9,background:"#fde8e8",color:"#a32d2d",borderRadius:4,padding:"1px 5px",fontWeight:700}}>TOP LOSER</span>}
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
        })}

        <div style={{display:"flex",gap:6,marginTop:8}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Add guest (e.g. FC)" onKeyDown={e=>e.key==="Enter"&&addG()} style={{fontSize:14,padding:"6px 10px",flex:1,borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",color:"#1e293b"}}/>
          <button onClick={addG} style={{fontSize:14,padding:"6px 12px",borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700}}>+ Add</button>
        </div>

        {sess.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginTop:10}}>
          {[{l:"Losses",v:"$"+f(totL),c:"#a32d2d"},{l:"Winnings",v:"$"+f(totW),c:"#1a7a3e"},{l:"Tally",v:tally?"OK":"Off",c:tally?"#1a7a3e":"#a32d2d"},{l:"Tax",v:"$"+f(totTax),c:"#ba7517"}].map(x=>(
            <div key={x.l} style={{background:"#f8fafc",borderRadius:8,padding:"7px 8px",border:"1px solid #e2e8f0"}}><div style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>{x.l}</div><div style={{fontSize:13,fontWeight:700,color:x.c}}>{x.v}</div></div>
          ))}
        </div>}
      </div>

      <div style={card}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>💸 Settlement</div>
        {stl.length===0?<div style={{textAlign:"center",padding:"10px 0",color:"#94a3b8",fontSize:14}}>{sess.length===0?"Add players above":"All balanced"}</div>:stl.map((t,i)=><SRow key={i} t={t} comp={comp}/>)}
      </div>

      <div style={card}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>🏦 Kitty</div>
        {[{l:"Previous kitty",v:"$"+f(prevK)},{l:"Tax collected",v:"+$"+f(totTax),c:"#1a7a3e"},...extras.map(e=>({l:e.label,v:"-$"+f(e.amount),c:"#a32d2d"})),{l:"Rebate ("+(topL?topL.name:"—")+")",v:rebate>0?"-$"+f(rebate):"—",c:rebate>0?"#a32d2d":"#94a3b8"}].map((r,i)=>(
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
          <button onClick={()=>setExtras(es=>es.filter(x=>x.id!==e.id))} style={{fontSize:13,color:"#94a3b8",border:"none",background:"none",cursor:"pointer"}}>x</button>
        </div>)}
        <div style={{display:"flex",gap:6}}>
          <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Expense item" style={{fontSize:13,padding:"5px 9px",flex:1,borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",color:"#1e293b"}}/>
          <input type="number" value={newAmt} onChange={e=>setNewAmt(e.target.value)} placeholder="$" style={{fontSize:13,padding:"5px 8px",width:60,borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",color:"#1e293b"}}/>
          <button onClick={()=>{if(!newLabel.trim())return;setExtras(es=>[...es,{id:Date.now(),label:newLabel.trim(),amount:Number(newAmt)||0}]);setNewLabel("");setNewAmt("");}} style={{fontSize:13,padding:"5px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700}}>+ Add</button>
        </div>
      </div>

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
    </div>
  );
}
