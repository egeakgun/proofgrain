'use strict';
const $ = s => document.querySelector(s);
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = (v, digits=2) => v == null ? '—' : Number(v).toLocaleString('en-US',{maximumFractionDigits:digits,minimumFractionDigits:digits});
const metrics = {
 full: {title:'Full-credit outputs',description:'Valid 7/7 recorded responses as a share of all assigned attempts.',unit:'% of assigned attempts',max:100,value:m=>100*m.full_credit/m.assigned,format:v=>number(v,1)+'%',sort:'full_credit',note:'Full credit requires a valid verdict and 7/7 from the reference-and-rubric judge. All 18 assigned attempts stay in the denominator.'},
 score: {title:'Mean response score',description:'Mean rubric score across all 18 recorded attempts, including partial reasoning.',unit:'mean score / 7',max:7,value:m=>m.mean_score,format:v=>number(v,2),sort:'mean_score',note:'Every recorded response earns its rubric points, including partial answers and unfinished reasoning. Empty responses score 0/7. All 18 assigned attempts count in each mean. Whiskers show 95% bootstrap intervals across those problems.'},
 coverage: {title:'Scoring coverage',description:'Scored attempts divided by all assigned attempts: 144 of 144 in this benchmark.',unit:'% of assigned attempts',max:100,value:m=>100*m.scored/m.assigned,format:v=>number(v,1)+'%',sort:'scored',note:'All 144 assigned attempts are scored from their recorded responses. Partial reasoning retains its rubric points; empty responses receive 0/7.'},
 time: {title:'Mean elapsed time',description:'End-to-end request time across assigned attempts, including unsuccessful attempts. Lower is faster.',unit:'seconds · lower is faster',max:240,value:m=>m.mean_seconds,format:v=>number(v,1)+'s',sort:'mean_seconds',note:'Elapsed time includes the provider, network, solve phase, and write-up across all attempts. Queue waiting is excluded. Read timing alongside answer quality.'}
};
let data, dataset, selected = new Set(), metric='full', sortKey='full_credit', sortDirection='desc', toastTimer;

function sortedModels(){
 return dataset.models.filter(m=>selected.has(m.id)).sort((a,b)=>{
   const av=a[sortKey],bv=b[sortKey];
   if(av==null && bv==null)return a.name.localeCompare(b.name);
   if(av==null)return 1;if(bv==null)return -1;
   return (typeof av==='string'?av.localeCompare(bv):av-bv)*(sortDirection==='asc'?1:-1)||a.name.localeCompare(b.name);
 });
}
function chartModels(){
 const cfg=metrics[metric];
 return dataset.models.filter(m=>selected.has(m.id)).sort((a,b)=>{
   const av=cfg.value(a),bv=cfg.value(b);if(av==null)return bv==null?0:1;if(bv==null)return -1;
   return (av-bv)*(metric==='time'?1:-1)||a.name.localeCompare(b.name);
 });
}
function updateURL(){
 const u=new URL(location.href);u.searchParams.delete('study');u.searchParams.set('metric',metric);
 if(selected.size===dataset.models.length)u.searchParams.delete('models');else u.searchParams.set('models',[...selected].join(','));
 history.replaceState(null,'',u.pathname+u.search+u.hash);
}
function renderFilters(){
 $('#model-options').innerHTML=dataset.models.map(m=>`<label><input type="checkbox" value="${escapeHTML(m.id)}" ${selected.has(m.id)?'checked':''}><span class="model-swatch" style="--bar:${m.color}"></span>${escapeHTML(m.name)}</label>`).join('');
 $('#model-options').querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{input.checked?selected.add(input.value):selected.delete(input.value);render();}));
}
function render(){
 const cfg=metrics[metric], models=chartModels(),rows=sortedModels();
 $('#chart-title').textContent=cfg.title;$('#chart-description').textContent=cfg.description;$('#axis-unit').textContent=cfg.unit;
 $('#chart-note').textContent=cfg.note;$('#filter-label').textContent=`${selected.size} models`;
 $('#selection-summary').textContent=`${models.length} models · ${dataset.problems} problems each`;
 $('#study-date').textContent=`Nov ${Number(dataset.start_date.slice(-2))}–${Number(dataset.end_date.slice(-2))}, 2026 · Pacific`;
 $('#csv-link').href='./benchmark-results.csv?v=response-scores-v2';
 $('#attempt-count').textContent=`${dataset.total_scored}/${dataset.attempts}`;
 $('#ci-control').hidden=metric!=='score';
 document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.metric===metric)));
 const ticks=metric==='score'?[7,5.25,3.5,1.75,0]:metric==='time'?[240,180,120,60,0]:[100,75,50,25,0];
 if(!models.length){$('#chart').innerHTML='<div class="empty-chart">Choose at least one model to explore the results.<button id="empty-reset" type="button">Show all models</button></div>';$('#empty-reset').onclick=selectAll;}
 else $('#chart').innerHTML=`<div class="chart-grid" aria-hidden="true">${ticks.map(t=>`<div class="grid-tick"><span>${t}</span></div>`).join('')}</div><div class="bars" style="--count:${models.length}">${models.map(m=>{
   const v=cfg.value(m),height=(v??0)/cfg.max*100,ci=metric==='score'&&$('#show-ci').checked?m.ci95:null;
   const description=`${m.name}: ${v==null?'no scored attempts':cfg.format(v)}. ${m.scored} of ${m.assigned} attempts scored. Open aggregate details.`;
   return `<button class="bar-item" type="button" data-model="${escapeHTML(m.id)}" style="--bar:${m.color};--height:${height}%;--label-height:${Math.max(v??0,ci?.high??0)/cfg.max*100}%;--ci-low:${ci?ci.low/cfg.max*100:0}%;--ci-height:${ci?(ci.high-ci.low)/cfg.max*100:0}%" aria-label="${escapeHTML(description)}" title="${escapeHTML(description)}"><span class="bar-column"><span class="bar-fill ${v===0||v==null?'bar-zero':''}" style="height:${height}%"></span>${ci?'<span class="ci-whisker" aria-hidden="true"></span>':''}<span class="bar-value">${v==null?'—':escapeHTML(cfg.format(v))}</span></span><span class="bar-name">${escapeHTML(m.name)}</span><span class="bar-sub">${metric==='full'?`${m.full_credit}/${m.assigned} full credit`:`${m.scored}/${m.assigned} scored`}</span></button>`;
 }).join('')}</div>`;
 $('#table-body').innerHTML=rows.map(m=>`<tr><td><button type="button" class="model-link" data-model="${escapeHTML(m.id)}"><span class="model-swatch" style="--bar:${m.color}"></span><span>${escapeHTML(m.name)}<small>${escapeHTML(m.creator)}</small></span></button></td><td><span class="score-number">${number(m.mean_score)}</span><span class="cell-sub">${m.mean_score==null?'not scored':m.ci95?`${number(m.ci95.low)}–${number(m.ci95.high)} CI`:'no interval'}</span></td><td>${m.full_credit} / ${m.assigned}<span class="cell-sub">${number(m.full_credit/m.assigned*100,1)}%</span></td><td>${m.scored} / ${m.assigned}<span class="cell-sub">${number(m.scored/m.assigned*100,0)}% coverage</span></td><td>${number(m.mean_seconds,1)}s<span class="cell-sub">${m.timing_known}/${m.assigned} timed</span></td></tr>`).join('');
 document.querySelectorAll('[data-sort]').forEach(b=>{const active=b.dataset.sort===sortKey;b.closest('th').setAttribute('aria-sort',active?(sortDirection==='asc'?'ascending':'descending'):'none');b.querySelector('span').textContent=active?(sortDirection==='asc'?'↑':'↓'):'↕';});
 document.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>openModel(b.dataset.model));
 updateURL();
}
function selectAll(){selected=new Set(dataset.models.map(m=>m.id));renderFilters();render();}
function openModel(id){
 const m=dataset.models.find(m=>m.id===id);if(!m)return;
 const max=Math.max(...m.score_distribution,1),ci=m.ci95;
 $('#dialog-content').innerHTML=`<p class="dialog-eyebrow">${escapeHTML(m.creator.toUpperCase())} / AGGREGATE DETAIL</p><h2 class="dialog-title" id="dialog-title">${escapeHTML(m.name)}</h2><p class="dialog-sub">${escapeHTML(dataset.label)} · ${m.assigned} assigned attempts</p><div class="dialog-stats"><div><strong>${number(m.mean_score)}</strong><span>mean score / 7</span></div><div><strong>${m.full_credit}/${m.assigned}</strong><span>automated full credit</span></div><div><strong>${m.scored}/${m.assigned}</strong><span>scored attempts</span></div></div><h3 class="hist-title">Score distribution</h3><div class="histogram" role="img" aria-label="Attempt counts by response score: ${m.score_distribution.map((n,i)=>i+' points: '+n).join('; ')}">${m.score_distribution.map((n,i)=>`<div class="hist-bin" style="height:${n/max*90}px" aria-hidden="true"><b>${n}</b><small>${i}/7</small></div>`).join('')}</div><p class="dialog-note">All ${m.assigned} assigned attempts count in the mean and score distribution. Partial responses and unfinished reasoning retain their rubric points; empty responses score 0/7. Full credit requires both a valid verdict and 7/7.</p><dl class="dialog-list"><div><dt>Scored attempts</dt><dd>${m.scored} / ${m.assigned}</dd></div><div><dt>Scoring basis</dt><dd>Recorded response, including partial reasoning</dd></div><div><dt>Mean elapsed time</dt><dd>${number(m.mean_seconds,1)} seconds</dd></div><div><dt>95% score interval</dt><dd>${ci?number(ci.low)+'–'+number(ci.high):'Not estimable'}</dd></div><div><dt>Provider model identifier</dt><dd>${escapeHTML(m.id)}</dd></div></dl><p class="dialog-note">One attempt per problem. Provider-reported identity via the Devin adapter. Scores use automated reference-and-rubric grading. Problems and responses remain private.</p>`;
 $('#model-dialog').showModal();$('.dialog-close').focus();
}
function notify(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);}
document.querySelectorAll('[data-metric]').forEach(b=>b.addEventListener('click',()=>{if(!dataset)return;metric=b.dataset.metric;sortKey=metrics[metric].sort;sortDirection=metric==='time'?'asc':'desc';render();}));
document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{if(!dataset)return;const next=b.dataset.sort;if(next===sortKey)sortDirection=sortDirection==='asc'?'desc':'asc';else{sortKey=next;sortDirection=next==='name'||next==='mean_seconds'?'asc':'desc';}render();}));
$('#filter-button').addEventListener('click',()=>{const open=$('#model-filters').hidden;$('#model-filters').hidden=!open;$('#filter-button').setAttribute('aria-expanded',String(open));});
$('#select-all').addEventListener('click',()=>dataset&&selectAll());
$('#show-ci').addEventListener('change',()=>dataset&&render());
$('.dialog-close').addEventListener('click',()=>$('#model-dialog').close());
$('#model-dialog').addEventListener('click',e=>{if(e.target===$('#model-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('#copy-link').addEventListener('click',async()=>{const u=new URL(location.href);u.hash='benchmark';try{await navigator.clipboard.writeText(u.href);notify('Benchmark link copied.');}catch{history.replaceState(null,'',u);notify('Use the address bar to copy this benchmark view.');}});
(async()=>{
 try{
   const response=await fetch('./benchmarks.json?v=response-scores-v2', {cache:'no-cache'});if(!response.ok)throw Error('Unavailable');data=await response.json();
   const q=new URLSearchParams(location.search);dataset=data.datasets[0];metric=Object.hasOwn(metrics,q.get('metric'))?q.get('metric'):'full';
   sortKey=metrics[metric].sort;sortDirection=metric==='time'?'asc':'desc';
   const requested=q.has('models')?new Set(q.get('models').split(',')):null;
   selected=new Set(dataset.models.filter(m=>!requested||requested.has(m.id)).map(m=>m.id));
   renderFilters();render();
 }catch(error){$('#load-status').innerHTML='The interactive results could not load. You can still <a href="./benchmark-results.csv">download the aggregate CSV</a>.';$('#chart').innerHTML='<p class="empty-chart">Interactive results unavailable. Please reload or use the CSV.</p>';}
})();
