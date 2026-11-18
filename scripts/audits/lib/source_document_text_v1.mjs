import {parse} from 'parse5';

// Plain text for audit keyword evidence only; never render this as HTML.
export function sourceDocumentTextV1(html) {
  const pending=[parse(html)],parts=[];
  while(pending.length){
    const node=pending.pop();
    if(['script','style','template'].includes(node.tagName))continue;
    if(node.nodeName==='#text')parts.push(node.value);
    if(node.childNodes)for(let i=node.childNodes.length-1;i>=0;i--)pending.push(node.childNodes[i]);
  }
  return parts.join(' ').replace(/\s+/g,' ').trim();
}
