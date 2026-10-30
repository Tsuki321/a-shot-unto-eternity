import test from 'node:test';
import assert from 'node:assert/strict';
import {pages, entries, byId, ofType} from '../site/data.js';
import {emptyBuild, limits, boonCost, toggle, derive, validate, normalize, toMarkdown, fromMarkdown, rewardOptions} from '../site/rules.js';

const id=name=>entries.find(e=>e.name===name).id;
const choose=(s,...names)=>names.reduce((state,name)=>toggle(state,id(name)),s);
const complete=()=>choose(emptyBuild(),'Assault','Close Quarters','Unrelenting','Eleventh Hour','Trickshot','House Duravau');
test('every source choice has a unique ID and a valid image region',()=>{
  assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
  for(const [type,n] of Object.entries({course:7,specialization:21,boon:39,sponsor:10,sponsorBoon:30,companion:20,conspiracy:5,character:25,quest:45})) assert.equal(ofType(type).length,n,type);
  for(const e of entries){const [x,y,w,h]=e.rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1600&&y+h<=pages[e.page-1].height,e.name);if(e.requires)assert.ok(byId[e.requires]);}
});
test('a complete basic build needs no optional sponsors, companions or quests',()=>assert.deepEqual(validate(complete()),[]));
test('specialization and boon prerequisites remain visible when a course is removed',()=>{
  const s=toggle(complete(),id('Assault'));assert.ok(validate(s).some(i=>i.includes('Close Quarters requires Assault')));assert.ok(validate(s).some(i=>i.includes('Unrelenting requires Assault')));
});
test('repeatable training boons increase separate course and specialization allowances',()=>{
  let s=choose(emptyBuild(),'Assault','Close Quarters','Alternative Studies','Recon','Multipurpose Specialist','Stealth','A Nobody','House Duravau');
  assert.deepEqual(validate(s),[]);assert.equal(limits(s).sponsors,3);
  s=toggle(s,id('Alternative Studies'),1);assert.equal(limits(s).courses,3);assert.equal(boonCost(s),4);
  assert.ok(validate(s).some(i=>i.includes('exceed')));
});
test('extra studies do not replace the academy specialization',()=>{
  const s=choose(emptyBuild(),'Assault','Recon','Alternative Studies','Stealth');assert.ok(validate(s).some(i=>i.includes('academy course')));
});
test('Outside Fate costs two points',()=>{
  const s=choose(emptyBuild(),'Assault','Persistence','Outside Fate','Beyond Human','House Duravau');assert.equal(boonCost(s),3);assert.deepEqual(validate(s),[]);
});
test('solo sponsorship is automatic only with one chosen sponsor',()=>{
  let s=choose(complete(),'Humble Sundawn');assert.equal(derive(s).grants.length,3);
  s=choose(s,'Nathaniel');assert.equal(derive(s).grants.length,4);assert.ok(!derive(s).grants.some(g=>byId[g.id].solo));
});
test('both sponsor pages and both quest pages share their respective limits',()=>{
  let s=choose(complete(),'Humble Sundawn','Nathaniel','Havelford');assert.ok(validate(s).some(i=>i.includes('at most 2 sponsors')));
  s.quests=ofType('quest').filter(e=>e.page===8).slice(0,3).concat(ofType('quest').filter(e=>e.page===9).slice(0,2)).map(e=>e.id);
  assert.ok(validate(s).some(i=>i.includes('at most 4 quests')));
});
test('the printed companion limit is four; a quest can grant an additional companion',()=>{
  const s=complete();s.companions=ofType('companion').slice(0,4).map(e=>e.id);
  assert.equal(limits(s).companions,4);assert.deepEqual(validate(s),[]);
  s.quests=[id('A Knight’s Prestige')];assert.deepEqual(validate(s),[]);assert.equal(derive(s).rewards[0].grant,id('Lance DeLac'));
  s.companions.push(id('Lance DeLac'));assert.ok(validate(s).some(i=>i.includes('at most 4 companions')));
});
test('missing sponsor quest grants one non-solo boon, and recalculates when sponsorship changes',()=>{
  let s=choose(complete(),'The Mertvya’s Princess'),q=byId[id('The Mertvya’s Princess')];
  assert.equal(derive(s).grants.length,1);assert.ok(!byId[derive(s).grants[0].id].solo);assert.ok(!rewardOptions(s,q).some(o=>o.value==='solo'));
  const second=rewardOptions(s,q)[1].value;s.questRewards[q.id]=second;assert.equal(derive(s).rewards[0].grant,second);
  s=choose(s,'Humble Sundawn','Nathaniel');s.questRewards[q.id]='solo';assert.ok(byId[derive(s).rewards[0].grant].solo);
  s.questRewards[q.id]='none';assert.equal(derive(s).rewards[0].grant,null);
});
test('a missing companion is the quest reward; owning them unlocks the printed reward',()=>{
  let s=choose(complete(),'A Knight’s Prestige');assert.equal(derive(s).rewards[0].grant,id('Lance DeLac'));
  s=choose(s,'Lance DeLac');assert.equal(derive(s).rewards[0].grant,null);assert.equal(derive(s).rewards[0].label,'Printed quest reward');
});
test('skip mode preserves inactive quests without granting their rewards',()=>{
  const s=choose(complete(),'A Knight’s Prestige');s.mode='skip';s.gifts=[id('Lyza'),id('Living shadow')];
  assert.deepEqual(validate(s),[]);assert.equal(derive(s).rewards.length,0);assert.equal(derive(s).grants.length,2);
  s.sponsors=[id('Humble Sundawn')];assert.ok(validate(s).some(i=>i.includes('already provided')));
});
test('Markdown round-trips a build, including inactive choices, notes, repeatable boons and reward preferences',()=>{
  const s=choose(complete(),'The Mertvya’s Princess');s.name='Test <Venator> [one]';s.notes='Equipment: custom rifle\nA second line.\n```';s.mode='skip';s.gifts=[id('Lyza')];s.questRewards[id('The Mertvya’s Princess')]='none';
  assert.deepEqual(fromMarkdown(toMarkdown(s)),s);assert.match(toMarkdown(s),/## Credits/);assert.match(toMarkdown(s),/## Import Data/);
});
test('malformed, unknown-version and unknown-choice imports are rejected without affecting the current build',()=>{
  const s=complete(),before=structuredClone(s);
  for(const bad of [{version:2},{...s,courses:['unknown']},{...s,boons:{[id('Unrelenting')]:3}},{...s,quests:['__proto__']},{...s,questRewards:[]}])assert.throws(()=>normalize(bad));
  assert.throws(()=>fromMarkdown('# Ordinary notes'));assert.deepEqual(s,before);
});
