import {useEffect,type RefObject} from "react";

/** Native disclosures keep their semantics; popovers also dismiss like site menus. */
export function useDismissDetails(ref:RefObject<HTMLDetailsElement>){
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{const element=ref.current;if(element?.open&&event.target instanceof Node&&!element.contains(event.target))element.open=false;};
    const escape=(event:KeyboardEvent)=>{const element=ref.current;if(event.key==="Escape"&&element?.open){element.open=false;element.querySelector('summary')?.focus();}};
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[ref]);
}
