import {entries, byId, ofType, SOURCE} from './data.js';

export const emptyBuild = () => ({version:1,name:'',arrival:'Academy orientation',notes:'',courses:[],specializations:[],boons:{},sponsors:[],companions:[],conspiracy:'',mode:'quests',quests:[],questRewards:{},gifts:[]});
const count = (s,id) => s.boons[id] || 0;
const boonId = name => ofType('boon').find(e=>e.name===name).id;
const STUDIES=boonId('Alternative Studies'), SPECIALIST=boonId('Multipurpose Specialist'), NOBODY=boonId('A Nobody');
export const limits = s => ({courses:1+count(s,STUDIES),specializations:1+count(s,SPECIALIST),boons:3,sponsors:2+count(s,NOBODY),companions:4,quests:4,gifts:4});
export const boonCost = s => Object.entries(s.boons).reduce((sum,[id,n])=>sum+byId[id].cost*n,0);
export const sponsorBoons = id => ofType('sponsorBoon').filter(e=>e.sponsor===id);
export const isSelected = (s,e) => e.type==='boon'?count(s,e.id)>0:e.type==='conspiracy'?s.conspiracy===e.id:e.type==='sponsorBoon'?derive(s).grants.some(g=>g.id===e.id):e.type==='character'?s.mode==='skip'&&s.gifts.includes(e.id):(s[{course:'courses',specialization:'specializations',sponsor:'sponsors',companion:'companions',quest:'quests'}[e.type]]||[]).includes(e.id);
export function toggle(s,id,delta) {
  const e=byId[id]; if(!e) return s;
  const next=structuredClone(s);
  if(e.type==='boon'){
    const value=delta!==undefined?count(s,id)+delta:count(s,id)?0:1;
    if(value>0) next.boons[id]=Math.min(e.repeatable?3:1,value); else delete next.boons[id];
  } else if(e.type==='conspiracy') next.conspiracy=s.conspiracy===id?'':id;
  else if(['character','sponsorBoon'].includes(e.type)) {
    if(s.mode==='skip') next.gifts=s.gifts.includes(id)?s.gifts.filter(v=>v!==id):[...s.gifts,id];
  } else {
    const key={course:'courses',specialization:'specializations',sponsor:'sponsors',companion:'companions',quest:'quests'}[e.type];
    next[key]=s[key].includes(id)?s[key].filter(v=>v!==id):[...s[key],id];
  }
  return next;
}
export function rewardOptions(s,q) {
  const pre=byId[q.requires];
  if(pre?.type==='sponsor') {
    if(!s.sponsors.includes(pre.id)) return [...sponsorBoons(pre.id).filter(e=>!e.solo).map(e=>({value:e.id,label:`Gain ${pre.name}: ${e.name}`})),{value:'none',label:'No reward'}];
    return [{value:'auto',label:'Printed quest reward'},...(s.sponsors.length===1?[]:[{value:'solo',label:`Solo boon: ${sponsorBoons(pre.id)[2].name}`}]),{value:'none',label:'No reward'}];
  }
  return [{value:'auto',label:pre&&!s.companions.includes(pre.id)?`Gain companion: ${pre.name}`:'Printed quest reward'},{value:'none',label:'No reward'}];
}
export function derive(s) {
  const grants=[],rewards=[];
  for(const id of s.sponsors) for(const e of sponsorBoons(id)) if(!e.solo||s.sponsors.length===1) grants.push({id:e.id,source:byId[id].name});
  if(s.mode==='skip') for(const id of s.gifts) grants.push({id,source:'Instead of quests'});
  else for(const id of s.quests) {
    const q=byId[id], pre=byId[q.requires], options=rewardOptions(s,q);
    // Recompute defaults when a prerequisite changes. The saved preference is retained.
    const choice=options.find(o=>o.value===s.questRewards[id])||options[0];
    let grant=null;
    if(choice.value==='solo') grant=sponsorBoons(pre.id)[2].id;
    else if(byId[choice.value]) grant=choice.value;
    else if(choice.value!=='none'&&pre?.type==='companion'&&!s.companions.includes(pre.id)) grant=pre.id;
    if(grant) grants.push({id:grant,source:q.name});
    rewards.push({quest:id,choice:choice.value,label:choice.label,grant});
  }
  return {grants,rewards};
}
export function giftEligible(s,e) {
  if(e.type==='sponsorBoon') return !s.sponsors.includes(e.sponsor);
  if(e.type==='companion') return !s.companions.includes(e.id);
  return e.type==='character';
}
export function validate(s) {
  const issues=[],lim=limits(s), used=boonCost(s);
  if(s.courses.length!==lim.courses) issues.push(`Choose ${lim.courses} course${lim.courses===1?'':'s'} (${s.courses.length} selected).`);
  if(s.specializations.length!==lim.specializations) issues.push(`Choose ${lim.specializations} specialization${lim.specializations===1?'':'s'} (${s.specializations.length} selected).`);
  if(s.courses.length&&s.specializations.length&&!s.specializations.some(id=>byId[id].requires===s.courses[0])) issues.push('Your first course is your academy course; choose a specialization within it.');
  for(const id of [...s.specializations,...Object.keys(s.boons)]) {const e=byId[id];if(e.requires&&!s.courses.includes(e.requires)) issues.push(`${e.name} requires ${byId[e.requires].name}.`);}
  if(used!==3) issues.push(used<3?`Spend ${3-used} remaining boon point${3-used===1?'':'s'}.`:`Boons exceed your allowance by ${used-3} point${used-3===1?'':'s'}.`);
  for(const key of ['sponsors','companions']) if(s[key].length>lim[key]) issues.push(`Choose at most ${lim[key]} ${key} (${s[key].length} selected).`);
  if(!s.conspiracy) issues.push('Choose one conspiracy.');
  if(s.mode==='quests'&&s.quests.length>4) issues.push(`Choose at most 4 quests across both pages (${s.quests.length} selected).`);
  if(s.mode==='skip') {
    if(s.gifts.length>4) issues.push(`Choose at most 4 substitute rewards (${s.gifts.length} selected).`);
    for(const id of s.gifts) if(!giftEligible(s,byId[id])) issues.push(`${byId[id].name} is already provided by your regular selections; choose a different substitute reward.`);
  }
  return issues;
}

export function normalize(raw) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1) throw new Error('This file does not contain a supported Eternity build (version 1).');
  const s=emptyBuild();
  for(const key of ['name','arrival','notes']) {if(raw[key]!==undefined&&typeof raw[key]!=='string') throw new Error(`Invalid ${key}.`);s[key]=(raw[key]||s[key]).slice(0,key==='notes'?20000:300);}
  const listTypes={courses:['course'],specializations:['specialization'],sponsors:['sponsor'],companions:['companion'],quests:['quest'],gifts:['companion','character','sponsorBoon']};
  for(const [key,types] of Object.entries(listTypes)) {
    if(raw[key]!==undefined&&!Array.isArray(raw[key])) throw new Error(`Invalid ${key} list.`);
    for(const id of raw[key]||[]) if(typeof id!=='string'||!Object.hasOwn(byId,id)||!types.includes(byId[id].type)) throw new Error(`Unrecognized choice in ${key}.`);
    s[key]=[...new Set(raw[key]||[])];
  }
  if(raw.conspiracy&&!ofType('conspiracy').some(e=>e.id===raw.conspiracy)) throw new Error('Unrecognized conspiracy.');
  s.conspiracy=raw.conspiracy||'';
  if(raw.mode!==undefined&&!['quests','skip'].includes(raw.mode)) throw new Error('Unrecognized quest mode.');
  s.mode=raw.mode||'quests';
  if(raw.boons!==undefined&&(!raw.boons||typeof raw.boons!=='object'||Array.isArray(raw.boons))) throw new Error('Invalid boons.');
  for(const [id,n] of Object.entries(raw.boons||{})) {
    if(!Object.hasOwn(byId,id)||byId[id].type!=='boon'||!Number.isInteger(n)||n<1||n>(byId[id].repeatable?3:1)) throw new Error('Invalid boon or boon count.');
    s.boons[id]=n;
  }
  if(raw.questRewards!==undefined&&(!raw.questRewards||typeof raw.questRewards!=='object'||Array.isArray(raw.questRewards))) throw new Error('Invalid quest rewards.');
  for(const [id,v] of Object.entries(raw.questRewards||{})) {
    if(!Object.hasOwn(byId,id)||byId[id].type!=='quest'||typeof v!=='string'||!['auto','none','solo',...ofType('sponsorBoon').filter(e=>!e.solo&&e.sponsor===byId[id].requires).map(e=>e.id)].includes(v)) throw new Error('Invalid quest reward.');
    s.questRewards[id]=v;
  }
  return s;
}
const md = text => String(text).replace(/[\\`*_{}\[\]<>#|]/g,'\\$&').replace(/[\r\n]+/g,' ');
export function toMarkdown(s) {
  const issues=validate(s), {grants,rewards}=derive(s),lim=limits(s);
  const lines=[`# ${md(s.name||'My Venator')} — A Shot Unto Eternity`,'',`**Arrival:** ${md(s.arrival)}`,`**Build status:** ${issues.length?'Needs attention':'Complete'}`,'','## Academy',''];
  s.courses.forEach((id,i)=>{lines.push(`- **${md(byId[id].name)}**${i===0?' (academy course)':' (Alternative Studies)'}`);for(const sp of s.specializations.filter(sp=>byId[sp].requires===id)) lines.push(`  - Specialization: ${md(byId[sp].name)}`);});
  for(const id of s.specializations.filter(id=>!s.courses.includes(byId[id].requires))) lines.push(`- ${md(byId[id].name)} (requires ${md(byId[byId[id].requires].name)})`);
  lines.push('','## Boons','',`**Points:** ${boonCost(s)} / 3`,'');
  for(const [id,n] of Object.entries(s.boons)) lines.push(`- **${md(byId[id].name)}**${n>1?` × ${n}`:''} — ${n*byId[id].cost} point${n*byId[id].cost===1?'':'s'}`);
  lines.push('','## Sponsors','',`**Selected:** ${s.sponsors.length} / ${lim.sponsors}`,'');
  for(const id of s.sponsors){lines.push(`### ${md(byId[id].name)}`,'',`Handler: ${md(byId[id].handler)}`,'');for(const g of grants.filter(g=>byId[g.id].sponsor===id&&g.source===byId[id].name))lines.push(`- ${md(byId[g.id].name)}${byId[g.id].solo?' (solo sponsorship)':''}`);lines.push('');}
  lines.push('## Companions','',...s.companions.map(id=>`- ${md(byId[id].name)}`),'','## Conspiracy','',s.conspiracy?`**${md(byId[s.conspiracy].name)}** — includes its printed Conspiracy Focus.`:'Not chosen.','',s.mode==='skip'?'## Instead of Quests':'## Quests','');
  if(s.mode==='skip') for(const id of s.gifts){const e=byId[id];lines.push(`- ${md(e.name)}${e.sponsor?` — ${md(byId[e.sponsor].name)}${e.solo?' (solo boon)':''}`:e.conspiracy?` — ${md(byId[e.conspiracy].name)}`:''}`);}
  else for(const r of rewards){const q=byId[r.quest];lines.push(`### ${md(q.name)}`,'',`- Source: page ${q.page}`,`- Prerequisite: ${q.requires?md(byId[q.requires].name):'None'}`,`- Reward: ${md(r.label)}`,'');}
  if(s.notes) lines.push('## Character Notes','',...s.notes.split('\n').map(line=>`> ${line}`),'');
  if(issues.length) lines.push('## Rules to Resolve','',...issues.map(i=>`- ${md(i)}`),'');
  lines.push('## Credits','',`Original CYOA by **EternalAnon**. [Read the illustrated source](${SOURCE}).`,'','## Import Data','','Keep this block to restore this build in the interactive version.','','```cyoa-build',JSON.stringify(s,null,2),'```','');
  return lines.join('\n');
}
export function fromMarkdown(text) {
  if(text.length>250000) throw new Error('The file is too large to be an Eternity build.');
  const match=text.match(/```cyoa-build\s*\n([\s\S]*?)\n```/);
  if(!match) throw new Error('No import data found. Choose a Markdown file exported by this app.');
  let raw;try{raw=JSON.parse(match[1]);}catch{throw new Error('The import data is not valid JSON.');}
  return normalize(raw);
}
