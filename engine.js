(function(root){
'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./data.js'):root.KouyaData;
function evidence(answers,questions){
 const result=Object.fromEntries(D.abilities.map(a=>[a.id,[]]));
 for(const question of questions){
  const option=question.options[answers[question.id]];
  if(!option)continue;
  for(const [id,value] of Object.entries(option.scores))result[id].push({value,weight:option.weight,question:question.title,answer:option.text,id:question.id});
 }
 return result;
}
function summarize(entries){
 const count=entries.length;
 if(count<2)return {score:null,raw:null,count,conflict:false,entries};
 const raw=entries.reduce((s,e)=>s+e.value*e.weight,0)/entries.reduce((s,e)=>s+e.weight,0);
 const conflict=entries.some(e=>e.value<=2)&&entries.some(e=>e.value>=4);
 let score=Math.round(raw);
 // Extreme ratings require at least two independent, consistent observations.
 if(score===5&&(entries.filter(e=>e.value===5).length<2||conflict))score=4;
 if(score===1&&(entries.filter(e=>e.value===1).length<2||conflict))score=2;
 return {score,raw,count,conflict,entries};
}
function checkQuestion(id,kind){
 const c=D.checks[id];
 return D.q(`${kind}_${id}`,'追加確認',c[0],kind==='verify'?'これまでの回答に差があるため、普段に近い結果をもう一度確認します。':'この能力の情報が少ないため、もう一つだけ確認します。',[
 D.o(c[1],{[id]:5}),D.o(c[2],{[id]:3}),D.o(c[3],{[id]:1})]);
}
function getQuestions(answers){
 const questions=[...D.base];
 // Adaptive questions begin after the 22 shared questions. Maximum total: 25.
 if(!D.base.every(q=>Object.hasOwn(answers,q.id)))return questions;
 const baseEvidence=evidence(answers,D.base);
 const conflicts=D.abilities.filter(a=>summarize(baseEvidence[a.id]).conflict);
 const missing=D.abilities.filter(a=>baseEvidence[a.id].length<2);
 if(answers.close===2)questions.push(D.branches.closeDetail);
 if(answers.sr===0&&questions.length<25)questions.push(D.branches.sniper);
 if(conflicts.length&&questions.length<25)questions.push(checkQuestion(conflicts[0].id,'verify'));
 if(answers.close===2&&answers.closeDetail===0&&questions.length<25)questions.push(D.branches.aimOffset);
 for(const a of missing){if(questions.length>=25)break;questions.push(checkQuestion(a.id,'clarify'));}
 return questions;
}
function fit(def,abilities){
 const keys=Object.keys(def.weights),known=keys.filter(k=>abilities[k].score!==null);
 const coverage=known.reduce((s,k)=>s+def.weights[k],0)/keys.reduce((s,k)=>s+def.weights[k],0);
 if(coverage<0.75||def.core.some(k=>abilities[k].score===null))return {...def,score:null,raw:null,reason:'必要な能力の情報が足りないため、保留。'};
 let raw=known.reduce((s,k)=>s+abilities[k].score*def.weights[k],0)/known.reduce((s,k)=>s+def.weights[k],0);
 const bottleneck=Math.min(...def.core.map(k=>abilities[k].score));
 // A critical weakness cannot be hidden by unrelated strengths.
 if(bottleneck<=2)raw=Math.min(raw,bottleneck+1);
 let score=Math.round(raw);
 if(score===5&&(bottleneck<4||def.core.filter(k=>abilities[k].score===5).length<2))score=4;
 const constrained=def.core.filter(k=>abilities[k].score<=2);
 const used=constrained.length?constrained:def.core;
 const names=used.map(k=>`${D.abilities.find(a=>a.id===k).name} ${abilities[k].score}`).join('・');
 return {...def,score,raw,reason:constrained.length?`${names} を味方や立ち回りで補う必要があります。`:`${names} の組み合わせから推定。`};
}
const strengthText={
 staticAim:'敵位置が分かり、狙う時間を作れる場面で、小さな標的に射撃を通す。',dynamicAim:'横に移動する敵へ照準を合わせ続け、ARで継続して削る。',initialAim:'突然の接敵でも最初の照準を素早く合わせ、撃ち始めを作る。',closeCombat:'遮蔽と武器の持ち替えを使い、近距離戦を継続する。',recoilControl:'連射中も照準を保ち、同じ標的に弾を集める。',spotting:'移動中に周囲を見て、味方より早く敵の存在を知らせる。',awareness:'敵と味方の位置変化を捉え、見えた情報と不明な情報を分ける。',firingLine:'味方のカバーが届く範囲で別角度を作り、危険な射線を切る。',positioning:'安置移動や交戦の前に、遮蔽と退路を確保する。',decisionMaking:'人数や位置の変化に合わせ、詰め・維持・撤退を切り替える。',survival:'攻撃や援護に参加しつつ、被弾後に退いて立て直す。',teamwork:'味方のカバーや詰めるタイミングを合わせ、孤立を減らす。'
};
const weaknessText={
 staticAim:'小さな静止目標へ一発で当てる勝負。まず胴体を狙える距離から安定させる。',dynamicAim:'走る敵を長く追う撃ち合い。敵が止まる瞬間や移動先へ照準を置く。',initialAim:'突然現れた敵への素早い照準合わせ。敵が出る位置に先に照準を置く。',closeCombat:'建物内での連続した近距離戦。前衛の後ろで、遮蔽からカバーする形を試す。',recoilControl:'反動の強い武器での長い連射。扱いやすいARと短い連射を基準にする。',spotting:'情報なしでの先行や大きな迂回。味方に方向・遮蔽・人数を具体的に報告してもらう。',awareness:'複数方向からの接敵。撃つ前に味方位置を確認し、情報を一つずつ整理する。',firingLine:'同じ場所から出続ける射撃。撃ったあとは一度隠れ、別の角度を探す。',positioning:'遮蔽のない場所での交戦や遅い安置移動。撃つ前に次の遮蔽と退路を決める。',decisionMaking:'詰め・撤退の切り替え。人数有利だけで飛び出さず、味方の距離と体力を確認する。',survival:'攻撃参加と生存の両立。被弾後に射線を切る位置を決めてから戦う。',teamwork:'単独での先行や遅れた援護。動く直前に一言伝え、カバーが届く距離を保つ。'
};
function diagnose(answers){
 const questions=getQuestions(answers),ev=evidence(answers,questions);
 const abilities=Object.fromEntries(D.abilities.map(a=>[a.id,{...a,...summarize(ev[a.id])}]));
 const roles=D.roles.map(r=>fit(r,abilities)).sort((a,b)=>(b.raw??-1)-(a.raw??-1));
 const weapons=D.weapons.map(w=>fit(w,abilities)).sort((a,b)=>(b.raw??-1)-(a.raw??-1));
 const viable=roles.filter(r=>r.score>=3),primary=viable[0]||null,secondary=viable[1]||null;
 const known=Object.values(abilities).filter(a=>a.score!==null);
 const strengths=known.filter(a=>a.score>=4).sort((a,b)=>b.score-a.score||b.raw-a.raw).slice(0,3).map(a=>({name:a.name,text:strengthText[a.id]}));
 const weaknesses=known.filter(a=>a.score<=2).sort((a,b)=>a.score-b.score).slice(0,3).map(a=>({name:a.name,text:weaknessText[a.id]}));
 const distances=[
 fit({name:'近距離',weights:{initialAim:2,closeCombat:3,dynamicAim:1},core:['initialAim','closeCombat']},abilities),
 fit({name:'中距離',weights:{dynamicAim:3,recoilControl:2,firingLine:1},core:['dynamicAim','recoilControl']},abilities),
 fit({name:'遠距離',weights:{staticAim:3,positioning:2,firingLine:1},core:['staticAim','positioning']},abilities)
 ];
 const title=!primary?(known.length<6?'情報不足・タイプは保留':'役割を試しながら調整する段階'):(secondary&&primary.raw-secondary.raw<=0.3?'複数の役割に適性あり':`${primary.name}タイプ`);
 const play=playbook(primary?.id,abilities);
 const weaponById=Object.fromEntries(weapons.map(w=>[w.id,w]));
 const ar=[weaponById.lowAR,weaponById.highAR].filter(w=>w.score>=3).sort((a,b)=>b.raw-a.raw)[0];
 const complements=weapons.filter(w=>!['lowAR','highAR'].includes(w.id)&&w.score>=3);
 const loadout=ar?[`${ar.name} ＋ ${complements[0]?.name||'使い慣れた補助武器'}`,complements[1]?`${ar.name} ＋ ${complements[1].name}`:null].filter(Boolean):[];
 return {version:D.version,answers,questions,answered:questions.filter(q=>Object.hasOwn(answers,q.id)).length,abilities,roles,weapons,primary,secondary,title,strengths,weaknesses,distances,play,loadout,known:known.length,conflicts:known.filter(a=>a.conflict).length,complete:questions.every(q=>Object.hasOwn(answers,q.id))};
}
function playbook(role,a){
 const plans={
 entry:['前衛を担当し、後ろの味方とカバーの合図を決める。','敵位置と味方の距離を確認し、接敵する場所を共有する。','カバーが届く範囲で最初に接敵し、敵の位置を伝える。'],
 attacker:['味方が仕掛ける場所と、火力を出せる射線を確認する。','削れている敵と、味方の射線を確認する。','前衛が接敵したタイミングで、狙う敵を合わせる。'],
 second:['前衛の少し後ろで、横に動ける遮蔽を確保する。','前衛が見つけた敵の位置を確認し、別の射線を探す。','前衛が撃ち合う敵へ、半歩横からカバーを入れる。'],
 marksman:['前衛から離れすぎず、狙う時間と退路のある場所を取る。','方向・遮蔽・人数を共有してもらい、精密射撃の標的を決める。','静止や頭出しの瞬間を狙い、味方が動く起点を作る。'],
 flanker:['横展開できる遮蔽と、味方へ戻る経路を確認する。','未確認の敵と別部隊の可能性を味方と共有する。','カバーが届く範囲で横へ動き、別角度から圧力をかける。'],
 cover:['味方の位置と、援護・退避に使える射線を確認する。','誰が接敵し、誰をカバーするか短く共有する。','味方が動くタイミングに合わせて射撃し、敵の反撃を抑える。'],
 igl:['安置・遮蔽・退路を確認し、移動先を短く共有する。','敵の人数と位置を集め、不明な情報は不明のまま扱う。','接敵役・カバー役を合わせ、戦うか移動するかを伝える。']
 };
 const first=plans[role]||['味方と遮蔽・退路を確認する。','見えた敵の方向と人数を共有する。','一人で先行せず、味方とカバーが届く距離で戦う。'];
 const steps=[...first,'撃ったら射線を切り、味方位置と別方向の敵を確認して再開する。','体力・距離・残りの敵を確認し、合図して詰めるか有利を維持する。','遮蔽へ退き、射線を切ってカバー・蘇生・撤退を分担する。'];
 const team=[a.spotting.score!==null&&a.spotting.score<=2?'敵の方向だけでなく、遮蔽や人数まで具体的に報告してもらう。':'発見した敵の方向・遮蔽・人数を短く共有する。',role==='entry'?'先行する前に、後ろの味方がカバーできるか確認してもらう。':'前衛と別角度を作りつつ、カバーが届く距離を保つ。',a.awareness.score!==null&&a.awareness.score<=2?'複数の指示を重ねず、次の行動を一つずつ伝えてもらう。':'不明な敵位置を埋めるため、見えていない方向を分担する。','詰める・退くタイミングは、短い合図を決めて合わせる。'];
 return {steps,team};
}
function toText(r,name=''){
 const rate=x=>x.score===null?'不明':`${'★'.repeat(x.score)}${'☆'.repeat(5-x.score)} ${x.score}/5`;
 const section=(title,lines)=>`【${title}】\n${lines.join('\n')}`;
 const lines=[`荒野行動 チーム適性診断 v${r.version}`,name?`プレイヤー：${name}`:'',`タイプ：${r.title}`,`回答 ${r.answered}/${r.questions.length}問・${r.complete?'完了':'途中診断'}・自己申告に基づく推定`,
 section('能力カルテ',Object.values(r.abilities).map(a=>`${a.name}：${rate(a)}${a.conflict?'（回答に幅あり）':''}`)),
 section('役割適性',r.roles.map(a=>`${a.name}：${rate(a)} / ${a.reason}`)),
 section('役割候補',[`第一：${r.primary?.name||'保留'}`,`第二：${r.secondary?.name||'保留'}`]),
 section('得意な場面',r.strengths.length?r.strengths.map(x=>x.text):['明確な強みはまだ特定できません。']),
 section('補いたい場面',r.weaknesses.length?r.weaknesses.map(x=>x.text):['回答から明確な苦手は特定されていません。']),
 section('武器カテゴリ適性',r.weapons.map(a=>`${a.name}：${rate(a)} / ${a.reason}`)),
 section('武器構成の候補',r.loadout.length?r.loadout:['情報・適性の確認が必要なため保留。']),
 section('交戦距離',r.distances.map(a=>`${a.name}：${rate(a)}`)),
 section('推奨立ち回り',r.play.steps.map((s,i)=>`${['接敵前','敵発見','接敵','交戦中','人数有利','人数不利'][i]}：${s}`)),
 section('チームメイトへの取扱説明書',r.play.team),
 '5段階は相対順位や勝率ではありません。戦績・動画の分析は含まず、実際の連携で調整してください。武器はカテゴリ単位の提案です。'];
 return lines.filter(Boolean).join('\n\n');
}
const E={evidence,summarize,getQuestions,diagnose,toText,fit};
if(typeof module!=='undefined'&&module.exports)module.exports=E;root.KouyaEngine=E;
})(typeof globalThis!=='undefined'?globalThis:this);
