'use strict';
/* Reformándome v36 · extensión no destructiva
 * Cargar después de app.js, training-upgrade.js, support-profile.js,
 * account-identity.js y shift-types.js. No cambia esquema ni claves.
 * Esta extensión conserva el menú heredado en un desplegable de compatibilidad.
 */
(() => {
  if (typeof d === 'undefined' || typeof save !== 'function' || typeof render !== 'function' ||
      typeof settings !== 'function' || typeof nutrition !== 'function') {
    console.error('RE36: falta app.js o los módulos anteriores.');
    return;
  }
  const VERSION = '36.2';
  const xss = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const iso = dt => { const d0 = new Date(dt); return [d0.getFullYear(),String(d0.getMonth()+1).padStart(2,'0'),String(d0.getDate()).padStart(2,'0')].join('-'); };
  const atDay = key => {const [y,m,day]=String(key).split('-').map(Number);return new Date(y,m-1,day,12)};
  const shiftDate = (key,n) => {const t=atDay(key);t.setDate(t.getDate()+n);return iso(t)};
  const today = () => iso(new Date());
  const clamp = (n,a,b)=>Math.min(b,Math.max(a,n));
  const ready = () => !window.RECloud?.isReady || window.RECloud.isReady();
  const defaultHabits = () => [
    {id:'agua',name:'Beber agua a lo largo del día',base:5,active:true},
    {id:'moverme',name:'Moverme un rato',base:8,active:true},
    {id:'descanso',name:'Cuidar mi descanso',base:6,active:true},
    {id:'pausa',name:'Hacer una pausa de bienestar',base:5,active:true}
  ];
  function data(){
    if (!ready())return null;
    if (!d.re36 || typeof d.re36!=='object' || Array.isArray(d.re36))d.re36={};
    const s=d.re36;
    if(!Array.isArray(s.habits))s.habits=defaultHabits();
    for(const [k,def] of Object.entries({checks:{},meals:{},exclusions:[],dailyMode:{},dayDone:{},journal:{},workouts:{},customChallenges:[],achievements:{},items:[],coins:0,theme:'violet',reminders:{},trainingNotes:{}})){
      if(s[k]===undefined || s[k]===null)s[k]=structuredClone(def);
    }
    if(!Array.isArray(s.exclusions))s.exclusions=[];
    return s;
  }
  function commit(note){
    save();window.RECloud?.queue?.();
    if(typeof stamp==='function'&&note)stamp(note);
    render();if(dialog?.open)open(activeSection);
  }
  const xp = () => Math.max(0,Number(d.xp)||0);
  const level = () => {const total=xp();return {total,level:Math.floor(total/100)+1,part:total%100,next:100,left:100-total%100};};
  function bar(n,den=100){return `<div class="re36-meter" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${den}"><i style="width:${clamp(n/den*100,0,100)}%"></i></div>`;}
  function streakAt(id,date){
    const s=data();if(!s)return 0;let key=date,sum=0;
    while(sum<3660 && s.checks[key]?.[id]){sum++;key=shiftDate(key,-1);}
    return sum;
  }
  function currentStreak(id){const a=streakAt(id,today());return a || streakAt(id,shiftDate(today(),-1));}
  function dailyBonus(streak){return clamp((streak-1)*2,0,10);}
  function unlocks(){
    const s=data();if(!s)return;
    const all=Object.values(s.checks).reduce((sum,row)=>sum+Object.keys(row||{}).length,0);
    for(const [id,condition,coins] of [
      ['primera_mision',all>=1,10],['diez_habitos',all>=10,20],['cincuenta_habitos',all>=50,40],
      ['semana_constante',s.habits.some(h=>streakAt(h.id,today())>=7),20],
      ['capitulo_uno',Object.keys(s.dayDone).length>=11,35]]){
      if(condition&&!s.achievements[id]){s.achievements[id]=today();s.coins+=coins;}
    }
  }
  function toggleHabit(id){
    const s=data();if(!s)return;
    const h=s.habits.find(x=>x.id===id && x.active);if(!h)return;
    const key=today(),row=(s.checks[key] ||= {});
    if(row[id]){
      const earned=Number(row[id].xp)||0;
      d.xp=Math.max(0,xp()-earned);
      delete row[id];
      commit('Hábito desmarcado: se retiran los XP de hoy.');
      return;
    }
    const st=streakAt(id,shiftDate(key,-1))+1;
    const earned=clamp(Number(h.base)||5,1,30)+dailyBonus(st);
    row[id]={xp:earned,streak:st,at:new Date().toISOString()};d.xp=xp()+earned;
    unlocks();commit(`¡Hábito completado! +${earned} XP${st>1?' · racha '+st+' días':''}.`);
  }
  function editHabit(id){
    const s=data();if(!s)return;
    const h=s.habits.find(x=>x.id===id);
    const name=prompt('Nombre del hábito (máximo 55 caracteres)',h?.name||'');
    if(name===null)return;
    if(!name.trim()||name.trim().length>55)return alert('Introduce un nombre de hasta 55 caracteres.');
    const raw=prompt('XP de base (1–30)',String(h?.base||5));if(raw===null)return;
    if(!/^\d+$/.test(raw)||Number(raw)<1||Number(raw)>30)return alert('Indica un número entre 1 y 30.');
    if(h){h.name=name.trim();h.base=Number(raw);}else{
      if(s.habits.length>=40)return alert('Límite de 40 hábitos. Archiva alguno antes de añadir más.');
      s.habits.push({id:'h'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),name:name.trim(),base:Number(raw),active:true});
    }
    commit('Hábito guardado.');
  }
  function archiveHabit(id){const s=data();const h=s?.habits.find(x=>x.id===id);if(!h)return;
    if(!confirm(`¿Archivar «${h.name}»? Su historial de XP se conservará.`))return;
    h.active=false;commit('Hábito archivado.');}
  function habitsHTML(){
    const s=data();if(!s)return '';
    const key=today();return `<section class="card re36-card" id="re36-habits"><h2>✅ Seguimiento de hábitos</h2>
      <details class="re36-help"><summary>Cómo funcionan las rachas</summary><p>+2 XP por cada día consecutivo, hasta +10 XP adicionales. Si se interrumpe la racha, la siguiente recompensa vuelve a la base.</p></details>
      ${s.habits.filter(h=>h.active).map(h=>{
        const record=s.checks[key]?.[h.id],st=currentStreak(h.id),next=Number(h.base)+dailyBonus(streakAt(h.id,shiftDate(key,-1))+1);
        return `<div class="re36-habit"><button type="button" class="${record?'primary':'secondary'}" onclick="RE36.toggleHabit('${h.id}')" aria-pressed="${!!record}">${record?'✓ Hecho':'Marcar'}</button><span class="re36-flex"><strong>${xss(h.name)}</strong><small>${st?'🔥 '+st+' días de racha · ':''}${record?'+'+record.xp+' XP hoy':'Hoy: '+next+' XP'}</small></span><button class="secondary" type="button" onclick="RE36.editHabit('${h.id}')" aria-label="Editar ${xss(h.name)}">✎</button><button class="secondary" type="button" onclick="RE36.archiveHabit('${h.id}')" aria-label="Archivar ${xss(h.name)}">×</button></div>`;
      }).join('')}
      <button class="secondary" onclick="RE36.editHabit('new')">+ Añadir hábito</button>
      <details><summary>Historial de los últimos 14 días</summary>${historyHTML(14)}</details>
      </section>`;
  }
  function historyHTML(days){const s=data();const hs=s.habits.filter(h=>h.active);
    return `<div class="re36-scroll"><table class="re36-table"><thead><tr><th>Fecha</th>${hs.map(h=>`<th>${xss(h.name)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:days},(_,i)=>shiftDate(today(),-days+1+i)).map(k=>`<tr><td>${k.slice(5)}</td>${hs.map(h=>`<td>${s.checks[k]?.[h.id]?'✓':'·'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const MEAL_OPTIONS = {
  "desayuno": [
    {
      "id": "avena-nocturna",
      "name": "Avena nocturna con plátano y canela",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad",
        "descanso"
      ],
      "ing": [
        "copos de avena 50 g",
        "bebida de avena 150 ml",
        "plátano 1/2 unidad",
        "canela al gusto",
        "semillas de chía 1 cucharadita (opcional)"
      ],
      "steps": [
        "La noche anterior, mezcla la avena, la bebida de avena y la canela en un tarro limpio con tapa",
        "Añade la chía si te apetece y remueve bien",
        "Tápalo y déjalo en la nevera al menos 6-8 horas",
        "Por la mañana añade el plátano en rodajas y remueve. Puedes comerlo frío o calentarlo suavemente"
      ],
      "prep": "Preparar la noche anterior. Mantener siempre refrigerado y consumir preferentemente en 24-48 horas; no dejar toda la noche a temperatura ambiente."
    },
    {
      "id": "avena-manzana",
      "name": "Gachas de avena con manzana",
      "minutes": 10,
      "modes": [
        "fuerza",
        "actividad",
        "descanso"
      ],
      "ing": [
        "copos de avena 50 g",
        "bebida de avena 200 ml",
        "manzana 1 unidad",
        "canela al gusto"
      ],
      "steps": [
        "Calienta la bebida vegetal con la avena 5-7 minutos, removiendo",
        "Trocea la manzana y añádela",
        "Espolvorea canela y sirve templado"
      ],
      "prep": ""
    },
    {
      "id": "tostadas-huevo",
      "name": "Tostadas integrales con huevo y fruta",
      "minutes": 12,
      "modes": [
        "fuerza",
        "actividad",
        "descanso"
      ],
      "ing": [
        "pan integral 2 rebanadas",
        "huevos 2 unidades",
        "aceite de oliva 1 cucharadita",
        "fruta 1 pieza"
      ],
      "steps": [
        "Tuesta el pan",
        "Prepara los huevos revueltos o a la plancha con poco aceite",
        "Acompaña con la fruta lavada"
      ],
      "prep": ""
    },
    {
      "id": "tostada-pavo",
      "name": "Tostada integral de pavo y aceite de oliva",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pan integral 2 rebanadas",
        "pavo cocido 60 g",
        "aceite de oliva 1 cucharadita",
        "pera 1 unidad"
      ],
      "steps": [
        "Tuesta el pan y añade el aceite",
        "Coloca encima el pavo",
        "Acompaña con la pera"
      ],
      "prep": ""
    },
    {
      "id": "tortilla-platano",
      "name": "Tortilla francesa y plátano",
      "minutes": 10,
      "modes": [
        "fuerza",
        "actividad",
        "descanso"
      ],
      "ing": [
        "huevos 2 unidades",
        "plátano 1 unidad",
        "pan integral 1 rebanada"
      ],
      "steps": [
        "Bate los huevos y cuájalos en una sartén antiadherente",
        "Sirve con pan y plátano"
      ],
      "prep": ""
    },
    {
      "id": "yogur-fruta",
      "name": "Yogur vegetal con fruta y nueces",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "yogur vegetal natural 150 g",
        "fruta de temporada 1 pieza",
        "nueces 20 g"
      ],
      "steps": [
        "Pon el yogur en un cuenco",
        "Corta la fruta y añade las nueces troceadas"
      ],
      "prep": ""
    },
    {
      "id": "tostada-aguacate",
      "name": "Tostadas de aguacate y huevo duro",
      "minutes": 12,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "pan integral 2 rebanadas",
        "aguacate 1/2 unidad",
        "huevo 1 unidad",
        "limón unas gotas"
      ],
      "steps": [
        "Cuece el huevo unos 10 minutos",
        "Machaca el aguacate con limón",
        "Extiende en el pan tostado y añade el huevo"
      ],
      "prep": ""
    },
    {
      "id": "tortitas-avena",
      "name": "Tortitas de avena y plátano",
      "minutes": 15,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "copos de avena 50 g",
        "plátano 1 unidad",
        "huevo 1 unidad",
        "canela al gusto"
      ],
      "steps": [
        "Tritura la avena con el plátano y el huevo",
        "Cuaja porciones pequeñas en sartén antiadherente 2-3 minutos por lado",
        "Añade canela"
      ],
      "prep": ""
    },
    {
      "id": "pan-hummus",
      "name": "Tostada con hummus y pepino",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "pan integral 2 rebanadas",
        "hummus 50 g",
        "pepino 1/3 unidad"
      ],
      "steps": [
        "Tuesta el pan y unta el hummus",
        "Añade rodajas de pepino"
      ],
      "prep": ""
    },
    {
      "id": "pudding-chia",
      "name": "Pudin de chía y frutos rojos",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "semillas de chía 20 g",
        "bebida de avena 160 ml",
        "frutos rojos 80 g"
      ],
      "steps": [
        "Mezcla la chía con la bebida vegetal en un recipiente cerrado",
        "Refrigera al menos 4 horas, preferiblemente desde la noche anterior",
        "Remueve y sirve con frutos rojos"
      ],
      "prep": "Se prepara con antelación y debe conservarse en la nevera."
    },
    {
      "id": "sandwich-pavo",
      "name": "Sándwich integral de pavo y pepino",
      "minutes": 7,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pan integral 2 rebanadas",
        "pavo cocido 70 g",
        "pepino 1/3 unidad",
        "aceite de oliva 1 cucharadita"
      ],
      "steps": [
        "Monta el sándwich con pavo y pepino",
        "Añade unas gotas de aceite"
      ],
      "prep": ""
    },
    {
      "id": "requeson-sin-lactosa",
      "name": "Tostada con queso fresco sin lactosa y fruta",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "pan integral 2 rebanadas",
        "queso fresco sin lactosa 60 g",
        "fresas 80 g"
      ],
      "steps": [
        "Tuesta el pan",
        "Coloca el queso y las fresas troceadas"
      ],
      "prep": ""
    },
    {
      "id": "crema-cacahuete",
      "name": "Tostada de crema de cacahuete y plátano",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pan integral 2 rebanadas",
        "crema de cacahuete 20 g",
        "plátano 1/2 unidad"
      ],
      "steps": [
        "Unta la crema de cacahuete sin azúcar añadido",
        "Añade el plátano en rodajas"
      ],
      "prep": ""
    },
    {
      "id": "porridge-cacao",
      "name": "Avena caliente con cacao y pera",
      "minutes": 10,
      "modes": [
        "fuerza",
        "actividad",
        "descanso"
      ],
      "ing": [
        "copos de avena 50 g",
        "bebida vegetal 200 ml",
        "cacao puro 1 cucharadita",
        "pera 1 unidad"
      ],
      "steps": [
        "Cuece la avena con la bebida vegetal hasta espesar",
        "Añade el cacao",
        "Sirve con pera troceada"
      ],
      "prep": ""
    }
  ],
  "almuerzo": [
    {
      "id": "fruta-nueces",
      "name": "Fruta y nueces",
      "minutes": 3,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "fruta de temporada 1 pieza",
        "nueces 20 g"
      ],
      "steps": [
        "Lava o pela la fruta",
        "Acompáñala con las nueces"
      ],
      "prep": ""
    },
    {
      "id": "mini-bocadillo-pavo",
      "name": "Mini bocadillo integral de pavo",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pan integral 60 g",
        "pavo cocido 60 g",
        "aceite de oliva 1 cucharadita"
      ],
      "steps": [
        "Abre el pan, coloca el pavo y añade el aceite"
      ],
      "prep": ""
    },
    {
      "id": "yogur-avena",
      "name": "Yogur vegetal con avena y fresas",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "yogur vegetal natural 125 g",
        "copos de avena 25 g",
        "fresas 80 g"
      ],
      "steps": [
        "Mezcla el yogur con la avena",
        "Añade las fresas lavadas y troceadas"
      ],
      "prep": ""
    },
    {
      "id": "mandarina-almendras",
      "name": "Mandarinas y almendras",
      "minutes": 3,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "mandarinas 2 unidades",
        "almendras 20 g"
      ],
      "steps": [
        "Pela las mandarinas y acompáñalas de las almendras"
      ],
      "prep": ""
    },
    {
      "id": "tostada-hummus",
      "name": "Tostada de hummus",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "pan integral 1 rebanada",
        "hummus 40 g",
        "pimentón dulce al gusto"
      ],
      "steps": [
        "Tuesta el pan y unta el hummus",
        "Añade pimentón si te gusta"
      ],
      "prep": ""
    },
    {
      "id": "huevo-tostada",
      "name": "Huevo duro con tostada",
      "minutes": 12,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "huevo 1 unidad",
        "pan integral 1 rebanada",
        "aceite de oliva 1 cucharadita"
      ],
      "steps": [
        "Cuece el huevo 10 minutos",
        "Sirve con pan y aceite"
      ],
      "prep": ""
    },
    {
      "id": "platano-cacahuetes",
      "name": "Plátano y cacahuetes",
      "minutes": 3,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "plátano 1 unidad",
        "cacahuetes naturales 20 g"
      ],
      "steps": [
        "Pela el plátano y acompáñalo con cacahuetes naturales"
      ],
      "prep": ""
    },
    {
      "id": "manzana-pavo",
      "name": "Manzana y lonchas de pavo",
      "minutes": 3,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "manzana 1 unidad",
        "pavo cocido 50 g"
      ],
      "steps": [
        "Lava la manzana y sirve con el pavo"
      ],
      "prep": ""
    },
    {
      "id": "batido-fruta",
      "name": "Batido de plátano y avena",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "plátano 1 unidad",
        "bebida de avena 200 ml",
        "copos de avena 25 g"
      ],
      "steps": [
        "Bate los tres ingredientes hasta que quede una mezcla homogénea",
        "Tómalo recién preparado"
      ],
      "prep": ""
    },
    {
      "id": "galletas-caseras-avena",
      "name": "Galletas caseras de avena y plátano",
      "minutes": 20,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "copos de avena 50 g",
        "plátano 1 unidad",
        "canela al gusto"
      ],
      "steps": [
        "Machaca el plátano y mezcla con la avena",
        "Forma montoncitos y hornéalos a 180 °C unos 15 minutos"
      ],
      "prep": "Puedes dejarlas preparadas del día anterior."
    },
    {
      "id": "pera-semillas",
      "name": "Pera con semillas de calabaza",
      "minutes": 3,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "pera 1 unidad",
        "semillas de calabaza 20 g"
      ],
      "steps": [
        "Lava la pera y acompaña de semillas"
      ],
      "prep": ""
    },
    {
      "id": "wrap-pavo",
      "name": "Rollito integral de pavo",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "tortilla integral 1 unidad",
        "pavo cocido 60 g",
        "lechuga 2 hojas"
      ],
      "steps": [
        "Rellena la tortilla con el pavo y la lechuga",
        "Enróllala firmemente"
      ],
      "prep": ""
    }
  ],
  "comida": [
    {
      "id": "pollo-arroz",
      "name": "Pollo con arroz y verduras salteadas",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pechuga de pollo 150 g",
        "arroz 70 g en seco",
        "calabacín 1/2 unidad",
        "zanahoria 1 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece el arroz",
        "Dora el pollo en tiras",
        "Saltea las verduras y mezcla con el arroz"
      ],
      "prep": ""
    },
    {
      "id": "pasta-pavo",
      "name": "Pasta integral con pavo y calabacín",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pasta integral 75 g en seco",
        "pavo fresco 150 g",
        "calabacín 1/2 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece la pasta",
        "Saltea el pavo y el calabacín",
        "Mezcla todo con aceite"
      ],
      "prep": ""
    },
    {
      "id": "lentejas-huevo",
      "name": "Lentejas rápidas con verduras y huevo",
      "minutes": 25,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "lentejas cocidas 200 g",
        "huevo 1 unidad",
        "zanahoria 1 unidad",
        "pimiento rojo 1/2 unidad",
        "aceite de oliva 1 cucharadita"
      ],
      "steps": [
        "Cuece el huevo",
        "Saltea la zanahoria y el pimiento",
        "Añade las lentejas escurridas y sirve con el huevo"
      ],
      "prep": ""
    },
    {
      "id": "merluza-patata",
      "name": "Merluza con patata y judías verdes",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad",
        "descanso"
      ],
      "ing": [
        "merluza 160 g",
        "patata 180 g",
        "judías verdes 120 g",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece la patata y las judías verdes",
        "Cocina la merluza a la plancha",
        "Aliña al servir"
      ],
      "prep": ""
    },
    {
      "id": "garbanzos-arroz",
      "name": "Garbanzos con arroz y verduras",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "garbanzos cocidos 180 g",
        "arroz 55 g en seco",
        "pimiento rojo 1/2 unidad",
        "zanahoria 1 unidad"
      ],
      "steps": [
        "Cuece el arroz",
        "Saltea las verduras",
        "Incorpora garbanzos y mezcla"
      ],
      "prep": ""
    },
    {
      "id": "ternera-patata",
      "name": "Ternera salteada con patata y espárragos",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "ternera magra 150 g",
        "patata 200 g",
        "espárragos verdes 100 g",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece o cocina al microondas la patata",
        "Dora la ternera y los espárragos",
        "Sirve junto"
      ],
      "prep": ""
    },
    {
      "id": "quinoa-pollo",
      "name": "Bol de quinoa, pollo y zanahoria",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "quinoa 65 g en seco",
        "pollo 150 g",
        "zanahoria 1 unidad",
        "pepino 1/2 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece la quinoa",
        "Haz el pollo a la plancha",
        "Añade zanahoria rallada y pepino"
      ],
      "prep": ""
    },
    {
      "id": "arroz-atun",
      "name": "Ensalada templada de arroz con atún y huevo",
      "minutes": 20,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "arroz 70 g en seco",
        "atún al natural 1 lata",
        "huevo 1 unidad",
        "judías verdes 100 g"
      ],
      "steps": [
        "Cuece arroz, huevo y judías",
        "Mezcla con atún escurrido",
        "Sirve templado"
      ],
      "prep": ""
    },
    {
      "id": "pavo-boniato",
      "name": "Pavo con boniato y brócoli",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pavo fresco 150 g",
        "boniato 200 g",
        "brócoli 120 g",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Asa el boniato en dados o cocínalo al microondas",
        "Cuece brócoli al vapor",
        "Dora el pavo"
      ],
      "prep": ""
    },
    {
      "id": "alubias-calabaza",
      "name": "Alubias blancas con calabaza",
      "minutes": 25,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "alubias blancas cocidas 200 g",
        "calabaza 150 g",
        "zanahoria 1 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece los dados de calabaza y zanahoria",
        "Añade las alubias y calienta",
        "Aliña con aceite"
      ],
      "prep": ""
    },
    {
      "id": "cuscus-pollo",
      "name": "Cuscús con pollo y verduras",
      "minutes": 20,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "cuscús 70 g en seco",
        "pollo 150 g",
        "calabacín 1/2 unidad",
        "pimiento rojo 1/2 unidad"
      ],
      "steps": [
        "Hidrata el cuscús según el envase",
        "Dora el pollo",
        "Saltea verduras y mezcla"
      ],
      "prep": ""
    },
    {
      "id": "tortilla-patata",
      "name": "Tortilla de patata ligera con ensalada",
      "minutes": 25,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "huevos 2 unidades",
        "patata 180 g",
        "lechuga 60 g",
        "pepino 1/2 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cocina la patata en microondas o al vapor",
        "Mézclala con los huevos y cuaja en sartén",
        "Acompaña de ensalada"
      ],
      "prep": ""
    },
    {
      "id": "arroz-gambas",
      "name": "Arroz con gambas y calabacín",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "arroz 70 g en seco",
        "gambas peladas 150 g",
        "calabacín 1/2 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece el arroz",
        "Saltea el calabacín y las gambas hasta cocinar",
        "Incorpora el arroz"
      ],
      "prep": ""
    },
    {
      "id": "pasta-garbanzos",
      "name": "Pasta con garbanzos y espinacas",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pasta integral 70 g en seco",
        "garbanzos cocidos 120 g",
        "espinacas 80 g",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece la pasta",
        "Saltea las espinacas",
        "Añade garbanzos y pasta y remueve"
      ],
      "prep": ""
    },
    {
      "id": "pollo-limon",
      "name": "Pollo al limón con patata y zanahoria",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pollo 150 g",
        "patata 180 g",
        "zanahoria 1 unidad",
        "limón 1/2 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece o asa la patata y la zanahoria",
        "Dora el pollo",
        "Añade zumo de limón al final"
      ],
      "prep": ""
    },
    {
      "id": "tofu-arroz",
      "name": "Tofu salteado con arroz y brócoli",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "tofu firme 160 g",
        "arroz 65 g en seco",
        "brócoli 120 g",
        "salsa de soja baja en sal 1 cucharadita"
      ],
      "steps": [
        "Cuece el arroz",
        "Dora el tofu en cubos",
        "Añade brócoli al vapor y salsa de soja"
      ],
      "prep": ""
    },
    {
      "id": "emperador-verduras",
      "name": "Emperador con patata y calabacín",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "emperador 160 g",
        "patata 180 g",
        "calabacín 1/2 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece la patata",
        "Prepara el emperador bien hecho a la plancha",
        "Saltea el calabacín"
      ],
      "prep": "Pescado grande: limitar la frecuencia según recomendaciones para grupos vulnerables por contenido en mercurio."
    },
    {
      "id": "pisto-sin-tomate",
      "name": "Verduras salteadas con huevo y arroz",
      "minutes": 25,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "arroz 60 g en seco",
        "huevos 2 unidades",
        "calabacín 1/2 unidad",
        "pimiento rojo 1/2 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece el arroz",
        "Saltea las verduras",
        "Añade huevos cuajados y sirve"
      ],
      "prep": ""
    },
    {
      "id": "arroz-pollo-curry",
      "name": "Arroz con pollo y curry suave",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "arroz 70 g en seco",
        "pollo 150 g",
        "zanahoria 1 unidad",
        "bebida vegetal sin azúcar 50 ml",
        "curry suave al gusto"
      ],
      "steps": [
        "Cuece el arroz",
        "Dora el pollo con zanahoria",
        "Añade bebida vegetal y curry y reduce un poco"
      ],
      "prep": ""
    },
    {
      "id": "burrito-alubias",
      "name": "Wrap integral con alubias y pavo",
      "minutes": 15,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "tortilla integral 1 unidad",
        "alubias cocidas 100 g",
        "pavo cocido 80 g",
        "lechuga 40 g"
      ],
      "steps": [
        "Calienta la tortilla",
        "Rellena con alubias templadas, pavo y lechuga",
        "Enrolla"
      ],
      "prep": ""
    },
    {
      "id": "ensalada-quinoa",
      "name": "Ensalada de quinoa, huevo y pepino",
      "minutes": 20,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "quinoa 70 g en seco",
        "huevo 1 unidad",
        "pepino 1/2 unidad",
        "zanahoria 1 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece quinoa y huevo",
        "Añade pepino y zanahoria",
        "Aliña y sirve"
      ],
      "prep": ""
    },
    {
      "id": "lentejas-arroz",
      "name": "Arroz con lentejas y zanahoria",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad",
        "descanso"
      ],
      "ing": [
        "lentejas cocidas 160 g",
        "arroz 55 g en seco",
        "zanahoria 1 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece el arroz",
        "Saltea zanahoria rallada",
        "Mezcla con las lentejas"
      ],
      "prep": ""
    }
  ],
  "merienda": [
    {
      "id": "yogur-platano",
      "name": "Yogur vegetal con plátano y avena",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "yogur vegetal natural 125 g",
        "plátano 1/2 unidad",
        "copos de avena 25 g"
      ],
      "steps": [
        "Mezcla el yogur con la avena y el plátano cortado"
      ],
      "prep": ""
    },
    {
      "id": "tostada-pavo",
      "name": "Tostada de pavo",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "pan integral 1 rebanada",
        "pavo cocido 50 g"
      ],
      "steps": [
        "Tuesta el pan y añade pavo"
      ],
      "prep": ""
    },
    {
      "id": "fruta-almendras",
      "name": "Fruta de temporada con almendras",
      "minutes": 3,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "fruta de temporada 1 pieza",
        "almendras 20 g"
      ],
      "steps": [
        "Lava o pela la fruta y acompáñala de almendras"
      ],
      "prep": ""
    },
    {
      "id": "hummus-zanahoria",
      "name": "Hummus con bastones de zanahoria",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "hummus 50 g",
        "zanahoria 1 unidad"
      ],
      "steps": [
        "Pela y corta la zanahoria en bastones",
        "Sírvela con hummus"
      ],
      "prep": ""
    },
    {
      "id": "batido-fresas",
      "name": "Batido de fresas con bebida vegetal",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "fresas 120 g",
        "bebida de avena 200 ml",
        "copos de avena 20 g"
      ],
      "steps": [
        "Lava las fresas",
        "Bate con la bebida vegetal y la avena"
      ],
      "prep": ""
    },
    {
      "id": "sandwich-huevo",
      "name": "Sándwich integral de huevo",
      "minutes": 12,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pan integral 2 rebanadas",
        "huevo 1 unidad",
        "lechuga 2 hojas"
      ],
      "steps": [
        "Cuece el huevo",
        "Monta el sándwich con lechuga"
      ],
      "prep": ""
    },
    {
      "id": "manzana-canela",
      "name": "Manzana con canela y nueces",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "manzana 1 unidad",
        "nueces 20 g",
        "canela al gusto"
      ],
      "steps": [
        "Trocea la manzana",
        "Añade nueces y canela"
      ],
      "prep": ""
    },
    {
      "id": "palitos-pan",
      "name": "Palitos integrales con queso sin lactosa",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "palitos integrales 40 g",
        "queso fresco sin lactosa 50 g"
      ],
      "steps": [
        "Sirve los palitos con queso sin lactosa"
      ],
      "prep": ""
    },
    {
      "id": "tortita-arroz",
      "name": "Tortitas de arroz con crema de cacahuete",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "tortitas de arroz 2 unidades",
        "crema de cacahuete 15 g"
      ],
      "steps": [
        "Unta la crema de cacahuete sobre las tortitas"
      ],
      "prep": ""
    },
    {
      "id": "pera-yogur",
      "name": "Pera con yogur vegetal",
      "minutes": 3,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "pera 1 unidad",
        "yogur vegetal natural 125 g"
      ],
      "steps": [
        "Pela o lava la pera",
        "Sírvela con yogur"
      ],
      "prep": ""
    },
    {
      "id": "mini-wrap-atun",
      "name": "Mini wrap de atún",
      "minutes": 5,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "tortilla integral 1 unidad pequeña",
        "atún al natural 1/2 lata",
        "pepino 1/4 unidad"
      ],
      "steps": [
        "Rellena la tortilla con atún escurrido y pepino",
        "Enróllala"
      ],
      "prep": ""
    },
    {
      "id": "platano-cacao",
      "name": "Plátano con crema de cacahuete y cacao",
      "minutes": 3,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "plátano 1 unidad",
        "crema de cacahuete 15 g",
        "cacao puro 1 cucharadita"
      ],
      "steps": [
        "Corta el plátano",
        "Añade la crema de cacahuete y espolvorea cacao"
      ],
      "prep": ""
    }
  ],
  "cena": [
    {
      "id": "tortilla-calabacin",
      "name": "Tortilla de calabacín con pan integral",
      "minutes": 15,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "huevos 2 unidades",
        "calabacín 1/2 unidad",
        "pan integral 1 rebanada",
        "aceite de oliva 1 cucharadita"
      ],
      "steps": [
        "Saltea el calabacín en dados",
        "Añade los huevos batidos y cuaja",
        "Sirve con el pan"
      ],
      "prep": ""
    },
    {
      "id": "pollo-patata",
      "name": "Pollo al horno rápido con patata y zanahoria",
      "minutes": 30,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pollo 150 g",
        "patata 180 g",
        "zanahoria 1 unidad",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Corta la patata y zanahoria en trozos pequeños",
        "Cocínalas en horno o freidora de aire hasta que ablanden",
        "Añade el pollo y comprueba que esté bien cocinado"
      ],
      "prep": ""
    },
    {
      "id": "arroz-huevo",
      "name": "Ensalada templada de arroz, huevo y verduras",
      "minutes": 20,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "arroz 60 g en seco",
        "huevos 2 unidades",
        "zanahoria 1 unidad",
        "judías verdes 100 g"
      ],
      "steps": [
        "Cuece arroz, huevos y judías",
        "Mezcla con zanahoria rallada"
      ],
      "prep": ""
    },
    {
      "id": "crema-calabaza",
      "name": "Crema de calabaza y tostada de pavo",
      "minutes": 25,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "calabaza 200 g",
        "patata 100 g",
        "pan integral 1 rebanada",
        "pavo cocido 60 g"
      ],
      "steps": [
        "Cuece calabaza y patata hasta ablandar",
        "Tritura con el agua de cocción",
        "Sirve con tostada de pavo"
      ],
      "prep": ""
    },
    {
      "id": "merluza-arroz",
      "name": "Merluza con arroz y espárragos",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "merluza 150 g",
        "arroz 60 g en seco",
        "espárragos verdes 100 g",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece el arroz",
        "Haz la merluza a la plancha",
        "Saltea los espárragos"
      ],
      "prep": ""
    },
    {
      "id": "ensalada-garbanzos",
      "name": "Ensalada templada de garbanzos y huevo",
      "minutes": 15,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "garbanzos cocidos 150 g",
        "huevo 1 unidad",
        "pepino 1/2 unidad",
        "zanahoria 1 unidad"
      ],
      "steps": [
        "Cuece el huevo",
        "Mezcla con garbanzos templados y verduras troceadas"
      ],
      "prep": ""
    },
    {
      "id": "revuelto-espinacas",
      "name": "Revuelto de espinacas y pavo",
      "minutes": 12,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "huevos 2 unidades",
        "espinacas 80 g",
        "pavo cocido 60 g",
        "pan integral 1 rebanada"
      ],
      "steps": [
        "Saltea las espinacas",
        "Añade huevo batido y pavo",
        "Sirve con pan"
      ],
      "prep": ""
    },
    {
      "id": "pavo-calabacin",
      "name": "Filetes de pavo con calabacín y boniato",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pavo fresco 150 g",
        "calabacín 1/2 unidad",
        "boniato 180 g",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cocina el boniato al microondas u horno",
        "Haz el pavo a la plancha",
        "Saltea el calabacín"
      ],
      "prep": ""
    },
    {
      "id": "sopa-verduras",
      "name": "Sopa suave de verduras con huevo",
      "minutes": 25,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "zanahoria 1 unidad",
        "patata 100 g",
        "calabacín 1/2 unidad",
        "huevo 1 unidad",
        "caldo de verduras 300 ml"
      ],
      "steps": [
        "Cuece las verduras en el caldo",
        "Añade el huevo batido y remueve hasta cuajar"
      ],
      "prep": ""
    },
    {
      "id": "quinoa-tofu",
      "name": "Quinoa con tofu y espinacas",
      "minutes": 20,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "quinoa 60 g en seco",
        "tofu firme 130 g",
        "espinacas 80 g",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece la quinoa",
        "Dora el tofu",
        "Incorpora las espinacas salteadas"
      ],
      "prep": ""
    },
    {
      "id": "ensalada-patata-atun",
      "name": "Ensalada de patata con atún y judías",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "patata 200 g",
        "atún al natural 1 lata",
        "judías verdes 120 g",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece patata y judías",
        "Añade atún escurrido",
        "Aliña con aceite"
      ],
      "prep": ""
    },
    {
      "id": "crema-zanahoria",
      "name": "Crema de zanahoria con huevo duro",
      "minutes": 25,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "zanahoria 200 g",
        "patata 100 g",
        "huevo 1 unidad",
        "aceite de oliva 1 cucharadita"
      ],
      "steps": [
        "Cuece zanahoria y patata y tritura",
        "Cuece el huevo y añádelo picado"
      ],
      "prep": ""
    },
    {
      "id": "fajitas-pollo",
      "name": "Fajitas suaves de pollo y pimiento",
      "minutes": 20,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "tortillas integrales 2 unidades",
        "pollo 140 g",
        "pimiento rojo 1/2 unidad",
        "lechuga 2 hojas"
      ],
      "steps": [
        "Saltea pollo y pimiento",
        "Rellena las tortillas con lechuga y pollo"
      ],
      "prep": ""
    },
    {
      "id": "tostadas-sardinas",
      "name": "Tostadas de sardinas y pepino",
      "minutes": 5,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "pan integral 2 rebanadas",
        "sardinas en conserva 1 lata",
        "pepino 1/3 unidad"
      ],
      "steps": [
        "Tuesta el pan",
        "Coloca las sardinas escurridas y el pepino en rodajas"
      ],
      "prep": ""
    },
    {
      "id": "tortilla-esparragos",
      "name": "Tortilla de espárragos con patata cocida",
      "minutes": 20,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "huevos 2 unidades",
        "espárragos verdes 100 g",
        "patata 150 g"
      ],
      "steps": [
        "Cuece patata en dados",
        "Saltea espárragos",
        "Cuaja la tortilla y sirve"
      ],
      "prep": ""
    },
    {
      "id": "pollo-puerro",
      "name": "Pollo con puerro y arroz",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pollo 150 g",
        "puerro 1/2 unidad",
        "arroz 60 g en seco",
        "aceite de oliva 1 cucharada"
      ],
      "steps": [
        "Cuece el arroz",
        "Dora pollo y puerro",
        "Mezcla y sirve"
      ],
      "prep": ""
    },
    {
      "id": "ensalada-lentejas",
      "name": "Ensalada templada de lentejas con pavo",
      "minutes": 15,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "lentejas cocidas 160 g",
        "pavo cocido 70 g",
        "zanahoria 1 unidad",
        "pepino 1/2 unidad"
      ],
      "steps": [
        "Calienta ligeramente las lentejas",
        "Añade pavo y verduras",
        "Mezcla"
      ],
      "prep": ""
    },
    {
      "id": "pescado-papillote",
      "name": "Merluza al papillote con verduras",
      "minutes": 25,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "merluza 160 g",
        "calabacín 1/2 unidad",
        "zanahoria 1 unidad",
        "patata 150 g"
      ],
      "steps": [
        "Envuelve pescado y verduras en papel apto para horno",
        "Hornea hasta que el pescado esté bien cocinado",
        "Acompaña con patata cocida"
      ],
      "prep": ""
    },
    {
      "id": "bowl-pollo",
      "name": "Bol de pollo y arroz con verduras al vapor",
      "minutes": 25,
      "modes": [
        "fuerza",
        "actividad"
      ],
      "ing": [
        "pollo 150 g",
        "arroz 60 g en seco",
        "brócoli 100 g",
        "zanahoria 1 unidad"
      ],
      "steps": [
        "Cuece arroz y verduras",
        "Dora el pollo",
        "Sirve todo en un cuenco"
      ],
      "prep": ""
    },
    {
      "id": "verduras-huevos",
      "name": "Salteado de verduras con huevos revueltos",
      "minutes": 15,
      "modes": [
        "actividad",
        "descanso"
      ],
      "ing": [
        "huevos 2 unidades",
        "calabacín 1/2 unidad",
        "zanahoria 1 unidad",
        "espinacas 50 g",
        "aceite de oliva 1 cucharadita"
      ],
      "steps": [
        "Saltea las verduras",
        "Añade huevos batidos y remueve hasta cuajar"
      ],
      "prep": ""
    }
  ]
};
  const slots=[['desayuno','Desayuno'],['almuerzo','Media mañana'],['comida','Comida'],['merienda','Merienda'],['cena','Cena']];
  let selectedMenuDate=today();
  const allRecipes=()=>Object.values(MEAL_OPTIONS).flat();
  function isAllowed(rec){const x=data()?.exclusions||[];
    return !x.some(term=>{const t=norm(term);return t&&(
      rec.ing.some(i=>norm(i).includes(t)) ||
      norm(rec.name).includes(t)
    );});
  }
  function strengthDay(date){
    try{
      const selected=data()?.dailyMode?.[date];
      if(selected==='descanso')return 'descanso';
      if(selected==='ligero')return 'actividad';
      const p=typeof trainingPlan==='function'?trainingPlan(date):null;
      if(!p)return 'desconocido';
      if(p.kind==='fuerza')return 'fuerza';
      if(['activo','actividad'].includes(p.kind))return 'actividad';
      if(['descanso','precaucion','suave'].includes(p.kind))return 'descanso';
      return 'actividad';
    }catch(_){return 'desconocido';}
  }
  function mealFor(date,slot){
    const s=data();if(!s)return null;
    const allowed=(MEAL_OPTIONS[slot]||[]).filter(isAllowed);
    if(!allowed.length)return null;
    const chosen=s.meals[date]?.[slot];
    const selected=allowed.find(r=>r.id===chosen);
    if(selected)return selected;
    const mode=strengthDay(date);
    // El tipo de entrenamiento solo orienta la rotación, no restringe comida ni grupos de alimentos.
    const preferred=allowed.filter(r=>r.modes.includes(mode));
    const pool=preferred.length?preferred:allowed;
    const epochDay=Math.floor(atDay(date).getTime()/86400000);
    const salt=slots.findIndex(x=>x[0]===slot)*7;
    return pool[((epochDay+salt)%pool.length+pool.length)%pool.length];
  }
  function mealChange(date,slot,id){
    const s=data();if(!s||!MEAL_OPTIONS[slot]?.some(r=>r.id===id&&isAllowed(r)))return;
    (s.meals[date] ||= {})[slot]=id;commit('Comida cambiada.');
  }
  function menuGo(offset){
    if(!Number.isInteger(offset)||Math.abs(offset)>7)return;
    selectedMenuDate=shiftDate(selectedMenuDate,offset);refreshMenu();
  }
  function refreshMenu(){if(typeof nutritionDate!=='undefined')nutritionDate=selectedMenuDate;if(typeof nutritionFollowToday!=='undefined')nutritionFollowToday=selectedMenuDate===today();if(dialog?.open)open('menu');else render();}
  function menuToday(){selectedMenuDate=today();refreshMenu();}
  function addExclusion(){
    const s=data();if(!s)return;
    const raw=prompt('Ingredientes a evitar, separados por comas (ej.: leche, setas, tomate)',s.exclusions.join(', '));
    if(raw===null)return;
    s.exclusions=[...new Set(raw.split(',').map(x=>norm(x)).filter(Boolean))].slice(0,40);
    commit('Preferencias alimentarias guardadas.');
  }
  function recipeDetails(r){
    const prep=r.prep?`<p class="re36-prep"><strong>Preparación anticipada:</strong> ${xss(r.prep)}</p>`:'';
    return `<details class="re36-recipe"><summary>Ver ingredientes y preparación · ${r.minutes} min de trabajo aprox.</summary>
      <p><strong>Ingredientes orientativos (1 persona)</strong></p>
      <ul>${r.ing.map(i=>`<li>${xss(i)}</li>`).join('')}</ul>
      <p><strong>Cómo se hace</strong></p>
      <ol>${r.steps.map(i=>`<li>${xss(i)}</li>`).join('')}</ol>${prep}
      <p class="small">Ajusta las cantidades a tu apetito y necesidades. Asegúrate de cocinar correctamente los alimentos perecederos.</p>
    </details>`;
  }
  function dayMenuHTML(date){
    const mode=strengthDay(date);
    const labels={fuerza:'💪 Entrenamiento de fuerza',actividad:'🚶 Actividad ligera',descanso:'🌿 Descanso y recuperación',desconocido:'🍽️ Día equilibrado'};
    return `<p class="re36-date"><strong>${labels[mode]}</strong> · ${xss(atDay(date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}))}</p>${slots.map(([slot,label])=>{
      const r=mealFor(date,slot);const options=MEAL_OPTIONS[slot].filter(isAllowed);
      const ident=`re36_${slot}`;
      return `<div class="re36-meal"><label for="${ident}">${label}</label>${r?`<select id="${ident}" onchange="RE36.mealChange('${date}','${slot}',this.value)">${options.map(o=>`<option value="${o.id}" ${r.id===o.id?'selected':''}>${xss(o.name)}</option>`).join('')}</select>
        ${recipeDetails(r)}${typeof page!=='undefined'&&page==='Nutrición'&&!dialog?.open?`<button type="button" class="secondary" onclick="RE36.logMeal('${slot}')">Añadir al registro</button>`:''}`:'<p>No hay opciones compatibles con tus ingredientes excluidos. Revisa las preferencias.</p>'}</div>`;
    }).join('')}`;
  }
  function logMeal(slot){const recipe=mealFor(selectedMenuDate,slot),label=slots.find(([id])=>id===slot)?.[1];if(!recipe||!label||typeof setSuggestedMeal!=='function')return;setSuggestedMeal(recipe.name,label);}
  function groceryHTML(){
    const list=new Map();
    for(let i=0;i<7;i++){
      const date=shiftDate(selectedMenuDate,i);
      for(const [key] of slots){
        const r=mealFor(date,key);
        for(const ingredient of r?.ing||[]){
          const name=String(ingredient).trim();
          list.set(name,(list.get(name)||0)+1);
        }
      }
    }
    return `<details class="re36-grocery"><summary>🛒 Lista orientativa para 7 días (desde ${xss(selectedMenuDate)})</summary>
      <p class="small">Agrupa ingredientes con la cantidad orientativa por ración. Revisa y suma cantidades antes de comprar: distintas recetas pueden expresar el mismo alimento de formas diferentes.</p>
      <ul>${[...list.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([name,n])=>`<li>${xss(name)}${n>1?' · aparece '+n+' veces':''}</li>`).join('')}</ul></details>`;
  }
  function menuHTML(){
    const s=data();if(!s)return '';
    const date=selectedMenuDate;
    return `<section class="card re36-card" id="re36-menu"><h2>🍽️ Menú adaptable al entrenamiento</h2>
      <p class="small">${allRecipes().length} platos · 5 comidas al día</p>
      <div class="re36-row"><button type="button" class="secondary" onclick="RE36.menuGo(-1)">← Día anterior</button><button type="button" class="secondary" onclick="RE36.menuToday()">Hoy</button><button type="button" class="secondary" onclick="RE36.menuGo(1)">Día siguiente →</button></div>
      ${dayMenuHTML(date)}
      <button type="button" class="secondary" onclick="RE36.addExclusion()">Editar ingredientes a evitar (${s.exclusions.length})</button>
      ${groceryHTML()}
      <p class="small">Las propuestas no sustituyen una valoración nutricional individual. Verifica ingredientes, alérgenos y tolerancias. Un día de descanso también necesita alimentación suficiente.</p></section>`;
  }
    function xpHTML(){const a=level();return `<section class="card re36-card"><h2>✨ Tu experiencia</h2><p><strong>Nivel ${a.level}</strong> · <strong>${a.part}/${a.next} XP</strong> para el siguiente nivel</p>${bar(a.part,a.next)}<p class="small">Te faltan ${a.left} XP · Total acumulado: ${a.total}. </p></section>`;}
  function storyHTML(){const s=data();if(!s)return '';
    const start=/^\d{4}-\d{2}-\d{2}$/.test(String(d.start||''))?d.start:today();const elapsed=clamp(Math.floor((atDay(today())-atDay(start))/(24*3600*1000))+1,1,66);
    const chapters=['El despertar','El bosque del cambio','La senda de la constancia','La fortaleza del equilibrio','La cumbre interior','El nuevo horizonte'];
    return `<section class="card re36-card"><h2>🗺️ Tu aventura de 66 días</h2><p>Capítulo ${Math.ceil(elapsed/11)} · ${xss(chapters[Math.floor((elapsed-1)/11)])}</p>
      <div class="re36-map" aria-label="Mapa de 66 días">${Array.from({length:66},(_,i)=>{const day=i+1;const date=shiftDate(start,i);const done=!!s.dayDone[date];return `<span class="re36-step ${done?'done':day===elapsed?'current':''}" title="Día ${day} · ${date}" aria-label="Día ${day}${done?', misión cerrada':''}">${day}</span>`;}).join('')}</div>
      <p>Día ${elapsed} de 66</p>
      <div class="re36-row"><button class="${s.dayDone[today()]?'secondary':'primary'}" onclick="RE36.finishDay()">${s.dayDone[today()]?'✓ Etapa de hoy completada':'Cerrar la etapa de hoy · +5 XP'}</button>
      </div></section>`;
  }
  function finishDay(){const s=data();if(!s)return;const k=today();if(s.dayDone[k])return;
    s.dayDone[k]={xp:5,at:new Date().toISOString()};d.xp=xp()+5;unlocks();commit('Etapa completada · +5 XP.');}
  function dayModeHTML(){const s=data();const mode=s.dailyMode[today()]||'normal';return `<section class="card re36-card"><h2>🌿 Elige tu ritmo de hoy</h2><div class="re36-row">${[['normal','Día completo'],['ligero','Día ligero'],['descanso','Descanso']].map(([v,n])=>`<button class="${mode===v?'primary':'secondary'}" onclick="RE36.setMode('${v}')">${n}</button>`).join('')}</div></section>`;}
  function setMode(mode){const s=data();if(!s||!['normal','ligero','descanso'].includes(mode))return;s.dailyMode[today()]=mode;commit('Ritmo del día actualizado.');}
  const ITEMS=[
    {id:'capa',name:'Capa del comienzo',cost:20,mark:'🧥'},
    {id:'diadema',name:'Diadema luminosa',cost:30,mark:'👑'},
    {id:'bosque',name:'Fondo del bosque encantado',cost:35,mark:'🌲'},
    {id:'alas',name:'Emblema de alas de luz',cost:60,mark:'🪽'},
    {id:'dragon',name:'Insignia del dragón',cost:80,mark:'🐉'}
  ];
  function shopHTML(){const s=data();return `<section class="card re36-card"><h2>🎒 Inventario y recompensas</h2><p>Saldo: <strong>${s.coins} monedas</strong></p>
    ${ITEMS.map(x=>`<div class="re36-row re36-shop"><span>${x.mark} <strong>${xss(x.name)}</strong></span><button class="secondary" type="button" onclick="RE36.buy('${x.id}')" ${s.items.includes(x.id)||s.coins<x.cost?'disabled':''}>${s.items.includes(x.id)?'Conseguido':x.cost+' monedas'}</button></div>`).join('')}
    <details class="re36-help"><summary>Sobre las recompensas</summary><p>Son objetos coleccionables del inventario; no son prendas equipables.</p></details></section>`;}
  function buy(id){const s=data();const it=ITEMS.find(x=>x.id===id);if(!s||!it||s.items.includes(id)||s.coins<it.cost)return;
    s.coins-=it.cost;s.items.push(id);commit('Recompensa desbloqueada.');}
  function achievementsHTML(){const s=data(),names={primera_mision:'Primer hábito',diez_habitos:'10 hábitos',cincuenta_habitos:'50 hábitos',semana_constante:'Una semana seguida',capitulo_uno:'Primer capítulo terminado'};
    return `<section class="card re36-card"><h2>🏅 Logros</h2>${Object.entries(names).map(([id,label])=>`<p>${s.achievements[id]?'🏆':'🔒'} ${xss(label)} ${s.achievements[id]?'· '+s.achievements[id]:''}</p>`).join('')}</section>`;}
  function journalHTML(){const s=data(),key=today(),v=s.journal[key]||{};return `<section class="card re36-card"><h2>📖 Diario de la aventura</h2><label for="re36_mood">¿Cómo ha ido el día?</label><select id="re36_mood">${[['','Sin valorar'],['muybien','Muy bien'],['bien','Bien'],['normal','Normal'],['cansada','Con poca energía'],['dificil','Difícil']].map(([id,label])=>`<option value="${id}" ${v.mood===id?'selected':''}>${label}</option>`).join('')}</select>
    <label for="re36_note">Notas privadas (máximo 1000 caracteres)</label><textarea id="re36_note" maxlength="1000" rows="3">${xss(v.note||'')}</textarea>
    <button class="primary" onclick="RE36.saveJournal()">Guardar diario</button>
    <details><summary>Entradas anteriores</summary>${Object.entries(s.journal).filter(([date])=>date!==key).sort(([a],[b])=>b.localeCompare(a)).slice(0,20).map(([date,e])=>`<p><strong>${xss(date)}</strong> · ${xss(e.mood||'Sin valorar')}<br>${xss(e.note||'')}</p>`).join('')||'<p>Aún no hay entradas anteriores.</p>'}</details></section>`;}
  function saveJournal(){const s=data();const mood=document.getElementById('re36_mood')?.value||'';const note=document.getElementById('re36_note')?.value.slice(0,1000)||'';
    if(!s)return;s.journal[today()]={mood,note,updated:new Date().toISOString()};commit('Diario guardado.');}
  function workoutHTML(){const s=data(),k=today(),row=s.workouts[k]||{};const plan=strengthDay(k);
    return `<section class="card re36-card"><h2>🏋️ Registro de entrenamiento</h2><p>Plan de hoy: <strong>${xss(({fuerza:'Fuerza',actividad:'Actividad ligera',descanso:'Descanso',desconocido:'Sin plan'})[plan])}</strong>.</p>
    <label for="re36_sets">Series realizadas</label><input id="re36_sets" type="number" min="0" max="40" value="${Number(row.sets)||0}">
    <label for="re36_reps">Repeticiones por serie (aproximadas)</label><input id="re36_reps" type="number" min="0" max="100" value="${Number(row.reps)||0}">
    <label for="re36_load">Carga utilizada, kg (opcional)</label><input id="re36_load" type="number" min="0" max="400" step="0.5" value="${Number(row.kg)||0}">
    <label for="re36_effort">Esfuerzo percibido (1–10)</label><input id="re36_effort" type="number" min="1" max="10" value="${Number(row.effort)||5}">
    <button class="primary" onclick="RE36.saveWorkout()">Guardar sesión</button></section>`;}
  function saveWorkout(){const s=data(),val=(id)=>Number(document.getElementById('re36_'+id)?.value||0);
    const [sets,reps,kg,effort]=['sets','reps','load','effort'].map(val);
    if(![sets,reps,kg,effort].every(Number.isFinite)||sets<0||sets>40||reps<0||reps>100||kg<0||kg>400||effort<1||effort>10)return alert('Revisa series, repeticiones, carga y esfuerzo.');
    s.workouts[today()]={sets,reps,kg,effort};commit('Entrenamiento registrado.');}
  function reportHTML(){const s=data();if(!s)return '';const days=Array.from({length:28},(_,i)=>shiftDate(today(),i-27));
    const total=days.reduce((a,k)=>a+Object.keys(s.checks[k]||{}).length,0),daysDone=days.filter(k=>Object.keys(s.checks[k]||{}).length>0).length;
    const trained=days.filter(k=>Boolean(d.trainingDone?.[k])).length;
    const moods={};for(const k of days){const m=s.journal[k]?.mood;if(m)moods[m]=(moods[m]||0)+1;}
    return `<section class="card re36-card"><h2>📊 Tu progreso de 28 días</h2><div class="re36-stats"><div><strong>${total}</strong><small>Hábitos completados</small></div><div><strong>${daysDone}/28</strong><small>Días con hábitos</small></div><div><strong>${trained}</strong><small>Entrenamientos marcados</small></div></div>
      <p>Estado de ánimo: ${Object.entries(moods).map(([k,n])=>xss(k)+': '+n).join(' · ')||'Sin registros'}</p>
      </section>`;}
  function reminderHTML(){const s=data();const set=s.reminders;return `<section class="card re36-card"><h2>🔔 Recordatorios opcionales</h2><p>Funcionan mientras Reformándome esté abierta. No son notificaciones push en segundo plano.</p>
    <label for="re36_remind_time">Hora del recordatorio diario</label><input id="re36_remind_time" type="time" value="${xss(set.time||'19:00')}">
    <label><input type="checkbox" id="re36_remind_enabled" ${set.enabled?'checked':''}> Activar</label>
    <button class="secondary" onclick="RE36.saveReminder()">Guardar</button> <button class="secondary" onclick="RE36.askNotifications()">Permiso para avisos del navegador</button></section>`;}
  function saveReminder(){const s=data();if(!s)return;const time=document.getElementById('re36_remind_time')?.value;
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))return alert('Indica una hora válida.');
    s.reminders={time,enabled:!!document.getElementById('re36_remind_enabled')?.checked,last:s.reminders.last||''};
    commit('Recordatorio guardado.');}
  function reminderTick(){const s=data();if(!s||!s.reminders.enabled)return;const now=new Date(),time=[String(now.getHours()).padStart(2,'0'),String(now.getMinutes()).padStart(2,'0')].join(':');
    if(time!==s.reminders.time||s.reminders.last===today())return;
    s.reminders.last=today();save();window.RECloud?.queue?.();
    if(window.Notification?.permission==='granted'&&document.visibilityState==='visible')new Notification('Reformándome',{body:'¿Cómo va tu aventura de hoy? Puedes elegir un día ligero o descansar.'});
    else if(document.visibilityState==='visible'&&typeof stamp==='function')stamp('Recuerda revisar tu aventura de hoy.');
  }
  function askNotifications(){if(!('Notification' in window))return alert('Este navegador no admite esta clase de notificación.');
    if(Notification.permission==='default')Notification.requestPermission().then(p=>alert(p==='granted'?'Avisos habilitados mientras la app esté abierta.':'No se han habilitado notificaciones.'));}
  function themesHTML(){const theme=data()?.theme||'violet';return `<section class="card re36-card"><h2>🎨 Aspecto</h2><div class="re36-row">${[['violet','Violeta'],['forest','Bosque'],['contrast','Alto contraste']].map(([v,n])=>`<button class="${theme===v?'primary':'secondary'}" onclick="RE36.setTheme('${v}')">${n}</button>`).join('')}</div></section>`;}
  function applyTheme(){const s=data();if(!s)return;document.documentElement.dataset.re36theme=s.theme;}
  function setTheme(t){if(!['violet','forest','contrast'].includes(t))return;data().theme=t;applyTheme();commit('Tema actualizado.');}
  function questsHTML(){const s=data();return `<section class="card re36-card"><h2>🎯 Retos personalizados</h2>
    ${s.customChallenges.map(ch=>`<div class="re36-habit"><span class="re36-flex"><strong>${xss(ch.title)}</strong><small>${ch.done?'Completado':'Pendiente'} · +${ch.xp} XP</small></span><button class="secondary" ${ch.done?'disabled':''} onclick="RE36.completeChallenge('${ch.id}')">${ch.done?'✓':'Completar'}</button></div>`).join('')}
    <button class="secondary" onclick="RE36.addChallenge()">+ Nuevo reto personal</button>
    </section>`;}
  function addChallenge(){const s=data();if(!s)return;const name=prompt('Título del reto personal (máximo 65 caracteres)');if(name===null)return;
    if(!name.trim()||name.length>65)return alert('Escribe un título válido.');
    if(s.customChallenges.length>=50)return alert('Máximo 50 retos; termina algunos antes de añadir más.');
    s.customChallenges.push({id:'q'+Date.now().toString(36),title:name.trim(),xp:15,done:false});commit('Reto añadido.');}
  function completeChallenge(id){const s=data();const ch=s?.customChallenges.find(x=>x.id===id&&!x.done);if(!ch)return;
    ch.done=true;ch.completed=today();d.xp=xp()+ch.xp;commit('Reto completado · +'+ch.xp+' XP.');}
  function achievementsAndSocial(){return `<section class="card re36-card"><h2>🤝 Retos con amigos y gremios</h2>
    ${window.RE36Social?.card?.()||'<p>Los retos compartidos no están disponibles en este momento.</p>'}
    <p class="small">Introduce tus pasos manualmente.</p></section>`;}
  function hub(sections=['inicio','habitos','menu','recompensas','diario','retos','social','ajustes']){
    const blocks={inicio:()=>xpHTML()+dayModeHTML()+storyHTML()+reportHTML(),habitos:habitsHTML,menu:menuHTML,recompensas:()=>shopHTML()+achievementsHTML(),diario:()=>journalHTML()+workoutHTML(),retos:questsHTML,social:achievementsAndSocial,ajustes:()=>reminderHTML()+themesHTML()};
    return sections.map(n=>blocks[n]?.()||'').join('');
  }
  let dialog=null;let activeSection='inicio';
  function open(section='inicio'){
    if(!data())return alert('Accede a tu cuenta antes de abrir la aventura.');
    if(!dialog){dialog=document.createElement('dialog');dialog.className='re36-dialog';dialog.setAttribute('aria-label','Aventura de Reformándome');document.body.append(dialog);}
    const tabs=[['inicio','Aventura'],['habitos','Hábitos'],['menu','Nutrición'],['retos','Mis retos'],['social','Amigos'],['recompensas','Logros'],['diario','Diario'],['ajustes','Opciones']];
    if(!tabs.some(x=>x[0]===section))section='inicio';
    activeSection=section;
    dialog.innerHTML=`<div class="re36-inner"><div class="re36-dialog-header"><h2>✦ Mi aventura</h2><button class="secondary" onclick="RE36.close()" aria-label="Cerrar">✕</button></div>
      <nav class="re36-tabs" aria-label="Secciones de la aventura">${tabs.map(([id,label])=>`<button class="${id===section?'primary':'secondary'}" aria-current="${id===section?'page':'false'}" onclick="RE36.open('${id}')">${label}</button>`).join('')}</nav>
      ${hub([section])}</div>`;
    if(!dialog.open)dialog.showModal();dialog.scrollTop=0;const inner=dialog.querySelector?.('.re36-inner');if(inner)inner.scrollTop=0;
  }
  function close(){if(dialog?.open)dialog.close();}
  const css=document.createElement('style');css.textContent=`
    .re36-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.re36-grid button{min-width:0;margin:0;white-space:normal}
    .re36-fold,.re36-help,.re36-grocery{border:1px solid #655273;border-radius:12px;padding:12px;margin:12px 0;background:rgba(80,54,105,.12)}
    .re36-fold>summary,.re36-help>summary,.re36-grocery>summary{cursor:pointer;font-weight:650;line-height:1.4}.re36-fold>summary{padding:5px 0}.re36-date{text-transform:none}
    .re36-habit .re36-flex{overflow-wrap:anywhere}.re36-dialog .re36-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:visible;gap:6px}.re36-dialog .re36-tabs button{min-width:0;white-space:normal;padding:8px 4px;margin:0;font-size:12px}
    .re36-dialog .re36-card{margin-top:10px}.re36-card h2{font-size:1.15rem}.re36-dialog-header{position:sticky;top:0;background:#1d1729;z-index:2;padding:4px 0}
    .re36-card{margin-top:17px}.re36-card h2{margin-bottom:10px}.re36-card .small{line-height:1.5}
    .re36-meter{height:12px;background:#423452;border-radius:100px;overflow:hidden;margin:12px 0}
    .re36-meter i{display:block;height:100%;background:linear-gradient(90deg,#b994ed,#d6c5ff);border-radius:100px}
    .re36-habit{display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid #594968}
    .re36-habit button{flex-shrink:0;min-height:40px}.re36-flex{flex:1;min-width:0}.re36-flex small{display:block;opacity:.85}
    .re36-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}.re36-meal{padding:9px 0;border-bottom:1px solid #5e4a6f}
    .re36-meal label{display:block;font-weight:700}.re36-meal select{width:100%;margin:7px 0;padding:11px;min-height:44px}
    .re36-recipe{padding:8px 10px;background:#332842;border-radius:10px;margin-top:7px}.re36-recipe summary{cursor:pointer;font-weight:600}.re36-recipe li{padding:3px 0;line-height:1.4}.re36-prep{background:#433452;border-left:3px solid #c6a4ef;padding:8px;border-radius:5px}
    .re36-meal small{display:block;opacity:.85}.re36-map{display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:5px}
    .re36-step{background:#382e47;border:1px solid #59476b;border-radius:8px;text-align:center;padding:7px 0;font-size:11px}
    .re36-step.done{background:#395446;color:#e4fdec}.re36-step.current{outline:2px solid #f2ca87}
    .re36-scroll{max-width:100%;overflow-x:auto}.re36-table{border-collapse:collapse;font-size:12px}.re36-table th,.re36-table td{padding:5px;border:1px solid #6d5680;text-align:center}
    .re36-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.re36-stats div{background:#382d49;padding:10px;border-radius:10px;text-align:center}
    .re36-stats strong,.re36-stats small{display:block}.re36-shop{justify-content:space-between;border-bottom:1px solid #5b496c;padding:8px 0}
    .re36-dialog{width:min(800px,calc(100vw - 18px));max-height:90dvh;padding:0;background:#1d1729;color:#f7edff;border:1px solid #826699;border-radius:16px}
    .re36-dialog::backdrop{background:#08050edc}.re36-inner{padding:15px 20px 25px;overflow-y:auto;max-height:88dvh;font-family:system-ui,sans-serif}
    .re36-dialog-header{display:flex;align-items:center;justify-content:space-between;gap:10px}.re36-dialog-header h2{margin:5px 0;font-size:19px}
    .re36-tabs{display:flex;overflow-x:auto;gap:6px;margin:12px 0 20px;padding-bottom:5px}.re36-tabs button{white-space:nowrap;flex-shrink:0}
    .re36-dialog button,.re36-card button{min-height:40px;cursor:pointer}.re36-dialog input,.re36-dialog select,.re36-dialog textarea{background:#241c32;color:#faf2ff;border:1px solid #806a96;border-radius:8px;padding:8px;font-size:16px}
    .re36-dialog label{display:block;margin:10px 0 5px}.re36-dialog textarea{display:block;width:100%;box-sizing:border-box}
    html[data-re36theme="forest"] .re36-card,html[data-re36theme="forest"] .re36-dialog{border-color:#6a9578!important;background:#193329!important}
    html[data-re36theme="contrast"] .re36-card,html[data-re36theme="contrast"] .re36-dialog{background:#0b0b0e!important;border:2px solid #fff!important;color:#fff!important}
    html[data-re36theme="contrast"] .re36-dialog button{outline:1px solid #fff}
    @media(max-width:480px){.re36-dialog .re36-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.re36-habit{gap:5px}.re36-habit button{padding:7px 8px}.re36-map{grid-template-columns:repeat(6,minmax(0,1fr))}.re36-stats{grid-template-columns:1fr 1fr}.re36-inner{padding:12px}}
  `;document.head.append(css);
  // Enlazamos secciones existentes sin reemplazar el resto del sistema.
  const fold=(title,html)=>`<details class="re36-fold"><summary>${title}</summary>${html}</details>`;
  const oldSettings=settings;
  settings=function(){return oldSettings()+reminderHTML()+themesHTML();};
  if(typeof profile==='function'){
    const oldProfile=profile;
    profile=function(){return xpHTML()+oldProfile()+fold('Logros e inventario',achievementsHTML()+shopHTML());};
  }
  if(typeof progress==='function'){
    const oldProgress=progress;
    progress=function(){return reportHTML()+oldProgress().replace('Inspirada en los diarios de progreso: valora sensaciones y constancia, no solo el peso. ', '')+fold('Historial de hábitos',historyHTML(28))+fold('Diario personal',journalHTML());};
  }
  if(typeof home==='function'){
    const oldHome=home;
    home=function(){
      let base=oldHome();
      base=base.replace(/<div class="stat"><b>[^<]*<\/b>XP acumulados<\/div>/,'').replace(/<div class="stat"><b>[^<]*<\/b>Nivel de heroína<\/div>/,'');
      // Replace only the summary of the old menu, leaving its original controls intact.
      if(typeof esc==='function' && typeof menuFor==='function'){
        const summary=slots.map(([slot,label])=>`<p><strong>${xss(label)}:</strong> ${xss(mealFor(today(),slot)?.name||'Sin sugerencia')}</p>`).join('');
        base=base.replace(/(<h3>Comidas previstas<\/h3>)[\s\S]*?(?=<button class="primary" onclick="nutritionDate=)/,(_,h)=>h+summary);
      }
      return xpHTML()+dayModeHTML()+`<section class="card re36-card re36-shortcuts"><h2>Mi aventura</h2><div class="re36-grid"><button class="secondary" onclick="go('Misiones')">✓ Hábitos</button><button class="secondary" onclick="RE36.open('inicio')">🗺️ Mapa de 66 días</button><button class="secondary" onclick="RE36.open('retos')">🎯 Mis retos</button><button class="secondary" onclick="RE36.open('social')">🤝 Amigos</button></div></section>`+base;
    };
  }
  if(typeof missions==='function'){
    const oldMissions=missions;
    missions=function(){return habitsHTML()+fold('Misiones habituales',oldMissions())+`<section class="card re36-card"><h2>Retos</h2><div class="re36-grid"><button class="secondary" onclick="RE36.open('retos')">Mis retos</button><button class="secondary" onclick="RE36.open('social')">Con amigos</button></div></section>`;};
  }
  // Los turnos/precauciones existentes tienen prioridad. El modo elegido solo
  // suaviza o convierte en descanso sesiones de fuerza; nunca fuerza ejercicio.
  if(typeof trainingPlan==='function'){
    const previousPlan=trainingPlan;
    trainingPlan=function(date){
      const p=previousPlan(date),mode=data()?.dailyMode?.[date]||'normal';
      if(!p || p.kind!=='fuerza' || mode==='normal')return p;
      if(mode==='descanso')return {...p,kind:'descanso',title:'Descanso elegido',
        detail:'Hoy has elegido descansar. La continuidad del reto no exige entrenar cada día.',
        exercises:[],trainingItems:[],minutes:'A tu ritmo',notes:[...(p.notes||[])]};
      if(mode==='ligero')return {...p,kind:'activo',title:'Versión ligera de tu día',
        detail:'Propuesta suave y opcional para mantener movimiento sin completar la sesión de fuerza.',
        exercises:['Caminar cómodamente entre 5 y 15 minutos, si te apetece',
          'Movilidad suave o una pausa de descanso'],trainingItems:[],minutes:'5–15 min opcionales',notes:[...(p.notes||[])]};
      return p;
    };
  }
  const oldNutrition=nutrition;
  nutrition=function(){
    if(typeof nutritionDate!=='undefined')selectedMenuDate=nutritionDate;
    let base=String(oldNutrition()).replace(/avena nocturna/gi,'Avena nocturna (se prepara la noche anterior)');
    base=base.replace(/<p class="small">Contenido original de educación alimentaria[^<]*<\/p>/g,'');
    // Separate old menu and shopping from the food and water logs; keep all original actions.
    const startLog=base.indexOf('<section class="card"><h2>Registrar comidas</h2>');
    if(startLog>=0){const older=base.slice(0,startLog),logs=base.slice(startLog);return menuHTML()+logs+fold('Menú alternativo y compra personalizada',older);}
    return menuHTML()+fold('Registro de comidas y menú alternativo',base);
  };
  if(typeof training==='function'){
    const oldTraining=training;
    training=function(){return oldTraining()+fold('Registrar mi sesión',workoutHTML());};
  }
  const originalRender=render;
  let lastPage=null;
  render=function(...args){
    const current=typeof page==='string'?page:null;
    const app=document.getElementById('app');
    const opened=current===lastPage && app?.querySelectorAll ? [...app.querySelectorAll('details.re36-fold[open]')].map(el=>el.firstElementChild?.textContent) : [];
    const result=originalRender.apply(this,args);
    if(app?.querySelectorAll)for(const el of app.querySelectorAll('details.re36-fold'))if(opened.includes(el.firstElementChild?.textContent))el.open=true;
    lastPage=current;
    return result;
  };
  window.RE36={VERSION,open,close,toggleHabit,editHabit,archiveHabit,mealChange,menuGo,menuToday,logMeal,addExclusion,finishDay,setMode,buy,saveJournal,saveWorkout,setTheme,addChallenge,completeChallenge,saveReminder,askNotifications,
    // API de pruebas y futura integración, no muta estado.
    getLevel:level,habitStreak:currentStreak,trainingType:strengthDay,getDailyMeal:mealFor,
    recipeCount:()=>allRecipes().length,getRecipe:(slot,id)=>(MEAL_OPTIONS[slot]||[]).find(r=>r.id===id)||null};
  window.addEventListener('reformandome:account-state',e=>{if(e.detail?.state==='welcome')close();if(e.detail?.state==='ready'){applyTheme();}});
  if(ready())applyTheme();
  window.setInterval?.(reminderTick,60000);
})();
