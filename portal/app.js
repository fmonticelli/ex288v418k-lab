'use strict';
const $ = id => document.getElementById(id);
const store = 'ex288-portal-v1';
let state = JSON.parse(localStorage.getItem(store) || '{}');
state.page ||= 'activities'; state.grades ||= {}; state.mode ||= 'exam'; state.variant ||= 'A'; state.selected ||= '1'; state.checks ||= {}; state.started ||= Date.now();
let tasks = [], examText = '';
let operationBusy=false, statusSequence=0;
const save = () => localStorage.setItem(store, JSON.stringify(state));
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function markdown(s){
  // HTML escapado, com blocos de codigo preservados para comandos de prova.
  const lines=String(s).split('\n');
  let inCode=false, code=[], result=[];
  for(const raw of lines){
    if(/^\s*```/.test(raw)){
      if(inCode){result.push('<pre class="command-block"><code>'+escapeHTML(code.join('\n'))+'</code></pre>');code=[];}
      inCode=!inCode;continue;
    }
    if(inCode){code.push(raw);continue;}
    const l=escapeHTML(raw);
    if(/^#{1,4} /.test(l)){const n=l.match(/^#+/)[0].length;result.push('<h'+n+'>'+inline(l.slice(n+1))+'</h'+n+'>');}
    else if(/^\s*[-*] /.test(l))result.push('<p>• '+inline(l.replace(/^\s*[-*] /,''))+'</p>');
    else if(/^\s*\d+\. /.test(l))result.push('<p>'+inline(l)+'</p>');
    else if(/^> /.test(l))result.push('<blockquote>'+inline(l.slice(2))+'</blockquote>');
    else result.push(l.trim()?'<p>'+inline(l)+'</p>':'');
  }
  if(inCode)result.push('<pre class="command-block"><code>'+escapeHTML(code.join('\n'))+'</code></pre>');
  return result.join('');
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
function setPage(page){
  if(!['instructions','activities','grade'].includes(page))page='activities';
  state.page=page;save();
  for(const p of ['instructions','activities','grade'])$(p+'-page').hidden=p!==page;
  document.querySelectorAll('#sections button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('task-navigation').hidden=page!=='activities';
  $('progress-card') && ($('progress-card').hidden=page!=='activities');
  showGrade();
}
function showGrade(){
  const g=state.grades[state.variant];
  $('grade-value').textContent=g?g.score+' / 300':'— / 300';
  $('grade-status').textContent=g?(g.score>=210?'Referência de aprovação atingida':'Abaixo da referência de aprovação'):'Execute a validação do simulado para calcular a nota.';
  $('grade-bar').style.width=(g?g.score/3:0)+'%';
  $('grade-details').textContent=g?g.output:'Nenhuma correção registrada para a variante '+state.variant+'.';
}
function recordGrade(output){
  const match=output.match(/TOTAL:\s*(\d+)\s*\/\s*(\d+)/);
  if(!match)return false;
  const earned=Number(match[1]),possible=Number(match[2]);
  if(!possible)return false;
  const score=Math.max(0,Math.min(300,Math.round(earned/possible*300)));
  state.grades[state.variant]={score,earned,possible,output};save();showGrade();return true;
}
function draw(){
  const parts=currentParts();let idx=Number(state.selected)||0;idx=Math.min(idx,parts.length-1);idx=Math.max(0,idx);
  state.selected=String(idx);save();
  $('mode').value=state.mode;$('variant').value=state.variant;$('variant').hidden=state.mode!=='exam';
  $('subtitle').textContent=state.mode==='exam'?'Variante '+state.variant+' · correção única':'Tarefas T0–T8 · validação individual';
  $('nav').replaceChildren();
  parts.forEach((p,i)=>{const b=document.createElement('button');b.textContent=p.title;b.classList.toggle('active',i===idx);b.onclick=()=>{state.selected=String(i);draw();};$('nav').append(b);});
  const part=parts[idx];$('title').textContent=part.title;
  $('question').innerHTML=markdown(state.mode==='task' ? [part.body,...part.sections.map(section=>section.body)].join('\n\n') : part.body);
  const items=checkboxItems(part);$('checks').replaceChildren();
  items.forEach(item=>{const key=[state.mode,state.variant,part.id??idx,item.id].join(':');const row=document.createElement('div');row.className='item';const label=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!state.checks[key];cb.onchange=()=>{state.checks[key]=cb.checked;save();updateProgress();};const text=document.createElement('span');text.textContent=item.title;label.append(cb,text);row.append(label);$('checks').append(row);});
  $('validate').textContent=state.mode==='exam'?'Validar simulado completo':'Validar tarefa';
  updateProgress();setPage(state.page);refreshNamespaceStatus();
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
async function refreshNamespaceStatus(){
  const seq=++statusSequence;
  if(operationBusy)return;
  const params=new URLSearchParams({mode:state.mode});
  if(state.mode==='exam')params.set('variant',state.variant);
  else params.set('task',currentParts()[Number(state.selected)]?.id??'0');
  $('cleanup').disabled=true;
  $('cleanup').title='Consultando namespaces do OpenShift...';
  try{
    const r=await fetch('/api/status?'+params);
    const d=await r.json();
    if(seq!==statusSequence||operationBusy)return;
    if(!r.ok)throw Error(d.error||'Erro na consulta');
    const owned=d.namespaces.filter(n=>n.managed);
    const foreign=d.namespaces.filter(n=>!n.managed);
    $('cleanup').disabled=!d.can_cleanup;
    $('cleanup').title=foreign.length?'Existem namespaces sem label do laboratório; limpeza poderá falhar: '+foreign.map(n=>n.name).join(', '):owned.length?'Remover: '+owned.map(n=>n.name).join(', '):'Nenhum namespace provisionado encontrado';
  }catch(e){
    if(seq!==statusSequence||operationBusy)return;
    $('cleanup').disabled=true;
    $('cleanup').title='Não foi possível consultar o cluster: '+String(e);
  }
}
function operationStatus(type,title,message,details=false){
  const banner=$('operation-banner');
  banner.hidden=false;banner.className='operation-banner '+type;
  $('operation-title').textContent=title;
  $('operation-message').textContent=message;
  $('operation-details').hidden=!details;
}
$('operation-details').onclick=()=>{$('results').hidden=false;$('results').scrollIntoView({behavior:'smooth',block:'start'});};
async function action(kind){
  const buttons=[$('prepare'),$('validate'),$('cleanup')];
  const isPrepare=kind==='prepare';
  const isCleanup=kind==='cleanup';
  const target=state.mode==='exam'?'simulado '+state.variant:'tarefa '+currentParts()[Number(state.selected)].title;
  if(isCleanup){
    const scope=state.mode==='exam'?'TODOS os namespaces do Simulado '+state.variant+' (incluindo o compartilhado, se houver)':'o namespace da tarefa selecionada';
    if(!confirm('Excluir '+scope+'? Esta operação remove os recursos do OpenShift e não pode ser desfeita. A infraestrutura Gitea/Nexus e a nota registrada serão preservadas.'))return;
  }
  operationBusy=true;statusSequence++;
  buttons.forEach(b=>b.disabled=true);
  $('prepare').textContent=isPrepare?'Preparando...':'Preparar ambiente';
  $('validate').textContent=kind==='validate'?'Validando...':state.mode==='exam'?'Validar simulado completo':'Validar tarefa';
  $('cleanup').textContent=isCleanup?'Limpando...':'Limpar ambiente';
  operationStatus('running',isCleanup?'Limpando ambiente...':isPrepare?'Preparando ambiente...':'Executando validação...',
    'Executando scripts para '+target+'. Aguarde a resposta do servidor; esta operação pode levar alguns minutos.');
  $('results').hidden=false;
  $('status').textContent='Operação em andamento...';
  $('result').textContent='Aguardando conclusão do script. A saída será exibida aqui.';
  const body={mode:state.mode,action:kind};
  if(state.mode==='exam')body.variant=state.variant;else body.task=currentParts()[Number(state.selected)].id;
  try{
    const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json();
    const ok=r.ok&&d.ok===true;
    $('status').textContent=ok?'Concluído (exit 0)':'Falhou (exit '+(d.code??r.status)+')';
    $('result').textContent=d.output??d.error??'Sem saída';
    if(ok){
      operationStatus('success',isCleanup?'Limpeza concluída':isPrepare?'Preparação concluída':'Validação concluída',
        (isCleanup?'Script de limpeza finalizado para ':isPrepare?'Script de preparação finalizado sem erros para ':'Script de validação finalizado para ')+target+'. Confira a saída para detalhes.',true);
    }else{
      operationStatus('failure',isCleanup?'Falha ao limpar ambiente':isPrepare?'Falha ao preparar ambiente':'Falha na validação',
        'O script retornou erro para '+target+'. Abra os detalhes para identificar a causa.',true);
    }
    if(kind==='validate'&&state.mode==='exam'&&recordGrade(d.output??''))setPage('grade');
  }catch(e){
    $('status').textContent='Erro de conexão';
    $('result').textContent=String(e);
    operationStatus('failure','Erro de comunicação','Não foi possível obter a resposta do servidor. Consulte os detalhes.',true);
  }finally{
    operationBusy=false;
    buttons.forEach(b=>b.disabled=false);
    refreshNamespaceStatus();
    $('prepare').textContent='Preparar ambiente';
    $('cleanup').textContent='Limpar ambiente';
    $('validate').textContent=state.mode==='exam'?'Validar simulado completo':'Validar tarefa';
  }
}
document.querySelectorAll('#sections button').forEach(b=>b.onclick=()=>setPage(b.dataset.page));
$('mode').onchange=e=>{state.mode=e.target.value;state.selected='0';draw();};
$('variant').onchange=async e=>{state.variant=e.target.value;state.selected='0';await load();};
$('prepare').onclick=()=>action('prepare');$('validate').onclick=()=>action('validate');$('cleanup').onclick=()=>action('cleanup');
$('reset').onclick=()=>{if(confirm('Reiniciar cronômetro?')){state.started=Date.now();save();}};
setInterval(()=>{const n=Math.floor((Date.now()-state.started)/1000);$('clock').textContent=[Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(v=>String(v).padStart(2,'0')).join(':');},1000);
setInterval(()=>{if(!operationBusy&&state.page==='activities')refreshNamespaceStatus();},15000);
load().catch(e=>{$('title').textContent='Erro ao carregar enunciados';$('question').textContent=String(e);});
