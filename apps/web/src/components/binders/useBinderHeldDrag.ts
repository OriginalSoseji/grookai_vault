"use client";
import {useEffect,useRef,useState} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";

/** Touch may scroll until the deliberate hold starts; keyboard/tap remain peers. */
export function useBinderHeldDrag(slots:{localKey:string}[],onMove:(from:number,to:number)=>void,pages:number,setPage:(value:number|((page:number)=>number))=>void,onHold:(key:string)=>void,onMoved:()=>void){
  const root=useRef<HTMLElement>(null);
  const press=useRef<{key:string;x:number;y:number;held:boolean}|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const edgeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const ignoreClick=useRef(false);
  const [heldKey,setHeldKey]=useState<string|null>(null);
  useEffect(()=>{
    function clear(){if(timer.current)clearTimeout(timer.current);if(edgeTimer.current)clearTimeout(edgeTimer.current);timer.current=null;edgeTimer.current=null;press.current=null;setHeldKey(null);}
    function move(event:PointerEvent){
      const active=press.current;if(!active)return;
      if(!active.held){if(Math.hypot(event.clientX-active.x,event.clientY-active.y)>8)clear();return;}
      const edge=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-binder-turn]');
      if(edge&&root.current?.contains(edge)&&!edgeTimer.current){const delta=Number(edge.dataset.binderTurn);edgeTimer.current=setTimeout(()=>{setPage(page=>Math.max(0,Math.min(pages-1,page+delta)));edgeTimer.current=null;},650);}
      else if(!edge&&edgeTimer.current){clearTimeout(edgeTimer.current);edgeTimer.current=null;}
    }
    function up(event:PointerEvent){
      const active=press.current;
      if(active?.held){
        ignoreClick.current=true;
        const pocket=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-binder-pocket]');
        const from=slots.findIndex(slot=>slot.localKey===active.key);
        const to=Math.min(Number(pocket?.dataset.binderPocket??-1),slots.length-1);
        if(pocket&&root.current?.contains(pocket)&&from>=0&&to>=0&&from!==to){onMove(from,to);onMoved();}
      }
      clear();
    }
    function touch(event:TouchEvent){if(press.current?.held)event.preventDefault();}
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',clear);document.addEventListener('touchmove',touch,{passive:false});
    return ()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',clear);document.removeEventListener('touchmove',touch);if(timer.current)clearTimeout(timer.current);if(edgeTimer.current)clearTimeout(edgeTimer.current);press.current=null;};
  },[slots,onMove,pages,setPage,onMoved]);
  function start(key:string,event:ReactPointerEvent){
    if(event.pointerType==='mouse')return;
    press.current={key,x:event.clientX,y:event.clientY,held:false};
    timer.current=setTimeout(()=>{if(press.current){press.current.held=true;setHeldKey(key);onHold(key);}},420);
  }
  function consumeClick(){if(!ignoreClick.current)return false;ignoreClick.current=false;return true;}
  return {root,heldKey,start,consumeClick};
}
