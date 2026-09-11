"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./PetBridge.module.css";
import { activePet, addPetProgress, levelForPet, loadPetSave, maybeFindNest, petAssistEvery, savePetSave, speciesInfo, type Gardenkin } from "./petSystem";

export default function PetBridge(){
  const pathname=usePathname();
  const [pet,setPet]=useState<Gardenkin|null>(null);
  const [toast,setToast]=useState<string|null>(null);
  const seen=useRef(new Set<string>());
  const charge=useRef(0);
  const assisting=useRef(false);
  const completedKey=useRef<string|null>(null);
  const toastTimer=useRef<number|null>(null);

  const refresh=()=>setPet(activePet(loadPetSave()));
  useEffect(()=>{refresh(); const onChange=()=>refresh(); window.addEventListener("stillgarden-pets-changed",onChange); return()=>window.removeEventListener("stillgarden-pets-changed",onChange);},[]);
  function notify(text:string){ setToast(text); if(toastTimer.current) window.clearTimeout(toastTimer.current); toastTimer.current=window.setTimeout(()=>setToast(null),1800); }

  useEffect(()=>{
    if(pathname==="/pets") return;
    const seedSeen=()=>document.querySelectorAll<HTMLElement>("[data-cell][data-restored='true']").forEach(el=>seen.current.add(el.dataset.cell||""));
    const seedTimer=window.setTimeout(seedSeen,250);
    const assist=(origin:number,current:Gardenkin)=>{
      const buttons=[...document.querySelectorAll<HTMLButtonElement>("[data-cell][data-restored='false']")];
      if(!buttons.length)return;
      const info=speciesInfo(current.speciesId);
      let targets:HTMLButtonElement[]=[];
      if(info.assist==="mound"){
        const mound=buttons.find(b=>b.dataset.bump==="true"); if(mound)targets=[mound];
      }
      if(!targets.length&&info.assist==="line") targets=buttons.filter(b=>Math.abs(Number(b.dataset.cell)-origin)<=4).slice(0,2);
      if(!targets.length&&info.assist==="burst") targets=buttons.sort((a,b)=>Math.abs(Number(a.dataset.cell)-origin)-Math.abs(Number(b.dataset.cell)-origin)).slice(0,current.activeKnacks.includes("softstep")?3:2);
      if(!targets.length) targets=buttons.sort(()=>Math.random()-.5).slice(0,current.activeKnacks.includes("softstep")?2:1);
      if(!targets.length)return;
      assisting.current=true;
      targets.forEach((button,i)=>window.setTimeout(()=>button.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:99+i})),i*45));
      window.setTimeout(()=>{assisting.current=false;},220);
      notify(`${current.name} · ${info.signature}`);
    };
    const observer=new MutationObserver((mutations)=>{
      let newest:number|null=null;
      let gained=0;
      for(const m of mutations){
        if(m.type!=="attributes"||m.attributeName!=="data-restored")continue;
        const el=m.target as HTMLElement; if(el.dataset.restored!=="true")continue;
        const key=el.dataset.cell||""; if(seen.current.has(key))continue;
        seen.current.add(key); newest=Number(key); gained++;
      }
      const save=loadPetSave(); const current=activePet(save); if(!current||!gained)return;
      let next=addPetProgress(save,current.id,assisting.current?0:gained,assisting.current?0:gained*.09,"tend");
      savePetSave(next);
      if(!assisting.current){
        charge.current+=gained;
        const refreshed=activePet(next);
        if(refreshed&&charge.current>=petAssistEvery(refreshed)){ charge.current=0; assist(newest??0,refreshed); }
      }
      const all=[...document.querySelectorAll<HTMLElement>("[data-cell]")];
      const done=all.length>0&&all.every(el=>el.dataset.restored==="true");
      if(done){
        const plotText=document.body.textContent?.match(/plot\s+(\d+)/i)?.[1]||String(Date.now());
        if(completedKey.current!==plotText){
          completedKey.current=plotText;
          const stage=Number(plotText)||1;
          let s=loadPetSave(); const p=activePet(s); if(p)s=addPetProgress(s,p.id,36,5,"forage");
          const nest=maybeFindNest(s,stage); savePetSave(nest.save);
          if(nest.found)notify(`${p?.name??"Your companion"} found a warm nest.`);
        }
      }
    });
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["data-restored"]});
    return()=>{window.clearTimeout(seedTimer);observer.disconnect();};
  },[pathname]);

  if(pathname==="/pets") return null;
  const info=pet?speciesInfo(pet.speciesId):null;
  const coat=pet?`hsl(${82+pet.genes.coat*12} 22% ${43+pet.genes.size}%)`:"#80906f";
  const accent=pet?`hsl(${36+pet.genes.accent*21} 24% 66%)`:"#c0ae83";
  return <>
    <a className={styles.dock} href="/pets" aria-label="Open Gardenkin sanctuary">
      {pet&&info?<div className={styles.portrait} data-body={info.body} style={{"--coat":coat,"--accent":accent} as React.CSSProperties}><i className={styles.body}/><i className={styles.head}/><i className={styles.ear}/></div>:<div className={styles.empty}>?</div>}
      <span className={styles.dockText}><strong>{pet?pet.name:"gardenkin"}</strong><span>{pet?`level ${levelForPet(pet)} companion`:"choose your first companion"}</span></span>
    </a>
    {toast&&<div className={styles.toast}><strong>{toast}</strong></div>}
  </>;
}
