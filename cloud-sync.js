'use strict';
/* Reformándome v33: acceso inicial, Supabase y recuperación de configuración cacheada.
 * Los registros personales solo se suben tras la autorización del usuario.
 * IMPORTANTE: la tabla reformandome_states debe tener RLS correctamente configurado.
 * Corrección de confirmación de correo: 19/11/2026.
 */
(function () {
  let cfg = window.REFORMANDOME_CLOUD || {};
  const APP_URL = 'https://naatt-gd.github.io/Life-Changer/';
  const validConfig = c => /^https:\/\/[\w-]+\.supabase\.co\/?$/.test(String(c?.url || '')) &&
    /^(sb_publishable_|eyJ)/.test(String(c?.publishableKey || ''));
  let isConfigured = validConfig(cfg);

  const LINK = 'reformandome_cloud_linked_uid';
  const META = 'reformandome_cloud_last_sync_';
  const DIRTY = 'reformandome_cloud_dirty_';
  let client = null;
  let user = null;
  let status = isConfigured
    ? 'Conectando con el servicio de cuentas…'
    : 'La aplicación funciona sin cuenta. La nube aún no está configurada.';
  let busy = false;
  let authMode = 'signin';
  let recovery = false;
  let timer = null;
  let seq = 0;
  let conflict = false;
  // Pantalla de acceso: no enseña el panel personal hasta identificar la cuenta.
  let entry = 'loading';
  let entryError = '';
  let registrationEmail = '';
  let entryRequest = 0;

  function safe(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function repaint() {
    if (typeof render === 'function' && (
      (typeof page !== 'undefined' && page === 'Ajustes') ||
      (typeof d !== 'undefined' && (!d.character.choiceDone || !d.setup.completed))
    )) render();
  }
  function linked() {
    return Boolean(user && localStorage.getItem(LINK) === user.id);
  }
  function dirty() {
    return Boolean(user && localStorage.getItem(DIRTY + user.id) === '1');
  }
  function lastSync() {
    return user ? localStorage.getItem(META + user.id) || '' : '';
  }
  function setStatus(txt) {
    status = txt;
    repaint();
    entryRender();
  }
  function message(e) {
    return typeof e === 'string' ? e : e?.message || 'No se ha podido completar la operación.';
  }


  function hasPersonalProgress() {
    if (typeof d === 'undefined') return false;
    return Boolean(d.character?.choiceDone || d.setup?.completed || (Number(d.xp) || 0) > 0 ||
      (d.weightLog?.length || 0) || (d.foodLog?.length || 0) ||
      (d.checkins?.length || 0) || (Object.keys(d.answers || {}).length > 0) ||
      (Object.keys(d.done || {}).length > 0) || (Object.keys(d.moodLog || {}).length > 0));
  }

  // El acceso ocupa toda la pantalla. El área de datos permanece oculta hasta
  // resolver con seguridad qué cuenta y qué versión del progreso utilizar.
  const entryStyles = document.createElement('style');
  entryStyles.textContent = `
    body.re-entry-locked > header, body.re-entry-locked > nav,
    body.re-entry-locked > main, body.re-entry-locked > footer {visibility:hidden!important}
    #re-entry {position:fixed;inset:0;z-index:9999;overflow-y:auto;
      background:radial-gradient(ellipse at 50% -10%,#45305f 0%,#1c152c 45%,#0f0d19 100%);
      color:#f7f2ff;font-family:system-ui,-apple-system,sans-serif;padding:22px 16px 38px}
    #re-entry[hidden]{display:none!important}
    #re-entry .re-shell {width:min(740px,100%);margin:clamp(18px,7vh,65px) auto}
    #re-entry .re-logo {text-align:center;color:#f6ddba;font-size:13px;letter-spacing:.15em;font-weight:800}
    #re-entry h1 {text-align:center;font-size:clamp(30px,6vw,48px);margin:16px 0 8px}
    #re-entry .re-intro{text-align:center;max-width:530px;margin:0 auto 26px;color:#d1c2de;line-height:1.55}
    #re-entry .re-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    #re-entry .re-choice,#re-entry .re-panel{background:#251d35;border:1px solid #59446b;border-radius:19px;padding:23px;box-shadow:0 14px 38px #0906114d}
    #re-entry .re-choice{display:flex;flex-direction:column;align-items:flex-start}
    #re-entry .re-emoji{font-size:30px;line-height:1.2}
    #re-entry h2{text-align:left;font-size:21px;color:#f6ecff;margin:14px 0 9px}
    #re-entry p{color:#d0c3da;line-height:1.55}
    #re-entry .re-choice p{margin:0 0 18px;flex:1}
    #re-entry button{cursor:pointer;min-height:44px;white-space:normal}
    #re-entry button:focus-visible,#re-entry input:focus-visible{outline:3px solid #f4d5a3;outline-offset:2px}
    #re-entry .re-action{background:#c7a7ff;color:#21172e;border:0;border-radius:11px;
      padding:12px 17px;font-size:15px;font-weight:800;width:100%;margin-top:8px}
    #re-entry .re-back{background:#332941;color:#f4e8ff;border:1px solid #68547a;
      border-radius:11px;padding:11px 16px;margin-top:10px}
    #re-entry .re-panel{max-width:510px;margin:auto}
    #re-entry label{display:block;color:#f6eaff;font-size:14px;font-weight:650;margin:18px 0 8px}
    #re-entry input[type=email],#re-entry input[type=password]{width:100%;background:#171122;border:1px solid #6b587d;
      border-radius:10px;padding:13px;color:#fff;font-size:16px;box-sizing:border-box}
    #re-entry .re-check{font-weight:400;font-size:13px;display:flex;align-items:flex-start;gap:10px;line-height:1.5}
    #re-entry .re-check input{width:20px;height:20px;flex-shrink:0;accent-color:#c7a7ff;margin-top:2px}
    #re-entry .re-note{font-size:13px;color:#dbc8df}
    #re-entry .re-alert{border-left:3px solid #e9c68e;background:#3b2d3d;padding:12px;
      border-radius:8px;margin-top:15px;word-break:break-word}
    #re-entry .re-foot{font-size:12px;text-align:center;margin:26px 0;color:#c1aecb}
    @media(max-width:590px){#re-entry .re-choices{grid-template-columns:1fr}
      #re-entry .re-choice{padding:19px}#re-entry .re-shell{margin:16px auto}
      #re-entry .re-panel{padding:19px}}
    @media(prefers-reduced-motion:reduce){#re-entry *{scroll-behavior:auto!important}}
  `;
  document.head.appendChild(entryStyles);
  const entryRoot = document.createElement('div');
  entryRoot.id = 're-entry';
  entryRoot.setAttribute('role', 'main');
  entryRoot.setAttribute('aria-label', 'Acceso a Reformándome');
  document.body.appendChild(entryRoot);
  function gate(state) {entry = state; entryRender();}
  function entryRender() {
    const hidden = entry === 'ready';
    document.body.classList.toggle('re-entry-locked', !hidden);
    entryRoot.hidden = hidden;
    if (hidden) {entryRoot.innerHTML = ''; return;}
    const head = `<div class="re-logo">✦ REFORMÁNDOME ✦</div>
      <h1>Tu aventura comienza aquí</h1>
      <p class="re-intro">66 días para construir hábitos, crear tu heroína y seguir avanzando a tu ritmo.</p>`;
    const alert = entryError ? `<p class="re-alert" role="alert">${safe(entryError)}</p>` : '';
    let inside = '';
    if (entry === 'loading') {
      inside = `<div class="re-panel"><h2>Preparando tu aventura…</h2><p>${safe(status)}</p>
        <p class="re-note">Comprobando de forma segura si ya tienes una sesión iniciada.</p></div>`;
    } else if (entry === 'welcome') {
      inside = `<div class="re-choices">
        <section class="re-choice"><span class="re-emoji" aria-hidden="true">✦</span>
          <h2>Crear una cuenta</h2><p>Empieza una aventura nueva: regístrate, confirma tu correo y elige tu personaje.</p>
          <button class="re-action" type="button" onclick="RECloud.mode('signup')">Crear mi cuenta</button></section>
        <section class="re-choice"><span class="re-emoji" aria-hidden="true">♛</span>
          <h2>Iniciar sesión</h2><p>Vuelve a tu aventura con tu personaje, tus misiones y el progreso guardado en tu cuenta.</p>
          <button class="re-action" type="button" onclick="RECloud.mode('signin')">Entrar en mi cuenta</button></section>
      </div>`;
    } else if (entry === 'signup' || entry === 'signin') {
      const register = entry === 'signup';
      inside = `<section class="re-panel"><h2>${register ? 'Crea tu cuenta' : 'Continúa tu aventura'}</h2>
        <p>${register ? 'Tras confirmar el correo podrás elegir tu heroína y completar tu plan.' : 'Inicia sesión para recuperar los datos asociados a tu cuenta.'}</p>
        <form id="re-auth-form" onsubmit="event.preventDefault();RECloud.submit()">
          <label for="re-email">Correo electrónico</label>
          <input id="re-email" type="email" autocomplete="email" maxlength="255" required placeholder="tu@correo.es">
          <label for="re-password">Contraseña ${register ? '(mínimo 8 caracteres)' : ''}</label>
          <input id="re-password" type="password" minlength="8" autocomplete="${register ? 'new-password' : 'current-password'}" required>
          <button class="re-action" type="submit">${register ? 'Crear mi cuenta' : 'Iniciar sesión'}</button>
        </form>${register ? '' : '<button class="re-back" type="button" onclick="RECloud.resetPassword()">He olvidado mi contraseña</button>'}
        <div><button class="re-back" type="button" onclick="RECloud.home()">← Volver a las opciones</button></div>
        ${alert}</section>`;
    } else if (entry === 'confirm') {
      inside = `<section class="re-panel"><h2>Confirma tu correo</h2>
        <p>Hemos solicitado el registro de <strong>${safe(registrationEmail)}</strong>.
          Abre el mensaje de Supabase y confirma el correo. Después vuelve aquí e inicia sesión.</p>
        <p class="re-note">Si no aparece, revisa la carpeta de spam. La confirmación puede tardar un poco.</p>
        <button class="re-action" onclick="RECloud.mode('signin')">Ya he confirmado mi correo</button>
        <button class="re-back" onclick="RECloud.home()">Volver al inicio</button>${alert}</section>`;
    } else if (entry === 'old-account') {
      inside = `<section class="re-panel"><h2>Hay datos de otra cuenta</h2>
        <p>Este dispositivo conserva datos de otra cuenta. No los mezclaremos con la nueva.</p>
        <button class="re-action" onclick="RECloud.exportLocal()">Descargar copia de seguridad</button>
        <button class="re-back" onclick="RECloud.clearPrevious()">Eliminar copia local anterior y continuar</button>
        <p class="re-note">La copia guardada en la nube de la otra cuenta no se borra.</p>${alert}</section>`;
    } else if (entry === 'choose-data') {
      inside = `<section class="re-panel"><h2>¿Qué progreso quieres conservar?</h2>
        <p>Esta cuenta ya tiene una aventura guardada en Supabase y este dispositivo contiene datos locales.</p>
        <button class="re-action" onclick="RECloud.download()">Recuperar los datos de mi cuenta</button>
        <button class="re-back" onclick="RECloud.exportLocal()">Descargar copia de los datos locales</button>
        <label class="re-check"><input id="re-consent" type="checkbox"> Autorizo guardar en mi cuenta los datos locales de este dispositivo, incluidos hábitos, peso, estado de ánimo y respuestas personales.</label>
        <button class="re-back" onclick="RECloud.linkLocal()">Usar estos datos locales y sustituir la copia de mi cuenta</button>
        <p class="re-note">No se combinan automáticamente dos versiones. Elige la que quieres conservar.</p>${alert}</section>`;
    } else if (entry === 'new-account') {
      inside = `<section class="re-panel"><h2>Prepara tu nueva aventura</h2>
        <p>${hasPersonalProgress() ? 'Ya tienes datos en este dispositivo. Puedes asociarlos a esta cuenta sin perderlos.' : 'Ahora podrás elegir el color de pelo de tu personaje y completar el cuestionario inicial.'}</p>
        <label class="re-check"><input id="re-consent" type="checkbox"> Autorizo guardar y sincronizar en mi cuenta los datos del cuestionario y mis registros personales (incluidos peso, ánimo y horarios).</label>
        <button class="re-action" onclick="RECloud.startAdventure()">${hasPersonalProgress() ? 'Conservar mis datos y continuar' : 'Elegir mi personaje'}</button>
        ${hasPersonalProgress() ? '<button class="re-back" onclick="RECloud.startFresh()">Empezar de cero con esta cuenta</button>' : ''}
        <p class="re-note">Los datos se guardarán también en este dispositivo. Puedes exportar una copia desde Ajustes.</p>${alert}</section>`;
    } else {
      inside = `<section class="re-panel"><h2>No podemos conectar con tu cuenta</h2><p>${safe(status)}</p>
        <button class="re-action" onclick="location.reload()">Volver a intentar</button>
        ${localStorage.getItem(LINK) ? '<button class="re-back" onclick="RECloud.useOffline()">Continuar sin conexión con los datos locales de esta cuenta</button>' : ''}${alert}</section>`;
    }
    entryRoot.innerHTML = `<div class="re-shell">${head}${inside}<p class="re-foot">Tus datos pertenecen a tu cuenta. No se mezclan entre usuarios.</p></div>`;
  }
  entryRender();

  function form() {
    return `<label for="cloud-email">Correo electrónico</label>
      <input id="cloud-email" type="email" autocomplete="email" placeholder="tu@correo.es" maxlength="255">
      <label for="cloud-password">${authMode === 'signup' ? 'Crear contraseña (mínimo 8 caracteres)' : 'Contraseña'}</label>
      <input id="cloud-password" type="password" minlength="8" autocomplete="${authMode === 'signup' ? 'new-password' : 'current-password'}">
      <button class="primary" type="button" onclick="RECloud.submit()">${authMode === 'signup' ? 'Crear mi cuenta' : 'Iniciar sesión'}</button>
      <button class="secondary" type="button" onclick="RECloud.mode('${authMode === 'signup' ? 'signin' : 'signup'}')">${authMode === 'signup' ? 'Ya tengo cuenta' : 'Crear una cuenta'}</button>
      <button class="secondary" type="button" onclick="RECloud.resetPassword()">Recuperar contraseña</button>`;
  }
  function foreign() {
    return Boolean(user && localStorage.getItem(LINK) && localStorage.getItem(LINK) !== user.id);
  }
  function foreignPanel() {
    return `<section class="card"><h2>Datos de otra cuenta en este dispositivo</h2>
      <p>Para evitar mezclar dos personas, esta sesión no puede utilizar los datos locales de la cuenta anterior.</p>
      <button class="secondary" onclick="backup()">Exportar copia JSON de estos datos</button>
      <button class="primary" onclick="RECloud.clearPrevious()">Limpiar los datos locales anteriores</button></section>`;
  }
  function panel() {
    if (!isConfigured) return `<section class="card"><h2>Cuenta y sincronización</h2>
      <p>El guardado local está activo. La sincronización con cuenta estará disponible cuando el responsable de Reformándome configure el servicio.</p>
      <p class="small">Puedes exportar una copia JSON mientras tanto.</p></section>`;

    let content = '';
    if (!client) content = '<p>Preparando conexión…</p>';
    else if (foreign()) content = foreignPanel();
    else if (!user) content = form();
    else {
      content = `<p><strong>Cuenta:</strong> ${safe(user.email || 'Cuenta sin correo visible')}</p>`;
      if (linked()) {
        content += `<p>${dirty() ? 'Hay cambios pendientes de sincronización.' : 'Este dispositivo está vinculado a tu cuenta.'}</p>
          <button class="primary" type="button" onclick="RECloud.upload()">Sincronizar ahora</button>
          <button class="secondary" type="button" onclick="RECloud.download()">Recuperar datos de la nube</button>`;
      } else {
        content += `<p>Antes de sincronizar, elige qué datos conservar. No mezclamos dos historiales automáticamente.</p>
          <label class="opt"><input type="checkbox" id="cloud-consent"> Quiero guardar en mi cuenta el cuestionario y los registros personales (incluidos peso, ánimo, horarios y posibles datos de salud).</label>
          <button class="primary" type="button" onclick="RECloud.upload()">Subir mis datos actuales a esta cuenta</button>
          <button class="secondary" type="button" onclick="RECloud.download()">Recuperar los datos de esta cuenta</button>`;
      }
      if (conflict) content += `<p class="warning">Se han detectado cambios diferentes en este dispositivo y en la nube. Exporta una copia JSON antes de elegir qué versión conservar.</p>`;
      if (recovery) content += `<label for="cloud-newpass">Nueva contraseña</label>
        <input type="password" id="cloud-newpass" minlength="8" autocomplete="new-password">
        <button class="primary" onclick="RECloud.updatePassword()">Actualizar contraseña</button>`;
      content += `<button class="secondary" type="button" onclick="RECloud.deleteCloud()">Eliminar mi copia de la nube</button>
        <button class="secondary" type="button" onclick="RECloud.signOut()">Cerrar sesión y retirar datos locales vinculados</button>`;
    }
    return `<section class="card"><h2>Cuenta y sincronización</h2>
      <p>Cuenta opcional. Sin conexión, puedes continuar guardando registros en este dispositivo; se enviarán cuando vuelvas a conectarte.</p>
      <p class="small">El contenido del cuestionario, los turnos, el peso y el estado de ánimo pueden incluir datos sensibles. Usa solo una cuenta propia. No se transfieren sin vincular este dispositivo.</p>
      ${content}<p class="field-note" aria-live="polite">${safe(status)}</p>
      <p class="small">Al usar dos dispositivos a la vez puede haber conflictos: por ahora se sincroniza una copia completa, no una fusión automática.</p></section>`;
  }

  async function record() {
    const { data, error } = await client.from('reformandome_states')
      .select('payload,updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data || null;
  }
  function setLinked(row) {
    localStorage.setItem(LINK, user.id);
    localStorage.setItem(META + user.id, row?.updated_at || '');
    localStorage.removeItem(DIRTY + user.id);
    conflict = false;
  }
  async function loadCloud({ interactive = false } = {}) {
    if (foreign()) return setStatus('Antes de recuperar datos, limpia la cuenta anterior de este dispositivo.');
    if (!user || !client) return;
    try {
      const remote = await record();
      if (!remote) return setStatus('Esta cuenta todavía no tiene una copia. Pulsa «Subir mis datos actuales» para crearla.');
      if (interactive && !confirm('Recuperar la nube sustituirá los datos guardados en este dispositivo. Exporta una copia JSON si necesitas conservarlos. ¿Continuar?')) return;
      localStorage.setItem(KEY, JSON.stringify(remote.payload));
      setLinked(remote);
      status = 'Datos de la nube recuperados.';
      location.reload();
    } catch (e) {
      setStatus('No se pudieron recuperar los datos: ' + message(e));
      if (entry !== 'ready') gate('error');
    }
  }
  async function upload({ auto = false } = {}) {
    if (foreign()) return setStatus('Este dispositivo está vinculado a otra cuenta. Primero separa sus datos.');
    if (!client || !user) return setStatus('Primero inicia sesión.');
    if (busy) {
      if (auto) queue();
      return;
    }
    if (auto && !linked()) return;
    if (!auto && !linked() && !(document.getElementById('cloud-consent')?.checked || document.getElementById('re-consent')?.checked))
      return setStatus('Marca la casilla de autorización antes de subir tus datos personales.');
    busy = true;
    try {
      const remote = await record();
      if (!auto) {
        if (remote && !linked() && !confirm('Esta cuenta ya tiene datos: subir los actuales los sustituirá. Haz una copia JSON antes de continuar. ¿Subir igualmente?')) return;
        if (remote && linked() && remote.updated_at !== lastSync() && !confirm('Hay una versión más reciente en la nube. Si continúas, la sobrescribirás. ¿Seguir?')) {
          conflict = true;
          return;
        }
      } else if (remote && remote.updated_at !== lastSync()) {
        conflict = true;
        setStatus('Conflicto: hay cambios en otro dispositivo. Elige manualmente qué versión conservar desde Ajustes.');
        return;
      }
      const ver = seq;
      const copy = JSON.parse(JSON.stringify(d));
      const { error } = await client.from('reformandome_states').upsert(
        { user_id: user.id, payload: copy }, { onConflict: 'user_id' }
      );
      if (error) throw error;
      const latest = await record();
      if (latest) {
        localStorage.setItem(LINK, user.id);
        localStorage.setItem(META + user.id, latest.updated_at);
      }
      if (seq === ver) {
        localStorage.removeItem(DIRTY + user.id);
        status = 'Copia sincronizada correctamente.';
      } else {
        localStorage.setItem(DIRTY + user.id, '1');
        status = 'Quedan cambios nuevos por sincronizar.';
      }
      conflict = false;
    } catch (e) {
      if (linked()) localStorage.setItem(DIRTY + user.id, '1');
      status = 'No se pudo sincronizar: ' + message(e);
    } finally {
      busy = false;
      repaint();
      if (entry !== 'ready') entryRender();
      if (linked() && dirty() && !conflict && navigator.onLine) {
        clearTimeout(timer);
        timer = setTimeout(() => upload({ auto: true }), 4000);
      }
    }
  }
  function queue() {
    const uid = user?.id || localStorage.getItem(LINK);
    if (!uid) return;
    seq++;
    localStorage.setItem(DIRTY + uid, '1');
    clearTimeout(timer);
    if (linked() && navigator.onLine && client)
      timer = setTimeout(() => upload({ auto: true }), 2400);
  }
  async function reconcile() {
    if (!user || !client) return;
    if (foreign()) {
      setStatus('Hay datos de otra cuenta en este dispositivo.');
      gate('old-account');
      return;
    }
    try {
      const remote = await record();
      if (!remote) {
        setStatus('Cuenta conectada. Aún no hay una copia de tus datos en la nube.');
        gate(linked() ? 'ready' : 'new-account');
        return;
      }
      if (!linked()) {
        if (hasPersonalProgress()) {
          setStatus('Elige qué versión del progreso quieres utilizar.');
          gate('choose-data');
        } else {
          // En un dispositivo nuevo, la copia en la nube se restaura automáticamente.
          await loadCloud();
        }
        return;
      }
      if (dirty()) {
        if (remote.updated_at !== lastSync()) {
          conflict = true;
          setStatus('Hay cambios locales y remotos; elige qué versión conservar desde Ajustes.');
        } else {
          setStatus('Conectada. Enviando cambios locales pendientes…');
          queue();
        }
      } else if (remote.updated_at !== lastSync()) {
        await loadCloud();
        return;
      } else {
        setStatus('Cuenta conectada y datos sincronizados.');
      }
      gate('ready');
    } catch (e) {
      setStatus('No se pudo recuperar tu progreso: ' + message(e));
      gate('error');
    }
  }
  async function refreshUser(event, session) {
    const next = session?.user || null;
    if (user?.id === next?.id && event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;
    const request = ++entryRequest;
    user = next;
    conflict = false;
    if (user) {
      gate('loading');
      setStatus('Sesión abierta. Comprobando los datos…');
      await reconcile();
    } else if (request === entryRequest) {
      setStatus('Sin sesión iniciada.');
      // No mover a bienvenida si acaba de solicitarse confirmación del correo.
      if (entry !== 'confirm') gate('welcome');
    }
  }

  async function startAdventure() {
    if (!user || !client) return;
    if (!document.getElementById('re-consent')?.checked) {
      entryError = 'Marca la casilla de autorización para guardar tu aventura en tu cuenta.';
      entryRender(); return;
    }
    entryError = '';
    // El primer guardado crea la fila en Supabase; los siguientes son automáticos.
    await upload({ auto: false });
    if (linked()) gate('ready');
    else { entryError = status; entryRender(); }
  }
  async function linkLocal() {
    if (!document.getElementById('re-consent')?.checked) {
      entryError = 'Marca la autorización para guardar el progreso local en la nube.';
      entryRender(); return;
    }
    if (!confirm('Esto sustituirá el historial de esta cuenta en la nube por el que está guardado en este dispositivo. Descarga antes una copia de seguridad si la necesitas. ¿Continuar?')) return;
    await upload({ auto: false });
    if (linked()) gate('ready');
    else {entryError = status; entryRender();}
  }
  function startFresh() {
    if (!confirm('Se descartarán los datos locales de este dispositivo para empezar una aventura nueva. Los datos que tengas en la nube no se borrarán. ¿Continuar?')) return;
    localStorage.removeItem(KEY);
    location.reload();
  }
  function useOffline() {
    if (!localStorage.getItem(LINK)) return;
    // Nunca se usa este acceso si no hay una copia previamente vinculada.
    gate('ready');
  }

  // CAMBIO PRINCIPAL: el correo de confirmación debe volver a la raíz REAL
  // del repositorio GitHub Pages, no a / ni a /auth/confirm.
  async function submit() {
    if (!client) return;
    const email = (document.getElementById('re-email') || document.getElementById('cloud-email'))?.value.trim();
    const password = (document.getElementById('re-password') || document.getElementById('cloud-password'))?.value;
    if (!email || !password || password.length < 8) {
      entryError = 'Indica correo y contraseña de al menos 8 caracteres.';
      entryRender(); return setStatus(entryError);
    }
    try {
      let result;
      if (authMode === 'signup') {
        result = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: APP_URL }
        });
      } else {
        result = await client.auth.signInWithPassword({ email, password });
      }
      const { data, error } = result;
      if (error) throw error;
      if (authMode === 'signup' && !data.session) {
        registrationEmail = email;
        entryError = '';
        gate('confirm');
        setStatus('Cuenta creada. Revisa tu correo y confirma la dirección antes de iniciar sesión.');
      } else {
        setStatus('Sesión iniciada correctamente.');
        // El evento SIGNED_IN y la recuperación de la sesión llevan a reconcile().
        if (data.session) await refreshUser('SIGNED_IN', data.session);
      }
    } catch (e) {
      entryError = 'No se pudo acceder: ' + message(e);
      entryRender();
      setStatus(entryError);
    }
  }
  async function resetPassword() {
    const email = (document.getElementById('re-email') || document.getElementById('cloud-email'))?.value.trim();
    if (!email) return setStatus('Escribe primero tu correo.');
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: APP_URL
      });
      if (error) throw error;
      setStatus('Si ese correo corresponde a una cuenta, recibirás instrucciones para restablecer la contraseña.');
    } catch (e) {
      setStatus(message(e));
    }
  }
  async function updatePassword() {
    const password = document.getElementById('cloud-newpass')?.value;
    if (!password || password.length < 8) return setStatus('Introduce al menos 8 caracteres.');
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      recovery = false;
      setStatus('Contraseña actualizada.');
    } catch (e) {
      setStatus(message(e));
    }
  }
  async function deleteCloud() {
    if (!client || !user) return;
    if (!confirm('Esto borrará el historial almacenado en tu nube. Los datos de este dispositivo no se borrarán, pero dejarán de sincronizarse hasta que vuelvas a vincularlos.\n¿Eliminar la copia de la nube?')) return;
    try {
      const { error } = await client.from('reformandome_states').delete().eq('user_id', user.id);
      if (error) throw error;
      localStorage.removeItem(LINK);
      localStorage.removeItem(META + user.id);
      localStorage.removeItem(DIRTY + user.id);
      setStatus('Datos de la nube eliminados. La cuenta sigue existiendo y el dispositivo mantiene sus datos locales.');
    } catch (e) {
      setStatus('No se han podido eliminar los datos: ' + message(e));
    }
  }
  async function signOut() {
    if (!client || !user) return;
    if (linked() && dirty())
      return setStatus('Hay cambios sin sincronizar. Pulsa «Sincronizar ahora» y comprueba que termina antes de cerrar sesión.');
    if (!confirm(linked()
      ? 'Cerrar sesión eliminará de este dispositivo la copia vinculada a tu cuenta. La copia de la nube seguirá guardada. ¿Continuar?'
      : '¿Cerrar la sesión de esta cuenta?')) return;
    const oldId = user.id;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      if (localStorage.getItem(LINK) === oldId) {
        localStorage.removeItem(KEY);
        localStorage.removeItem(LINK);
        localStorage.removeItem(META + oldId);
        localStorage.removeItem(DIRTY + oldId);
      }
      location.reload();
    } catch (e) {
      setStatus(message(e));
    }
  }

  window.RECloud = {
    panel, foreign, foreignPanel, queue, submit, resetPassword, updatePassword,
    signOut, deleteCloud,
    upload: () => upload(),
    download: () => loadCloud({ interactive: true }),
    clearPrevious() {
      if (!foreign()) return;
      if (!confirm('Se eliminarán los datos locales de la cuenta anterior. Exporta una copia JSON antes si tienes cambios pendientes. La copia de la nube de esa cuenta no se modificará.\n¿Continuar?')) return;
      localStorage.removeItem(KEY);
      localStorage.removeItem(LINK);
      location.reload();
    },
    home() {entryError = ''; gate('welcome');},
    mode(m) {
      authMode = m === 'signup' ? 'signup' : 'signin';
      entryError = '';
      if (entry !== 'ready') gate(authMode);
      else repaint();
    },
    startAdventure, linkLocal, startFresh, useOffline,
    exportLocal() {if (typeof backup === 'function') backup();}

  };

  // Una PWA puede mezclar un cloud-sync.js nuevo y un cloud-config.js antiguo
  // que quedó en la caché. Recuperamos el archivo público sin modificar datos locales.
  async function loadPublicConfig() {
    if (isConfigured) return true;
    setStatus('Comprobando la configuración de Supabase…');
    gate('loading');
    return await new Promise(resolve => {
      const configScript = document.createElement('script');
      const configUrl = new URL('cloud-config.js', document.baseURI);
      configUrl.searchParams.set('version', 'v33');
      configScript.src = configUrl.href;
      configScript.onload = () => {
        cfg = window.REFORMANDOME_CLOUD || {};
        isConfigured = validConfig(cfg);
        configScript.remove();
        resolve(isConfigured);
      };
      configScript.onerror = () => {
        configScript.remove();
        resolve(false);
      };
      document.head.appendChild(configScript);
    });
  }
  async function initializeCloud() {
    if (!(await loadPublicConfig())) {
      setStatus('No se ha podido cargar una configuración válida desde cloud-config.js. Comprueba que el archivo esté publicado en la raíz de Life-Changer.');
      gate('error');
      return;
    }
    setStatus('Conectando con Supabase…');
    const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.crossOrigin = 'anonymous';
  script.onload = async () => {
    try {
      if (!window.supabase?.createClient) throw new Error('La biblioteca de conexión no está disponible.');
      client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') recovery = true;
        setTimeout(() => refreshUser(event, session), 0);
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await refreshUser('INITIAL_SESSION', data?.session);
      const hash = new URLSearchParams(location.hash.slice(1));
      if (hash.get('error_description')) {
        setStatus('Error al confirmar el correo: ' + hash.get('error_description').replace(/\+/g, ' '));
      }
    } catch (e) {
      setStatus('No se ha podido iniciar la cuenta: ' + message(e));
      gate('error');
    }
  };
  script.onerror = () => {setStatus('El servidor de inicio de sesión no responde.');gate('error');};
    document.head.appendChild(script);
  }
  initializeCloud().catch(e => {
    setStatus('Error al iniciar Supabase: ' + message(e));
    gate('error');
  });
  window.addEventListener('online', () => {
    if (linked()) {
      if (dirty()) queue();
      else reconcile();
    }
  });
})();
