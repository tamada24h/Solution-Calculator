const $=s=>document.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const fmt=(v,d=4)=>Number(v.toPrecision(d)).toLocaleString('ja-JP',{maximumSignificantDigits:d});
const concFmt=v=>Number(v).toFixed(1);
const ceilConc=v=>Math.ceil((v-1e-12)*10)/10;
const round1=v=>Number(Number(v).toFixed(1));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let state={mode:'generic',soluteSeq:0,solutionSeq:0};

const SOLVENTS={
  CB:{label:'CB 100%',frac:0},
  'CB-DIO-1':{label:'CB:DIO = 99:1',frac:.01},
  'CB-DIO-2':{label:'CB:DIO = 98:2',frac:.02},
  'CB-DIO-3':{label:'CB:DIO = 97:3',frac:.03}
};
const BUILTIN={
  midori2019:{
    mode:'psc',
    solutes:['PTB7-Th','PDCBT','PCBM'],
    solutions:[
      ['PTB7-Th neat',1000,16,[1,0,0],'CB'],
      ['PDCBT neat',1000,16,[0,1,0],'CB'],
      ['PTB7-Th/PCBM',1000,16,[.4,0,.6],'CB-DIO-3'],
      ['PTB7-Th/PDCBT',1000,16,[.75,.25,0],'CB'],
      ['PTB7-Th/PDCBT/PCBM',1000,16,[.3,.1,.6],'CB-DIO-3']
    ],
    desc:'Midori2019 テナリーPSC（全濃度16 mg/mL）'
  }
};

function applyModeUI(mode){
  state.mode=mode;
  $$('.mode-tab').forEach(t=>t.classList.toggle('active',t.dataset.mode===mode));
  $('#modeDescription').textContent=mode==='psc'
    ?'全溶液で一定の全濃度を持ち、溶質の重量比と溶媒組成を指定します。DIOは後添加として扱います。'
    :'各物質は全溶液分を一度に秤量し、マスター溶液として調製します。';
}

function clearAll(){
  $('#soluteList').innerHTML='';
  $('#solutionList').innerHTML='';
  $('#masterStage').hidden=true;
  $('#masterDesignList').innerHTML='';
  $('#results').innerHTML='';
  state.soluteSeq=0;
  state.solutionSeq=0;
}

function setMode(mode){
  applyModeUI(mode);
  seedByMode();
}

function seedByMode(){
  clearAll();
  if(state.mode==='generic'){
    addSolute('物質 A');addSolute('物質 B');addSolute('物質 C');
    addSolution('溶液 1',1000);addSolution('溶液 2',1000);addSolution('溶液 3',1000);
  }else{
    addSolute('PTB7-Th');addSolute('PDCBT');addSolute('PCBM');
    addSolution('溶液 1',1000);
  }
}

function htmlNode(html){
  const d=document.createElement('div');
  d.innerHTML=html.trim();
  return d.firstElementChild;
}

function addSolute(name){
  const id=`m${++state.soluteSeq}`;
  const safe=esc(name||`物質 ${String.fromCharCode(65+state.soluteSeq)}`);
  const node=htmlNode(`<div class="solute-chip"><input class="solute-name" aria-label="物質名" data-id="${id}" value="${safe}"><button class="remove" aria-label="削除">×</button></div>`);
  const input=node.querySelector('.solute-name');
  input.oninput=renderFields;
  node.querySelector('.remove').onclick=()=>{
    if($$('.solute-chip').length<=1)return;
    node.remove();
    renderFields();
  };
  $('#soluteList').append(node);
  renderFields();
}

function renderFields(){
  $$('.solution-card').forEach(card=>{
    const old=Object.fromEntries($$('.concentration-row',card).map(r=>[r.dataset.solute,r.querySelector('input').value]));
    card.dataset.old=JSON.stringify(old);
    updateSolutionCard(card);
  });
}

function updateSolutionCard(card){
  const solutes=$$('.solute-name').map(x=>({id:x.dataset.id,name:x.value||'名称未設定'}));
  const old=JSON.parse(card.dataset.old||'{}');
  const label=state.mode==='generic'?'最終濃度':'重量比';
  const unit=state.mode==='generic'?'mg/mL':'';
  const step=state.mode==='generic'?'0.1':'any';
  card.querySelector('.concentrations').innerHTML=solutes.map(s=>{
    const v=old[s.id]===undefined?0:old[s.id];
    const val=state.mode==='generic'?concFmt(Number(v)):fmt(Number(v),6);
    return`<div class="concentration-row" data-solute="${s.id}"><label>${esc(s.name)}<br>${label}</label><div class="with-unit"><input type="number" min="0" step="${step}" value="${val}" aria-label="${esc(s.name)}${label}">${unit?`<span>${unit}</span>`:'<span></span>'}</div></div>`;
  }).join('');
}

function addSolution(name,volume=1000,extras={}){
  const id=`s${++state.solutionSeq}`;
  const safeName=esc(name||`溶液 ${state.solutionSeq}`);
  const safeVol=esc(String(volume));
  let html;
  if(state.mode==='generic'){
    html=`<article class="solution-card" data-id="${id}"><div class="card-head"><div class="number"></div><input class="solution-name" aria-label="溶液名" value="${safeName}"><button class="remove" aria-label="削除">×</button></div><label class="volume-label">最終液量<div class="with-unit"><input class="solution-volume" type="number" min="0" step="any" value="${safeVol}"><span>µL</span></div></label><div class="concentrations"></div></article>`;
  }else{
    const total=concFmt(extras.totalConc||16);
    html=`<article class="solution-card" data-id="${id}"><div class="card-head"><div class="number"></div><input class="solution-name" aria-label="溶液名" value="${safeName}"><button class="remove" aria-label="削除">×</button></div><label class="volume-label">最終液量<div class="with-unit"><input class="solution-volume" type="number" min="0" step="any" value="${safeVol}"><span>µL</span></div></label><label class="volume-label">全濃度<div class="with-unit"><input class="solution-total-conc" type="number" min="0" step="0.1" value="${total}"><span>mg/mL</span></div></label><div class="concentrations"></div><label class="volume-label">溶媒組成<select class="solution-solvent"><option value="CB">CB 100%</option><option value="CB-DIO-3">CB:DIO = 97:3</option><option value="CB-DIO-2">CB:DIO = 98:2</option><option value="CB-DIO-1">CB:DIO = 99:1</option></select></label></article>`;
  }
  const node=htmlNode(html);
  if(state.mode==='psc'){
    node.querySelector('.solution-solvent').value=extras.solvent||'CB';
  }
  const ids=$$('.solute-name').map(x=>x.dataset.id);
  const arr=state.mode==='generic'?extras.concs:extras.ratios;
  if(arr&&Array.isArray(arr)){
    node.dataset.old=JSON.stringify(Object.fromEntries(ids.map((id,i)=>[id,arr[i]||0])));
  }
  node.querySelector('.remove').onclick=()=>{
    if($$('.solution-card').length<=1)return;
    node.remove();
    renumber();
  };
  $('#solutionList').append(node);
  updateSolutionCard(node);
  renumber();
}

function renumber(){
  $$('.solution-card').forEach((x,i)=>x.querySelector('.number').textContent=i+1);
}

function readSolutes(){
  return $$('.solute-chip').map(x=>{
    const name=x.querySelector('.solute-name');
    return{id:name.dataset.id,name:name.value.trim()||'名称未設定'};
  });
}

function targetConc(sol,m){
  if(state.mode==='generic')return sol.concs[m.id]||0;
  const sum=Object.values(sol.ratios).reduce((a,x)=>a+x,0);
  return sum>0?sol.totalConc*(sol.ratios[m.id]||0)/sum:0;
}

function baseFrac(sol){return state.mode==='generic'?1:(1-sol.solvent.frac);}

function readData(){
  const solutes=readSolutes();
  const solutions=$$('.solution-card').map(card=>{
    const v={
      id:card.dataset.id,
      name:card.querySelector('.solution-name').value.trim()||'名称未設定',
      volume:Number(card.querySelector('.solution-volume').value)
    };
    if(state.mode==='generic'){
      v.concs=Object.fromEntries($$('.concentration-row',card).map(r=>[r.dataset.solute,round1(Number(r.querySelector('input').value)||0)]));
    }else{
      v.totalConc=round1(Number(card.querySelector('.solution-total-conc').value)||0);
      v.ratios=Object.fromEntries($$('.concentration-row',card).map(r=>[r.dataset.solute,Number(r.querySelector('input').value)||0]));
      const code=card.querySelector('.solution-solvent').value;
      v.solvent=SOLVENTS[code]||{label:code,frac:0};
      v.solventCode=code;
    }
    return v;
  });
  return{solutes,solutions};
}

function designMasters(){
  const {solutes,solutions}=readData();
  if(solutions.some(s=>!Number.isFinite(s.volume)||s.volume<=0))return showError('すべての目的溶液に、0より大きい最終液量を入力してください。');
  if(solutes.length===0)return showError('物質を1つ以上登録してください。');
  const masters=solutes.map(m=>{
    const targetMax=Math.max(...solutions.map(s=>targetConc(s,m)));
    const required=solutions.reduce((sum,s)=>sum+targetConc(s,m)*s.volume/1000,0);
    return{id:m.id,name:m.name,targetMax,required,masterConc:0,entered:0};
  });
  if(masters.every(m=>m.required<=0))return showError('少なくとも1つの濃度または重量比を入力してください。');
  const factor=Math.max(1,...solutions.map(s=>{
    const load=masters.reduce((sum,m)=>sum+(m.targetMax>0&&targetConc(s,m)>0?targetConc(s,m)/m.targetMax:0),0);
    return load/Math.max(1e-9,baseFrac(s));
  }));
  masters.forEach(m=>{m.masterConc=ceilConc(m.targetMax*factor);m.entered=m.masterConc});
  renderMasterDesign(masters);
  $('#masterStage').hidden=false;
  $('#results').innerHTML='';
  $('#masterStage').scrollIntoView({behavior:'smooth',block:'start'});
}

function renderMasterDesign(masters){
  $('#masterDesignList').innerHTML=masters.filter(m=>m.required>0).map(m=>`
    <article class="master-design-card" data-design="${m.id}">
      <h3>${esc(m.name)}</h3>
      <label>マスター濃度<div class="with-unit"><input class="master-concentration" type="number" min="0" step="0.1" value="${concFmt(m.masterConc)}"><span>mg/mL</span></div></label>
      <div class="proposal"><span>最大目標濃度</span><b>${concFmt(m.targetMax)} mg/mL</b></div>
    </article>`).join('');
}

function calculate(){
  const {solutes,solutions}=readData();
  if(solutions.some(s=>!Number.isFinite(s.volume)||s.volume<=0))return showError('すべての目的溶液に、0より大きい最終液量を入力してください。');
  if(solutes.length===0)return showError('物質を1つ以上登録してください。');
  const masters=solutes.map(m=>{
    const targetMax=Math.max(...solutions.map(s=>targetConc(s,m)));
    const required=solutions.reduce((sum,s)=>sum+targetConc(s,m)*s.volume/1000,0);
    const input=document.querySelector(`[data-design="${m.id}"] .master-concentration`);
    const entered=input?round1(Number(input.value)):ceilConc(targetMax);
    return{id:m.id,name:m.name,targetMax,required,masterConc:entered,entered};
  });
  if(masters.every(m=>m.required<=0))return showError('少なくとも1つの濃度または重量比を入力してください。');
  masters.forEach(m=>{if(m.required&&(m.masterConc<=0||m.masterConc<m.targetMax))m.masterConc=ceilConc(m.targetMax)});
  const volumeFactor=Math.max(1,...solutions.map(s=>{
    const load=masters.reduce((sum,m)=>sum+(m.required&&targetConc(s,m)>0?targetConc(s,m)/m.masterConc:0),0);
    return load/Math.max(1e-9,baseFrac(s));
  }));
  if(volumeFactor>1+1e-9)masters.forEach(m=>{if(m.required)m.masterConc=ceilConc(m.masterConc*volumeFactor)});
  const changes=masters.filter(m=>m.required&&Math.abs(m.masterConc-m.entered)>1e-9).map(m=>({name:m.name,from:m.entered,to:m.masterConc}));
  masters.forEach(m=>{
    const input=document.querySelector(`[data-design="${m.id}"] .master-concentration`);
    if(input&&m.required)input.value=concFmt(m.masterConc);
  });
  renderResults(masters,solutions,{volumeFactor,changes});
  $('#results').scrollIntoView({behavior:'smooth',block:'start'});
}

function renderResults(masters,solutions,adjustment={volumeFactor:1,changes:[]}){
  const active=masters.filter(m=>m.required>0);
  const changeText=adjustment.changes.map(c=>`${esc(c.name)}：${concFmt(c.from||0)} → ${concFmt(c.to)} mg/mL`).join('<br>');
  const notice=adjustment.changes.length
    ?`<div class="notice"><b>調製可能な濃度へ自動調整しました。</b><br>${changeText}</div>`
    :(state.mode==='psc'?'<div class="notice">分注後に不足するCBを補い、DIOは最後に添加してください。</div>':'<div class="notice">分注後に不足する液量は、希釈用溶媒として自動的に補います。</div>');
  $('#results').innerHTML=`<h2 class="results-title">仕込み手順</h2>${notice}
    <div class="result-block"><h3>1. まとめて秤量・溶解</h3>
      <p class="notice">実際に秤量した値を入力すると、全物質の比率を維持できる共通の仕込み倍率と溶媒量を再計算します。</p>
      <div class="master-grid">${active.map(masterCard).join('')}</div>
    </div><div id="adjusted"></div>`;
  $$('.actual-mass').forEach(x=>x.oninput=()=>updateAdjusted(active,solutions));
  updateAdjusted(active,solutions);
}

function masterCard(m){
  const masterVol=m.required/m.masterConc*1000;
  return`<article class="result-card" data-master="${m.id}"><h4>${esc(m.name)}</h4>
    <label class="actual-label">実秤量値（mg）</label>
    <input class="actual-mass" type="number" min="0" step="any" value="${fmt(m.required,8)}">
    <dl><div><dt>理論必要重量</dt><dd>${fmt(m.required)} mg</dd></div>
    <div><dt>マスター濃度</dt><dd>${concFmt(m.masterConc)} mg/mL</dd></div>
    <div><dt>理論液量（CB）</dt><dd>${fmt(masterVol)} µL</dd></div></dl></article>`;
}

function updateAdjusted(masters,solutions){
  masters.forEach(m=>{
    const v=Number(document.querySelector(`[data-master="${m.id}"] .actual-mass`).value);
    m.actual=Number.isFinite(v)&&v>0?v:m.required;
    m.ratio=m.actual/m.required;
  });
  const scale=Math.min(...masters.map(m=>m.ratio));
  const masterHtml=masters.map(m=>{
    const made=m.actual/m.masterConc*1000;
    const used=solutions.reduce((sum,s)=>sum+targetConc(s,m)*s.volume/m.masterConc,0)*scale;
    const left=made-used;
    return`<div><dt>${esc(m.name)}のCB量</dt><dd>最終液量 ${fmt(made)} µLに調整${left>1e-7?`（残液 ${fmt(left)} µL）`:''}</dd></div>`;
  }).join('');
  const cards=solutions.map(s=>{
    const adjusted=s.volume*scale;
    const baseVol=adjusted*baseFrac(s);
    const additiveVol=state.mode==='generic'?0:adjusted*s.solvent.frac;
    const rows=masters.map(m=>{
      const c=targetConc(s,m);
      if(c<=0)return'';
      const amount=c*adjusted/m.masterConc;
      return`<div><dt>${esc(m.name)}マスター</dt><dd>${fmt(amount)} µL</dd></div>`;
    }).join('');
    const used=masters.reduce((sum,m)=>sum+targetConc(s,m)*adjusted/m.masterConc,0);
    const baseFill=baseVol-used;
    return`<article class="result-card light"><h4>${esc(s.name)}</h4><dl>
      <div><dt>補正後の最終液量</dt><dd>${fmt(adjusted)} µL</dd></div>
      ${rows}
      <div><dt>ベース溶媒（CB）</dt><dd>${baseFill>=-1e-7?`${fmt(Math.max(0,baseFill))} µL`:'調製不可'}</dd></div>
      ${additiveVol>0?`<div><dt>添加剤（DIO）</dt><dd>${fmt(additiveVol)} µL <small>後添加</small></dd></div>`:''}
    </dl></article>`;
  }).join('');
  const checks=solutions.map(s=>{
    const adjusted=s.volume*scale;
    const baseVol=adjusted*baseFrac(s);
    const additiveVol=state.mode==='generic'?0:adjusted*s.solvent.frac;
    const used=masters.reduce((sum,m)=>sum+targetConc(s,m)*adjusted/m.masterConc,0);
    const baseFill=baseVol-used;
    const rows=masters.filter(m=>targetConc(s,m)>0).map(m=>{
      const c=targetConc(s,m);
      const amount=c*adjusted/m.masterConc;
      const mass=m.masterConc*amount/1000;
      const verified=mass/(adjusted/1000);
      const diff=verified-c;
      return`<tr><td>${esc(m.name)}</td><td>${fmt(mass)} mg</td><td>${concFmt(c)}</td><td>${concFmt(verified)}</td><td>${concFmt(diff)}</td></tr>`;
    }).join('');
    return`<article class="check-card"><h4>${esc(s.name)}</h4>
      <div class="check-volume">体積検算：マスター液 ${fmt(used)} ＋ CB ${fmt(Math.max(0,baseFill))}${additiveVol>0?` ＋ DIO ${fmt(additiveVol)}`:''} ＝ <b>${fmt(used+Math.max(0,baseFill)+additiveVol)} µL</b></div>
      <div class="table-scroll"><table><thead><tr><th>物質</th><th>添加重量</th><th>目標濃度</th><th>検算濃度</th><th>差</th></tr></thead><tbody>${rows}</tbody></table></div>
    </article>`;
  }).join('');
  $('#adjusted').innerHTML=`<div class="summary"><span>実秤量値から決まる共通仕込み倍率</span><b>${fmt(scale*100)} %</b></div>
    <div class="result-block"><h3>2. マスター液を調製</h3><article class="result-card light"><dl>${masterHtml}</dl></article></div>
    <div class="result-block"><h3>3. 各溶液を混合</h3><div class="dispense-grid">${cards}</div></div>
    <div class="result-block verification"><h3>4. 検算</h3><p>表示前の未丸め値を使い、分注量から最終濃度を逆算しています。濃度単位は mg/mL です。</p>${checks}</div>`;
}

function showError(msg){
  $('#results').innerHTML=`<div class="notice"><b>入力を確認してください。</b><br>${esc(msg)}</div>`;
  $('#results').scrollIntoView({behavior:'smooth'});
}

function sharePayload(){
  const {solutes,solutions}=readData();
  const m=solutes.map(s=>s.name);
  const s=solutions.map(sol=>{
    if(state.mode==='generic')return[sol.name,sol.volume,m.map(id=>sol.concs[id]||0)];
    return[sol.name,sol.volume,sol.totalConc,m.map(id=>sol.ratios[id]||0),sol.solventCode||'CB'];
  });
  return{v:state.mode==='generic'?2:3,mode:state.mode,m,s};
}

function encodePayload(data){
  return btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function decodePayload(value){
  const base=value.replace(/-/g,'+').replace(/_/g,'/');
  return JSON.parse(decodeURIComponent(escape(atob(base+'='.repeat((4-base.length%4)%4)))));
}

function createShareUrl(){
  const url=new URL(location.href);
  url.hash=`p=${encodePayload(sharePayload())}`;
  return url.href;
}

function openShare(){
  const url=createShareUrl();
  $('#shareUrl').value=url;
  $('#qrCode').innerHTML='';
  $('#qrMessage').textContent='';
  try{
    if(typeof qrcode!=='function')throw new Error('library');
    const qr=qrcode(0,'M');
    qr.addData(url);
    qr.make();
    $('#qrCode').innerHTML=qr.createSvgTag(5,8);
  }catch(e){
    $('#qrMessage').textContent=e.message.includes('overflow')?'入力内容が多いためQRコードに収まりません。URLコピーを使用してください。':'QRコードを作成できません。インターネット接続を確認してください。';
  }
  $('#shareDialog').showModal();
}

async function copyUrl(){
  const text=$('#shareUrl').value;
  try{await navigator.clipboard.writeText(text);}catch(e){
    $('#shareUrl').select();
    document.execCommand('copy');
  }
  $('#copyUrl').textContent='コピーしました';
  setTimeout(()=>$('#copyUrl').textContent='URLをコピー',1600);
}

function restoreShared(){
  const match=location.hash.match(/^#p=(.+)$/);
  if(!match)return false;
  try{
    const data=decodePayload(match[1]);
    if(data.v===3){
      applyModeUI(data.mode||'generic');
      clearAll();
      data.m.forEach(n=>addSolute(String(n||'')));
      if(state.mode==='generic'){
        data.s.forEach(s=>addSolution(String(s[0]||''),Number(s[1])||1000,{concs:Array.isArray(s[2])?s[2]:[]}));
      }else{
        data.s.forEach(s=>addSolution(String(s[0]||''),Number(s[1])||1000,{totalConc:Number(s[2])||16,ratios:Array.isArray(s[3])?s[3]:[],solvent:String(s[4]||'CB')}));
      }
      return true;
    }
    if([1,2].includes(data.v)){
      applyModeUI('generic');
      clearAll();
      data.m.forEach(m=>Array.isArray(m)?addSolute(String(m[0]||'')):addSolute(String(m)));
      data.s.forEach(s=>addSolution(String(s[0]||''),Number(s[1])||1000,{concs:Array.isArray(s[2])?s[2]:[]}));
      return true;
    }
    throw new Error('invalid');
  }catch(e){
    setTimeout(()=>showError('共有URLのデータを読み込めませんでした。URLが途中で切れていないか確認してください。'));
    return false;
  }
}

function loadPresets(){
  $('#userPresetGroup').innerHTML='';
  const list=JSON.parse(localStorage.getItem('solutionPresets')||'[]');
  list.forEach((p,i)=>$('#userPresetGroup').append(new Option(p.name,i)));
}

function saveUserPreset(){
  const name=prompt('プリセット名を入力してください');
  if(!name)return;
  const {solutes,solutions}=readData();
  const payload={
    name,
    mode:state.mode,
    solutes:solutes.map(s=>s.name),
    solutions:solutions.map(s=>{
      if(state.mode==='generic')return[s.name,s.volume,solutes.map(m=>s.concs[m.id]||0)];
      return[s.name,s.volume,s.totalConc,solutes.map(m=>s.ratios[m.id]||0),s.solventCode||'CB'];
    })
  };
  const list=JSON.parse(localStorage.getItem('solutionPresets')||'[]');
  list.push(payload);
  localStorage.setItem('solutionPresets',JSON.stringify(list));
  loadPresets();
}

function loadSelectedPreset(){
  const val=$('#presetSelect').value;
  if(!val)return;
  try{
    clearAll();
    if(BUILTIN[val]){
      const b=BUILTIN[val];
      applyModeUI(b.mode);
      $('#modeDescription').textContent=b.desc||'';
      b.solutes.forEach(n=>addSolute(n));
      b.solutions.forEach(s=>addSolution(s[0],s[1],b.mode==='generic'?{concs:s[3]}:{totalConc:s[2],ratios:s[3],solvent:s[4]}));
      return;
    }
    const list=JSON.parse(localStorage.getItem('solutionPresets')||'[]');
    const p=list[Number(val)];
    if(!p)return;
    applyModeUI(p.mode);
    p.solutes.forEach(n=>addSolute(n));
    p.solutions.forEach(s=>addSolution(s[0],s[1],p.mode==='generic'?{concs:s[2]}:{totalConc:s[2],ratios:s[3],solvent:s[4]}));
  }catch(e){showError('プリセット読み込み中にエラーが発生しました：'+e.message);console.error(e);}
}

function deleteSelectedPreset(){
  const val=$('#presetSelect').value;
  if(!val||BUILTIN[val])return alert('内蔵プリセットは削除できません');
  if(!confirm('このプリセットを削除しますか？'))return;
  const list=JSON.parse(localStorage.getItem('solutionPresets')||'[]');
  list.splice(Number(val),1);
  localStorage.setItem('solutionPresets',JSON.stringify(list));
  $('#presetSelect').value='';
  loadPresets();
}

function reset(){
  if(!confirm('入力内容を初期状態に戻しますか？'))return;
  history.replaceState(null,'',location.pathname+location.search);
  $('#presetSelect').value='';
  seedByMode();
}

$$('.mode-tab').forEach(t=>t.onclick=()=>setMode(t.dataset.mode));
$('#addSolute').onclick=()=>addSolute();
$('#addSolution').onclick=()=>addSolution('溶液 '+($$('.solution-card').length+1),1000);
$('#designMasters').onclick=designMasters;
$('#calculate').onclick=calculate;
$('#resetBtn').onclick=reset;
$('#shareBtn').onclick=openShare;
$('#closeShare').onclick=()=>$('#shareDialog').close();
$('#copyUrl').onclick=copyUrl;
$('#presetSelect').onchange=loadSelectedPreset;
$('#loadPreset').onclick=loadSelectedPreset;
$('#savePreset').onclick=saveUserPreset;
$('#deletePreset').onclick=deleteSelectedPreset;
window.addEventListener('hashchange',()=>{
  if(restoreShared()){
    $('#masterStage').hidden=true;
    $('#masterDesignList').innerHTML='';
    $('#results').innerHTML='';
    window.scrollTo({top:0,behavior:'smooth'});
  }
});
loadPresets();
if(!restoreShared())seedByMode();
