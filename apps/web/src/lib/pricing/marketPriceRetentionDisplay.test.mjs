import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';

function load(relative, expose='') {
  const source=readFileSync(new URL(relative,import.meta.url),'utf8')+expose;
  const exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,
  }}).outputText,{exports,require(name){
    if(name==='react')return React;
    if(name==='react/jsx-runtime')return jsx;
    if(name==='@/lib/cards/formatUsdPrice')return {formatUsdPrice:value=>`$${value.toFixed(2)}`};
    if(name==='@/lib/pricing/formatMarketPriceUpdatedAt')return load('./formatMarketPriceUpdatedAt.ts');
    return {};
  }});
  return exports;
}
const card=load('../../components/pricing/CardPagePricingRail.tsx','\nexport { MarketPriceBlock };');
const grid=load('../../components/pricing/VisiblePrice.tsx');

test('old exact price and source date are visible in rendered card markup',()=>{
  const html=renderToStaticMarkup(React.createElement(card.MarketPriceBlock,{pricing:{
    pricing_scope:'card_printing',card_print_id:'parent',card_printing_id:'printing',
    market_close:31,currency:'USD',source_name:'tcgplayer',source_label:'TCGPlayer Market',
    observed_at:'2020-01-01T08:00:00Z',published_at:'2020-01-01T09:00:00Z',
    provenance_id:'fixture',freshness:'stale',status:'available',is_from_price:false,
  }}));
  assert.match(html,/\$31\.00/);
  assert.match(html,/Last known price/);
  assert.match(html,/<time dateTime="2020-01-01T08:00:00Z">Last updated.*2020.*UTC<\/time>/);
  assert.doesNotMatch(html,/<p class="sr-only">[^<]*Last updated/);
  assert.doesNotMatch(html,/Market price unavailable/);
});

test('compact shared web price renders its original source update date',()=>{
  const html=renderToStaticMarkup(React.createElement(grid.default,{
    value:31,observedAt:'2020-01-01T08:00:00Z',publishedAt:'2026-11-23T09:00:00Z',
  }));
  assert.match(html,/Last updated.*2020.*UTC/);
  assert.match(html,/\$31\.00/);
});
