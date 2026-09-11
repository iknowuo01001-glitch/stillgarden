"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import styles from "./FieldPetActor.module.css";
import {
  activePet,
  addPetProgress,
  loadPetSave,
  maybeFindNest,
  petAssistEvery,
  petChargeGain,
  savePetSave,
  speciesInfo,
  type Gardenkin,
} from "./petSystem";

type Pose = "idle" | "walk" | "inspect" | "poke" | "celebrate" | "sit" | "sleep" | "dangle" | "climb" | "watch";
type Facing = "left" | "right";
type Surface = "floor" | "left-wall" | "right-wall";
type Point = { x:number; y:number };
type Props = { pet:Gardenkin|null; onNotify:(text:string)=>void };
type ActorState = { visible:boolean; pose:Pose; facing:Facing; surface:Surface };
type PendingAssist = { origin:number; pet:Gardenkin } | null;

const wait=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms));
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

function visibleCells(){
  return [...document.querySelectorAll<HTMLButtonElement>("button[data-cell]")].filter(el=>{
    const r=el.getBoundingClientRect();
    return r.width>4&&r.height>4&&getComputedStyle(el).visibility!=="hidden";
  });
}

function mascotSize(){ return window.innerWidth<=620?98:118; }

function pointForCell(el:HTMLElement):Point{
  const r=el.getBoundingClientRect(), size=mascotSize();
  return {
    x:clamp(r.left+r.width/2-size/2,4,window.innerWidth-size-4),
    y:clamp(r.top+r.height/2-size*.68,4,window.innerHeight-size-4),
  };
}

function fieldBounds(cells:HTMLElement[]){
  const rects=cells.map(c=>c.getBoundingClientRect());
  return {
    left:Math.min(...rects.map(r=>r.left)),
    right:Math.max(...rects.map(r=>r.right)),
    top:Math.min(...rects.map(r=>r.top)),
    bottom:Math.max(...rects.map(r=>r.bottom)),
  };
}

export default function FieldPetActor({pet,onNotify}:Props){
  const reduceMotion=useReducedMotion();
  const x=useMotionValue(0), y=useMotionValue(0);
  const [actor,setActor]=useState<ActorState>({visible:false,pose:"idle",facing:"right",surface:"floor"});
  const seen=useRef(new Set<string>());
  const charge=useRef(0);
  const assisting=useRef(false);
  const busy=useRef(false);
  const playerDragging=useRef(false);
  const pendingAssist=useRef<PendingAssist>(null);
  const completedKey=useRef<string|null>(null);
  const sequence=useRef(0);
  const motionControls=useRef<Array<{stop:()=>void}>>([]);
  const petRestoreCells=useRef(new Set<string>());
  const trackingPlot=useRef<string|null>(null);
  const lastAmbientPoke=useRef(0);

  const info=useMemo(()=>pet?speciesInfo(pet.speciesId):null,[pet?.speciesId]);
  const coat=pet?`hsl(${82+pet.genes.coat*12} 24% ${44+pet.genes.size}%)`:"#80906f";
  const accent=pet?`hsl(${36+pet.genes.accent*21} 28% 68%)`:"#c0ae83";

  function stopMotion(){
    motionControls.current.forEach(c=>c.stop());
    motionControls.current=[];
  }

  function setPose(pose:Pose,surface:Surface="floor"){
    setActor(current=>({...current,pose,surface}));
  }

  function hide(){ stopMotion(); setActor(current=>({...current,visible:false,pose:"idle",surface:"floor"})); }

  function place(force=false){
    if(!pet){hide();return}
    const cells=visibleCells();
    if(!cells.length){hide();return}
    if(actor.visible&&!force)return;
    const restored=cells.filter(c=>c.dataset.restored==="true");
    const pool=restored.length?restored:cells;
    const anchor=[...pool].sort((a,b)=>b.getBoundingClientRect().bottom-a.getBoundingClientRect().bottom)[0];
    if(!anchor)return;
    const p=pointForCell(anchor);
    x.set(p.x);y.set(p.y);
    setActor({visible:true,pose:"idle",facing:"right",surface:"floor"});
  }

  async function moveTo(point:Point,pose:Pose="walk",token=sequence.current,surface:Surface="floor"){
    if(token!==sequence.current)return false;
    stopMotion();
    const start={x:x.get(),y:y.get()}, dx=point.x-start.x, dy=point.y-start.y;
    const dist=Math.hypot(dx,dy);
    const facing:Facing=dx<0?"left":"right";
    setActor(current=>({...current,visible:true,pose,facing,surface}));
    if(reduceMotion){x.set(point.x);y.set(point.y);await wait(40);return token===sequence.current}
    const duration=clamp(dist/78,.42,4.6);
    const bend=surface==="floor"?clamp(dist*.025,2,13)*(Math.random()>.5?1:-1):0;
    const xs=[start.x,start.x+dx*.28,start.x+dx*.72,point.x];
    const ys=[start.y,start.y+dy*.28+bend,start.y+dy*.72-bend*.35,point.y];
    const cx=animate(x,xs,{duration,ease:"linear"}), cy=animate(y,ys,{duration,ease:"linear"});
    motionControls.current=[cx,cy];
    await wait(duration*1000+24);
    if(token!==sequence.current)return false;
    x.set(point.x);y.set(point.y);motionControls.current=[];
    return true;
  }

  async function walkToCell(cell:HTMLButtonElement,token:number){
    return moveTo(pointForCell(cell),"walk",token,"floor");
  }

  function chooseTargets(origin:number,current:Gardenkin){
    const buttons=visibleCells().filter(button=>button.dataset.restored!=="true");
    if(!buttons.length)return [] as HTMLButtonElement[];
    const currentInfo=speciesInfo(current.speciesId), extra=current.activeKnacks.includes("softstep")?1:0;
    const originButton=document.querySelector<HTMLButtonElement>(`button[data-cell='${origin}']`)??buttons[0]??null;
    const r=originButton?.getBoundingClientRect();
    const centre=r?{x:r.left+r.width/2,y:r.top+r.height/2}:{x:innerWidth/2,y:innerHeight/2};
    const metric=(button:HTMLButtonElement)=>{const q=button.getBoundingClientRect();return Math.hypot(q.left+q.width/2-centre.x,q.top+q.height/2-centre.y)};
    if(currentInfo.assist==="mound"){
      const mound=buttons.filter(b=>b.dataset.bump==="true").sort((a,b)=>metric(a)-metric(b))[0];
      if(mound)return [mound];
    }
    if(currentInfo.assist==="line"){
      const row=buttons.filter(button=>{const q=button.getBoundingClientRect();return Math.abs(q.top+q.height/2-centre.y)<Math.max(20,q.height)}).sort((a,b)=>metric(a)-metric(b));
      if(row.length)return row.slice(0,2+extra);
    }
    if(currentInfo.assist==="burst")return buttons.sort((a,b)=>metric(a)-metric(b)).slice(0,2+extra);
    return buttons.sort(()=>Math.random()-.5).slice(0,1+extra);
  }

  function activateCell(button:HTMLButtonElement,index:number){
    if(button.dataset.restored==="true")return;
    const cell=Number(button.dataset.cell??index);
    if(Number.isInteger(cell))window.dispatchEvent(new CustomEvent("stillgarden-pet-restore",{detail:{index:cell}}));
  }

  async function pokeCell(button:HTMLButtonElement,index:number,token:number){
    if(!(await walkToCell(button,token))||token!==sequence.current)return;
    setPose("inspect");await wait(reduceMotion?50:360);
    if(token!==sequence.current)return;
    setPose("poke");
    await wait(reduceMotion?40:230);
    activateCell(button,index);
    await wait(reduceMotion?50:420);
  }

  async function runAssist(origin:number,current:Gardenkin){
    if(assisting.current)return;
    if(playerDragging.current){pendingAssist.current={origin,pet:current};return}
    const targets=chooseTargets(origin,current);if(!targets.length)return;
    assisting.current=true;busy.current=true;pendingAssist.current=null;
    stopMotion();const token=++sequence.current,currentInfo=speciesInfo(current.speciesId);
    for(let i=0;i<targets.length;i++){if(token!==sequence.current)break;await pokeCell(targets[i],i,token)}
    if(token===sequence.current){setPose("celebrate");onNotify(`${current.name} · ${currentInfo.signature}`);await wait(reduceMotion?90:760);setPose("idle")}
    assisting.current=false;busy.current=false;
  }

  async function ambientWander(token:number){
    const cells=visibleCells();if(!cells.length)return;
    const restored=cells.filter(c=>c.dataset.restored==="true"),pool=restored.length?restored:cells;
    const target=pool[Math.floor(Math.random()*pool.length)];if(!target)return;
    await walkToCell(target,token);
  }

  async function ambientInspect(token:number){
    const cells=visibleCells();if(!cells.length)return;
    const untended=cells.filter(c=>c.dataset.restored!=="true");
    const pool=untended.length?untended:cells;
    const target=pool[Math.floor(Math.random()*pool.length)];if(!target)return;
    if(!(await walkToCell(target,token)))return;
    setPose("inspect");await wait(520+Math.random()*880);
    const canHelp=target.dataset.restored!=="true"&&Date.now()-lastAmbientPoke.current>=6500;
    if(canHelp&&Math.random()<.82){
      setPose("poke");await wait(reduceMotion?45:260);
      activateCell(target,240);
      lastAmbientPoke.current=Date.now();
      await wait(reduceMotion?60:430);
      setPose("inspect");await wait(220);
    }else if(Math.random()<.34){
      setPose("poke");await wait(420);setPose("inspect");await wait(220);
    }
  }

  async function ambientEdge(token:number,climb=false){
    const cells=visibleCells();if(!cells.length)return;
    const b=fieldBounds(cells),left=Math.random()<.5;
    const edge=[...cells].sort((a,c)=>{
      const ar=a.getBoundingClientRect(),cr=c.getBoundingClientRect();
      return left?ar.left-cr.left:cr.right-ar.right;
    })[0];
    if(!edge||!(await walkToCell(edge,token)))return;
    if(climb){
      const size=mascotSize(), surface:Surface=left?"left-wall":"right-wall";
      const start={x:left?clamp(b.left-size*.48,2,innerWidth-size-2):clamp(b.right-size*.52,2,innerWidth-size-2),y:y.get()};
      await moveTo(start,"climb",token,surface);
      if(token!==sequence.current)return;
      const topY=clamp(b.top-size*.25,5,innerHeight-size-5);
      await moveTo({x:start.x,y:topY},"climb",token,surface);
      await wait(500+Math.random()*700);
      setPose("idle");
    }else{
      setPose("dangle");await wait(1600+Math.random()*2600);setPose("idle");
    }
  }

  useEffect(()=>{
    const down=(event:PointerEvent)=>{
      const target=event.target;
      if(!(target instanceof Element)||!target.closest("[data-cell]"))return;
      playerDragging.current=true;
      if(!assisting.current){sequence.current++;stopMotion();busy.current=false;setPose("watch")}
    };
    const up=()=>{
      if(!playerDragging.current)return;
      playerDragging.current=false;
      const queued=pendingAssist.current;
      if(queued)window.setTimeout(()=>void runAssist(queued.origin,queued.pet),140);
      else if(!assisting.current)window.setTimeout(()=>setPose("idle"),110);
    };
    document.addEventListener("pointerdown",down,true);window.addEventListener("pointerup",up,true);window.addEventListener("pointercancel",up,true);
    return()=>{document.removeEventListener("pointerdown",down,true);window.removeEventListener("pointerup",up,true);window.removeEventListener("pointercancel",up,true)};
  },[]);

  useEffect(()=>{
    const initial=window.setTimeout(()=>place(true),160);
    const presence=window.setInterval(()=>{const cells=visibleCells();if(!cells.length)hide();else if(!actor.visible)place(true)},850);
    const resize=()=>{sequence.current++;stopMotion();window.setTimeout(()=>place(true),80)};
    window.addEventListener("resize",resize);
    return()=>{window.clearTimeout(initial);window.clearInterval(presence);window.removeEventListener("resize",resize)};
  },[pet?.id,actor.visible]);

  useEffect(()=>{
    if(!pet)return;
    let cancelled=false;
    const loop=async()=>{
      while(!cancelled){
        await wait(650+Math.random()*950);
        if(cancelled||assisting.current||busy.current||playerDragging.current||!visibleCells().length)continue;
        busy.current=true;const token=++sequence.current,roll=Math.random();
        if(roll<.34)await ambientWander(token);
        else if(roll<.64)await ambientInspect(token);
        else if(roll<.76){setPose("sit");await wait(1300+Math.random()*2200)}
        else if(roll<.85){setPose("sleep");await wait(2000+Math.random()*3600)}
        else if(roll<.95)await ambientEdge(token,false);
        else await ambientEdge(token,true);
        if(token===sequence.current&&!assisting.current)setPose("idle");
        busy.current=false;
      }
    };
    void loop();
    return()=>{cancelled=true;sequence.current++;stopMotion();busy.current=false};
  },[pet?.id,reduceMotion]);

  useEffect(()=>{
    seen.current.clear();petRestoreCells.current.clear();charge.current=0;completedKey.current=null;lastAmbientPoke.current=0;
    const readPlot=()=>document.body.textContent?.match(/plot\s+(\d+)/i)?.[1]??null;
    const seed=window.setTimeout(()=>{trackingPlot.current=readPlot();document.querySelectorAll<HTMLElement>("[data-cell][data-restored='true']").forEach(el=>seen.current.add(el.dataset.cell||""));},180);
    const petRestored=(event:Event)=>{const cells=(event as CustomEvent<{cells?:number[]}>).detail?.cells??[];for(const cell of cells)petRestoreCells.current.add(String(cell));};
    window.addEventListener("stillgarden-pet-restored",petRestored);
    const observer=new MutationObserver(mutations=>{
      const plot=readPlot();if(plot!==trackingPlot.current){trackingPlot.current=plot;seen.current.clear();petRestoreCells.current.clear();}
      let newest:number|null=null,changed=0,playerGained=0,playerMounds=0;
      for(const mutation of mutations){
        if(mutation.type!=="attributes"||mutation.attributeName!=="data-restored")continue;
        const el=mutation.target as HTMLElement;const key=el.dataset.cell||"";
        if(el.dataset.restored!=="true"){seen.current.delete(key);petRestoreCells.current.delete(key);continue;}
        if(seen.current.has(key))continue;
        seen.current.add(key);newest=Number(key);changed++;
        const causedByPet=petRestoreCells.current.delete(key);
        if(!causedByPet&&!assisting.current){playerGained++;if(el.dataset.bump==="true")playerMounds++;}
      }
      const save=loadPetSave(),current=activePet(save);if(!current||!changed)return;
      let next=save;
      if(playerGained>0){
        next=addPetProgress(save,current.id,playerGained,playerGained*.09,"tend");savePetSave(next);
        charge.current+=petChargeGain(current,playerGained,playerMounds);const refreshed=activePet(next);
        if(refreshed&&charge.current>=petAssistEvery(refreshed)){charge.current=0;void runAssist(newest??0,refreshed)}
      }
      const all=[...document.querySelectorAll<HTMLElement>("[data-cell]")],done=all.length>0&&all.every(el=>el.dataset.restored==="true");
      if(done){
        const plotText=document.body.textContent?.match(/plot\s+(\d+)/i)?.[1]||String(Date.now());
        if(completedKey.current!==plotText){
          completedKey.current=plotText;const stage=Number(plotText)||1;
          let s=loadPetSave();const companion=activePet(s);if(companion)s=addPetProgress(s,companion.id,36,5,"forage");
          const nest=maybeFindNest(s,stage);savePetSave(nest.save);if(nest.found)onNotify(`${companion?.name??"Your companion"} found a warm nest.`);
          if(companion){sequence.current++;stopMotion();setPose("celebrate");window.setTimeout(()=>setPose("idle"),reduceMotion?100:900)}
        }
      }
    });
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["data-restored"]});
    return()=>{window.clearTimeout(seed);window.removeEventListener("stillgarden-pet-restored",petRestored);observer.disconnect();sequence.current++;stopMotion()};
  },[pet?.id,reduceMotion]);

  if(!pet||!info)return null;
  return <motion.div className={styles.actorMover} data-testid="gardenkin-field-actor" aria-hidden="true" style={{x,y,opacity:actor.visible?1:0}}>
    <div className={styles.fieldActor} data-body={info.body} data-pose={actor.pose} data-facing={actor.facing} data-surface={actor.surface} data-lustre={pet.genes.lustre} style={{"--actor-coat":coat,"--actor-accent":accent} as React.CSSProperties}>
      <div className={styles.actorScale}>
        <div className={styles.actorVisual}>
          <i className={styles.actorShadow}/><i className={styles.actorTail}/><i className={styles.actorBody}/><i className={styles.actorBelly}/>
          <i className={styles.actorLegBack}/><i className={styles.actorLegFront}/><i className={styles.actorPawLeft}/><i className={styles.actorPawRight}/>
          <i className={styles.actorHead}/><i className={`${styles.actorEar} ${styles.actorEarLeft}`}/><i className={`${styles.actorEar} ${styles.actorEarRight}`}/>
          <i className={styles.actorFace}><b/><b/><em/></i><i className={styles.actorMark}/><i className={styles.actorBloom}/><i className={styles.actorWing}/><i className={styles.actorSpark}/>
        </div>
      </div>
      <i className={styles.actorDust}/>
    </div>
  </motion.div>;
}
