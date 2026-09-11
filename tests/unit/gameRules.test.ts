import { describe,expect,it } from "vitest";
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
