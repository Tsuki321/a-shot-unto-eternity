// Coordinates refer to the unmodified 1600 px wide illustrated source pages.
export const SOURCE = 'https://imgchest.com/p/9249g6vlm7n';
export const pages = [
  ['Academy', 'Choose one course and one specialization within that course.'],
  ['Boons', 'Spend 3 boon points. Alternative Studies and Multipurpose Specialist can be taken more than once.'],
  ['Sponsors I', 'Choose up to 2 sponsors across both pages. Each grants two boons; a single sponsor also grants its solo boon.'],
  ['Sponsors II', 'These sponsors share the same allowance as page 3. A Nobody increases your allowance to 3.'],
  ['Companions', 'Choose up to 4 companions to share your journey.'],
  ['Conspiracies I', 'Choose one conspiracy across both pages. Its Conspiracy Focus becomes part of your story.'],
  ['Conspiracies II', 'These conspiracies share the same single choice as page 6.'],
  ['Quests I', 'Choose up to 4 quests across both pages, or skip quests and choose up to 4 substitute rewards.'],
  ['Quests II', 'Quest rewards depend on your existing sponsors and companions. Rewards can also be declined.'],
].map(([title, rule], i) => ({number:i+1, title, rule, height:i===6?7300:i===8?9400:9900, image:`assets/page-${i+1}.jpg`}));
export const entries = [];
export const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const add = (type, name, page, rect, extra={}) => {
  const entry = {id:`${type}-${slug(name)}`, type, name, page, rect, ...extra};
  entries.push(entry); return entry;
};
const courseRows = [
  ['Assault',3235,3501,4035,['Close Quarters','Sharpshooter','Persistence']],
  ['Recon',4173,4439,4973,['Stealth','Infiltration','Scouting']],
  ['Information Technology',5102,5368,5902,['Cracking','Analysis','Communications']],
  ['Investigations',6019,6285,6819,['Interrogations','Forensics','Deduction']],
  ['Medical',6948,7214,7748,['Emergency Care','Long Term Care','Chemistry']],
  ['Engineering',7889,8155,8689,['Logistics','Modification','Manufacture']],
  ['Emergent Magical Theorem',8835,9101,9635,['Arcana','Detection','Alchemy']],
];
for (const [name, y, sy, end, specializations] of courseRows) {
  const course = add('course',name,1,[8,y,1584,sy-y]);
  specializations.forEach((name,i)=>add('specialization',name,1,[8+i*530,sy,520,end-sy],{requires:course.id}));
}
const boonRows = [
  [1336,1886,'Assault',['Unrelenting','Eleventh Hour','Trickshot']],
  [2035,2585,'Recon',['Silent Running','Profiteering Risk','Combat Confusion']],
  [2718,3266,'Information Technology',['Dual Process','Digital Chance','Electronic Impossibilities']],
  [3409,3959,'Investigations',['Tactical Genius','Thoughtful Pause','No Stone Unturned']],
  [4092,4642,'Medical',['Combat Treatment','Before Their Time','Chemical Substitutions']],
  [4772,5322,'Engineering',['Resourceful','Mastercrafts','Call It In']],
  [5465,6012,'Emergent Magical Theorem',['The Spark','Voidborn','Nigredo']],
  [6162,6712,null,['Alternative Studies','Multipurpose Specialist','Beyond Human']],
  [6712,7265,null,['Combat Drones','Powerful Connections','Small Unit Tactics']],
  [7265,7816,null,['Way with Words','Weaponmaster','Monetary Benefits']],
  [7816,8372,null,["Spider’s Thread",'Danger Sense','Underworld Ties']],
  [8372,8927,null,['Wheelman','Prestigious Skill',"I’ve Got A Guy"]],
  [8927,9477,null,['The Modern Nobleman','A Nobody','Outside Fate']],
];
for (const [y,end,course,names] of boonRows) names.forEach((name,i)=>add('boon',name,2,[8+i*530,y,520,end-y],{
  requires:course?`course-${slug(course)}`:null, cost:name==='Outside Fate'?2:1,
  repeatable:['Alternative Studies','Multipurpose Specialist'].includes(name),
}));
const sponsorRows = [
  ['Humble Sundawn','Verona Lisch',["Lemuer’s Gift",'Enchanted weapon','Living shadow']],
  ['Nathaniel','Nathaniel',['Fledgling dragon','Necrosis grenades','Divine miracles and resurrection']],
  ['Alllussion Corp','Tsukiyo Asato',['Fame and resources','Five HoloTech bodyguards','HardLight bodyguards and influence']],
  ['Aethon PMC','Kedrov',['Military surplus','Kedrov’s contacts','Aethon’s loyalty']],
  ['Heath Auger','Eleanora Verne-Auger',['Hero equipment','Public relations protection','Heath’s favor']],
  ['EvoTech','Yuliana Shire',['Bioware or cyberware','Mercenary backup','Wolfpack or prototype augmentations']],
  ['Theon Assembly','Shari Creges',['Custom combat drones','Equipment and training contacts','VALKYRIE support']],
  ['VitaMed','Tamari Ayles',['Longevity treatment','VitaStim supply','Mythic gene treatment']],
  ['Hadur Arms','Damica Knight',['Advanced weapon training','Custom Rookies firearm','Elite contacts and backup']],
  ['Havelford','Liam Havelford',['Vehicle rentals','Corporate protection','Prototype vehicles and delivery']],
];
const sponsorY = [[1221,1629,2039,2441,2841],[2926,3334,3743,4146,4546],[4621,5029,5439,5841,6241],[6303,6711,7119,7523,7923],[7991,8399,8808,9211,9611]];
sponsorRows.forEach(([name,handler,boons],i)=>{
  const [y,dy,by,ey,end]=sponsorY[i%5], page=i<5?3:4;
  const sponsor=add('sponsor',name,page,[8,y,1584,by-y],{handler, sourceRect:[8,y,1584,end-y]});
  boons.forEach((name,j)=>add('sponsorBoon',name,page,[8+j*530,by,520,ey-by],{sponsor:sponsor.id,solo:j===2,slot:j}));
});
const companionNames = ['Lianne Shelby','Kallen Sithia','Flora Lafitte','Amelie Metrie','Adrian Shiro','Tannis Yuliana','Vitsin Nikotov','Julia Petrovna','Julian Quint','Elona','Heather Auclair','William Kayd','Fie Aruass','Lance DeLac','Holly Nerious','Noelle Millet','Mireille Bassot','Alizie Milhaud','Drake Antanova','Laenine Caerita'];
companionNames.forEach((name,i)=>add('companion',name,5,[8,1160+434*i,1584,434]));
const conspiracyRows = [
  ['House Duravau',['Erylis','Lyza','Stella','Thrall','Lesser Vampire']],
  ['The Enlightened Mertvya',['Elise Anthern','Urusov','Savvin','Soldier','Assassin']],
  ['Heistnet-11',['Robin','Georgia','Auberon','Copycats','Heistnet Gang']],
  ['Fair Market Collective',['Arthur Kievth','Ayla Petkos','Ryul','Security','L.Y.G.E.R. Security']],
  ['Societas Vitae',['The Prophet','He Of Shadows','Speaker of Before','Archivist','Praestes']],
];
conspiracyRows.forEach(([name,characters],i)=>{
  const page=i<3?6:7, y=1232+(i<3?i:i-3)*2890;
  const conspiracy=add('conspiracy',name,page,[8,y,1584,954],{focusRect:[8,y+2510,1584,350]});
  const rects=[[8,y+954,1584,475],[8,y+1429,784,722],[808,y+1429,784,722],[8,y+2151,784,352],[808,y+2151,784,352]];
  characters.forEach((name,j)=>add('character',name,page,rects[j],{conspiracy:conspiracy.id}));
});
const q8 = [
  ["The Mertvya’s Princess",'Humble Sundawn'],["God’s Out",'Nathaniel'],['Rising Star, Fallen Comet','Alllussion Corp'],['The Last Story of a Legend','Aethon PMC'],['War of the Auger','Heath Auger'],['Wish Upon a Venator','EvoTech'],['Old Dog, New Tricks','Theon Assembly'],['Genetic Keys','VitaMed'],['A Man of Sheer Determination','Hadur Arms'],['Corporate Kidnapping','Havelford'],['Quivering Blade','Lianne Shelby'],['Of Champagne and Roses','Kallen Sithia'],['The Floral Cycle','Flora Lafitte'],['The Mad Doctor','Amelie Metrie'],['Birds of a Feather','Adrian Shiro'],['Loyalty Thicker Than Blood','Tannis Yuliana'],['The Spawns of Hate','Vitsin Nikotov'],['The Other Side of the Mirror','Julia Petrovna'],['Runs in the Family','Julian Quint'],['Familial Ties','Elona'],['A Job Left Undone','Heather Auclair'],['The Anger of Good Men','William Kayd'],["A Father’s Footsteps",'Fie Aruass'],
];
const q9 = [
  ["A Knight’s Prestige",'Lance DeLac'],['Spiritual Troubles','Holly Nerious'],['Bonds Between Electric Sheep','Noelle Millet'],['Sprite in the Shell','Mireille Bassot'],['Dreamcatcher','Alizie Milhaud'],['World War Hadur','Drake Antanova'],['An Evil Scheme?','Laenine Caerita'],['Home Schooled'],['Forces of Nature'],['Blood Moon'],['To Slay Gods'],['Unravelling Threads'],['Brothers at Arms'],['Beyond the Mirror'],["Ramblers Gettin’ Ramblin’"],['A Net of Stolen Heists'],["I Dont Want To Go"],['Of Masks and Men'],['Passion of Man'],['What Could Have Been'],['Cultists Primer 101'],['To Call For Battle'],
];
[q8,q9].forEach((quests,j)=>quests.forEach(([name,prerequisite],i)=>add('quest',name,8+j,[8,1415+360*i,1584,360],{requires:prerequisite?entries.find(e=>e.name===prerequisite&&['sponsor','companion'].includes(e.type)).id:null})));
export const byId = Object.fromEntries(entries.map(e=>[e.id,e]));
export const ofType = type => entries.filter(e=>e.type===type);
