'use strict';
/* Reformándome v35.4: tipos de turnos reutilizables.
 * Debe cargarse después de app.js. Todo se guarda en d.shiftTemplates,
 * dentro de la copia JSON local/Supabase ya existente. No usa otra tabla.
 */
(() => {
  if (typeof d === 'undefined' || typeof calendar !== 'function' ||
      typeof shiftEntry !== 'function' || typeof save !== 'function') {
    console.error('Los turnos personalizables requieren cargar app.js primero.');
    return;
  }
  const DEFAULTS = [
    {code:'M',name:'Mañana',symbol:'☀️',start:'',end:'',work:true},
    {code:'A',name:'Tarde',symbol:'🌆',start:'',end:'',work:true},
    {code:'L',name:'Libre',symbol:'🌿',start:'',end:'',work:false},
    {code:'V',name:'Vacaciones',symbol:'🏖️',start:'',end:'',work:false}
  ];
  const LEGACY = {T:{name:'Trabajo',symbol:'💼',work:true},N:{name:'Noche',symbol:'🌙',work:true},B:{name:'Baja',symbol:'🩺',work:false}};
  const CODE_POOL = 'CDEFGHIJKOPQRSUWXYZ'; // códigos de una letra, compatibles con patrones previos
  const clean = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const timeValid = s => !s || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s);
  const normalized = s => String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const catalog = () => {
    if(!Array.isArray(d.shiftTemplates)) d.shiftTemplates=DEFAULTS.map(x=>({...x}));
    return d.shiftTemplates;
  };
  const typeFor = code => catalog().find(x=>x.code===code) || (LEGACY[code]?{code,...LEGACY[code],start:'',end:''}:null);
  function isValidType(t) {
    return !!(t && /^[A-Z]$/.test(t.code) && typeof t.name==='string' && t.name.trim() &&
      typeof t.symbol==='string' && typeof t.start==='string' && typeof t.end==='string' &&
      timeValid(t.start) && timeValid(t.end) && Boolean(t.start)===Boolean(t.end));
  }
  // Reutilizar exclusivamente los datos del perfil; el historial antiguo no se elimina.
  if (!Array.isArray(d.shiftTemplates)) {
    d.shiftTemplates = DEFAULTS.map(x=>({...x}));
  } else {
    const unique=new Set();
    d.shiftTemplates=d.shiftTemplates.filter(x=>isValidType(x)&&!unique.has(x.code)&&unique.add(x.code))
      .map(x=>({code:x.code,name:x.name.trim().slice(0,35),symbol:x.symbol.trim().slice(0,18),
        start:x.start,end:x.end,work:Boolean(x.work)})).slice(0,24);
    if (!d.shiftTemplates.length) d.shiftTemplates=DEFAULTS.map(x=>({...x}));
  }
  const oldClassifier=classifyShift;
  if (calendarBrush==='T' || !typeFor(calendarBrush)) calendarBrush=catalog()[0].code;
  function reconcileNames(){
    // Retenemos códigos antiguos para no perder turnos importados ni patrones históricos.
    for(const code of Object.keys(SHIFT_NAMES)) if(!LEGACY[code]&&!catalog().some(t=>t.code===code))delete SHIFT_NAMES[code];
    for(const t of catalog())SHIFT_NAMES[t.code]=t.name;
    for(const [code,item] of Object.entries(LEGACY))if(!SHIFT_NAMES[code])SHIFT_NAMES[code]=item.name;
    WORK_SHIFTS.clear();
    for(const t of catalog())if(t.work)WORK_SHIFTS.add(t.code);
    for(const [code,item] of Object.entries(LEGACY))if(item.work&&!catalog().some(t=>t.code===code))WORK_SHIFTS.add(code);
  }
  reconcileNames();

  // La plantilla proporciona las horas a todos los días vinculados a su código.
  // Solo se respetan horas individuales cuando se personalizó ese día.
  shiftEntry = function(date){
    reconcileNames();
    const raw=d.shiftDays?.[date];
    const code=typeof raw==='string'?raw:(raw && typeof raw==='object'?raw.code:null);
    const selected=typeFor(code);
    if(selected){
      const customStart=typeof raw==='object'&&timeValid(raw.start)?raw.start:'';
      const customEnd=typeof raw==='object'&&timeValid(raw.end)?raw.end:'';
      return {code,start:customStart&&customEnd?customStart:(selected.start||''),
        end:customStart&&customEnd?customEnd:(selected.end||'')};
    }
    if(d.shift?.autoPattern && typeof d.shift.sequence==='string' &&
       /^\d{4}-\d{2}-\d{2}$/.test(d.shift.start||'')){
      const sequence=d.shift.sequence.toUpperCase().trim();
      if(sequence.length>0&&sequence.length<=62&&[...sequence].every(c=>typeFor(c))){
        const idx=((dayDiff(date,d.shift.start)%sequence.length)+sequence.length)%sequence.length;
        const type=typeFor(sequence[idx]);
        return {code:type.code,start:type.start||'',end:type.end||''};
      }
    }
    return null;
  };
  shiftHours=function(date){const s=shiftEntry(date);return s?.start&&s?.end?
    `${s.start}–${s.end}${s.end<=s.start?' (día siguiente)':''}`:''};
  shiftLabel=function(date){const x=shiftEntry(date);if(!x)return 'Sin marcar';const t=typeFor(x.code);
    return `${t?.symbol||'✦'} ${t?.name||'Turno'}${shiftHours(date)?' · '+shiftHours(date):''}`;};
  afterNight = function(date){
    const s=shiftEntry(nextDate(date,-1));
    return Boolean(s && WORK_SHIFTS.has(s.code) && (s.code==='N'||(s.start&&s.end&&s.end<=s.start)));
  };
  classifyShift=function(raw){
    const v=normalized(raw);
    if(!v)return null;
    for(const t of catalog())if(v===normalized(t.name)||v===normalized(t.code)||v===normalized(t.symbol))return t.code;
    return oldClassifier(raw);
  };

  let editing=null;
  const escapeAttr=clean;
  function typeRow(t){
    return `<div class="re-shift-template-row"><span class="re-shift-glyph">${clean(t.symbol||'✦')}</span>
      <span class="re-shift-template-info"><strong>${clean(t.name)}</strong><small>${clean(t.code)} · ${t.start&&t.end?clean(t.start+'–'+t.end):'Sin horario'}${t.work?' · Trabajo':' · Descanso'}</small></span>
      <button type="button" class="secondary" onclick="REShifts.edit('${t.code}')" aria-label="Editar ${escapeAttr(t.name)}">Editar</button></div>`;
  }
  function manager(){
    return `<section class="card re-shift-manager"><div class="headrow"><h2>Mis tipos de turno</h2><button type="button" class="primary" onclick="REShifts.edit('new')">+ Añadir</button></div>
      <p>Personaliza una sola vez el nombre, símbolo y horario. Se aplicarán a todas las fechas de ese turno, salvo excepciones que hayas configurado.</p>
      ${catalog().map(typeRow).join('')}
      ${editing===null?'':editorForm()}
      <p class="small">Tus turnos anteriores se conservan. Si tienes un patrón automático, también utiliza los horarios de estas plantillas.</p>
    </section>`;
  }
  function editorForm(){
    const fresh=editing==='new';const t=fresh?{code:'',name:'',symbol:'✦',start:'',end:'',work:true}:typeFor(editing);
    if(!t)return '';
    const count=fresh?0:Object.values(d.shiftDays||{}).filter(v=>(typeof v==='string'?v:v?.code)===t.code).length;
    return `<form id="re-shift-form" class="small-card re-shift-template-edit" onsubmit="event.preventDefault();REShifts.save()">
      <h3>${fresh?'Añadir tipo de turno':'Editar '+clean(t.name)}</h3>
      <label for="re-shift-name">Nombre</label><input id="re-shift-name" maxlength="35" required value="${escapeAttr(t.name)}" placeholder="Ej.: Guardia de 24 horas">
      <label for="re-shift-symbol">Símbolo o emoji</label><input id="re-shift-symbol" maxlength="18" required value="${escapeAttr(t.symbol||'✦')}" placeholder="Ej.: 🚑">
      <div class="shift-times"><div><label for="re-shift-start">Hora de inicio (opcional)</label><input id="re-shift-start" type="time" value="${escapeAttr(t.start||'')}"></div>
        <div><label for="re-shift-end">Hora de fin (opcional)</label><input id="re-shift-end" type="time" value="${escapeAttr(t.end||'')}"></div></div>
      <label class="opt"><input id="re-shift-working" type="checkbox" ${t.work?'checked':''}> Es un día de trabajo (adaptar entrenamientos y descanso)</label>
      ${fresh?'':`<label class="opt"><input id="re-shift-apply-all" type="checkbox" checked> Aplicar este horario a todos los ${count} días anotados, incluso si tenían horas individuales.</label>
        <p class="small">Si desmarcas esta opción, las excepciones que editaste día por día conservarán sus horas.</p>`}
      <div class="choice-line"><button class="primary" type="submit">Guardar plantilla</button><button class="secondary" type="button" onclick="REShifts.cancel()">Cancelar</button>
      ${fresh?'':`<button class="secondary" type="button" onclick="REShifts.remove('${t.code}')">Eliminar plantilla</button>`}</div>
    </form>`;
  }
  function dayForm(){
    if(!calendarEditDate||!validDate(calendarEditDate))return '';
    const date=calendarEditDate;const raw=d.shiftDays[date];const x=shiftEntry(date);
    const code=x?.code||catalog()[0].code;
    const choices=catalog().slice();
    if(!choices.some(t=>t.code===code) && typeFor(code))choices.push(typeFor(code));
    const exception=raw && typeof raw==='object'&&raw.start&&raw.end;
    return `<div class="small-card shift-editor"><div class="headrow"><h3>Editar ${clean(cap(niceDate(date)))}</h3>
      <button type="button" class="secondary" onclick="calendarEditDate=null;render()">Cerrar</button></div>
      <label for="re-day-type">Tipo de turno</label><select id="re-day-type" onchange="REShifts.refreshDay()">${choices.map(t=>`<option value="${escapeAttr(t.code)}" ${code===t.code?'selected':''}>${clean(t.symbol)} ${clean(t.name)}</option>`).join('')}</select>
      <p id="re-day-default-hours" class="small">Horario habitual: ${x?.start&&x?.end?clean(x.start+'–'+x.end):'sin horas'}</p>
      <label class="opt"><input type="checkbox" id="re-day-exception" onchange="REShifts.toggleException()" ${exception?'checked':''}> Usar un horario distinto solo para este día</label>
      <div id="re-day-custom" ${exception?'':'hidden'} class="shift-times"><div><label for="re-day-start">Inicio</label><input type="time" id="re-day-start" value="${escapeAttr(exception?raw.start:(x?.start||''))}"></div>
        <div><label for="re-day-end">Fin</label><input type="time" id="re-day-end" value="${escapeAttr(exception?raw.end:(x?.end||''))}"></div></div>
      <div class="choice-line"><button class="primary" type="button" onclick="REShifts.saveDay()">Guardar este día</button>
        <button class="secondary" type="button" onclick="removeDayDetails()">Borrar este día</button></div></div>`;
  }
  const monthStyles = {M:'morning',A:'afternoon',L:'free',V:'holiday',T:'work',N:'night',B:'sick'};
  calendar=function(){
    reconcileNames();
    const [yy,mm]=calendarMonth.split('-').map(Number);
    const offset=(new Date(yy,mm-1,1).getDay()+6)%7;
    const days=new Date(yy,mm,0).getDate();
    const cells=Array.from({length:offset},()=>'<div class="cal-cell blank" aria-hidden="true"></div>');
    for(let day=1;day<=days;day++){
      const key=`${calendarMonth}-${String(day).padStart(2,'0')}`,entry=shiftEntry(key),t=entry?typeFor(entry.code):null;
      const symbol=t?.symbol||'·',className=monthStyles[entry?.code]||(entry&&WORK_SHIFTS.has(entry.code)?'work':'free');
      cells.push(`<button type="button" class="cal-cell ${entry?className:''} ${key===todayKey()?'today':''} ${key===calendarEditDate?'selected':''}" onclick="markDay('${key}')"
        title="${escapeAttr(niceDate(key))} · ${escapeAttr(shiftLabel(key))}"><span class="day-number">${day}</span><em>${clean(symbol)}</em>${shiftHours(key)?'<small>⏱</small>':''}</button>`);
    }
    const typeNames=catalog().map(t=>`${t.code}: ${t.name}`).join(' · ');
    return `<section class="card"><h2>Calendario de turnos</h2><p>Selecciona el tipo de turno y toca un día. Los horarios y símbolos se cambian una sola vez desde «Mis tipos de turno».</p>
      <div class="calendar-head"><button class="secondary" onclick="moveMonth(-1)" aria-label="Mes anterior">◀</button>
      <h2>${cap(niceDate(calendarMonth+'-01',{month:'long',year:'numeric'}))}</h2><button class="secondary" onclick="moveMonth(1)" aria-label="Mes siguiente">▶</button></div>
      <div class="calendar-week">${['L','M','X','J','V','S','D'].map(x=>`<strong>${x}</strong>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div>
      <h3>Seleccionar turno</h3><div class="choice-line">${catalog().map(t=>`<button type="button" class="${calendarBrush===t.code?'primary':'secondary'}" onclick="REShifts.brush('${t.code}')">${clean(t.symbol)} ${clean(t.name)}</button>`).join('')}
       <button type="button" class="${calendarBrush==='clear'?'primary':'secondary'}" onclick="REShifts.brush('clear')">Borrar día</button></div>
      <p class="small">Al pulsar una fecha marcada podrás cambiar su turno o configurar un horario excepcional.</p>${dayForm()}${importPreview?importPanel():''}</section>
      ${manager()}
      <section class="card"><h2>Importar calendario</h2><p>Importa archivos ICS o CSV. Los turnos antiguos que ya tengas se conservarán.</p>
        <input id="shiftFile" type="file" accept=".ics,.csv,.txt,text/calendar,text/csv,text/plain"><button class="primary" onclick="prepareImport()">Revisar archivo antes de importarlo</button>
        <button class="secondary" onclick="REShifts.csvTemplate()">Descargar modelo CSV</button></section>
      <section class="card"><h2>Patrón opcional</h2><p>Si tu cuadrante se repite, indica una secuencia de letras (ejemplo: MALL). Los días marcados manualmente tienen prioridad.</p>
        <label for="patternDate">Fecha del primer día</label><input type="date" id="patternDate" value="${escapeAttr(d.shift.start||todayKey())}">
        <label for="patternSequence">Secuencia (${clean(typeNames)})</label><input id="patternSequence" maxlength="62" value="${escapeAttr((d.shift.sequence==='TTLL'&&!d.shift.autoPattern)?'MALL':(d.shift.sequence||'MALL'))}">
        <label class="opt"><input type="checkbox" id="patternEnabled" ${d.shift.autoPattern?'checked':''}> Activar patrón automático</label>
        <button class="primary" type="button" onclick="REShifts.patternSave()">Guardar patrón</button></section>`;
  };
  function refreshDay(){
    const type=typeFor(document.getElementById('re-day-type')?.value);
    if(!type)return;
    const label=document.getElementById('re-day-default-hours');
    if(label)label.textContent=`Horario habitual: ${type.start&&type.end?type.start+'–'+type.end:'sin horas'}`;
    if(!document.getElementById('re-day-exception')?.checked){
      const a=document.getElementById('re-day-start'),b=document.getElementById('re-day-end');
      if(a)a.value=type.start||'';if(b)b.value=type.end||'';
    }
  }
  function saveDay(){
    const date=calendarEditDate,code=document.getElementById('re-day-type')?.value;
    if(!validDate(date)||!typeFor(code))return alert('Selecciona un turno válido.');
    let v=code;
    if(document.getElementById('re-day-exception')?.checked){
      const a=document.getElementById('re-day-start')?.value||'',b=document.getElementById('re-day-end')?.value||'';
      if(!a||!b||!timeValid(a)||!timeValid(b))return alert('Indica las dos horas válidas para esta excepción.');
      v={code,start:a,end:b};
    }
    d.shiftDays[date]=v;
    save();stamp('Turno guardado para '+niceDate(date)+'.');render();
  }
  function edit(code){
    if(code!=='new'&&!typeFor(code))return;
    editing=code;render();
    document.getElementById('re-shift-form')?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  }
  function saveType(){
    const name=document.getElementById('re-shift-name')?.value.trim(),symbol=document.getElementById('re-shift-symbol')?.value.trim(),
      start=document.getElementById('re-shift-start')?.value||'',end=document.getElementById('re-shift-end')?.value||'',
      work=Boolean(document.getElementById('re-shift-working')?.checked);
    if(!name||name.length>35||!symbol||symbol.length>18)return alert('Indica un nombre (máximo 35 caracteres) y un símbolo.');
    if(Boolean(start)!==Boolean(end)||!timeValid(start)||!timeValid(end))return alert('Introduce las dos horas correctamente o deja ambas vacías.');
    const same=catalog().find(t=>normalized(t.name)===normalized(name)&&t.code!==editing);
    if(same)return alert('Ya tienes un turno con ese nombre.');
    if(editing==='new'){
      const code=[...CODE_POOL].find(c=>!SHIFT_NAMES[c]&&!catalog().some(t=>t.code===c));
      if(!code)return alert('Has alcanzado el máximo de tipos personalizados.');
      catalog().push({code,name,symbol,start,end,work});
    }else{
      const t=catalog().find(t=>t.code===editing);
      if(!t)return alert('Este turno era antiguo. Elige uno de los tipos actuales.');
      Object.assign(t,{name,symbol,start,end,work});
      if(document.getElementById('re-shift-apply-all')?.checked){
        const overrides=Object.values(d.shiftDays||{}).filter(v=>v&&typeof v==='object'&&v.code===t.code&&v.start&&v.end).length;
        if(overrides && !confirm(`Se sustituirán los horarios excepcionales de ${overrides} fecha(s) por el horario general de «${t.name}». ¿Aplicar a todas?`))return;
        // Eliminar solo las horas individuales de los días de este tipo.
        // Es reversible con copia de seguridad previa; no se tocan otras fechas.
        for(const [date,day] of Object.entries(d.shiftDays||{}))
          if(day && typeof day==='object'&&day.code===t.code)d.shiftDays[date]=t.code;
      }
    }
    reconcileNames();editing=null;save();stamp('Plantilla de turno guardada.');render();
  }
  function removeType(code){
    const t=catalog().find(x=>x.code===code);if(!t)return;
    const used=Object.values(d.shiftDays||{}).some(v=>(typeof v==='string'?v:v?.code)===code) ||
      (d.shift.autoPattern&&String(d.shift.sequence||'').toUpperCase().includes(code));
    if(used)return alert('Este turno ya está asignado a fechas o aparece en un patrón. Para no perder tu cuadrante, cambia primero esas fechas o el patrón.');
    if(catalog().length<=1)return alert('Debes conservar al menos un tipo de turno.');
    if(!confirm(`¿Eliminar la plantilla «${t.name}»? No afectará a otros tipos ni fechas.`))return;
    d.shiftTemplates=catalog().filter(x=>x.code!==code);reconcileNames();editing=null;
    if(calendarBrush===code)calendarBrush=catalog()[0].code;
    save();render();
  }
  function patternSave(){
    const start=document.getElementById('patternDate')?.value,sequence=String(document.getElementById('patternSequence')?.value||'').trim().toUpperCase().replace(/\s+/g,''),
      enabled=document.getElementById('patternEnabled')?.checked;
    if(enabled&&(!validDate(start)||!sequence||sequence.length>62||![...sequence].every(c=>typeFor(c))))
      return alert('Indica una fecha válida y una secuencia de letras de turnos existentes (máximo 62 días).');
    d.shift.start=start||todayKey();d.shift.sequence=sequence;d.shift.autoPattern=Boolean(enabled);save();stamp('Patrón guardado.');render();
  }
  function csvTemplate(){
    const rows=['fecha;turno;hora inicio;hora fin'];
    for(let i=0;i<catalog().length;i++){
      const t=catalog()[i];
      const date=nextDate(todayKey(),i);
      rows.push(`${date};${t.name.replaceAll(';',',')};${t.start};${t.end}`);
    }
    const blob=new Blob(['\ufeff'+rows.join('\n')+'\n'],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download='modelo-turnos-reformandome.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);
  }
  const style=document.createElement('style');
  style.textContent=`.re-shift-template-row{display:flex;align-items:center;gap:12px;padding:10px 3px;border-bottom:1px solid var(--line,#6b5371)}
    .re-shift-glyph{font-size:25px;width:35px;text-align:center;flex-shrink:0}.re-shift-template-info{flex:1;min-width:0}
    .re-shift-template-info small{display:block;color:var(--muted,#c5b7c9);padding-top:3px}
    .re-shift-template-edit{margin-top:14px;padding:15px;border:1px solid var(--line,#6b5371);border-radius:12px}
    .re-shift-manager .headrow{gap:10px}.re-shift-manager .headrow h2{margin:0}
    .cal-cell em{font-style:normal;font-size:1.15em}.re-shift-template-edit .opt{margin-top:13px}
    @media(max-width:430px){.re-shift-template-row{gap:7px}.re-shift-template-row button{padding:8px}.re-shift-template-info{font-size:13px}}`;
  document.head.append(style);
  window.REShifts={edit,cancel(){editing=null;render()},save:saveType,remove:removeType,saveDay,
    brush(code){if(code==='clear'||catalog().some(t=>t.code===code)){calendarBrush=code;render()}},
    refreshDay,toggleException(){const box=document.getElementById('re-day-custom');if(box)box.hidden=!document.getElementById('re-day-exception')?.checked;},
    patternSave,csvTemplate};
  // Actualizamos la vista actual si el usuario estaba ya en Calendario.
  if(page==='Calendario')render();
})();
