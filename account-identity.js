'use strict';
/* Reformándome v35.3 · Mi cuenta (nombre de usuario único y cumpleaños privado).
 * Cargar después de support-profile.js. No guarda la fecha en localStorage.
 */
(() => {
  if (!window.RECloud?.getClient || typeof settings !== 'function' || typeof profile !== 'function') {
    console.error('v35.3: deben cargarse antes cloud-sync.js y support-profile.js.');
    return;
  }
  const TABLE='reformandome_account_profiles';
  const account=()=>window.RECloud.getUser();
  const client=()=>window.RECloud.getClient();
  const safe=s=>String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const usernameValid=s=>/^[a-z0-9_]{3,20}$/.test(s);
  let modal=null;
  let mandatory=false;
  let cached=null;
  let cachedUid=null;
  let pendingCheck=null;
  let saving=false;

  const styles=document.createElement('style');
  styles.textContent=`
    .re-id-dialog{border:1px solid #8167a2;border-radius:18px;background:#211a30;color:#f5ecff;
      width:min(530px,calc(100% - 28px));max-height:90dvh;padding:0;box-shadow:0 24px 70px #0009}
    .re-id-dialog::backdrop{background:#080610e8}
    .re-id-content{padding:25px;max-height:85dvh;overflow:auto;font-family:system-ui,sans-serif}
    .re-id-dialog h2{color:#ead1ff;margin:0 0 10px;font-size:23px}
    .re-id-dialog p{color:#d6c9df;line-height:1.5}
    .re-id-dialog label{display:block;font-weight:650;margin:16px 0 7px}
    .re-id-dialog input{display:block;width:100%;box-sizing:border-box;font:inherit;font-size:16px;
      padding:12px;color:white;background:#171124;border:1px solid #7b668c;border-radius:10px}
    .re-id-dialog button{min-height:44px;border-radius:10px;cursor:pointer;margin-top:12px;
      font-weight:650;padding:10px 15px;white-space:normal}
    .re-id-save{background:#c7a7ff;color:#22182d;border:0}
    .re-id-cancel{background:#332941;color:#fff;border:1px solid #7a6792}
    .re-id-dialog button:focus-visible,.re-id-dialog input:focus-visible{outline:3px solid #f1d9a5;outline-offset:2px}
    .re-id-subtle{font-size:12px;color:#c7b9d5!important}
    .re-id-error{border-left:3px solid #e0a5a5;padding:9px;background:#402c42;border-radius:6px}
    @media(max-width:480px){.re-id-content{padding:18px}}
  `;
  document.head.append(styles);

  function ageDateValid(raw){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(raw||''))return false;
    const [y,m,d]=raw.split('-').map(Number);
    const date=new Date(y,m-1,d);
    if(date.getFullYear()!==y || date.getMonth()!==m-1 || date.getDate()!==d || y<1900)return false;
    const limit=new Date();limit.setFullYear(limit.getFullYear()-14);limit.setHours(0,0,0,0);
    return date<=limit;
  }
  function ensureModal(){
    if(modal)return modal;
    modal=document.createElement('dialog');modal.className='re-id-dialog';
    modal.setAttribute('aria-label','Datos privados de tu cuenta');
    modal.addEventListener('cancel', e=>{if(mandatory||saving)e.preventDefault();});
    document.body.append(modal);
    return modal;
  }
  function error(text){
    const target=modal?.querySelector('#re-id-error');
    if(target){target.hidden=false;target.textContent=text;}
  }
  function readProfile(){
    const u=account(),c=client();
    if(!u||!c)return Promise.resolve(null);
    return c.from(TABLE).select('username,birth_date').eq('user_id',u.id).maybeSingle().then(({data,error})=>{
      if(error)throw error;
      return data;
    });
  }
  async function loadProfile(){
    const u=account();
    if(!u)return null;
    if(cachedUid===u.id && cached)return cached;
    const result=await readProfile();
    cached=result;cachedUid=u.id;
    return result;
  }
  function openProfile(isMandatory=false){
    const u=account();
    if(!u||!client())return alert('Primero inicia sesión para consultar los datos de tu cuenta.');
    mandatory=Boolean(isMandatory);
    const row=cachedUid===u.id ? cached : null;
    const el=ensureModal();
    el.innerHTML=`<div class="re-id-content">
      <h2>${mandatory?'✦ Completa tu cuenta':'✦ Mis datos de cuenta'}</h2>
      <p>${mandatory?'Antes de continuar tu aventura, necesitamos tu nombre de usuario y fecha de nacimiento. Tu progreso está a salvo.':'Puedes actualizar tu nombre de usuario y tu fecha de nacimiento.'}</p>
      <form id="re-id-form">
        <label for="re-id-username">Nombre de usuario (único)</label>
        <input id="re-id-username" type="text" required minlength="3" maxlength="20"
           pattern="[a-z0-9_]{3,20}" spellcheck="false" autocapitalize="none"
           autocomplete="username" placeholder="Ej.: aventurera_21" value="${safe(row?.username||'')}">
        <p class="re-id-subtle">Entre 3 y 20 caracteres. Solo letras minúsculas, números y guion bajo.</p>
        <label for="re-id-birth">Fecha de nacimiento</label>
        <input id="re-id-birth" type="date" required autocomplete="bday" value="${safe(row?.birth_date||'')}">
        <p class="re-id-subtle">Este dato es privado: no lo ven los demás usuarios. Por ahora el registro está disponible a partir de 14 años.</p>
        <p class="re-id-error" id="re-id-error" role="alert" hidden></p>
        <button type="submit" class="re-id-save" id="re-id-save">Guardar mis datos</button>
        ${mandatory?'':'<button type="button" class="re-id-cancel" id="re-id-cancel">Cancelar</button>'}
      </form></div>`;
    el.querySelector('#re-id-form').addEventListener('submit',e=>{e.preventDefault();saveProfile();});
    el.querySelector('#re-id-cancel')?.addEventListener('click',()=>el.close());
    if(!el.open)el.showModal();
    el.querySelector('#re-id-username').focus();
  }
  async function saveProfile(){
    if(saving)return;
    const u=account(),c=client();
    if(!u||!c)return error('Debes iniciar sesión de nuevo.');
    const username=String(modal?.querySelector('#re-id-username')?.value||'').trim().toLowerCase();
    const birth_date=String(modal?.querySelector('#re-id-birth')?.value||'');
    if(!usernameValid(username))return error('Escribe un nombre de usuario válido: de 3 a 20 letras, números o _.');
    if(!ageDateValid(birth_date))return error('Introduce una fecha real. Por ahora debes tener al menos 14 años.');
    const btn=modal.querySelector('#re-id-save');saving=true;btn.disabled=true;btn.textContent='Guardando…';
    try{
      // Reserva y valida de forma atómica (UNIQUE + CHECK), sin enviar cumpleaños al metadata.
      const {data, error:e}=await c.from(TABLE).upsert({user_id:u.id,username,birth_date},{onConflict:'user_id'})
        .select('username,birth_date').single();
      if(e){
        if(e.code==='23505')throw new Error('Ese nombre de usuario ya está ocupado. Prueba otro.');
        throw e;
      }
      if(account()?.id!==u.id)throw new Error('La sesión ha cambiado; vuelve a iniciar sesión.');
      cached=data;cachedUid=u.id;
      mandatory=false;modal.close();
      if(typeof render==='function')render();
      // Si el personaje aún no tiene nombre, sigue su configuración sin perder el progreso.
      window.REHelp?.checkNamePrompt?.();
    }catch(e){error('No se pudieron guardar los datos: '+(e.message||'Error desconocido.'));}
    finally{saving=false;if(btn?.isConnected){btn.disabled=false;btn.textContent='Guardar mis datos';}}
  }
  async function ensureComplete(){
    if(pendingCheck)return pendingCheck;
    pendingCheck=(async()=>{
      if(!account()||!client())return true;
      try{
        const data=await loadProfile();
        if(!data?.username||!data?.birth_date){
          if(!modal?.open)openProfile(true);
          return false;
        }
        return true;
      }catch(e){
        console.warn('No se pudieron consultar los datos de la cuenta:',e);
        // No bloquear el progreso si falta ejecutar SQL; mostrar un aviso.
        if(window.RECloud?.isReady?.()){
          alert('No hemos podido comprobar tus datos de cuenta. Es posible que falte instalar el SQL de la versión 35.3 en Supabase.');
        }
        return false;
      }
    })();
    try{return await pendingCheck;}finally{pendingCheck=null;}
  }
  async function open(){
    if(!account())return alert('Inicia sesión para entrar en Mi cuenta.');
    try{
      cached=await readProfile();cachedUid=account().id;
      openProfile(false);
    }catch(e){alert('No se pudieron abrir tus datos de cuenta: '+(e.message||'Error de conexión.'));}
  }

  const oldSettings=settings;
  settings=function(){
    // El ajuste antiguo tenía un tercer borrado directo; se reemplaza por
    // «Borrar datos», que exige elegir copia y confirmar por separado.
    const safeSettings=oldSettings().replace(/<details><summary>Restablecer la aplicación<\/summary>[\s\S]*?<\/details>/,'');
    return safeSettings+`<section class="card"><h2>✦ Mi cuenta</h2>
    <p>Consulta o cambia tu nombre de usuario y tu fecha de nacimiento, que permanece privada.</p>
    <button class="secondary" type="button" onclick="REIdentity.open()">Mis datos de cuenta</button>
    <p class="small">Los botones «Cerrar sesión» y «Borrar datos» están en «Cuenta y sincronización».</p>
    </section>`;};
  const oldProfile=profile;
  profile=function(){return oldProfile()+`<section class="card"><h2>✦ Datos de mi cuenta</h2>
    <p>Tu nombre de usuario es distinto del nombre de tu personaje.</p>
    <button class="secondary" type="button" onclick="REIdentity.open()">Ver o modificar mis datos</button>
    </section>`;};

  window.REIdentity={ensureComplete,open,saveProfile};
  window.addEventListener('reformandome:account-state',e=>{
    if(e.detail?.state==='welcome'){cached=null;cachedUid=null;}
    if(e.detail?.state==='ready')ensureComplete();
  });
  if(window.RECloud?.isReady?.())ensureComplete();
})();
