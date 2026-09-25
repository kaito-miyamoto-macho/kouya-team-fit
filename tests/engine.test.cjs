const assert=require('node:assert/strict');
const D=require('../data.js'),E=require('../engine.js');
const base=(pick)=>Object.fromEntries(D.base.map(q=>[q.id,pick(q)]));
const complete=(answers,pick)=>{for(let i=0;i<4;i++){for(const q of E.getQuestions(answers)){if(!Object.hasOwn(answers,q.id))answers[q.id]=pick(q);}}return answers;};
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name);}
test('Unknowns never become low or average ratings',()=>{
 const a=complete(base(q=>q.options.length-1),q=>q.options.length-1),r=E.diagnose(a);
 assert.equal(r.answered,25);assert.equal(r.known,0);assert.equal(r.primary,null);assert.equal(r.loadout.length,0);
 assert.ok(Object.values(r.abilities).every(x=>x.score===null));assert.ok([...r.roles,...r.weapons].every(x=>x.score===null));
});
test('A single observation cannot establish ability; extremes require corroboration',()=>{
 assert.equal(E.summarize([{value:5,weight:1}]).score,null);
 assert.equal(E.summarize([{value:4,weight:1},{value:5,weight:1}]).score,4);
 assert.equal(E.summarize([{value:5,weight:1},{value:5,weight:1}]).score,5);
 assert.equal(E.summarize([{value:1,weight:1},{value:2,weight:1}]).score,2);
 assert.equal(E.summarize([{value:1,weight:1},{value:1,weight:1}]).score,1);
});
test('Passive survival is not rewarded as effective survival',()=>{
 const active=complete(base(()=>0),()=>0),passive={...active,participation:2,isolation:3,retreat:3};
 assert.ok(E.diagnose(active).abilities.survival.score>E.diagnose(passive).abilities.survival.score);
});
test('Preference does not determine ratings',()=>{
 const a=complete(base(()=>1),()=>1),b={...a,style:4};
 const ra=E.diagnose(a),rb=E.diagnose(b);
 assert.deepEqual(ra.roles.map(x=>[x.id,x.score]),rb.roles.map(x=>[x.id,x.score]));
});
test('Close-range weakness activates cause and aim-offset questions',()=>{
 const a=base(()=>1);a.close=2;a.closeDetail=0;
 const ids=E.getQuestions(a).map(x=>x.id);assert.ok(ids.includes('closeDetail'));assert.ok(ids.includes('aimOffset'));assert.ok(ids.length<=25);
 const changed={...a,close:1};assert.ok(!E.getQuestions(changed).some(q=>q.id==='closeDetail'));
});
test('Contradictory evidence activates verification',()=>{
 const a=base(()=>1);a.snap=0;a.duel=2;
 assert.ok(E.getQuestions(a).some(q=>q.id==='verify_initialAim'));
 const r=E.diagnose(a);assert.equal(r.abilities.initialAim.conflict,true);assert.ok(r.abilities.initialAim.score<5);
});
test('Weak close range alone does not imply marksman or SG suitability',()=>{
 const a=complete(base(q=>q.options.length-1),q=>q.options.length-1);a.close=2;a.duel=2;a.snap=2;a.handling=2;
 const r=E.diagnose(a);assert.equal(r.roles.find(x=>x.id==='marksman').score,null);assert.ok(r.weapons.find(x=>x.id==='sg').score<=2);
});
test('Known precision/support profile favors marksman over entry; scout bottleneck limits flanker',()=>{
 const a=base(()=>1);Object.assign(a,{close:2,ar:2,sr:0,precision:0,tracking:2,snap:2,duel:2,handling:1,spot:2,scan:2,awareness:2,cross:0,peek:0,zone:0,rescue:0,retreat:0,isolation:0,participation:0,cover:1,push:0});
 complete(a,q=>q.id==='closeDetail'?0:0);const r=E.diagnose(a);
 assert.ok(r.roles.find(x=>x.id==='marksman').score>r.roles.find(x=>x.id==='entry').score);
 assert.ok(r.roles.find(x=>x.id==='flanker').score<=3);assert.ok(r.weapons.find(x=>x.id==='bolt').score>r.weapons.find(x=>x.id==='sg').score);
});
test('Partial diagnosis is resumable and copy includes all requested output',()=>{
 const r=E.diagnose({style:0,close:1,ar:1,sr:1,precision:1});assert.equal(r.complete,false);assert.equal(r.answered,5);
 const text=E.toText(r,'テスト');for(const heading of ['能力カルテ','役割適性','武器カテゴリ適性','推奨立ち回り','チームメイトへの取扱説明書','テスト'])assert.ok(text.includes(heading));
});
test('Every weapon category exposes three concrete examples in the result and copy',()=>{
 assert.equal(D.weapons.length,6);
 assert.ok(D.weapons.every(w=>Array.isArray(w.examples)&&w.examples.length===3));
 const a=complete(base(q=>0),q=>0),r=E.diagnose(a),text=E.toText(r);
 for(const weapon of D.weapons)for(const example of weapon.examples)assert.ok(text.includes(example));
});
test('2,000 deterministic answer paths satisfy rating, branching and safety invariants',()=>{
 let seed=872;const rnd=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
 for(let i=0;i<2000;i++){
  const a=complete(base(q=>rnd(q.options.length)),q=>rnd(q.options.length)),r=E.diagnose(a);
  assert.ok(r.questions.length>=22&&r.questions.length<=25);assert.equal(r.complete,true);assert.equal(new Set(r.questions.map(q=>q.id)).size,r.questions.length);
  for(const x of [...Object.values(r.abilities),...r.roles,...r.weapons,...r.distances])assert.ok(x.score===null||Number.isInteger(x.score)&&x.score>=1&&x.score<=5);
  for(const role of r.roles){if(role.core.some(k=>r.abilities[k].score===null))assert.equal(role.score,null);}
 }
});
console.log(`${count} tests passed.`);
