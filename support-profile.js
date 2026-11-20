'use strict';
/* Reformándome v35.2 · Dos buzones, soporte sin Cloudflare y nombres de personaje.
 * Se carga después de app.js, cloud-sync.js y training-upgrade.js.
 * No instala servicios nuevos ni guarda contraseñas, tokens o consultas en localStorage.
 */
(() => {
  if (typeof d === 'undefined' || typeof settings !== 'function' ||
      typeof profile !== 'function' || typeof save !== 'function') {
    console.error('Reformándome v35: falta app.js o no se ha cargado correctamente.');
    return;
  }

  const HELP_EMAIL = 'soporte@reformandome.cynerax.com';
  const FEEDBACK_EMAIL = 'sugerencias@reformandome.cynerax.com';
  const REASONS = {
    cuenta: 'Problemas de cuenta o registro',
    seguridad: 'Seguridad o acceso no autorizado',
    datos: 'Datos, sincronización o progreso',
    error: 'Error de la aplicación',
    sugerencia: 'Sugerencia de mejora',
    queja: 'Queja o reclamación',
    otra: 'Otra consulta'
  };
  const safe = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const account = () => window.RECloud?.getUser?.() || null;
  const client = () => window.RECloud?.getClient?.() || null;
  const linked = () => Boolean(account() && localStorage.getItem('reformandome_cloud_linked_uid') === account().id);
  const configured = () => Boolean(window.REFORMANDOME_CLOUD?.url && window.REFORMANDOME_CLOUD?.publishableKey);
  let dialog = null;
  let sending = false;
  let pendingProfilePrompt = false;
  let lastPromptedUser = null;
  let lastFocus = null;

  const style = document.createElement('style');
  style.textContent = `
    .rehelp-dialog{border:1px solid #796195;border-radius:18px;padding:0;background:#211a30;color:#f6efff;
      width:min(550px,calc(100% - 26px));max-height:90dvh;box-shadow:0 20px 70px #0009;}
    .rehelp-dialog::backdrop{background:#080510d9;backdrop-filter:blur(4px)}
    .rehelp-inner{padding:25px;max-height:88dvh;overflow-y:auto}
    .rehelp-dialog h2{margin:0 0 9px;color:#e7cbff;font-size:22px}
    .rehelp-dialog p{color:#d8c9e2;line-height:1.5}
    .rehelp-dialog label{display:block;margin:13px 0 6px;font-weight:650;color:#f7eaff}
    .rehelp-dialog input:not([type=checkbox]),.rehelp-dialog select,.rehelp-dialog textarea{
      width:100%;box-sizing:border-box;background:#171123;border:1px solid #756087;color:#fff;border-radius:10px;
      font:inherit;padding:11px;min-height:43px;}
    .rehelp-dialog textarea{min-height:130px;resize:vertical}
    .rehelp-dialog .rehelp-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
    .rehelp-dialog button{cursor:pointer;white-space:normal;min-height:44px}
    .rehelp-dialog .rehelp-main{background:#c5a5fc;color:#21132f;font-weight:750;border:0;
      border-radius:10px;padding:11px 15px}
    .rehelp-dialog .rehelp-alt{background:#352942;color:#f6eaff;border:1px solid #78648e;
      border-radius:10px;padding:11px 15px}
    .rehelp-dialog .rehelp-status{padding:10px;border-radius:9px;background:#34283f;border:1px solid #655275;}
    .rehelp-dialog .rehelp-faint{font-size:12px;color:#b8a7c6}
    .rehelp-dialog .rehelp-trap{position:absolute;left:-9999px;height:1px;width:1px;overflow:hidden}
    .rehelp-dialog :focus-visible{outline:3px solid #ffdc99;outline-offset:2px}
    .rehelp-dialog .rehelp-consent{display:flex;align-items:flex-start;gap:9px;font-weight:400}
    .rehelp-dialog .rehelp-consent input{margin-top:4px;width:18px;height:18px}
    @media(max-width:480px){.rehelp-inner{padding:17px}}
  `;
  document.head.appendChild(style);

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'rehelp-dialog';
    dialog.setAttribute('aria-label','Centro de ayuda de Reformándome');
    dialog.addEventListener('close', () => {
      if (lastFocus?.isConnected) lastFocus.focus();
    });
    document.body.append(dialog);
    return dialog;
  }
  function show(html, title) {
    const el = ensureDialog();
    el.innerHTML = `<div class="rehelp-inner">${html}</div>`;
    el.setAttribute('aria-label', title || 'Ayuda de Reformándome');
    if (!el.open) { lastFocus = document.activeElement; el.showModal(); }
    (el.querySelector('input:not([type=hidden]),select,button') || el).focus();
  }
  function close() { if (dialog?.open && !sending) dialog.close(); }
  function notice(msg, isError=true) {
    const box=dialog?.querySelector('#rehelp-message');
    if(box){box.textContent=msg;box.hidden=false;box.setAttribute('role',isError?'alert':'status');}
  }
  function getSavedName() {
    const n=String(d.character?.name||'').trim();
    return n==='Mi heroína'?'':n;
  }
  function getMetaName(u=account()) { return String(u?.user_metadata?.character_name || '').trim(); }
  function displayName() { return getSavedName() || getMetaName() || 'Tu personaje'; }
  function emailForUser() { return String(account()?.email||'').trim(); }

  function supportCard(){
    return `<section class="card"><h2>🛟 Ayuda, sugerencias y quejas</h2>
       <p>Contacta con soporte si tienes problemas de cuenta, seguridad, datos o funcionamiento. Para ideas y reclamaciones tenemos otro buzón.</p>
       <button class="primary" type="button" onclick="REHelp.open('soporte')">Solicitar ayuda</button>
       <button class="secondary" type="button" onclick="REHelp.open('comentarios')">Enviar sugerencia o queja</button>
       <p class="small">Soporte: <a href="mailto:${HELP_EMAIL}">${HELP_EMAIL}</a>.</p>
       <p class="small">Sugerencias y quejas: <a href="mailto:${FEEDBACK_EMAIL}">${FEEDBACK_EMAIL}</a>.</p></section>`;
  }
  const originalSettings=settings;
  settings=function(){return originalSettings()+supportCard();};
  const originalProfile=profile;
  profile=function(){return originalProfile()+`<section class="card"><h2>✦ Mi identidad de aventurero/a</h2>
    <p>Nombre visible de tu personaje: <strong>${safe(displayName())}</strong></p>
    <p class="small">El nombre es visible en tu aventura y puede aparecer en los correos de tu cuenta.
      No cambia tu email ni tu contraseña.</p>
    <button class="primary" type="button" onclick="REHelp.openName()">Cambiar mi nombre</button>
    <button class="secondary" type="button" onclick="REHelp.open()">Ayuda y soporte</button>
    <button class="secondary" type="button" onclick="REHelp.open('comentarios')">Sugerencias y quejas</button>
  </section>`;};

  // El campo antiguo del perfil debe actualizar también los metadatos de Supabase.
  // Si falla el servidor, conserva los datos anteriores y avisa al usuario.
  saveCharacter = async function() {
    const field=document.getElementById('charName');
    if(!field)return;
    await saveName(field.value);
  };

  function open(group='soporte') {
    const a=account();
    const curr=Boolean(a);
    const comments = group === 'comentarios';
    const options=Object.entries(REASONS).map(([v,label])=>
      `<option value="${v}" ${v === (comments ? 'sugerencia' : 'cuenta') ? 'selected' : ''}>${safe(label)}</option>`).join('');
    show(`<h2>🛟 ${comments ? 'Sugerencias y quejas' : 'Ayuda y soporte'}</h2>
      <p>${comments ? 'Cuéntanos tu idea, sugerencia o reclamación.' : 'Cuéntanos qué ocurre y nos pondremos en contacto contigo por correo.'}</p>
      <form id="rehelp-form">
        <label for="rehelp-reason">Motivo de consulta</label>
        <select id="rehelp-reason" required>${options}</select>
        <label for="rehelp-email">Correo para responderte</label>
        <input id="rehelp-email" type="email" autocomplete="email" maxlength="254" required
          value="${safe(curr ? emailForUser() : '')}" ${curr?'readonly':''} placeholder="tu@correo.es">
        <label for="rehelp-text">Explica tu consulta</label>
        <textarea id="rehelp-text" minlength="15" maxlength="3000" required
          placeholder="Indícanos qué sucede y qué esperabas que ocurriera, sin compartir contraseñas ni códigos de acceso."></textarea>
        <label class="rehelp-trap" for="rehelp-company">Dejar vacío</label>
        <input class="rehelp-trap" id="rehelp-company" type="text" autocomplete="off" tabindex="-1">
        <label class="rehelp-consent"><input id="rehelp-consent" type="checkbox" required>
          <span>Autorizo utilizar mi correo y el contenido de este mensaje para tramitar mi solicitud.</span></label>
        <p class="rehelp-faint">No envíes contraseñas, códigos de confirmación ni datos médicos. Esta atención no es un servicio de emergencias.</p>
        <p id="rehelp-message" class="rehelp-status" hidden></p>
        <div class="rehelp-actions"><button class="rehelp-main" id="rehelp-send" type="submit">Enviar consulta</button>
          <button class="rehelp-alt" id="rehelp-cancel" type="button">Cancelar</button></div>
      </form>`, 'Ayuda y soporte');
    const form=dialog.querySelector('#rehelp-form');
    form.addEventListener('submit',ev=>{ev.preventDefault();submitSupport();});
    dialog.querySelector('#rehelp-cancel').addEventListener('click',close);
  }

  async function submitSupport() {
    if(sending)return;
    if(!configured())return notice('No se encuentra la configuración pública de Supabase.');
    const reason=dialog.querySelector('#rehelp-reason')?.value||'';
    const email=dialog.querySelector('#rehelp-email')?.value.trim().toLowerCase()||'';
    const message=dialog.querySelector('#rehelp-text')?.value.trim()||'';
    const consent=dialog.querySelector('#rehelp-consent')?.checked;
    const honeypot=dialog.querySelector('#rehelp-company')?.value||'';
    if(!REASONS[reason] || !/^\S+@\S+\.\S+$/.test(email) || message.length<15 || message.length>3000 || !consent)
      return notice('Revisa los campos y acepta el uso de tus datos para responderte.');
    const button=dialog.querySelector('#rehelp-send');
    sending=true;button.disabled=true;button.textContent='Enviando…';
    const ctrl=new AbortController();
    const timeout=setTimeout(()=>ctrl.abort(),20000);
    try {
      let token=null;
      const c=client();
      if(c && account()) {
        const {data,error}=await c.auth.getSession();
        if(error)throw error;
        token=data?.session?.access_token||null;
      }
      const url=String(window.REFORMANDOME_CLOUD.url).replace(/\/$/,'')+'/functions/v1/reformandome-support';
      const payload={reason,email,message,consent:true,honeypot};
      const headers={'Content-Type':'application/json','apikey':window.REFORMANDOME_CLOUD.publishableKey};
      if(token)headers['Authorization']='Bearer '+token;
      const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(payload),signal:ctrl.signal});
      const response=await r.json().catch(()=>({}));
      if(!r.ok||response.ok!==true||!response.ticket)throw new Error(response.message||`No se pudo guardar la consulta (${r.status}).`);
      const ticket=String(response.ticket).replace(/[^A-Z0-9-]/gi,'');
      show(`<h2>✦ ¡Tu solicitud ha llegado al reino!</h2>
        <p>Hemos recibido correctamente tu consulta y nos pondremos en contacto contigo a través del correo indicado.</p>
        <p><strong>Referencia: ${safe(ticket)}</strong></p>
        <p class="rehelp-faint">Guarda esta referencia por si necesitas hacer seguimiento. No se enviará un segundo correo automático de confirmación.</p>
        <div class="rehelp-actions"><button type="button" class="rehelp-main" id="rehelp-finish">Cerrar</button></div>`, 'Solicitud registrada');
      dialog.querySelector('#rehelp-finish').addEventListener('click',()=>dialog.close());
    } catch(e) {
      notice(e.name==='AbortError'?'La conexión tardó demasiado. Antes de reenviar, revisa si tienes una incidencia registrada.':(e.message||'No se pudo enviar la consulta.'));

    } finally {
      clearTimeout(timeout);sending=false;
      const buttonNow=dialog?.querySelector('#rehelp-send');
      if(buttonNow){buttonNow.disabled=false;buttonNow.textContent='Enviar consulta';}
    }
  }

  function openName(firstTime=false) {
    const u=account();
    if(!u||!linked()||!window.RECloud?.isReady?.()) {
      return openNameError('Inicia sesión y termina de recuperar tu progreso antes de cambiar el nombre.');
    }
    const current=getSavedName()||getMetaName(u);
    show(`<h2>✦ ${firstTime?'¡Tu aventura tiene nombre!':'Nombre de tu personaje'}</h2>
      <p>${firstTime?'Elige cómo te llamaremos durante tu aventura. Puedes cambiarlo después desde Mi perfil.':'Este nombre identificará a tu personaje y podrá aparecer en los correos de tu cuenta.'}</p>
      <form id="re-name-form"><label for="re-name">Nombre del personaje</label>
        <input id="re-name" type="text" minlength="2" maxlength="20" required autocomplete="nickname"
          value="${safe(current)}" placeholder="Ej.: Aelira">
        <p class="rehelp-faint">Entre 2 y 20 caracteres. Evita compartir apellidos, teléfono u otros datos personales.</p>
        <p id="rehelp-message" class="rehelp-status" hidden></p>
        <div class="rehelp-actions"><button class="rehelp-main" id="re-name-save" type="submit">Guardar nombre</button>
        <button class="rehelp-alt" id="re-name-later" type="button">Ahora no</button></div></form>`, 'Nombre del personaje');
    dialog.querySelector('#re-name-form').addEventListener('submit',ev=>{
      ev.preventDefault();saveName(dialog.querySelector('#re-name')?.value);
    });
    dialog.querySelector('#re-name-later').addEventListener('click',close);
  }
  function openNameError(text){
    show(`<h2>Nombre del personaje</h2><p>${safe(text)}</p><button class="rehelp-alt" type="button" id="re-help-close">Cerrar</button>`, 'Nombre del personaje');
    dialog.querySelector('#re-help-close').addEventListener('click',close);
  }
  async function saveName(raw) {
    const normalized=String(raw||'').normalize('NFC').trim().replace(/\s+/g,' ');
    if(normalized.length<2||normalized.length>20||/[<>\r\n\u0000-\u001f\u007f]/.test(normalized))
      return noticeOrAlert('Introduce un nombre de entre 2 y 20 caracteres, sin símbolos de código.');
    const u=account(),c=client();
    if(!u||!c||!linked()||!window.RECloud?.isReady?.())return noticeOrAlert('Para guardar este nombre, inicia sesión y sincroniza primero tus datos.');
    const button=dialog?.querySelector('#re-name-save');
    if(button){button.disabled=true;button.textContent='Guardando…';}
    try {
      // Supabase actualiza metadatos de la cuenta existente; no se cambia el login.
      // Se conservan explícitamente las propiedades previas.
      const previous=u.user_metadata||{};
      const {data,error}=await c.auth.updateUser({data:{...previous,character_name:normalized}});
      if(error)throw error;
      if(account()?.id!==u.id)throw new Error('La cuenta ha cambiado durante el guardado.');
      d.character.name=normalized;
      save(); // Conserva el resto del progreso y lo añade a su sincronización habitual.
      lastPromptedUser=u.id;
      if(dialog?.open)dialog.close();
      if(typeof render==='function')render();
    }catch(e){noticeOrAlert('No se pudo guardar el nombre: '+(e.message||'Error de conexión.'));}
    finally{if(button?.isConnected){button.disabled=false;button.textContent='Guardar nombre';}}
  }
  function noticeOrAlert(s){ if(dialog?.open && dialog.querySelector('#rehelp-message')) notice(s); else alert(s); }

  async function afterAccountReady(){
    if(pendingProfilePrompt)return;
    const u=account();
    if(!u || !linked() || !window.RECloud?.isReady?.() || lastPromptedUser===u.id)return;
    pendingProfilePrompt=true;
    try {
      // Primero se completa el usuario y la fecha de nacimiento (v35.3).
      if (window.REIdentity?.ensureComplete) {
        const complete=await window.REIdentity.ensureComplete();
        if (!complete) return;
      }
      const c=client();if(!c)return;
      const {data,error}=await c.auth.getUser();
      if(error || !data?.user || data.user.id!==u.id)return;
      const name=String(data.user.user_metadata?.character_name||'').trim();
      if(name){
        // Metadata asociada a la cuenta prevalece sobre un nombre local antiguo.
        if(d.character.name!==name){ d.character.name=name;save();if(typeof render==='function')render(); }
        lastPromptedUser=u.id;
      }else{
        lastPromptedUser=u.id; // Mostrarlo como máximo una vez por sesión; reaparece en la próxima apertura.
        if(!dialog?.open)openName(true);
      }
    }catch(_e){ /* No bloquear la aplicación por un error al consultar metadatos. */ }
    finally{pendingProfilePrompt=false;}
  }

  window.REHelp={open,close,openName,saveName,checkNamePrompt:afterAccountReady};
  window.addEventListener('reformandome:account-state', e => {
    if(e.detail?.state==='ready')afterAccountReady();
    if(e.detail?.state==='welcome')lastPromptedUser=null;
  });
  // La conexión puede haberse completado antes de registrar el listener.
  if(window.RECloud?.isReady?.())afterAccountReady();
})();
