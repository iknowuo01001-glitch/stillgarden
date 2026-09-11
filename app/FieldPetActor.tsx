"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import styles from "./FieldPetActor.module.css";
import {
  activePet,
  addPetProgress,
  loadPetSave,
  maybeFindNest,
  petAssistEvery,
  savePetSave,
  speciesInfo,
  type Gardenkin,
} from "./petSystem";

type Pose = "idle" | "walk" | "watch" | "poke" | "celebrate" | "rest";
type Facing = "left" | "right";
type ActorState = {x:number;y:number;visible:boolean;pose:Pose;facing:Facing;duration:number;pulse:number};
type Props = {pet:Gardenkin|null;onNotify:(text:string)=>void};

const wait=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms));
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

function validCells(){
  return [...document.querySelectorAll<HTMLButtonElement>("button[data-cell]")].filter(el=>{
    const rect=el.getBoundingClientRect();
    return rect.width>3&&rect.height>3&&getComputedStyle(el).visibility!=="hidden";
  });
}
function pointFor(el:HTMLElement){
  const rect=el.getBoundingClientRect();
  const size=window.innerWidth<=620?44:52;
  return {x:rect.left+rect.width/2-size/2,y:rect.top+rect.height/2-size*.72};
}
function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(a.x-b.x,a.y-b.y)}

export default function FieldPetActor({pet,onNotify}:Props){
  const reduceMotion=useReducedMotion();
  const [actor,setActor]=useState<ActorState>({x:0,y:0,visible:false,pose:"idle",facing:"right",duration:.25,pulse:0});
  const actorPos=useRef({x:0,y:0});
  const seen=useRef(new Set<string>());
  const charge=useRef(0);
  const assisting=useRef(false);
  const moving=useRef(false);
  const playerDragging=useRef(false);
  const completedKey=useRef<string|null>(null);
  const sequence=useRef(0);

  const info=useMemo(()=>pet?speciesInfo(pet.speciesId):null,[pet?.speciesId]);
  const coat=pet?`hsl(${82+pet.genes.coat*12} 22% ${43+pet.genes.size}%)`:"#80906f";
  const accent=pet?`hsl(${36+pet.genes.accent*21} 24% 66%)`:"#c0ae83";

  function setPose(pose:Pose,extra?:Partial<ActorState>){setActor(current=>({...current,pose,...extra}))}
  function hideActor(){setActor(current=>({...current,visible:false,pose:"idle"}))}
  function placeActor(force=false){
    if(!pet){hideActor();return}
    const cells=validCells();
    if(!cells.length){hideActor();return}
    if(actor.visible&&!force)return;
    const restored=cells.filter(cell=>cell.dataset.restored==="true");
    const pool=restored.length?restored:cells;
    const anchor=[...pool].sort((a,b)=>{
      const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      return (br.bottom-ar.bottom)||(ar.left-br.left);
    })[0];
    if(!anchor)return;
    const p=pointFor(anchor); actorPos.current=p;
    setActor(current=>({...current,...p,visible:true,pose:"idle",duration:reduceMotion?.05:.01}));
  }

  async function moveToCell(cell:HTMLButtonElement,pose:Pose="walk",token=sequence.current){
    if(token!==sequence.current)return false;
    const next=pointFor(cell),dist=distance(actorPos.current,next);
    const duration=reduceMotion?.05:clamp(dist/520,.22,.72);
    const facing:Facing=next.x<actorPos.current.x?"left":"right";
    actorPos.current=next;
    setActor(current=>({...current,...next,visible:true,pose,facing,duration}));
    await wait(duration*1000+35);
    return token===sequence.current;
  }

  function chooseTargets(origin:number,current:Gardenkin){
    const buttons=validCells().filter(button=>button.dataset.restored!=="true");
    if(!buttons.length)return [] as HTMLButtonElement[];
    const currentInfo=speciesInfo(current.speciesId);
    const extra=current.activeKnacks.includes("softstep")?1:0;
    const originButton=document.querySelector<HTMLButtonElement>(`button[data-cell='${origin}']`)??buttons[0]??null;
    const originRect=originButton?.getBoundingClientRect();
    const centre=originRect?{x:originRect.left+originRect.width/2,y:originRect.top+originRect.height/2}:{x:innerWidth/2,y:innerHeight/2};
    const metric=(button:HTMLButtonElement)=>{const r=button.getBoundingClientRect();return Math.hypot(r.left+r.width/2-centre.x,r.top+r.height/2-centre.y)};
    if(currentInfo.assist==="mound"){
      const mound=buttons.filter(b=>b.dataset.bump==="true").sort((a,b)=>metric(a)-metric(b))[0];
      if(mound)return [mound];
    }
    if(currentInfo.assist==="line"){
      const sameBand=buttons.filter(button=>{const r=button.getBoundingClientRect();return Math.abs(r.top+r.height/2-centre.y)<Math.max(18,r.height*.9)}).sort((a,b)=>metric(a)-metric(b));
      if(sameBand.length)return sameBand.slice(0,2+extra);
    }
    if(currentInfo.assist==="burst")return buttons.sort((a,b)=>metric(a)-metric(b)).slice(0,2+extra);
    return buttons.sort(()=>Math.random()-.5).slice(0,1+extra);
  }

  async function pokeCell(button:HTMLButtonElement,index:number,token:number){
    if(!(await moveToCell(button,"walk",token))||token!==sequence.current)return;
    setPose("watch",{pulse:Date.now()});
    await wait(reduceMotion?35:115);
    if(token!==sequence.current)return;
    setPose("poke",{pulse:Date.now()});
    await wait(reduceMotion?35:150);
    button.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:90+index,pointerType:"mouse"}));
    button.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:90+index,pointerType:"mouse"}));
    await wait(reduceMotion?35:145);
  }

  async function runAssist(origin:number,current:Gardenkin){
    if(assisting.current||playerDragging.current)return;
    const targets=chooseTargets(origin,current); if(!targets.length)return;
    assisting.current=true; moving.current=true;
    const token=++sequence.current,currentInfo=speciesInfo(current.speciesId);
    for(let i=0;i<targets.length;i++){if(token!==sequence.current)break;await pokeCell(targets[i],i,token)}
    if(token===sequence.current){
      setPose("celebrate",{pulse:Date.now()});
      onNotify(`${current.name} · ${currentInfo.signature}`);
      await wait(reduceMotion?80:480);
      setPose("idle");
    }
    moving.current=false; assisting.current=false;
  }

  useEffect(()=>{
    const onPointerDown=(event:PointerEvent)=>{
      const target=event.target;
      if(target instanceof Element&&target.closest("[data-cell]")){playerDragging.current=true;setPose("watch")}
    };
    const onPointerUp=()=>{
      if(!playerDragging.current)return;
      playerDragging.current=false;
      window.setTimeout(()=>{if(!assisting.current)setPose("idle")},120);
    };
    document.addEventListener("pointerdown",onPointerDown,true);
    window.addEventListener("pointerup",onPointerUp,true);window.addEventListener("pointercancel",onPointerUp,true);
    return()=>{document.removeEventListener("pointerdown",onPointerDown,true);window.removeEventListener("pointerup",onPointerUp,true);window.removeEventListener("pointercancel",onPointerUp,true)};
  },[]);

  useEffect(()=>{
    const presence=()=>placeActor(false);
    const initial=window.setTimeout(()=>placeActor(true),120);
    const pulse=window.setInterval(()=>{const cells=validCells();if(!cells.length)hideActor();else if(!actor.visible)placeActor(true)},900);
    window.addEventListener("resize",presence);
    return()=>{window.clearTimeout(initial);window.clearInterval(pulse);window.removeEventListener("resize",presence)};
  },[pet?.id,actor.visible,reduceMotion]);

  useEffect(()=>{
    if(!pet||reduceMotion)return;
    let cancelled=false;
    const roam=async()=>{
      if(cancelled||assisting.current||moving.current||playerDragging.current)return;
      const cells=validCells();if(!cells.length)return;
      const restored=cells.filter(c=>c.dataset.restored==="true"),pool=restored.length?restored:cells;
      const target=pool[Math.floor(Math.random()*pool.length)];if(!target)return;
      moving.current=true;const token=++sequence.current;
      const ok=await moveToCell(target,"walk",token);
      if(ok){const roll=Math.random();setPose(roll<.22?"rest":roll<.48?"watch":"idle")}
      moving.current=false;
    };
    const interval=window.setInterval(roam,4200+Math.floor(Math.random()*1800));
    return()=>{cancelled=true;window.clearInterval(interval)};
  },[pet?.id,reduceMotion]);

  useEffect(()=>{
    seen.current.clear();charge.current=0;completedKey.current=null;
    const seedSeen=()=>document.querySelectorAll<HTMLElement>("[data-cell][data-restored='true']").forEach(el=>seen.current.add(el.dataset.cell||""));
    const seedTimer=window.setTimeout(seedSeen,180);
    const observer=new MutationObserver(mutations=>{
      let newest:number|null=null,gained=0;
      for(const mutation of mutations){
        if(mutation.type!=="attributes"||mutation.attributeName!=="data-restored")continue;
        const el=mutation.target as HTMLElement;if(el.dataset.restored!=="true")continue;
        const key=el.dataset.cell||"";if(seen.current.has(key))continue;
        seen.current.add(key);newest=Number(key);gained++;
      }
      const save=loadPetSave(),current=activePet(save);if(!current||!gained)return;
      const next=addPetProgress(save,current.id,assisting.current?0:gained,assisting.current?0:gained*.09,"tend");savePetSave(next);
      if(!assisting.current){
        charge.current+=gained;const refreshed=activePet(next);
        if(refreshed&&charge.current>=petAssistEvery(refreshed)){charge.current=0;void runAssist(newest??0,refreshed)}
      }
      const all=[...document.querySelectorAll<HTMLElement>("[data-cell]")];
      const done=all.length>0&&all.every(el=>el.dataset.restored==="true");
      if(done){
        const plotText=document.body.textContent?.match(/plot\s+(\d+)/i)?.[1]||String(Date.now());
        if(completedKey.current!==plotText){
          completedKey.current=plotText;const stage=Number(plotText)||1;
          let currentSave=loadPetSave();const companion=activePet(currentSave);
          if(companion)currentSave=addPetProgress(currentSave,companion.id,36,5,"forage");
          const nest=maybeFindNest(currentSave,stage);savePetSave(nest.save);
          if(nest.found)onNotify(`${companion?.name??"Your companion"} found a warm nest.`);
          if(companion){setPose("celebrate",{pulse:Date.now()});window.setTimeout(()=>setPose("idle"),reduceMotion?90:650)}
        }
      }
    });
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["data-restored"]});
    return()=>{window.clearTimeout(seedTimer);observer.disconnect();sequence.current++};
  },[pet?.id,reduceMotion]);

  if(!pet||!info)return null;
  return <motion.div className={styles.actorMover} aria-hidden="true" initial={false} animate={{x:actor.x,y:actor.y,opacity:actor.visible?1:0}} transition={{duration:actor.duration,ease:[.22,.78,.28,1]}}>
    <div className={styles.fieldActor} data-body={info.body} data-pose={actor.pose} data-facing={actor.facing} data-lustre={pet.genes.lustre} style={{"--actor-coat":coat,"--actor-accent":accent,"--actor-pattern":pet.genes.pattern} as React.CSSProperties}>
      <div className={styles.actorVisual}>
        <i className={styles.actorShadow}/><i className={styles.actorTail}/><i className={styles.actorBody}/><i className={styles.actorBelly}/><i className={styles.actorPawLeft}/><i className={styles.actorPawRight}/><i className={styles.actorHead}/><i className={`${styles.actorEar} ${styles.actorEarLeft}`}/><i className={`${styles.actorEar} ${styles.actorEarRight}`}/><i className={styles.actorFace}><b/><b/><em/></i><i className={styles.actorMark}/><i className={styles.actorBloom}/><i className={styles.actorWing}/><i className={styles.actorSpark}/>
      </div><i className={styles.actorDust}/>
    </div>
  </motion.div>;
}
