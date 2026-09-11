export const PET_SAVE_KEY = "stillgarden-gardenkin-v1";
export const MAIN_SAVE_KEY = "stillgarden-v4";
export const PET_LEVEL_CAP = 60;

export type PetRarity = 1 | 2 | 3 | 4 | 5 | 6;
export type Lustre = "plain" | "dappled" | "shimmer" | "prismatic" | "eclipse";
export type Personality = "curious" | "gentle" | "busy" | "dreamy" | "bold" | "shy";

export const petSpecies = [
  { id:"mossbun", name:"Mossbun", rarity:1 as PetRarity, family:"leaf", body:"bun", unlockGarden:0, affinity:["clover","fern"], assist:"burst", signature:"Softstep", note:"Round, quiet and happiest beside fresh shoots." },
  { id:"dewmole", name:"Dewmole", rarity:1 as PetRarity, family:"earth", body:"mole", unlockGarden:0, affinity:["clover","poppy"], assist:"mound", signature:"Burrow Sense", note:"Listens for hollow ground with its whole face." },
  { id:"rainfinch", name:"Rainfinch", rarity:1 as PetRarity, family:"water", body:"bird", unlockGarden:0, affinity:["rainmint","fern"], assist:"line", signature:"Rain Skip", note:"A tiny garden bird that follows wet soil." },
  { id:"seedmouse", name:"Seedmouse", rarity:2 as PetRarity, family:"leaf", body:"mouse", unlockGarden:8, affinity:["poppy","clover"], assist:"random", signature:"Pocket Seeds", note:"Stores seeds in places it immediately forgets." },
  { id:"pebbletoad", name:"Pebbletoad", rarity:2 as PetRarity, family:"earth", body:"toad", unlockGarden:12, affinity:["fern","embermoss"], assist:"burst", signature:"Ground Thump", note:"Looks like a warm stone until it blinks." },
  { id:"brookotter", name:"Brookotter", rarity:2 as PetRarity, family:"water", body:"otter", unlockGarden:20, affinity:["rainmint","pearlgrass"], assist:"line", signature:"Brook Run", note:"Slides through a tended row just to do it again." },
  { id:"rootfox", name:"Rootfox", rarity:3 as PetRarity, family:"earth", body:"fox", unlockGarden:35, affinity:["embermoss","frostvine"], assist:"mound", signature:"Root Nose", note:"Its tail points toward disturbed soil before its nose does." },
  { id:"pollenbee", name:"Pollenbee", rarity:3 as PetRarity, family:"bloom", body:"bee", unlockGarden:45, affinity:["poppy","sunreed"], assist:"burst", signature:"Pollen Rush", note:"A fuzzy little worker that never seems hurried." },
  { id:"lanternmoth", name:"Lanternmoth", rarity:3 as PetRarity, family:"bloom", body:"moth", unlockGarden:60, affinity:["moonbell","sunreed"], assist:"random", signature:"Lantern Drift", note:"Its wings brighten only when it is interested." },
  { id:"bramblecat", name:"Bramblecat", rarity:4 as PetRarity, family:"leaf", body:"cat", unlockGarden:90, affinity:["blushcap","embermoss"], assist:"mound", signature:"Bramble Path", note:"Pretends it chose the same route you did." },
  { id:"glasssnail", name:"Glasssnail", rarity:4 as PetRarity, family:"water", body:"snail", unlockGarden:120, affinity:["pearlgrass","frostvine"], assist:"random", signature:"Memory Trail", note:"Its shell remembers colours that have already passed." },
  { id:"moonhare", name:"Moonhare", rarity:5 as PetRarity, family:"bloom", body:"hare", unlockGarden:180, affinity:["moonbell","starthistle"], assist:"line", signature:"Moonbound", note:"Long ears turn toward things that have not happened yet." },
  { id:"thornling", name:"Thornling", rarity:5 as PetRarity, family:"earth", body:"fox", unlockGarden:240, affinity:["starthistle","blushcap"], assist:"burst", signature:"Thornwake", note:"A rare root-creature wearing a crown it grew itself." },
  { id:"veilwing", name:"Veilwing", rarity:5 as PetRarity, family:"bloom", body:"moth", unlockGarden:300, affinity:["starthistle","nightorchid"], assist:"random", signature:"Veil Sense", note:"Almost invisible until it crosses a patch of light." },
  { id:"nightling", name:"Nightling", rarity:6 as PetRarity, family:"shadow", body:"cat", unlockGarden:420, affinity:["nightorchid"], assist:"mound", signature:"Quiet Omen", note:"A garden shadow that decided to stay." },
  { id:"starwyrm", name:"Starwyrm", rarity:6 as PetRarity, family:"shadow", body:"otter", unlockGarden:600, affinity:["nightorchid","starthistle"], assist:"line", signature:"Starwake", note:"Leaves a line of pale specks wherever it curls." },
  { id:"mistwing", name:"Mistwing", rarity:4 as PetRarity, family:"hybrid", body:"bird", unlockGarden:0, affinity:["rainmint","moonbell"], assist:"line", signature:"Mist Arc", note:"A bred line carrying Mossbun softness and Rainfinch motion.", hybridOf:["mossbun","rainfinch"] },
  { id:"rootling", name:"Rootling", rarity:4 as PetRarity, family:"hybrid", body:"mole", unlockGarden:0, affinity:["embermoss","fern"], assist:"mound", signature:"Deep Knock", note:"A patient burrower bred from Dewmole and Rootfox.", hybridOf:["dewmole","rootfox"] },
  { id:"prismcoil", name:"Prismcoil", rarity:5 as PetRarity, family:"hybrid", body:"snail", unlockGarden:0, affinity:["pearlgrass","starthistle"], assist:"random", signature:"Prism Memory", note:"A strange glassy line descended from Pebbletoad and Glasssnail.", hybridOf:["pebbletoad","glasssnail"] },
  { id:"starveil", name:"Starveil", rarity:6 as PetRarity, family:"hybrid", body:"moth", unlockGarden:0, affinity:["nightorchid","moonbell"], assist:"burst", signature:"Star Bloom", note:"A breeding-only lineage with moonlit wings.", hybridOf:["lanternmoth","moonhare"] },
] as const;

export type PetSpeciesId = (typeof petSpecies)[number]["id"];
export type PetBody = (typeof petSpecies)[number]["body"];

export const rarityNames = ["","Common","Uncommon","Rare","Fabled","Legendary","Mythic"] as const;
export const lustreOdds: Record<Lustre, number> = { plain:1, dappled:20, shimmer:180, prismatic:1800, eclipse:10000 };

export const knackCatalog = [
  { id:"quickpaws", name:"Quick Paws", unlock:5, note:"Companion assists charge about 12% faster." },
  { id:"moundwise", name:"Moundwise", unlock:10, note:"Raised mounds count extra toward the next assist." },
  { id:"seednose", name:"Seednose", unlock:15, note:"A slightly better chance to notice a nest after a garden settles." },
  { id:"softstep", name:"Softstep", unlock:24, note:"Assists tend one additional nearby patch when possible." },
  { id:"oldmemory", name:"Old Memory", unlock:36, note:"Rare-species bad-luck memory improves a little faster." },
  { id:"heirloom", name:"Heirloom", unlock:48, note:"Breeding has a better chance to preserve unusual lustres." },
] as const;
export type KnackId = (typeof knackCatalog)[number]["id"];

type Care = { tend:number; cuddle:number; forage:number; grow:number };
export type PetGenes = { coat:number; accent:number; pattern:number; ears:number; tail:number; bloom:number; size:number; lustre:Lustre };
export type Gardenkin = {
  id:string; speciesId:PetSpeciesId; name:string; bornAt:number; generation:number; parents:string[];
  xp:number; bond:number; genes:PetGenes; aptitude:number; care:Care; activeKnacks:KnackId[];
};
export type PetEgg = { id:string; speciesId:PetSpeciesId; readyAt:number; createdAt:number; source:string; odds:number; geneSeed:number; parents:string[]; generation:number };
export type Visitor = { speciesId:PetSpeciesId; arrivedAt:number; leavesAt:number; visits:number; trust:number; greeted:boolean; offered:boolean };
export type PetSave = {
  version:1; pets:Gardenkin[]; activePetId:string|null; eggs:PetEgg[]; discovered:PetSpeciesId[]; visitor:Visitor|null;
  nextVisitorAt:number; lurePlant:string|null; rarePity:number; nestMisses:number; selectedPetId:string|null;
  visitorTrust:Partial<Record<PetSpeciesId,number>>; visitorVisits:Partial<Record<PetSpeciesId,number>>;
};

const starterIds: PetSpeciesId[] = ["mossbun","dewmole","rainfinch"];
function uid(prefix="pet") { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n));}
function hash(seed:number){ const x=Math.sin(seed*12.9898+78.233)*43758.5453; return x-Math.floor(x); }
function speciesOf(id:PetSpeciesId){ return petSpecies.find(s=>s.id===id)!; }
function randGene(seed:number,slot:number,max:number){ return Math.floor(hash(seed+slot*37)*max); }

export function emptyPetSave(now=Date.now()): PetSave {
  return { version:1,pets:[],activePetId:null,eggs:[],discovered:[],visitor:null,nextVisitorAt:now+2*60_000,lurePlant:null,rarePity:0,nestMisses:0,selectedPetId:null,visitorTrust:{},visitorVisits:{} };
}
export function loadPetSave(): PetSave {
  if (typeof window==="undefined") return emptyPetSave();
  try {
    const raw=localStorage.getItem(PET_SAVE_KEY); if(!raw) return emptyPetSave(); const saved=JSON.parse(raw) as Partial<PetSave>;
    return { ...emptyPetSave(), ...saved, pets:Array.isArray(saved.pets)?saved.pets:[], eggs:Array.isArray(saved.eggs)?saved.eggs:[], discovered:Array.isArray(saved.discovered)?saved.discovered:[], visitorTrust:saved.visitorTrust??{}, visitorVisits:saved.visitorVisits??{} };
  } catch { return emptyPetSave(); }
}
export function savePetSave(save:PetSave){ if(typeof window!=="undefined"){ localStorage.setItem(PET_SAVE_KEY,JSON.stringify(save)); window.dispatchEvent(new CustomEvent("stillgarden-pets-changed")); } }
export function readMainSave(): any { if(typeof window==="undefined") return null; try{return JSON.parse(localStorage.getItem(MAIN_SAVE_KEY)||"null");}catch{return null;} }
export function writeMainSave(value:any){ if(typeof window!=="undefined"&&value) localStorage.setItem(MAIN_SAVE_KEY,JSON.stringify(value)); }

export function levelForPet(pet:Gardenkin){ let level=1; let need=0; while(level<PET_LEVEL_CAP){ need += Math.round(42*Math.pow(level,1.55)); if(pet.xp<need) break; level++; } return level; }
export function nextLevelProgress(pet:Gardenkin){ const level=levelForPet(pet); if(level>=PET_LEVEL_CAP) return {level,progress:1,next:0}; let floor=0; for(let l=1;l<level;l++) floor+=Math.round(42*Math.pow(l,1.55)); const next=floor+Math.round(42*Math.pow(level,1.55)); return {level,progress:clamp((pet.xp-floor)/(next-floor),0,1),next:next-pet.xp}; }
export function bondTier(pet:Gardenkin){ return Math.min(10,Math.floor(Math.sqrt(Math.max(0,pet.bond)/18))); }
export function personalityFor(pet:Gardenkin): Personality { const c=pet.care; const entries:[Personality,number][]=[["curious",c.tend+c.forage*.5],["gentle",c.cuddle*1.2],["busy",c.grow+c.tend*.3],["dreamy",Math.max(1,pet.bond*.08-c.tend*.05)],["bold",c.forage+c.tend*.2],["shy",Math.max(1,30-c.cuddle*.2)]]; return entries.sort((a,b)=>b[1]-a[1])[0][0]; }
export function growthStage(pet:Gardenkin){ const l=levelForPet(pet); return l<10?"hatchling":l<25?"sproutling":l<45?"companion":l<60?"elder":"heirloom"; }
export function unlockedKnacks(pet:Gardenkin){ const level=levelForPet(pet); return knackCatalog.filter(k=>level>=k.unlock); }

function rollLustre(seed=Math.random()){ const r=seed; if(r<1/10000)return "eclipse"; if(r<1/1800)return "prismatic"; if(r<1/180)return "shimmer"; if(r<1/20)return "dappled"; return "plain"; }
function makeGenes(seed:number, a?:PetGenes, b?:PetGenes, heirloom=false): PetGenes {
  const inherit=(key:keyof Omit<PetGenes,"lustre">,slot:number,max:number)=>{ const r=hash(seed+slot*91); if(a&&b&&r<.45)return Number(a[key]); if(a&&b&&r<.9)return Number(b[key]); return randGene(seed,slot,max); };
  let lustre:Lustre=rollLustre(hash(seed+909));
  if(a&&b&&hash(seed+811)<(heirloom?.32:.18)) lustre=hash(seed+812)<.5?a.lustre:b.lustre;
  return { coat:inherit("coat",1,12),accent:inherit("accent",2,10),pattern:inherit("pattern",3,7),ears:inherit("ears",4,5),tail:inherit("tail",5,5),bloom:inherit("bloom",6,6),size:inherit("size",7,7),lustre };
}
export function createPet(speciesId:PetSpeciesId, opts?:{parents?:Gardenkin[];generation?:number;seed?:number;name?:string}):Gardenkin{
  const seed=opts?.seed??Math.random()*1e9; const parents=opts?.parents??[]; const sp=speciesOf(speciesId); const heirloom=parents.some(p=>p.activeKnacks.includes("heirloom"));
  return { id:uid(),speciesId,name:opts?.name??sp.name,bornAt:Date.now(),generation:opts?.generation??1,parents:parents.map(p=>p.id),xp:0,bond:0,genes:makeGenes(seed,parents[0]?.genes,parents[1]?.genes,heirloom),aptitude:1+Math.floor(hash(seed+212)*5),care:{tend:0,cuddle:0,forage:0,grow:0},activeKnacks:[] };
}
export function adoptStarter(save:PetSave,speciesId:PetSpeciesId){ if(save.pets.length||!starterIds.includes(speciesId)) return save; const pet=createPet(speciesId,{name:speciesOf(speciesId).name}); return {...save,pets:[pet],activePetId:pet.id,selectedPetId:pet.id,discovered:[speciesId],nextVisitorAt:Date.now()+8*60_000}; }
export function addPetProgress(save:PetSave, petId:string, xp:number, bond:number, care:keyof Care):PetSave { return {...save,pets:save.pets.map(p=>p.id!==petId?p:{...p,xp:p.xp+xp,bond:p.bond+bond,care:{...p.care,[care]:p.care[care]+Math.max(1,xp)}})}; }
export function toggleKnack(save:PetSave,petId:string,knack:KnackId){ return {...save,pets:save.pets.map(p=>{if(p.id!==petId)return p; const allowed=unlockedKnacks(p).some(k=>k.id===knack); if(!allowed)return p; const has=p.activeKnacks.includes(knack); const next=has?p.activeKnacks.filter(k=>k!==knack):[...p.activeKnacks,knack].slice(-3); return {...p,activeKnacks:next};})}; }
export function renamePet(save:PetSave,petId:string,name:string){ const clean=name.trim().slice(0,22); if(!clean)return save; return {...save,pets:save.pets.map(p=>p.id===petId?{...p,name:clean}:p)}; }

function unlockedWild(stage:number){ return petSpecies.filter(s=>!("hybridOf" in s)&&s.unlockGarden<=stage); }
function weightedSpecies(stage:number,lure:string|null,pity:number){
  const pool=unlockedWild(stage); const weighted:{id:PetSpeciesId,w:number}[]=pool.map(s=>{ const base=[0,55,28,13,5,1.5,.3][s.rarity]||1; const lureBoost=lure&&s.affinity.some(x=>x===lure)?3:1; const pityBoost=s.rarity>=4?1+pity*.14:1; return {id:s.id,w:base*lureBoost*pityBoost};});
  const total=weighted.reduce((a,b)=>a+b.w,0); let r=Math.random()*total; for(const item of weighted){r-=item.w;if(r<=0)return item.id;} return weighted[0]?.id??"mossbun";
}
export function visitorTrustNeeded(rarity:PetRarity){ return [0,2,3,4,6,8,10][rarity]??4; }
export function processVisitor(save:PetSave,stage:number,now=Date.now()):PetSave {
  if(save.visitor&&save.visitor.leavesAt>now)return save;
  if(save.visitor&&save.visitor.leavesAt<=now) save={...save,visitor:null};
  if(now<save.nextVisitorAt)return save;
  const id=weightedSpecies(stage,save.lurePlant,save.rarePity); const sp=speciesOf(id); const active=save.pets.find(p=>p.id===save.activePetId); const memory=active?.activeKnacks.includes("oldmemory")?1.35:1;
  const rarePity=sp.rarity>=4?0:save.rarePity+memory; const visits=(save.visitorVisits[id]??0)+1; const trust=save.visitorTrust[id]??0;
  return {...save,visitor:{speciesId:id,arrivedAt:now,leavesAt:now+45*60_000,visits,trust,greeted:false,offered:false},visitorVisits:{...save.visitorVisits,[id]:visits},rarePity,nextVisitorAt:now+(18+Math.floor(Math.random()*42))*60_000};
}
export function greetVisitor(save:PetSave):PetSave {
  const v=save.visitor; if(!v||v.greeted)return save; const trust=v.trust+1;
  return {...save,visitor:{...v,greeted:true,trust},visitorTrust:{...save.visitorTrust,[v.speciesId]:trust}};
}
export function offerVisitor(save:PetSave,plantId:string):{save:PetSave;ok:boolean;message:string}{
  const v=save.visitor;if(!v)return {save,ok:false,message:"No visitor is here."}; if(v.offered)return {save,ok:false,message:"This visitor has already accepted something this visit."};
  const main=readMainSave(); if(!main?.harvested||Number(main.harvested[plantId]||0)<1)return {save,ok:false,message:"You do not have a harvested plant to offer."};
  main.harvested[plantId]-=1; writeMainSave(main); const sp=speciesOf(v.speciesId); const liked=sp.affinity.some(x=>x===plantId); const trust=v.trust+(liked?2:1);
  return {save:{...save,visitor:{...v,offered:true,trust},visitorTrust:{...save.visitorTrust,[v.speciesId]:trust}},ok:true,message:liked?`${sp.name} loved that offering.`:`${sp.name} accepted it politely.`};
}
export function inviteVisitor(save:PetSave):PetSave {
  const v=save.visitor;if(!v)return save; const sp=speciesOf(v.speciesId); const need=visitorTrustNeeded(sp.rarity); if(v.trust<need)return save;
  const pet=createPet(v.speciesId); return {...save,pets:[...save.pets,pet],discovered:save.discovered.includes(v.speciesId)?save.discovered:[...save.discovered,v.speciesId],visitor:null,selectedPetId:pet.id,activePetId:save.activePetId??pet.id,nextVisitorAt:Date.now()+25*60_000};
}

export function setLureFromHarvest(save:PetSave,plantId:string):{save:PetSave;ok:boolean}{ const main=readMainSave(); if(!main?.harvested||Number(main.harvested[plantId]||0)<1)return {save,ok:false}; main.harvested[plantId]-=1; writeMainSave(main); return {save:{...save,lurePlant:plantId,nextVisitorAt:Math.min(save.nextVisitorAt,Date.now()+4*60_000)},ok:true}; }

export function maybeFindNest(save:PetSave,stage:number):{save:PetSave;found:PetEgg|null}{
  const active=save.pets.find(p=>p.id===save.activePetId); const seednose=active?.activeKnacks.includes("seednose")??false; const chance=.09+(seednose?.035:0)+Math.min(.11,save.nestMisses*.012);
  if(Math.random()>chance) return {save:{...save,nestMisses:save.nestMisses+1},found:null};
  const speciesId=weightedSpecies(stage,save.lurePlant,save.rarePity); const sp=speciesOf(speciesId); const baseMinutes=[0,8,20,45,90,180,300][sp.rarity]||30;
  const egg:PetEgg={id:uid("egg"),speciesId,readyAt:Date.now()+baseMinutes*60_000,createdAt:Date.now(),source:"found beneath a settled garden",odds:Math.max(4,Math.round(1/(chance*(1/Math.max(1,sp.rarity))))),geneSeed:Math.random()*1e9,parents:[],generation:1};
  return {save:{...save,eggs:[...save.eggs,egg].slice(-4),nestMisses:0},found:egg};
}
export function hatchEgg(save:PetSave,eggId:string,now=Date.now()):{save:PetSave;pet:Gardenkin|null}{ const egg=save.eggs.find(e=>e.id===eggId);if(!egg||egg.readyAt>now)return {save,pet:null}; const parentPets=egg.parents.map(id=>save.pets.find(p=>p.id===id)).filter(Boolean) as Gardenkin[]; const pet=createPet(egg.speciesId,{parents:parentPets,generation:egg.generation,seed:egg.geneSeed}); return {pet,save:{...save,eggs:save.eggs.filter(e=>e.id!==eggId),pets:[...save.pets,pet],discovered:save.discovered.includes(pet.speciesId)?save.discovered:[...save.discovered,pet.speciesId],selectedPetId:pet.id,activePetId:save.activePetId??pet.id}}; }

export function canBreed(a:Gardenkin,b:Gardenkin){ return a.id!==b.id&&levelForPet(a)>=25&&levelForPet(b)>=25&&bondTier(a)>=3&&bondTier(b)>=3; }
export function breedingCost(a:Gardenkin,b:Gardenkin){ return 350+Math.max(a.generation,b.generation)*85; }
function hybridResult(a:PetSpeciesId,b:PetSpeciesId):PetSpeciesId|null { const key=[a,b].sort().join("+"); const hit=petSpecies.find(s=>"hybridOf" in s&&s.hybridOf&&[...s.hybridOf].sort().join("+")===key); return hit?.id??null; }
export function breedPets(save:PetSave,aId:string,bId:string):{save:PetSave;ok:boolean;message:string}{
  const a=save.pets.find(p=>p.id===aId),b=save.pets.find(p=>p.id===bId); if(!a||!b||!canBreed(a,b))return {save,ok:false,message:"Both companions must be level 25+ with bond 3+."};
  const cost=breedingCost(a,b); const main=readMainSave(); if(!main||Number(main.dew||0)<cost)return {save,ok:false,message:`Need ${cost} Dew for nesting materials.`}; if(save.eggs.length>=4)return {save,ok:false,message:"All four nest spaces are occupied."};
  main.dew-=cost; writeMainSave(main); const hybrid=hybridResult(a.speciesId,b.speciesId); let speciesId:PetSpeciesId; const r=Math.random(); if(hybrid&&r<.16)speciesId=hybrid; else speciesId=r<.58?a.speciesId:b.speciesId;
  const sp=speciesOf(speciesId); const generation=Math.max(a.generation,b.generation)+1; const egg:PetEgg={id:uid("egg"),speciesId,readyAt:Date.now()+(45+sp.rarity*35)*60_000,createdAt:Date.now(),source:`bred from ${a.name} × ${b.name}`,odds:hybrid&&speciesId===hybrid?6:2,geneSeed:Math.random()*1e9,parents:[a.id,b.id],generation};
  return {save:{...save,eggs:[...save.eggs,egg]},ok:true,message:hybrid&&speciesId===hybrid?"The egg carries an unfamiliar lineage.":"A new egg is resting in the nest."};
}

export function activePet(save=loadPetSave()){ return save.pets.find(p=>p.id===save.activePetId)??null; }
export function petAssistEvery(pet:Gardenkin){ const level=levelForPet(pet); let every=Math.max(9,23-Math.floor(level/7)-Math.floor(pet.aptitude/2)); if(pet.activeKnacks.includes("quickpaws"))every=Math.max(7,Math.floor(every*.88)); return every; }
export function speciesInfo(id:PetSpeciesId){return speciesOf(id);}
export function starterSpecies(){return starterIds.map(speciesOf);}
export function lustreLabel(l:Lustre){return l==="plain"?"natural":l;}
export function lustreApproxOdds(l:Lustre){return lustreOdds[l];}
