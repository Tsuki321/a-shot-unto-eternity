import {pages, entries, byId, ofType} from './data.js';
import {emptyBuild, limits, boonCost, toggle, derive, validate, normalize, toMarkdown, fromMarkdown, rewardOptions, giftEligible, isSelected} from './rules.js';

const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='eternity-build-v1';
const typeLabels={course:'Courses',specialization:'Specializations',boon:'Boons',sponsor:'Sponsors',sponsorBoon:'Sponsorship boons',companion:'Companions',conspiracy:'Conspiracies',character:'Conspiracy characters',quest:'Quests'};
let state=emptyBuild(), currentPage=1, view='art', detailId=null, toastTimer, confirmAction=null, storageAvailable=true;
try { const saved=localStorage.getItem(STORAGE); if(saved) state=normalize(JSON.parse(saved)); } catch { storageAvailable=false; }
const selected = e => isSelected(state,e) || (state.mode==='skip'&&state.gifts.includes(e.id));
const totalChoices = () => state.courses.length+state.specializations.length+Object.values(state.boons).reduce((a,b)=>a+b,0)+state.sponsors.length+state.companions.length+Number(Boolean(state.conspiracy))+(state.mode==='quests'?state.quests.length:state.gifts.length);
function toast(message) { $('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200); }
function save() {
  try { localStorage.setItem(STORAGE,JSON.stringify(state)); storageAvailable=true;$('save-status').textContent='Saved in this browser'; }
  catch { storageAvailable=false;$('save-status').textContent='Browser saving unavailable — export to keep your build'; }
}
function change(next, message) { state=next;save();refresh();if(message)toast(message); }
function action(id, delta) {
  const e=byId[id];
  if(e.type==='quest'&&state.mode==='skip') {toast('Switch to “Choose quests” to select an adventure.');return;}
  if(['sponsorBoon','character'].includes(e.type)) {
    if(state.mode!=='skip') {openDetail(id);return;}
    if(!state.gifts.includes(id)&&!giftEligible(state,e)) {toast('This sponsor already provides its boons. Choose a reward from another sponsor.');return;}
  }
  const next=toggle(state,id,delta);
  const now=e.type==='boon'?next.boons[id]>0:e.type==='conspiracy'?next.conspiracy===id:e.type==='character'||e.type==='sponsorBoon'?next.gifts.includes(id):isSelected(next,e);
  change(next,`${e.name}${delta!==undefined?`: ${next.boons[id]||0} taken`:now?' selected':' removed'}.`);
}
function meta(e) {
  const bits=[];
  if(e.requires) bits.push(`Requires ${byId[e.requires].name}`);
  if(e.type==='boon') bits.push(`${e.cost} boon point${e.cost===1?'':'s'}`, ...(e.repeatable?['Repeatable']:[]));
  if(e.type==='sponsor') bits.push(`Handler: ${e.handler}`);
  if(e.type==='sponsorBoon') bits.push(byId[e.sponsor].name,e.solo?'Solo sponsorship boon':'Sponsorship boon');
  if(e.type==='character') bits.push(byId[e.conspiracy].name,'Available as a substitute reward when skipping quests');
  if(e.type==='course'&&state.courses[0]===e.id) bits.push('Your academy course');
  if(e.type==='conspiracy') bits.push('Includes the printed Conspiracy Focus');
  if(e.type==='quest'&&!e.requires) bits.push('No prerequisite');
  return bits.join(' · ');
}
function controls(e, detail=false) {
  const on=selected(e), n=state.boons[e.id]||0;
  if(e.type==='boon'&&e.repeatable) return `<button data-action="${e.id}" data-delta="-1" aria-label="Remove one ${esc(e.name)}" ${!n?'disabled':''}>−</button><span aria-label="${n} taken">${n}</span><button data-action="${e.id}" data-delta="1" aria-label="Add one ${esc(e.name)}" ${n>=3?'disabled':''}>+</button>`;
  if(['sponsorBoon','character'].includes(e.type)&&state.mode!=='skip') return detail?`<p class="muted">${e.type==='character'?'Skip quests to take this character as a substitute reward.':on?'Granted by your build.':'Granted through sponsorship, a quest, or a substitute reward.'}</p>`:'';
  return `<button data-action="${e.id}" aria-pressed="${on}">${on?'✓ Selected':e.type==='sponsorBoon'||e.type==='character'?'Choose reward':'Select'}</button>`;
}
function renderPage() {
  const page=pages[currentPage-1];
  $('page-number').textContent=`PAGE ${String(currentPage).padStart(2,'0')} / 09`;
  $('page-title').textContent=page.title;$('page-rule').textContent=page.rule;
  $('page-nav').innerHTML=pages.map(p=>`<button data-page="${p.number}" aria-label="Page ${p.number}: ${p.title}" ${currentPage===p.number?'aria-current="page"':''}><span class="nav-number">${String(p.number).padStart(2,'0')}</span> ${p.title}</button>`).join('');
  $('previous').disabled=$('bottom-previous').disabled=currentPage===1;
  $('next').disabled=$('bottom-next').disabled=currentPage===9;
  $('quest-mode-wrap').hidden=currentPage<8;
  $('illustration').innerHTML=`<img src="${page.image}" width="1600" height="${page.height}" alt="Original illustrated page ${page.number}: ${page.title}. Selectable choices are overlaid; use the choice list to browse their names." fetchpriority="high">`;
  $('illustration').querySelector('img').addEventListener('error',()=>toast('The illustration could not load. Your choices are still available in the choice list.'));
  $('choice-search').value='';
  refresh();
}
function renderHotspots() {
  const page=pages[currentPage-1], grants=derive(state).grants;
  $('illustration').querySelectorAll('.hotspot').forEach(e=>e.remove());
  for(const e of entries.filter(e=>e.page===currentPage)) {
    const [x,y,w,h]=e.rect, on=selected(e), granted=grants.some(g=>g.id===e.id), inactive=['sponsorBoon','character'].includes(e.type)&&state.mode!=='skip';
    const button=document.createElement('button');button.className=`hotspot${on?' selected':''}${granted?' granted':''}${inactive?' inactive':''}${on&&e.requires&&['boon','specialization'].includes(e.type)&&!state.courses.includes(e.requires)?' problem':''}`;
    button.style.cssText=`left:${x/16}%;top:${y/page.height*100}%;width:${w/16}%;height:${h/page.height*100}%`;
    button.dataset.action=e.id;button.setAttribute('aria-label',`${e.name}${inactive?' — view details':''}`);button.setAttribute('aria-pressed',String(on));button.title=`${e.name}${meta(e)?' — '+meta(e):''}`;
    if(on||granted) button.innerHTML=`<span class="badge">${e.type==='boon'&&e.repeatable?'× '+state.boons[e.id]:granted?'✓ Granted':'✓'}</span>`;
    $('illustration').append(button);
  }
}
function renderCatalog() {
  const search=$('choice-search').value.trim().toLowerCase();
  const pageEntries=entries.filter(e=>e.page===currentPage&&`${e.name} ${meta(e)}`.toLowerCase().includes(search));
  $('choice-list').innerHTML=Object.entries(typeLabels).map(([type,label])=>{
    const list=pageEntries.filter(e=>e.type===type);if(!list.length)return '';
    return `<section class="catalog-group"><h3>${label}</h3>${list.map(e=>`<div class="choice-row ${selected(e)?'selected':''}"><div class="choice-info"><strong>${esc(e.name)}</strong><small>${esc(meta(e))}</small></div>${controls(e)}<button data-detail="${e.id}" aria-label="Read ${esc(e.name)}">Read</button></div>`).join('')}</section>`;
  }).join('')||'<p class="muted">No choices match your search.</p>';
}
function renderGifts() {
  document.querySelectorAll('[name="quest-mode"]').forEach(input=>input.checked=input.value===state.mode);
  $('gifts-panel').hidden=state.mode!=='skip';
  if(state.mode!=='skip')return;
  const eligible=entries.filter(e=>giftEligible(state,e)&&!state.gifts.includes(e.id));
  $('gifts-panel').innerHTML=`<p>Choose a boon from an unselected sponsor, an additional companion, or a conspiracy character. Solo boons are included here because the printed skip rule does not exclude them.</p><div class="gift-controls"><select id="gift-choice" aria-label="Substitute reward">${['sponsorBoon','companion','character'].map(type=>`<optgroup label="${typeLabels[type]}">${eligible.filter(e=>e.type===type).map(e=>`<option value="${e.id}">${esc(e.name)}${e.sponsor?' — '+esc(byId[e.sponsor].name):e.conspiracy?' — '+esc(byId[e.conspiracy].name):''}</option>`).join('')}</optgroup>`).join('')}</select><button id="add-gift">Add reward</button></div>${state.gifts.map(id=>`<div class="choice-row selected"><div class="choice-info"><strong>${esc(byId[id].name)}</strong><small>${esc(meta(byId[id]))}</small></div><button data-detail="${id}">Read</button><button data-remove-gift="${id}" aria-label="Remove ${esc(byId[id].name)}">Remove</button></div>`).join('')}`;
}
function summaryGroup(label, ids, gift=false) {
  if(!ids.length)return '';
  return `<section class="summary-group"><h3>${label}</h3>${ids.map(id=>`<div class="summary-item"><button class="name" data-detail="${id}">${esc(byId[id].name)}${state.boons[id]>1?' × '+state.boons[id]:''}</button><button class="remove" ${gift?'data-remove-gift':'data-action'}="${id}" aria-label="Remove ${esc(byId[id].name)}">×</button></div>`).join('')}</section>`;
}
function renderSummary() {
  const lim=limits(state), issues=validate(state), {grants,rewards}=derive(state);
  const counters=[['Courses',state.courses.length,lim.courses],['Specialties',state.specializations.length,lim.specializations],['Boon points',boonCost(state),3],['Sponsors',state.sponsors.length,lim.sponsors],['Companions',state.companions.length,6],[state.mode==='quests'?'Quests':'Rewards',state.mode==='quests'?state.quests.length:state.gifts.length,4]];
  $('counters').innerHTML=counters.map(([name,n,max])=>`<div class="counter ${n>max?'over':''}"><span>${name}</span><strong>${n} / ${max}</strong></div>`).join('');
  const statusOpen=$('rule-status').querySelector('details')?.open;
  $('rule-status').innerHTML=issues.length?`<details class="status" ${statusOpen?'open':''}><summary>${issues.length} item${issues.length===1?'':'s'} to resolve</summary><ul>${issues.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></details>`:'<div class="status good">✓ Your build follows the choice rules.</div>';
  $('summary').innerHTML=summaryGroup('Academy courses',state.courses)+summaryGroup('Specializations',state.specializations)+summaryGroup('Boons',Object.keys(state.boons))+summaryGroup('Sponsors',state.sponsors)+summaryGroup('Companions',state.companions)+summaryGroup('Conspiracy',state.conspiracy?[state.conspiracy]:[])+(state.mode==='quests'?summaryGroup('Quests',state.quests):summaryGroup('Substitute rewards',state.gifts,true))+(grants.length?`<section class="summary-group"><h3>Granted by your choices</h3>${grants.map(g=>`<div class="grant"><a href="#" data-detail="${g.id}">${esc(byId[g.id].name)}</a><br><small>${esc(g.source)}</small></div>`).join('')}</section>`:'')+(rewards.length?`<section class="summary-group"><h3>Quest rewards</h3>${rewards.map(r=>`<div class="reward-select"><label for="reward-${r.quest}">${esc(byId[r.quest].name)}</label><select id="reward-${r.quest}" data-reward="${r.quest}">${rewardOptions(state,byId[r.quest]).map(o=>`<option value="${o.value}" ${o.value===r.choice?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>`).join('')}</section>`:'')+(!totalChoices()?'<p class="empty">Your choices will appear here. Start with a course on page 1.</p>':'');
  $('mobile-count').textContent=issues.length?`${totalChoices()} choices`:'✓ Complete';
}
function refresh() {
  const active=document.activeElement, focusAction=active?.dataset.action, focusReward=active?.dataset.reward, focusDetail=active?.dataset.detail, focusDelta=active?.dataset.delta;
  const container=active?.closest('#catalog,#illustration,#summary,#detail-controls')?.id;
  renderHotspots();renderCatalog();renderSummary();renderGifts();
  if(detailId&&$('detail-dialog').open) renderDetailControls();
  if(focusReward) document.querySelector(`[data-reward="${focusReward}"]`)?.focus({preventScroll:true});
  else if(container&&focusAction) $(container).querySelector(`[data-action="${focusAction}"]${focusDelta!==undefined?`[data-delta="${focusDelta}"]`:''}`)?.focus({preventScroll:true});
  else if(container&&focusDetail) $(container).querySelector(`[data-detail="${focusDetail}"]`)?.focus({preventScroll:true});
}
function showPage(number, scroll=true) {
  currentPage=Math.min(9,Math.max(1,number));renderPage();
  if(location.hash!==`#page-${currentPage}`)history.replaceState(null,'',`#page-${currentPage}`);
  if(scroll)$('workspace').scrollIntoView({behavior:'instant',block:'start'});
}
function showView(next) {
  view=next;$('illustration-scroll').hidden=view!=='art';$('catalog').hidden=view!=='list';$('zoom-wrap').hidden=view!=='art';$('reading-hint').hidden=view!=='art';$('art-view').setAttribute('aria-pressed',String(view==='art'));$('list-view').setAttribute('aria-pressed',String(view==='list'));
}
function renderDetailControls() {
  const e=byId[detailId];
  $('detail-controls').innerHTML=`<div class="button-row">${controls(e,true)}${e.type==='companion'&&state.mode==='skip'&&giftEligible(state,e)?`<button data-gift="${e.id}">${state.gifts.includes(e.id)?'Remove substitute reward':'Take as substitute reward'}</button>`:''}<button data-jump="${e.page}">Go to page ${e.page}</button>${e.focusRect?'<button id="read-focus">Read Conspiracy Focus</button>':''}</div>`;
}
function showCrop(pageNumber, rect) {
  const [x,y,w,h]=rect;
  $('detail-crop').style.cssText=`width:${w}px;height:${h}px`;
  $('detail-crop').innerHTML=`<img src="${pages[pageNumber-1].image}" width="1600" height="${pages[pageNumber-1].height}" style="left:-${x}px;top:-${y}px" alt="Original illustrated description of ${esc(byId[detailId].name)}">`;
}
function openDetail(id) {
  detailId=id;const e=byId[id];$('detail-title').textContent=e.name;$('detail-meta').textContent=meta(e);renderDetailControls();showCrop(e.page,e.sourceRect||e.rect);if(!$('detail-dialog').open)$('detail-dialog').showModal();
  document.querySelector('.detail-scroll').scrollTo(0,0);
}
function confirm(title,text,callback) { $('confirm-title').textContent=title;$('confirm-text').textContent=text;confirmAction=callback;$('confirm-dialog').showModal();$('confirm-cancel').focus(); }
function syncFields() {$('build-name').value=state.name;$('arrival').value=state.arrival;$('build-notes').value=state.notes;}
document.addEventListener('click',event=>{
  const button=event.target.closest('button,a[data-detail]');if(!button)return;
  if(button.dataset.action){action(button.dataset.action,button.dataset.delta!==undefined?Number(button.dataset.delta):undefined);return;}
  if(button.dataset.detail){event.preventDefault();openDetail(button.dataset.detail);return;}
  if(button.dataset.page){showPage(Number(button.dataset.page));return;}
  if(button.dataset.jump){$('detail-dialog').close();showPage(Number(button.dataset.jump));return;}
  if(button.dataset.removeGift){change({...state,gifts:state.gifts.filter(id=>id!==button.dataset.removeGift)},'Substitute reward removed.');return;}
  if(button.dataset.gift){const id=button.dataset.gift;change({...state,gifts:state.gifts.includes(id)?state.gifts.filter(v=>v!==id):[...state.gifts,id]});return;}
  if(button.id==='add-gift'){const id=$('gift-choice').value;if(id)change({...state,gifts:[...state.gifts,id]},`${byId[id].name} added as a substitute reward.`);return;}
  if(button.id==='read-focus'){showCrop(byId[detailId].page,byId[detailId].focusRect);document.querySelector('.detail-scroll').scrollTo(0,0);}
});
document.addEventListener('change',event=>{
  if(event.target.dataset.reward)change({...state,questRewards:{...state.questRewards,[event.target.dataset.reward]:event.target.value}});
  if(event.target.name==='quest-mode')change({...state,mode:event.target.value});
});
$('previous').onclick=$('bottom-previous').onclick=()=>showPage(currentPage-1);
$('next').onclick=$('bottom-next').onclick=()=>showPage(currentPage+1);
$('art-view').onclick=()=>showView('art');$('list-view').onclick=()=>showView('list');
$('choice-search').oninput=renderCatalog;
$('zoom').onchange=()=>{$('illustration').style.width=$('zoom').value==='fit'?'100%':`${$('zoom').value}px`;};
for(const [id,key] of [['build-name','name'],['arrival','arrival'],['build-notes','notes']])$(id).addEventListener('input',()=>{state[key]=$(id).value;save();});
$('detail-close').onclick=()=>$('detail-dialog').close();
$('detail-dialog').addEventListener('close',()=>{detailId=null;});
$('confirm-cancel').onclick=()=>{$('confirm-dialog').close();confirmAction=null;};
$('confirm-accept').onclick=()=>{const callback=confirmAction;confirmAction=null;$('confirm-dialog').close();callback?.();};
$('mobile-build').onclick=()=>{const open=$('build-panel').classList.toggle('open');$('mobile-build').setAttribute('aria-expanded',String(open));if(open)$('close-build').focus();};
$('close-build').onclick=()=>{$('build-panel').classList.remove('open');$('mobile-build').setAttribute('aria-expanded','false');$('mobile-build').focus();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('detail-dialog').open&&!$('confirm-dialog').open&&$('build-panel').classList.contains('open'))$('close-build').click();});
$('reset-button').onclick=()=>confirm('Start a new build?','This replaces the build saved in this browser. Export it first if you want to keep a copy.',()=>{change(emptyBuild(),'A new story awaits.');syncFields();showPage(1);});
$('export-button').onclick=()=>{
  const blob=new Blob([toMarkdown(state)],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`${(state.name||'eternity-build').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'eternity-build'}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your formatted Markdown build is ready.');
};
$('import-button').onclick=()=>$('import-file').click();
$('import-file').onchange=async()=>{
  const file=$('import-file').files[0];$('import-file').value='';if(!file)return;
  try {
    if(file.size>250000)throw new Error('Choose a Markdown build smaller than 250 KB.');
    const imported=fromMarkdown(await file.text()),issues=validate(imported);
    confirm('Import this build?',`${imported.name||'Unnamed Venator'} — ${issues.length?`${issues.length} rules to resolve`:'complete build'}. This replaces your current saved build.`,()=>{change(imported,'Build imported.');syncFields();});
  } catch(error){toast(error.message);}
};
window.addEventListener('hashchange',()=>{const match=location.hash.match(/^#page-([1-9])$/);if(match)showPage(Number(match[1]));});
syncFields();
const initial=location.hash.match(/^#page-([1-9])$/);showPage(initial?Number(initial[1]):1,false);
if(!storageAvailable){$('save-status').textContent='Saved build could not be read — export to keep new choices';toast('The saved build could not be read. You can import a Markdown backup.');}
else if(totalChoices())$('save-status').textContent='Restored your saved build';
