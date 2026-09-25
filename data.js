/* Diagnosis content. No network, storage or external dependencies. */
(function (root) {
'use strict';
const abilities = [
 ['staticAim','静的エイム','止まった敵や小さな標的を正確に狙う'],
 ['dynamicAim','動的エイム','移動する敵へ照準を合わせ続ける'],
 ['initialAim','初動エイム','突然の接敵で素早く照準を合わせる'],
 ['closeCombat','近距離戦闘','遮蔽・操作・切り替えを含む近距離対応'],
 ['recoilControl','リコイル制御','連射中の反動を抑えて狙いを維持する'],
 ['spotting','索敵','敵を見つけ、見落としを減らす'],
 ['awareness','状況認識','敵・味方・被弾方向を把握する'],
 ['firingLine','射線管理','別角度を作り、危険な射線を切る'],
 ['positioning','ポジショニング','遮蔽・安置・逃げ道を選ぶ'],
 ['decisionMaking','判断力','詰め・待ち・撤退を選び分ける'],
 ['survival','生存力','交戦に参加しながら無意味なデスを減らす'],
 ['teamwork','チーム連携','報告・カバー・タイミングを合わせる']
].map(([id,name,description])=>({id,name,description}));
const o=(text, scores={}, weight=1)=>({text,scores,weight});
const q=(id,group,title,hint,options)=>({id,group,title,hint,options:[...options,o('分からない・経験がない') ]});
const base=[
 q('style','プレイ傾向','敵を見つけたとき、自然にやるのは？','理想ではなく、いつものチーム戦を思い出してください。この回答は好みとして扱います。',[
 o('距離を詰めて、先に仕掛けたい'),o('有利な位置を取ってから撃つ'),o('離れた場所から削る・抜く'),o('味方の動きに合わせる'),o('距離や人数を見て変える')]),
 q('close','射撃と操作','近距離の撃ち合いは、どれくらい安定する？','建物内や、遮蔽の近くで遭遇したときの実感で。',[
 o('得意。勝てる場面が多い',{closeCombat:4}),o('五分五分。普通くらい',{closeCombat:3}),o('苦手。負ける場面が多い',{closeCombat:2})]),
 q('ar','射撃と操作','50〜150mほどのAR戦は？','敵へ弾を当て続ける場面を思い出してください。',[
 o('狙いを保って、安定して当てられる',{dynamicAim:4,recoilControl:4}),o('ある程度当たるが、ばらつく',{dynamicAim:3,recoilControl:3}),o('照準や弾が散って、当て続けにくい',{dynamicAim:2,recoilControl:2})]),
 q('sr','射撃と操作','SRで止まっている敵を狙うと？','好きかどうかではなく、実際の命中の安定感で。',[
 o('小さく見える敵にも、よく当てられる',{staticAim:4}),o('胴体なら比較的当てられる',{staticAim:3}),o('狙う時間があっても外すことが多い',{staticAim:2})]),
 q('precision','射撃と操作','遮蔽から頭だけ出した敵。狙う時間があるときは？','普段の試合で、最も近い結果を選んでください。',[
 o('頭に合わせ、複数の試合で安定して当てられる',{staticAim:5}),o('当たることもあるが、安定しない',{staticAim:3}),o('細かな照準調整が難しく、外しやすい',{staticAim:1})]),
 q('tracking','射撃と操作','100m先を横に走る敵をARで撃つと？','連射しながら追いかける場面です。',[
 o('方向が変わっても追い続けられる',{dynamicAim:5}),o('まっすぐ走る敵なら追える',{dynamicAim:3}),o('照準が追いつかず、ほとんど当たらない',{dynamicAim:1}),o('普段はSRへ持ち替えるので判断できない')]),
 q('snap','射撃と操作','急に視界に現れた敵へ照準を合わせると？','撃ち始めるまでの動きについて。',[
 o('ほぼ一度で合い、そのまま撃てる',{initialAim:5}),o('少し合わせ直してから撃つ',{initialAim:3}),o('何度も合わせ直す間に撃たれる',{initialAim:1})]),
 q('duel','射撃と操作','近距離で遮蔽から敵が出てきたときは？','最近の試合で繰り返し起きている結果を選んでください。',[
 o('出てくる位置へ照準を置き、先に当てられる',{initialAim:5,closeCombat:5}),o('反応して撃てるが、先に当てられることもある',{initialAim:3,closeCombat:3}),o('照準が間に合わず、撃ち始めが遅れる',{initialAim:1,closeCombat:2})]),
 q('handling','射撃と操作','近距離戦の途中で弾切れになったら？','持ち替え・遮蔽・操作を含めた普段の結果です。',[
 o('遮蔽を使い、持ち替えて戦い続けられる',{closeCombat:5,survival:4}),o('持ち替えられるが、操作でもたつく',{closeCombat:3}),o('その場でリロードして倒されやすい',{closeCombat:1,survival:2})]),
 q('recoil','射撃と操作','反動が強いARで、同じ敵を連射すると？','使わない武器を、苦手と決めつける必要はありません。',[
 o('反動を抑えて、繰り返し当て続けられる',{recoilControl:5}),o('短い連射なら狙いを維持できる',{recoilControl:3}),o('照準が大きく上がって外れる',{recoilControl:1})]),
 q('spot','情報と位置','味方より先に敵を見つけることは？','キル数ではなく、最初の発見について。',[
 o('多い。移動中や遠くの敵も見つける',{spotting:4}),o('味方と同じくらい',{spotting:3}),o('少ない。報告を聞いてから探す',{spotting:2})]),
 q('scan','情報と位置','移動中、周りの確認は実際にできている？','進行方向以外にも敵がいる場面を思い出してください。',[
 o('左右・後方も確認し、別部隊を早めに発見できる',{spotting:5,awareness:4}),o('気をつけているが、前だけになることもある',{spotting:3,awareness:3}),o('前方に集中し、横や後ろの敵を見落としやすい',{spotting:1,awareness:2})]),
 q('awareness','情報と位置','突然撃たれたとき、敵の方向や人数は？','味方へ報告するまでをイメージしてください。',[
 o('方向をすぐ捉え、見えた人数と不明な人数を分けて報告できる',{awareness:5,teamwork:4}),o('方向は分かるが、人数や別の敵は遅れて把握する',{awareness:3}),o('目の前に集中して、どこから撃たれたか分からなくなる',{awareness:1})]),
 q('cross','情報と位置','味方3人が同じ場所から撃っている。普段の自分は？','遮蔽があり、少し横へ移動できる場面です。',[
 o('カバーが届く範囲で横へ動き、別の角度から当てる',{firingLine:5,teamwork:5}),o('後ろから、味方の動きに合わせてカバーする',{firingLine:3,teamwork:4}),o('離れた場所まで一人で回り、味方と離れることが多い',{firingLine:3,teamwork:2}),o('同じ場所に重なって撃つことが多い',{firingLine:2,teamwork:3})]),
 q('peek','情報と位置','敵に撃つ位置を知られたあと、どうなることが多い？','撃ち返される射線への対応について。',[
 o('別の遮蔽・角度へ移り、撃ち返されにくい位置で再開する',{firingLine:5,positioning:5}),o('同じ遮蔽で、顔を出すタイミングを変える',{firingLine:3,positioning:3}),o('同じ位置から出続け、狙われて倒される',{firingLine:1,positioning:1})]),
 q('zone','情報と位置','終盤、安置へ移動するときは？','「良いと思う選択」より、実際に間に合っているかで。',[
 o('遮蔽と逃げ道を先に確保し、味方も移動できている',{positioning:5,decisionMaking:4}),o('味方と移動できるが、場所選びは任せることが多い',{positioning:3,decisionMaking:3}),o('撃ち合いを続けすぎて、最後に開けた場所を走ることが多い',{positioning:1,decisionMaking:2})]),
 q('rescue','判断と連携','4対4で味方がダウン。敵全員の位置は不明。実際にやりがちなのは？','自分だけでなく、残った味方の位置も関わる場面です。',[
 o('遮蔽へ入り、敵射線と味方位置を確認してカバー・蘇生を分担する',{decisionMaking:5,teamwork:5,firingLine:4}),o('まず敵の位置を探すが、味方との分担は遅れやすい',{decisionMaking:3,teamwork:3}),o('すぐ蘇生へ向かい、同じ射線で倒されることがある',{decisionMaking:1,teamwork:2,survival:2}),o('一人で詰めて、さらに人数不利になることがある',{decisionMaking:1,teamwork:1,survival:1})]),
 q('retreat','判断と連携','戦いが不利になったとき、撤退は？','退くだけでなく、味方が退く時間を作れているかも含めて。',[
 o('早めに共有し、射撃や遮蔽を使って一緒に退ける',{decisionMaking:5,survival:5,teamwork:4}),o('退けるが、判断や共有が遅れることもある',{decisionMaking:3,survival:3}),o('撃ち続けて、退くタイミングを逃しやすい',{decisionMaking:1,survival:1}),o('すぐ一人で退き、味方を残すことが多い',{decisionMaking:2,survival:2,teamwork:1})]),
 q('isolation','判断と連携','味方のカバーが届かない場所で倒されることは？','戦闘に参加しているときの話です。',[
 o('ほぼない。味方との距離を確認して戦う',{survival:4,teamwork:4}),o('たまにある',{survival:3,teamwork:3}),o('多い。先に動いて孤立しやすい',{survival:1,teamwork:2}),o('戦闘にあまり参加しないので判断できない')]),
 q('participation','判断と連携','チームの交戦中、自分の生存と参加は？','生き残った長さだけでは評価しません。',[
 o('攻撃やカバーを続けつつ、被弾したら退いて立て直せる',{survival:5,decisionMaking:4}),o('参加できるが、被弾後も撃ち続けて倒されることがある',{survival:3}),o('倒されないが、隠れたまま援護の機会も逃しがち',{survival:2,decisionMaking:2}),o('攻撃に集中して、毎回のように先に倒される',{survival:1})]),
 q('cover','判断と連携','前衛の味方が敵と撃ち合い始めたら？','カバーのタイミングについて。',[
 o('敵の射線を見て、味方が倒れる前に援護できる',{teamwork:5,awareness:4}),o('援護はできるが、一拍遅れることがある',{teamwork:3,awareness:3}),o('敵を探しているうちに、味方が倒されることが多い',{teamwork:2,awareness:2})]),
 q('push','判断と連携','敵を1人ダウンさせて人数有利。普段は？','味方の体力・距離・別部隊が分からない状態です。',[
 o('状況を確認して合図し、味方と同時に詰めるか維持する',{decisionMaking:5,teamwork:5}),o('誰かの合図を待ち、合わせて動く',{decisionMaking:3,teamwork:4}),o('自分だけで詰めてしまうことが多い',{decisionMaking:1,teamwork:1}),o('有利でも待ち続け、敵に立て直されることが多い',{decisionMaking:2,teamwork:3})])
];
const branches={
 closeDetail:q('closeDetail','追加確認','近距離で負けるとき、特に多い原因は？','苦手の原因を切り分けます。',[
 o('照準が敵に合わない',{initialAim:2}),o('敵を見つけるのが遅い',{spotting:2}),o('持ち替えや移動の操作で負ける',{closeCombat:2}),o('照準は合うが、撃つタイミングや遮蔽で負ける',{closeCombat:2,positioning:2})]),
 aimOffset:q('aimOffset','追加確認','素早く照準を動かすと、どこで外れやすい？','結果の練習アドバイスに使います。',[
 o('敵を通り過ぎる',{initialAim:2}),o('敵の手前で止まる',{initialAim:2}),o('敵を画面の中央へ持ってくるまでが遅い',{initialAim:2}),o('だいたい合う。照準より他の原因が多い',{initialAim:4})]),
 sniper:q('sniper','追加確認','SRで一発外したあと、次の射撃は？','精度と、撃つ位置の選び方を分けて確認します。',[
 o('一度射線を切り、狙い直して当てられることが多い',{staticAim:5,firingLine:4}),o('場所を変えるが、次の弾も安定しない',{staticAim:3,firingLine:4}),o('同じ位置から撃ち続けて反撃されやすい',{firingLine:2}),o('ARへ持ち替えて味方と動く',{teamwork:4})])
};
const checks={
 staticAim:['狙う時間がある静止目標には、実際どの程度当たる？','小さな標的にも繰り返し当たる','胴体なら当たるが安定しない','ほとんど当たらない'],
 dynamicAim:['横に動く敵を追う照準は、実際どうなる？','方向が変わっても追い続けられる','直線なら追えるが、変化に遅れる','動きについていけない'],
 initialAim:['突然の接敵で、最初の照準はどの程度合う？','ほぼ一度で合う','一度か二度、合わせ直す','何度も外して撃ち遅れる'],
 closeCombat:['近距離で、遮蔽と操作を使って戦い続けられる？','多くの試合で安定してできる','できるときと、操作に迷うときがある','操作や遮蔽への移動が間に合わない'],
 recoilControl:['連射した弾を同じ標的に集められる？','反動が強くても繰り返し集められる','短い連射なら集められる','大きく散ってしまう'],
 spotting:['周囲を確認して、敵を自力で見つけられる？','別方向の敵も早めに見つけられる','味方と同じくらい見つける','味方の報告があっても探すのに時間がかかる'],
 awareness:['複数の敵と戦うとき、位置を把握し続けられる？','敵味方の変化を追って報告できる','目の前以外の変化に遅れることがある','目の前以外がほとんど分からなくなる'],
 firingLine:['自分と敵の射線を考えて動ける？','別角度を作り、危険な射線も切れる','一方向なら対応できる','別方向から何度も撃たれてしまう'],
 positioning:['交戦する場所に、遮蔽と退路を確保できている？','複数の試合で先に確保できている','味方に合わせれば確保できる','開けた場所で動けなくなりやすい'],
 decisionMaking:['有利・不利が変わったとき、行動を変えられる？','共有して詰め・維持・撤退を選べる','味方に言われてから変えることが多い','同じ行動を続けて機会を逃す'],
 survival:['援護に参加しながら、生きて立て直せている？','攻撃と退避を繰り返せる','参加できるが退くのが遅れる','隠れたままか、無理に撃って倒される'],
 teamwork:['味方とタイミングを合わせて動ける？','報告してカバーや詰めを合わせられる','合図があれば合わせられる','自分だけ先行・遅延することが多い']
};
const roles=[
 {id:'entry',name:'エントリー',weights:{initialAim:3,closeCombat:3,decisionMaking:2,awareness:1,teamwork:1},core:['initialAim','closeCombat','decisionMaking'],description:'味方のカバーを受け、最初の接敵で突破口を作る。'},
 {id:'attacker',name:'アタッカー',weights:{dynamicAim:3,closeCombat:2,recoilControl:2,decisionMaking:1,teamwork:1},core:['dynamicAim','closeCombat'],description:'味方が作ったチャンスを、安定した火力で撃破につなげる。'},
 {id:'second',name:'セカンド',weights:{firingLine:3,teamwork:3,decisionMaking:2,positioning:1,dynamicAim:1},core:['firingLine','teamwork','decisionMaking'],description:'前衛の少し後ろから別射線を作り、カバーと追撃を担う。'},
 {id:'marksman',name:'マークスマン',weights:{staticAim:4,positioning:3,firingLine:2,awareness:1},core:['staticAim','positioning'],description:'位置を確保して精密射撃を通し、離れた敵への起点を作る。'},
 {id:'flanker',name:'フランカー',weights:{firingLine:3,spotting:3,decisionMaking:2,positioning:2,survival:1},core:['firingLine','spotting','decisionMaking'],description:'情報を確かめながら横へ展開し、敵が対応しにくい角度を作る。'},
 {id:'cover',name:'カバー',weights:{teamwork:4,awareness:2,firingLine:2,survival:2,recoilControl:1},core:['teamwork','awareness'],description:'味方が動く時間を作り、援護・撤退・立て直しを支える。'},
 {id:'igl',name:'IGL / 司令塔',weights:{spotting:2,awareness:3,decisionMaking:4,teamwork:3,positioning:1},core:['spotting','awareness','decisionMaking','teamwork'],description:'敵味方の情報をまとめ、チームの移動と交戦の判断を共有する。'}
];
const weapons=[
 {id:'lowAR',name:'低反動AR',weights:{dynamicAim:3,recoilControl:1,firingLine:2},core:['dynamicAim'],description:'追いエイムと射線を活かす、中距離の軸。'},
 {id:'highAR',name:'高反動AR',weights:{recoilControl:4,dynamicAim:2,initialAim:1},core:['recoilControl','dynamicAim'],description:'連射を制御できる場合の候補。反動が負担なら無理に選ばない。'},
 {id:'smg',name:'SMG',weights:{dynamicAim:3,closeCombat:3,initialAim:2},core:['dynamicAim','closeCombat'],description:'近距離で動く敵を追い、継続して当てる用途。'},
 {id:'sg',name:'SG',weights:{initialAim:4,closeCombat:3,positioning:1},core:['initialAim','closeCombat'],description:'近距離で最初の一発を合わせ、遮蔽を使う用途。'},
 {id:'bolt',name:'ボルトアクションSR',weights:{staticAim:4,positioning:2,firingLine:2},core:['staticAim','positioning'],description:'狙う時間を作り、静止敵や小さな標的を精密に撃つ用途。'},
 {id:'dmr',name:'連射系SR / DMR系',weights:{staticAim:2,dynamicAim:2,recoilControl:2,positioning:1},core:['staticAim','recoilControl'],description:'中〜遠距離で狙い直しながら、継続して削る用途。'}
];
const data={version:'1.0',abilities,base,branches,checks,roles,weapons,q,o};
if(typeof module!=='undefined'&&module.exports)module.exports=data;
root.KouyaData=data;
})(typeof globalThis!=='undefined'?globalThis:this);
