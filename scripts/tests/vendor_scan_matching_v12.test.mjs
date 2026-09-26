import './vendor_storefront_network_guard.cjs';import test from'node:test';import assert from'node:assert/strict';
import{acceptStructuralIdentity}from'../../apps/web/src/lib/stores/scanMatchV12.mjs';import{structureAdmits,structureFeature}from'../../apps/web/src/lib/stores/scanStructureV12.mjs';
test('structure alone, shared artwork, and weak margins cannot admit a card',()=>{
 assert.equal(structureAdmits([{distance:.3},{distance:.35}]),false);assert.equal(structureAdmits([{distance:.5},{distance:.9}]),false);
 assert.equal(structureAdmits([{distance:.2},{distance:.4}]),true);assert.throws(()=>structureFeature('bad'));
 const c={name:'Flapple',number:'SWSH189',printedCoordinates:{total:307}};
 assert.equal(acceptStructuralIdentity('Flapple','',c),false);assert.equal(acceptStructuralIdentity('Flapple','SWSH189',c),true);
 for(const footer of ['SWSH188','189/307','XY189','SWSH189 SWSH188'])assert.equal(acceptStructuralIdentity('Flapple',footer,c),false);
 assert.equal(acceptStructuralIdentity('Apple','SWSH189',c),false);
});
test('numeric recovery needs correct known denominator; gallery prefix remains exact',()=>{
 const c={name:'Pikachu',number:'4',printedCoordinates:{total:72}};
 assert.equal(acceptStructuralIdentity('Pikachu','4/72',c),true);
 assert.equal(acceptStructuralIdentity('Pikachu','4/163',c),false);
 assert.equal(acceptStructuralIdentity('Pikachu','4/72',{...c,printedCoordinates:{}}),false);
 assert.equal(acceptStructuralIdentity('Pikachu','TG04/TG30',{...c,number:'TG04',printedCoordinates:{total:30}}),true);
 assert.equal(acceptStructuralIdentity('Pikachu','TG04/TG30',c),false);
});
