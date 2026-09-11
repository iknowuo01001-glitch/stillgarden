import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, content) => { fs.mkdirSync(path.split("/").slice(0,-1).join("/"), { recursive:true }); fs.writeFileSync(path, content); };
const replace = (path, from, to, label) => {
  const source = read(path);
  if (!source.includes(from)) throw new Error(`Patch marker not found (${label}) in ${path}`);
  write(path, source.replace(from, to));
};

// --- Main game: harden saves, create a direct pet->garden bridge, and clamp book pages. ---
replace("app/page.tsx",
`  const seeds = emptySeeds();
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
  const plots = Array.from({ length: MAX_POTS }, (_, i) => saved.plots?.[i] ?? emptyPlot());`,
`  const finite = (value: unknown, fallback: number) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };
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
  }`,
"normalize state primitives");

replace("app/page.tsx",
`    dew: Math.max(0, Number(saved.dew) || 0),`,
`    dew: Math.max(0, finite(saved.dew, 0)),`,
"finite dew");
replace("app/page.tsx",
`    discoveryLog: saved.discoveryLog ?? {},
    plots,
    potsUnlocked: Math.min(MAX_POTS, Math.max(2, Number(saved.potsUnlocked) || 2)),
    shovelLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Number(saved.shovelLevel) || 1)),
    waterLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Number(saved.waterLevel) || 1)),
    fertilizer: Math.max(0, Number(saved.fertilizer) || 0),`,
`    discoveryLog,
    plots,
    potsUnlocked: Math.min(MAX_POTS, Math.max(2, Math.floor(finite(saved.potsUnlocked, 2)))),
    shovelLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Math.floor(finite(saved.shovelLevel, 1)))),
    waterLevel: Math.min(MAX_TOOL_LEVEL, Math.max(1, Math.floor(finite(saved.waterLevel, 1)))),
    fertilizer: Math.max(0, Math.floor(finite(saved.fertilizer, 0))),`,
"normalize game counters");

replace("app/page.tsx",
`  function restoreCell(index: number) {
    const result = applyRestore(gameRef.current, index);
    if (!result.changed) return;
    commit(result.state);
    if (result.message) showFeedback(result.message);
    if (result.finds.length) presentDiscovery(result.finds[result.finds.length - 1]);
    else if (result.glimmerCount) showFeedback(\`glimmer · +\${result.glimmerCount * GLIMMER_BONUS} Dew\`);
    if (result.restoredCount > 0) {
      flowRef.current += result.restoredCount;
      setFlow(flowRef.current);
      for (const threshold of [16, 32, 48]) if (flowRef.current >= threshold && !flowMilestones.current.has(threshold)) { flowMilestones.current.add(threshold); growthPulse(threshold === 16 ? 6 : threshold === 32 ? 10 : 15); }
    }
  }
`,
`  function restoreCell(index: number, source: "player" | "pet" = "player") {
    const before = gameRef.current;
    const result = applyRestore(before, index);
    if (!result.changed) return;
    commit(result.state);
    if (result.message) showFeedback(result.message);
    if (result.finds.length) presentDiscovery(result.finds[result.finds.length - 1]);
    else if (result.glimmerCount) showFeedback(\`glimmer · +\${result.glimmerCount * GLIMMER_BONUS} Dew\`);
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
`,
"direct pet restore bridge");

replace("app/page.tsx",
`  const journalEntries = species.slice(journalPage * journalPerPage, journalPage * journalPerPage + journalPerPage);

  return <main`,
`  const journalEntries = species.slice(journalPage * journalPerPage, journalPage * journalPerPage + journalPerPage);
  useEffect(() => { if (journalPage > journalMaxPage) setJournalPage(journalMaxPage); }, [journalPage, journalMaxPage]);

  return <main`,
"journal page clamp");
replace("app/page.tsx",
`<div className={styles.book} data-single={journalPerPage === 1 ? "true" : "false"}>`,
`<div className={styles.book} data-testid="journal-book" data-single={journalPerPage === 1 ? "true" : "false"}>`,
"journal test id");
replace("app/page.tsx",
`<div className={styles.bookControls}><button disabled={journalPage === 0}`,
`<div className={styles.bookControls} data-testid="journal-controls"><button disabled={journalPage === 0}`,
"journal controls test id");
replace("app/page.tsx",
`<div className={\`${styles.board} \${complete ? styles.complete : ""}\`} data-mode={mode.id}`,
`<div className={\`${styles.board} \${complete ? styles.complete : ""}\`} data-testid="garden-board" data-mode={mode.id}`,
"board test id");

// --- Pet engine: normalize persisted data, make nest capacity lossless, and expose testable assist-charge semantics. ---
replace("app/petSystem.ts",
`export function loadPetSave(): PetSave {
  if (typeof window==="undefined") return emptyPetSave();
  try {
    const raw=localStorage.getItem(PET_SAVE_KEY); if(!raw) return emptyPetSave(); const saved=JSON.parse(raw) as Partial<PetSave>;
    return { ...emptyPetSave(), ...saved, pets:Array.isArray(saved.pets)?saved.pets:[], eggs:Array.isArray(saved.eggs)?saved.eggs:[], discovered:Array.isArray(saved.discovered)?saved.discovered:[], visitorTrust:saved.visitorTrust??{}, visitorVisits:saved.visitorVisits??{} };
  } catch { return emptyPetSave(); }
}`,
`const validPetSpecies = new Set<PetSpeciesId>(petSpecies.map((s)=>s.id));
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
}`,
"normalize pet saves");

replace("app/petSystem.ts",
`export function maybeFindNest(save:PetSave,stage:number):{save:PetSave;found:PetEgg|null}{
  const active=save.pets.find(p=>p.id===save.activePetId);`,
`export function maybeFindNest(save:PetSave,stage:number):{save:PetSave;found:PetEgg|null}{
  if(save.eggs.length>=4)return {save,found:null};
  const active=save.pets.find(p=>p.id===save.activePetId);`,
"protect full nest");
replace("app/petSystem.ts",
`  return {save:{...save,eggs:[...save.eggs,egg].slice(-4),nestMisses:0},found:egg};`,
`  return {save:{...save,eggs:[...save.eggs,egg],nestMisses:0},found:egg};`,
"no lossy egg slice");
replace("app/petSystem.ts",
`export function petAssistEvery(pet:Gardenkin){ const level=levelForPet(pet); let every=Math.max(9,23-Math.floor(level/7)-Math.floor(pet.aptitude/2)); if(pet.activeKnacks.includes("quickpaws"))every=Math.max(7,Math.floor(every*.88)); return every; }`,
`export function petAssistEvery(pet:Gardenkin){ const level=levelForPet(pet); let every=Math.max(9,23-Math.floor(level/7)-Math.floor(pet.aptitude/2)); if(pet.activeKnacks.includes("quickpaws"))every=Math.max(7,Math.floor(every*.88)); return every; }
export function petChargeGain(pet:Gardenkin,restoredCount:number,moundCount=0){return Math.max(0,restoredCount)+(pet.activeKnacks.includes("moundwise")?Math.max(0,moundCount)*2:0);}`,
"implement moundwise charge");

// --- Field actor: exact pet-source attribution, reset tracking between plots, and preserve mechanics under reduced motion. ---
replace("app/FieldPetActor.tsx",
`  petAssistEvery,
  savePetSave,`,
`  petAssistEvery,
  petChargeGain,
  savePetSave,`,
"import pet charge helper");
replace("app/FieldPetActor.tsx",
`  const syntheticPoke=useRef(false);
  const petEffectUntil=useRef(0);
  const lastAmbientPoke=useRef(0);`,
`  const petRestoreCells=useRef(new Set<string>());
  const trackingPlot=useRef<string|null>(null);
  const lastAmbientPoke=useRef(0);`,
"replace timed pet attribution");
replace("app/FieldPetActor.tsx",
`  function activateCell(button:HTMLButtonElement,index:number){
    if(button.dataset.restored==="true")return;
    syntheticPoke.current=true;
    petEffectUntil.current=Date.now()+850;
    try{
      button.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:120+index,pointerType:"mouse"}));
      button.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:120+index,pointerType:"mouse"}));
    }finally{
      window.setTimeout(()=>{syntheticPoke.current=false;},0);
    }
  }`,
`  function activateCell(button:HTMLButtonElement,index:number){
    if(button.dataset.restored==="true")return;
    const cell=Number(button.dataset.cell??index);
    if(Number.isInteger(cell))window.dispatchEvent(new CustomEvent("stillgarden-pet-restore",{detail:{index:cell}}));
  }`,
"pet custom restore event");
replace("app/FieldPetActor.tsx",
`    const down=(event:PointerEvent)=>{
      if(syntheticPoke.current)return;
      const target=event.target;`,
`    const down=(event:PointerEvent)=>{
      const target=event.target;`,
"remove synthetic pointer down guard");
replace("app/FieldPetActor.tsx",
`    const up=()=>{
      if(syntheticPoke.current)return;
      if(!playerDragging.current)return;`,
`    const up=()=>{
      if(!playerDragging.current)return;`,
"remove synthetic pointer up guard");
replace("app/FieldPetActor.tsx",
`  useEffect(()=>{
    if(!pet||reduceMotion)return;`,
`  useEffect(()=>{
    if(!pet)return;`,
"keep pet functionality in reduced motion");
replace("app/FieldPetActor.tsx",
`  useEffect(()=>{
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
      }`,
`  useEffect(()=>{
    seen.current.clear();petRestoreCells.current.clear();charge.current=0;completedKey.current=null;lastAmbientPoke.current=0;
    const readPlot=()=>document.body.textContent?.match(/plot\\s+(\\d+)/i)?.[1]??null;
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
      }`,
"reset/source-track pet progress");
replace("app/FieldPetActor.tsx",
`    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["data-restored"]});
    return()=>{window.clearTimeout(seed);observer.disconnect();sequence.current++;stopMotion()};`,
`    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["data-restored"]});
    return()=>{window.clearTimeout(seed);window.removeEventListener("stillgarden-pet-restored",petRestored);observer.disconnect();sequence.current++;stopMotion()};`,
"cleanup pet source listener");
replace("app/FieldPetActor.tsx",
`  return <motion.div className={styles.actorMover} aria-hidden="true" style={{x,y,opacity:actor.visible?1:0}}>`,
`  return <motion.div className={styles.actorMover} data-testid="gardenkin-field-actor" aria-hidden="true" style={{x,y,opacity:actor.visible?1:0}}>`,
"actor test id");

// --- Visitor inventory: paginate all harvested plants instead of hiding everything after the first eight. ---
replace("app/pets/page.tsx",
`  const [rosterPage,setRosterPage]=useState(0),[guidePage,setGuidePage]=useState(0),[parentA,setParentA]=useState(""),[parentB,setParentB]=useState("");`,
`  const [rosterPage,setRosterPage]=useState(0),[guidePage,setGuidePage]=useState(0),[offerPage,setOfferPage]=useState(0),[parentA,setParentA]=useState(""),[parentB,setParentB]=useState("");`,
"visitor offer page state");
replace("app/pets/page.tsx",
`  const rosterPages=Math.max(1,Math.ceil(save.pets.length/6)),roster=save.pets.slice(rosterPage*6,rosterPage*6+6),guidePages=Math.ceil(petSpecies.length/8),guide=petSpecies.slice(guidePage*8,guidePage*8+8);`,
`  const rosterPages=Math.max(1,Math.ceil(save.pets.length/6)),roster=save.pets.slice(rosterPage*6,rosterPage*6+6),guidePages=Math.ceil(petSpecies.length/8),guide=petSpecies.slice(guidePage*8,guidePage*8+8);
  const offerPages=Math.max(1,Math.ceil(harvested.length/8)),shownOfferings=harvested.slice(offerPage*8,offerPage*8+8);
  useEffect(()=>{if(offerPage>=offerPages)setOfferPage(Math.max(0,offerPages-1));},[offerPage,offerPages]);`,
"visitor offering page calculation");
replace("app/pets/page.tsx",
`<div className={styles.offerList}>{harvested.length?harvested.slice(0,8).map(item=>`,
`<div className={styles.offerList}>{harvested.length?shownOfferings.map(item=>`,
"show current visitor offer page");
replace("app/pets/page.tsx",
`</div>{save.visitor&&<div className={styles.affinityHint}>Favourite plants are learned by trying. A favourite offering gives twice the trust.</div>}</div></section>}`,
`</div>{offerPages>1&&<div className={styles.offerPager}><button disabled={offerPage<=0} onClick={()=>setOfferPage(p=>Math.max(0,p-1))}>earlier offerings</button><span>{offerPage+1}/{offerPages}</span><button disabled={offerPage>=offerPages-1} onClick={()=>setOfferPage(p=>Math.min(offerPages-1,p+1))}>later offerings</button></div>}{save.visitor&&<div className={styles.affinityHint}>Favourite plants are learned by trying. A favourite offering gives twice the trust.</div>}</div></section>}`,
"visitor offer pager");

fs.appendFileSync("app/pets/pets.module.css", `\n.offerPager{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding-top:7px;border-top:1px dashed rgba(69,56,42,.2);font-size:10px}.offerPager button{border:0;background:transparent;color:#50483c;font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.offerPager button:disabled{opacity:.28;cursor:default}.offerPager span{color:#817667;font-variant-numeric:tabular-nums}\n`);

// --- Durable regression suite. ---
const pkg=JSON.parse(read("package.json"));
pkg.scripts={...pkg.scripts,"test:unit":"vitest run","test:e2e":"playwright test","test":"npm run test:unit"};
pkg.devDependencies={...pkg.devDependencies,"@playwright/test":"^1.55.0","vitest":"^3.2.4"};
write("package.json",JSON.stringify(pkg,null,2)+"\n");

write("playwright.config.ts",`import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir:"./tests/e2e",fullyParallel:false,workers:1,retries:0,timeout:35_000,
  expect:{timeout:7_000},
  use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure",screenshot:"only-on-failure",video:"retain-on-failure"},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
  webServer:{command:"npm start",url:"http://127.0.0.1:3000",reuseExistingServer:false,timeout:120_000}
});
`);

write("tests/unit/gameRules.test.ts",`import { describe,expect,it } from "vitest";
import { activeCellsFor,chooseShapeId,fieldShapes,keeperThreshold,potUpgradeCost,toolUpgradeCost,viewportKind } from "../../app/gameRules";

describe("field geometry invariants",()=>{
  for(const shape of Object.values(fieldShapes))it(\`${"${shape.id}