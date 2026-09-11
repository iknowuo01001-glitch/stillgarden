from pathlib import Path
import json


def read(path):
    return Path(path).read_text()

def write(path, content):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)

def replace(path, old, new, label):
    source = read(path)
    if old not in source:
        raise RuntimeError(f"Patch marker not found ({label}) in {path}")
    write(path, source.replace(old, new, 1))

# Main save normalization.
replace('app/page.tsx', r'''  const seeds = emptySeeds();
  const harvested = emptyHarvested();
  if (saved.seeds) for (const [key, value] of Object.entries(saved.seeds)) if (validSpecies.has(key as SpeciesId)) seeds[key as SpeciesId] = Math.max(0, Number(value) || 0);
  else { seeds.clover = 2; seeds.fern = 1; }
  if (saved.harvested) for (const [key, value] of Object.entries(saved.harvested)) if (validSpecies.has(key as SpeciesId)) harvested[key as SpeciesId] = Math.max(0, Number(value) || 0);
  const stage = Math.max(1, Number(saved.stage) || 1);
  const restored = Array.isArray(saved.restored) ? [...new Set(saved.restored.filter((n): n is number => Number.isInteger(n) && active.has(n)))] : [];
  const completedGardens = Math.max(0, Number(saved.completedGardens) || stage - 1);
  const lifetimeRestored = Math.max(0, Number(saved.lifetimeRestored) || completedGardens * 80 + restored.length);
  const milestoneRelics = relics.filter((item) => completedGardens >= item.unlockGardens).map((item) => item.id);
  const savedRelics = Array.isArray(saved.discoveredRelics) ? saved.discoveredRelics.filter((id): id is RelicId => validRelics.has(id as RelicId)) : [];
  const plots = Array.from({ length: MAX_POTS }, (_, i) => saved.plots?.[i] ?? emptyPlot());''', r'''  const finite = (value: unknown, fallback: number) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
  const seeds = emptySeeds();
  const harvested = emptyHarvested();
  if (saved.seeds) for (const [key, value] of Object.entries(saved.seeds)) if (validSpecies.has(key as SpeciesId)) seeds[key as SpeciesId] = Math.max(0, finite(value, 0));
  else { seeds.clover = 2; seeds.fern = 1; }
  if (saved.harvested) for (const [key, value] of Object.entries(saved.harvested)) if (validSpecies.has(key as SpeciesId)) harvested[key as SpeciesId] = Math.max(0, finite(value, 0));
  const stage = Math.max(1, Math.floor(finite(saved.stage, 1)));
  const restored = Array.isArray(saved.restored) ? [...new Set(saved.restored.filter((n): n is number => Number.isInteger(n) && active.has(n)))] : [];
  const completedGardens = Math.max(0, Math.floor(finite(saved.completedGardens, stage - 1)));
  const lifetimeRestored = Math.max(0, Math.floor(finite(saved.lifetimeRestored, completedGardens * 80 + restored.length)));
  const milestoneRelics = relics.filter((item) => completedGardens >= item.unlockGardens).map((item) => item.id);
  const savedRelics = Array.isArray(saved.discoveredRelics) ? saved.discoveredRelics.filter((id): id is RelicId => validRelics.has(id as RelicId)) : [];
  const plots = Array.from({ length: MAX_POTS }, (_, i) => {
    const rawPlot = saved.plots?.[i];
    if (!rawPlot?.species || !validSpecies.has(rawPlot.species as SpeciesId)) return emptyPlot();
    const plantedAt = Math.max(0, finite(rawPlot.plantedAt, 0));
    const readyAt = Math.max(plantedAt, finite(rawPlot.readyAt, plantedAt));
    return { species: rawPlot.species as SpeciesId, plantedAt, readyAt, watered: Boolean(rawPlot.watered), fertilized: Boolean(rawPlot.fertilized) };
  });
  const discoveryLog: Partial<Record<SpeciesId, DiscoveryRecord>> = {};
  if (saved.discoveryLog && typeof saved.discoveryLog === "object") for (const [key, value] of Object.entries(saved.discoveryLog)) {
    if (!validSpecies.has(key as SpeciesId) || !value || typeof value !== "object") continue;
    const record = value as Partial<DiscoveryRecord>;
    const at = finite(record.at, 0);
    if (at > 0) discoveryLog[key as SpeciesId] = { at, source: typeof record.source === "string" ? record.source.slice(0, 160) : "recorded in the garden" };
  }''', 'normalize game save internals')

replace('app/page.tsx', '    dew: Math.max(0, Number(saved.dew) || 0),', '    dew: Math.max(0, finite(saved.dew, 0)),', 'finite dew')
replace('app/page.tsx', r'''    discoveryLog: saved.discoveryLog ?? {},
    plots,
    potsUnlocked: Math.min(MAX_POTS, Math.max(2, Number(saved.potsUnlocked) || 2)),
    shovelLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Number(saved.shovelLevel) || 1)),
    waterLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Number(saved.waterLevel) || 1)),
    fertilizer: Math.max(0, Number(saved.fertilizer) || 0),''', r'''    discoveryLog,
    plots,
    potsUnlocked: Math.min(MAX_POTS, Math.max(2, Math.floor(finite(saved.potsUnlocked, 2)))),
    shovelLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Math.floor(finite(saved.shovelLevel, 1)))),
    waterLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Math.floor(finite(saved.waterLevel, 1)))),
    fertilizer: Math.max(0, Math.floor(finite(saved.fertilizer, 0))),''', 'normalize game counters')

# Direct pet restore bridge; pet actions no longer masquerade as pointer input or reset flow.
replace('app/page.tsx', r'''  function restoreCell(index: number) {
    const result = applyRestore(gameRef.current, index);
    if (!result.changed) return;
    commit(result.state);
    if (result.message) showFeedback(result.message);
    if (result.finds.length) presentDiscovery(result.finds[result.finds.length - 1]);
    else if (result.glimmerCount) showFeedback(`glimmer · +${result.glimmerCount * GLIMMER_BONUS} Dew`);
    if (result.restoredCount > 0) {
      flowRef.current += result.restoredCount;
      setFlow(flowRef.current);
      for (const threshold of [16, 32, 48]) if (flowRef.current >= threshold && !flowMilestones.current.has(threshold)) { flowMilestones.current.add(threshold); growthPulse(threshold === 16 ? 6 : threshold === 32 ? 10 : 15); }
    }
  }
''', r'''  function restoreCell(index: number, source: "player" | "pet" = "player") {
    const before = gameRef.current;
    const result = applyRestore(before, index);
    if (!result.changed) return;
    commit(result.state);
    if (result.message) showFeedback(result.message);
    if (result.finds.length) presentDiscovery(result.finds[result.finds.length - 1]);
    else if (result.glimmerCount) showFeedback(`glimmer · +${result.glimmerCount * GLIMMER_BONUS} Dew`);
    if (source === "pet" && result.restoredCount > 0) {
      const previous = new Set(before.restored);
      const cells = result.state.restored.filter((cell) => !previous.has(cell));
      window.dispatchEvent(new CustomEvent("stillgarden-pet-restored", { detail: { cells } }));
    }
    if (source === "player" && result.restoredCount > 0) {
      flowRef.current += result.restoredCount;
      setFlow(flowRef.current);
      for (const threshold of [16, 32, 48]) if (flowRef.current >= threshold && !flowMilestones.current.has(threshold)) { flowMilestones.current.add(threshold); growthPulse(threshold === 16 ? 6 : threshold === 32 ? 10 : 15); }
    }
  }
  useEffect(() => {
    const restoreFromPet = (event: Event) => {
      const index = Number((event as CustomEvent<{ index?: number }>).detail?.index);
      if (Number.isInteger(index)) restoreCell(index, "pet");
    };
    window.addEventListener("stillgarden-pet-restore", restoreFromPet);
    return () => window.removeEventListener("stillgarden-pet-restore", restoreFromPet);
  }, [sensoryOn]);
''', 'pet restore bridge')

# Journal page clamping and stable test hooks.
replace('app/page.tsx', r'''  const journalEntries = species.slice(journalPage * journalPerPage, journalPage * journalPerPage + journalPerPage);

  return <main''', r'''  const journalEntries = species.slice(journalPage * journalPerPage, journalPage * journalPerPage + journalPerPage);
  useEffect(() => { if (journalPage > journalMaxPage) setJournalPage(journalMaxPage); }, [journalPage, journalMaxPage]);

  return <main''', 'journal clamp')
replace('app/page.tsx', '<div className={styles.book} data-single={journalPerPage === 1 ? "true" : "false"}>', '<div className={styles.book} data-testid="journal-book" data-single={journalPerPage === 1 ? "true" : "false"}>', 'journal test id')
replace('app/page.tsx', '<div className={styles.bookControls}><button disabled={journalPage === 0}', '<div className={styles.bookControls} data-testid="journal-controls"><button disabled={journalPage === 0}', 'journal controls id')
replace('app/page.tsx', '<div className={`${styles.board} ${complete ? styles.complete : ""}`} data-mode={mode.id}', '<div className={`${styles.board} ${complete ? styles.complete : ""}`} data-testid="garden-board" data-mode={mode.id}', 'board id')

# Pet persistence normalization.
replace('app/petSystem.ts', r'''export function loadPetSave(): PetSave {
  if (typeof window==="undefined") return emptyPetSave();
  try {
    const raw=localStorage.getItem(PET_SAVE_KEY); if(!raw) return emptyPetSave(); const saved=JSON.parse(raw) as Partial<PetSave>;
    return { ...emptyPetSave(), ...saved, pets:Array.isArray(saved.pets)?saved.pets:[], eggs:Array.isArray(saved.eggs)?saved.eggs:[], discovered:Array.isArray(saved.discovered)?saved.discovered:[], visitorTrust:saved.visitorTrust??{}, visitorVisits:saved.visitorVisits??{} };
  } catch { return emptyPetSave(); }
}''', r'''const validPetSpecies = new Set<PetSpeciesId>(petSpecies.map((s)=>s.id));
const validKnacks = new Set<KnackId>(knackCatalog.map((k)=>k.id));
function finiteNumber(value:unknown,fallback:number){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function boundedInt(value:unknown,fallback:number,min:number,max:number){return Math.max(min,Math.min(max,Math.floor(finiteNumber(value,fallback))));}
function normalizeGenes(raw:any):PetGenes{return {coat:boundedInt(raw?.coat,0,0,11),accent:boundedInt(raw?.accent,0,0,9),pattern:boundedInt(raw?.pattern,0,0,6),ears:boundedInt(raw?.ears,0,0,4),tail:boundedInt(raw?.tail,0,0,4),bloom:boundedInt(raw?.bloom,0,0,5),size:boundedInt(raw?.size,3,0,6),lustre:["plain","dappled","shimmer","prismatic","eclipse"].includes(raw?.lustre)?raw.lustre:"plain"};}
function normalizeCare(raw:any):Care{return {tend:Math.max(0,finiteNumber(raw?.tend,0)),cuddle:Math.max(0,finiteNumber(raw?.cuddle,0)),forage:Math.max(0,finiteNumber(raw?.forage,0)),grow:Math.max(0,finiteNumber(raw?.grow,0))};}
function normalizePet(raw:any):Gardenkin|null{if(!raw||typeof raw.id!=="string"||!validPetSpecies.has(raw.speciesId))return null;const sp=speciesOf(raw.speciesId);return {id:raw.id.slice(0,80),speciesId:raw.speciesId,name:typeof raw.name==="string"&&raw.name.trim()?raw.name.trim().slice(0,22):sp.name,bornAt:Math.max(0,finiteNumber(raw.bornAt,Date.now())),generation:boundedInt(raw.generation,1,1,9999),parents:Array.isArray(raw.parents)?raw.parents.filter((v:any)=>typeof v==="string").slice(0,2):[],xp:Math.max(0,finiteNumber(raw.xp,0)),bond:Math.max(0,finiteNumber(raw.bond,0)),genes:normalizeGenes(raw.genes),aptitude:boundedInt(raw.aptitude,1,1,5),care:normalizeCare(raw.care),activeKnacks:Array.isArray(raw.activeKnacks)?raw.activeKnacks.filter((k:any)=>validKnacks.has(k)).slice(-3):[]};}
function normalizeEgg(raw:any):PetEgg|null{if(!raw||typeof raw.id!=="string"||!validPetSpecies.has(raw.speciesId))return null;const createdAt=Math.max(0,finiteNumber(raw.createdAt,Date.now()));return {id:raw.id.slice(0,80),speciesId:raw.speciesId,readyAt:Math.max(createdAt,finiteNumber(raw.readyAt,createdAt)),createdAt,source:typeof raw.source==="string"?raw.source.slice(0,160):"garden nest",odds:Math.max(1,finiteNumber(raw.odds,1)),geneSeed:finiteNumber(raw.geneSeed,Math.random()*1e9),parents:Array.isArray(raw.parents)?raw.parents.filter((v:any)=>typeof v==="string").slice(0,2):[],generation:boundedInt(raw.generation,1,1,9999)};}
function normalizeSpeciesRecord(raw:any){const out:Partial<Record<PetSpeciesId,number>>={};if(raw&&typeof raw==="object")for(const [key,value] of Object.entries(raw))if(validPetSpecies.has(key as PetSpeciesId))out[key as PetSpeciesId]=Math.max(0,finiteNumber(value,0));return out;}
export function normalizePetSave(raw:unknown,now=Date.now()):PetSave{
  const base=emptyPetSave(now);if(!raw||typeof raw!=="object")return base;const saved=raw as any;
  const pets=(Array.isArray(saved.pets)?saved.pets:[]).map(normalizePet).filter(Boolean) as Gardenkin[];
  const petIds=new Set(pets.map(p=>p.id));
  const eggs=(Array.isArray(saved.eggs)?saved.eggs:[]).map(normalizeEgg).filter(Boolean).slice(0,4) as PetEgg[];
  const discovered=(Array.isArray(saved.discovered)?saved.discovered:[]).filter((id:any)=>validPetSpecies.has(id));
  let visitor:Visitor|null=null;if(saved.visitor&&validPetSpecies.has(saved.visitor.speciesId)){const arrivedAt=Math.max(0,finiteNumber(saved.visitor.arrivedAt,now));visitor={speciesId:saved.visitor.speciesId,arrivedAt,leavesAt:Math.max(arrivedAt,finiteNumber(saved.visitor.leavesAt,arrivedAt)),visits:boundedInt(saved.visitor.visits,1,1,99999),trust:Math.max(0,finiteNumber(saved.visitor.trust,0)),greeted:Boolean(saved.visitor.greeted),offered:Boolean(saved.visitor.offered)};}
  const activePetId=typeof saved.activePetId==="string"&&petIds.has(saved.activePetId)?saved.activePetId:(pets[0]?.id??null);
  const selectedPetId=typeof saved.selectedPetId==="string"&&petIds.has(saved.selectedPetId)?saved.selectedPetId:activePetId;
  return {...base,...saved,version:1,pets,activePetId,selectedPetId,eggs,discovered:[...new Set(discovered)] as PetSpeciesId[],visitor,nextVisitorAt:Math.max(now,finiteNumber(saved.nextVisitorAt,base.nextVisitorAt)),lurePlant:typeof saved.lurePlant==="string"?saved.lurePlant:null,rarePity:Math.max(0,finiteNumber(saved.rarePity,0)),nestMisses:boundedInt(saved.nestMisses,0,0,100000),visitorTrust:normalizeSpeciesRecord(saved.visitorTrust),visitorVisits:normalizeSpeciesRecord(saved.visitorVisits)};
}
export function loadPetSave(): PetSave {
  if (typeof window==="undefined") return emptyPetSave();
  try { const raw=localStorage.getItem(PET_SAVE_KEY); return raw?normalizePetSave(JSON.parse(raw)):emptyPetSave(); }
  catch { return emptyPetSave(); }
}''', 'pet save normalizer')
replace('app/petSystem.ts', 'export function maybeFindNest(save:PetSave,stage:number):{save:PetSave;found:PetEgg|null}{\n  const active=save.pets.find(p=>p.id===save.activePetId);', 'export function maybeFindNest(save:PetSave,stage:number):{save:PetSave;found:PetEgg|null}{\n  if(save.eggs.length>=4)return {save,found:null};\n  const active=save.pets.find(p=>p.id===save.activePetId);', 'full nest guard')
replace('app/petSystem.ts', '  return {save:{...save,eggs:[...save.eggs,egg].slice(-4),nestMisses:0},found:egg};', '  return {save:{...save,eggs:[...save.eggs,egg],nestMisses:0},found:egg};', 'nonlossy nest append')
replace('app/petSystem.ts', 'export function petAssistEvery(pet:Gardenkin){ const level=levelForPet(pet); let every=Math.max(9,23-Math.floor(level/7)-Math.floor(pet.aptitude/2)); if(pet.activeKnacks.includes("quickpaws"))every=Math.max(7,Math.floor(every*.88)); return every; }', 'export function petAssistEvery(pet:Gardenkin){ const level=levelForPet(pet); let every=Math.max(9,23-Math.floor(level/7)-Math.floor(pet.aptitude/2)); if(pet.activeKnacks.includes("quickpaws"))every=Math.max(7,Math.floor(every*.88)); return every; }\nexport function petChargeGain(pet:Gardenkin,restoredCount:number,moundCount=0){return Math.max(0,restoredCount)+(pet.activeKnacks.includes("moundwise")?Math.max(0,moundCount)*2:0);}', 'moundwise implementation')

# Shimeji source attribution + plot-reset bug + reduced-motion functionality.
replace('app/FieldPetActor.tsx', '  petAssistEvery,\n  savePetSave,', '  petAssistEvery,\n  petChargeGain,\n  savePetSave,', 'charge helper import')
replace('app/FieldPetActor.tsx', '  const syntheticPoke=useRef(false);\n  const petEffectUntil=useRef(0);\n  const lastAmbientPoke=useRef(0);', '  const petRestoreCells=useRef(new Set<string>());\n  const trackingPlot=useRef<string|null>(null);\n  const lastAmbientPoke=useRef(0);', 'exact pet attribution refs')
replace('app/FieldPetActor.tsx', r'''  function activateCell(button:HTMLButtonElement,index:number){
    if(button.dataset.restored==="true")return;
    syntheticPoke.current=true;
    petEffectUntil.current=Date.now()+850;
    try{
      button.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:120+index,pointerType:"mouse"}));
      button.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:120+index,pointerType:"mouse"}));
    }finally{
      window.setTimeout(()=>{syntheticPoke.current=false;},0);
    }
  }''', r'''  function activateCell(button:HTMLButtonElement,index:number){
    if(button.dataset.restored==="true")return;
    const cell=Number(button.dataset.cell??index);
    if(Number.isInteger(cell))window.dispatchEvent(new CustomEvent("stillgarden-pet-restore",{detail:{index:cell}}));
  }''', 'actor custom event')
replace('app/FieldPetActor.tsx', '    const down=(event:PointerEvent)=>{\n      if(syntheticPoke.current)return;\n      const target=event.target;', '    const down=(event:PointerEvent)=>{\n      const target=event.target;', 'pointer down isolation')
replace('app/FieldPetActor.tsx', '    const up=()=>{\n      if(syntheticPoke.current)return;\n      if(!playerDragging.current)return;', '    const up=()=>{\n      if(!playerDragging.current)return;', 'pointer up isolation')
replace('app/FieldPetActor.tsx', '  useEffect(()=>{\n    if(!pet||reduceMotion)return;', '  useEffect(()=>{\n    if(!pet)return;', 'reduced motion functionality')
replace('app/FieldPetActor.tsx', r'''  useEffect(()=>{
    seen.current.clear();charge.current=0;completedKey.current=null;lastAmbientPoke.current=0;
    const seed=window.setTimeout(()=>document.querySelectorAll<HTMLElement>("[data-cell][data-restored='true']").forEach(el=>seen.current.add(el.dataset.cell||"")),180);
    const observer=new MutationObserver(mutations=>{
      let newest:number|null=null,changed=0,playerGained=0;
      const petCaused=Date.now()<=petEffectUntil.current;
      for(const mutation of mutations){
        if(mutation.type!=="attributes"||mutation.attributeName!=="data-restored")continue;
        const el=mutation.target as HTMLElement;if(el.dataset.restored!=="true")continue;
        const key=el.dataset.cell||"";if(seen.current.has(key))continue;
        seen.current.add(key);newest=Number(key);changed++;
        if(!petCaused&&!assisting.current)playerGained++;
      }
      const save=loadPetSave(),current=activePet(save);if(!current||!changed)return;
      let next=save;
      if(playerGained>0){
        next=addPetProgress(save,current.id,playerGained,playerGained*.09,"tend");savePetSave(next);
        charge.current+=playerGained;const refreshed=activePet(next);
        if(refreshed&&charge.current>=petAssistEvery(refreshed)){charge.current=0;void runAssist(newest??0,refreshed)}
      }''', r'''  useEffect(()=>{
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
      }''', 'actor reset and attribution')
replace('app/FieldPetActor.tsx', '    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["data-restored"]});\n    return()=>{window.clearTimeout(seed);observer.disconnect();sequence.current++;stopMotion()};', '    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["data-restored"]});\n    return()=>{window.clearTimeout(seed);window.removeEventListener("stillgarden-pet-restored",petRestored);observer.disconnect();sequence.current++;stopMotion()};', 'actor cleanup')
replace('app/FieldPetActor.tsx', '<motion.div className={styles.actorMover} aria-hidden="true"', '<motion.div className={styles.actorMover} data-testid="gardenkin-field-actor" aria-hidden="true"', 'actor test hook')

# Visitor offering pagination.
replace('app/pets/page.tsx', '  const [rosterPage,setRosterPage]=useState(0),[guidePage,setGuidePage]=useState(0),[parentA,setParentA]=useState(""),[parentB,setParentB]=useState("");', '  const [rosterPage,setRosterPage]=useState(0),[guidePage,setGuidePage]=useState(0),[offerPage,setOfferPage]=useState(0),[parentA,setParentA]=useState(""),[parentB,setParentB]=useState("");', 'visitor page state')
replace('app/pets/page.tsx', '  const rosterPages=Math.max(1,Math.ceil(save.pets.length/6)),roster=save.pets.slice(rosterPage*6,rosterPage*6+6),guidePages=Math.ceil(petSpecies.length/8),guide=petSpecies.slice(guidePage*8,guidePage*8+8);', '  const rosterPages=Math.max(1,Math.ceil(save.pets.length/6)),roster=save.pets.slice(rosterPage*6,rosterPage*6+6),guidePages=Math.ceil(petSpecies.length/8),guide=petSpecies.slice(guidePage*8,guidePage*8+8);\n  const offerPages=Math.max(1,Math.ceil(harvested.length/8)),shownOfferings=harvested.slice(offerPage*8,offerPage*8+8);\n  useEffect(()=>{if(offerPage>=offerPages)setOfferPage(Math.max(0,offerPages-1));},[offerPage,offerPages]);', 'visitor pagination calc')
replace('app/pets/page.tsx', '<div className={styles.offerList}>{harvested.length?harvested.slice(0,8).map(item=>', '<div className={styles.offerList}>{harvested.length?shownOfferings.map(item=>', 'visitor page data')
replace('app/pets/page.tsx', '</div>{save.visitor&&<div className={styles.affinityHint}>Favourite plants are learned by trying. A favourite offering gives twice the trust.</div>}</div></section>}', '</div>{offerPages>1&&<div className={styles.offerPager}><button disabled={offerPage<=0} onClick={()=>setOfferPage(p=>Math.max(0,p-1))}>earlier offerings</button><span>{offerPage+1}/{offerPages}</span><button disabled={offerPage>=offerPages-1} onClick={()=>setOfferPage(p=>Math.min(offerPages-1,p+1))}>later offerings</button></div>}{save.visitor&&<div className={styles.affinityHint}>Favourite plants are learned by trying. A favourite offering gives twice the trust.</div>}</div></section>}', 'visitor pager controls')
css = read('app/pets/pets.module.css')
if '.offerPager{' not in css:
    write('app/pets/pets.module.css', css + '\n.offerPager{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding-top:7px;border-top:1px dashed rgba(69,56,42,.2);font-size:10px}.offerPager button{border:0;background:transparent;color:#50483c;font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.offerPager button:disabled{opacity:.28;cursor:default}.offerPager span{color:#817667;font-variant-numeric:tabular-nums}\n')

# Package and configs.
pkg = json.loads(read('package.json'))
pkg.setdefault('scripts', {}).update({'test:unit':'vitest run','test:e2e':'playwright test','test':'npm run test:unit'})
pkg.setdefault('devDependencies', {}).update({'@playwright/test':'^1.55.0','vitest':'^3.2.4'})
write('package.json', json.dumps(pkg, indent=2) + '\n')

write('playwright.config.ts', r'''import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir:"./tests/e2e",fullyParallel:false,workers:1,retries:0,timeout:35_000,
  expect:{timeout:7_000},
  use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure",screenshot:"only-on-failure",video:"retain-on-failure"},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
  webServer:{command:"npm start",url:"http://127.0.0.1:3000",reuseExistingServer:false,timeout:120_000}
});
''')

write('tests/unit/gameRules.test.ts', r'''import { describe,expect,it } from "vitest";
import { activeCellsFor,chooseShapeId,fieldShapes,keeperThreshold,potUpgradeCost,toolUpgradeCost,viewportKind } from "../../app/gameRules";

describe("field geometry invariants",()=>{
  for(const shape of Object.values(fieldShapes))it(shape.id+" is valid and connected",()=>{
    const active=activeCellsFor(shape);expect(active.length).toBeGreaterThan(20);expect(new Set(active).size).toBe(active.length);
    for(const cell of active){expect(cell).toBeGreaterThanOrEqual(0);expect(cell).toBeLessThan(shape.cols*shape.rows);}
    const set=new Set(active),seen=new Set<number>(),queue=[active[0]];
    while(queue.length){const n=queue.shift()!;if(seen.has(n))continue;seen.add(n);const r=Math.floor(n/shape.cols),c=n%shape.cols;for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){const rr=r+dr,cc=c+dc,v=rr*shape.cols+cc;if(rr>=0&&rr<shape.rows&&cc>=0&&cc<shape.cols&&set.has(v)&&!seen.has(v))queue.push(v);}}
    expect(seen.size).toBe(active.length);
  });
  it("classifies common viewports",()=>{expect(viewportKind(390,844)).toBe("portrait");expect(viewportKind(900,900)).toBe("balanced");expect(viewportKind(1366,768)).toBe("landscape");});
  it("chooses defined shapes for 1000 gardens",()=>{for(const kind of ["portrait","balanced","landscape"] as const)for(let stage=1;stage<=1000;stage++)expect(fieldShapes[chooseShapeId(kind,stage)]).toBeTruthy();});
});

describe("progression invariants",()=>{
  it("keeper thresholds strictly increase",()=>{let prev=-1;for(let level=1;level<=100;level++){const value=keeperThreshold(level);expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThan(prev);prev=value;}});
  it("tool and pot costs increase",()=>{for(let level=1;level<12;level++)expect(toolUpgradeCost(level+1,220)).toBeGreaterThan(toolUpgradeCost(level,220));for(let pots=2;pots<8;pots++)expect(potUpgradeCost(pots+1)).toBeGreaterThan(potUpgradeCost(pots));});
});
''')

write('tests/unit/petSystem.test.ts', r'''import { describe,expect,it } from "vitest";
import { bondTier,canBreed,createPet,emptyPetSave,hatchEgg,levelForPet,maybeFindNest,normalizePetSave,petAssistEvery,petChargeGain,petSpecies,toggleKnack,visitorTrustNeeded,type PetEgg } from "../../app/petSystem";
const egg=(id:string):PetEgg=>({id,speciesId:"mossbun",readyAt:0,createdAt:0,source:"test",odds:10,geneSeed:1,parents:[],generation:1});

describe("Gardenkin invariants",()=>{
  it("has unique species and valid hybrid parents",()=>{const ids=petSpecies.map(s=>s.id),set=new Set(ids);expect(set.size).toBe(ids.length);for(const sp of petSpecies)if("hybridOf" in sp&&sp.hybridOf)for(const parent of sp.hybridOf)expect(set.has(parent)).toBe(true);});
  it("generated genes and aptitude remain in range",()=>{for(let i=0;i<100;i++){const p=createPet("mossbun",{seed:i+1});expect(p.aptitude).toBeGreaterThanOrEqual(1);expect(p.aptitude).toBeLessThanOrEqual(5);expect(p.genes.coat).toBeGreaterThanOrEqual(0);expect(p.genes.coat).toBeLessThan(12);expect(p.genes.size).toBeGreaterThanOrEqual(0);expect(p.genes.size).toBeLessThan(7);}});
  it("caps level and bond",()=>{const p=createPet("mossbun",{seed:2});p.xp=1e12;p.bond=1e12;expect(levelForPet(p)).toBe(60);expect(bondTier(p)).toBe(10);});
  it("equips at most three unlocked knacks",()=>{let save=emptyPetSave();const p=createPet("mossbun",{seed:3});p.xp=1e12;save={...save,pets:[p],activePetId:p.id,selectedPetId:p.id};for(const k of ["quickpaws","moundwise","seednose","softstep"] as const)save=toggleKnack(save,p.id,k);expect(save.pets[0].activeKnacks).toHaveLength(3);});
  it("implements Moundwise assist charge",()=>{const p=createPet("mossbun",{seed:4});expect(petChargeGain(p,3,1)).toBe(3);p.activeKnacks=["moundwise"];expect(petChargeGain(p,3,1)).toBe(5);});
  it("keeps Quick Paws bounded",()=>{const p=createPet("mossbun",{seed:5});p.xp=1e12;p.aptitude=5;const normal=petAssistEvery(p);p.activeKnacks=["quickpaws"];expect(petAssistEvery(p)).toBeLessThanOrEqual(normal);expect(petAssistEvery(p)).toBeGreaterThanOrEqual(7);});
  it("normalizes malformed saves",()=>{const raw:any={pets:[{id:"x",speciesId:"mossbun",name:"",xp:Infinity,bond:-5,genes:{coat:99},care:{},aptitude:99,activeKnacks:["bad","quickpaws"]},{id:"bad",speciesId:"not-real"}],activePetId:"missing",eggs:[{id:"e",speciesId:"mossbun",readyAt:NaN}],discovered:["mossbun","bad"]};const save=normalizePetSave(raw,1000);expect(save.pets).toHaveLength(1);expect(save.pets[0].xp).toBe(0);expect(save.pets[0].aptitude).toBe(5);expect(save.pets[0].genes.coat).toBe(11);expect(save.activePetId).toBe("x");expect(save.discovered).toEqual(["mossbun"]);});
});

describe("nests and lineage",()=>{
  it("never overwrites an egg at full capacity",()=>{const save={...emptyPetSave(),eggs:[egg("1"),egg("2"),egg("3"),egg("4")],nestMisses:7};const result=maybeFindNest(save,999);expect(result.found).toBeNull();expect(result.save.eggs.map(e=>e.id)).toEqual(["1","2","3","4"]);expect(result.save.nestMisses).toBe(7);});
  it("respects hatch time and lineage",()=>{const parent=createPet("mossbun",{seed:7});const e={...egg("ready"),readyAt:2000,parents:[parent.id],generation:2};const save={...emptyPetSave(),pets:[parent],eggs:[e]};expect(hatchEgg(save,e.id,1500).pet).toBeNull();const out=hatchEgg(save,e.id,2500);expect(out.pet?.generation).toBe(2);expect(out.pet?.parents).toEqual([parent.id]);expect(out.save.eggs).toHaveLength(0);});
  it("requires distinct mature bonded parents",()=>{const a=createPet("mossbun",{seed:8}),b=createPet("rainfinch",{seed:9});expect(canBreed(a,b)).toBe(false);a.xp=b.xp=1e12;a.bond=b.bond=500;expect(canBreed(a,b)).toBe(true);expect(canBreed(a,a)).toBe(false);});
  it("visitor trust requirements rise with rarity",()=>{for(let r=1;r<6;r++)expect(visitorTrustNeeded((r+1) as any)).toBeGreaterThan(visitorTrustNeeded(r as any));});
});
''')

write('tests/e2e/stillgarden.spec.ts', r'''import { expect,test,type Page } from "@playwright/test";
import { activeCellsFor,fieldShapes,type ShapeId } from "../../app/gameRules";
const mainKey="stillgarden-v4",petKey="stillgarden-gardenkin-v1";
const basePet=(overrides:any={})=>({id:"pet-test",speciesId:"mossbun",name:"Testbun",bornAt:Date.now(),generation:1,parents:[],xp:0,bond:0,genes:{coat:2,accent:2,pattern:1,ears:1,tail:1,bloom:1,size:3,lustre:"plain"},aptitude:5,care:{tend:0,cuddle:0,forage:0,grow:0},activeKnacks:[],...overrides});
const petSave=(pet:any=basePet())=>({version:1,pets:[pet],activePetId:pet.id,selectedPetId:pet.id,eggs:[],discovered:[pet.speciesId],visitor:null,nextVisitorAt:Date.now()+1e9,lurePlant:null,rarePity:0,nestMisses:0,visitorTrust:{},visitorVisits:{}});
async function seed(page:Page,main:any=null,pets:any=null,path="/"){await page.goto(path);await page.evaluate(([m,p])=>{localStorage.clear();if(m)localStorage.setItem("stillgarden-v4",JSON.stringify(m));if(p)localStorage.setItem("stillgarden-gardenkin-v1",JSON.stringify(p));},[main,pets]);await page.reload();}
async function savedMain(page:Page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)||"null"),mainKey);}
async function savedPets(page:Page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)||"null"),petKey);}

test.beforeEach(async({page})=>{const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});(page as any).__errors=errors;});
test.afterEach(async({page})=>{expect((page as any).__errors).toEqual([]);});

test("locks scrolling and fits the board on phone tablet and desktop",async({page})=>{for(const size of [{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:1366,height:768}]){await page.setViewportSize(size);await seed(page);await expect(page.getByTestId("garden-board")).toBeVisible();const m=await page.evaluate(()=>{const b=document.querySelector('[data-testid="garden-board"]')!.getBoundingClientRect();return{sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,w:innerWidth,h:innerHeight,left:b.left,top:b.top,right:b.right,bottom:b.bottom};});expect(m.sw).toBeLessThanOrEqual(m.w+1);expect(m.sh).toBeLessThanOrEqual(m.h+1);expect(m.left).toBeGreaterThanOrEqual(0);expect(m.top).toBeGreaterThanOrEqual(0);expect(m.right).toBeLessThanOrEqual(m.w+1);expect(m.bottom).toBeLessThanOrEqual(m.h+1);}});

test("renders every irregular field geometry inside the viewport",async({page})=>{await page.setViewportSize({width:900,height:800});for(const id of Object.keys(fieldShapes) as ShapeId[]){await seed(page,{stage:1,shapeId:id,restored:[]});expect(await page.locator("button[data-cell]").count()).toBe(activeCellsFor(fieldShapes[id]).length);const b=await page.getByTestId("garden-board").boundingBox();expect(b).not.toBeNull();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.y).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(901);expect(b!.y+b!.height).toBeLessThanOrEqual(801);}});

test("bumps and roots perform their actual mechanics",async({page})=>{await seed(page,{stage:1,shapeId:"classic",restored:[]});await page.locator('button[data-bump="true"][data-restored="false"]').first().click();expect(await page.locator('button[data-restored="true"]').count()).toBeGreaterThan(1);await seed(page,{stage:4,shapeId:"classic",restored:[],crackedRoots:[]});const root=page.locator('button[data-special="roots"]').first();await root.click();await expect(root).toHaveAttribute("data-cracked","true");await expect(root).toHaveAttribute("data-restored","false");await root.click();await expect(root).toHaveAttribute("data-restored","true");});

test("completion advances to a clean persistent next plot",async({page})=>{const active=activeCellsFor(fieldShapes.classic);await seed(page,{stage:1,shapeId:"classic",restored:active.slice(0,-1),completedGardens:0,lifetimeRestored:active.length-1});await page.locator('button[data-cell="'+active[active.length-1]+'"]' ).click();await expect(page.getByText("plot 2")).toBeVisible({timeout:5000});const state=await savedMain(page);expect(state.stage).toBe(2);expect(state.completedGardens).toBe(1);expect(state.restored).toEqual([]);await page.reload();await expect(page.getByText("plot 2")).toBeVisible();});

test("Growhouse planting watering fertilizing harvesting and tools mutate correctly",async({page})=>{const ready=Date.now()-1000;await seed(page,{stage:1,shapeId:"classic",dew:10000,seeds:{clover:4,fern:1},fertilizer:2,plots:[{species:"clover",plantedAt:ready-10000,readyAt:ready,watered:false,fertilized:false}]});await page.getByRole("button",{name:"grow"}).click();await page.getByRole("button",{name:"harvest"}).click();let state=await savedMain(page);expect(state.harvested.clover).toBe(1);expect(state.seeds.clover).toBe(5);await page.getByRole("button",{name:/Cloud Clover/}).first().click();state=await savedMain(page);expect(state.seeds.clover).toBe(4);await page.getByRole("button",{name:"water"}).click();await page.getByRole("button",{name:/feed/}).click();state=await savedMain(page);expect(state.plots[0].watered).toBe(true);expect(state.plots[0].fertilized).toBe(true);expect(state.fertilizer).toBe(1);await page.getByRole("button",{name:"tools + crossing"}).click();await page.getByRole("button",{name:"260 Dew"}).click();state=await savedMain(page);expect(state.shovelLevel).toBe(2);});

test("journal clamps after phone-to-desktop resize",async({page})=>{await page.setViewportSize({width:390,height:844});await seed(page,{stage:1,shapeId:"classic"});await page.getByRole("button",{name:"journal"}).click();for(let i=0;i<25;i++){const later=page.getByRole("button",{name:/later/});if(await later.isEnabled())await later.click();}await page.setViewportSize({width:900,height:800});await expect(page.getByTestId("journal-book").locator("article")).toHaveCount(2);const text=await page.getByTestId("journal-controls").locator("span").textContent();const parts=(text||"").split("/").map(v=>Number(v.trim()));expect(parts[0]).toBeLessThanOrEqual(parts[1]);});

test("malformed main save is normalized without crashing",async({page})=>{await seed(page,{stage:null,dew:null,shapeId:"classic",plots:[{species:"not-real",readyAt:null}],discoveryLog:{clover:{at:null,source:42}},seeds:{clover:null}});await page.getByRole("button",{name:"grow"}).click();await expect(page.getByText("empty pot").first()).toBeVisible();await page.getByRole("button",{name:"journal"}).click();await expect(page.getByTestId("journal-book")).toBeVisible();const state=await savedMain(page);expect(Number.isFinite(state.dew)).toBe(true);expect(state.plots[0].species).toBeNull();});

test("Gardenkin starter rename active companion and guide persist",async({page})=>{await seed(page,null,null,"/pets");await page.getByRole("button",{name:/Mossbun/}).click();await expect(page.getByText("companion record")).toBeVisible();await page.getByRole("button",{name:"rename"}).click();const input=page.locator('input[name="name"]');await input.fill("Juniper");await page.getByRole("button",{name:"keep name"}).click();await expect(page.getByRole("heading",{name:"Juniper"})).toBeVisible();expect((await savedPets(page)).pets[0].name).toBe("Juniper");await page.getByRole("button",{name:"guide"}).click();await expect(page.getByText(/species recorded/)).toBeVisible();});

test("visitor inventory exposes late harvested plants",async({page})=>{const harvested:any={};for(const id of ["clover","fern","poppy","rainmint","moonbell","sunreed","embermoss","pearlgrass","frostvine","blushcap"])harvested[id]=1;await seed(page,{stage:200,completedGardens:199,shapeId:"classic",harvested},petSave(),"/pets");await page.getByRole("button",{name:"visitors"}).click();await expect(page.getByRole("button",{name:"later offerings"})).toBeVisible();await page.getByRole("button",{name:"later offerings"}).click();await expect(page.getByText("Frost Vine")).toBeVisible();await expect(page.getByText("Blush Cap")).toBeVisible();});

test("pet bridge restores soil without resetting player flow",async({page})=>{await seed(page,{stage:1,shapeId:"classic",restored:[]},petSave());await expect(page.getByTestId("gardenkin-field-actor")).toBeVisible();await page.evaluate(()=>window.dispatchEvent(new CustomEvent("stillgarden-pet-restore",{detail:{index:0}})));await expect(page.locator('button[data-cell="0"]')).toHaveAttribute("data-restored","true");await expect(page.getByTestId("garden-board")).toHaveAttribute("data-dragging","false");await expect(page.getByText(/^flow 0$/)).toBeVisible();});

test("pet XP tracking survives a completed plot",async({page})=>{const active=activeCellsFor(fieldShapes.classic);await seed(page,{stage:1,shapeId:"classic",restored:active.slice(0,-1),completedGardens:0,lifetimeRestored:active.length-1},petSave());await page.locator('button[data-cell="'+active[active.length-1]+'"]' ).click();await expect(page.getByText("plot 2")).toBeVisible({timeout:5000});const before=(await savedPets(page)).pets[0].xp;await page.locator('button[data-restored="false"]').first().click();await page.waitForTimeout(400);const after=(await savedPets(page)).pets[0].xp;expect(after).toBeGreaterThan(before);});

test("reduced motion keeps functional pet assistance",async({page})=>{await page.emulateMedia({reducedMotion:"reduce"});const pet=basePet({xp:1e12,activeKnacks:["quickpaws"]});await seed(page,{stage:1,shapeId:"classic",restored:[]},petSave(pet));for(let i=0;i<14;i++){const cell=page.locator('button[data-restored="false"]').first();if(await cell.count())await cell.click();}const immediate=await page.locator('button[data-restored="true"]').count();await page.waitForTimeout(1700);const later=await page.locator('button[data-restored="true"]').count();expect(later).toBeGreaterThan(immediate);});
''')

write('.github/workflows/build.yml', '''name: Build and verify

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run test:unit
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
''')

# Remove one-shot bootstrap machinery from the resulting branch commit.
for path in ['scripts/apply-audit-fixes.mjs','scripts/apply_audit_fixes.py','.github/workflows/audit-patch.yml']:
    p=Path(path)
    if p.exists(): p.unlink()
