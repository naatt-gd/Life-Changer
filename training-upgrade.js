/* Reformándome v36.3 — motor de entrenamiento ampliado.
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
    'Casa + gimnasio + aire libre',
    'Solo aire libre'
  ];
  const PLACE_TYPES = {
    'Gimnasio + aire libre':['gym','outdoor'],
    'Casa + aire libre':['home','outdoor'],
    'Solo gimnasio':['gym'],
    'Solo casa':['home'],
    'Casa + gimnasio':['home','gym'],
    'Casa + gimnasio + aire libre':['home','gym','outdoor'],
    'Solo aire libre':['outdoor']
  };
  const LABELS = {home:'🏠 Casa',gym:'🏋️ Gimnasio',outdoor:'🌳 Aire libre'};
  const MATERIALS = ['Ninguno','Esterilla','Bandas elásticas','Mancuernas','Kettlebell/pesas',
    'Bicicleta estática','Banco o silla estable','Barra o discos','Comba','TRX o anillas','Bicicleta','Otro'];

  // Mostrar al usuario actual opciones nuevas; solo se convierten valores sin ambigüedad.
  if (d.answers.place === 'Gimnasio') d.answers.place = 'Solo gimnasio';
  if (d.answers.place === 'En casa') d.answers.place = 'Solo casa';
  if (d.answers.place === 'Al aire libre') d.answers.place = 'Solo aire libre';
  const locationBlock = qs.find(section => String(section[0]).startsWith('5.'));
  if (locationBlock) {
    const placeQ = locationBlock[2].find(q => q[0] === 'place');
    const equipQ = locationBlock[2].find(q => q[0] === 'equipment');
    if (placeQ) {placeQ[1]='¿Dónde quieres entrenar habitualmente?'; placeQ[2]=PLACES;}
    if (equipQ) {equipQ[1]='¿Qué material tienes para casa o aire libre?';equipQ[2]=MATERIALS;}
  }
  d.trainingLocationOverride = plain(d.trainingLocationOverride) ? d.trainingLocationOverride : {};
  d.trainingHistory = plain(d.trainingHistory) ? d.trainingHistory : {};
  d.trainingReviews = plain(d.trainingReviews) ? d.trainingReviews : {};

  const selectedPlaces = () => PLACE_TYPES[selectValue('place')] || ({'Gimnasio':['gym'],'En casa':['home'],'Al aire libre':['outdoor']}[selectValue('place')]) || ['home'];
  const hasHome = () => selectedPlaces().includes('home');
  const hasEquipmentLocation = () => selectedPlaces().some(x=>x==='home'||x==='outdoor');
  const oldQuestion = question;
  question = function(item) {
    if (item[0] === 'equipment' && !hasEquipmentLocation()) return '';
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
  CATALOG.push(...[{"id":"body-squat","name":"Sentadilla al aire","cat":"pierna","family":"squat","where":["home","outdoor"],"lv":1,"gear":[],"tags":["knee"],"cue":"Desciende con control y mantén el peso repartido entre ambos pies."},{"id":"goblet-db","name":"Sentadilla goblet con mancuerna","cat":"pierna","family":"squat","where":["home","gym","outdoor"],"lv":1,"gear":["Mancuernas"],"tags":["knee","back","wrist"],"cue":"Sujeta la carga cerca del pecho; no fuerces la profundidad."},{"id":"goblet-kb","name":"Sentadilla goblet con kettlebell","cat":"pierna","family":"squat","where":["home","gym","outdoor"],"lv":1,"gear":["Kettlebell/pesas"],"tags":["knee","back","wrist"],"cue":"Mantén la carga centrada y sube sin impulso."},{"id":"hack-squat","name":"Sentadilla hack en máquina","cat":"pierna","family":"squat","where":["gym"],"lv":1,"gear":[],"tags":["knee","back"],"cue":"Ajusta los apoyos y utiliza un recorrido que puedas controlar."},{"id":"smith-squat","name":"Sentadilla guiada en multipower","cat":"pierna","family":"squat","where":["gym"],"lv":2,"gear":[],"tags":["knee","back"],"cue":"Ajusta los seguros y practica primero con carga ligera."},{"id":"box-squat","name":"Sentadilla a banco","cat":"pierna","family":"squat","where":["home","gym","outdoor"],"lv":0,"gear":["Banco o silla estable"],"tags":["knee"],"cue":"Toca el banco con suavidad y vuelve a subir."},{"id":"supported-lunge","name":"Zancada estática con apoyo","cat":"pierna","family":"lunge","where":["home","gym","outdoor"],"lv":1,"gear":[],"tags":["knee"],"cue":"Usa un apoyo firme y acorta el paso si lo necesitas."},{"id":"reverse-lunge","name":"Zancada hacia atrás","cat":"pierna","family":"lunge","where":["home","gym","outdoor"],"lv":1,"gear":[],"tags":["knee"],"cue":"Da un paso atrás y regresa sin perder el equilibrio."},{"id":"db-split","name":"Sentadilla dividida con mancuernas","cat":"pierna","family":"lunge","where":["home","gym","outdoor"],"lv":2,"gear":["Mancuernas"],"tags":["knee","back","wrist"],"cue":"Mantén los pies separados y controla la bajada."},{"id":"step-up","name":"Subida a escalón bajo","cat":"pierna","family":"lunge","where":["home","gym","outdoor"],"lv":1,"gear":[],"tags":["knee"],"cue":"Utiliza un escalón fijo y bajo, con apoyo si es necesario."},{"id":"lateral-lunge","name":"Zancada lateral","cat":"pierna","family":"lunge","where":["home","gym","outdoor"],"lv":2,"gear":[],"tags":["knee","hip"],"cue":"Desplaza la cadera atrás y vuelve al centro despacio."},{"id":"standing-hip","name":"Extensión de cadera de pie con apoyo","cat":"pierna","family":"hinge","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["hip"],"cue":"Lleva la pierna atrás sin arquear la espalda."},{"id":"hip-hinge","name":"Bisagra de cadera sin carga","cat":"pierna","family":"hinge","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["back","flex"],"cue":"Lleva la cadera atrás manteniendo el tronco estable."},{"id":"db-rdl","name":"Peso muerto rumano con mancuernas","cat":"pierna","family":"hinge","where":["home","gym","outdoor"],"lv":1,"gear":["Mancuernas"],"tags":["back","wrist","flex"],"cue":"Acerca las pesas a las piernas y limita el recorrido a tu control."},{"id":"kb-deadlift","name":"Peso muerto con kettlebell","cat":"pierna","family":"hinge","where":["home","gym","outdoor"],"lv":1,"gear":["Kettlebell/pesas"],"tags":["back","wrist","flex"],"cue":"Eleva la carga desde una altura cómoda sin redondear la espalda."},{"id":"band-hinge","name":"Bisagra de cadera con banda","cat":"pierna","family":"hinge","where":["home","gym","outdoor"],"lv":1,"gear":["Bandas elásticas"],"tags":["back","flex"],"cue":"Pisa la banda de forma segura y extiende la cadera sin tirones."},{"id":"cable-pullthrough","name":"Pull-through en polea","cat":"pierna","family":"hinge","where":["gym"],"lv":1,"gear":[],"tags":["back","flex"],"cue":"Separa los pies y mueve la cadera atrás con control."},{"id":"bar-rdl","name":"Peso muerto rumano con barra","cat":"pierna","family":"hinge","where":["gym"],"lv":2,"gear":[],"tags":["back","wrist","flex"],"cue":"Practica la técnica con poca carga y mantén la barra cerca."},{"id":"gym-glute","name":"Puente de glúteos en máquina","cat":"pierna","family":"hinge","where":["gym"],"lv":1,"gear":[],"tags":["floor","reflux","back"],"cue":"Ajusta el apoyo y evita hiperextender la espalda."},{"id":"standing-curl","name":"Flexión de rodilla de pie","cat":"pierna","family":"legiso","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["knee"],"cue":"Flexiona una pierna con apoyo sin inclinar el tronco."},{"id":"band-side","name":"Pasos laterales con banda","cat":"pierna","family":"legiso","where":["home","gym","outdoor"],"lv":1,"gear":["Bandas elásticas"],"tags":["knee","hip"],"cue":"Mantén una tensión suave y da pasos cortos."},{"id":"gym-abductor","name":"Abducción de cadera en máquina","cat":"pierna","family":"legiso","where":["gym"],"lv":0,"gear":[],"tags":["hip"],"cue":"Abre las piernas sin rebotes y controla el regreso."},{"id":"gym-adductor","name":"Aducción de cadera en máquina","cat":"pierna","family":"legiso","where":["gym"],"lv":0,"gear":[],"tags":["hip"],"cue":"Junta las piernas a un ritmo cómodo, sin forzar."},{"id":"gym-calf","name":"Elevación de talones en máquina","cat":"pierna","family":"legiso","where":["gym"],"lv":1,"gear":[],"tags":["hip"],"cue":"Sube los talones de manera controlada y baja despacio."},{"id":"lying-curl","name":"Curl femoral tumbado en máquina","cat":"pierna","family":"legiso","where":["gym"],"lv":1,"gear":[],"tags":["knee","floor","reflux"],"cue":"Ajusta el rodillo y evita levantar la pelvis."},{"id":"incline-push","name":"Flexión inclinada con apoyo fijo","cat":"empuje","family":"press","where":["home","gym","outdoor"],"lv":1,"gear":[],"tags":["wrist"],"cue":"Usa una superficie firme que no se desplace."},{"id":"floor-push","name":"Flexiones en el suelo","cat":"empuje","family":"press","where":["home","gym","outdoor"],"lv":2,"gear":[],"tags":["floor","wrist","reflux"],"cue":"Mantén el tronco alineado y adapta el recorrido."},{"id":"db-floor","name":"Press de pecho con mancuernas en suelo","cat":"empuje","family":"press","where":["home","gym"],"lv":1,"gear":["Mancuernas"],"tags":["floor","wrist","reflux"],"cue":"Apoya los pies y baja los codos de forma controlada."},{"id":"db-bench","name":"Press de pecho con mancuernas en banco","cat":"empuje","family":"press","where":["home","gym"],"lv":1,"gear":["Mancuernas","Banco o silla estable"],"tags":["floor","wrist","reflux"],"cue":"Usa un banco adecuado y controla la carga."},{"id":"cable-chest","name":"Press de pecho en polea","cat":"empuje","family":"press","where":["gym"],"lv":1,"gear":[],"tags":["wrist"],"cue":"Estabiliza el cuerpo y evita tirar de los hombros."},{"id":"machine-incline","name":"Press inclinado en máquina","cat":"empuje","family":"press","where":["gym"],"lv":1,"gear":[],"tags":["wrist"],"cue":"Ajusta el asiento y evita llevar los codos demasiado atrás."},{"id":"pec-deck","name":"Aperturas en máquina","cat":"empuje","family":"press","where":["gym"],"lv":0,"gear":[],"tags":["wrist"],"cue":"Cierra los brazos sin forzar el hombro."},{"id":"band-overhead","name":"Press de hombros con banda","cat":"empuje","family":"vertical","where":["home","gym","outdoor"],"lv":1,"gear":["Bandas elásticas"],"tags":["wrist","back"],"cue":"Pisa la banda y eleva los brazos sin arquearte."},{"id":"machine-shoulder","name":"Press de hombros en máquina","cat":"empuje","family":"vertical","where":["gym"],"lv":1,"gear":[],"tags":["wrist","back"],"cue":"Ajusta el respaldo y mantén un recorrido cómodo."},{"id":"db-raise","name":"Elevaciones laterales con mancuernas","cat":"empuje","family":"vertical","where":["home","gym","outdoor"],"lv":0,"gear":["Mancuernas"],"tags":["wrist"],"cue":"Eleva los brazos con una carga ligera sin encoger hombros."},{"id":"cable-raise","name":"Elevación lateral en polea","cat":"empuje","family":"vertical","where":["gym"],"lv":1,"gear":[],"tags":["wrist"],"cue":"Eleva el brazo de forma lenta hasta una altura cómoda."},{"id":"band-row-standing","name":"Remo con banda pisada","cat":"tiron","family":"row","where":["home","gym","outdoor"],"lv":1,"gear":["Bandas elásticas"],"tags":["wrist","back","flex"],"cue":"Comprueba el estado de la banda y mantén una bisagra cómoda."},{"id":"trx-row","name":"Remo inclinado con TRX","cat":"tiron","family":"row","where":["home","gym","outdoor"],"lv":1,"gear":["TRX o anillas"],"tags":["wrist"],"cue":"Usa un anclaje homologado y ajusta la inclinación."},{"id":"db-two-row","name":"Remo inclinado con dos mancuernas","cat":"tiron","family":"row","where":["home","gym","outdoor"],"lv":2,"gear":["Mancuernas"],"tags":["wrist","back","flex"],"cue":"Mantén el tronco estable y evita balanceos."},{"id":"chest-supported-row","name":"Remo con pecho apoyado","cat":"tiron","family":"row","where":["gym"],"lv":1,"gear":[],"tags":["wrist"],"cue":"Apoya el pecho y lleva los codos atrás sin encoger hombros."},{"id":"cable-row","name":"Remo en polea baja","cat":"tiron","family":"row","where":["gym"],"lv":0,"gear":[],"tags":["wrist"],"cue":"Mantén el tronco estable durante la tracción."},{"id":"band-pullapart","name":"Apertura horizontal con banda","cat":"tiron","family":"row","where":["home","gym","outdoor"],"lv":0,"gear":["Bandas elásticas"],"tags":["wrist"],"cue":"Tensa la banda de manera gradual sin arquear la espalda."},{"id":"band-pulldown","name":"Jalón con banda desde arriba","cat":"tiron","family":"pull","where":["home","gym","outdoor"],"lv":1,"gear":["Bandas elásticas"],"tags":["wrist"],"cue":"Solo con anclaje alto seguro; lleva los codos hacia abajo."},{"id":"assisted-pullup","name":"Dominada asistida en máquina","cat":"tiron","family":"pull","where":["gym"],"lv":2,"gear":[],"tags":["wrist"],"cue":"Ajusta la asistencia y evita balancearte."},{"id":"neutral-pulldown","name":"Jalón al pecho con agarre neutro","cat":"tiron","family":"pull","where":["gym"],"lv":0,"gear":[],"tags":["wrist"],"cue":"Lleva los codos hacia las costillas sin tirar con el cuello."},{"id":"cable-pullover","name":"Pullover en polea","cat":"tiron","family":"pull","where":["gym"],"lv":1,"gear":[],"tags":["wrist","back"],"cue":"Baja los brazos con codos suaves y torso estable."},{"id":"db-curl","name":"Curl de bíceps con mancuernas","cat":"brazo","family":"arm","where":["home","gym","outdoor"],"lv":0,"gear":["Mancuernas"],"tags":["wrist"],"cue":"Mantén los codos cerca del cuerpo."},{"id":"band-curl","name":"Curl de bíceps con banda","cat":"brazo","family":"arm","where":["home","gym","outdoor"],"lv":0,"gear":["Bandas elásticas"],"tags":["wrist"],"cue":"Pisa bien la banda y evita balancearte."},{"id":"hammer-curl","name":"Curl martillo con mancuernas","cat":"brazo","family":"arm","where":["home","gym","outdoor"],"lv":1,"gear":["Mancuernas"],"tags":["wrist"],"cue":"Mantén las palmas enfrentadas y el tronco firme."},{"id":"cable-curl","name":"Curl de bíceps en polea","cat":"brazo","family":"arm","where":["gym"],"lv":0,"gear":[],"tags":["wrist"],"cue":"Flexiona los codos sin mover el tronco."},{"id":"triceps-rope","name":"Extensión de tríceps en polea","cat":"brazo","family":"arm","where":["gym"],"lv":0,"gear":[],"tags":["wrist"],"cue":"Extiende los codos sin despegar los brazos del torso."},{"id":"band-triceps","name":"Extensión de tríceps con banda","cat":"brazo","family":"arm","where":["home","gym","outdoor"],"lv":1,"gear":["Bandas elásticas"],"tags":["wrist"],"cue":"Mantén los codos fijos con un anclaje adecuado."},{"id":"deadbug","name":"Dead bug alterno","cat":"core","family":"core","where":["home","gym"],"lv":1,"gear":[],"tags":["floor","reflux","back"],"cue":"Mueve brazo y pierna contrarios sin arquear el tronco."},{"id":"heel-slide","name":"Deslizamiento de talón tumbada","cat":"core","family":"core","where":["home","gym"],"lv":0,"gear":[],"tags":["floor","reflux"],"cue":"Desliza un talón sin contener la respiración."},{"id":"wall-plank","name":"Plancha de antebrazos contra pared","cat":"core","family":"core","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["wrist"],"cue":"Mantén el tronco alineado y respira durante el ejercicio."},{"id":"forearm-plank","name":"Plancha de antebrazos en suelo","cat":"core","family":"core","where":["home","gym","outdoor"],"lv":1,"gear":[],"tags":["floor","reflux","back"],"cue":"Mantén el cuerpo alineado durante un tiempo cómodo."},{"id":"side-plank","name":"Plancha lateral de antebrazo","cat":"core","family":"core","where":["home","gym"],"lv":2,"gear":[],"tags":["floor","reflux","back","wrist"],"cue":"Usa una variante de rodillas si es más controlable."},{"id":"band-pallof","name":"Antirrotación con banda","cat":"core","family":"core","where":["home","gym","outdoor"],"lv":1,"gear":["Bandas elásticas"],"tags":["wrist"],"cue":"Usa un anclaje firme y evita girar el tronco."},{"id":"suitcase-carry","name":"Paseo con una mancuerna","cat":"core","family":"core","where":["home","gym","outdoor"],"lv":1,"gear":["Mancuernas"],"tags":["wrist","back"],"cue":"Camina erguida sin inclinarte hacia la carga."},{"id":"farmer-carry","name":"Paseo del granjero","cat":"core","family":"core","where":["home","gym","outdoor"],"lv":1,"gear":["Mancuernas"],"tags":["wrist","back"],"cue":"Camina con cargas manejables y hombros relajados."},{"id":"standing-knee","name":"Elevación alterna de rodillas de pie","cat":"core","family":"core","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["hip"],"cue":"Eleva las rodillas a una altura cómoda con apoyo si hace falta."},{"id":"dance","name":"Baile sin saltos","cat":"cardio","family":"cardio","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["wide"],"cue":"Elige pasos cómodos y mantén ritmo conversacional."},{"id":"low-jack","name":"Aperturas laterales sin salto","cat":"cardio","family":"cardio","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["wide"],"cue":"Abre un pie cada vez y acompaña con los brazos si es cómodo."},{"id":"shadow-box","name":"Boxeo al aire sin impacto","cat":"cardio","family":"cardio","where":["home","gym","outdoor"],"lv":1,"gear":[],"tags":["wrist"],"cue":"Realiza golpes suaves sin bloquear los codos."},{"id":"elliptical","name":"Elíptica","cat":"cardio","family":"cardio","where":["gym"],"lv":0,"gear":[],"tags":["knee","hip"],"cue":"Empieza con resistencia baja y ritmo cómodo."},{"id":"rowing","name":"Remo ergómetro","cat":"cardio","family":"cardio","where":["gym"],"lv":1,"gear":[],"tags":["back","wrist","knee","flex"],"cue":"Aprende la secuencia piernas-tronco-brazos antes de aumentar el ritmo."},{"id":"out-bike","name":"Paseo en bicicleta","cat":"cardio","family":"cardio","where":["outdoor"],"lv":0,"gear":["Bicicleta"],"tags":["knee","hip"],"cue":"Elige un trayecto seguro y lleva casco."},{"id":"incline-walk","name":"Caminata con pendiente suave en cinta","cat":"cardio","family":"cardio","where":["gym"],"lv":1,"gear":[],"tags":["knee","hip"],"cue":"Mantén ritmo conversacional y reduce la pendiente si aparecen molestias."},{"id":"hill-walk","name":"Caminata por terreno con pendiente suave","cat":"cardio","family":"cardio","where":["outdoor"],"lv":1,"gear":[],"tags":["knee","hip"],"cue":"Elige terreno estable y una pendiente moderada."},{"id":"rope","name":"Comba suave por intervalos","cat":"cardio","family":"cardio","where":["home","gym","outdoor"],"lv":2,"gear":["Comba"],"tags":["impact","knee","hip","wide"],"cue":"Solo si ya toleras saltos; alterna periodos breves con descanso."},{"id":"ankle-mob","name":"Movilidad de tobillo con apoyo","cat":"movilidad","family":"mob","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["knee"],"cue":"Desplaza la rodilla suavemente sin despegar el talón."},{"id":"shoulder-circle","name":"Círculos suaves de hombros","cat":"movilidad","family":"mob","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":[],"cue":"Realiza círculos pequeños y relajados."},{"id":"hip-mob","name":"Movilidad de cadera de pie","cat":"movilidad","family":"mob","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["hip"],"cue":"Usa apoyo estable y realiza círculos pequeños."},{"id":"chest-open","name":"Apertura de pecho de pie","cat":"movilidad","family":"mob","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":[],"cue":"Abre los brazos suavemente sin forzar los hombros."},{"id":"heel-toe","name":"Equilibrio talón-punta con apoyo","cat":"movilidad","family":"mob","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":[],"cue":"Mantente cerca de un apoyo fijo y cambia de pie."},{"id":"single-balance","name":"Equilibrio a una pierna con apoyo","cat":"movilidad","family":"mob","where":["home","gym","outdoor"],"lv":1,"gear":[],"tags":["hip"],"cue":"Utiliza apoyo estable y cambia de lado."},{"id":"wall-ankle","name":"Estiramiento suave de gemelos de pie","cat":"movilidad","family":"mob","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":[],"cue":"Mantén el talón apoyado sin rebotes."},{"id":"seated-neck","name":"Movilidad cervical suave sentada","cat":"movilidad","family":"mob","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["back"],"cue":"Realiza movimientos pequeños, sin círculos completos ni dolor."},{"id":"standing-ham","name":"Movilidad posterior de pierna con apoyo","cat":"movilidad","family":"mob","where":["home","gym","outdoor"],"lv":0,"gear":[],"tags":["back","flex"],"cue":"Mantén una postura cómoda y no fuerces el estiramiento."}]);
  const impactIndex=CATALOG.findIndex(x=>x.id==='rope');if(impactIndex>=0)CATALOG.splice(impactIndex,1);
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
  const familyMap={'chair-squat':'squat','mini-squat':'squat','sumo':'squat','leg-press':'squat','glute-bridge':'hinge','hip-thrust':'hinge','romanian-dl':'hinge','heel-raise':'legiso','hip-abduction':'legiso','seated-hamstring':'legiso','leg-extension':'legiso','wall-push':'press','band-press':'press','chest-press':'press','bench-press':'press','db-press':'vertical','wall-slide':'mob','seated-row-band':'row','row-bottle':'row','row-kettle':'row','shoulder-blade':'row','machine-row':'row','gym-db-row':'row','lat-pulldown':'pull','balance':'mob'};
  for(const x of CATALOG){if(['bird-dog','glute-bridge','hip-thrust','bench-press'].includes(x.id)&&!x.tags.includes('floor'))x.tags.push('floor');if(['bench-press','bird-dog'].includes(x.id)&&!x.tags.includes('reflux'))x.tags.push('reflux');if(['romanian-dl','gym-db-row','row-bottle','row-kettle'].includes(x.id))x.tags.push('flex');}
  const family=x=>x.family||familyMap[x.id]||x.cat;
  function gearAvailable(item,where){
    if(where==='gym')return true;
    if(!item.gear.length)return true;
    const owned=many('equipment');
    return selectedPlaces().includes(where)&&!owned.includes('Ninguno')&&item.gear.every(g=>owned.includes(g));
  }
  function forbidden(item){
    const avoid=many('avoid'),pain=many('pain'),conditions=many('conditions'),tags=item.tags;
    if(tags.includes('floor')&&(avoid.includes('Ejercicios tumbada')||avoid.includes('Arrodillarme')))return true;
    if(tags.includes('flex')&&avoid.includes('Flexiones de tronco'))return true;
    if(tags.includes('impact')&&(avoid.includes('Saltos/impacto')||avoid.includes('Correr')||pain.some(x=>x!=='No')||selectValue('activity')==='Muy baja'))return true;
    if(tags.includes('wrist')&&pain.includes('Hombro/muñeca'))return true;
    if(tags.includes('knee')&&pain.includes('Rodilla'))return true;
    if(tags.includes('hip')&&pain.includes('Cadera/tobillo'))return true;
    if(tags.includes('back')&&(pain.includes('Espalda/cuello')||conditions.includes('Escoliosis')))return true;
    if(tags.includes('reflux')&&(conditions.includes('Hernia de hiato/reflujo')||many('digestive').includes('Reflujo/hernia de hiato')))return true;
    if(pain.includes('Varias zonas')&&tags.some(t=>['wrist','knee','hip','back','impact'].includes(t)))return true;
    if(conditions.includes('Lesión reciente')&&tags.some(t=>['wrist','knee','hip','back','impact'].includes(t)))return true;
    const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const disliked=norm(selectValue('dislikes')).split(/[,;\n]+/).map(v=>v.trim()).filter(v=>v.length>=3);
    if(disliked.some(v=>norm(item.name).includes(v)))return true;
    return false;
  }
  function locationFor(date){
    const chosen = d.trainingLocationOverride?.[date];
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
    d.trainingLocationOverride=plain(d.trainingLocationOverride)?d.trainingLocationOverride:{};
    if(where==='auto')delete d.trainingLocationOverride[date];
    else if(['home','gym','outdoor'].includes(where))d.trainingLocationOverride[date]=where;
    else return;
    save();render();
  }
  function exerciseList(where,level){
    return CATALOG.filter(x=>x.where.includes(where)&&x.lv<=level&&gearAvailable(x,where)&&!forbidden(x)&&!(where==='home'&&selectValue('space')==='Pequeño, tamaño esterilla'&&x.tags.includes('wide')));
  }
  // Each template orders movement patterns, not individual exercises.
  const ROUTINES={
    fullA:{title:'Cuerpo completo A · fuerza base',slots:['squat','press','row','hinge','core','legiso','arm']},
    fullB:{title:'Cuerpo completo B · estabilidad',slots:['hinge','row','lunge','vertical','core','press','legiso']},
    fullC:{title:'Cuerpo completo C · funcional',slots:['squat','pull','hinge','press','legiso','core','arm']},
    upperA:{title:'Torso A · empuje y tracción',slots:['press','row','vertical','pull','arm','core','arm']},
    upperB:{title:'Torso B · espalda y brazos',slots:['pull','press','row','vertical','arm','core','arm']},
    lowerA:{title:'Tren inferior A · cuádriceps y glúteos',slots:['squat','hinge','lunge','legiso','core','legiso']},
    lowerB:{title:'Tren inferior B · cadena posterior',slots:['hinge','squat','legiso','lunge','core','legiso']},
    circuit:{title:'Circuito funcional sin prisa',slots:['squat','press','row','hinge','core','cardio'],circuit:true},
    endurance:{title:'Resistencia continua',slots:['cardio','mob','core'],cardio:true},
    intervals:{title:'Resistencia · cambios de ritmo',slots:['cardio','mob','core'],cardio:true,interval:true},
    movement:{title:'Movilidad y equilibrio',slots:['mob','mob','core','mob','mob','mob'],mob:true},
    recovery:{title:'Recuperación y movilidad',slots:['mob','cardio','mob','mob'],mob:true}
  };
  const FALLBACKS={squat:['lunge','legiso','hinge'],lunge:['squat','legiso','hinge'],hinge:['legiso','squat'],legiso:['hinge','squat'],press:['vertical','mob'],vertical:['press','mob'],row:['pull','mob'],pull:['row','mob'],arm:['row','press'],core:['mob'],cardio:['mob'],mob:['core']};
  function rotationFor(date,where,level,focus){
    const week=Math.max(0,Math.floor(dayDiff(date,d.start)/7)),days=weekSessions(date),idx=Math.max(0,days.indexOf(date));
    const prev=nextDate(date,-1),next=nextDate(date,1),prevAdjacent=weekSessions(prev).includes(prev),nextAdjacent=weekSessions(next).includes(next);
    if(focus==='movilidad'||focus==='bienestar')return (idx+week)%3===2?'endurance':'movement';
    if(focus==='resistencia')return idx%3===2?'circuit':level>0&&(idx+week)%2===1?'intervals':'endurance';
    if(where==='outdoor'&&focus!=='fuerza')return ['endurance','circuit',level>0?'intervals':'fullA'][(idx+week)%3];
    if(level===0&&prevAdjacent)return 'recovery';
    if(level>0&&(days.length>=4||prevAdjacent||nextAdjacent)){
      // Alternate upper/lower by consecutive-day run, including a week boundary.
      let run=0;for(let i=1;i<=6;i++){let q=nextDate(date,-i);if(!weekSessions(q).includes(q))break;run++;}
      if(run>=2&&run%3===2)return 'recovery';
      const cycle=(idx-run+week*days.length+Math.floor(run/3))%2;
      const upper=((cycle+run%3)%2===0);return upper?((week+Math.floor(idx/2))%2?'upperB':'upperA'):((week+Math.floor(idx/2))%2?'lowerB':'lowerA');
    }
    if(focus==='mixto'&&idx===2&&days.length>=3)return 'circuit';
    return ['fullA','fullB','fullC'][(idx+week)%3];
  }
  function routineDetails(date,where){
    const lvl=profileLevel(),week=Math.max(1,Math.floor(dayDiff(date,d.start)/7)+1),focus=planFocus();
    const limit=Math.min(timeBudget(),lvl===0&&selectValue('activity')==='Muy baja'&&week<=2?20:60);
    const routine=rotationFor(date,where,lvl,focus),template=ROUTINES[routine];
    const choices=exerciseList(where,lvl).filter(x=>!x.tags.includes('impact'));
    const idx=Math.max(0,weekSessions(date).indexOf(date)),rotation=Math.floor((week-1)/2)+idx;
    const completed=Object.keys(d.trainingDone||{}).filter(k=>k<date&&k>=d.start&&d.trainingDone[k]).length;
    const maxSets=lvl===0?(completed<4?1:completed<12?2:3):completed<4?2:3;
    const warm=limit<=15?3:5,cool=limit<=15?2:4;
    const rest=lvl===0?60:90;
    let available=limit-warm-cool,used=new Set(),out=[];
    const pickSlot=slot=>{
      for(const f of [slot,...(FALLBACKS[slot]||[])]){
        const pool=choices.filter(x=>family(x)===f&&!used.has(x.id));
        if(pool.length){const x=pool[rotation%pool.length];used.add(x.id);return x;}
      }return null;
    };
    const target=template.mob?Math.min(template.slots.length,limit<=15?3:5):template.cardio?3:limit<=15?3:limit<=30?5:limit<=45?6:7;
    const chosen=template.slots.slice(0,target).map(pickSlot).filter(Boolean);
    // Set duration includes repetitions, rests, transition and both sides when applicable.
    const unilateral=new Set(['supported-lunge','reverse-lunge','db-split','step-up','lateral-lunge','standing-hip','standing-curl','hip-abduction','gym-db-row','row-bottle','row-kettle','band-pallof','cable-core','suitcase-carry','single-balance','heel-toe','ankle-mob','heel-slide','deadbug','bird-dog','side-plank','standing-knee','cable-raise','wall-ankle','standing-ham']);
    const isHold=new Set(['wall-plank','forearm-plank','side-plank','standing-core']);
    if(template.circuit){
      // One round through all stations, including transitions and recovery.
      const stations=chosen.slice();
      const stationMinutes=x=>unilateral.has(x.id)?2:1;
      const roundCost=()=>stations.reduce((n,x)=>n+stationMinutes(x),0);
      while(stations.length&&roundCost()>available)stations.pop();
      const roundRest=2;
      let rounds=Math.min(3,maxSets);
      while(rounds>1&&rounds*roundCost()+(rounds-1)*roundRest>available)rounds--;
      if(stations.length){
        const items=stations.map((x,i)=>{const seconds=unilateral.has(x.id)?20:30;return {id:x.id,name:x.name,category:x.cat,family:family(x),prescription:`${seconds} s${unilateral.has(x.id)?' por lado':''} por vuelta · pausa y transición`,sets:rounds,reps:`${seconds} s`,rest:30,minutes:stationMinutes(x)*rounds+(i===stations.length-1?(rounds-1)*roundRest:0),cue:x.cue,video:videoFor(x)};});
        return {items,minutes:warm+cool+rounds*roundCost()+(rounds-1)*roundRest,warm,cool,level:lvl,week,focus,routine,title:template.title,rounds,circuit:true,cardio:false,mob:false};
      }
    }
    const cardioTarget=template.cardio?Math.min(lvl===0?12+Math.min(completed,8):35,Math.max(4,available-(chosen.length-1)*3)):template.mob?Math.min(5,available):5;
    for(let i=0;i<chosen.length;i++){
      const x=chosen[i],left=chosen.length-i-1,reserve=left*2;
      let mins,sets=0,reps='',pause=0,prescription;
      if(x.cat==='cardio'){
        mins=Math.min(cardioTarget,available-reserve);if(mins<3)continue;
        const interval=template.interval&&lvl>0&&mins>=8;
        prescription=`${mins} min · ${interval?'alterna 1 min algo más rápido y 2 min suave':'ritmo conversacional'}`;
      }else if(x.cat==='movilidad'){
        mins=Math.min(template.mob?3:2,available-reserve);if(mins<2)continue;
        sets=2;reps='20–30 s';prescription=`2 × 20–30 s${unilateral.has(x.id)?' por lado':''} · a ritmo suave`;
      }else{
        const each=unilateral.has(x.id)?2:1,repRange=lvl===0?'8–10':lvl===1?'8–12':'6–12';
        const setSeconds=(isHold.has(x.id)?25:48)*each;
        const cost=n=>Math.ceil((n*(setSeconds+15)+(n-1)*rest+30)/60);
        sets=Math.min(maxSets,limit<=15?1:3);
        while(sets>0&&cost(sets)>available-reserve)sets--;
        if(!sets)continue;
        mins=cost(sets);reps=isHold.has(x.id)?'15–25 s':repRange;pause=rest;
        prescription=`${sets} × ${reps}${isHold.has(x.id)?'':' rep.'}${unilateral.has(x.id)?' por lado':''}${sets>1?` · ${rest} s descanso`:''}`;
      }
      available-=mins;
      out.push({id:x.id,name:x.name,category:x.cat,family:family(x),prescription,sets,reps,rest:pause,minutes:mins,cue:x.cue,video:videoFor(x)});
    }
    return {items:out,minutes:limit-available,warm,cool,level:lvl,week,focus,routine,title:template.title,cardio:!!template.cardio,mob:!!template.mob};
  }
  const originalPlan=trainingPlan;
  trainingPlan=function(date){
    const p=originalPlan(date),where=locationFor(date);
    p.trainingLocation=where;
    p.trainingItems=[];
    if(['precaucion','descanso','suave'].includes(p.kind))return p; // Nunca anular advertencias de salud, bajas o turnos.
    if(p.kind==='activo'){
      if(many('conditions').includes('Lesión reciente')||selectValue('clearance')==='Sí, con restricciones')return {...p,kind:'precaucion',title:'Recuperación según indicaciones sanitarias',detail:'Sigue las indicaciones de tu profesional.',minutes:'—',exercises:[],trainingItems:[]};
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
    if(many('conditions').includes('Lesión reciente')||selectValue('clearance')==='Sí, con restricciones'){return {...p,kind:'precaucion',title:'Entrenamiento adaptado pendiente de valoración',minutes:'—',detail:'Sigue las indicaciones de tu profesional antes de realizar una rutina automática.',exercises:[],trainingItems:[]};}
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
    p.title=`${details.title} ${loc}`;
    p.minutes=`${details.minutes} min aprox.`;
    p.sessionType=details.cardio?'cardio':details.mob||details.items.every(x=>['movilidad','cardio'].includes(x.category))?'movilidad':'fuerza';
    p.routineId=details.routine;p.warmMinutes=details.warm;p.coolMinutes=details.cool;p.rounds=details.rounds||0;
    p.detail=`Semana ${details.week} · ${details.level===0?'Iniciación':details.level===1?'Intermedio':'Avanzado'} · ${details.items.length} ejercicios. ${details.circuit?`Completa ${details.rounds} vuelta(s) en orden, con 2 min entre vueltas. Descansa más si lo necesitas.`:details.cardio?'Mantén un ritmo que te permita hablar.':details.mob?'Recorrido cómodo, sin forzar.':'Deja 2–4 repeticiones posibles al acabar cada serie; no entrenes al fallo.'}`;
    p.exercises=[`Calentamiento: marcha suave y movilidad ${details.warm} min`,...(details.circuit?[`Circuito: ${details.rounds} vuelta(s) · 2 min de descanso entre vueltas`]:[]),...details.items.map(x=>`${x.prescription} · ${x.name}`),`Vuelta a la calma: ${details.cool} min suaves`];
    p.notes=[...p.notes].filter(n=>!n.startsWith('Enfoque personalizado:'));
    if(where==='outdoor')p.notes.push('Utiliza terreno y apoyos seguros. Ajusta la sesión al calor, al frío y a tu estado físico.');
    if(details.level===2)p.notes.push('Aumenta la carga solo tras completar las series con técnica y margen de esfuerzo.');
    return p;
  };

  // Mismo registro de XP que la app original, con una instantánea adicional de la sesión realmente realizada.
  toggleTraining=function(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    d.trainingHistory=plain(d.trainingHistory)?d.trainingHistory:{};
    const was=!!d.trainingDone[date];
    if(was){delete d.trainingDone[date];d.xp=Math.max(0,d.xp-20);delete d.trainingHistory[date];}
    else {const p=trainingPlan(date);if(p.kind!=='fuerza')return;
      d.trainingDone[date]=true;d.xp+=20;
      d.trainingHistory[date]={date,location:p.trainingLocation,title:p.title,items:p.trainingItems.map(x=>x.id),routine:p.routineId||null,sessionType:p.sessionType||null};
    }
    save();render();
  };
  window.RETrainingV34={chooseDayLocation,catalogCount:()=>CATALOG.length,routineCount:()=>Object.keys(ROUTINES).length};

  const oldTraining=training;
  training=function(){
    const date=trainingDate,p=trainingPlan(date),isDone=!!d.trainingDone[date],today=todayKey(),next=Array.from({length:7},(_,i)=>nextDate(today,i));
    const chosenOverride=d.trainingLocationOverride?.[date]||'auto',options=['auto','home','gym','outdoor'];
    const locationChoice=`<section class="card"><h2>📍 Dónde entrenar hoy</h2>

      <label for="training_place_day">Lugar de esta sesión</label><select id="training_place_day" onchange="RETrainingV34.chooseDayLocation('${esc(date)}',this.value)">
      ${options.map(k=>`<option value="${k}" ${k===chosenOverride?'selected':''}>${k==='auto'?'Plan habitual (automático)':LABELS[k]}</option>`).join('')}</select>
      <p class="small">Lugar previsto: <strong>${LABELS[p.trainingLocation]}</strong>.</p></section>`;
    const exhtml=p.trainingItems.length ? `<div class="small-card"><strong>Calentamiento · ${p.warmMinutes} min</strong><p class="small">Marcha suave y movilidad de las articulaciones.</p></div><ol class="training-v34-list">${p.trainingItems.map(x=>`<li><strong>${esc(x.name)}</strong><p class="small">${esc(x.prescription)} · ${x.minutes} min aprox. en total<br>${esc(x.cue)}</p>
      <a class="secondary training-v34-video" href="${safeHref(x.video.url)}" rel="noopener noreferrer" target="_blank">▶ ${esc(x.video.label)}</a></li>`).join('')}</ol><div class="small-card"><strong>Vuelta a la calma · ${p.coolMinutes} min</strong><p class="small">Reduce el ritmo y realiza movilidad cómoda.</p></div>`
      : p.exercises.length?`<ol>${p.exercises.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'';
    const info=p.kind==='fuerza'?`<button type="button" class="${isDone?'secondary':'primary'}" onclick="toggleTraining('${esc(date)}')">${isDone?'✓ Sesión completada · desmarcar':'Marcar entrenamiento completado · +20 XP'}</button>`:'';
    const days=Array.from({length:7},(_,i)=>nextDate(monday(date),i));
    return `<section class="card"><h2>Tu entrenamiento personalizado</h2>
      <div class="timeline">${next.map(k=>`<button class="${k===date?'current':''}" onclick="trainingDate='${k}';render()">${niceDate(k,{weekday:'short'})}<br>${k.slice(-2)}<br>${shiftOf(k)||'·'}</button>`).join('')}</div>
      <label for="trainingDate">Ver otro día</label><input id="trainingDate" type="date" value="${esc(date)}" onchange="trainingDate=this.value;render()"></section>
      ${locationChoice}
      <section class="card"><h2>${esc(p.title)}</h2><p>${esc(p.detail)}</p><span class="pill">${esc(p.minutes)}</span><span class="pill">${esc(shiftLabel(date))}</span>
      ${exhtml}${p.notes.map(n=>`<p class="warning">${esc(n)}</p>`).join('')}${info}
      ${p.kind==='fuerza'?`<p class="small">Respira durante las repeticiones; detén el ejercicio ante dolor nuevo, mareo o falta de aire anormal.</p>`:''}
      <p class="small"><a href="${p.trainingLocation==='gym'?VIDEO_GENERAL.strength:VIDEO_GENERAL.low}" target="_blank" rel="noopener noreferrer">${p.trainingLocation==='gym'?'Vídeo general de fuerza':'Ejemplo de cardio sin saltos'}</a> · Los vídeos requieren Internet.</p>
      </section><section class="card"><h2>Tu semana</h2>${days.map(k=>{const x=trainingPlan(k);return `<div class="plan-day"><button class="secondary" onclick="trainingDate='${k}';render()">${esc(niceDate(k,{weekday:'short',day:'numeric'}))} · ${esc(x.title)}</button><span class="pill">${esc(x.trainingLocation?LABELS[x.trainingLocation]:'Descanso')}</span></div>`}).join('')}
      <button class="secondary" onclick="go('Actualizar plan')">Cambiar mis preferencias</button><button class="secondary" onclick="go('Calendario')">Cambiar turnos</button></section>
      <section class="card"><details><summary><strong>Progresión y seguridad</strong></summary><p>En las primeras semanas comienza con pocas series y un esfuerzo cómodo. Aumenta carga o repeticiones solo si recuperas bien y completas las series con técnica. No necesitas entrenar al fallo.</p>
      </details></section>`;
  };
  const oldNutrition=nutrition;
  nutrition=function(){
    const base=oldNutrition();
    const extra=`<section class="card"><details><summary><strong>🍽️ Cómo construir comidas equilibradas</strong></summary>
    <p>Una orientación flexible: combina verduras u hortalizas, una fuente de proteínas y una fuente de carbohidratos según apetito, actividad, tolerancia y necesidades. Añade grasas de calidad y agua.</p>
    <p>Planifica la compra con el menú de la semana, revisa etiquetas cuando tengas alergias y prepara algunas bases para ahorrar tiempo. Las raciones deben individualizarse: no copiamos las calorías de un menú diseñado para otra persona.</p>
    <p>Come con atención y sin prisas cuando sea posible. Si tienes reflujo, evita cambios que empeoren tus síntomas y considera dejar tiempo entre comidas copiosas y ejercicio.</p>
    </details></section>`;
    return base+extra;
  };
  const oldProgress=progress;
  progress=function(){
    const base=oldProgress();
    const week=monday(todayKey()),data=d.trainingReviews?.[week]||{};
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
    out.updated=todayKey();d.trainingReviews=plain(d.trainingReviews)?d.trainingReviews:{};d.trainingReviews[week]=out;save();stamp('Revisión semanal guardada');render();
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
