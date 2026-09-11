"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./PetBridge.module.css";
import FieldPetActor from "./FieldPetActor";
import { activePet, levelForPet, loadPetSave, speciesInfo, type Gardenkin } from "./petSystem";

export default function PetBridge(){
  const pathname=usePathname();
  const [pet,setPet]=useState<Gardenkin|null>(null);
  const [toast,setToast]=useState<string|null>(null);
  const toastTimer=useRef<number|null>(null);

  const refresh=()=>setPet(activePet(loadPetSave()));
  useEffect(()=>{
    refresh();
    const onChange=()=>refresh();
    window.addEventListener("stillgarden-pets-changed",onChange);
    return()=>window.removeEventListener("stillgarden-pets-changed",onChange);
  },[]);

  function notify(text:string){
    setToast(text);
    if(toastTimer.current)window.clearTimeout(toastTimer.current);
    toastTimer.current=window.setTimeout(()=>setToast(null),1800);
  }

  useEffect(()=>()=>{if(toastTimer.current)window.clearTimeout(toastTimer.current);},[]);

  if(pathname==="/pets")return null;
  const info=pet?speciesInfo(pet.speciesId):null;
  const coat=pet?`hsl(${82+pet.genes.coat*12} 22% ${43+pet.genes.size}%)`:"#80906f";
  const accent=pet?`hsl(${36+pet.genes.accent*21} 24% 66%)`:"#c0ae83";

  return <>
    <FieldPetActor pet={pet} onNotify={notify}/>
    <a className={styles.dock} href="/pets" aria-label="Open Gardenkin sanctuary">
      {pet&&info?<div className={styles.portrait} data-body={info.body} style={{"--coat":coat,"--accent":accent} as React.CSSProperties}><i className={styles.body}/><i className={styles.head}/><i className={styles.ear}/></div>:<div className={styles.empty}>?</div>}
      <span className={styles.dockText}><strong>{pet?pet.name:"gardenkin"}</strong><span>{pet?`level ${levelForPet(pet)} companion`:"choose your first companion"}</span></span>
    </a>
    {toast&&<div className={styles.toast}><strong>{toast}</strong></div>}
  </>;
}
