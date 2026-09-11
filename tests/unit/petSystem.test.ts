import { describe,expect,it } from "vitest";
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
