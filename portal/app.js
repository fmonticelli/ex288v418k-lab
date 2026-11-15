'use strict';
const $ = id => document.getElementById(id);
const store = 'ex288-portal-v1';
let state = JSON.parse(localStorage.getItem(store) || '{}');
state.mode ||= 'exam'; state.variant ||= 'A'; state.selected ||= '1'; state.checks ||= {}; state.started ||= Date.now();
let tasks = [], examText = '';
const save = () => localStorage.setItem(store, JSON.stringify(state));
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function markdown(s){
  // Renderizacao simples e segura: escapa HTML antes de formatar.
  const lines = escapeHTML(s).split('\n');
  return lines.map(l=>{
    if(/^#{1,4} /.test(l)){const n=l.match(/^#+/)[0].length;return '<h'+n+'>'+inline(l.slice(n+1))+'</h'+n+'>';}
    if(/^\s*[-*] /.test(l))return '<p>• '+inline(l.replace(/^\s*[-*] /,''))+'</p>';
    if(/^\s*\d+\. /.test(l))return '<p>'+inline(l)+'</p>';
    if(/^> /.test(l))return '<blockquote>'+inline(l.slice(2))+'</blockquote>';
    return l.trim()?'<p>'+inline(l)+'</p>':'';
  }).join('');
}
function inline(s){return s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>');}
function examParts(text){
  // Separa questoes pelo heading markdown; fallback exibe o documento integral.
  const matches=[...text.matchAll(/^#{1,3}\s+(?:Quest[aã]o|Tarefa|Task)\s*(\d+)[^\n]*/gim)];
  if(!matches.length)return [{title:'Enunciado completo',body:text}];
  return matches.map((m,i)=>({title:m[0].replace(/^#+\s*/,''),body:text.slice(m.index, matches[i+1]?.index ?? text.length)}));
}
function currentParts(){
  if(state.mode==='exam')return examParts(examText);
  return tasks.map(t=>({title:'T'+t.id+' — '+t.title,body:t.intro,sections:t.sections,id:t.id}));
}
function checkboxItems(part){
  if(state.mode==='task')return part.sections.map((s,i)=>({id:s.id,title:'E'+s.id+' — '+s.title}));
  // Cada linha de requisito enumerado e uma anotacao; se nao houver, checklist por questao.
  const lines=part.body.split('\n').filter(l=>/^\s*(?:[-*]\s+|\d+[.)]\s+)/.test(l));
  return (lines.length?lines:[part.title]).map((l,i)=>({id:String(i),title:l.replace(/^\s*(?:[-*]\s+|\d+[.)]\s+)/,'').replace(/\*\*/g,'').slice(0,180)}));
}
function draw(){
  const parts=currentParts();let idx=Number(state.selected)||0;idx=Math.min(idx,parts.length-1);idx=Math.max(0,idx);
  state.selected=String(idx);save();
  $('mode').value=state.mode;$('variant').value=state.variant;$('variant').hidden=state.mode!=='exam';
  $('subtitle').textContent=state.mode==='exam'?'Variante '+state.variant+' · correção única':'Tarefas T0–T8 · validação individual';
  $('nav').replaceChildren();
  parts.forEach((p,i)=>{const b=document.createElement('button');b.textContent=p.title;b.classList.toggle('active',i===idx);b.onclick=()=>{state.selected=String(i);draw();};$('nav').append(b);});
  const part=parts[idx];$('title').textContent=part.title;
  $('question').innerHTML=markdown(part.body);
  const items=checkboxItems(part);$('checks').replaceChildren();
  items.forEach(item=>{const key=[state.mode,state.variant,part.id??idx,item.id].join(':');const row=document.createElement('div');row.className='item';const label=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!state.checks[key];cb.onchange=()=>{state.checks[key]=cb.checked;save();updateProgress();};const text=document.createElement('span');text.textContent=item.title;label.append(cb,text);row.append(label);$('checks').append(row);});
  $('validate').textContent=state.mode==='exam'?'Validar simulado completo':'Validar tarefa';
  updateProgress();
}
function updateProgress(){
  let total=0,done=0;currentParts().forEach((p,i)=>checkboxItems(p).forEach(item=>{total++;if(state.checks[[state.mode,state.variant,p.id??i,item.id].join(':')])done++;}));
  $('bar').style.width=(total?100*done/total:0)+'%';$('count').textContent=done+'/'+total+' marcações concluídas';
}
async function load(){
  const r=await fetch('/api/tasks');tasks=(await r.json()).tasks;
  const e=await fetch('/api/exam?variant='+state.variant);examText=(await e.json()).markdown;
  draw();
}
async function action(kind){
  const buttons=[$('prepare'),$('validate')];buttons.forEach(b=>b.disabled=true);
  $('results').hidden=false;$('status').textContent='Executando '+kind+'... aguarde.';$('result').textContent='';
  const body={mode:state.mode,action:kind};
  if(state.mode==='exam')body.variant=state.variant;else body.task=currentParts()[Number(state.selected)].id;
  try{
    const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json();$('status').textContent=d.ok?'Concluído (exit 0)':'Falhou (exit '+(d.code??r.status)+')';$('result').textContent=d.output??d.error??'Sem saída';
  }catch(e){$('status').textContent='Erro de conexão';$('result').textContent=String(e);}
  finally{buttons.forEach(b=>b.disabled=false);}
}
$('mode').onchange=e=>{state.mode=e.target.value;state.selected='0';draw();};
$('variant').onchange=async e=>{state.variant=e.target.value;state.selected='0';await load();};
$('prepare').onclick=()=>action('prepare');$('validate').onclick=()=>action('validate');
$('reset').onclick=()=>{if(confirm('Reiniciar cronômetro?')){state.started=Date.now();save();}};
setInterval(()=>{const n=Math.floor((Date.now()-state.started)/1000);$('clock').textContent=[Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(v=>String(v).padStart(2,'0')).join(':');},1000);
load().catch(e=>{$('title').textContent='Erro ao carregar enunciados';$('question').textContent=String(e);});
