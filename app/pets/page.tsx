"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import styles from "./pets.module.css";
import {
  PET_LEVEL_CAP,
  addPetProgress,
  adoptStarter,
  bondTier,
  breedPets,
  breedingCost,
  canBreed,
  greetVisitor,
  growthStage,
  hatchEgg,
  inviteVisitor,
  levelForPet,
  loadPetSave,
  lustreApproxOdds,
  lustreLabel,
  knackCatalog,
  nextLevelProgress,
  offerVisitor,
  petSpecies,
  personalityFor,
  processVisitor,
  rarityNames,
  readMainSave,
  renamePet,
  savePetSave,
  setLureFromHarvest,
  speciesInfo,
  starterSpecies,
  toggleKnack,
  unlockedKnacks,
  visitorTrustNeeded,
  type Gardenkin,
  type PetSave,
  type PetSpeciesId,
} from "../petSystem";

type Tab = "sanctuary" | "visitors" | "nest" | "guide";
const plantNames: Record<string,string> = {
  clover:"Cloud Clover", fern:"Button Fern", poppy:"Dust Poppy", rainmint:"Rainmint", moonbell:"Moonbell", sunreed:"Sunreed",
  embermoss:"Ember Moss", pearlgrass:"Pearl Grass", frostvine:"Frost Vine", blushcap:"Blush Cap", starthistle:"Star Thistle", nightorchid:"Night Orchid",
  roseclover:"Rose Clover", mossmint:"Mossmint", duskbell:"Dusk Bell", emberpetal:"Ember Petal", miststar:"Mist Star", goldfern:"Gold Fern",
  frostbell:"Frost Bell", pearlreed:"Pearl Reed", embervine:"Ember Vine", blushfern:"Blush Fern", starclover:"Star Clover", nightmint:"Night Mint",
};
const coatNames=["sage","moss","reed","lichen","hazel","clay","fern","tea","olive","stone","bark","mist"];
const patternNames=["clear","freckled","saddled","socked","masked","ringed","star-marked"];
const earNames=["soft","upright","folded","wide","tufted"];
const tailNames=["round","brush","ribbon","curl","forked"];
const bloomNames=["no sprig","one sprig","leaf crown","bud","tiny flower","double sprig"];

function fmt(ms:number){ if(ms<=0)return "ready"; const m=Math.floor(ms/60000); const s=Math.floor(ms%60000/1000); if(m>=60){const h=Math.floor(m/60);return `${h}h ${m%60}m`;} return m?`${m}m ${s}s`:`${s}s`; }
function fmtDate(time:number){ return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(new Date(time)); }
function petColours(pet?:Gardenkin|null,speciesId?:PetSpeciesId){
  const index=Math.max(0,petSpecies.findIndex(s=>s.id===(pet?.speciesId??speciesId)));
  const coat=pet?.genes.coat??index%12; const accent=pet?.genes.accent??(index*3)%10;
  return { coat:`hsl(${72+coat*13} ${20+(coat%3)*4}% ${41+(pet?.genes.size??3)*2}%)`, accent:`hsl(${28+accent*24} ${24+(accent%2)*7}% ${61+(accent%3)*3}%)` };
}

function PetArt({pet,speciesId,large=false,quiet=false}:{pet?:Gardenkin|null;speciesId?:PetSpeciesId;large?:boolean;quiet?:boolean}){
  const id=pet?.speciesId??speciesId??"mossbun"; const sp=speciesInfo(id); const colours=petColours(pet,id); const pattern=pet?.genes.pattern??petSpecies.findIndex(x=>x.id===id)%7; const ears=pet?.genes.ears??2; const tail=pet?.genes.tail??2; const bloom=pet?.genes.bloom??1; const lustre=pet?.genes.lustre??"plain"; const personality=pet?personalityFor(pet):"curious";
  return <div className={`${styles.petArt} ${large?styles.petLarge:""} ${quiet?styles.petQuiet:""}`} data-body={sp.body} data-pattern={pattern} data-ears={ears} data-tail={tail} data-bloom={bloom} data-lustre={lustre} data-personality={personality} style={{"--pet-coat":colours.coat,"--pet-accent":colours.accent} as CSSProperties}>
    <i className={styles.petShadow}/><i className={styles.petTail}/><i className={styles.petBody}/><i className={styles.petBelly}/><i className={styles.petWing}/><i className={styles.petHead}/><i className={`${styles.petEar} ${styles.earLeft}`}/><i className={`${styles.petEar} ${styles.earRight}`}/><i className={styles.petFace}><b/><b/><em/></i><i className={styles.petMark}/><i className={styles.petBloom}/><i className={styles.petSpark}/>
  </div>;
}

function Starter({save,onChoose}:{save:PetSave;onChoose:(id:PetSpeciesId)=>void}){
  return <main className={styles.starter}><a href="/" className={styles.back}>← garden</a><div className={styles.starterIntro}><span>the first visitor</span><h1>Someone has been waiting by the pots.</h1><p>Choose one Gardenkin. Species matters, but every individual will develop its own markings, personality, talents and family line.</p></div><div className={styles.starterChoices}>{starterSpecies().map((sp,i)=><button key={sp.id} onClick={()=>onChoose(sp.id)}><div className={styles.starterScene}><PetArt speciesId={sp.id} large/></div><span className={styles.specimenNo}>0{i+1}</span><h2>{sp.name}</h2><p>{sp.note}</p><em>{sp.signature} · {sp.assist==="mound"?"finds efficient mounds":sp.assist==="line"?"runs through rows":"opens nearby soil"}</em></button>)}</div><div className={styles.starterFoot}>No choice is stronger forever. Genetics, bond, level and chosen knacks eventually matter more than starting rarity.</div></main>;
}

export default function PetsPage(){
  const [save,setSave]=useState<PetSave>(()=>loadPetSave());
  const [tab,setTab]=useState<Tab>("sanctuary");
  const [now,setNow]=useState(()=>Date.now());
  const [rosterPage,setRosterPage]=useState(0); const [guidePage,setGuidePage]=useState(0);
  const [parentA,setParentA]=useState(""); const [parentB,setParentB]=useState("");
  const [notice,setNotice]=useState<string|null>(null); const [reveal,setReveal]=useState<Gardenkin|null>(null); const [rename,setRename]=useState(false);
  const [cuddleUntil,setCuddleUntil]=useState(0);
  const main=useMemo(()=>readMainSave(),[save,now]);
  const gardenStage=Math.max(0,Number(main?.completedGardens??Math.max(0,(main?.stage??1)-1)));
  const selected=save.pets.find(p=>p.id===(save.selectedPetId??save.activePetId))??save.pets[0]??null;
  const active=save.pets.find(p=>p.id===save.activePetId)??null;
  const eligible=save.pets.filter(p=>levelForPet(p)>=25&&bondTier(p)>=3);
  const harvested=Object.entries(main?.harvested??{}).filter(([,n])=>Number(n)>0).map(([id,n])=>({id,name:plantNames[id]??id,count:Number(n)}));

  function commit(next:PetSave){ setSave(next); savePetSave(next); }
  function message(text:string){ setNotice(text); window.setTimeout(()=>setNotice(current=>current===text?null:current),2200); }

  useEffect(()=>{ const timer=window.setInterval(()=>{ const t=Date.now(); setNow(t); setSave(prev=>{ const next=processVisitor(prev,gardenStage,t); if(next!==prev)savePetSave(next); return next; }); },1000); return()=>window.clearInterval(timer); },[gardenStage]);
  useEffect(()=>{ if(!parentA&&eligible[0])setParentA(eligible[0].id); if(!parentB&&eligible[1])setParentB(eligible[1].id); },[eligible,parentA,parentB]);

  if(!save.pets.length) return <Starter save={save} onChoose={id=>{const next=adoptStarter(save,id);commit(next);setReveal(next.pets[0]);}}/>;

  const progress=selected?nextLevelProgress(selected):null; const info=selected?speciesInfo(selected.speciesId):null; const unlocked=selected?unlockedKnacks(selected):[];
  const rosterPages=Math.max(1,Math.ceil(save.pets.length/6)); const roster=save.pets.slice(rosterPage*6,rosterPage*6+6);
  const guidePages=Math.ceil(petSpecies.length/8); const guide=petSpecies.slice(guidePage*8,guidePage*8+8);

  function cuddle(){ if(!selected||now<cuddleUntil)return; const next=addPetProgress(save,selected.id,5,8,"cuddle");commit(next);setCuddleUntil(now+30_000);message(`${selected.name} leans into your hand.`); }
  function hatch(id:string){ const result=hatchEgg(save,id,now); if(!result.pet)return;commit(result.save);setReveal(result.pet);message(`${result.pet.name} hatched.`); }
  function breed(){ const result=breedPets(save,parentA,parentB); if(result.ok)commit(result.save);message(result.message); }
  function lure(id:string){ const result=setLureFromHarvest(save,id); if(result.ok){commit(result.save);message(`${plantNames[id]??id} left near the sanctuary gate.`);}else message("You need a harvested plant first."); }
  function offer(id:string){ const result=offerVisitor(save,id); if(result.ok)commit(result.save);message(result.message); }
  function invite(){ if(!save.visitor)return;const before=save.pets.length;const next=inviteVisitor(save);if(next.pets.length>before){commit(next);setReveal(next.pets[next.pets.length-1]);message("It chose to stay.");}else message("It needs a little more trust first."); }

  return <main className={styles.shell}>
    <div className={styles.wall} aria-hidden="true"/><header className={styles.top}><a href="/" className={styles.back}>← garden</a><div className={styles.title}><i/> <strong>Gardenkin</strong><span>{active?`${active.name} is with you`:`${save.pets.length} companions`}</span></div><div className={styles.summary}><span>{save.pets.length} kin</span><span>{save.discovered.length}/{petSpecies.length} species</span><span>{save.eggs.length}/4 nests</span></div></header>
    <nav className={styles.tabs}>{(["sanctuary","visitors","nest","guide"] as Tab[]).map(t=><button key={t} className={tab===t?styles.activeTab:""} onClick={()=>setTab(t)}>{t}</button>)}</nav>

    {tab==="sanctuary"&&selected&&info&&progress&&<section className={styles.sanctuary}>
      <div className={styles.scene}><div className={styles.window}><i/><i/><i/></div><div className={styles.shelf}><i/><i/><i/></div><div className={styles.petStage}><PetArt pet={selected} large/><button className={styles.petButton} onClick={cuddle} disabled={now<cuddleUntil}>{now<cuddleUntil?`rest ${fmt(cuddleUntil-now)}`:"sit with them"}</button></div><div className={styles.sceneCaption}><span>{rarityNames[info.rarity]} {info.name}</span><strong>{selected.name}</strong><em>{personalityFor(selected)} · {growthStage(selected)} · generation {selected.generation}</em></div></div>
      <div className={styles.petBook}><div className={styles.bookHead}><div><span>companion record</span><h1>{selected.name}</h1></div><div className={styles.bookActions}><button onClick={()=>setRename(v=>!v)}>rename</button><button className={save.activePetId===selected.id?styles.chosen:""} onClick={()=>commit({...save,activePetId:selected.id})}>{save.activePetId===selected.id?"with you":"take along"}</button></div></div>{rename&&<form className={styles.rename} onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);const next=renamePet(save,selected.id,String(data.get("name")||""));commit(next);setRename(false);}}><input name="name" maxLength={22} defaultValue={selected.name}/><button>keep name</button></form>}
        <div className={styles.levelRow}><div><span>level {progress.level} / {PET_LEVEL_CAP}</span><div className={styles.meter}><i style={{width:`${progress.progress*100}%`}}/></div><em>{progress.next?`${progress.next} xp to next level`:"heirloom level"}</em></div><div><span>bond {bondTier(selected)} / 10</span><div className={styles.bondMarks}>{Array.from({length:10},(_,i)=><i key={i} className={i<bondTier(selected)?styles.bondOn:""}/>)}</div><em>{selected.aptitude}/5 natural aptitude</em></div></div>
        <div className={styles.recordGrid}><article><span>temperament</span><strong>{personalityFor(selected)}</strong><p>Shaped by how you spend time together. It can change gradually.</p></article><article><span>lustre</span><strong>{lustreLabel(selected.genes.lustre)}</strong><p>{selected.genes.lustre==="plain"?"Natural coat.":`A hereditary appearance trait; roughly 1 in ${lustreApproxOdds(selected.genes.lustre).toLocaleString()} naturally.`}</p></article><article><span>lineage</span><strong>generation {selected.generation}</strong><p>{selected.parents.length?"Traits can carry from both parents with occasional changes.":"A founding member of this family line."}</p></article><article><span>signature</span><strong>{info.signature}</strong><p>{info.note}</p></article></div>
        <div className={styles.traits}><span>visible traits</span><div><b>{coatNames[selected.genes.coat]??"moss"} coat</b><b>{patternNames[selected.genes.pattern]??"clear"}</b><b>{earNames[selected.genes.ears]??"soft"} ears</b><b>{tailNames[selected.genes.tail]??"round"} tail</b><b>{bloomNames[selected.genes.bloom]??"sprig"}</b></div></div>
        <div className={styles.knacks}><div className={styles.knackTitle}><span>knacks</span><em>equip up to 3 · earned through levels</em></div><div>{knackCatalog.map(k=>{const isUnlocked=unlocked.some(x=>x.id===k.id);const on=selected.activeKnacks.includes(k.id);return <button key={k.id} disabled={!isUnlocked} className={on?styles.knackOn:""} onClick={()=>commit(toggleKnack(save,selected.id,k.id))}><strong>{k.name}</strong><span>{isUnlocked?k.note:`level ${k.unlock}`}</span></button>})}</div></div>
      </div>
      <div className={styles.roster}><div className={styles.rosterHead}><span>your kin</span><div><button disabled={rosterPage<=0} onClick={()=>setRosterPage(p=>Math.max(0,p-1))}>‹</button><em>{rosterPage+1}/{rosterPages}</em><button disabled={rosterPage>=rosterPages-1} onClick={()=>setRosterPage(p=>Math.min(rosterPages-1,p+1))}>›</button></div></div><div className={styles.rosterGrid}>{roster.map(p=><button key={p.id} className={selected.id===p.id?styles.rosterSelected:""} onClick={()=>commit({...save,selectedPetId:p.id})}><PetArt pet={p} quiet/><span><strong>{p.name}</strong><em>Lv {levelForPet(p)} · bond {bondTier(p)}</em></span>{save.activePetId===p.id&&<i>with you</i>}</button>)}</div></div>
    </section>}

    {tab==="visitors"&&<section className={styles.visitorView}><div className={styles.visitorScene}>{save.visitor?(()=>{const v=save.visitor!;const sp=speciesInfo(v.speciesId);const need=visitorTrustNeeded(sp.rarity);return <><div className={styles.gate}><i/><i/></div><PetArt speciesId={v.speciesId} large/><div className={styles.visitorName}><span>{rarityNames[sp.rarity]} visitor · visit {v.visits}</span><h1>{sp.name}</h1><p>{sp.note}</p></div><div className={styles.trust}><span>trust {v.trust}/{need}</span><div>{Array.from({length:need},(_,i)=><i key={i} className={i<v.trust?styles.trustOn:""}/>)}</div><em>leaves in {fmt(v.leavesAt-now)}</em></div><div className={styles.visitorActions}><button disabled={v.greeted} onClick={()=>commit(greetVisitor(save))}>{v.greeted?"greeted":"sit nearby"}</button><button disabled={v.trust<need} onClick={invite}>{v.trust>=need?"invite to stay":"not ready yet"}</button></div></>:null})():<div className={styles.noVisitor}><div className={styles.gate}><i/><i/></div><span>the gate is quiet</span><h1>Another Gardenkin may wander in.</h1><p>Visitors are never lost forever. Plants, repeated meetings and rare-species memory shape who appears.</p><em>{save.nextVisitorAt>now?`next chance in about ${fmt(save.nextVisitorAt-now)}`:"someone is nearby…"}</em></div>}</div>
      <div className={styles.lureBook}><span className={styles.pageNo}>visitor notes</span><h2>Leave something from the garden.</h2><p>A harvested plant near the gate makes species that like it more likely to appear. Offering a visitor one of its favourites builds trust faster.</p><div className={styles.lureCurrent}><span>at the gate</span><strong>{save.lurePlant?(plantNames[save.lurePlant]??save.lurePlant):"nothing"}</strong></div><div className={styles.offerList}>{harvested.length?harvested.slice(0,8).map(item=><article key={item.id}><div><strong>{item.name}</strong><span>×{item.count}</span></div><div><button onClick={()=>lure(item.id)}>leave at gate</button>{save.visitor&&<button disabled={save.visitor.offered} onClick={()=>offer(item.id)}>offer visitor</button>}</div></article>):<div className={styles.emptyNote}>Harvest plants in the Growhouse to use them here.</div>}</div>{save.visitor&&<div className={styles.affinityHint}>Its favourite plants are not shown until you learn them by trying. A favourite offering gives twice the trust.</div>}</div>
    </section>}

    {tab==="nest"&&<section className={styles.nestView}><div className={styles.nestShelf}><div className={styles.nestIntro}><span>nest shelf</span><h1>Eggs take real time.</h1><p>Wild nests can appear after settled gardens. At higher bond and level, two Gardenkin can also start a family line.</p></div><div className={styles.eggGrid}>{Array.from({length:4},(_,i)=>{const egg=save.eggs[i];return <article key={i} className={egg?styles.eggSlot:styles.eggEmpty}>{egg?<><div className={styles.egg} data-rarity={speciesInfo(egg.speciesId).rarity}><i/><i/><i/></div><span>{egg.parents.length?`generation ${egg.generation}`:"wild nest"}</span><strong>{now>=egg.readyAt?"ready to hatch":fmt(egg.readyAt-now)}</strong><em>{egg.source}</em><button disabled={now<egg.readyAt} onClick={()=>hatch(egg.id)}>{now>=egg.readyAt?"hatch":"resting"}</button></>:<><div className={styles.emptyNest}><i/><i/></div><span>empty nest</span><em>settled gardens or breeding can fill this space</em></>}</article>})}</div></div>
      <div className={styles.breedBook}><span className={styles.pageNo}>lineage work</span><h2>Breeding is late-game progression.</h2><p>Both parents need level 25 and bond 3. Offspring inherit visible genes from either parent, can mutate individual traits, and a few exact species pairs can create entirely new lineages.</p>{eligible.length>=2?<><label>first parent<select value={parentA} onChange={e=>setParentA(e.target.value)}>{eligible.map(p=><option key={p.id} value={p.id}>{p.name} · Lv {levelForPet(p)} · B{bondTier(p)}</option>)}</select></label><label>second parent<select value={parentB} onChange={e=>setParentB(e.target.value)}>{eligible.map(p=><option key={p.id} value={p.id}>{p.name} · Lv {levelForPet(p)} · B{bondTier(p)}</option>)}</select></label>{(()=>{const a=save.pets.find(p=>p.id===parentA),b=save.pets.find(p=>p.id===parentB);const cost=a&&b?breedingCost(a,b):0;return <button className={styles.breed} disabled={!a||!b||!canBreed(a,b)||save.eggs.length>=4} onClick={breed}>prepare nest · {cost} Dew</button>})()}</>:<div className={styles.lockedBreed}><strong>Not yet.</strong><span>You need at least two companions at level 25 with bond 3. This is meant to take time.</span></div>}<div className={styles.geneticsNote}><strong>Inheritance</strong><span>Each coat, marking, ear, tail, bloom and size gene usually comes from one parent. Lustres are rarer to inherit; the level-48 Heirloom knack improves that chance.</span></div></div>
    </section>}

    {tab==="guide"&&<section className={styles.guideView}><div className={styles.guideBook}><div className={styles.guideHeader}><div><span>field guide</span><h1>{save.discovered.length} / {petSpecies.length} species recorded</h1></div><div><button disabled={guidePage<=0} onClick={()=>setGuidePage(p=>Math.max(0,p-1))}>earlier</button><em>{guidePage+1} / {guidePages}</em><button disabled={guidePage>=guidePages-1} onClick={()=>setGuidePage(p=>Math.min(guidePages-1,p+1))}>later</button></div></div><div className={styles.guideGrid}>{guide.map(sp=>{const known=save.discovered.includes(sp.id);return <article key={sp.id} className={known?styles.known:""}><div className={known?"":styles.silhouette}><PetArt speciesId={sp.id} quiet/></div><span>SG-{String(petSpecies.findIndex(x=>x.id===sp.id)+1).padStart(2,"0")}</span><strong>{known?sp.name:"unrecorded"}</strong><em>{known?`${rarityNames[sp.rarity]} · ${sp.family}`:`${rarityNames[sp.rarity]} · first seen after garden ${sp.unlockGarden}`}</em><p>{known?sp.note:("hybridOf" in sp?"This lineage does not arrive through the gate.":"A silhouette left in the margins.")}</p></article>})}</div><div className={styles.guideFoot}><button onClick={()=>setTab("visitors")}>visitor gate</button><span>Four hidden lineages can only appear through specific breeding pairs.</span><button onClick={()=>setTab("nest")}>nest shelf</button></div></div></section>}

    {notice&&<div className={styles.notice}>{notice}</div>}
    {reveal&&<div className={styles.reveal} onClick={()=>setReveal(null)}><div className={styles.revealPaper}><span>{rarityNames[speciesInfo(reveal.speciesId).rarity]} Gardenkin · generation {reveal.generation}</span><PetArt pet={reveal} large/><h1>{reveal.name}</h1><p>{speciesInfo(reveal.speciesId).name} · {lustreLabel(reveal.genes.lustre)} lustre · aptitude {reveal.aptitude}/5</p>{reveal.genes.lustre!=="plain"&&<strong>natural lustre odds · about 1 in {lustreApproxOdds(reveal.genes.lustre).toLocaleString()}</strong>}<button onClick={()=>setReveal(null)}>meet them</button></div></div>}
  </main>;
}
