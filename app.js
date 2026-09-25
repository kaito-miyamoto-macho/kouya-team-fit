(function(){
'use strict';
const D=window.KouyaData,E=window.KouyaEngine;
const $=id=>document.getElementById(id);
let answers={},index=0,result=null,toastTimer;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rating=x=>x.score===null?'不明':`${'★'.repeat(x.score)}${'☆'.repeat(5-x.score)}`;
const meter=(score)=>`<div class="meter ${score!==null&&score<=2?'weak':''}" aria-hidden="true">${[1,2,3,4,5].map(n=>`<i class="${score!==null&&n<=score?'filled':''}"></i>`).join('')}</div>`;
function showQuestion(focus=true){
 const questions=E.getQuestions(answers),q=questions[index];
 $('result-view').hidden=true;$('question-view').hidden=false;document.body.classList.remove('show-result');
 $('question-title').textContent=q.title;$('question-hint').textContent=q.hint;
 $('question-number').textContent=`QUESTION ${String(index+1).padStart(2,'0')}`;
 $('section-label').textContent=q.group;$('branch-badge').hidden=index<22;
 const finalCount=D.base.every(q=>Object.hasOwn(answers,q.id));
 $('progress-label').textContent=`${String(index+1).padStart(2,'0')} / ${finalCount?questions.length:'22〜25'}問`;
 const answered=questions.slice(0,index).filter(q=>Object.hasOwn(answers,q.id)).length;
 $('progress').setAttribute('aria-valuenow',answered);$('progress').setAttribute('aria-valuemax',finalCount?questions.length:25);
 $('progress').setAttribute('aria-valuetext',`${answered}問回答済み。全${finalCount?questions.length:'22から25'}問。`);
 $('progress').firstElementChild.style.width=`${answered/(finalCount?questions.length:25)*100}%`;
 $('options').innerHTML='<legend class="sr-only">一番近い回答を一つ選んでください</legend>'+q.options.map((o,i)=>`<label class="option"><input type="radio" name="answer" value="${i}" ${answers[q.id]===i?'checked':''}><span class="option-text">${escape(o.text)}</span><span class="option-code" aria-hidden="true">${i===q.options.length-1?'—':String.fromCharCode(65+i)}</span></label>`).join('');
 $('back').disabled=index===0;$('next').disabled=!Object.hasOwn(answers,q.id);
 $('next').innerHTML=finalCount&&index===questions.length-1?'結果を見る <span aria-hidden="true">→</span>':'次へ <span aria-hidden="true">→</span>';
 $('finish-early').hidden=Object.keys(answers).length<5;
 document.querySelectorAll('.chapter-list li').forEach(li=>li.classList.toggle('active',li.dataset.group===q.group));
 if(focus){$('question-title').focus({preventScroll:true});$('question-view').scrollIntoView({block:'start',behavior:'instant'});}
}
$('options').addEventListener('change',event=>{
 const questions=E.getQuestions(answers),q=questions[index],value=Number(event.target.value);
 if(answers[q.id]!==value){
  // Changing an earlier answer discards all later answers, including now-inapplicable branches.
  const prefix=questions.slice(0,index).map(q=>q.id);
  answers=Object.fromEntries(Object.entries(answers).filter(([id])=>prefix.includes(id)));
  answers[q.id]=value;
 }
 $('next').disabled=false;$('finish-early').hidden=Object.keys(answers).length<5;
 // The final count can change when this answer activates an additional branch.
 const nextQuestions=E.getQuestions(answers);
 $('next').innerHTML=index===nextQuestions.length-1&&index>=21?'結果を見る <span aria-hidden="true">→</span>':'次へ <span aria-hidden="true">→</span>';
});
$('answer-form').addEventListener('submit',event=>{
 event.preventDefault();const questions=E.getQuestions(answers);
 if(!Object.hasOwn(answers,questions[index].id))return;
 if(index>=questions.length-1)showResult();else{index++;showQuestion();}
});
$('back').addEventListener('click',()=>{if(index>0){index--;showQuestion();}});
$('finish-early').addEventListener('click',showResult);
function section(id,n,title,body){return `<section id="${id}" class="result-section"><div class="section-title"><span>${n}</span><h3>${title}</h3></div>${body}</section>`;}
function row(item){return `<div class="role-row"><div><h4>${escape(item.name)}</h4><p>${escape(item.description||'')}</p></div><div class="role-rating"><span aria-label="${item.score===null?'不明':item.score+' / 5'}">${rating(item)}</span><small>${item.score===null?'根拠不足':item.score+' / 5'}</small></div><p class="reason">${escape(item.reason)}</p></div>`;}
function abilityCard(a){
 return `<div class="ability"><div class="ability-top"><strong>${a.name}</strong><span class="score">${a.score===null?'—':a.score}<small>${a.score===null?' 不明':' / 5'}</small></span></div><p class="description">${a.description}</p>${meter(a.score)}${a.conflict?'<p class="evidence-warning">回答に幅あり・暫定評価</p>':''}<details><summary>評価の根拠（${a.count}件）</summary>${a.score===null?'<p>独立した回答が2件未満のため、評価は保留です。</p>':''}<ul>${a.entries.map(e=>`<li>${escape(e.question)}<br>→ ${escape(e.answer)}</li>`).join('')||'<li>この能力を判断できる回答がありません。</li>'}</ul></details></div>`;
}
function showResult(){
 result=E.diagnose(answers);const r=result;
 $('question-view').hidden=true;$('result-view').hidden=false;document.body.classList.add('show-result');
 const noStrong=r.primary&&r.primary.score===3;
 const summary=r.primary?`${r.primary.description}${noStrong?' 突出した適性ではないため、まずこの役割から試してみましょう。':''}`:'回答だけでは主な役割を決めきれません。能力ごとの根拠を確認し、味方と役割を試しながら調整しましょう。';
 const name=$('player-name').value.trim();
 const weakRoles=r.roles.filter(x=>x.score!==null&&x.score<=2);
 const body=`<div class="result-hero"><div class="result-topline"><span class="eyebrow">YOUR SQUAD PROFILE</span><span class="tag">${r.complete?'診断完了':'途中診断'} · ${r.answered}問回答</span></div><p id="result-player" class="muted">${escape(name||'あなた')} の診断結果</p><h2 id="result-title" tabindex="-1">${escape(r.title)}</h2><p>${escape(summary)}</p><div class="role-candidates"><div><span>第一役割候補</span><strong>${escape(r.primary?.name||'保留')}</strong></div><div><span>第二役割候補</span><strong>${escape(r.secondary?.name||'保留')}</strong></div></div></div>
 <p class="scale-note">自己申告からの推定です。12能力中 ${r.known} 能力を評価${r.conflicts?` / ${r.conflicts}能力は回答に幅あり`:''}。実際の戦績・動画の分析は含みません。</p>
 <div class="result-actions"><button id="copy-result" class="button primary">結果をコピー <span aria-hidden="true">↗</span></button><button id="show-text" class="button secondary">テキスト表示</button></div>
 <nav class="result-nav" aria-label="結果の各項目"><a href="#abilities">能力カルテ</a><a href="#roles">役割</a><a href="#weapons">武器</a><a href="#play">立ち回り</a></nav>
 ${section('abilities','01','12能力のカルテ',`<div class="ability-grid">${Object.values(r.abilities).map(abilityCard).join('')}</div><p class="scale-note">5 明確な強み / 4 得意 / 3 標準 / 2 補完が必要 / 1 明確な弱点<br>「不明」は低評価ではありません。各項目を開くと回答の根拠を確認できます。</p><div class="insights"><div class="insight"><h3>活かしたい場面</h3><ul>${r.strengths.map(s=>`<li><strong>${s.name}</strong>${s.text}</li>`).join('')||'<li>明確な強みはまだ特定できません。評価3の能力も、味方との連携で活かせます。</li>'}</ul></div><div class="insight weak"><h3>味方と補いたい場面</h3><ul>${r.weaknesses.map(s=>`<li><strong>${s.name}</strong>${s.text}</li>`).join('')||`<li>${r.known<12?'情報不足の能力があるため、苦手がないとは断定できません。':'今回の回答では明確な苦手は特定されていません。実際の試合との違いも確認しましょう。'}</li>`}</ul></div></div>`)}
 ${section('roles','02','チーム内の役割適性',r.roles.map(row).join('')+`<p class="scale-note">5 主要役割候補 / 4 適している / 3 状況次第で対応 / 2 補完が必要 / 1 相性が悪い</p>${weakRoles.length?`<div class="loadout"><p>今は負担が大きい役割</p><p class="muted">${weakRoles.map(x=>`${escape(x.name)}：${escape(x.reason)}`).join('<br>')}</p></div>`:''}`)}
 ${section('weapons','03','武器カテゴリ適性',r.weapons.map(row).join('')+`<div class="loadout"><p class="eyebrow">LOADOUT</p>${r.loadout.map((x,i)=>`<p>${i===0?'第一候補':'第二候補'}：<strong>${escape(x)}</strong></p>`).join('')||'<p>武器構成は保留。必要な能力を確認してから選びましょう。</p>'}<p class="muted">評価3以上のARを軸に、適性のある補助武器を組み合わせています。各カテゴリの理由と交戦距離も確認してください。武器ごとの最新性能や使用感は含めず、カテゴリ単位の候補として提案しています。</p></div><h3>交戦距離の目安</h3><div class="distances">${r.distances.map((d,i)=>`<div class="distance"><strong>${d.name}</strong>${meter(d.score)}<p>${d.score===null?'情報不足':d.score+' / 5'}<br>${['遭遇・建物内','ARでの継続射撃','精密射撃・狙撃'][i]}</p></div>`).join('')}</div>`)}
 ${section('play','04','チーム戦での立ち回り',`<ol class="timeline">${r.play.steps.map((s,i)=>`<li><span class="step-number">${i+1}</span><div><strong>${['接敵前','敵発見','接敵','交戦中','人数有利','人数不利'][i]}</strong><p>${s}</p></div></li>`).join('')}</ol>${answers.aimOffset===0?'<div class="loadout"><p>照準が通り過ぎる場合</p><p class="muted">訓練場で同じ距離・同じ動きの標的を繰り返し狙い、動かしすぎる場面を確認しましょう。感度を変えるなら一度に一つの設定だけ、少しずつ試してください。</p></div>':''}`)}
 ${section('team','05','チームメイトへの取扱説明書',`<div class="team-notes"><ul>${r.play.team.map(x=>`<li>${x}</li>`).join('')}</ul></div>`)}
 <details class="method"><summary>診断の仕組みと結果の読み方</summary><p>元の「荒野行動 チーム適性診断GPT」の12能力と7役割を、選択式で再現したルールベースの診断です。自由回答・画像の解釈を行うAI診断ではありません。設問と重みは実測データで検証された尺度ではなく、初期の仮説です。</p><ul><li>能力は複数の回答を平均して1〜5に換算。根拠が2件未満なら不明です。</li><li>1と5には、同じ極端な評価を支持する独立した回答が2件以上必要です。自己評価の「得意」一つで5にはなりません。</li><li>回答の幅が大きい能力は暫定と表示し、追加確認は最大3問に絞ります。</li><li>役割・武器は能力を組み合わせて評価し、重要な能力が弱い場合は上限を設けます。主要能力が不明なら保留します。</li><li>好みだけでは加点しません。近距離が苦手なだけで狙撃手やSGを勧めません。</li><li>複数人の結果をコピーして持ち寄ることで、役割分担を相談できます。</li></ul></details>
 <div class="review-actions"><button id="review" class="button secondary">${r.complete?'回答を見直す':'続きに回答する'}</button><button id="restart" class="button secondary">最初から診断する</button></div>`;
 $('result-view').innerHTML=body;
 $('copy-result').addEventListener('click',copyResult);$('show-text').addEventListener('click',showText);
 $('review').addEventListener('click',()=>{const qs=E.getQuestions(answers);index=r.complete?0:qs.findIndex(q=>!Object.hasOwn(answers,q.id));if(index<0)index=0;showQuestion();});
 $('restart').addEventListener('click',()=>{answers={};index=0;result=null;showQuestion();});
 $('result-title').focus({preventScroll:true});$('main').scrollIntoView({block:'start',behavior:'instant'});
}
function textResult(){return E.toText(result,$('player-name').value.trim());}
function showText(){const dialog=$('copy-dialog');$('copy-text').value=textResult();dialog.showModal();$('copy-text').focus();$('copy-text').select();}
async function copyResult(){
 const text=textResult();
 try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);toast('結果をコピーしました');}
 catch{showText();toast('テキストを選択してコピーしてください');}
}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
$('player-name').addEventListener('input',()=>{if(result&&$('result-player'))$('result-player').textContent=`${$('player-name').value.trim()||'あなた'} の診断結果`;});
showQuestion(false);
})();
