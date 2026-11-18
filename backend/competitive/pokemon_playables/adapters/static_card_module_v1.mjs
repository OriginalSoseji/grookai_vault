import {assert} from '../common.mjs';

// Data-only reader for the upstream modules. Imports and source code are never executed.
export function readStaticCardModule(source,{kind,setName,seriesName='Mega Evolution'}={}) {
  assert(typeof source==='string'&&Buffer.byteLength(source)<=256*1024,'REPOSITORY_MODULE_SIZE');
  assert(['Mega Evolution','Scarlet & Violet'].includes(seriesName),'REPOSITORY_SERIES_SCOPE');
  let at=0,count=0;
  const next=()=>{
    assert(++count<=50000,'REPOSITORY_TOKEN_BOUND');
    while(at<source.length){
      if(/\s/.test(source[at])){at++;continue;}
      if(source.startsWith('//',at)){const end=source.indexOf('\n',at+2);at=end<0?source.length:end+1;continue;}
      if(source.startsWith('/*',at)){const end=source.indexOf('*/',at+2);assert(end>=0,'REPOSITORY_COMMENT');at=end+2;continue;}
      break;
    }
    if(at===source.length)return {type:'end',value:''};
    const char=source[at++];
    if(char==='"'||char==="'"){
      let value='',closed=false;
      while(at<source.length){let c=source[at++];if(c===char){closed=true;break;}assert(c!=='\n'&&c!=='\r','REPOSITORY_STRING');
        if(c==='\\'){
          c=source[at++];const escapes={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0',"'":"'",'"':'"','\\':'\\','/':'/'};
          if(c==='u'||c==='x'){const length=c==='u'?4:2,hex=source.slice(at,at+length);assert(new RegExp(`^[0-9a-fA-F]{${length}}$`).test(hex),'REPOSITORY_ESCAPE');value+=String.fromCharCode(parseInt(hex,16));at+=length;}
          else {assert(Object.hasOwn(escapes,c)&&!(c==='0'&&/[0-9]/.test(source[at]??'')),'REPOSITORY_ESCAPE');value+=escapes[c];}
        }else value+=c;
      }
      assert(closed,'REPOSITORY_STRING');return {type:'string',value};
    }
    const rest=source.slice(at-1),word=rest.match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
    if(word){at+=word[0].length-1;return {type:'word',value:word[0]};}
    const number=rest.match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?/);
    if(number){at+=number[0].length-1;return {type:'number',value:Number(number[0])};}
    assert('{}[]:,;='.includes(char),'REPOSITORY_NONLITERAL_SYNTAX');return {type:char,value:char};
  };
  let token=next();const eat=value=>{assert(token.value===value,'REPOSITORY_MODULE_SHAPE');const old=token;token=next();return old;};
  const imports={},references=new WeakSet();
  while(token.value==='import'){
    eat('import');let name;
    if(token.value==='{'){eat('{');name=eat(kind==='card'?'Card':'Set').value;eat('}');}
    else {assert(token.type==='word','REPOSITORY_IMPORT');name=token.value;token=next();}
    eat('from');assert(token.type==='string','REPOSITORY_IMPORT');const from=token.value;token=next();
    assert(!Object.hasOwn(imports,name),'REPOSITORY_DUPLICATE_IMPORT');imports[name]=from;if(token.value===';')eat(';');
  }
  assert(imports[kind==='card'?'Card':'Set']===(kind==='card'?'../../../interfaces':'../../interfaces'),'REPOSITORY_INTERFACE_IMPORT');
  if(kind==='card')assert(imports.Set===`../${setName}`,'REPOSITORY_SET_IMPORT');
  else assert(imports.serie===`../${seriesName}`,'REPOSITORY_SERIES_IMPORT');
  assert(Object.keys(imports).length===2,'REPOSITORY_IMPORT_SCOPE');
  const literal=(depth=0)=>{
    assert(depth<32,'REPOSITORY_DEPTH');
    if(token.type==='string'||token.type==='number'){const value=token.value;token=next();return value;}
    if(['true','false','null'].includes(token.value)){const value={true:true,false:false,null:null}[token.value];token=next();return value;}
    if(token.value===(kind==='card'?'Set':'serie')){const reference={$reference:token.value};references.add(reference);token=next();return reference;}
    if(token.value==='['){eat('[');const values=[];while(token.value!==']'){values.push(literal(depth+1));if(token.value!==']'){eat(',');if(token.value===']')break;}}eat(']');return values;}
    assert(token.value==='{','REPOSITORY_NONLITERAL_VALUE');eat('{');const value={};
    while(token.value!=='}'){
      assert(token.type==='word'||token.type==='string','REPOSITORY_PROPERTY');const key=token.value;token=next();
      assert(!['__proto__','constructor','prototype'].includes(key)&&!Object.hasOwn(value,key),'REPOSITORY_UNSAFE_OR_DUPLICATE_PROPERTY');
      eat(':');value[key]=literal(depth+1);if(token.value!=='}'){eat(',');if(token.value==='}')break;}
    }eat('}');return value;
  };
  eat('const');eat(kind);eat(':');eat(kind==='card'?'Card':'Set');eat('=');const value=literal();
  if(token.value===';')eat(';');eat('export');eat('default');eat(kind);if(token.value===';')eat(';');assert(token.type==='end','REPOSITORY_TRAILING_CODE');
  assert(value&&typeof value==='object'&&!Array.isArray(value),'REPOSITORY_ROOT_OBJECT');
  const reference=kind==='card'?value.set:value.serie;
  assert(reference&&references.has(reference)&&reference.$reference===(kind==='card'?'Set':'serie'),'REPOSITORY_PARENT_REFERENCE');
  return value;
}

const LANGUAGES=new Set(['en','fr','es','de','it','pt','es-mx','ja','ko','zh-tw','zh-cn','id','th','nl','pl','ru']);
export function englishCardData(value) {
  if(Array.isArray(value))return value.map(englishCardData);
  if(value&&typeof value==='object'){
    if(Object.hasOwn(value,'en')){
      assert(Object.keys(value).every(key=>LANGUAGES.has(key))&&typeof value.en==='string','REPOSITORY_ENGLISH_LOCALIZATION');return value.en;
    }
    return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,englishCardData(item)]));
  }
  return value;
}
