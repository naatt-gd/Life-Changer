'use strict';
const KEY='reformandome_rpg_v3';
const todayKey=()=>{const x=new Date();return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const blank={start:todayKey(),answers:{},done:{},xp:0,coins:0,meals:[],water:0,habits:['Beber agua','Moverme un poco','Comer con atención','Preparar el descanso'],checkins:[],shift:{start:todayKey(),sequence:'TTLL',pattern:'Manual/personalizado',autoPattern:false},shiftDays:{},waterLog:{},foodLog:[],weightLog:[],trainingDone:{},habitDone:{},customMeals:[],shoppingExtra:[],moodLog:{},shoppingDone:{},setup:{completed:false,completedAt:null}};
const characterBlank={name:'Mi heroína',gender:'mujer',hairColor:null,choiceDone:false,owned:['armor_basic'],equipped:{armor:'armor_basic',wings:''}};
function plain(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
let incoming={};try{incoming=JSON.parse(localStorage.getItem(KEY)||'{}');if(!plain(incoming))incoming={}}catch(e){incoming={}}
let d={...blank,...incoming};
d.answers=plain(incoming.answers)?incoming.answers:{};
d.done=plain(incoming.done)?incoming.done:{};
d.shift={...blank.shift,...(plain(incoming.shift)?incoming.shift:{})};
d.character={...characterBlank,...(plain(incoming.character)?incoming.character:{})};
d.character.equipped={...characterBlank.equipped,...(plain(d.character.equipped)?d.character.equipped:{})};
d.character.owned=[...new Set(['armor_basic',...(Array.isArray(d.character.owned)?d.character.owned:[])])];
for(const k of ['shiftDays','waterLog','trainingDone','habitDone','moodLog','nutritionSwaps','shoppingDone'])d[k]=plain(incoming[k])?incoming[k]:{};
for(const k of ['foodLog','weightLog','meals','checkins','habits','customMeals','shoppingExtra'])d[k]=Array.isArray(incoming[k])?incoming[k]:blank[k].slice();
d.setup={...blank.setup,...(plain(incoming.setup)?incoming.setup:{})};
d.xp=Math.max(0,Number(d.xp)||0);
if(!Number.isInteger(d.menuSeed)||d.menuSeed<1){d.menuSeed=Math.floor(Math.random()*10000000)+1;try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){/* Se intentará guardar al usar la aplicación. */}} // Campo 'coins' antiguo conservado en copias para compatibilidad, sin uso en la interfaz.
const OLD_HABITS=['Beber agua','Moverme un poco','Comer con atención','Preparar el descanso'];
const DEFAULT_MISSIONS=['Beber agua regularmente','Hacer movimiento adaptado','Preparar una comida equilibrada','Dedicar 5 minutos a ordenar/preparar algo','Reservar un momento de descanso'];
// IDs estables: cambiar el nombre o borrar un hábito no desplaza los registros de los demás.
if(Array.isArray(incoming.habitCatalog)){
 d.habitCatalog=incoming.habitCatalog.filter(x=>plain(x)&&typeof x.id==='string'&&typeof x.label==='string').slice(0,30).map(x=>({id:x.id.slice(0,80),label:x.label.slice(0,90),legacyIndex:Number.isInteger(x.legacyIndex)?x.legacyIndex:-1}));
}else{
 const old=d.habits.length===OLD_HABITS.length&&d.habits.every((x,i)=>x===OLD_HABITS[i]);
 const names=old?DEFAULT_MISSIONS:d.habits;
 d.habitCatalog=names.map((label,i)=>({id:'habito-inicial-'+i,label:String(label).slice(0,90),legacyIndex:i}));
}
if(!d.habitCatalog.length&&!Array.isArray(incoming.habitCatalog))d.habitCatalog=DEFAULT_MISSIONS.map((label,i)=>({id:'habito-inicial-'+i,label,legacyIndex:i}));

if(!/^\d{4}-\d{2}-\d{2}$/.test(d.start||''))d.start=todayKey();
let moodMonth=todayKey().slice(0,7);
let page='Inicio',step=0,calendarMonth=todayKey().slice(0,7),calendarBrush='T',calendarEditDate=null,nutritionDate=todayKey(),nutritionFollowToday=true,shoppingWeek=mondayOf(todayKey()),shoppingFollowThisWeek=true,daySeen=todayKey(),trainingDate=todayKey(),importPreview=null,flashMessage='';
const tabs=['Inicio','Mi perfil','Calendario','Entreno','Nutrición','Misiones','Actualizar plan','Progreso','Ajustes'];
const TAB_ICONS={'Inicio':'⌂','Mi perfil':'♛','Calendario':'▦','Entreno':'◇','Nutrición':'♧','Misiones':'✦','Actualizar plan':'⚙','Progreso':'↗','Ajustes':'⚑'};
const qs=[
['1. Objetivos y motivación','Queremos saber qué significa para ti mejorar.',[
['goals','¿Qué objetivos quieres trabajar?',['Perder grasa/peso','Ganar fuerza','Mejorar resistencia','Tener más energía','Movilidad y postura','Reducir estrés','Crear hábitos','Mejorar autoestima']],
['priority','¿Cuál es tu prioridad principal?',['Pérdida de grasa','Fuerza','Salud y energía','Constancia','Bienestar emocional']],
['why','¿Qué cambio te gustaría notar al acabar?','text','Ej.: sentirme más ágil, descansar mejor…'],
['motivation','¿Qué te motiva más?',['Ver estadísticas','Retos y recompensas','Rutinas claras','Variedad','Seguimiento semanal']],
['barriers','¿Qué te lo pone difícil?',['Cansancio','Falta de tiempo','Motivación','Molestias físicas','Estrés','No saber qué hacer','Comidas improvisadas','Otros']]
]],
['2. Tu punto de partida','Así ajustamos el nivel inicial.',[
['activity','Actividad diaria habitual',['Muy baja','Baja','Moderada','Alta']],
['experience','Experiencia entrenando',['Ninguna','Principiante','Intermedia','Avanzada']],
['days','Días de entrenamiento deseados',['2 días','3 días','4 días','5 días','Adaptado a turnos']],
['minutes','Tiempo disponible por sesión',['10–15 min','20–30 min','30–45 min','45–60 min','Variable']],
['confidence','¿Cómo te sientes al empezar?',['Me da respeto','Con ganas pero me cuesta','Confiada, necesito estructura','Tengo experiencia']]
]],
['3. Salud y seguridad','Responde con sinceridad. No sustituye una valoración profesional.',[
['conditions','¿Qué circunstancias debemos tener en cuenta?',['Ninguna','Hernia de hiato/reflujo','Escoliosis','Asma/problema respiratorio','Hipertensión/cardiopatía','Problemas articulares','Lesión reciente','Otra']],
['pain','¿Tienes molestias actualmente?',['No','Rodilla','Espalda/cuello','Cadera/tobillo','Hombro/muñeca','Varias zonas','Dolor intenso o limitante']],
['paindetail','Describe zona, intensidad 0–10 y cuándo aparece','text','Ej.: rodilla 2/10 al bajar escaleras…'],
['restrictions','¿Tienes restricciones profesionales o ejercicios contraindicados?','text','Indica cuáles o “ninguna conocida”.'],
['clearance','¿Te han indicado que puedes hacer ejercicio?',['Sí, sin restricciones','Sí, con restricciones','No lo he consultado','Necesito consultarlo']],
['avoid','¿Qué prefieres evitar?',['Saltos/impacto','Correr','Arrodillarme','Flexiones de tronco','Ejercicios tumbada','Ninguno']]
]],
['4. Trabajo y horarios','El plan debe adaptarse a tus días reales.',[
['work','Tipo de jornada',['Turnos de 12 horas','Turnos de 8 horas','Jornada partida','Horario fijo de mañana','Rotatorio/variable','Otro']],
['pattern','Patrón de turnos',['2 trabajados / 2 libres','3 trabajados / 3 libres','Días alternos','Introducir fechas manualmente','Personalizado']],
['energy','¿Cómo acabas un turno?',['Agotada, necesito recuperar','Cansada, puedo hacer algo suave','Con energía','Depende del turno']],
['besttime','¿Cuándo prefieres entrenar?',['Al levantarme','Antes del turno','Después del turno','Día libre por la mañana','Día libre por la tarde','Variable']],
['sleep','Horas de sueño habituales',['Menos de 5','5–6','6–7','7–8','Más de 8','Variable']]
]],
['5. Lugar y material','No necesitas comprar nada para empezar.',[
['place','¿Dónde entrenarás?',['En casa','Gimnasio','Al aire libre','Combinación']],
['equipment','¿Qué material tienes?',['Ninguno','Esterilla','Bandas elásticas','Mancuernas','Kettlebell/pesas','Bicicleta estática','Otro']],
['space','Espacio disponible',['Pequeño, tamaño esterilla','Espacio para moverse','Zona dedicada']],
['likes','¿Qué actividad te atrae?',['Fuerza sencilla','Movilidad/Pilates suave','Baile bajo impacto','Caminar','Circuitos cortos','Me da igual']],
['dislikes','¿Qué ejercicios no te gustan?','text','Ej.: burpees, saltos, correr…']
]],
['6. Alimentación','Personalizamos preferencias, horarios y presupuesto sin dietas rígidas.',[
['meals','Comidas al día que te encajan',['3','4','5','Depende del turno']],
['diet','Tipo de alimentación',['Omnívora','Vegetariana','Vegana','Otra']],
['intolerances','Alergias, intolerancias o alimentos que sientan mal','text','Indica cuáles; distingue alergias diagnosticadas.'],
['likesfood','Alimentos que te gustan','text','Escribe tus favoritos.'],
['dislikesfood','Alimentos que no quieres incluir','text','Escribe los que no te gustan.'],
['budget','Presupuesto para comida',['Ajustado','Medio','Flexible']],
['cook','Tiempo para cocinar',['Menos de 15 min','15–30 min','30–45 min','Cocinar por tandas']],
['digestive','¿Hay aspectos digestivos a respetar?',['Ninguno','Reflujo/hernia de hiato','Hinchazón','Digestiones pesadas','Otros']],
['triggers','¿Qué alimentos o situaciones empeoran síntomas?','text','Ej.: cenas copiosas, picante, café…']
]],
['7. Descanso y vida diaria','También cuentan la recuperación y el bienestar.',[
['waterhabit','Agua aproximada al día',['Menos de 1 L','1–1,5 L','1,5–2 L','Más de 2 L','No lo sé']],
['stress','Estrés habitual',['Bajo','Moderado','Alto','Muy alto/variable']],
['lifeareas','¿Qué áreas quieres mejorar?',['Sueño','Orden de casa','Lectura/estudio','Autocuidado','Aire libre','Finanzas','Ocio','Vida social']],
['morning','¿Qué te gustaría en tu rutina de mañana?','text','Ej.: desayunar tranquila, aseo…'],
['evening','¿Qué te gustaría en tu rutina de noche?','text','Ej.: preparar mañana, leer…']
]],
['8. Seguimiento y estilo','La mejor planificación es la que puedes sostener.',[
['review','Frecuencia de revisión',['Diaria y breve','Semanal','Cada dos semanas']],
['style','Estilo de acompañamiento',['Cercano y motivador','Directo y práctico','Videojuego con niveles/misiones','Mezcla']],
['pace','Ritmo de progresión',['Muy gradual','Moderado','Retos progresivos, sin perder seguridad']],
['rewards','¿Qué recompensas te motivan?',['Logros y niveles','Ocio planificado','Estadísticas y rachas','No necesito recompensas']],
['extra','¿Algo más que deba saber?','text','Cualquier detalle importante…']
]]
];
// Las preguntas originales se conservan, corrigiendo solo el tipo de respuesta y añadiendo medidas importantes.
qs.unshift(['0. Tus datos y objetivos físicos','Estos datos permiten ajustar las propuestas. Puedes dejar en blanco los que no quieras indicar.',[
 ['age','Edad (años)','number','Ej.: 34'],
 ['height','Altura (cm)','number','Ej.: 163'],
 ['weight','Peso actual (kg)','number','Ej.: 90,6'],
 ['targetWeight','Peso objetivo (kg)','number','Ej.: 75'],
 ['goalTimeline','¿Qué ritmo quieres priorizar?',['Sin prisas, salud y constancia','Gradual y sostenible','Mantener peso y mejorar forma física']]
]]);
qs[6][2].splice(4,0,['allergies','Alergias alimentarias confirmadas (si las hay)','text','Ej.: cacahuetes, huevo. Déjalo en blanco si no tienes']);
// En el bloque 6 del cuestionario original se recoge alimentación (índice 6 tras anteponer bloque 0).
const MULTI_KEYS=new Set(['goals','motivation','barriers','conditions','pain','avoid','equipment','likes','lifeareas','rewards','digestive']);
const NONE_CHOICE={conditions:['Ninguna'],pain:['No'],avoid:['Ninguno'],equipment:['Ninguno'],digestive:['Ninguno']};
const LIMITS={age:[16,105],height:[110,235],weight:[30,350],targetWeight:[30,350]};
for(const section of qs)for(const it of section[2]){
 const k=it[0];if(!MULTI_KEYS.has(k)&&Array.isArray(d.answers[k]))d.answers[k]=d.answers[k][0]||'';
 if(MULTI_KEYS.has(k)&&typeof d.answers[k]==='string'&&d.answers[k])d.answers[k]=[d.answers[k]];
}
// Evitar la doble navegación al regenerar la página, y escapar cualquier texto del usuario.
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function selectValue(k,fallback=''){let v=d.answers[k];return typeof v==='string'&&v?v:fallback}
function many(k){return Array.isArray(d.answers[k])?d.answers[k]:[]}
function nval(k){let v=String(d.answers[k]??'').replace(',','.');let n=Number(v);return Number.isFinite(n)&&n>0?n:null}
function localDate(k){if(!/^\d{4}-\d{2}-\d{2}$/.test(k||''))return new Date();let[y,m,day]=k.split('-').map(Number);return new Date(y,m-1,day,12,0,0)}
function nextDate(k,delta){const date=localDate(k);date.setDate(date.getDate()+delta);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function niceDate(k,opts={weekday:'long',day:'numeric',month:'long'}){return new Intl.DateTimeFormat('es-ES',opts).format(localDate(k))}
function dayDiff(a,b){return Math.round((Date.UTC(+a.slice(0,4),+a.slice(5,7)-1,+a.slice(8,10))-Date.UTC(+b.slice(0,4),+b.slice(5,7)-1,+b.slice(8,10)))/86400000)}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function stamp(s){flashMessage=s;setTimeout(()=>{flashMessage=''},4000)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(d));if(window.RECloud?.queue)window.RECloud.queue();return true}catch(e){alert('No se pudo guardar. Comprueba el espacio del navegador y exporta una copia de seguridad.');return false}}
const gear=[
{id:'armor_basic',name:'Básica',slot:'armor',icon:'✦',level:1,desc:'Tu vestimenta inicial, sin alas.'},
{id:'armor_traveler',name:'Viajera',slot:'armor',icon:'🧭',level:3,desc:'Vestimenta de viaje con capas, cinturones y bolsillos.'},
{id:'outfit_ruby',name:'Guerrera',slot:'armor',icon:'⚔️',level:5,desc:'Armadura nocturna y espada larga.'},
{id:'armor_royal',name:'Hechicera',slot:'armor',icon:'🌙',level:7,desc:'Vestido mágico de la Corte Noche.'},
{id:'outfit_moon',name:'Noble',slot:'armor',icon:'👑',level:10,desc:'Vestido de gala violeta y bordados dorados.'},
{id:'wings_light',name:'Alas de luz',slot:'wings',icon:'✨',level:2,desc:'Alas blancas y doradas.'},
{id:'wings_dragon',name:'Alas dracónicas',slot:'wings',icon:'🐉',level:6,desc:'Alas membranosas violetas.'},
{id:'wings_shadow',name:'Alas de sombra',slot:'wings',icon:'🌑',level:9,desc:'Alas negras con destellos púrpura.'}
];
const COLORS=[['negro','Negro'],['castano','Castaño'],['rubio','Rubio'],['pelirrojo','Pelirrojo']];
const OUTFITS={armor_basic:'basica',armor_traveler:'viajera',outfit_ruby:'guerrera',armor_royal:'hechicera',outfit_moon:'noble'};
const WING_TYPES={'':'sin_alas',wings_light:'luz',wings_dragon:'draconicas',wings_shadow:'sombra'};
function level(){return Math.floor((d.xp||0)/100)+1}
function fixedColor(){return COLORS.some(x=>x[0]===d.character.hairColor)?d.character.hairColor:'negro'}
function characterImage(id,wing){
 const outfit=OUTFITS[id]||'basica',type=WING_TYPES[wing]||'sin_alas';
 return './cn_'+fixedColor()+'_'+outfit+'_'+type+'.webp';
}
function characterArt(){
 const eq=d.character.equipped||{};
 return `<div class="character-art cn-character" title="Heroína de pelo ${fixedColor()}"><img src="${characterImage(eq.armor,eq.wings)}" alt="Heroína con atuendo y alas seleccionados" loading="eager"></div>`;
}
function chooseCharacter(color){
 if(d.character.choiceDone||!COLORS.some(x=>x[0]===color))return;
 d.character.gender='mujer';d.character.hairColor=color;d.character.choiceDone=true;
 d.character.owned=['armor_basic'];d.character.equipped={armor:'armor_basic',wings:''};
 save();page='Inicio';render();
}
function characterSelection(){
 return `<section class="card selection-card"><h2>✦ Elige tu heroína</h2><p>Elige el color de cabello de tu heroína. Los atuendos y las alas que desbloquees mantendrán el color que elijas.</p><div class="cn-picker">${COLORS.map(([id,label])=>`<button type="button" class="cn-pick" onclick="chooseCharacter('${id}')"><img src="./cn_${id}_basica_sin_alas.webp" alt="Heroína de pelo ${label.toLowerCase()} con vestimenta Básica"><strong>${label}</strong><span>Elegir esta heroína</span></button>`).join('')}</div><p class="small">Empezarás con Básica y sin alas. Los demás estilos se desbloquean conforme avances.</p></section>`;
}
function characterSmall(){return d.character.choiceDone?`<div class="cn-mini">${characterArt()}</div>`:'<span aria-hidden="true">✦</span>'}
function characterCard(){
 let c=d.character;return `<div class="hero-character"><div class="avatar-large">${characterArt()}</div><div class="hero-info"><h2>${esc(c.name||'Mi heroína')}</h2><p>Pelo ${COLORS.find(x=>x[0]===fixedColor())[1]} · Color elegido al empezar</p><p>Nivel ${level()} · ${d.xp} XP</p><div class="progress"><span style="width:${d.xp%100}%"></span></div></div></div>`;
}
function characterProfile(){
 const c=d.character,eq=c.equipped||{};
 return `${characterCard()}<section class="card"><h2>Tu heroína</h2><p>Tu color de cabello es <strong>${COLORS.find(x=>x[0]===fixedColor())[1]}</strong>. Todos los atuendos y las alas que consigas conservarán este mismo cabello.</p><label>Nombre de tu heroína</label><input id="charName" maxlength="20" value="${esc(c.name)}" placeholder="Nombre de tu heroína"><button class="primary" onclick="saveCharacter()">Guardar nombre</button></section><section class="card"><h2>Vestimentas desbloqueables</h2><div class="cn-equipment">${gear.filter(g=>g.slot==='armor').map(g=>{let unlocked=level()>=g.level,on=eq.armor===g.id;return `<div class="cn-eq ${on?'equipped':''}"><img loading="lazy" src="./cn_${fixedColor()}_${OUTFITS[g.id]}_sin_alas.webp" alt="${g.name} con pelo ${fixedColor()}"><div><strong>${g.name}</strong><p>${g.desc}</p><p>${unlocked?on?'✓ Equipado':'Disponible':'🔒 Nivel '+g.level}</p><button class="${on?'secondary':'primary'}" ${!unlocked||on?'disabled':''} onclick="equip('${g.id}')">${on?'Equipado':unlocked?'Equipar':'Bloqueado'}</button></div></div>`}).join('')}</div></section><section class="card"><h2>Alas desbloqueables</h2><p>Comienzas sin alas. Puedes equiparlas o quitarlas cuando quieras.</p><button class="secondary" onclick="unequipWings()" ${!eq.wings?'disabled':''}>Sin alas</button><div class="cn-equipment">${gear.filter(g=>g.slot==='wings').map(g=>{let unlocked=level()>=g.level,on=eq.wings===g.id;return `<div class="cn-eq ${on?'equipped':''}"><img loading="lazy" src="./cn_${fixedColor()}_basica_${WING_TYPES[g.id]}.webp" alt="${g.name}"><div><strong>${g.name}</strong><p>${g.desc}</p><p>${unlocked?on?'✓ Equipadas':'Disponibles':'🔒 Nivel '+g.level}</p><button class="${on?'secondary':'primary'}" ${!unlocked||on?'disabled':''} onclick="equip('${g.id}')">${on?'Equipadas':unlocked?'Equipar':'Bloqueadas'}</button></div></div>`}).join('')}</div></section>`;
}
function question(it){
 const [k,label,opts,placeholder]=it,v=d.answers[k]??'';
 if(opts==='text')return `<label for="q_${k}">${esc(label)} <span class="field-note">(opcional)</span></label><textarea id="q_${k}" data-q="${k}" rows="2" placeholder="${esc(placeholder||'')}">${esc(v)}</textarea>`;
 if(opts==='number')return `<label for="q_${k}">${esc(label)} <span class="field-note">(opcional)</span></label><input id="q_${k}" data-q="${k}" inputmode="decimal" type="text" value="${esc(v)}" placeholder="${esc(placeholder||'')}"><small class="field-note">${k==='weight'||k==='targetWeight'?'Puedes utilizar coma o punto para los decimales.':''}</small>`;
 if(!Array.isArray(opts))return '';
 const isMulti=MULTI_KEYS.has(k);let selected=isMulti?(Array.isArray(v)?v:[]):(Array.isArray(v)?v[0]:v);
 return `<fieldset><legend>${esc(label)} <span class="field-note">(${isMulti?'puedes marcar varias':'elige una sola'} · opcional)</span></legend><div class="options">${opts.map((option,i)=>`<label class="opt"><input type="${isMulti?'checkbox':'radio'}" name="q_${k}" data-${isMulti?'multi':'single'}="${k}" value="${esc(option)}" ${(isMulti?selected.includes(option):selected===option)?'checked':''}>${esc(option)}</label>`).join('')}</div>${!isMulti?`<button class="secondary small" type="button" onclick="clearAnswer('${k}')">Dejar sin respuesta</button>`:''}</fieldset>`;
}
function clearAnswer(k){delete d.answers[k];save();render()}
function onAnswer(el,isMulti){
 const k=isMulti?el.dataset.multi:el.dataset.single;
 if(isMulti){let arr=many(k).filter(x=>x!==el.value);if(el.checked){arr.push(el.value);const none=NONE_CHOICE[k]||[];if(none.includes(el.value))arr=[el.value];else arr=arr.filter(x=>!none.includes(x))}d.answers[k]=[...new Set(arr)];document.querySelectorAll(`[data-multi="${k}"]`).forEach(input=>input.checked=d.answers[k].includes(input.value))}
 else d.answers[k]=el.value;
 save();
}
function metricsValid(){
 for(const [key,[lo,hi]] of Object.entries(LIMITS)){const s=String(d.answers[key]??'').trim();if(!s)continue;const n=Number(s.replace(',','.'));if(!Number.isFinite(n)||n<lo||n>hi){alert(`Revisa «${key==='age'?'Edad':key==='height'?'Altura':key==='weight'?'Peso actual':'Peso objetivo'}»: escribe un número entre ${lo} y ${hi}, o deja la respuesta en blanco.`);return false;}}
 return true;
}
function finishSetup(){if(!metricsValid()){step=0;render();return}d.setup.completed=true;d.setup.completedAt=todayKey();save();page='Inicio';render(true)}
function changeStep(direction){if(!metricsValid()){step=0;render();return}step=Math.max(0,Math.min(qs.length-1,step+direction));save();render(true)}
function setupWizard(){let section=qs[step];return `<section class="card"><h2>✦ Personaliza tu aventura</h2><p>Solo tendrás que rellenar este cuestionario al comenzar. Las respuestas son opcionales: el plan se adaptará a lo que indiques. Más adelante podrás actualizar los datos importantes en <strong>Actualizar plan</strong>.</p><div class="q-progress">${qs.map((q,i)=>`<span class="${i<=step?'on':''}"></span>`).join('')}</div><p class="small">Apartado ${step+1} de ${qs.length}</p><h2>${esc(section[0])}</h2><p>${esc(section[1])}</p>${section[2].map(question).join('')}<div class="choice-line"><button type="button" class="secondary" onclick="changeStep(-1)" ${step===0?'disabled':''}>Atrás</button><button type="button" class="primary" onclick="${step===qs.length-1?'finishSetup()':'changeStep(1)'}">${step===qs.length-1?'Terminar y crear mi plan':'Siguiente'}</button><button type="button" class="secondary" onclick="${step===qs.length-1?'finishSetup()':'changeStep(1)'}">${step===qs.length-1?'Finalizar':'Omitir apartado'}</button></div><p class="mini-note">Tus respuestas se guardan en este dispositivo; si activas la sincronización con cuenta, también se copiarán de forma privada al servicio de almacenamiento configurado.</p></section>`}
function updateQuestions(keys){let all=qs.flatMap(g=>g[2]);return keys.map(k=>all.find(x=>x[0]===k)).filter(Boolean).map(question).join('')}
function updatePanel(){return `<section class="card"><h2>Actualizar mi plan</h2><p>Ajusta tus horarios, nivel de entrenamiento, preferencias y objetivos cuando cambien tus circunstancias. Tu planificación se adaptará a los datos guardados.</p><details open><summary>Trabajo, turnos y energía</summary>${updateQuestions(['work','energy','besttime','sleep','pattern'])}<p class="field-note">Los días concretos de trabajo y descanso se marcan en <strong>Calendario</strong>.</p></details><details><summary>Entrenamiento y disponibilidad</summary>${updateQuestions(['activity','experience','days','minutes','place','equipment','avoid','pain','paindetail','clearance'])}</details><details><summary>Nutrición, alergias y preferencias</summary>${updateQuestions(['meals','diet','allergies','intolerances','dislikesfood','likesfood','budget','cook','digestive','triggers'])}</details><details><summary>Peso, datos básicos y objetivos</summary>${updateQuestions(['age','height','weight','targetWeight','goalTimeline','goals','priority'])}<p class="small">Para llevar un historial del peso, utiliza el registro de Progreso.</p></details><details><summary>Salud y otras circunstancias</summary>${updateQuestions(['conditions','restrictions','stress','waterhabit','extra'])}</details><button class="primary" type="button" onclick="applyUpdates()">Guardar cambios y actualizar planes</button><button class="secondary" type="button" onclick="go('Entreno')">Ver entrenamiento</button><button class="secondary" type="button" onclick="go('Nutrición')">Ver menú</button></section>`}
function applyUpdates(){if(!metricsValid()){render();return}save();stamp('Cambios guardados. Los planes se han actualizado.');render(true)}
const SHIFT_NAMES={T:'Trabajo',M:'Mañana',A:'Tarde',N:'Noche',L:'Libre',V:'Vacaciones',B:'Baja'};
const WORK_SHIFTS=new Set(['T','M','A','N']);
function normalizedShift(raw){
 if(typeof raw==='string')return SHIFT_NAMES[raw]?{code:raw,start:'',end:''}:null;
 if(plain(raw)&&SHIFT_NAMES[raw.code])return {code:raw.code,start:validShiftTime(raw.start)?raw.start:'',end:validShiftTime(raw.end)?raw.end:''};
 return null;
}
function validShiftTime(t){return typeof t==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)}
function shiftEntry(date){
 const manual=normalizedShift(d.shiftDays[date]);if(manual)return manual;
 if(d.shift.autoPattern&&/^[TMLNAV]+$/i.test(d.shift.sequence||'')&&/^\d{4}-\d{2}-\d{2}$/.test(d.shift.start||'')){
  const seq=d.shift.sequence.toUpperCase(),idx=((dayDiff(date,d.shift.start)%seq.length)+seq.length)%seq.length;
  return {code:seq[idx],start:'',end:''};
 }
 return null;
}
function shiftOf(date){return shiftEntry(date)?.code||null}
function shiftHours(date){const x=shiftEntry(date);if(!x?.start||!x?.end)return '';return `${x.start}–${x.end}${x.end<=x.start?' (termina al día siguiente)':''}`}
function shiftLabel(date){return `${SHIFT_NAMES[shiftOf(date)]||'Sin marcar'}${shiftHours(date)?' · '+shiftHours(date):''}`}
function moveMonth(delta){let [y,m]=calendarMonth.split('-').map(Number);let x=new Date(y,m-1+delta,1);calendarMonth=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;calendarEditDate=null;render()}
function markDay(date){
 if(!validDate(date))return;
 if(calendarBrush==='clear') {delete d.shiftDays[date];calendarEditDate=null;save();render();return}
 // Los turnos importados existentes solo se abren para editar: no se pisan al tocarlos.
 if(!shiftEntry(date)){d.shiftDays[date]=calendarBrush;save()}
 calendarEditDate=date;render();
}
function shiftBrushSet(x){if(![...Object.keys(SHIFT_NAMES),'clear'].includes(x))return;calendarBrush=x;render()}
function saveDayDetails(){
 const date=calendarEditDate;if(!validDate(date))return;
 const code=document.getElementById('dayShiftType')?.value;
 if(!SHIFT_NAMES[code])return alert('Selecciona un tipo de turno.');
 let start=(document.getElementById('dayShiftStart')?.value||'').trim(),end=(document.getElementById('dayShiftEnd')?.value||'').trim();
 if(!WORK_SHIFTS.has(code)){start='';end=''}
 if(Boolean(start)!==Boolean(end))return alert('Para indicar horas, introduce tanto la de inicio como la de fin, o deja ambas en blanco.');
 if((start&&!validShiftTime(start))||(end&&!validShiftTime(end)))return alert('Las horas deben tener formato HH:MM.');
 d.shiftDays[date]=start&&end?{code,start,end}:code;save();stamp(`Guardado: ${niceDate(date)} · ${SHIFT_NAMES[code]}.`);render();
}
function removeDayDetails(){if(!validDate(calendarEditDate))return;delete d.shiftDays[calendarEditDate];calendarEditDate=null;save();render()}
function dayEditor(){
 const date=calendarEditDate;if(!validDate(date))return '';
 const entry=shiftEntry(date)||{code:calendarBrush==='clear'?'T':calendarBrush,start:'',end:''};
 return `<div class="small-card shift-editor"><div class="headrow"><h3>Editar ${esc(cap(niceDate(date)))}</h3><button class="secondary" type="button" onclick="calendarEditDate=null;render()">Cerrar</button></div>
 <label for="dayShiftType">Tipo de día o turno</label><select id="dayShiftType" onchange="toggleShiftHours()">${Object.entries(SHIFT_NAMES).map(([code,name])=>`<option value="${code}" ${entry.code===code?'selected':''}>${esc(name)}</option>`).join('')}</select>
 <div id="dayShiftHours" ${WORK_SHIFTS.has(entry.code)?'':'hidden'}><p class="small">Horas opcionales. Si terminas a una hora anterior a la de inicio, se interpreta que acaba al día siguiente.</p><div class="shift-times"><div><label for="dayShiftStart">Inicio</label><input type="time" id="dayShiftStart" value="${esc(entry.start)}"></div><div><label for="dayShiftEnd">Fin</label><input type="time" id="dayShiftEnd" value="${esc(entry.end)}"></div></div></div>
 <div class="choice-line"><button class="primary" type="button" onclick="saveDayDetails()">Guardar turno</button><button class="secondary" type="button" onclick="removeDayDetails()">Borrar este día</button></div></div>`;
}
function toggleShiftHours(){const el=document.getElementById('dayShiftHours');if(el)el.hidden=!WORK_SHIFTS.has(document.getElementById('dayShiftType')?.value)}
function patternSave(){let start=document.getElementById('patternDate').value,seq=document.getElementById('patternSequence').value.toUpperCase().replace(/\s/g,''),enabled=document.getElementById('patternEnabled').checked;
 if(enabled&&!validDate(start))return alert('Introduce la fecha de referencia.');
 if(enabled&&!/^[TMLNAV]{1,62}$/.test(seq))return alert('Usa solo T, M, A, N, L o V (hasta 62 días).');
 d.shift.start=start;d.shift.sequence=seq;d.shift.autoPattern=enabled;save();stamp('Patrón actualizado. Las fechas marcadas manualmente tienen prioridad.');render();
}
function calendar(){let [yy,mm]=calendarMonth.split('-').map(Number),date=new Date(yy,mm-1,1),offset=(date.getDay()+6)%7,days=new Date(yy,mm,0).getDate();
 let cells=Array.from({length:offset},()=>'<div class="cal-cell blank" aria-hidden="true"></div>');
 const styles={T:'work',M:'morning',A:'afternoon',N:'night',L:'free',V:'holiday',B:'sick'};
 for(let day=1;day<=days;day++){
  let key=`${calendarMonth}-${String(day).padStart(2,'0')}`,st=shiftOf(key),cl=styles[st]||'';
  cells.push(`<button type="button" class="cal-cell ${cl} ${key===todayKey()?'today':''} ${key===calendarEditDate?'selected':''}" onclick="markDay('${key}')" title="${esc(niceDate(key))} · ${esc(shiftLabel(key))}"><span class="day-number">${day}</span><em>${st||'·'}</em>${shiftHours(key)?'<small>⏱</small>':''}</button>`)
 }
 return `<section class="card"><h2>Calendario de turnos</h2><p>Marca Mañana, Tarde, Noche, Trabajo (sin especificar turno), Libre, Vacaciones o Baja. El plan adapta la actividad y el descanso.</p><div class="calendar-head"><button class="secondary" onclick="moveMonth(-1)" aria-label="Mes anterior">◀</button><h2>${cap(niceDate(calendarMonth+'-01',{month:'long',year:'numeric'}))}</h2><button class="secondary" onclick="moveMonth(1)" aria-label="Mes siguiente">▶</button></div><div class="calendar-week">${['L','M','X','J','V','S','D'].map(x=>`<strong>${x}</strong>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div><h3>Seleccionar turno para fechas nuevas</h3><div class="choice-line">${Object.entries(SHIFT_NAMES).map(([code,name])=>`<button class="${calendarBrush===code?'primary':'secondary'}" onclick="shiftBrushSet('${code}')">${code} · ${name}</button>`).join('')}<button class="${calendarBrush==='clear'?'primary':'secondary'}" onclick="shiftBrushSet('clear')">Borrar</button></div><p class="small">Toca un día vacío para aplicar la categoría elegida. Toca un día que ya tenga un turno para editarlo sin borrar lo importado. Puedes escribir horas de inicio y fin en el editor; son opcionales.</p>${dayEditor()}${importPreview?importPanel():''}</section>
 <section class="card"><h2>Importar calendario</h2><p>Lee archivos <strong>.ics</strong> o <strong>.csv</strong> con turnos y, cuando existan, sus horas. Se reconoce Mañana sin confundirla con Trabajo, además de Tarde, Noche, Libre, Vacaciones y Baja.</p><input id="shiftFile" type="file" accept=".ics,.csv,.txt,text/calendar,text/csv,text/plain"><button class="primary" onclick="prepareImport()">Revisar archivo antes de importarlo</button><button class="secondary" onclick="downloadShiftTemplate()">Descargar modelo CSV</button><p class="small">Los días antiguos que figuran como Trabajo permanecen así hasta corregirlos manualmente o volver a importar el archivo. La importación pide confirmación antes de sustituir días existentes.</p></section>
 <section class="card"><h2>Patrón opcional</h2><p>Si tu cuadrante se repite, indica una secuencia (ejemplo: MMLL). Las excepciones manuales tienen prioridad. La baja se marca por fechas, no como patrón repetitivo.</p><label>Fecha del primer día de la secuencia</label><input type="date" id="patternDate" value="${esc(d.shift.start||todayKey())}"><label>Secuencia (T Trabajo, M Mañana, A Tarde, N Noche, L Libre, V Vacaciones)</label><input id="patternSequence" value="${esc(d.shift.sequence||'TTLL')}" maxlength="62"><label class="opt"><input type="checkbox" id="patternEnabled" ${d.shift.autoPattern?'checked':''}>Activar repetición automática</label><button class="primary" onclick="patternSave()">Guardar patrón</button><p class="small">Si no activas la repetición, el mes queda en blanco hasta que marques los turnos.</p></section>`;
}
// Importación de turnos: distinguir horarios por nombre y conservar las horas si existen.
function classifyShift(raw){const s=String(raw||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(!s)return null;
 if(/^(b|baja|baja medica|it|enfermedad|sick leave|medical leave)$/.test(s)||/\b(baja|incapacidad temporal|sick leave|medical leave|enfermedad)\b/.test(s))return 'B';
 if(/^(v|vacaciones|vacacion|vacation|holiday)$/.test(s)||/\b(vacaciones|vacacion|vacation|holiday)\b/.test(s))return 'V';
 if(/^(l|libre|descanso|off|free|rest|festivo|dia libre|dia de descanso)$/.test(s)||/\b(libre|descanso|descansar|off duty|dia libre|dia de descanso)\b/.test(s))return 'L';
 if(/^(n|noche|nocturno)$/.test(s)||/^n\b/.test(s)||/\b(noche|nocturno|nocturna|night|turno n)\b/.test(s))return 'N';
 if(/^(m|manana|morning|matinal)$/.test(s)||/^m\b/.test(s)||/\b(manana|mananas|matinal|morning|turno m)\b/.test(s))return 'M';
 if(/^(a|tarde|afternoon)$/.test(s)||/^a\b/.test(s)||/\b(tarde|afternoon|turno a)\b/.test(s))return 'A';
 if(/^(t|trabajo|turno|guardia|work|day shift)$/.test(s)||/^t\b/.test(s)||/\b(trabajo|trabajar|trabajado|jornada|turno|guardia|shift|work)\b/.test(s))return 'T';
 return null;
}
function parseShiftDate(value){let s=String(value||'').trim().replace(/^"|"$/g,'');let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m){let r=`${m[1]}-${m[2]}-${m[3]}`;return validDate(r)?r:null}m=s.match(/^(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})/);if(m){let r=`${m[3]}-${m[2]}-${m[1]}`;return validDate(r)?r:null}m=s.match(/^(\d{4})(\d{2})(\d{2})(?:T|$)/);if(m){let r=`${m[1]}-${m[2]}-${m[3]}`;return validDate(r)?r:null}return null}
function validDate(k){return /^\d{4}-\d{2}-\d{2}$/.test(k)&&localDate(k).getFullYear()===+k.slice(0,4)&&localDate(k).getMonth()+1===+k.slice(5,7)&&localDate(k).getDate()===+k.slice(8,10)}
function normalTime(raw){const s=String(raw||'').trim();let m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);if(!m)m=s.match(/^(\d{2})(\d{2})$/);if(!m)return '';const t=m[1].padStart(2,'0')+':'+m[2];return validShiftTime(t)?t:''}
function parseICSDateTime(raw){let s=String(raw||'').trim();let day=parseShiftDate(s);if(!day)return null;
 let t=s.match(/T(\d{2})(\d{2})(?:\d{2})?(Z)?$/i);if(!t)return {date:day,time:'',allDay:true};
 if(t[3]){
  let when=new Date(Date.UTC(+day.slice(0,4),+day.slice(5,7)-1,+day.slice(8,10),+t[1],+t[2]));
  let parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(when),v=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {date:`${v.year}-${v.month}-${v.day}`,time:`${v.hour}:${v.minute}`,allDay:false};
 }
 return {date:day,time:normalTime(t[1]+t[2]),allDay:false};
}
function parseICS(txt){let unfolded=txt.replace(/\r\n/g,'\n').replace(/\n[ \t]/g,'');let out=[];for(const block of unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)){
 let props={};for(let line of block[1].split('\n')){let i=line.indexOf(':');if(i<0)continue;let key=line.slice(0,i).split(';')[0].toUpperCase();if(!props[key])props[key]=line.slice(i+1).replace(/\\,/g,',').replace(/\\n/g,' ')}
 let first=parseICSDateTime(props.DTSTART),last=parseICSDateTime(props.DTEND),label=props.SUMMARY||'',code=classifyShift(label);
 if(!first||!code)continue;
 let start=WORK_SHIFTS.has(code)?first.time:'',end=WORK_SHIFTS.has(code)&&last?last.time:'';
 if(first.allDay&&last?.allDay){let n=dayDiff(last.date,first.date);if(n>0&&n<=366){for(let i=0;i<n;i++)out.push({date:nextDate(first.date,i),code,label,start:'',end:''});continue}}
 out.push({date:first.date,code,label,start,end});
 }return out}
function parseCSVRows(txt){let rows=[],row=[],cell='',quote=false;for(let i=0;i<txt.length;i++){let c=txt[i];if(c==='"'){if(quote&&txt[i+1]==='"'){cell+='"';i++}else quote=!quote}else if(!quote&&(c===';'||c===','||c==='\t')){row.push(cell.trim());cell=''}else if(!quote&&(c==='\n'||c==='\r')){if(c==='\r'&&txt[i+1]==='\n')i++;row.push(cell.trim());if(row.some(x=>x))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell.trim());if(row.some(x=>x))rows.push(row);return rows}
function parseCSV(txt){let rows=parseCSVRows(txt.replace(/^\uFEFF/,''));if(!rows.length)return [];
 const norm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 let headers=rows[0].map(norm),di=headers.findIndex(x=>/^(fecha|date|dia|day|inicio|start)$/.test(x)),si=headers.findIndex(x=>/^(tipo|turno|shift|estado|status|evento|event|nombre|summary|descripcion)$/.test(x));
 let hi=headers.findIndex(x=>/^(hora inicio|hora de inicio|hora_inicio|hora entrada|entrada|inicio turno|start time|start_time|desde)$/.test(x));
 let hf=headers.findIndex(x=>/^(hora fin|hora de fin|hora_fin|hora salida|salida|fin turno|end time|end_time|hasta)$/.test(x));
 let from=di>=0&&si>=0?1:0;if(di<0)di=0;if(si<0)si=1;
 return rows.slice(from).map(r=>{
  let code=classifyShift(r[si]);return {date:parseShiftDate(r[di]),code,label:r[si],start:WORK_SHIFTS.has(code)?normalTime(hi>=0?r[hi]:from===0?r[2]:''):'',end:WORK_SHIFTS.has(code)?normalTime(hf>=0?r[hf]:from===0?r[3]:''):''};
 }).filter(x=>x.date&&x.code);
}
function prepareImport(){const el=document.querySelector('#shiftFile'),f=el?.files?.[0];if(!f)return alert('Selecciona un archivo .ics o .csv.');if(f.size>2_000_000)return alert('El archivo es demasiado grande para una importación local (máximo 2 MB).');const reader=new FileReader();reader.onload=()=>{try{let content=String(reader.result||''),isIcs=/BEGIN:VCALENDAR|BEGIN:VEVENT/.test(content)||/\.ics$/i.test(f.name);let parsed=isIcs?parseICS(content):parseCSV(content);let map=new Map();parsed.forEach(x=>map.set(x.date,x));importPreview=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));render();if(!importPreview.length)alert('No se reconocieron turnos con fecha y tipo. Revisa las etiquetas de tu ICS/CSV.')}catch(e){alert('No se pudo analizar el archivo.') }};reader.readAsText(f)}
function importPanel(){let p=importPreview||[];return `<div class="small-card"><h3>Previsualización de importación</h3><p>${p.length} fecha(s) reconocida(s). Confirma antes de reemplazar tus marcas existentes.</p>${p.slice(0,12).map(x=>`<p class="small">${esc(x.date)} — ${esc(SHIFT_NAMES[x.code])}${x.start&&x.end?' · '+esc(x.start+'–'+x.end):''} (${esc(x.label)})</p>`).join('')}${p.length>12?'<p class="small">…y más fechas.</p>':''}<div class="choice-line"><button class="primary" onclick="confirmImport()" ${p.length?'':'disabled'}>Importar turnos</button><button class="secondary" onclick="importPreview=null;render()">Cancelar</button></div></div>`}
function confirmImport(){if(!importPreview?.length)return;if(!confirm(`Se aplicarán ${importPreview.length} fechas. Las marcas existentes en esas fechas se sustituirán. ¿Continuar?`))return;
 for(const x of importPreview)d.shiftDays[x.date]=(x.start&&x.end)?{code:x.code,start:x.start,end:x.end}:x.code;
 let n=importPreview.length;importPreview=null;save();stamp(`${n} días importados; turnos y plan actualizados.`);render();}
function downloadShiftTemplate(){let b=new Blob(['fecha;turno;hora inicio;hora fin\n2026-12-01;Mañana;07:00;19:00\n2026-12-02;Libre;;\n2026-12-03;Noche;19:00;07:00\n2026-12-04;Baja;;\n2026-12-05;Trabajo;08:00;16:00\n'],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='modelo-turnos-reformandome.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function sessionQuota(anyDay=todayKey()){const s=selectValue('days','3 días');let m=s.match(/^[2345]/);let desired=m?+m[0]:3;const beginner=['Ninguna','Principiante'].includes(selectValue('experience','Principiante'));const low=selectValue('activity')==='Muy baja';const weeks=Math.max(1,Math.floor(dayDiff(anyDay,d.start)/7)+1);return beginner&&low&&weeks<=2?Math.min(2,desired):Math.min(5,desired)}
function physicalRisk(){let pain=many('pain');let conditions=many('conditions');let consent=selectValue('clearance');let severe=pain.includes('Dolor intenso o limitante');let cardiac=conditions.includes('Hipertensión/cardiopatía');let restricted=consent==='Necesito consultarlo'||consent==='Sí, con restricciones';return {severe,restricted,cardiac,hold:severe||consent==='Necesito consultarlo'||(cardiac&&consent!=='Sí, sin restricciones'),notes:[...(severe?['Has indicado dolor intenso o limitante: consulta antes de iniciar ejercicios de fuerza.']:[]),...(restricted?['Respeta las restricciones indicadas por tu profesional sanitario; esta app no puede evaluarlas.']:[]),...(cardiac?['Si existe una afección cardiovascular, confirma con tu equipo sanitario qué intensidad de ejercicio es segura.']:[])]}}
function monday(date){let x=localDate(date),w=(x.getDay()+6)%7;x.setDate(x.getDate()-w);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function afterNight(date){return shiftOf(nextDate(date,-1))==='N'}
function weekSessions(anyDay){let mon=monday(anyDay),quota=sessionQuota(anyDay);let candidates=[];for(let i=0;i<7;i++){let k=nextDate(mon,i),shift=shiftOf(k);if(WORK_SHIFTS.has(shift)||shift==='B'||afterNight(k))continue;candidates.push({date:k,i,priority:shift==='L'||shift==='V'?2:1})}
 // Distribuir fuerzas por la semana y priorizar libres confirmados (si los hay).
 let selected=[];for(const threshold of [2,1])for(const gap of [2,1])for(const c of candidates){if(selected.length>=quota)break;if(c.priority<threshold||selected.some(x=>x.date===c.date))continue;if(selected.every(x=>Math.abs(c.i-x.i)>=gap))selected.push(c)}
 return selected.sort((a,b)=>a.date.localeCompare(b.date)).map(x=>x.date)
}
function baseTrainingPlan(date){let sh=shiftOf(date),risk=physicalRisk(),worked=WORK_SHIFTS.has(sh),after=afterNight(date),xpWeek=Math.max(1,Math.floor((dayDiff(date,d.start))/7)+1),days=weekSessions(date),idx=days.indexOf(date),levelAnswer=selectValue('experience','Principiante');
 const lowEnergy=['Agotada, necesito recuperar'].includes(selectValue('energy'))||['Menos de 5','5–6'].includes(selectValue('sleep')),busy=worked||after;
 if(sh==='B')return {kind:'descanso',title:'Baja · priorizar recuperación',minutes:'Sin entrenamiento programado',detail:'El día de baja no se programa fuerza ni actividad obligatoria. Sigue las indicaciones sanitarias para tu situación; cualquier ejercicio es opcional si está permitido.',exercises:[],notes:[]};
 if(risk.hold)return {kind:'precaucion',title:'Ejercicio pendiente de valoración',minutes:'—',detail:'Evita empezar una rutina de fuerza o intensificar el ejercicio sin aclarar antes las restricciones o el dolor referido.',exercises:[],notes:risk.notes};
 if(after)return {kind:'descanso',title:'Descanso tras noche',minutes:'Según recuperación',detail:'Prioriza descansar y recuperar sueño. Si te encuentras bien, un paseo muy suave o movilidad ligera es opcional.',exercises:[],notes:[]};
 if(busy)return {kind:'suave',title:sh==='N'?'Turno de noche: recuperar':sh==='M'?'Turno de mañana: sesión corta':sh==='A'?'Turno de tarde: sesión corta':'Turno de trabajo: sesión corta',minutes:lowEnergy?'5–10 min':'10–15 min',detail:'El día de trabajo no exige entrenamiento fuerte. Hazlo solo si te encuentras con energía suficiente.',exercises:['Caminar suave 5–10 min, si te apetece','Movilidad cómoda de hombros y tobillos 3–5 min','Descanso e hidratación'],notes:[]};
 if(idx===-1)return {kind:'activo',title:'Día de recuperación activa',minutes:'15–30 min',detail:'Paseo cómodo o actividad agradable de bajo impacto, sin obligación de completar una sesión de fuerza.',exercises:['Caminar a ritmo conversacional 15–30 min, si te encuentras bien','Movilidad ligera y estiramientos sin dolor'],notes:[]};
 const beginner=levelAnswer==='Ninguna'||levelAnswer==='Principiante',veryLow=selectValue('activity')==='Muy baja',weeks=xpWeek;let sets=beginner?(weeks<=2||veryLow&&weeks<=3?1:weeks<=5?2:3):(weeks<=2?2:3),reps=weeks<=2?'8–10':weeks<=5?'10–12':'8–12',place=selectValue('place','En casa'),equip=many('equipment'),avoid=many('avoid'),pain=many('pain');
 let knee=pain.includes('Rodilla'),back=pain.includes('Espalda/cuello'),wrist=pain.includes('Hombro/muñeca'),noFlex=avoid.includes('Flexiones de tronco'),noFloor=avoid.includes('Ejercicios tumbada'),bands=equip.includes('Bandas elásticas'),weights=equip.includes('Mancuernas')||equip.includes('Kettlebell/pesas'),gym=place==='Gimnasio';
 let warm=['Calentamiento: caminar suave y movilizar articulaciones 4–6 min'];
 let A=[knee?'Sentarte y levantarte de silla alta, con apoyo y rango cómodo':'Sentarte y levantarte de una silla controladamente',bands?'Remo con banda elástica':weights?'Remo con mancuerna ligera y apoyo':gym?'Remo sentado en máquina, ligero':'Juntar escápulas de pie, sin encoger hombros',wrist?'Empuje de brazos con banda, agarre neutro y sin dolor':'Flexiones contra pared o press en máquina ligero',back?'Extensión de cadera de pie con apoyo':noFloor?'Extensión de cadera de pie':'Puente de glúteos suave en suelo, si es cómodo','Elevaciones de talones con apoyo'];
 let B=[knee?'Marcha de pie con apoyo, sin dolor':'Paso lateral controlado (sin impacto)',gym?'Jalón al pecho ligero en máquina':bands?'Jalón con banda y control escapular':'Tirón escapular de pie, sin resistencia',wrist?'Apertura suave de brazos sin cargar muñecas':weights?'Press de pecho con mancuernas ligeras y apoyo':'Empuje suave contra pared',back||noFlex?'Contracción abdominal suave de pie, respirando sin aguantar aire':'Estabilidad de tronco de pie y respiración controlada','Elevaciones laterales de pierna con apoyo'];
 let exercises=warm.concat((idx%2===0?A:B).map(x=>`${sets} serie${sets>1?'s':''} × ${reps} · ${x}`)).concat(['Vuelta a la calma: 3–5 min de movimientos suaves']);
 let min=selectValue('minutes','20–30 min');let notes=[];if(avoid.includes('Saltos/impacto')||avoid.includes('Correr'))notes.push('Sin saltos ni carrera, según tus preferencias.');if(many('conditions').includes('Hernia de hiato/reflujo')||many('digestive').includes('Reflujo/hernia de hiato'))notes.push('Evita entrenar justo después de una comida copiosa y las posiciones que agraven el reflujo.');if(pain.length&&!pain.includes('No'))notes.push('Si una molestia aumenta, reduce o detén ese ejercicio; no fuerces el dolor.');if(lowEnergy)notes.push('Por tu descanso o energía actual, puedes reducir la sesión a la mitad o cambiarla por recuperación.');if(nval('age')>=65)notes.push('Progresa de forma especialmente gradual y prioriza el equilibrio y la técnica.');
 return {kind:'fuerza',title:`Fuerza ${idx%2===0?'A':'B'} · Semana ${weeks}`,minutes:min,detail:`Entrenamiento ${beginner?'de iniciación':'adaptado a tu experiencia'}, con descanso de 60–90 segundos entre series y esfuerzo moderado. Aumenta solo si toleras bien la rutina.`,exercises,notes};
}
// Programas adaptados a objetivos, nivel, material y tiempo; respetan los turnos y precauciones de la base.
function timeBudget(){let v=selectValue('minutes','20–30 min');return v==='10–15 min'?15:v==='20–30 min'?30:v==='30–45 min'?45:v==='45–60 min'?60:30}
function planFocus(){
 const goals=many('goals'),priority=selectValue('priority'),likes=many('likes');
 if(priority==='Fuerza'||goals.includes('Ganar fuerza'))return 'fuerza';
 if(priority==='Bienestar emocional'||goals.includes('Reducir estrés'))return likes.includes('Movilidad/Pilates suave')?'movilidad':'bienestar';
 if(goals.includes('Mejorar resistencia')||likes.includes('Caminar')||likes.includes('Baile bajo impacto'))return 'resistencia';
 if(goals.includes('Movilidad y postura')||likes.includes('Movilidad/Pilates suave'))return 'movilidad';
 return 'mixto';
}
function trainingPlan(date){
 const p=baseTrainingPlan(date),focus=planFocus(),maxMin=timeBudget();
 const likes=many('likes'),equip=many('equipment'),avoids=many('avoid'),pain=many('pain');
 const beginner=['Ninguna','Principiante'].includes(selectValue('experience','Principiante'));
 const activeLow=['Muy baja','Baja'].includes(selectValue('activity','Baja'));
 const week=Math.max(1,Math.floor(dayDiff(date,d.start)/7)+1);
 const caution=pain.length>0&&!pain.includes('No');
 if(p.kind==='activo'){
  const walking=likes.includes('Caminar')||focus==='resistencia';
  if(likes.includes('Movilidad/Pilates suave')||focus==='movilidad')p.exercises=['Movilidad suave de hombros, cadera y tobillos durante 8–12 min, sin dolor','Paseo opcional a ritmo cómodo 10–15 min'];
  else if(likes.includes('Baile bajo impacto'))p.exercises=['Baile suave sin saltos 10–20 min a intensidad cómoda','Estiramientos ligeros al terminar'];
  else if(walking)p.exercises=['Caminar a ritmo conversacional 15–25 min, según energía','Movilidad de articulaciones 3–5 min'];
  p.minutes='Opcional · 10–25 min';return p;
 }
 if(p.kind!=='fuerza')return p;
 const min=beginner&&activeLow?15:Math.min(maxMin,beginner?45:60);
 const length=Math.max(10,Math.min(min,maxMin));
 const plannedSets=beginner?(week<=2?1:week<=5?2:3):(week<=2?2:3);
 const sets=Math.min(plannedSets,length<=15?1:length<=30?2:3);
 const reps=beginner?'8–10':'8–12';
 const floorForbidden=avoids.includes('Ejercicios tumbada');
 const joints=caution||avoids.includes('Saltos/impacto');
 const gym=selectValue('place')==='Gimnasio';
 const bands=equip.includes('Bandas elásticas');
 const weights=equip.includes('Mancuernas')||equip.includes('Kettlebell/pesas');
 const cycling=equip.includes('Bicicleta estática');
 let session=[];
 const warm='Calentamiento: 3–5 min de marcha tranquila y movilidad sin dolor';
 const cooldown='Vuelta a la calma: 3–5 min de respiración cómoda y movilidad suave';
 const calendarIndex=Math.max(0,weekSessions(date).indexOf(date));
 const effort=beginner?'ligera':'moderada';
 if(focus==='resistencia'||(focus==='mixto'&&calendarIndex%2===1)){
  const base=beginner?10:18;
  const target=Math.min(Math.max(10,length-8),base+Math.min(week-1,8)*2);
  const dance=likes.includes('Baile bajo impacto');
  const main=cycling?'Bicicleta estática a esfuerzo cómodo':dance?'Baile sin impacto, con pausas':'Caminata en terreno cómodo a ritmo conversacional';
  session=[warm,`${target} min · ${main}`,`${sets} serie${sets>1?'s':''} × ${reps} · ${joints?'Extensión de cadera de pie con apoyo':'Sentarse y levantarse de una silla controladamente'}`,cooldown];
  p.title=`Resistencia suave · Semana ${week}`;
  p.detail=`Plan para mejorar resistencia con progresión gradual (${effort}). El ritmo debe permitir hablar; reduce duración si necesitas descansar.`;
 }else if(focus==='movilidad'||focus==='bienestar'){
  const options=[
   'Movilidad de hombros y escápulas, sin forzar el rango',
   'Movilidad de caderas y tobillos con apoyo',
   'Equilibrio junto a una pared o silla estable',
   'Movimientos suaves de columna solo si son cómodos',
   'Paseo suave o respiración relajada sin aguantar el aire'
  ];
  session=[warm,...options.slice(0,length<=15?2:length<=30?3:5).map(x=>`2–4 min · ${x}`),cooldown];
  p.title=focus==='bienestar'?`Movimiento y bienestar · Semana ${week}`:`Movilidad y postura · Semana ${week}`;
  p.detail='Rutina tranquila centrada en movilidad, bienestar y constancia. No fuerces articulaciones ni trabajes sobre el dolor.';
 }else{
  const original=p.exercises.filter(x=>!x.startsWith('Calentamiento')&&!x.startsWith('Vuelta a la calma'));
  const basic=original.map(x=>x.replace(/^\d+ serie(?:s)? × [\d–]+ · /,`${sets} serie${sets>1?'s':''} × ${reps} · `));
  let strength=basic.slice(0,length<=15?2:length<=30?3:length<=45?4:5);
  if(gym&&!bands&&!weights){strength=strength.map(x=>x.replace('Juntar escápulas de pie, sin encoger hombros','Remo sentado en máquina, sin dolor'));}
  session=[warm,...strength,cooldown];
  p.title=focus==='fuerza'?`Fuerza ${calendarIndex%2===0?'A':'B'} · Semana ${week}`:`Fuerza y salud · Semana ${week}`;
  p.detail=`Plan ${beginner?'de iniciación':'según tu experiencia'} con ${sets} serie(s) y ${reps} repeticiones orientativas. Descansa 60–90 s entre series y ajusta esfuerzo según tolerancia.`;
 }
 p.exercises=session;p.minutes=`Hasta ${length} min`;
 p.notes=[...p.notes,`Enfoque personalizado: ${({fuerza:'fuerza',resistencia:'resistencia',movilidad:'movilidad y postura',bienestar:'bienestar emocional',mixto:'salud general y fuerza'})[focus]}. Sesión ajustada a ${maxMin} min disponibles.`];
 if(floorForbidden)p.notes.push('Has preferido evitar ejercicios en el suelo: utiliza variantes de pie.');
 return p;
}

function training(){let chosen=trainingDate,p=trainingPlan(chosen),isDone=!!d.trainingDone[chosen],today=todayKey();let next=Array.from({length:7},(_,i)=>nextDate(today,i));
 return `<section class="card"><h2>Tu entrenamiento</h2><p>El plan combina tus objetivos, actividad, experiencia, preferencias, material, duración disponible y turnos reales. Cuando cambies tus respuestas, se adaptará.</p><div class="timeline">${next.map(k=>`<button class="${k===chosen?'current':''}" onclick="trainingDate='${k}';render()">${niceDate(k,{weekday:'short'})}<br>${k.slice(-2)}<br>${shiftOf(k)||'·'}</button>`).join('')}</div><label for="trainingDate">Ver otro día</label><input id="trainingDate" type="date" value="${esc(chosen)}" onchange="trainingDate=this.value;render()"><div class="small-card"><h3>${esc(cap(niceDate(chosen)))}</h3><span class="pill">${esc(shiftLabel(chosen))}</span><span class="pill">${esc(p.minutes)}</span><h2>${esc(p.title)}</h2><p>${esc(p.detail)}</p>${p.exercises.length?`<ol>${p.exercises.map(x=>`<li style="margin:8px 0">${esc(x)}</li>`).join('')}</ol>`:''}${p.notes.map(n=>`<p class="warning">${esc(n)}</p>`).join('')}${p.kind==='fuerza'?`<button class="${isDone?'secondary':'primary'}" onclick="toggleTraining('${chosen}')">${isDone?'✓ Sesión completada (desmarcar)':'Marcar entrenamiento completado · +20 XP'}</button>`:''}</div><p class="small">Sugerencia automatizada de bienestar. No sustituye a profesionales sanitarios ni detecta todas las contraindicaciones. Los turnos sin definir generan una distribución provisional.</p></section>
 <section class="card"><h2>Esta semana</h2>${Array.from({length:7},(_,i)=>nextDate(monday(chosen),i)).map(k=>{let t=trainingPlan(k);return `<div class="plan-day"><button class="secondary" onclick="trainingDate='${k}';render()">${cap(niceDate(k,{weekday:'short',day:'numeric'}))} · ${esc(t.title)}</button><span class="pill">${esc(shiftOf(k)||'?')}</span></div>`}).join('')}<button class="secondary" onclick="go('Actualizar plan')">Cambiar nivel o disponibilidad</button><button class="secondary" onclick="go('Calendario')">Editar turnos</button></section>`;
}
function toggleTraining(date){let was=!!d.trainingDone[date];if(was){delete d.trainingDone[date];d.xp=Math.max(0,d.xp-20)}else{d.trainingDone[date]=true;d.xp+=20}save();render()}
// v30: nutrición separada, sin copiar recetas de los documentos; fuente: criterios generales revisados.
function norm(s){return NUTRI.fold(s)}
function nutritionProfile(){return {age:selectValue('age'),height:selectValue('height'),weight:selectValue('weight'),targetWeight:selectValue('targetWeight'),
 diet:selectValue('diet'),meals:selectValue('meals','4'),allergies:selectValue('allergies'),intolerances:selectValue('intolerances'),
 dislikesfood:selectValue('dislikesfood'),likesfood:selectValue('likesfood'),triggers:selectValue('triggers'),budget:selectValue('budget'),cook:selectValue('cook'),
 priority:selectValue('priority'),goals:many('goals').join(', '),activity:selectValue('activity'),experience:selectValue('experience'),
 digestive:many('digestive'),conditions:many('conditions').join(', '),extra:selectValue('extra'),seed:d.menuSeed||1};}
function unsafeTerms(){return NUTRI.allergyGroups(nutritionProfile())}
function foodIsSuitable(dish){return NUTRI.dishSuitability(dish,nutritionProfile())}
function mondayOf(date){const [y,m,da]=date.split('-').map(Number),t=new Date(Date.UTC(y,m-1,da,12)),day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day);return t.toISOString().slice(0,10)}
function mealCount(date=todayKey()){return NUTRI.mealsFor(nutritionProfile(),shiftOf(date))}
function menuFor(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return [];const week=NUTRI.planWeek(nutritionProfile(),mondayOf(date),shiftOf,d.nutritionSwaps||{});return week.find(x=>x.date===date)?.menu||[]}
function foodPlanGuidance(){let p=nutritionProfile(),w=Number(p.weight),g=Number(p.targetWeight),notes=[];
 notes.push('Plan de orientación general basado en variedad de grupos de alimentos, verduras y frutas, legumbres, cereales según tolerancia, fuentes de proteína y grasas de calidad.');
 if(Number(p.age)>0&&Number(p.age)<18)notes.push('En menores de edad no se propone un objetivo de pérdida de peso a partir de este cuestionario; consulta con un profesional.');
 else if(w>0&&g>0&&g<w-1)notes.push('Objetivo de descenso de peso: prioriza regularidad y saciedad sin recortes extremos.');
 else if(w>0&&g>0&&g>w+1)notes.push('Objetivo de aumento de peso: adapta la cantidad total de comida y pide asesoramiento si existe pérdida involuntaria.');
 if(p.budget==='Ajustado')notes.push('El presupuesto ajustado favorece legumbres, alimentos de temporada y platos de preparación por tandas.');
 if(p.cook==='Menos de 15 min')notes.push('Se muestran preparaciones de hasta 15 minutos; algunos ingredientes requieren cocción o preparación previa.');
 if(p.meals==='Depende del turno')notes.push('Número flexible de comidas según el calendario (tres en noche y cuatro en otros días); puedes cambiarlo en Actualizar plan.');
 return notes.join(' ');
}
function swapSuggestedDish(date,index){const list=menuFor(date),current=list[index];if(!current)return;
 const p=nutritionProfile(),choices=NUTRI.replaceOptions(p,date,current.slot,current.dish?.id,shiftOf(date));
 if(!choices.length){alert('No quedan alternativas compatibles con los filtros actuales.');return}
 const key=date+':'+index,previous=d.nutritionSwaps[key],pos=Math.max(-1,choices.findIndex(x=>x.id===previous));
 const next=choices[(pos+1)%choices.length];d.nutritionSwaps[key]=next.id;save();nutritionDate=date;render();}
function restoreSuggestedDish(date,index){delete d.nutritionSwaps[date+':'+index];save();render()}
// Lista de la compra dinámica: una semana natural, de lunes a domingo.
// La frecuencia indica la presencia de un ingrediente en platos, nunca unidades ni cantidades.
function shoppingCategory(raw){const s=norm(raw);
 if(/semillas|aceite|nuez|almendra|pistacho|chia|cacahuete|aguacate/.test(s))return 'Aceites, frutos secos y semillas';
 if(/manzana|pera|platano|mandarina|naranja|kiwi|fresa|fruta|frutos rojos/.test(s))return 'Frutas';
 if(/zanahoria|calabacin|brocoli|tomate|pepino|lechuga|espinaca|acelga|calabaza|berenjena|pimiento|judias verdes|esparrago|canonigo/.test(s))return 'Verduras y hortalizas';
 if(/pollo|pavo|merluza|sardina|salmon|atun|trucha|huevo|tofu|yogur|requeson|soja/.test(s))return 'Proteínas y alternativas';
 if(/garbanzo|lenteja|alubia/.test(s))return 'Legumbres';
 if(/pan|avena|arroz|pasta|quinoa|cuscus|bulgur|muesli|patata|boniato|maiz|tortilla de maiz|crackers/.test(s))return 'Cereales y féculas';
 if(/aceite|nuez|almendra|pistacho|chia|cacahuete|aguacate|semillas/.test(s))return 'Aceites, frutos secos y semillas';
 return 'Otros ingredientes';
}
function shoppingData(week=shoppingWeek){const byKey=new Map();let unresolved=0;
 for(let i=0;i<7;i++){
  const day=nextDate(week,i);
  for(const meal of menuFor(day)){
   if(!meal.dish){unresolved++;continue}
   for(const raw of meal.dish.ing){const key='receta:'+norm(raw),found=byKey.get(key);
    if(found)found.count++;
    else byKey.set(key,{id:key,name:raw,count:1,category:shoppingCategory(raw),custom:false});
   }
  }
 }
 const all=Array.from(byKey.values());
 for(const x of d.shoppingExtra){if(x.week===week&&x.name&&x.id){all.push({id:'extra:'+x.id,name:x.name.slice(0,100),count:0,category:'Añadidos por ti',custom:true})}}
 const categories=['Frutas','Verduras y hortalizas','Proteínas y alternativas','Legumbres','Cereales y féculas','Aceites, frutos secos y semillas','Otros ingredientes','Añadidos por ti'];
 all.sort((a,b)=>categories.indexOf(a.category)-categories.indexOf(b.category)||a.name.localeCompare(b.name,'es'));
 return {items:all,unresolved};
}
function shoppingChecks(week=shoppingWeek){return d.shoppingDone[week]||{}}
function boughtCount(week=shoppingWeek){const bought=shoppingChecks(week);return shoppingData(week).items.filter(x=>bought[x.id]).length}
function shoppingToggle(week,itemId,checked){if(!/^\d{4}-\d{2}-\d{2}$/.test(week))return;
 if(!shoppingData(week).items.some(x=>x.id===itemId))return;
 if(!d.shoppingDone[week])d.shoppingDone[week]={};
 if(checked)d.shoppingDone[week][itemId]=true;else delete d.shoppingDone[week][itemId];
 save();render();
}
function addShoppingExtra(){const el=document.getElementById('shoppingNewItem'),name=(el?.value||'').trim().replace(/\s+/g,' ').slice(0,90);
 if(!name)return alert('Escribe el artículo que quieres añadir.');
 if(d.shoppingExtra.some(x=>x.week===shoppingWeek&&norm(x.name)===norm(name)))return alert('Ese artículo ya está en tus añadidos.');
 d.shoppingExtra.push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),week:shoppingWeek,name});
 save();render();
}
function deleteShoppingExtra(id){const found=d.shoppingExtra.find(x=>x.id===id&&x.week===shoppingWeek);if(!found)return;
 d.shoppingExtra=d.shoppingExtra.filter(x=>x!==found);
 const key='extra:'+id;if(d.shoppingDone[shoppingWeek])delete d.shoppingDone[shoppingWeek][key];
 save();render();
}
function shoppingText(week=shoppingWeek){const {items,unresolved}=shoppingData(week),checks=shoppingChecks(week);
 let lines=['REFORMÁNDOME · LISTA DE LA COMPRA',niceDate(week)+' — '+niceDate(nextDate(week,6)),
  'Plan de 7 días. Las apariciones no equivalen a cantidades ni a envases.',''];
 let prev='';for(const x of items){if(prev!==x.category){if(prev)lines.push('');lines.push(x.category.toUpperCase());prev=x.category}
 lines.push((checks[x.id]?'[x] ':'[ ] ')+x.name+(x.count>1?' (en '+x.count+' platos)':''));}
 if(unresolved)lines.push('','Atención: '+unresolved+' comidas sin propuesta compatible. Revisa las restricciones o añade ingredientes manualmente.');
 return lines.join('\n');
}
function copyShoppingList(week=shoppingWeek){const content=shoppingText(week);
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(content).then(()=>stamp('Lista de la compra copiada.')).catch(()=>alert('No se pudo copiar; utiliza Descargar lista.'));
 else alert(content);
}
function downloadShoppingList(week=shoppingWeek){const blob=new Blob(['\ufeff'+shoppingText(week)],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Reformandome_compra_'+week+'.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function moveShoppingWeek(offset){shoppingWeek=nextDate(shoppingWeek,offset*7);shoppingFollowThisWeek=false;render()}
function goShoppingCurrentWeek(){shoppingWeek=mondayOf(todayKey());shoppingFollowThisWeek=true;render()}
function clearShoppingWeek(){if(!confirm('¿Desmarcar los artículos comprados de esta semana? Los productos añadidos se conservarán.'))return;
 delete d.shoppingDone[shoppingWeek];save();render()}
function shoppingSection(){const week=shoppingWeek,{items,unresolved}=shoppingData(week),bought=shoppingChecks(week),done=items.filter(x=>bought[x.id]).length;
 let cat='';const rows=items.map(x=>{
  const head=x.category===cat?'':(cat=x.category,`<h3 class="shopping-heading">${esc(cat)}</h3>`);
  const id=esc('shop-'+x.id.replace(/[^a-z0-9]+/gi,'-'));
  const handler=esc(`shoppingToggle(${JSON.stringify(week)},${JSON.stringify(x.id)},this.checked)`);
  return head+`<div class="shopping-row ${bought[x.id]?'shopping-bought':''}"><label class="shopping-label" for="${id}"><input id="${id}" type="checkbox" ${bought[x.id]?'checked':''} onchange='${handler}'><span>${esc(x.name)}${x.count>1?`<small>En ${x.count} platos</small>`:''}</span></label>${x.custom?`<button class="shopping-remove" type="button" onclick='${esc('deleteShoppingExtra('+JSON.stringify(x.id)+')')}' aria-label="Eliminar ${esc(x.name)}">×</button>`:''}</div>`;
 }).join('');
 return `<section class="card shopping-card" aria-label="Lista de la compra"><h2>Lista de la compra</h2><p>Se crea a partir de tu menú de esta semana. Cambiar platos o turnos actualiza automáticamente los ingredientes.</p>
 <div class="shopping-range"><button class="secondary" type="button" onclick="moveShoppingWeek(-1)" aria-label="Semana anterior">‹</button><strong>${esc(niceDate(week))} – ${esc(niceDate(nextDate(week,6)))}</strong><button class="secondary" type="button" onclick="moveShoppingWeek(1)" aria-label="Semana siguiente">›</button></div>
 ${week!==mondayOf(todayKey())?'<button class="secondary" onclick="goShoppingCurrentWeek()">Volver a esta semana</button>':''}
 <p class="small">${done} de ${items.length} artículos marcados como comprados</p><div class="progress" role="progressbar" aria-label="Compra realizada" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${items.length||1}"><span style="width:${items.length?Math.round(done/items.length*100):0}%"></span></div>
 ${unresolved?`<p class="warning">Hay ${unresolved} comidas sin sugerencia compatible. La lista no puede cubrirlas: añade sus ingredientes cuando tengas una alternativa segura.</p>`:''}
 ${items.length?rows:'<p>Aún no hay ingredientes para esta semana.</p>'}
 <label for="shoppingNewItem">Añadir un producto que necesites</label><div class="shopping-add"><input id="shoppingNewItem" maxlength="90" placeholder="Ej.: papel de cocina" onkeydown="if(event.key==='Enter'){event.preventDefault();addShoppingExtra()}"><button class="primary" type="button" onclick="addShoppingExtra()">Añadir</button></div>
 <div class="shopping-actions"><button class="secondary" onclick="copyShoppingList()">Copiar</button><button class="primary" onclick="downloadShoppingList()">Descargar lista (.txt)</button><button class="secondary" onclick="clearShoppingWeek()">Desmarcar todo</button></div>
 <p class="small">Se muestran los ingredientes y las veces que aparecen en platos, <strong>no cantidades exactas</strong>: ajusta las raciones, revisa lo que ya tienes y comprueba las etiquetas si hay alergias.</p>
 </section>`;
}
function mealNotice(date){let st=shiftOf(date),work=WORK_SHIFTS.has(st),workday=selectValue('work').includes('12'),hours=shiftHours(date);if(st==='B')return 'Día de baja: prioriza descanso, hidratación y comidas adaptadas a tus necesidades y a las indicaciones sanitarias; no se presupone actividad física.';return work?`Turno de ${st==='M'?'mañana':st==='A'?'tarde':st==='N'?'noche':'trabajo'}${hours?' · '+hours:''}: prepara comida transportable y ajusta tus comidas a los descansos que realmente tengas. ${workday?'Puedes dejar raciones preparadas para después de un turno largo.':''}`:st==='V'?'Vacaciones: mantén horarios flexibles y comidas prácticas, sin necesidad de seguir el horario laboral.':'Día sin turno de trabajo registrado: puedes cocinar o preparar raciones para turnos próximos.'}
function saveFood(){let name=document.getElementById('mealMoment')?.value||'Otra',text=document.getElementById('mealDescription')?.value?.trim()||'',date=document.getElementById('foodDate')?.value||todayKey();if(!text)return alert('Escribe qué has comido o bebido.');if(!validDate(date))return alert('Fecha no válida');d.foodLog.push({date,moment:name,text,id:Date.now()+Math.random()});if(document.getElementById('usualMeal')?.checked&&!d.customMeals.some(x=>x.name===text))d.customMeals.push({name:text,slot:name});save();stamp('Comida guardada.');nutritionDate=date;render()}
function setSuggestedMeal(text,moment){const x=document.getElementById('mealDescription'),y=document.getElementById('mealMoment');if(x){x.value=text;y.value=moment;x.focus();x.scrollIntoView({behavior:'smooth',block:'center'})}}
function deleteFood(id){if(!confirm('¿Borrar esta comida registrada?'))return;d.foodLog=d.foodLog.filter(x=>String(x.id)!==String(id));save();render()}
function changeWater(amount){const k=todayKey();d.waterLog[k]=Math.max(0,(Number(d.waterLog[k])||0)+amount);save();render()}
function changeNutritionDate(date){if(!validDate(date))return;nutritionDate=date;nutritionFollowToday=(date===todayKey());render()}
function returnNutritionToday(){nutritionDate=todayKey();nutritionFollowToday=true;render()}
function refreshCurrentDay(){const now=todayKey();if(now===daySeen)return;
 const old=daySeen;daySeen=now;
 if(nutritionFollowToday||nutritionDate===old){nutritionDate=now;nutritionFollowToday=true}
 if(shoppingFollowThisWeek)shoppingWeek=mondayOf(now);
 if(page==='Inicio'||page==='Nutrición'||page==='Progreso')render();
}
function nutrition(){let date=nutritionDate,menu=menuFor(date),log=d.foodLog.filter(x=>x.date===date),water=Number(d.waterLog[todayKey()])||0;
 return `<section class="card"><h2>Nutrición · Tu plan de comidas</h2><p>Menú orientativo que cambia según la alimentación, los alimentos que quieres evitar, el tiempo de cocina y los turnos que registres.</p><label for="nutritionDay">Día del menú</label><input type="date" id="nutritionDay" value="${esc(date)}" onchange="changeNutritionDate(this.value)"><button class="secondary" type="button" onclick="returnNutritionToday()">Ver menú de hoy</button><p class="small">${esc(cap(niceDate(date)))}</p><p class="mini-note">${esc(mealNotice(date))}</p><p class="small">Biblioteca: ${NUTRI.recipes.length} propuestas; el menú se adapta a preferencias, turnos y presupuesto, y evita repetir exactamente las mismas recetas todos los días.</p><p>${esc(foodPlanGuidance())}</p><h3>Qué toca comer</h3>${menu.map(({slot,label,dish},i)=>`<div class="small-card"><strong>${i+1}. ${label}</strong>${dish?`<p>${esc(dish.name)}</p><p class="small">Ingredientes: ${dish.ing.map(esc).join(', ')} · ~${dish.mins} min · ${dish.tags.includes('portable')?'Apto para llevar según conservación':'Preparación doméstica'}</p><button class="secondary" onclick="swapSuggestedDish('${date}',${i})">Cambiar plato</button><button class="secondary" onclick="restoreSuggestedDish('${date}',${i})">Volver al sugerido</button><button class="secondary" onclick='setSuggestedMeal(${JSON.stringify(dish.name)},${JSON.stringify(label)})'>Añadir al registro</button>`:`<p class="warning">No hay sugerencias compatibles con todos los alimentos marcados. Revisa las restricciones o añade una alternativa segura manualmente.</p>`}</div>`).join('')}<details><summary>Ver el menú orientativo de los próximos 7 días</summary>${Array.from({length:7},(_,i)=>nextDate(date,i)).map(day=>`<div class="record"><strong>${esc(cap(niceDate(day)))}</strong><p class="small">${esc(shiftLabel(day))}</p>${menuFor(day).map(x=>`<p>${esc(x.label)}: ${x.dish?esc(x.dish.name):'Alternativa segura por definir'}</p>`).join('')}</div>`).join('')}</details>${NUTRI.warnings(nutritionProfile()).map(x=>`<p class="warning">${esc(x)}</p>`).join('')}<p class="small">Este menú es orientativo y no garantiza la ausencia de alérgenos ni cubre todas las necesidades nutricionales. Comprueba ingredientes y cantidades personalmente; en alergias graves, utiliza un plan supervisado.</p></section>
 ${shoppingSection()}
 <section class="card"><h2>Registrar comidas</h2><label for="foodDate">Fecha</label><input type="date" id="foodDate" value="${esc(date)}"><label for="mealMoment">Momento</label><select id="mealMoment">${['Desayuno','Media mañana','Comida','Merienda','Cena','Otra'].map(x=>`<option>${x}</option>`).join('')}</select><label for="mealDescription">¿Qué has comido?</label><textarea id="mealDescription" placeholder="Escribe alimentos, plato o bebida" rows="2"></textarea><label class="opt"><input type="checkbox" id="usualMeal">Guardar también como comida habitual</label><button class="primary" onclick="saveFood()">Guardar comida</button><h3>Registros de ${esc(niceDate(date,{day:'numeric',month:'long'}))}</h3>${log.length?log.slice().reverse().map(x=>`<div class="record"><strong>${esc(x.moment)}</strong><p>${esc(x.text)}</p><button class="secondary" onclick="deleteFood('${String(x.id)}')">Eliminar</button></div>`).join(''):'<p>Sin comidas registradas ese día.</p>'}${d.meals.length?`<details><summary>${d.meals.length} registros antiguos conservados</summary>${d.meals.slice(-12).reverse().map(x=>`<p>• ${esc(x.n)}: ${esc(x.t)}</p>`).join('')}</details>`:''}${d.customMeals.length?`<details><summary>Mis comidas habituales (${d.customMeals.length})</summary>${d.customMeals.map(x=>`<p>${esc(x.name)}</p>`).join('')}</details>`:''}</section>
 <section class="card"><h2>Agua de hoy</h2><div class="big">${(water/1000).toLocaleString('es-ES',{maximumFractionDigits:2})} L</div><p>${water} ml registrados hoy. Ajusta tu consumo a tus necesidades, actividad y recomendaciones médicas.</p>${d.water?`<p class="small">Tienes ${esc(d.water)} vasos sin fecha registrados en tu historial.</p>`:''}<div class="choice-line"><button class="primary" onclick="changeWater(250)">+250 ml</button><button class="secondary" onclick="changeWater(500)">+500 ml</button><button class="secondary" onclick="changeWater(-250)" ${water<=0?'disabled':''}>−250 ml</button></div><button class="secondary" onclick="go('Actualizar plan')">Cambiar preferencias alimentarias</button></section>`;
}
function saveCharacter(){const input=document.querySelector('#charName');if(input)d.character.name=input.value.trim().slice(0,20)||'Mi heroína';save();render()}
function unequipWings(){if(!d.character.choiceDone)return;d.character.equipped.wings='';save();render()}
function equip(id){if(!d.character.choiceDone)return;const g=gear.find(x=>x.id===id);if(!g||level()<g.level)return;d.character.equipped[g.slot]=id;save();render()}
function buyGear(id){equip(id)}
function missionKeyFor(h,date=todayKey()){return `habito:${date}:${h.id}`}
function legacyMissionKey(h,date=todayKey()){
 if(!Number.isInteger(h.legacyIndex)||h.legacyIndex<0)return '';
 const dt=new Date(`${date}T12:00:00`);
 return dt.toDateString()+h.legacyIndex;
}
function missionChecked(h){
 const k=missionKeyFor(h);
 if(Object.prototype.hasOwnProperty.call(d.done,k))return !!d.done[k];
 const old=legacyMissionKey(h);
 return !!(old&&d.done[old]);
}
function missions(){return `<section class="card"><h2>Misiones de hoy</h2><p>Completa tus hábitos cotidianos a tu ritmo. Puedes ajustarlos desde Ajustes.</p>${!d.habitCatalog.length?'<p>Sin hábitos por ahora. Añade uno desde Ajustes.</p>':''}${d.habitCatalog.map((h,i)=>`<label class="mission"><input type="checkbox" ${missionChecked(h)?'checked':''} onchange="mission(${i},this.checked)"><span>${esc(h.label)}</span><strong style="margin-left:auto;color:#f0ce91">+10 XP</strong></label>`).join('')}<button class="secondary" onclick="go('Ajustes')">Modificar mis hábitos</button></section>`}
function mission(i,on){
 const h=d.habitCatalog[i];if(!h)return;
 const was=missionChecked(h);if(was===on)return;
 d.done[missionKeyFor(h)]=on;
 const old=legacyMissionKey(h);if(old&&Object.prototype.hasOwnProperty.call(d.done,old))delete d.done[old];
 d.xp=on?d.xp+10:Math.max(0,d.xp-10);
 save();render();
}
function habitManager(){return `<section class="card" id="habit-manager"><h2>Modificar o añadir hábitos</h2><p>Estos hábitos aparecen como misiones diarias. Puedes cambiar sus nombres o crear otros nuevos.</p>${d.habitCatalog.map((h,i)=>`<div class="habit-editor"><label for="habit_${i}">Hábito ${i+1}</label><div class="flexrow"><input id="habit_${i}" maxlength="90" value="${esc(h.label)}" aria-label="Nombre del hábito ${i+1}"><button class="secondary" type="button" onclick="renameHabit(${i})">Guardar</button><button class="secondary" type="button" onclick="deleteHabit(${i})" aria-label="Eliminar hábito ${i+1}">Quitar</button></div></div>`).join('')}<label for="newHabit">Añadir un hábito</label><input id="newHabit" placeholder="Ej.: leer 10 minutos" maxlength="90"><button class="primary" type="button" onclick="addHabit()">Añadir hábito</button><p class="small">Puedes tener hasta 30 hábitos. Los registros históricos se conservan aunque quites uno.</p></section>`}
function renameHabit(i){const h=d.habitCatalog[i],el=document.getElementById('habit_'+i);if(!h||!el)return;let label=el.value.trim().slice(0,90);if(!label)return alert('Escribe un nombre para este hábito.');h.label=label;save();stamp('Hábito actualizado.');render()}
function deleteHabit(i){const h=d.habitCatalog[i];if(!h)return;if(!confirm(`¿Quitar «${h.label}» de tus misiones? Los registros anteriores se conservarán.`))return;d.habitCatalog.splice(i,1);save();render()}
function addHabit(){let x=document.getElementById('newHabit')?.value.trim().slice(0,90);if(!x)return;if(d.habitCatalog.length>=30)return alert('Puedes registrar hasta 30 hábitos.');const id='personal-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);d.habitCatalog.push({id,label:x,legacyIndex:-1});save();stamp('Hábito añadido a tus misiones.');render()}

// Estados cotidianos: un registro por fecha; se guarda con el resto de los datos locales.
const MOODS=[
 {id:'radiante',label:'Muy bien',icon:'✦',color:'#81d8ae',summary:'Muy bien',quotes:['Celebra lo que hoy te ha hecho bien. También es progreso darte cuenta.','Aprovecha esta buena energía sin exigirte más de lo necesario.','Guardar un recuerdo bonito de hoy puede ayudarte en días menos fáciles.'],advice:'Disfruta de este momento y conserva alguna de las cosas que te han sentado bien.'},
 {id:'bien',label:'Bien',icon:'☺',color:'#6dbfe6',summary:'Bien',quotes:['Un día tranquilo también es un día valioso.','La constancia se construye con pasos pequeños y posibles.','No hace falta llegar a todo para valorar lo conseguido.'],advice:'Mantén las rutinas sencillas que están funcionando y reserva espacio para descansar.'},
 {id:'regular',label:'Regular',icon:'◌',color:'#f2ce79',summary:'Regular',quotes:['No todos los días tienen que ser extraordinarios.','Hoy basta con elegir una cosa que te venga bien.','Puedes ajustar el ritmo sin dejar de cuidar de ti.'],advice:'Observa qué te ayuda y qué te desgasta; un pequeño ajuste puede marcar la diferencia.'},
 {id:'bajo',label:'Bajo de ánimo',icon:'☾',color:'#b69be8',summary:'Con el ánimo bajo',quotes:['Puedes ir más despacio hoy; cuidarte también cuenta.','No necesitas hacerlo todo. Prioriza lo esencial y descansa.','Un momento difícil no define todo tu camino.'],advice:'Prueba a reducir exigencias, buscar descanso y compartir cómo te sientes si te apetece.'},
 {id:'dificil',label:'Día difícil',icon:'♡',color:'#ee8e9f',summary:'Con días difíciles',quotes:['Hoy puedes hacer solo lo imprescindible. Mereces cuidado.','No tienes que convertir un día complicado en uno productivo.','Si lo necesitas, busca apoyo en alguien de confianza.'],advice:'Da prioridad al descanso y al apoyo que necesites. Si estos días se repiten o te desbordan, hablar con un profesional puede ayudarte.'}
];
const moodById=id=>MOODS.find(x=>x.id===id)||null;
// Las copias antiguas siguen siendo compatibles: no sobrescribir ningún dato previo.
d.moodLog=Object.fromEntries(Object.entries(d.moodLog).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&moodById(v)));
function moodQuote(mood,date){const n=Number(date.replaceAll('-',''));return mood.quotes[(n+mood.id.length)%mood.quotes.length]}
function setMood(id){if(!moodById(id))return;d.moodLog[todayKey()]=id;if(save())render()}
function moodTodayPanel(){const key=todayKey(),chosen=moodById(d.moodLog[key]);return `<section class="card mood-panel"><h2>¿Cómo te encuentras hoy?</h2><p>Elige la opción que mejor describa tu día. Puedes cambiarla cuando quieras.</p><div class="mood-options" role="group" aria-label="Estado de ánimo de hoy">${MOODS.map(m=>`<button type="button" class="mood-choice ${chosen?.id===m.id?'selected':''}" onclick="setMood('${m.id}')" aria-pressed="${chosen?.id===m.id}" style="--mood:${m.color}"><span class="mood-symbol" aria-hidden="true">${m.icon}</span><span>${esc(m.label)}</span></button>`).join('')}</div><div class="mood-quote" ${chosen?`style="--mood:${chosen.color}"`:''}><strong>${chosen?'Una frase para hoy':'Tu día, a tu ritmo'}</strong><p>${esc(chosen?moodQuote(chosen,key):'Tu estado de ánimo también forma parte de tu progreso. Elige cómo te encuentras hoy para ver una frase adaptada.')}</p></div><button type="button" class="secondary mood-link" onclick="go('Progreso')">Ver mi evolución mensual</button></section>`}
function changeMoodMonth(delta){const [y,m]=moodMonth.split('-').map(Number),date=new Date(y,m-1+delta,1,12);const next=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;if(next>todayKey().slice(0,7)||next<'2000-01')return;moodMonth=next;render()}
function moodMonthPanel(){const [y,m]=moodMonth.split('-').map(Number),first=new Date(y,m-1,1,12),days=new Date(y,m,0,12).getDate(),offset=(first.getDay()+6)%7;const entries=[];const cells=[];
 for(let i=0;i<offset;i++)cells.push('<span class="mood-empty" aria-hidden="true"></span>');
 for(let day=1;day<=days;day++){let date=`${moodMonth}-${String(day).padStart(2,'0')}`,mood=moodById(d.moodLog[date]);if(mood)entries.push({date,mood});cells.push(`<div class="mood-day ${date===todayKey()?'current':''}" aria-label="${day} de ${esc(first.toLocaleDateString('es-ES',{month:'long'}))}: ${mood?esc(mood.label):'Sin registrar'}" title="${day}: ${mood?esc(mood.label):'Sin registrar'}"><span class="mood-date">${day}</span><span class="mood-dot ${mood?'has-mood':''}" ${mood?`style="--mood:${mood.color}"`:''} aria-hidden="true"></span></div>`)}
 const counts=new Map(MOODS.map(x=>[x.id,0]));for(const v of entries)counts.set(v.mood.id,counts.get(v.mood.id)+1);
 const most=Math.max(0,...counts.values()),leaders=MOODS.filter(x=>most&&counts.get(x.id)===most),winner=leaders.length===1?leaders[0]:null;
 const verdict=!entries.length?'<strong>Sin registros este mes.</strong> Marca tu estado de ánimo en Inicio para empezar a ver cómo cambia.':winner?(entries.length===1?`<strong>En el día que has registrado este mes te has sentido ${esc(winner.summary.toLowerCase())}.</strong> ${esc(winner.advice)}`:`<strong>Este mes has estado sobre todo ${esc(winner.summary.toLowerCase())}</strong> entre los ${entries.length} días registrados (${most} ${most===1?'día':'días'}). ${esc(winner.advice)}`):`<strong>Este mes has tenido un ánimo variado.</strong> ${leaders.map(x=>esc(x.summary.toLowerCase())).join(' y ')} aparecen con la misma frecuencia entre los ${entries.length} días registrados. Puedes observar qué situaciones te ayudan a sentirte mejor.`;
 return `<section class="card mood-history"><div class="headrow"><h2>Mi estado de ánimo</h2><span class="pill">${entries.length} ${entries.length===1?'registro':'registros'}</span></div><p>Un punto de color por cada día registrado. Los círculos vacíos son días sin registro.</p><div class="mood-month-head"><button class="secondary" type="button" onclick="changeMoodMonth(-1)" aria-label="Mes anterior">‹</button><strong>${esc(first.toLocaleDateString('es-ES',{month:'long',year:'numeric'}))}</strong><button class="secondary" type="button" onclick="changeMoodMonth(1)" ${moodMonth>=todayKey().slice(0,7)?'disabled':''} aria-label="Mes siguiente">›</button></div><div class="mood-calendar" role="group" aria-label="Calendario mensual de estados de ánimo">${['L','M','X','J','V','S','D'].map(x=>`<span class="mood-weekname">${x}</span>`).join('')}${cells.join('')}</div><div class="mood-legend">${MOODS.map(x=>`<span class="mood-legend-item"><i style="background:${x.color}"></i>${esc(x.label)}</span>`).join('')}</div><div class="mood-month-summary" role="status">${verdict}</div><p class="field-note">El resumen describe únicamente los días registrados; no presupone cómo te encontraste en los demás.</p></section>`;
}

function home(){let day=Math.max(1,Math.min(66,dayDiff(todayKey(),d.start)+1)),train=trainingPlan(todayKey()),meals=menuFor(todayKey()),count=Object.values(d.done).filter(Boolean).length;
 return `<section class="card"><div class="headrow"><h2>Tu día en Reformándome</h2><span class="pill">Día ${day} de 66</span></div><div class="progress"><span style="width:${day/66*100}%"></span></div><div class="summary-squares"><div class="stat"><b>${d.xp}</b>XP acumulados</div><div class="stat"><b>${level()}</b>Nivel de heroína</div><div class="stat"><b>${count}</b>Misiones completadas</div><div class="stat"><b>${d.habitCatalog.filter(missionChecked).length}/${d.habitCatalog.length}</b>Hábitos de hoy</div></div><div class="choice-line"><button class="primary" onclick="go('Mi perfil')">♛ Ver mi heroína y mi perfil</button><button class="secondary" onclick="go('Actualizar plan')">Cambiar mi rutina</button></div></section>${moodTodayPanel()}
 <section class="card"><h2>Hoy · ${esc(niceDate(todayKey()))}</h2><span class="pill">${esc(shiftLabel(todayKey()))}</span><h3>Entrenamiento</h3><p><strong>${esc(train.title)}</strong> · ${esc(train.minutes)}</p><p>${esc(train.detail)}</p><button class="secondary" onclick="trainingDate=todayKey();go('Entreno')">Ver rutina de hoy</button><button class="secondary" onclick="go('Calendario')">Marcar turnos</button><h3>Comidas previstas</h3>${meals.map((x,i)=>`<p><strong>${esc(x.label)}:</strong> ${x.dish?esc(x.dish.name):'Define una alternativa segura'}</p>`).join('')}<button class="primary" onclick="nutritionDate=todayKey();go('Nutrición')">Ver menú, registrar comida y agua</button></section>
 <section class="card"><h2>Hábitos y seguimiento</h2><p>Las misiones son tus hábitos diarios. Elige objetivos realistas y revísalos cuando lo necesites.</p><div class="choice-line"><button class="secondary" onclick="go('Misiones')">Misiones de hoy</button><button class="secondary" onclick="go('Ajustes')">Modificar hábitos</button><button class="secondary" onclick="go('Progreso')">Registrar progreso</button></div></section>`;
}
function profile(){return `${characterProfile()}<section class="card"><h2>Mis datos y mi aventura</h2><div class="summary-squares"><div class="stat"><b>${esc(nval('age')??'—')}</b>Edad</div><div class="stat"><b>${esc(nval('height')??'—')} ${nval('height')?'cm':''}</b>Altura</div><div class="stat"><b>${esc(nval('weight')??'—')} ${nval('weight')?'kg':''}</b>Peso actual</div><div class="stat"><b>${esc(nval('targetWeight')??'—')} ${nval('targetWeight')?'kg':''}</b>Objetivo</div><div class="stat"><b>${level()}</b>Nivel</div></div><button class="primary" onclick="go('Actualizar plan')">Actualizar mis datos y preferencias</button><button class="secondary" onclick="go('Progreso')">Ver seguimiento y registrar peso</button></section>`}
function recordWeight(){let el=document.getElementById('newWeight'),date=document.getElementById('weightDate').value,n=Number((el?.value||'').replace(',','.'));if(!Number.isFinite(n)||n<30||n>350||!validDate(date))return alert('Introduce un peso válido en kg y una fecha válida.');d.weightLog.push({date,kg:n});d.weightLog.sort((a,b)=>a.date.localeCompare(b.date));d.answers.weight=String(n).replace('.',',');save();stamp('Peso registrado y plan actualizado.');render()}
let weightRange='all';
function weightPoints(){
 const byDate=new Map();
 for(const x of d.weightLog){if(!plain(x))continue;const kg=Number(x.kg);if(validDate(x.date)&&Number.isFinite(kg)&&kg>=30&&kg<=350)byDate.set(x.date,kg)}
 return [...byDate.entries()].map(([date,kg])=>({date,kg})).sort((a,b)=>a.date.localeCompare(b.date));
}
function selectedWeights(){const all=weightPoints();if(weightRange==='all')return all;const days=Number(weightRange);if(!Number.isFinite(days))return all;const cutoff=nextDate(todayKey(),-(days-1));return all.filter(x=>x.date>=cutoff)}
function weightChart(){
 const points=selectedWeights();
 if(!points.length)return `<div class="chart-empty"><p>Registra tu primer peso para comenzar la gráfica.</p></div>`;
 const W=700,H=320,L=58,R=26,T=26,B=52;
 const vals=points.map(x=>x.kg),low=Math.min(...vals),high=Math.max(...vals);
 const pad=Math.max(0.8,(high-low)*.22),yMin=Math.max(0,low-pad),yMax=high+pad;
 const y=v=>T+(H-T-B)*(1-(v-yMin)/(yMax-yMin));
 const start=Date.parse(points[0].date+'T12:00:00'),finish=Date.parse(points[points.length-1].date+'T12:00:00');
 const x=p=>start===finish?(L+(W-R-L)/2):L+(W-R-L)*((Date.parse(p.date+'T12:00:00')-start)/(finish-start));
 const coords=points.map(p=>[x(p),y(p.kg)]);
 const line=coords.map(([px,py])=>`${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
 let grid='';for(let i=0;i<=4;i++){let val=yMax-(yMax-yMin)*i/4;let yy=y(val);grid+=`<line x1="${L}" x2="${W-R}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#67567b" stroke-dasharray="4 6" opacity=".65"/><text x="${L-9}" y="${(yy+4).toFixed(1)}" text-anchor="end" fill="#e1d1dd" font-size="13">${val.toLocaleString('es-ES',{maximumFractionDigits:1})}</text>`}
 const target=Number(String(d.answers.targetWeight??'').replace(',','.'));
 const targetLine=Number.isFinite(target)&&target>=yMin&&target<=yMax?`<line x1="${L}" x2="${W-R}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}" stroke="#f0c778" stroke-width="2" stroke-dasharray="7 5"/><text x="${W-R-5}" y="${(y(target)-7).toFixed(1)}" text-anchor="end" fill="#f4d99b" font-size="12">Objetivo</text>`:'';
 const labels=[points[0],...(points.length>2?[points[Math.floor((points.length-1)/2)]]:[]),...(points.length>1?[points[points.length-1]]:[])];
 const dateLabels=[...new Map(labels.map(p=>[p.date,p])).values()].map(p=>`<text x="${x(p).toFixed(1)}" y="${H-18}" text-anchor="middle" fill="#e1d1dd" font-size="13">${p.date.slice(8)}/${p.date.slice(5,7)}/${p.date.slice(2,4)}</text>`).join('');
 const circles=points.map((p,i)=>`<circle cx="${coords[i][0].toFixed(1)}" cy="${coords[i][1].toFixed(1)}" r="5" fill="#f4d99b" stroke="#261b32" stroke-width="2"><title>${esc(p.date)} · ${p.kg.toLocaleString('es-ES')} kg</title></circle>`).join('');
 const delta=points.length>1?points[points.length-1].kg-points[0].kg:null;
 const difference=delta===null?'Un registro en el periodo':`Variación: ${delta>0?'+':''}${delta.toLocaleString('es-ES',{maximumFractionDigits:2})} kg entre el primer y último registro`;
 return `<figure class="weight-figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de variación del peso en kilos entre ${esc(points[0].date)} y ${esc(points[points.length-1].date)}"><title>Variación del peso registrado</title>${grid}${targetLine}${points.length>1?`<polyline points="${line}" fill="none" stroke="#d6abef" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`:''}${circles}${dateLabels}<text x="${L}" y="15" fill="#ebd2ee" font-size="13">kg</text></svg><figcaption>${esc(difference)}. ${points.length} ${points.length===1?'día':'días'} con registro.</figcaption></figure>`;
}
function setWeightRange(v){if(!['all','30','90'].includes(v))return;weightRange=v;render()}
function progress(){let recent=weightPoints().slice(-8).reverse(),goal=nval('targetWeight'),weight=nval('weight');return `<section class="card"><h2>Mi progreso</h2><div class="summary-squares"><div class="stat"><b>${d.xp}</b>XP</div><div class="stat"><b>${Object.values(d.trainingDone).filter(Boolean).length}</b>Sesiones realizadas</div><div class="stat"><b>${Object.values(d.done).filter(Boolean).length}</b>Misiones completadas</div><div class="stat"><b>${d.checkins.length}</b>Revisiones</div></div><h3>Peso y objetivos</h3><p>Peso actual: <strong>${weight?weight+' kg':'sin indicar'}</strong> · Objetivo: <strong>${goal?goal+' kg':'sin indicar'}</strong>.</p><h3>Variación del peso</h3><label for="weightRange">Periodo</label><select id="weightRange" onchange="setWeightRange(this.value)"><option value="all" ${weightRange==='all'?'selected':''}>Todo el historial</option><option value="90" ${weightRange==='90'?'selected':''}>Últimos 90 días</option><option value="30" ${weightRange==='30'?'selected':''}>Últimos 30 días</option></select>${weightChart()}<label for="weightDate">Fecha</label><input id="weightDate" type="date" value="${todayKey()}"><label for="newWeight">Peso (kg)</label><input id="newWeight" inputmode="decimal" placeholder="Ej.: 89,5"><button class="primary" onclick="recordWeight()">Registrar nuevo peso</button>${recent.length?`<details><summary>Historial de registros</summary><table class="tableish"><thead><tr><th>Fecha</th><th>Peso</th></tr></thead><tbody>${recent.map(x=>`<tr><td>${esc(niceDate(x.date,{day:'numeric',month:'short',year:'numeric'}))}</td><td>${x.kg.toLocaleString('es-ES')} kg</td></tr>`).join('')}</tbody></table></details>`:''}<h3>Revisión personal</h3><textarea id="checkNote" placeholder="Sueño, energía, ánimo, molestias, constancia…" rows="3"></textarea><button class="secondary" onclick="saveCheckin()">Guardar revisión</button>${d.checkins.slice(-5).reverse().map(x=>`<div class="record"><strong>${esc((x.date||'').slice(0,10))}</strong><p>${esc(x.text)}</p></div>`).join('')}</section>${moodMonthPanel()}`}
function saveCheckin(){let text=document.getElementById('checkNote')?.value.trim();if(!text)return alert('Escribe algo para guardar tu revisión.');d.checkins.push({date:new Date().toISOString(),text});save();render()}
function settings(){return `${habitManager()}${window.RECloud?.panel?.()||'<section class="card"><h2>Cuenta y sincronización</h2><p>La sincronización estará disponible cuando se configure el servidor de cuentas. Puedes seguir utilizando Reformándome sin cuenta y conservar tus copias JSON.</p></section>'}<section class="card"><h2>Ajustes</h2><label for="challengeStart">Fecha de comienzo del reto</label><input type="date" id="challengeStart" value="${esc(d.start)}"><button class="primary" onclick="let v=document.getElementById('challengeStart').value;if(validDate(v)){d.start=v;save();render()}">Guardar fecha</button><h3>Mis datos</h3><p>El progreso se guarda en este dispositivo. Si conectas una cuenta, también puedes sincronizarlo. Exporta una copia JSON para mayor seguridad.</p><button class="primary" onclick="backup()">Exportar copia de seguridad</button><label for="file">Restaurar copia de seguridad (JSON)</label><input type="file" id="file" accept=".json,application/json"><button class="secondary" onclick="restore()">Importar copia</button><details><summary>Restablecer la aplicación</summary><p>Esta opción elimina los datos guardados en este dispositivo, incluidos tu personaje y progreso.</p><button class="secondary" onclick="if(confirm('Esto borrará tu heroína, el cuestionario, el calendario y todo el progreso local. ¿Seguro?')){localStorage.removeItem(KEY);location.reload()}">Borrar todos mis datos</button></details></section>`}
function backup(){let blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=`reformandome-copia-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500)}
function restore(){const file=document.getElementById('file')?.files[0];if(!file)return alert('Selecciona una copia JSON.');if(file.size>8_000_000)return alert('La copia excede el límite admitido (8 MB).');let reader=new FileReader();reader.onload=()=>{try{let obj=JSON.parse(reader.result);if(!plain(obj)||!plain(obj.answers)||!plain(obj.done)||!plain(obj.character))throw new Error('Formato no reconocido');if(confirm('La copia reemplazará todos los datos locales actuales. ¿Continuar?')){localStorage.setItem(KEY,JSON.stringify(obj));location.reload()}}catch(e){alert('El archivo no parece una copia válida de Reformándome.')}};reader.readAsText(file)}
function go(p){if(!d.character.choiceDone)return;if(!d.setup.completed)return;page=tabs.includes(p)?p:'Inicio';render(true)}
function render(scroll=false){const nav=document.getElementById('nav'),app=document.getElementById('app'),mini=document.getElementById('miniChar');try{
 if(window.RECloud?.foreign?.()){nav.innerHTML='';mini.disabled=true;app.innerHTML=window.RECloud.foreignPanel();return}
 if(!d.character.choiceDone){mini.innerHTML='✦';mini.disabled=true;nav.innerHTML='';app.innerHTML=characterSelection()+(window.REFORMANDOME_CLOUD?.url&&window.RECloud?.panel?window.RECloud.panel():'');return}
 mini.disabled=false;mini.innerHTML=characterSmall();
 if(!d.setup.completed){nav.innerHTML='';app.innerHTML=setupWizard()+(window.REFORMANDOME_CLOUD?.url&&window.RECloud?.panel?window.RECloud.panel():'');if(scroll)window.scrollTo(0,0);return}
 nav.innerHTML=tabs.map(t=>`<button class="${t===page?'active':''}" type="button" onclick="go('${t}')">${TAB_ICONS[t]} ${esc(t)}</button>`).join('');
 let views={'Inicio':home,'Mi perfil':profile,'Calendario':calendar,'Entreno':training,'Nutrición':nutrition,'Misiones':missions,'Actualizar plan':updatePanel,'Progreso':progress,'Ajustes':settings};app.innerHTML=(flashMessage?`<div class="success-note">${esc(flashMessage)}</div>`:'')+(views[page]||home)();if(scroll)window.scrollTo(0,0);
 }catch(err){console.error('Render Reformándome:',err);nav.innerHTML=`<button type="button" onclick="page='Inicio';render()">Inicio</button><button type="button" onclick="page='Ajustes';render()">Ajustes</button>`;app.innerHTML=`<section class="card"><h2>No se ha podido abrir esta sección</h2><p>Tu progreso sigue guardado. Pulsa Inicio o exporta una copia desde Ajustes.</p><button class="primary" onclick="page='Inicio';render()">Volver a Inicio</button></section>`;}}
// Guardado inmediato de entradas del cuestionario inicial y de la sección de cambios.
document.addEventListener('input',e=>{if(e.target?.dataset?.q!==undefined){d.answers[e.target.dataset.q]=e.target.value;save()}});
document.addEventListener('change',e=>{if(e.target?.dataset?.q!==undefined){d.answers[e.target.dataset.q]=e.target.value;save()}if(e.target?.dataset?.multi!==undefined)onAnswer(e.target,true);if(e.target?.dataset?.single!==undefined)onAnswer(e.target,false)});
render();
setInterval(refreshCurrentDay,60000);
addEventListener('focus',refreshCurrentDay);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCurrentDay()});
if('serviceWorker' in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!sessionStorage.getItem('reformandome-v31-once')){sessionStorage.setItem('reformandome-v31-once','1');location.reload()}});
 addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=31-lista-compra',{updateViaCache:'none'}).then(r=>r.update()).catch(e=>console.warn('Caché sin conexión no disponible',e)));
}
