'use strict';
const KEY='reformandome_rpg_v3'; // Misma clave de datos que la v24
const todayKey=()=>{const x=new Date();return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const blank={start:todayKey(),answers:{},done:{},xp:0,coins:0,meals:[],water:0,habits:['Beber agua','Moverme un poco','Comer con atención','Preparar el descanso'],checkins:[],shift:{start:todayKey(),sequence:'TTLL',pattern:'Manual/personalizado',autoPattern:false},shiftDays:{},waterLog:{},foodLog:[],weightLog:[],trainingDone:{},habitDone:{},customMeals:[],setup:{completed:false,completedAt:null}};
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
for(const k of ['shiftDays','waterLog','trainingDone','habitDone'])d[k]=plain(incoming[k])?incoming[k]:{};
for(const k of ['foodLog','weightLog','meals','checkins','habits','customMeals'])d[k]=Array.isArray(incoming[k])?incoming[k]:blank[k].slice();
d.setup={...blank.setup,...(plain(incoming.setup)?incoming.setup:{})};
d.xp=Math.max(0,Number(d.xp)||0);d.coins=Math.max(0,Number(d.coins)||0);
if(!/^\d{4}-\d{2}-\d{2}$/.test(d.start||''))d.start=todayKey();
let page='Inicio',step=0,calendarMonth=todayKey().slice(0,7),calendarBrush='T',nutritionDate=todayKey(),trainingDate=todayKey(),importPreview=null,flashMessage='';
const tabs=['Inicio','Mi perfil','Calendario','Entreno','Nutrición','Misiones','Actualizar plan','Progreso','Hábitos','Ajustes'];
const TAB_ICONS={'Inicio':'⌂','Mi perfil':'♛','Calendario':'▦','Entreno':'◇','Nutrición':'♧','Misiones':'✦','Actualizar plan':'⚙','Progreso':'↗','Hábitos':'☼','Ajustes':'⚑'};
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
['rewards','¿Qué recompensas te motivan?',['Logros y niveles','Monedas virtuales','Ocio planificado','Estadísticas y rachas','No necesito recompensas']],
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
function save(){try{localStorage.setItem(KEY,JSON.stringify(d));return true}catch(e){alert('No se pudo guardar. Comprueba el espacio del navegador y exporta una copia de seguridad.');return false}}
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
 return `<section class="card selection-card"><h2>✦ Elige tu heroína</h2><p>Esta elección es independiente del cuestionario de bienestar. El color del cabello que elijas será el de todos los trajes y alas que desbloquees en tu aventura.</p><div class="cn-picker">${COLORS.map(([id,label])=>`<button type="button" class="cn-pick" onclick="chooseCharacter('${id}')"><img src="./cn_${id}_basica_sin_alas.webp" alt="Heroína de pelo ${label.toLowerCase()} con vestimenta Básica"><strong>${label}</strong><span>Elegir esta heroína</span></button>`).join('')}</div><p class="small">Empezarás con Básica, sin alas. Las otras opciones se desbloquean al subir de nivel. El resto de tu progreso se conserva.</p></section>`;
}
function characterSmall(){return d.character.choiceDone?`<div class="cn-mini">${characterArt()}</div>`:'<span aria-hidden="true">✦</span>'}
function characterCard(){
 let c=d.character;return `<div class="hero-character"><div class="avatar-large">${characterArt()}</div><div class="hero-info"><h2>${esc(c.name||'Mi heroína')}</h2><p>Pelo ${COLORS.find(x=>x[0]===fixedColor())[1]} · Color elegido al empezar</p><p>Nivel ${level()} · ${d.xp} XP</p><div class="progress"><span style="width:${d.xp%100}%"></span></div><p class="coin">🪙 ${d.coins} monedas</p></div></div>`;
}
function characterProfile(){
 const c=d.character,eq=c.equipped||{};
 return `${characterCard()}<section class="card"><h2>Tu heroína</h2><p>Tu color de cabello es <strong>${COLORS.find(x=>x[0]===fixedColor())[1]}</strong>. Todos los atuendos y las alas que consigas conservarán este mismo cabello. No hay piezas superpuestas: cada combinación es una ilustración completa.</p><label>Nombre de tu heroína</label><input id="charName" maxlength="20" value="${esc(c.name)}" placeholder="Nombre de tu heroína"><button class="primary" onclick="saveCharacter()">Guardar nombre</button></section><section class="card"><h2>Vestimentas desbloqueables</h2><div class="cn-equipment">${gear.filter(g=>g.slot==='armor').map(g=>{let unlocked=level()>=g.level,on=eq.armor===g.id;return `<div class="cn-eq ${on?'equipped':''}"><img loading="lazy" src="./cn_${fixedColor()}_${OUTFITS[g.id]}_sin_alas.webp" alt="${g.name} con pelo ${fixedColor()}"><div><strong>${g.name}</strong><p>${g.desc}</p><p>${unlocked?on?'✓ Equipado':'Disponible':'🔒 Nivel '+g.level}</p><button class="${on?'secondary':'primary'}" ${!unlocked||on?'disabled':''} onclick="equip('${g.id}')">${on?'Equipado':unlocked?'Equipar':'Bloqueado'}</button></div></div>`}).join('')}</div></section><section class="card"><h2>Alas desbloqueables</h2><p>Comienzas sin alas. Puedes equiparlas o quitarlas cuando quieras.</p><button class="secondary" onclick="unequipWings()" ${!eq.wings?'disabled':''}>Sin alas</button><div class="cn-equipment">${gear.filter(g=>g.slot==='wings').map(g=>{let unlocked=level()>=g.level,on=eq.wings===g.id;return `<div class="cn-eq ${on?'equipped':''}"><img loading="lazy" src="./cn_${fixedColor()}_basica_${WING_TYPES[g.id]}.webp" alt="${g.name}"><div><strong>${g.name}</strong><p>${g.desc}</p><p>${unlocked?on?'✓ Equipadas':'Disponibles':'🔒 Nivel '+g.level}</p><button class="${on?'secondary':'primary'}" ${!unlocked||on?'disabled':''} onclick="equip('${g.id}')">${on?'Equipadas':unlocked?'Equipar':'Bloqueadas'}</button></div></div>`}).join('')}</div></section>`;
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
function setupWizard(){let section=qs[step];return `<section class="card"><h2>✦ Personaliza tu aventura</h2><p>Solo tendrás que rellenar este cuestionario al comenzar. Las respuestas son opcionales: el plan se adaptará a lo que indiques. Más adelante podrás actualizar los datos importantes en <strong>Actualizar plan</strong>.</p><div class="q-progress">${qs.map((q,i)=>`<span class="${i<=step?'on':''}"></span>`).join('')}</div><p class="small">Apartado ${step+1} de ${qs.length}</p><h2>${esc(section[0])}</h2><p>${esc(section[1])}</p>${section[2].map(question).join('')}<div class="choice-line"><button type="button" class="secondary" onclick="changeStep(-1)" ${step===0?'disabled':''}>Atrás</button><button type="button" class="primary" onclick="${step===qs.length-1?'finishSetup()':'changeStep(1)'}">${step===qs.length-1?'Terminar y crear mi plan':'Siguiente'}</button><button type="button" class="secondary" onclick="${step===qs.length-1?'finishSetup()':'changeStep(1)'}">${step===qs.length-1?'Finalizar':'Omitir apartado'}</button></div><p class="mini-note">No compartimos tus respuestas con ningún servidor; se guardan en este dispositivo.</p></section>`}
function updateQuestions(keys){let all=qs.flatMap(g=>g[2]);return keys.map(k=>all.find(x=>x[0]===k)).filter(Boolean).map(question).join('')}
function updatePanel(){return `<section class="card"><h2>Actualizar mi plan</h2><p>Este apartado sustituye al cuestionario permanente. Puedes corregir datos, horarios, nivel, molestias o comidas cuando cambie tu situación. Los planes se recalculan al guardar.</p><details open><summary>Trabajo, turnos y energía</summary>${updateQuestions(['work','energy','besttime','sleep','pattern'])}<p class="field-note">Los días concretos de trabajo y descanso se marcan en <strong>Calendario</strong>.</p></details><details><summary>Entrenamiento y disponibilidad</summary>${updateQuestions(['activity','experience','days','minutes','place','equipment','avoid','pain','paindetail','clearance'])}</details><details><summary>Nutrición, alergias y preferencias</summary>${updateQuestions(['meals','diet','allergies','intolerances','dislikesfood','likesfood','budget','cook','digestive','triggers'])}</details><details><summary>Peso, datos básicos y objetivos</summary>${updateQuestions(['age','height','weight','targetWeight','goalTimeline','goals','priority'])}<p class="small">Para llevar un historial del peso, utiliza el registro de Progreso.</p></details><details><summary>Salud y otras circunstancias</summary>${updateQuestions(['conditions','restrictions','stress','waterhabit','extra'])}</details><button class="primary" type="button" onclick="applyUpdates()">Guardar cambios y actualizar planes</button><button class="secondary" type="button" onclick="go('Entreno')">Ver entrenamiento</button><button class="secondary" type="button" onclick="go('Nutrición')">Ver menú</button><p class="small">No se modifica la heroína, su color de pelo ni sus desbloqueos.</p></section>`}
function applyUpdates(){if(!metricsValid()){render();return}save();stamp('Cambios guardados. Los planes se han actualizado.');render(true)}
const SHIFT_NAMES={T:'Trabajo',L:'Libre',N:'Noche',V:'Vacaciones'};
function shiftOf(date){
 if(d.shiftDays[date])return d.shiftDays[date];
 if(d.shift.autoPattern&&/^[TLNV]+$/i.test(d.shift.sequence||'')&&/^\d{4}-\d{2}-\d{2}$/.test(d.shift.start||'')){
  let seq=d.shift.sequence.toUpperCase();let idx=((dayDiff(date,d.shift.start)%seq.length)+seq.length)%seq.length;return seq[idx];
 }
 return null;
}
function shiftLabel(date){return SHIFT_NAMES[shiftOf(date)]||'Sin marcar'}
function moveMonth(delta){let [y,m]=calendarMonth.split('-').map(Number);let x=new Date(y,m-1+delta,1);calendarMonth=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`;render()}
function markDay(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;if(calendarBrush==='clear'){delete d.shiftDays[date];save();render();return}if(d.shiftDays[date]===calendarBrush)delete d.shiftDays[date];else d.shiftDays[date]=calendarBrush;save();render()}
function shiftBrushSet(x){if(!['T','L','N','V','clear'].includes(x))return;calendarBrush=x;render()}
function patternSave(){let start=document.getElementById('patternDate').value,seq=document.getElementById('patternSequence').value.toUpperCase().replace(/\s/g,''),enabled=document.getElementById('patternEnabled').checked;
 if(enabled&&!/^\d{4}-\d{2}-\d{2}$/.test(start))return alert('Introduce la fecha de referencia.');if(enabled&&!/^[TLNV]{1,62}$/.test(seq))return alert('Usa solo T, L, N o V (hasta 62 días).');
 d.shift.start=start;d.shift.sequence=seq;d.shift.autoPattern=enabled;save();stamp('Patrón actualizado. Las fechas marcadas manualmente tienen prioridad.');render();}
function calendar(){let [yy,mm]=calendarMonth.split('-').map(Number),date=new Date(yy,mm-1,1),offset=(date.getDay()+6)%7,days=new Date(yy,mm,0).getDate();
 let cells=Array.from({length:offset},()=>'<div class="cal-cell blank" aria-hidden="true"></div>');
 for(let day=1;day<=days;day++){let key=`${calendarMonth}-${String(day).padStart(2,'0')}`,st=shiftOf(key),cl=st==='T'?'work':st==='N'?'night':st==='L'?'free':st==='V'?'holiday':'';cells.push(`<button type="button" class="cal-cell ${cl} ${key===todayKey()?'today':''}" onclick="markDay('${key}')" title="${esc(niceDate(key))} · ${shiftLabel(key)}"><span class="day-number">${day}</span><em>${st||'·'}</em></button>`)}
 return `<section class="card"><h2>Calendario de turnos</h2><p>Marca cada fecha como trabajo, libre, noche o vacaciones. Las rutinas y las sugerencias de comida se adaptarán automáticamente a los días indicados.</p><div class="calendar-head"><button class="secondary" onclick="moveMonth(-1)" aria-label="Mes anterior">◀</button><h2>${cap(niceDate(calendarMonth+'-01',{month:'long',year:'numeric'}))}</h2><button class="secondary" onclick="moveMonth(1)" aria-label="Mes siguiente">▶</button></div><div class="calendar-week">${['L','M','X','J','V','S','D'].map(x=>`<strong>${x}</strong>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div><h3>Elige qué vas a pintar</h3><div class="choice-line">${[['T','Trabajo'],['L','Libre'],['N','Noche'],['V','Vacaciones']].map(([code,name])=>`<button class="${calendarBrush===code?'primary':'secondary'}" onclick="shiftBrushSet('${code}')">${code} · ${name}</button>`).join('')}<button class="${calendarBrush==='clear'?'primary':'secondary'}" onclick="shiftBrushSet('clear')">Borrar</button></div><p class="small">Al tocar una fecha se le asigna el tipo seleccionado. Vuelve a tocarla para dejarla en blanco. Las fechas sin marcar no se supondrán trabajadas.</p>${importPreview?importPanel():''}</section>
 <section class="card"><h2>Importar calendario</h2><p>Puedes seleccionar un archivo <strong>.ics</strong> o <strong>.csv</strong> exportado de una aplicación de turnos, siempre que contenga fechas y etiquetas comprensibles. No requiere conectar tus cuentas.</p><input id="shiftFile" type="file" accept=".ics,.csv,.txt,text/calendar,text/csv,text/plain"><button class="primary" onclick="prepareImport()">Revisar archivo antes de importarlo</button><button class="secondary" onclick="downloadShiftTemplate()">Descargar modelo CSV</button><p class="small">No se interpretan capturas, PDF ni archivos de copia de seguridad propietarios. No todas las versiones de Shifter permiten exportar los turnos a estos formatos.</p></section>
 <section class="card"><h2>Patrón opcional</h2><p>Si tu cuadrante se repite, puedes activar una secuencia (por ejemplo TTLL). El calendario seguirá permitiendo excepciones manuales.</p><label>Fecha del primer día de la secuencia</label><input type="date" id="patternDate" value="${esc(d.shift.start||todayKey())}"><label>Secuencia (T, L, N, V)</label><input id="patternSequence" value="${esc(d.shift.sequence||'TTLL')}" maxlength="62"><label class="opt"><input type="checkbox" id="patternEnabled" ${d.shift.autoPattern?'checked':''}>Activar repetición automática</label><button class="primary" onclick="patternSave()">Guardar patrón</button><p class="small">Si no activas la repetición, el mes queda en blanco hasta que introduzcas turnos.</p></section>`;
}
// ICS y CSV: leer solo archivos locales, mostrar una previsualización antes de modificar el calendario.
function classifyShift(raw){let s=String(raw||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(!s)return null;
 if(/^(l|libre|descanso|descans[ao]|off|free|rest|festivo|dia libre|dia de descanso)$/.test(s)||/\b(lib[re]+|descans[oa]|vacaciones|vacation|holiday|off duty)\b/.test(s))return /vacacion|vacation|holiday/.test(s)?'V':'L';
 if(/^(n|noche|nocturno)$/.test(s)||/\b(turno nocturno|guardia nocturna|noche|night shift)\b/.test(s))return 'N';
 if(/^(t|trabajo|turno|guardia|m|manana|tarde|morning|afternoon|work|day shift)$/.test(s)||/\b(trabajo|turno|guardia|jornada|trabaj|shift|manana|tarde)\b/.test(s))return 'T';
 return null;
}
function parseShiftDate(value){let s=String(value||'').trim().replace(/^"|"$/g,'');let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m){let r=`${m[1]}-${m[2]}-${m[3]}`;return validDate(r)?r:null}m=s.match(/^(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})/);if(m){let r=`${m[3]}-${m[2]}-${m[1]}`;return validDate(r)?r:null}m=s.match(/^(\d{4})(\d{2})(\d{2})(?:T|$)/);if(m){let r=`${m[1]}-${m[2]}-${m[3]}`;return validDate(r)?r:null}return null}
function validDate(k){return /^\d{4}-\d{2}-\d{2}$/.test(k)&&localDate(k).getFullYear()===+k.slice(0,4)&&localDate(k).getMonth()+1===+k.slice(5,7)&&localDate(k).getDate()===+k.slice(8,10)}
function parseICS(txt){let unfolded=txt.replace(/\r\n/g,'\n').replace(/\n[ \t]/g,'');let out=[];for(const block of unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)){
 let props={};for(let line of block[1].split('\n')){let i=line.indexOf(':');if(i<0)continue;let key=line.slice(0,i).split(';')[0].toUpperCase();if(!props[key])props[key]=line.slice(i+1).replace(/\\,/g,',').replace(/\\n/g,' ')}
 let dt=parseShiftDate(props.DTSTART),code=classifyShift(props.SUMMARY);if(dt&&code)out.push({date:dt,code,label:props.SUMMARY})}return out}
function parseCSVRows(txt){let rows=[],row=[],cell='',quote=false;for(let i=0;i<txt.length;i++){let c=txt[i];if(c==='"'){if(quote&&txt[i+1]==='"'){cell+='"';i++}else quote=!quote}else if(!quote&&(c===';'||c===','||c==='\t')){row.push(cell.trim());cell=''}else if(!quote&&(c==='\n'||c==='\r')){if(c==='\r'&&txt[i+1]==='\n')i++;row.push(cell.trim());if(row.some(x=>x))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell.trim());if(row.some(x=>x))rows.push(row);return rows}
function parseCSV(txt){let rows=parseCSVRows(txt.replace(/^\uFEFF/,''));if(!rows.length)return [];
 let norm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();let headers=rows[0].map(norm);let di=headers.findIndex(x=>/^(fecha|date|dia|day|inicio|start)$/.test(x));let si=headers.findIndex(x=>/^(tipo|turno|shift|estado|status|evento|event|nombre|summary|descripcion)$/.test(x));let from=di>=0&&si>=0?1:0;if(di<0)di=0;if(si<0)si=1;
 return rows.slice(from).map(r=>({date:parseShiftDate(r[di]),code:classifyShift(r[si]),label:r[si]})).filter(x=>x.date&&x.code)}
function prepareImport(){const el=document.querySelector('#shiftFile'),f=el?.files?.[0];if(!f)return alert('Selecciona un archivo .ics o .csv.');if(f.size>2_000_000)return alert('El archivo es demasiado grande para una importación local (máximo 2 MB).');const reader=new FileReader();reader.onload=()=>{try{let content=String(reader.result||''),isIcs=/BEGIN:VCALENDAR|BEGIN:VEVENT/.test(content)||/\.ics$/i.test(f.name);let parsed=isIcs?parseICS(content):parseCSV(content);let map=new Map();parsed.forEach(x=>map.set(x.date,x));importPreview=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));render();if(!importPreview.length)alert('No se reconocieron turnos con fecha y tipo. Revisa si el archivo es ICS/CSV con etiquetas de trabajo, libre, noche o vacaciones.')}catch(e){alert('No se pudo analizar el archivo.') }};reader.readAsText(f)}
function importPanel(){let p=importPreview||[];return `<div class="small-card"><h3>Previsualización de importación</h3><p>${p.length} fecha(s) reconocida(s). No se aplicará ninguna hasta que confirmes.</p>${p.slice(0,10).map(x=>`<p class="small">${esc(x.date)} — ${esc(SHIFT_NAMES[x.code])} (${esc(x.label)})</p>`).join('')}${p.length>10?'<p class="small">…y más fechas.</p>':''}<div class="choice-line"><button class="primary" onclick="confirmImport()" ${p.length?'':'disabled'}>Importar turnos</button><button class="secondary" onclick="importPreview=null;render()">Cancelar</button></div></div>`}
function confirmImport(){if(!importPreview?.length)return;if(!confirm(`Se aplicarán ${importPreview.length} fechas. Si ya tienes una marca manual en alguna de ellas, se sustituirá. ¿Continuar?`))return;for(const x of importPreview)d.shiftDays[x.date]=x.code;let n=importPreview.length;importPreview=null;save();stamp(`${n} turnos importados. El plan se ha actualizado.`);render()}
function downloadShiftTemplate(){let b=new Blob(['fecha;turno\n2026-12-01;Trabajo\n2026-12-02;Libre\n2026-12-03;Noche\n'],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='modelo-turnos-reformandome.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function sessionQuota(){const s=selectValue('days','3 días');let m=s.match(/^[2345]/);return m?+m[0]:3}
function physicalRisk(){let pain=many('pain');let conditions=many('conditions');let consent=selectValue('clearance');let severe=pain.includes('Dolor intenso o limitante');let cardiac=conditions.includes('Hipertensión/cardiopatía');let restricted=consent==='Necesito consultarlo'||consent==='Sí, con restricciones';return {severe,restricted,cardiac,hold:severe||consent==='Necesito consultarlo'||(cardiac&&consent!=='Sí, sin restricciones'),notes:[...(severe?['Has indicado dolor intenso o limitante: consulta antes de iniciar ejercicios de fuerza.']:[]),...(restricted?['Respeta las restricciones indicadas por tu profesional sanitario; esta app no puede evaluarlas.']:[]),...(cardiac?['Si existe una afección cardiovascular, confirma con tu equipo sanitario qué intensidad de ejercicio es segura.']:[])]}}
function monday(date){let x=localDate(date),w=(x.getDay()+6)%7;x.setDate(x.getDate()-w);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function afterNight(date){return shiftOf(nextDate(date,-1))==='N'}
function weekSessions(anyDay){let mon=monday(anyDay),quota=sessionQuota();let candidates=[];for(let i=0;i<7;i++){let k=nextDate(mon,i),shift=shiftOf(k);if(shift==='T'||shift==='N'||afterNight(k))continue;candidates.push({date:k,i,priority:shift==='L'||shift==='V'?2:1})}
 // Distribuir fuerzas por la semana y priorizar libres confirmados (si los hay).
 let selected=[];for(const threshold of [2,1])for(const gap of [2,1])for(const c of candidates){if(selected.length>=quota)break;if(c.priority<threshold||selected.some(x=>x.date===c.date))continue;if(selected.every(x=>Math.abs(c.i-x.i)>=gap))selected.push(c)}
 return selected.sort((a,b)=>a.date.localeCompare(b.date)).map(x=>x.date)
}
function trainingPlan(date){let sh=shiftOf(date),risk=physicalRisk(),worked=sh==='T'||sh==='N',after=afterNight(date),xpWeek=Math.max(1,Math.floor((dayDiff(date,d.start))/7)+1),days=weekSessions(date),idx=days.indexOf(date),levelAnswer=selectValue('experience','Principiante');
 const lowEnergy=['Agotada, necesito recuperar'].includes(selectValue('energy'))||['Menos de 5','5–6'].includes(selectValue('sleep')),busy=worked||after;
 if(risk.hold)return {kind:'precaucion',title:'Ejercicio pendiente de valoración',minutes:'—',detail:'Evita empezar una rutina de fuerza o intensificar el ejercicio sin aclarar antes las restricciones o el dolor referido.',exercises:[],notes:risk.notes};
 if(after)return {kind:'descanso',title:'Descanso tras noche',minutes:'Según recuperación',detail:'Prioriza descansar y recuperar sueño. Si te encuentras bien, un paseo muy suave o movilidad ligera es opcional.',exercises:[],notes:[]};
 if(busy)return {kind:'suave',title:sh==='N'?'Turno de noche: recuperar':'Turno de trabajo: sesión corta',minutes:lowEnergy?'5–10 min':'10–15 min',detail:'El día de trabajo no exige entrenamiento fuerte. Hazlo solo si te encuentras con energía suficiente.',exercises:['Caminar suave 5–10 min, si te apetece','Movilidad cómoda de hombros y tobillos 3–5 min','Descanso e hidratación'],notes:[]};
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
function training(){let chosen=trainingDate,p=trainingPlan(chosen),isDone=!!d.trainingDone[chosen],today=todayKey();let next=Array.from({length:7},(_,i)=>nextDate(today,i));
 return `<section class="card"><h2>Tu entrenamiento</h2><p>El plan se calcula con tus respuestas, tu experiencia y los días del calendario. Prioriza fuerza en días libres y recuperación en turnos largos.</p><div class="timeline">${next.map(k=>`<button class="${k===chosen?'current':''}" onclick="trainingDate='${k}';render()">${niceDate(k,{weekday:'short'})}<br>${k.slice(-2)}<br>${shiftOf(k)||'·'}</button>`).join('')}</div><label for="trainingDate">Ver otro día</label><input id="trainingDate" type="date" value="${esc(chosen)}" onchange="trainingDate=this.value;render()"><div class="small-card"><h3>${esc(cap(niceDate(chosen)))}</h3><span class="pill">${esc(shiftLabel(chosen))}</span><span class="pill">${esc(p.minutes)}</span><h2>${esc(p.title)}</h2><p>${esc(p.detail)}</p>${p.exercises.length?`<ol>${p.exercises.map(x=>`<li style="margin:8px 0">${esc(x)}</li>`).join('')}</ol>`:''}${p.notes.map(n=>`<p class="warning">${esc(n)}</p>`).join('')}${p.kind==='fuerza'?`<button class="${isDone?'secondary':'primary'}" onclick="toggleTraining('${chosen}')">${isDone?'✓ Sesión completada (desmarcar)':'Marcar entrenamiento completado · +20 XP'}</button>`:''}</div><p class="small">Sugerencia automatizada de bienestar. No sustituye a profesionales sanitarios ni detecta todas las contraindicaciones. Los turnos sin definir generan una distribución provisional.</p></section>
 <section class="card"><h2>Esta semana</h2>${Array.from({length:7},(_,i)=>nextDate(monday(chosen),i)).map(k=>{let t=trainingPlan(k);return `<div class="plan-day"><button class="secondary" onclick="trainingDate='${k}';render()">${cap(niceDate(k,{weekday:'short',day:'numeric'}))} · ${esc(t.title)}</button><span class="pill">${esc(shiftOf(k)||'?')}</span></div>`}).join('')}<button class="secondary" onclick="go('Actualizar plan')">Cambiar nivel o disponibilidad</button><button class="secondary" onclick="go('Calendario')">Editar turnos</button></section>`;
}
function toggleTraining(date){let was=!!d.trainingDone[date];if(was){delete d.trainingDone[date];d.xp=Math.max(0,d.xp-20);d.coins=Math.max(0,d.coins-2)}else{d.trainingDone[date]=true;d.xp+=20;d.coins+=2}save();render()}
// Menús simples con lista de ingredientes explícita para poder filtrar preferencias.
const DISHES={
 desayuno:[
  {name:'Avena con plátano, canela y bebida de avena',ing:['avena','plátano','canela','bebida de avena'],diet:'vegan',mins:10},
  {name:'Tostada integral con aceite de oliva y fruta',ing:['pan integral','aceite de oliva','fruta'],diet:'vegan',mins:5},
  {name:'Yogur natural sin lactosa, avena y pera',ing:['yogur sin lactosa','avena','pera'],diet:'veg',mins:5},
  {name:'Tortilla francesa y tostada integral',ing:['huevo','pan integral','aceite de oliva'],diet:'veg',mins:12},
  {name:'Porridge de copos de avena con manzana',ing:['avena','bebida de avena','manzana'],diet:'vegan',mins:10},
  {name:'Pan integral con hummus suave y pepino',ing:['pan integral','garbanzos','pepino'],diet:'vegan',mins:8}
 ],
 comida:[
  {name:'Arroz con pollo, calabacín y zanahoria',ing:['arroz','pollo','calabacín','zanahoria'],diet:'omni',mins:30},
  {name:'Pavo con patata cocida y judías verdes',ing:['pavo','patata','judías verdes'],diet:'omni',mins:30},
  {name:'Lentejas suaves con arroz y verduras',ing:['lentejas','arroz','zanahoria','calabacín'],diet:'vegan',mins:30},
  {name:'Garbanzos con quinoa y calabacín',ing:['garbanzos','quinoa','calabacín'],diet:'vegan',mins:25},
  {name:'Tofu con arroz y zanahoria',ing:['tofu','arroz','zanahoria'],diet:'vegan',mins:20},
  {name:'Merluza al horno con patata y judías verdes',ing:['merluza','patata','judías verdes'],diet:'fish',mins:30},
  {name:'Pasta integral con pollo y espinacas',ing:['pasta','pollo','espinacas'],diet:'omni',mins:25},
  {name:'Arroz salteado con huevo y verduras suaves',ing:['arroz','huevo','calabacín','zanahoria'],diet:'veg',mins:20},
  {name:'Ensalada templada de patata y alubias',ing:['patata','alubias','zanahoria','aceite de oliva'],diet:'vegan',mins:20},
  {name:'Bol de arroz precocido con garbanzos de bote y zanahoria',ing:['arroz','garbanzos','zanahoria'],diet:'vegan',mins:12},
  {name:'Ensalada templada rápida de alubias y patata cocida',ing:['alubias','patata','aceite de oliva'],diet:'vegan',mins:12}
 ],
 cena:[
  {name:'Crema de calabaza y garbanzos',ing:['calabaza','garbanzos','patata'],diet:'vegan',mins:25},
  {name:'Tortilla de calabacín con pan integral',ing:['huevo','calabacín','pan integral'],diet:'veg',mins:20},
  {name:'Pollo a la plancha con zanahoria y arroz',ing:['pollo','zanahoria','arroz'],diet:'omni',mins:20},
  {name:'Sopa de verduras con arroz y tofu',ing:['arroz','zanahoria','tofu','calabacín'],diet:'vegan',mins:22},
  {name:'Merluza a la plancha con calabaza',ing:['merluza','calabaza'],diet:'fish',mins:20},
  {name:'Puré de verduras con pavo',ing:['pavo','calabaza','zanahoria','patata'],diet:'omni',mins:25},
  {name:'Ensalada templada de quinoa y garbanzos',ing:['quinoa','garbanzos','calabacín'],diet:'vegan',mins:20},
  {name:'Bol rápido de arroz, verduras cocidas y tofu',ing:['arroz','calabacín','tofu'],diet:'vegan',mins:12},
  {name:'Crema de calabaza preparada con tostada y aceite',ing:['calabaza','pan integral','aceite de oliva'],diet:'vegan',mins:10}
 ],
 tentempie:[
  {name:'Pera y un puñado de nueces',ing:['pera','nueces'],diet:'vegan',mins:2},
  {name:'Plátano',ing:['plátano'],diet:'vegan',mins:1},
  {name:'Yogur sin lactosa',ing:['yogur sin lactosa'],diet:'veg',mins:1},
  {name:'Manzana y tostada integral',ing:['manzana','pan integral'],diet:'vegan',mins:3},
  {name:'Tostada con aceite de oliva',ing:['pan integral','aceite de oliva'],diet:'vegan',mins:3},
  {name:'Pera y semillas de calabaza',ing:['pera','semillas de calabaza'],diet:'vegan',mins:2}
 ]
};
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function unsafeTerms(){let text=norm([selectValue('allergies'),selectValue('intolerances'),selectValue('dislikesfood'),selectValue('triggers')].join(' | '));let map={
 'lactosa':['leche','yogur','queso','lactosa'],'leche':['leche','yogur','queso'],'huevo':['huevo'],'gluten':['pan','pasta','avena'],'trigo':['pan','pasta'],'pescado':['merluza','atún','atun'],'merluza':['merluza'],'atún':['atún','atun'],'atun':['atún','atun'],'soja':['tofu','soja'],'frutos secos':['nueces','almendras'],'nueces':['nueces'],'cacahuete':['cacahuete'],'setas':['setas','champiñones'],'cebolla':['cebolla'],'ajo':['ajo'],'tomate':['tomate'],'picante':['picante'],'plátano':['plátano'],'platano':['plátano'],'garbanzos':['garbanzos'],'lentejas':['lentejas'],'avena':['avena']};let banned=new Set();
 for(const [term,ingredients] of Object.entries(map))if(text.includes(term))ingredients.forEach(x=>banned.add(norm(x)));
 // Si se indica mal tolerancia a lactosa, los artículos 'sin lactosa' son una opción; con alergia a leche, no.
 if(text.includes('lactosa')&&!norm(selectValue('allergies')).includes('leche')){banned.delete('yogur');banned.delete('lactosa')}
 return banned;
}
function foodIsSuitable(dish){let diet=selectValue('diet','Omnívora'),banned=unsafeTerms();if(diet==='Vegana'&&dish.diet!=='vegan')return false;if(diet==='Vegetariana'&&(['omni','fish'].includes(dish.diet)))return false;
 if(dish.ing.some(x=>banned.has(norm(x))))return false;if(selectValue('budget')==='Ajustado'&&dish.ing.some(x=>['quinoa'].includes(norm(x))))return false;
 let allergy=norm(selectValue('allergies'));if(allergy.includes('leche')&&dish.ing.some(x=>norm(x).includes('yogur')||norm(x).includes('leche')||norm(x).includes('queso')))return false;
 let cook=selectValue('cook');if(cook==='Menos de 15 min'&&dish.mins>15)return false;
 return true;
}
function suggestedDish(slot,date){let arr=DISHES[slot].filter(foodIsSuitable);if((shiftOf(date)==='T'||shiftOf(date)==='N')&&slot==='comida'){const portable=arr.filter(x=>!x.ing.includes('merluza')&&!x.name.includes('al horno'));if(portable.length)arr=portable}if(!arr.length&&selectValue('cook')!=='Menos de 15 min'){let allowCook=DISHES[slot].filter(x=>foodIsSuitable({...x,mins:0}));arr=allowCook}if(!arr.length)return null;
 const fav=norm(selectValue('likesfood'));arr=arr.sort((a,b)=>(b.ing.some(x=>fav&&fav.includes(norm(x)))?1:0)-(a.ing.some(x=>fav&&fav.includes(norm(x)))?1:0));let ix=(Math.abs(dayDiff(date,'2026-01-01'))+['desayuno','comida','cena','tentempie'].indexOf(slot)*2)%arr.length;return arr[ix];
}
function mealCount(){let m=selectValue('meals','4');return ['3','4','5'].includes(m)?+m:4}
function menuFor(date){let count=mealCount(),slots=count===3?['desayuno','comida','cena']:count===5?['desayuno','tentempie','comida','tentempie','cena']:['desayuno','comida','tentempie','cena'];return slots.map(slot=>{let dish=suggestedDish(slot,date);return {slot,label:slot==='tentempie'?'Tentempié':cap(slot),dish}})}
function foodPlanGuidance(){let weight=nval('weight'),goal=nval('targetWeight'),age=nval('age');let pref=selectValue('priority');let parts=['Organiza las comidas con una fuente de proteína, verduras o fruta y una ración de cereales integrales o tubérculos según apetito y actividad.'];
 if(weight&&goal&&goal<weight-1)parts.push('Has indicado un objetivo de peso inferior al actual: prioriza cambios graduales y comidas saciantes; evita recortes drásticos.');
 else if(weight&&goal&&goal>weight+1)parts.push('Has indicado un objetivo de aumento de peso: procura comer suficiente y combinarlo con fuerza, según tolerancia.');
 else if(pref==='Salud y energía')parts.push('Prioriza energía estable, regularidad y recuperación, sin necesidad de perseguir un número concreto en la báscula.');
 if(selectValue('budget')==='Ajustado')parts.push('En presupuesto ajustado, elige más legumbres, arroz, verduras de temporada y cocina por tandas.');
 if(many('digestive').includes('Reflujo/hernia de hiato')||many('conditions').includes('Hernia de hiato/reflujo'))parts.push('Con reflujo, ajusta raciones y horarios, y evita acostarte justo después de comer si te provoca síntomas.');
 if(age&&age>=65)parts.push('Presta especial atención a la proteína y a conservar la fuerza; pide orientación individual si tienes limitaciones.');
 return parts.join(' ');
}
function mealNotice(date){let st=shiftOf(date),work=st==='T'||st==='N',workday=selectValue('work').includes('12');return work?`Turno ${st==='N'?'de noche':'de trabajo'}: prepara comida que puedas transportar y reparte las tomas según tus pausas. ${workday?'No es necesario cocinar después de 12 horas de servicio.':''}`:'Día libre: puedes cocinar con tranquilidad o dejar varias raciones preparadas para próximos turnos.'}
function saveFood(){let name=document.getElementById('mealMoment')?.value||'Otra',text=document.getElementById('mealDescription')?.value?.trim()||'',date=document.getElementById('foodDate')?.value||todayKey();if(!text)return alert('Escribe qué has comido o bebido.');if(!validDate(date))return alert('Fecha no válida');d.foodLog.push({date,moment:name,text,id:Date.now()+Math.random()});if(document.getElementById('usualMeal')?.checked&&!d.customMeals.some(x=>x.name===text))d.customMeals.push({name:text,slot:name});save();stamp('Comida guardada.');nutritionDate=date;render()}
function setSuggestedMeal(text,moment){const x=document.getElementById('mealDescription'),y=document.getElementById('mealMoment');if(x){x.value=text;y.value=moment;x.focus();x.scrollIntoView({behavior:'smooth',block:'center'})}}
function deleteFood(id){if(!confirm('¿Borrar esta comida registrada?'))return;d.foodLog=d.foodLog.filter(x=>String(x.id)!==String(id));save();render()}
function changeWater(amount){const k=todayKey();d.waterLog[k]=Math.max(0,(Number(d.waterLog[k])||0)+amount);save();render()}
function nutrition(){let date=nutritionDate,menu=menuFor(date),log=d.foodLog.filter(x=>x.date===date),water=Number(d.waterLog[todayKey()])||0;
 return `<section class="card"><h2>Nutrición · Tu plan de comidas</h2><p>Menú orientativo que cambia según la alimentación, los alimentos que quieres evitar, el tiempo de cocina y los turnos que registres.</p><label for="nutritionDay">Día del menú</label><input type="date" id="nutritionDay" value="${esc(date)}" onchange="nutritionDate=this.value;render()"><p class="small">${esc(cap(niceDate(date)))}</p><p class="mini-note">${esc(mealNotice(date))}</p><p>${esc(foodPlanGuidance())}</p><h3>Qué toca comer</h3>${menu.map(({slot,label,dish},i)=>`<div class="small-card"><strong>${i+1}. ${label}</strong>${dish?`<p>${esc(dish.name)}</p><p class="small">Ingredientes: ${dish.ing.map(esc).join(', ')} · ~${dish.mins} min</p><button class="secondary" onclick='setSuggestedMeal(${JSON.stringify(dish.name)},${JSON.stringify(label)})'>Añadir al registro</button>`:`<p class="warning">No hay sugerencias compatibles con todos los alimentos marcados. Revisa las restricciones o añade una alternativa segura manualmente.</p>`}</div>`).join('')}<details><summary>Ver el menú orientativo de los próximos 7 días</summary>${Array.from({length:7},(_,i)=>nextDate(date,i)).map(day=>`<div class="record"><strong>${esc(cap(niceDate(day)))}</strong><p class="small">${esc(shiftLabel(day))}</p>${menuFor(day).map(x=>`<p>${esc(x.label)}: ${x.dish?esc(x.dish.name):'Alternativa segura por definir'}</p>`).join('')}</div>`).join('')}</details><p class="small">Este menú es orientativo y no garantiza la ausencia de alérgenos ni cubre todas las necesidades nutricionales. Comprueba ingredientes y cantidades personalmente; en alergias graves, utiliza un plan supervisado.</p></section>
 <section class="card"><h2>Registrar comidas</h2><label for="foodDate">Fecha</label><input type="date" id="foodDate" value="${esc(date)}"><label for="mealMoment">Momento</label><select id="mealMoment">${['Desayuno','Media mañana','Comida','Merienda','Cena','Otra'].map(x=>`<option>${x}</option>`).join('')}</select><label for="mealDescription">¿Qué has comido?</label><textarea id="mealDescription" placeholder="Escribe alimentos, plato o bebida" rows="2"></textarea><label class="opt"><input type="checkbox" id="usualMeal">Guardar también como comida habitual</label><button class="primary" onclick="saveFood()">Guardar comida</button><h3>Registros de ${esc(niceDate(date,{day:'numeric',month:'long'}))}</h3>${log.length?log.slice().reverse().map(x=>`<div class="record"><strong>${esc(x.moment)}</strong><p>${esc(x.text)}</p><button class="secondary" onclick="deleteFood('${String(x.id)}')">Eliminar</button></div>`).join(''):'<p>Sin comidas registradas ese día.</p>'}${d.meals.length?`<details><summary>${d.meals.length} registros antiguos conservados</summary>${d.meals.slice(-12).reverse().map(x=>`<p>• ${esc(x.n)}: ${esc(x.t)}</p>`).join('')}</details>`:''}${d.customMeals.length?`<details><summary>Mis comidas habituales (${d.customMeals.length})</summary>${d.customMeals.map(x=>`<p>${esc(x.name)}</p>`).join('')}</details>`:''}</section>
 <section class="card"><h2>Agua de hoy</h2><div class="big">${(water/1000).toLocaleString('es-ES',{maximumFractionDigits:2})} L</div><p>${water} ml registrados hoy. Ajusta tu consumo a tus necesidades, actividad y recomendaciones médicas.</p>${d.water?`<p class="small">La versión anterior registró ${esc(d.water)} vasos en total, sin fechas. Ese dato se conserva en tu copia de seguridad.</p>`:''}<div class="choice-line"><button class="primary" onclick="changeWater(250)">+250 ml</button><button class="secondary" onclick="changeWater(500)">+500 ml</button><button class="secondary" onclick="changeWater(-250)" ${water<=0?'disabled':''}>−250 ml</button></div><button class="secondary" onclick="go('Actualizar plan')">Cambiar preferencias alimentarias</button></section>`;
}
function saveCharacter(){const input=document.querySelector('#charName');if(input)d.character.name=input.value.trim().slice(0,20)||'Mi heroína';save();render()}
function unequipWings(){if(!d.character.choiceDone)return;d.character.equipped.wings='';save();render()}
function equip(id){if(!d.character.choiceDone)return;const g=gear.find(x=>x.id===id);if(!g||level()<g.level)return;d.character.equipped[g.slot]=id;save();render()}
function buyGear(id){equip(id)}
function missionList(){return ['Beber agua regularmente','Hacer movimiento adaptado','Preparar una comida equilibrada','Dedicar 5 minutos a ordenar/preparar algo','Reservar un momento de descanso']}
function missionKey(i){return new Date().toDateString()+i}
function missions(){return `<section class="card"><h2>Misiones de hoy</h2><p>Haz las que tengan sentido para tu energía y salud. Descansar es una decisión válida.</p>${missionList().map((x,i)=>`<label class="mission"><input type="checkbox" ${d.done[missionKey(i)]?'checked':''} onchange="mission(${i},this.checked)"><span>${esc(x)}</span><strong style="margin-left:auto;color:#f0ce91">+10 XP</strong></label>`).join('')}</section>`}
function mission(i,on){const k=missionKey(i),was=!!d.done[k];if(was===on)return;d.done[k]=on;if(on){d.xp+=10;d.coins+=1}else{d.xp=Math.max(0,d.xp-10);d.coins=Math.max(0,d.coins-1)}save();render()}
function habits(){let date=todayKey();return `<section class="card"><h2>Hábitos cotidianos</h2><p>Marca los hábitos que has realizado hoy. Se guardan por fecha.</p>${d.habits.map((x,i)=>{let key=`${date}:${i}`,on=!!d.habitDone[key];return `<label class="mission"><input type="checkbox" ${on?'checked':''} onchange="d.habitDone['${key}']=this.checked;save()"><span>${esc(x)}</span></label>`}).join('')}<label for="newHabit">Nuevo hábito</label><input id="newHabit" placeholder="Ej.: leer 10 minutos" maxlength="90"><button class="primary" onclick="addHabit()">Añadir hábito</button></section>`}
function addHabit(){let x=document.getElementById('newHabit')?.value.trim();if(!x)return;if(d.habits.length>=30)return alert('Puedes registrar hasta 30 hábitos.');d.habits.push(x);save();render()}
function home(){let day=Math.max(1,Math.min(66,dayDiff(todayKey(),d.start)+1)),train=trainingPlan(todayKey()),meals=menuFor(todayKey()),count=Object.values(d.done).filter(Boolean).length;
 return `<section class="card"><div class="headrow"><h2>Tu día en Reformándome</h2><span class="pill">Día ${day} de 66</span></div><div class="progress"><span style="width:${day/66*100}%"></span></div><div class="summary-squares"><div class="stat"><b>${d.xp}</b>XP acumulados</div><div class="stat"><b>${level()}</b>Nivel de heroína</div><div class="stat"><b>${count}</b>Misiones completadas</div><div class="stat"><b>${d.coins}</b>Monedas</div></div><div class="choice-line"><button class="primary" onclick="go('Mi perfil')">♛ Ver mi heroína y mi perfil</button><button class="secondary" onclick="go('Actualizar plan')">Cambiar mi rutina</button></div></section>
 <section class="card"><h2>Hoy · ${esc(niceDate(todayKey()))}</h2><span class="pill">${esc(shiftLabel(todayKey()))}</span><h3>Entrenamiento</h3><p><strong>${esc(train.title)}</strong> · ${esc(train.minutes)}</p><p>${esc(train.detail)}</p><button class="secondary" onclick="trainingDate=todayKey();go('Entreno')">Ver rutina de hoy</button><button class="secondary" onclick="go('Calendario')">Marcar turnos</button><h3>Comidas previstas</h3>${meals.map((x,i)=>`<p><strong>${esc(x.label)}:</strong> ${x.dish?esc(x.dish.name):'Define una alternativa segura'}</p>`).join('')}<button class="primary" onclick="nutritionDate=todayKey();go('Nutrición')">Ver menú, registrar comida y agua</button></section>
 <section class="card"><h2>Tu progreso no necesita perfección</h2><p>El cuestionario de inicio ya no aparece aquí. Cuando cambies de turno, nivel de entrenamiento, peso o preferencias, actualiza solo los apartados necesarios.</p><div class="choice-line"><button class="secondary" onclick="go('Misiones')">Misiones de hoy</button><button class="secondary" onclick="go('Progreso')">Registrar progreso</button></div></section>`;
}
function profile(){return `${characterProfile()}<section class="card"><h2>Mis datos y mi aventura</h2><div class="summary-squares"><div class="stat"><b>${esc(nval('age')??'—')}</b>Edad</div><div class="stat"><b>${esc(nval('height')??'—')} ${nval('height')?'cm':''}</b>Altura</div><div class="stat"><b>${esc(nval('weight')??'—')} ${nval('weight')?'kg':''}</b>Peso actual</div><div class="stat"><b>${esc(nval('targetWeight')??'—')} ${nval('targetWeight')?'kg':''}</b>Objetivo</div><div class="stat"><b>${level()}</b>Nivel</div></div><p class="small">Los datos físicos forman parte de tu cuestionario y se pueden actualizar sin cambiar tu heroína.</p><button class="primary" onclick="go('Actualizar plan')">Actualizar mis datos y preferencias</button><button class="secondary" onclick="go('Progreso')">Ver seguimiento y registrar peso</button></section>`}
function recordWeight(){let el=document.getElementById('newWeight'),date=document.getElementById('weightDate').value,n=Number((el?.value||'').replace(',','.'));if(!Number.isFinite(n)||n<30||n>350||!validDate(date))return alert('Introduce un peso válido en kg y una fecha válida.');d.weightLog.push({date,kg:n});d.weightLog.sort((a,b)=>a.date.localeCompare(b.date));d.answers.weight=String(n).replace('.',',');save();stamp('Peso registrado y plan actualizado.');render()}
function progress(){let recent=d.weightLog.slice(-8).reverse(),go=nval('targetWeight'),weight=nval('weight');return `<section class="card"><h2>Mi progreso</h2><div class="summary-squares"><div class="stat"><b>${d.xp}</b>XP</div><div class="stat"><b>${d.coins}</b>Monedas</div><div class="stat"><b>${Object.values(d.trainingDone).filter(Boolean).length}</b>Sesiones realizadas</div><div class="stat"><b>${d.checkins.length}</b>Revisiones</div></div><h3>Peso y objetivos</h3><p>Peso actual: <strong>${weight?weight+' kg':'sin indicar'}</strong> · Objetivo: <strong>${go?go+' kg':'sin indicar'}</strong>. Un objetivo no es una obligación ni define tu valor.</p><label>Fecha</label><input id="weightDate" type="date" value="${todayKey()}"><label>Peso (kg)</label><input id="newWeight" inputmode="decimal" placeholder="Ej.: 89,5"><button class="primary" onclick="recordWeight()">Registrar nuevo peso</button>${recent.length?`<h3>Historial</h3>${recent.map(x=>`<p>${esc(niceDate(x.date,{day:'numeric',month:'long',year:'numeric'}))}: ${esc(x.kg)} kg</p>`).join('')}`:''}<h3>Revisión personal</h3><textarea id="checkNote" placeholder="Sueño, energía, ánimo, molestias, constancia…" rows="3"></textarea><button class="secondary" onclick="saveCheckin()">Guardar revisión</button>${d.checkins.slice(-5).reverse().map(x=>`<div class="record"><strong>${esc((x.date||'').slice(0,10))}</strong><p>${esc(x.text)}</p></div>`).join('')}</section>`}
function saveCheckin(){let text=document.getElementById('checkNote')?.value.trim();if(!text)return alert('Escribe algo para guardar tu revisión.');d.checkins.push({date:new Date().toISOString(),text});save();render()}
function settings(){return `<section class="card"><h2>Ajustes y copias de seguridad</h2><label>Fecha de comienzo del reto</label><input type="date" id="challengeStart" value="${esc(d.start)}"><button class="primary" onclick="let v=document.getElementById('challengeStart').value;if(validDate(v)){d.start=v;save();render()}">Guardar fecha</button><h3>Copia de seguridad</h3><p>Exporta tus datos antes de subir nuevos archivos a GitHub. La aplicación funciona sin cuenta y guarda las respuestas solo en este dispositivo.</p><button class="primary" onclick="backup()">Exportar JSON</button><label>Restaurar copia JSON</label><input type="file" id="file" accept=".json,application/json"><button class="secondary" onclick="restore()">Importar copia</button><details><summary>Opciones de mantenimiento</summary><p>Solo si necesitas comenzar de nuevo, puedes borrar los datos de este dispositivo. No afecta al repositorio de GitHub.</p><button class="secondary" onclick="if(confirm('Esto borrará tu heroína, el cuestionario, el calendario y todo el progreso local. ¿Seguro?')){localStorage.removeItem(KEY);location.reload()}">Borrar todos mis datos</button></details><p class="small">Clave de datos compatible con Reformándome v24: ${esc(KEY)}. Las ilustraciones y la elección de heroína se mantienen sin cambios.</p></section>`}
function backup(){let blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=`reformandome-copia-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500)}
function restore(){const file=document.getElementById('file')?.files[0];if(!file)return alert('Selecciona una copia JSON.');if(file.size>8_000_000)return alert('La copia excede el límite admitido (8 MB).');let reader=new FileReader();reader.onload=()=>{try{let obj=JSON.parse(reader.result);if(!plain(obj)||!plain(obj.answers)||!plain(obj.done)||!plain(obj.character))throw new Error('Formato no reconocido');if(confirm('La copia reemplazará todos los datos locales actuales. ¿Continuar?')){localStorage.setItem(KEY,JSON.stringify(obj));location.reload()}}catch(e){alert('El archivo no parece una copia válida de Reformándome.')}};reader.readAsText(file)}
function go(p){if(!d.character.choiceDone)return;if(!d.setup.completed)return;page=tabs.includes(p)?p:'Inicio';render(true)}
function render(scroll=false){const nav=document.getElementById('nav'),app=document.getElementById('app'),mini=document.getElementById('miniChar');try{
 if(!d.character.choiceDone){mini.innerHTML='✦';mini.disabled=true;nav.innerHTML='';app.innerHTML=characterSelection();return}
 mini.disabled=false;mini.innerHTML=characterSmall();
 if(!d.setup.completed){nav.innerHTML='';app.innerHTML=setupWizard();if(scroll)window.scrollTo(0,0);return}
 nav.innerHTML=tabs.map(t=>`<button class="${t===page?'active':''}" type="button" onclick="go('${t}')">${TAB_ICONS[t]} ${esc(t)}</button>`).join('');
 let views={'Inicio':home,'Mi perfil':profile,'Calendario':calendar,'Entreno':training,'Nutrición':nutrition,'Misiones':missions,'Actualizar plan':updatePanel,'Progreso':progress,'Hábitos':habits,'Ajustes':settings};app.innerHTML=(flashMessage?`<div class="success-note">${esc(flashMessage)}</div>`:'')+(views[page]||home)();if(scroll)window.scrollTo(0,0);
 }catch(err){console.error('Render Reformándome:',err);nav.innerHTML=`<button type="button" onclick="page='Inicio';render()">Inicio</button><button type="button" onclick="page='Ajustes';render()">Ajustes</button>`;app.innerHTML=`<section class="card"><h2>No se ha podido abrir esta sección</h2><p>Tu progreso sigue guardado. Pulsa Inicio o exporta una copia desde Ajustes.</p><button class="primary" onclick="page='Inicio';render()">Volver a Inicio</button></section>`;}}
// Guardado inmediato de entradas del cuestionario inicial y de la sección de cambios.
document.addEventListener('input',e=>{if(e.target?.dataset?.q!==undefined){d.answers[e.target.dataset.q]=e.target.value;save()}});
document.addEventListener('change',e=>{if(e.target?.dataset?.q!==undefined){d.answers[e.target.dataset.q]=e.target.value;save()}if(e.target?.dataset?.multi!==undefined)onAnswer(e.target,true);if(e.target?.dataset?.single!==undefined)onAnswer(e.target,false)});
render();
if('serviceWorker' in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!sessionStorage.getItem('reformandome-v25-once')){sessionStorage.setItem('reformandome-v25-once','1');location.reload()}});
 addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=25-plan-turnos',{updateViaCache:'none'}).then(r=>r.update()).catch(e=>console.warn('Caché sin conexión no disponible',e)));
}
