/* Reformándome v34 — lugar de entrenamiento, planes progresivos, alternativas y vídeos.
   Módulo original, no distribuye contenido de los libros consultados.
   Requiere app.js v31 y debe cargarse DESPUÉS de app.js y cloud-sync.js.
   La información sensible se mantiene en el mismo estado d, incluido en las copias JSON y Supabase.
*/
'use strict';
(() => {
  if (typeof qs === 'undefined' || typeof d === 'undefined' ||
      typeof trainingPlan !== 'function' || typeof question !== 'function' ||
      typeof training !== 'function') {
    console.warn('Reformándome: entrenamiento v34 requiere app.js compatible.');
    return;
  }

  const PLACES = [
    'Gimnasio + aire libre',
    'Casa + aire libre',
    'Solo gimnasio',
    'Solo casa',
    'Casa + gimnasio',
    'Casa + gimnasio + aire libre'
  ];
  const PLACE_TYPES = {
    'Gimnasio + aire libre':['gym','outdoor'],
    'Casa + aire libre':['home','outdoor'],
    'Solo gimnasio':['gym'],
    'Solo casa':['home'],
    'Casa + gimnasio':['home','gym'],
    'Casa + gimnasio + aire libre':['home','gym','outdoor']
  };
  const LABELS = {home:'🏠 Casa',gym:'🏋️ Gimnasio',outdoor:'🌳 Aire libre'};
  const MATERIALS = ['Ninguno','Esterilla','Bandas elásticas','Mancuernas','Kettlebell/pesas',
    'Bicicleta estática','Banco o silla estable','Barra o discos','Comba','TRX o anillas','Otro'];

  // Mostrar al usuario actual opciones nuevas; solo se convierten valores sin ambigüedad.
  if (d.answers.place === 'Gimnasio') d.answers.place = 'Solo gimnasio';
  if (d.answers.place === 'En casa') d.answers.place = 'Solo casa';
  const locationBlock = qs.find(section => String(section[0]).startsWith('5.'));
  if (locationBlock) {
    const placeQ = locationBlock[2].find(q => q[0] === 'place');
    const equipQ = locationBlock[2].find(q => q[0] === 'equipment');
    if (placeQ) {placeQ[1]='¿Dónde quieres entrenar habitualmente?'; placeQ[2]=PLACES;}
    if (equipQ) {equipQ[1]='¿Qué material tienes disponible en casa?';equipQ[2]=MATERIALS;}
  }
  d.trainingLocationOverride = plain(d.trainingLocationOverride) ? d.trainingLocationOverride : {};
  d.trainingHistory = plain(d.trainingHistory) ? d.trainingHistory : {};
  d.trainingReviews = plain(d.trainingReviews) ? d.trainingReviews : {};

  const selectedPlaces = () => PLACE_TYPES[selectValue('place')] || ['home'];
  const hasHome = () => selectedPlaces().includes('home');
  const oldQuestion = question;
  question = function(item) {
    if (item[0] === 'equipment' && !hasHome()) return '';
    if (item[0] === 'space' && !hasHome()) return '';
    if (item[0] === 'place' && !PLACE_TYPES[selectValue('place')]) {
      return oldQuestion(item) + `<p class="small" style="color:#eac997">${esc(selectValue('place') ? 'Tu lugar de entrenamiento antiguo necesita actualizarse.' : 'Selecciona una opción para que tu rutina se adapte al lugar.')}</p>`;
    }
    return oldQuestion(item);
  };
  const oldAnswer = onAnswer;
  onAnswer = function(el,isMulti) {
    oldAnswer(el,isMulti);
    if (!isMulti && el?.dataset?.single === 'place') render();
  };

  const yt = id => `https://www.youtube.com/watch?v=${id}`;
  // Los enlaces directos provienen de los PDF facilitados; otros ofrecen una búsqueda guiada.
  const CATALOG = [
    // Cada ejercicio dispone de una descripción original; nivel 0 principiante, 1 medio, 2 alto.
    {id:'chair-squat',name:'Sentarse y levantarse de una silla',cat:'pierna',where:['home'],lv:0,gear:[],tags:['knee'],cue:'Pies firmes, espalda cómoda y movimiento controlado. Usa apoyo si lo necesitas.'},
    {id:'mini-squat',name:'Sentadilla parcial sin peso',cat:'pierna',where:['outdoor'],lv:0,gear:[],tags:['knee'],cue:'Baja poco y mantén los pies firmes, solo dentro de un rango cómodo.'},
    {id:'wall-push',name:'Flexiones contra la pared',cat:'empuje',where:['home','outdoor'],lv:0,gear:[],tags:['wrist'],cue:'Manos a la altura del pecho, codos cómodos; no arquees la espalda.',video:yt('NtXjKgzVcus')},
    {id:'wall-slide',name:'Deslizamientos de brazos en pared',cat:'empuje',where:['home','outdoor'],lv:0,gear:[],tags:[],cue:'Eleva los brazos en un recorrido sin dolor y mantén el cuello relajado.'},
    {id:'heel-raise',name:'Elevaciones de talones con apoyo',cat:'pierna',where:['home','outdoor'],lv:0,gear:[],tags:[],cue:'Sube y baja lentamente con apoyo estable, sin perder el equilibrio.'},
    {id:'hip-abduction',name:'Elevación lateral de pierna de pie',cat:'pierna',where:['home','outdoor'],lv:0,gear:[],tags:[],cue:'Mantén el tronco estable y agárrate a una silla o barandilla.'},
    {id:'seated-row-band',name:'Remo con banda elástica',cat:'tiron',where:['home'],lv:0,gear:['Bandas elásticas'],tags:['wrist'],cue:'Recoge codos hacia atrás sin encoger hombros ni tirar con el cuello.'},
    {id:'row-bottle',name:'Remo con mancuerna y apoyo',cat:'tiron',where:['home'],lv:0,gear:['Mancuernas'],tags:['back','wrist'],cue:'Apoya una mano en superficie estable; mantén tronco cómodo y mueve el codo.'},
    {id:'row-kettle',name:'Remo con kettlebell y apoyo',cat:'tiron',where:['home'],lv:1,gear:['Kettlebell/pesas'],tags:['back','wrist'],cue:'Controla el peso y evita girar el tronco.'},
    {id:'shoulder-blade',name:'Retracción escapular de pie',cat:'tiron',where:['home','outdoor'],lv:0,gear:[],tags:[],cue:'Junta suavemente los omóplatos sin subir los hombros.'},
    {id:'glute-bridge',name:'Puente de glúteos',cat:'pierna',where:['home'],lv:0,gear:[],tags:['floor','back','reflux'],cue:'Sube la pelvis sin hiperextender la espalda; interrumpe si empeora el reflujo.'},
    {id:'bird-dog',name:'Extensión alterna en cuadrupedia (bird dog)',cat:'core',where:['home'],lv:0,gear:[],tags:['floor','wrist','knee'],cue:'Extiende brazo y pierna contrarios, sin girar la pelvis y respirando con normalidad.'},
    {id:'standing-core',name:'Estabilidad de tronco de pie',cat:'core',where:['home','outdoor','gym'],lv:0,gear:[],tags:[],cue:'Activa suavemente el abdomen sin bloquear la respiración y con postura cómoda.'},
    {id:'band-press',name:'Press de pecho con banda elástica',cat:'empuje',where:['home'],lv:1,gear:['Bandas elásticas'],tags:['wrist'],cue:'Empuja con codos controlados y banda fijada de forma segura.'},
    {id:'db-press',name:'Press de hombros con mancuernas',cat:'empuje',where:['home'],lv:1,gear:['Mancuernas'],tags:['wrist','back'],cue:'Usa poco peso; no fuerces el recorrido ni arquees la espalda.'},
    {id:'sumo',name:'Sentadilla sumo con peso ligero',cat:'pierna',where:['home','gym'],lv:1,gear:['Mancuernas'],tags:['knee','back'],cue:'Apoya toda la planta y baja solo hasta donde controles.',video:yt('QWRlcesV2MU')},
    // Gimnasio: se asume equipamiento general, no máquinas concretas disponibles.
    {id:'leg-press',name:'Prensa de piernas',cat:'pierna',where:['gym'],lv:0,gear:[],tags:['knee'],cue:'Ajusta el asiento; recorrido cómodo sin despegar la pelvis.',video:yt('WvLsUYH8v5g')},
    {id:'lat-pulldown',name:'Jalón al pecho en polea',cat:'tiron',where:['gym'],lv:0,gear:[],tags:['wrist'],cue:'Lleva la barra delante del pecho y evita echar el tronco atrás.'},
    {id:'machine-row',name:'Remo sentado en máquina',cat:'tiron',where:['gym'],lv:0,gear:[],tags:['wrist'],cue:'Mantén torso estable, lleva codos atrás sin encoger hombros.'},
    {id:'chest-press',name:'Press de pecho en máquina',cat:'empuje',where:['gym'],lv:0,gear:[],tags:['wrist'],cue:'Ajusta la máquina al hombro y usa una carga que puedas controlar.'},
    {id:'seated-hamstring',name:'Curl femoral sentado en máquina',cat:'pierna',where:['gym'],lv:0,gear:[],tags:['knee'],cue:'Ajusta rodilleras y trabaja sin movimientos bruscos.'},
    {id:'leg-extension',name:'Extensión de rodilla en máquina',cat:'pierna',where:['gym'],lv:1,gear:[],tags:['knee'],cue:'Recorrido cómodo, sin bloquear violentamente la rodilla.'},
    {id:'cable-core',name:'Press antirotación en polea (Pallof)',cat:'core',where:['gym'],lv:1,gear:[],tags:[],cue:'Resiste la rotación con carga ligera, sin aguantar el aire.'},
    {id:'gym-db-row',name:'Remo con mancuerna apoyada en banco',cat:'tiron',where:['gym'],lv:1,gear:[],tags:['back','wrist'],cue:'Evita girar el tronco; lleva la mancuerna junto al cuerpo.',video:yt('n2Iex2110cM')},
    {id:'hip-thrust',name:'Elevación de cadera con apoyo (hip thrust)',cat:'pierna',where:['gym'],lv:1,gear:[],tags:['back','reflux'],cue:'Alinea pelvis y tronco sin hiperextender la zona lumbar.',video:yt('fECm0V7ePFk')},
    {id:'romanian-dl',name:'Peso muerto rumano ligero',cat:'pierna',where:['gym'],lv:2,gear:[],tags:['back'],cue:'Bisagra de cadera y peso cerca de las piernas. Requiere técnica y progresión.'},
    {id:'bench-press',name:'Press de banca con mancuernas',cat:'empuje',where:['gym'],lv:1,gear:[],tags:['wrist'],cue:'Controla el recorrido y usa ayuda si la carga lo requiere.',video:yt('E6GsU62Dibs')},
    // Aire libre: sin equipamiento ni alta intensidad obligatorios.
    {id:'walk',name:'Caminar a ritmo conversacional',cat:'cardio',where:['outdoor'],lv:0,gear:[],tags:[],cue:'Camina con una intensidad que te permita hablar en frases completas.'},
    {id:'fast-walk',name:'Alternar marcha normal y algo más rápida',cat:'cardio',where:['outdoor'],lv:1,gear:[],tags:[],cue:'Alterna tramos de marcha; mantén respiración controlada y reduce ritmo si te ahogas.'},
    {id:'balance',name:'Equilibrio con apoyo estable',cat:'movilidad',where:['outdoor','home'],lv:0,gear:[],tags:[],cue:'Permanece cerca de pared, banco o barandilla firme.'},
    {id:'side-step',name:'Pasos laterales sin saltos',cat:'cardio',where:['home','outdoor'],lv:0,gear:[],tags:[],cue:'Muévete sin impacto y con pasos cortos, respetando las molestias.'},
    {id:'march',name:'Marcha suave en el sitio',cat:'cardio',where:['home'],lv:0,gear:[],tags:[],cue:'Marcha a ritmo cómodo, sin impacto y con pausas.'},
    {id:'static-bike',name:'Bicicleta estática',cat:'cardio',where:['home','gym'],lv:0,gear:['Bicicleta estática'],tags:['knee'],cue:'Regula sillín y resistencia; trabaja a intensidad conversacional.'},
    {id:'treadmill',name:'Cinta de caminar',cat:'cardio',where:['gym'],lv:0,gear:[],tags:[],cue:'Empieza lento; utiliza parada de seguridad si existe.'},
    {id:'gym-bike',name:'Bicicleta de gimnasio',cat:'cardio',where:['gym'],lv:0,gear:[],tags:['knee'],cue:'Resistencia suave y cadencia cómoda.'}
  ];
  const VIDEO_GENERAL = {
    low:'https://www.youtube.com/watch?v=_riM2ix__hA',
    cardio:'https://www.youtube.com/watch?v=16J7xOm2heA',
    strength:'https://www.youtube.com/watch?v=WxEdJAGjE3Y',
    warm:'https://www.youtube.com/watch?v=dg6MBDRcGAo',
    body:'https://www.youtube.com/playlist?list=PLgr2x-3jFEK154Rq_10kj3lHl9AyEQJlb'
  };
  function videoFor(x){
    if (x.video) return {url:x.video,label:'Ver vídeo de técnica'};
    // Es una búsqueda deliberada: no se presenta como vídeo previamente verificado.
    return {url:'https://www.youtube.com/results?search_query='+encodeURIComponent(x.name+' ejecución correcta ejercicio español'),label:'Buscar vídeo de técnica'};
  }
  function safeHref(url){return /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//.test(url)?url:'#';}
  function profileLevel(){return ['Intermedia','Avanzada'].includes(selectValue('experience'))?(selectValue('experience')==='Avanzada'?2:1):0;}
  function gearAvailable(item,where){
    if(where==='gym')return true;
    // Si la opción habitual no incluye casa, no asumir material doméstico al cambiar un solo día.
    if(where==='home'&&!hasHome())return !item.gear.length;
    if(!item.gear.length)return true;
    const owned=many('equipment');
    return item.gear.some(g=>owned.includes(g)) || (item.id==='sumo'&&owned.includes('Kettlebell/pesas'));
  }
  function forbidden(item){
    const avoid=many('avoid'),pain=many('pain'),conditions=many('conditions');
    if(item.tags.includes('floor')&&(avoid.includes('Ejercicios tumbada')||avoid.includes('Arrodillarme')))return true;
    if(item.tags.includes('wrist')&&pain.includes('Hombro/muñeca'))return true;
    if(item.tags.includes('knee')&&pain.includes('Rodilla'))return true;
    if(item.tags.includes('back')&&pain.includes('Espalda/cuello'))return true;
    if(item.tags.includes('reflux')&&(conditions.includes('Hernia de hiato/reflujo')||many('digestive').includes('Reflujo/hernia de hiato')))return true;
    return false;
  }
  function locationFor(date){
    const chosen = d.trainingLocationOverride[date];
    if (['gym','home','outdoor'].includes(chosen))return chosen;
    const types=selectedPlaces();
    if(types.length===1)return types[0];
    const week=Math.max(0,Math.floor(dayDiff(date,d.start)/7));
    const ix=weekSessions(date).indexOf(date);
    // Rota los entornos entre sesiones y semanas, también con solo 2 entrenos semanales.
    return types[((ix<0?0:ix)+week)%types.length];
  }
  function chooseDayLocation(date,where){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    if(where==='auto')delete d.trainingLocationOverride[date];
    else if(['home','gym','outdoor'].includes(where))d.trainingLocationOverride[date]=where;
    else return;
    save();render();
  }
  function exerciseList(where,level){
    return CATALOG.filter(x=>x.where.includes(where)&&x.lv<=level&&gearAvailable(x,where)&&!forbidden(x));
  }
  function pick(exercises,cat,index){let a=exercises.filter(x=>x.cat===cat);return a.length?a[((index%a.length)+a.length)%a.length]:null;}
  function uniqueExercises(list){const ids=new Set();return list.filter(x=>x&&!ids.has(x.id)&&ids.add(x.id));}
  function plannedItems(date,where,count,focus,level){
    const week=Math.max(1,Math.floor(dayDiff(date,d.start)/7)+1),idx=weekSessions(date).indexOf(date),rotation=(Math.max(0,idx)+week-1);
    const choices=exerciseList(where,level);
    const strength=['pierna','tiron','empuje','pierna','core','tiron','empuje'];
    const result=[];
    const endurance=focus==='resistencia'||(focus==='mixto'&&rotation%2===1);
    if (where==='outdoor') {
      result.push(pick(choices,'cardio',level>0?rotation:0));
      if(count>2)result.push(pick(choices,'pierna',rotation));
      if(count>3)result.push(pick(choices,'movilidad',rotation));
      if(count>4)result.push(pick(choices,'core',rotation));
    } else if(focus==='movilidad'||focus==='bienestar') {
      result.push(pick(choices,'cardio',rotation));
      result.push(pick(choices,'core',rotation));
      result.push(pick(choices,'pierna',rotation));
      result.push(pick(choices,'tiron',rotation));
    } else {
      if(endurance)result.push(pick(choices,'cardio',rotation));
      for(const cat of strength)result.push(pick(choices,cat,rotation+(result.length%2)));
      if (!endurance && count>=5)result.push(pick(choices,'cardio',rotation));
    }
    let chosen=uniqueExercises(result);
    for(const cat of ['pierna','tiron','empuje','core','cardio','movilidad']) {
      if(chosen.length>=count)break;
      for(const x of choices.filter(x=>x.cat===cat))if(!chosen.some(y=>y.id===x.id)){chosen.push(x);if(chosen.length>=count)break;}
    }
    return chosen.slice(0,count);
  }
  function routineDetails(date,where){
    const beginner=profileLevel()===0,week=Math.max(1,Math.floor(dayDiff(date,d.start)/7)+1),limit=timeBudget();
    const lowActivity=selectValue('activity')==='Muy baja';
    const n=Math.max(2,Math.min(limit<=15?2:limit<=30?3:limit<=45?4:6,6));
    const sets=beginner?(week<=2||lowActivity&&week<=3?1:week<=5?2:3):(week<=2?2:3);
    const maxSets=limit<=15?1:limit<=30?2:3;
    const realSets=Math.min(sets,maxSets);
    const focus=planFocus(),lvl=profileLevel();
    const items=plannedItems(date,where,n,focus,lvl);
    const cardioMinutes=Math.min(Math.max(6,limit-(where==='outdoor'?5:12)),beginner?12+Math.min(week-1,5)*2:25);
    const format=x=>{
      const cardio=x.cat==='cardio';
      const movement=x.cat==='movilidad';
      return {id:x.id,name:x.name,category:x.cat,
        prescription:cardio?`${cardioMinutes} min a ritmo cómodo${x.id==='fast-walk'?' · alterna 1 min más rápido / 2 min suave':''}`:
          movement?'2 × 20–30 segundos con apoyo':`${realSets} serie${realSets===1?'':'s'} × ${beginner?'8–10':'8–12'} repeticiones · descansar 60–90 s`,
        cue:x.cue,video:videoFor(x)};
    };
    return {items:items.map(format),minutes:limit,level:lvl,week,focus};
  }
  const originalPlan=trainingPlan;
  trainingPlan=function(date){
    const p=originalPlan(date),where=locationFor(date);
    p.trainingLocation=where;
    p.trainingItems=[];
    if(['precaucion','descanso','suave'].includes(p.kind))return p; // Nunca anular advertencias de salud, bajas o turnos.
    if(p.kind==='activo'){
      if(where==='outdoor'){
        p.title='Paseo y recuperación al aire libre';
        p.exercises=['Caminar a ritmo conversacional 10–25 minutos, de forma opcional','Movilidad suave y respiración natural 3–5 minutos'];
      } else if(where==='gym') {
        p.title='Recuperación activa en gimnasio';
        p.exercises=['Bicicleta o cinta a intensidad suave 10–20 minutos, si apetece','Movilidad cómoda sin forzar 3–5 minutos'];
      } else {
        p.title='Recuperación activa en casa';
        p.exercises=['Marchar sin saltos o movilidad 10–20 minutos, si apetece','Estiramientos suaves sin dolor y descanso'];
      }
      return p;
    }
    if(p.kind!=='fuerza')return p;
    const details=routineDetails(date,where);
    if(!details.items.length){
      p.title='Sin ejercicios compatibles suficientes';
      p.detail='Revisa materiales, preferencias y restricciones en Actualizar plan. No se propondrán ejercicios que entren en conflicto con las limitaciones indicadas.';
      p.kind='precaucion';p.exercises=[];p.notes=['Puedes elegir una sesión suave o consultar con un profesional para adaptar movimientos.'];
      return p;
    }
    const loc={home:'en casa',gym:'en gimnasio',outdoor:'al aire libre'}[where];
    const focus=details.focus;
    p.trainingItems=details.items;
    p.title=`${where==='outdoor'?'Paseo y movimiento':focus==='resistencia'?'Resistencia y fuerza':'Fuerza y salud'} ${loc} · Semana ${details.week}`;
    p.minutes=`Hasta ${details.minutes} min`;
    p.detail=`Rutina ${details.level===0?'de iniciación':details.level===1?'intermedia':'avanzada'} adaptada a ${loc}, objetivos, material disponible y tiempo. La progresión depende de tu experiencia y recuperación, no solo del calendario.`;
    p.exercises=[`Calentamiento: ${where==='outdoor'?'caminar suave':'marcha cómoda y movilidad'} 4–6 min`,
      ...details.items.map(x=>`${x.prescription} · ${x.name}`),'Vuelta a la calma: caminar lento o movilidad cómoda 3–5 min'];
    p.notes=[...p.notes];
    if(where==='home'&&(!hasHome()||!many('equipment').length||many('equipment').includes('Ninguno')))p.notes.push('Sin material doméstico confirmado: se utilizan alternativas con el peso corporal.');
    if(!PLACE_TYPES[selectValue('place')])p.notes.push('Actualiza el lugar de entrenamiento en el cuestionario para configurar la nueva planificación.');
    if(where==='outdoor')p.notes.push('Escoge una zona segura, evita condiciones meteorológicas extremas y reduce la intensidad si es necesario. Para ejercicios con apoyo, utiliza solo superficies firmes disponibles.');
    if(d.trainingLocationOverride[date])p.notes.push('Cambio puntual de ubicación: la preferencia habitual no se modifica.');
    if(details.level===2)p.notes.push('Nivel avanzado: evita trabajar al fallo y prioriza técnica y recuperación.');
    return p;
  };

  // Mismo registro de XP que la app original, con una instantánea adicional de la sesión realmente realizada.
  toggleTraining=function(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const was=!!d.trainingDone[date];
    if(was){delete d.trainingDone[date];d.xp=Math.max(0,d.xp-20);delete d.trainingHistory[date];}
    else {const p=trainingPlan(date);if(p.kind!=='fuerza')return;
      d.trainingDone[date]=true;d.xp+=20;
      d.trainingHistory[date]={date,location:p.trainingLocation,title:p.title,items:p.trainingItems.map(x=>x.id)};
    }
    save();render();
  };
  window.RETrainingV34={chooseDayLocation};

  const oldTraining=training;
  training=function(){
    const date=trainingDate,p=trainingPlan(date),isDone=!!d.trainingDone[date],today=todayKey(),next=Array.from({length:7},(_,i)=>nextDate(today,i));
    const chosenOverride=d.trainingLocationOverride[date]||'auto',options=['auto','home','gym','outdoor'];
    const locationChoice=`<section class="card"><h2>📍 Dónde entrenar hoy</h2>
      <p>Elige una alternativa solo para el ${esc(niceDate(date))}. Cambiar de sitio no reinicia tu personaje, tu calendario ni tu progreso.</p>
      <label for="training_place_day">Lugar de esta sesión</label><select id="training_place_day" onchange="RETrainingV34.chooseDayLocation('${esc(date)}',this.value)">
      ${options.map(k=>`<option value="${k}" ${k===chosenOverride?'selected':''}>${k==='auto'?'Plan habitual (automático)':LABELS[k]}</option>`).join('')}</select>
      <p class="small">Lugar previsto: <strong>${LABELS[p.trainingLocation]}</strong>. Si eliges casa sin material, se usarán ejercicios sin equipamiento.</p></section>`;
    const exhtml=p.trainingItems.length ? `<ol class="training-v34-list">${p.trainingItems.map(x=>`<li><strong>${esc(x.name)}</strong><p class="small">${esc(x.prescription)}. ${esc(x.cue)}</p>
      <a class="secondary training-v34-video" href="${safeHref(x.video.url)}" rel="noopener noreferrer" target="_blank">▶ ${esc(x.video.label)}</a></li>`).join('')}</ol>`
      : p.exercises.length?`<ol>${p.exercises.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'';
    const info=p.kind==='fuerza'?`<button type="button" class="${isDone?'secondary':'primary'}" onclick="toggleTraining('${esc(date)}')">${isDone?'✓ Sesión completada · desmarcar':'Marcar entrenamiento completado · +20 XP'}</button>`:'';
    const days=Array.from({length:7},(_,i)=>nextDate(monday(date),i));
    return `<section class="card"><h2>Tu entrenamiento personalizado</h2><p>Plan basado en tu nivel, objetivos, días disponibles, material y turnos.</p>
      <div class="timeline">${next.map(k=>`<button class="${k===date?'current':''}" onclick="trainingDate='${k}';render()">${niceDate(k,{weekday:'short'})}<br>${k.slice(-2)}<br>${shiftOf(k)||'·'}</button>`).join('')}</div>
      <label for="trainingDate">Ver otro día</label><input id="trainingDate" type="date" value="${esc(date)}" onchange="trainingDate=this.value;render()"></section>
      ${locationChoice}
      <section class="card"><h2>${esc(p.title)}</h2><p>${esc(p.detail)}</p><span class="pill">${esc(p.minutes)}</span><span class="pill">${esc(shiftLabel(date))}</span>
      ${exhtml}${p.notes.map(n=>`<p class="warning">${esc(n)}</p>`).join('')}${info}
      ${p.kind==='fuerza'?`<p class="small">Calienta 4–6 min antes y termina con 3–5 min suaves. Respira durante las repeticiones; detén el ejercicio ante dolor nuevo, mareo o falta de aire anormal.</p>`:''}
      <p class="small"><a href="${p.trainingLocation==='gym'?VIDEO_GENERAL.strength:VIDEO_GENERAL.low}" target="_blank" rel="noopener noreferrer">${p.trainingLocation==='gym'?'Vídeo general de fuerza':'Ejemplo de cardio sin saltos'}</a> · Los vídeos requieren Internet.</p>
      </section><section class="card"><h2>Tu semana</h2>${days.map(k=>{const x=trainingPlan(k);return `<div class="plan-day"><button class="secondary" onclick="trainingDate='${k}';render()">${esc(niceDate(k,{weekday:'short',day:'numeric'}))} · ${esc(x.title)}</button><span class="pill">${esc(x.trainingLocation?LABELS[x.trainingLocation]:'Descanso')}</span></div>`}).join('')}
      <button class="secondary" onclick="go('Actualizar plan')">Cambiar mis preferencias</button><button class="secondary" onclick="go('Calendario')">Cambiar turnos</button></section>
      <section class="card"><h2>Progresión y seguridad</h2><p>En las primeras semanas comienza con pocas series y un esfuerzo cómodo. No es necesario pasar al siguiente nivel por completar dos semanas. Descansa entre sesiones de fuerza y no añadas HIIT intenso automáticamente.</p>
      <p class="small">Los enlaces a vídeos individuales pueden abrir una demostración específica o una búsqueda para encontrarla. Son referencias educativas y no sustituyen una supervisión individual.</p></section>`;
  };
  const oldNutrition=nutrition;
  nutrition=function(){
    const base=oldNutrition();
    const extra=`<section class="card"><details><summary><strong>🍽️ Cómo construir comidas equilibradas</strong></summary>
    <p>Una orientación flexible: combina verduras u hortalizas, una fuente de proteínas y una fuente de carbohidratos según apetito, actividad, tolerancia y necesidades. Añade grasas de calidad y agua.</p>
    <p>Planifica la compra con el menú de la semana, revisa etiquetas cuando tengas alergias y prepara algunas bases para ahorrar tiempo. Las raciones deben individualizarse: no copiamos las calorías de un menú diseñado para otra persona.</p>
    <p>Come con atención y sin prisas cuando sea posible. Si tienes reflujo, evita cambios que empeoren tus síntomas y considera dejar tiempo entre comidas copiosas y ejercicio.</p>
    <p class="small">Contenido original de educación alimentaria inspirado en temas generales de los materiales entregados; no es una dieta clínica ni reproduce recetas propietarias.</p></details></section>`;
    return base+extra;
  };
  const oldProgress=progress;
  progress=function(){
    const base=oldProgress();
    const week=monday(todayKey()),data=d.trainingReviews[week]||{};
    const ratings=[['energia','Energía'],['sueno','Calidad del sueño'],['animo','Estado de ánimo'],['digestiones','Digestiones']];
    const ratingsUI=ratings.map(([id,label])=>`<label for="v34_${id}">${label}</label><select id="v34_${id}"><option value="">Sin registrar</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${+data[id]===n?'selected':''}>${n} de 5</option>`).join('')}</select>`).join('');
    const fragment=`<section class="card"><h2>📝 Revisión semanal</h2><p>Inspirada en los diarios de progreso: valora sensaciones y constancia, no solo el peso. Semana del ${esc(week)}.</p>
       ${ratingsUI}<label for="v34_notes">Notas de la semana</label><textarea id="v34_notes" maxlength="1000" rows="3" placeholder="¿Cómo te han sentado los entrenamientos? ¿Qué quieres ajustar?">${esc(data.notes||'')}</textarea>
       <button class="primary" type="button" onclick="RETrainingV34.saveReview()">Guardar revisión</button>
       <p class="small">Se guarda con tus datos y se sincroniza si tienes una cuenta vinculada.</p></section>`;
    return base+fragment;
  };
  window.RETrainingV34.saveReview=function(){
    const week=monday(todayKey()),out={};
    for(const k of ['energia','sueno','animo','digestiones']){
      const v=document.getElementById('v34_'+k)?.value;if(v)out[k]=Math.min(5,Math.max(1,Number(v)));
    }
    out.notes=(document.getElementById('v34_notes')?.value||'').slice(0,1000);
    out.updated=todayKey();d.trainingReviews[week]=out;save();stamp('Revisión semanal guardada');render();
  };
  const style=document.createElement('style');style.textContent=`
    .training-v34-list{padding-left:21px}.training-v34-list li{border-bottom:1px solid #4a3a5b;padding:9px 0 14px;margin-bottom:9px}
    .training-v34-list li strong{color:#f7e4ff}.training-v34-list .small{margin:7px 0 12px}
    .training-v34-video{display:inline-flex;align-items:center;white-space:normal;text-decoration:none;font-weight:600;font-size:13px}
    .training-v34-video:focus-visible{outline:3px solid #eec993;outline-offset:3px}
    @media(max-width:500px){.training-v34-list{padding-left:16px}}
  `;document.head.appendChild(style);
  render();
})();
