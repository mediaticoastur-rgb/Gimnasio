const $=id=>document.getElementById(id);
const getData=()=>{try{return JSON.parse(localStorage.getItem('gymstats')||'{"workouts":[],"weights":[],"decisions":{}}')}catch(e){return {workouts:[],weights:[],decisions:{}}}};
let data=getData();data.workouts=data.workouts||[];data.weights=data.weights||[];data.decisions=data.decisions||{};
let session=[],seconds=90,timer=null;
let settings={days:Number(localStorage.getItem('gymDays')||3),workerUrl:localStorage.getItem('gymWorkerUrl')||''};
const save=()=>localStorage.setItem('gymstats',JSON.stringify(data));
const today=()=>new Date().toISOString().slice(0,10);

const routineTemplates=[
 {day:'A',focus:'Cuerpo completo · A',items:[['Prensa de piernas',2,10,12],['Press de pecho en máquina',2,10,12],['Jalón al pecho',2,10,12],['Peso muerto rumano con mancuernas',2,10,12],['Elevaciones laterales',2,12,15],['Plancha',2,20,30]]},
 {day:'B',focus:'Cuerpo completo · B',items:[['Sentadilla a banco o goblet',2,8,12],['Press inclinado con mancuernas',2,10,12],['Remo sentado en máquina',2,10,12],['Curl femoral en máquina',2,10,12],['Curl bíceps',2,10,15],['Extensión tríceps en polea',2,10,15]]},
 {day:'C',focus:'Cuerpo completo · C',items:[['Prensa de piernas',2,10,12],['Press de pecho en máquina',2,10,12],['Jalón al pecho',2,10,12],['Puente de glúteos',2,10,15],['Press militar en máquina',2,10,12],['Pallof press',2,10,12]]}
];
function getRoutine(){const saved=(()=>{try{return JSON.parse(localStorage.getItem('gymAiRoutine')||'null')}catch(e){return null}})();if(Array.isArray(saved)&&saved.length){const count=Math.max(2,Math.min(6,settings.days||3));return Array.from({length:count},(_,i)=>saved[i%saved.length]).map((d,i)=>({...d,day:String.fromCharCode(65+i),items:(d.items||[]).map(e=>{const name=e.name||e[0]||'Ejercicio';const sets=Number(e.sets||e[1]||3);const reps=String(e.reps||e[2]||'8-12');const m=reps.match(/(\d+)\s*[-–]\s*(\d+)/);return [name,sets,m?Number(m[1]):Number(reps)||10,m?Number(m[2]):Number(reps)||12]})}))}const days=Math.max(2,Math.min(6,settings.days||3));return Array.from({length:days},(_,i)=>{const t=routineTemplates[i%routineTemplates.length];return {...t,day:String.fromCharCode(65+i),focus:t.focus.replace(/ · [A-C]$/,'')+(i>=3?' · variación':'')};});}
function renderRoutine(){
 const routine=getRoutine();const root=$('routineDays');if(!root)return;
 root.innerHTML=routine.map(d=>`<article class="routine-day panel"><div class="routine-heading"><span class="day-badge">DÍA ${d.day}</span><h3>${d.focus}</h3></div><div class="routine-list">${d.items.map(e=>`<div class="routine-ex"><img data-exercise-image="${esc(e[0])}" src="${artFor(e[0])}" alt="Ilustración de ${esc(e[0])}"><div class="routine-copy"><strong>${esc(e[0])}</strong><span>${e[1]} series · ${e[2]}–${e[3]} repeticiones</span></div><button class="secondary routine-use" data-routine="${esc(e[0])}" data-sets="${e[1]}" data-reps="${e[2]}">Usar</button></div>`).join('')}</div></article>`).join('');
 root.querySelectorAll('[data-routine]').forEach(b=>b.onclick=()=>{$('exercise').value=b.dataset.routine;$('sets').value=b.dataset.sets;$('reps').value=b.dataset.reps;$('sessionName').value='Rutina '+(getRoutine().find(d=>d.items.some(e=>e[0]===b.dataset.routine))?.day||'');$('muscle').value='Full body';show('workout');$('weight').focus();});
}

function show(view){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===view));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===view));if(view==='coach')renderCoach();}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.goto)));
function dateText(d){return new Date(d+'T12:00:00').toLocaleDateString('es-ES')}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function allEntries(name){return data.workouts.flatMap(w=>w.exercises.filter(e=>e.name.toLowerCase()===name.toLowerCase()).map(e=>({...e,date:w.date,session:w.name}))).sort((a,b)=>a.date.localeCompare(b.date))}
function artFor(name){let n=name.toLowerCase();if(n.includes('banca'))return 'press-banca.svg';if(n.includes('sentadilla'))return 'sentadilla.svg';if(n.includes('jalón')||n.includes('jalon')||n.includes('remo'))return 'jalon.svg';if(n.includes('militar')||n.includes('hombro'))return 'press-militar.svg';if(n.includes('bíceps')||n.includes('biceps')||n.includes('curl'))return 'curl-biceps.svg';if(n.includes('tríceps')||n.includes('triceps'))return 'triceps.svg';return 'mancuernas.svg'}
function analyze(){
 const names=[...new Set(data.workouts.flatMap(w=>w.exercises.map(e=>e.name)))];
 return names.map(name=>{
  const a=allEntries(name),last=a.slice(-4),latest=a[a.length-1];
  if(a.length<3)return {name,status:'learning',message:`Necesito al menos 3 registros de ${name} para conocer tu tendencia.`,entries:a};
  if(last.some(e=>e.effort==='molestia'))return {name,status:'hold',message:'Has indicado molestias en una de tus sesiones recientes. Mantén o reduce la carga y revisa la técnica; no propongo subir peso.',entries:a};
  const good=last.slice(-2).every(e=>(e.effort==='facil'||e.effort==='bien')&&e.reps>=8&&e.sets>=2);
  const prev=last[last.length-2],improved=latest.kg>prev.kg||latest.reps>prev.reps||latest.sets>prev.sets;
  if(good&&improved){
   const suggested=Math.round((latest.kg+(latest.kg<20?1:2.5))*2)/2;
   return {name,status:'ready',message:`En tus últimas sesiones has mantenido un buen rendimiento y has progresado. Puedes probar ${suggested} kg cuando vuelvas a realizar este ejercicio, siempre que la técnica siga siendo buena.`,suggested,latest,entries:a};
  }
  if(last.length>=3&&last.slice(-3).every(e=>e.effort==='duro'||e.effort==='bien'))return {name,status:'steady',message:'Estás consolidando el ejercicio. Mantén la carga y busca repeticiones controladas antes de plantear un aumento.',entries:a};
  return {name,status:'observe',message:'Sigo observando tu evolución. Por ahora no hay suficientes señales consistentes para cambiar la carga.',entries:a};
 });
}
function render(){
 $('totalWorkouts').textContent=data.workouts.length;
 $('latestWeight').textContent=data.weights.length?Number(data.weights[data.weights.length-1].kg).toFixed(1):'—';
 $('trackedExercises').textContent=new Set(data.workouts.flatMap(w=>w.exercises.map(e=>e.name))).size;
 $('weightList').innerHTML=data.weights.length?[...data.weights].reverse().map(w=>`<div class="weight-item"><strong>${Number(w.kg).toFixed(1)} kg</strong> <span>${dateText(w.date)}</span></div>`).join(''):'<div class="empty">Añade tu primer registro para ver tu evolución.</div>';
 $('historyList').innerHTML=data.workouts.length?[...data.workouts].reverse().map(w=>`<div class="history-item"><strong>${esc(w.name)} · ${esc(w.muscle)}</strong><span>${dateText(w.date)} · ${w.exercises.length} ejercicios</span><div class="muted">${w.exercises.map(e=>`${esc(e.name)}: ${e.sets}×${e.reps} · ${e.kg} kg (${effortText(e.effort)})`).join(' | ')}</div></div>`).join(''):'<div class="empty">Todavía no hay entrenamientos guardados.</div>';
 const recs=analyze();const ready=recs.filter(r=>r.status==='ready').length;
 $('homeAdvice').textContent=ready?`He detectado ${ready} ejercicio(s) con señales de progresión. Entra en Mi entrenador para ver las propuestas y sus imágenes.`:'Todavía estoy conociendo tu rendimiento. Registra tus sesiones y cómo te has sentido; no haré recomendaciones precipitadas.';
}
function effortText(v){return ({bien:'controlado',facil:'fácil',duro:'duro',molestia:'molestias'})[v]||'sin valoración'}
function renderSession(){
 $('exerciseCount').textContent=session.length;
 $('sessionExercises').innerHTML=session.length?session.map((e,i)=>`<div class="exercise-item"><button class="remove" data-remove="${i}">Quitar</button><strong>${esc(e.name)}</strong><span>${e.sets} series × ${e.reps} repeticiones · ${e.kg} kg · ${effortText(e.effort)}</span></div>`).join(''):'<div class="empty">Todavía no has añadido ejercicios.</div>';
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{session.splice(+b.dataset.remove,1);renderSession()});
}
$('addExercise').onclick=()=>{
 const name=$('exercise').value.trim(),kg=Number($('weight').value),reps=Number($('reps').value),sets=Number($('sets').value),effort=$('effort').value;
 if(!name||$('weight').value===''||reps<1||sets<1||kg<0){alert('Introduce ejercicio, peso, repeticiones y series.');return}
 session.push({name,kg,reps,sets,effort});$('exercise').value='';$('weight').value='';$('reps').value='';renderSession();
};
$('saveWorkout').onclick=()=>{
 if(!session.length){alert('Añade al menos un ejercicio.');return}
 data.workouts.push({name:$('sessionName').value.trim()||'Entrenamiento',muscle:$('muscle').value,date:today(),exercises:session});
 save();session=[];$('sessionName').value='';renderSession();render();alert('Entrenamiento guardado. Tu entrenador actualizará el análisis.');show('coach');
};
function renderCoach(){
 const recs=analyze();
 $('recommendations').innerHTML=recs.length?recs.map((r,i)=>{
  const title=r.status==='ready'?'Propuesta de progresión':r.status==='hold'?'Prioridad: cuidar molestias':r.status==='learning'?'Aprendiendo tu nivel':'Seguimiento';
  const tag=r.status==='ready'?'SEÑALES DE PROGRESO':r.status==='hold'?'SIN SUBIR CARGA':r.status==='learning'?'REUNIENDO DATOS':'SEGUIR OBSERVANDO';
  const action=r.status==='ready'?`<button class="primary" data-accept="${i}">Aceptar propuesta</button><button class="secondary" data-dismiss="${i}">Ahora no</button>`:`<button class="secondary" data-dismiss="${i}">Entendido</button>`;
  return `<article class="rec-card"><div class="rec-top"><span class="tag">${tag}</span><span class="muted">${r.entries.length} registros</span></div><h3>${esc(r.name)}</h3><img class="exercise-art" data-exercise-image="${esc(r.name)}" src="${artFor(r.name)}" alt="Ilustración de ${esc(r.name)}"><p>${esc(r.message)}</p>${r.status==='ready'?`<p class="text-good"><strong>Próxima carga orientativa: ${r.suggested} kg</strong></p>`:''}<div class="rec-actions">${action}</div></article>`;
 }).join(''):'<div class="recommendation-empty">Todavía no hay ejercicios registrados. Después de varias sesiones aparecerán aquí los análisis y las ilustraciones de los ejercicios.</div>';
 document.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>{const r=recs[+b.dataset.accept];data.decisions[r.name]={kg:r.suggested,date:today(),accepted:true};save();alert(`Propuesta aceptada: prueba ${r.suggested} kg cuando vuelvas a hacer ${r.name}. Si no puedes mantener buena técnica, vuelve a la carga anterior.`);renderCoach()});
 document.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>{const r=recs[+b.dataset.dismiss];data.decisions[r.name]={date:today(),accepted:false};save();b.closest('.rec-card').remove()});
}
$('saveWeight').onclick=()=>{const kg=Number($('bodyWeight').value),date=$('weightDate').value||today();if(!kg||kg<25||kg>350){alert('Introduce un peso válido en kg.');return}data.weights.push({kg,date});data.weights.sort((a,b)=>a.date.localeCompare(b.date));save();$('bodyWeight').value='';render();alert('Peso guardado.')};
$('weightDate').value=today();
function timerRender(){$('timerDisplay').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
$('timerStart').onclick=()=>{if(timer)return;timer=setInterval(()=>{seconds--;timerRender();if(seconds<=0){clearInterval(timer);timer=null;seconds=0;timerRender();if(navigator.vibrate)navigator.vibrate([250,100,250]);alert('¡Descanso terminado!') }},1000)};
$('timerReset').onclick=()=>{clearInterval(timer);timer=null;seconds=90;timerRender()};
$('exportCsv').onclick=()=>{if(!data.workouts.length){alert('No hay entrenamientos que exportar.');return}const rows=[['fecha','sesion','grupo_muscular','ejercicio','peso_kg','series','repeticiones','sensacion']];data.workouts.forEach(w=>w.exercises.forEach(e=>rows.push([w.date,w.name,w.muscle,e.name,e.kg,e.sets,e.reps,effortText(e.effort)])));const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='gymstats-entrenamientos.csv';a.click();URL.revokeObjectURL(url)};
$('clearData').onclick=()=>{if(confirm('¿Seguro que quieres borrar todos tus entrenamientos y registros de peso? Esta acción no se puede deshacer.')){data={workouts:[],weights:[],decisions:{}};save();render();renderCoach()}};

// Ajustes persistentes
function initSettings(){if($('trainingDays'))$('trainingDays').value=String(settings.days);if($('workerUrl'))$('workerUrl').value=settings.workerUrl;if($('workerStatus'))$('workerStatus').textContent=settings.workerUrl?'Conexión guardada.':'Todavía no hay conexión configurada.';}
$('saveDays')?.addEventListener('click',()=>{settings.days=Number($('trainingDays').value)||3;localStorage.setItem('gymDays',String(settings.days));renderRoutine();alert('Rutina reorganizada para '+settings.days+' días por semana.');show('routine');});
$('saveWorker')?.addEventListener('click',()=>{const u=$('workerUrl').value.trim().replace(/\/$/,'');if(u&&!/^https:\/\//i.test(u)){alert('Introduce una dirección HTTPS válida.');return}settings.workerUrl=u;localStorage.setItem('gymWorkerUrl',u);$('workerStatus').textContent=u?'Dirección guardada. La clave sigue protegida en Cloudflare.':'Conexión eliminada.';});
// Búsqueda automática de fotografías con Wikimedia Commons como fuente abierta.
const imageCache={};
async function findExercisePhoto(name){if(imageCache[name])return imageCache[name];try{const q=encodeURIComponent(name+' exercise gym');const url='https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch='+q+'&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=700&format=json&origin=*';const r=await fetch(url);if(!r.ok)throw Error('image search');const j=await r.json();const pages=Object.values(j.query?.pages||{});const page=pages.find(x=>/exercise|gym|weight|training|fitness|press|squat|row|curl/i.test(x.title||''))||pages[0];const src=page?.imageinfo?.[0]?.thumburl||page?.imageinfo?.[0]?.url;if(src){imageCache[name]=src;return src;}}catch(e){}return null;}
async function hydrateExerciseImages(root=document){const imgs=[...root.querySelectorAll('img[data-exercise-image]')];for(const img of imgs){if(img.dataset.searched)continue;img.dataset.searched='1';const found=await findExercisePhoto(img.dataset.exerciseImage);if(found){img.src=found;img.alt='Fotografía encontrada en Wikimedia Commons: '+img.dataset.exerciseImage;}else{img.alt='Ilustración orientativa de '+img.dataset.exerciseImage;}}}
const originalRenderRoutine=renderRoutine;renderRoutine=function(){originalRenderRoutine();hydrateExerciseImages($('routineDays'));};
const originalRenderCoach=renderCoach;renderCoach=function(){originalRenderCoach();hydrateExerciseImages($('recommendations'));};
function addChat(role,text){const el=document.createElement('div');el.className='chat-bubble '+(role==='user'?'user':'bot');el.textContent=text;$('chatMessages').appendChild(el);$('chatMessages').scrollTop=$('chatMessages').scrollHeight;}
$('sendCoach')?.addEventListener('click',async()=>{const prompt=$('coachPrompt').value.trim();if(!prompt)return;addChat('user',prompt);$('coachPrompt').value='';if(!settings.workerUrl){addChat('bot','Para activar el entrenador IA, primero configura la dirección del Worker en Ajustes.');show('settings');return;}const btn=$('sendCoach');btn.disabled=true;$('coachStatus').textContent='El entrenador está preparando una propuesta…';try{const response=await fetch(settings.workerUrl+'/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:prompt,days:settings.days,goal:'ganar músculo y perder grasa',level:'principiante',history:data.workouts.slice(-30),currentRoutine:getRoutine()})});if(!response.ok)throw Error('HTTP '+response.status);const result=await response.json();const answer=result.reply||'He recibido tu petición, pero no he podido generar una respuesta.';addChat('bot',answer);if(result.routine&&Array.isArray(result.routine)&&result.routine.length){$('aiProposal').innerHTML='<h4>Propuesta de nueva rutina</h4>'+result.routine.map((d,i)=>`<div class="proposal-day"><strong>Día ${i+1}: ${esc(d.focus||'Entrenamiento')}</strong><ul>${(d.items||[]).map(e=>`<li>${esc(e.name||e[0]||'Ejercicio')} · ${esc(String(e.sets||e[1]||3))} series · ${esc(String(e.reps||e[2]||10))} reps</li>`).join('')}</ul></div>`).join('')+'<button class="primary wide" id="applyRoutine">Aplicar propuesta</button>'; $('applyRoutine').onclick=()=>{localStorage.setItem('gymAiRoutine',JSON.stringify(result.routine));renderRoutine();addChat('bot','¡Hecho! La nueva rutina ya está aplicada. Puedes verla en la pestaña Rutina.');};}else{$('aiProposal').textContent='';}$('coachStatus').textContent='Respuesta recibida.';}catch(e){$('coachStatus').textContent='No se pudo conectar. Revisa la URL del Worker y su configuración.';addChat('bot','No he podido conectar con Gemini. Comprueba que el Worker esté publicado y que la clave esté guardada como secreto en Cloudflare.');}finally{btn.disabled=false;}});
initSettings();

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();renderSession();renderRoutine();timerRender();hydrateExerciseImages();