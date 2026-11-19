'use strict';
/* Cuentas optativas de Reformándome. La app permanece utilizable en modo local sin Supabase.
 * Los datos de cada cuenta se guardan únicamente tras aceptar subirlos; RLS del servidor es obligatorio.
 */
(function(){
const cfg=window.REFORMANDOME_CLOUD||{};
const isConfigured=/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(String(cfg.url||''))&&/^(sb_publishable_|eyJ)/.test(String(cfg.publishableKey||''));
const LINK='reformandome_cloud_linked_uid',META='reformandome_cloud_last_sync_';
let client=null,user=null,status=isConfigured?'Conectando con el servicio de cuentas…':'La aplicación funciona sin cuenta. La nube aún no está configurada.',busy=false,authMode='signin',recovery=false,timer=null,seq=0,conflict=false;
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function repaint(){if(typeof render==='function'&&(typeof page!=='undefined'&&page==='Ajustes'||typeof d!=='undefined'&&(!d.character.choiceDone||!d.setup.completed)))render();}
function linked(){return Boolean(user&&localStorage.getItem(LINK)===user.id)}
function dirty(){return !!user&&localStorage.getItem('reformandome_cloud_dirty_'+user.id)==='1'}
function lastSync(){return user?localStorage.getItem(META+user.id)||'':''}
function setStatus(txt){status=txt;repaint()}
function message(e){return typeof e==='string'?e:e?.message||'No se ha podido completar la operación.'}
function form(){return `<label for="cloud-email">Correo electrónico</label><input id="cloud-email" type="email" autocomplete="email" placeholder="tu@correo.es" maxlength="255"><label for="cloud-password">${authMode==='signup'?'Crear contraseña (mínimo 8 caracteres)':'Contraseña'}</label><input id="cloud-password" type="password" minlength="8" autocomplete="${authMode==='signup'?'new-password':'current-password'}"><button class="primary" type="button" onclick="RECloud.submit()">${authMode==='signup'?'Crear mi cuenta':'Iniciar sesión'}</button><button class="secondary" type="button" onclick="RECloud.mode('${authMode==='signup'?'signin':'signup'}')">${authMode==='signup'?'Ya tengo cuenta':'Crear una cuenta'}</button><button class="secondary" type="button" onclick="RECloud.resetPassword()">Recuperar contraseña</button>`;}
function foreign(){return !!(user&&localStorage.getItem(LINK)&&localStorage.getItem(LINK)!==user.id)}
function foreignPanel(){return `<section class="card"><h2>Datos de otra cuenta en este dispositivo</h2><p>Para evitar mezclar dos personas, esta sesión no puede utilizar los datos locales de la cuenta anterior.</p><button class="secondary" onclick="backup()">Exportar copia JSON de estos datos</button><button class="primary" onclick="RECloud.clearPrevious()">Limpiar los datos locales anteriores</button></section>`;}
function panel(){
 if(!isConfigured)return `<section class="card"><h2>Cuenta y sincronización</h2><p>El guardado local está activo. La sincronización con cuenta estará disponible cuando el responsable de Reformándome configure el servicio.</p><p class="small">Puedes exportar una copia JSON mientras tanto.</p></section>`;
 let content='';
 if(!client)content='<p>Preparando conexión…</p>';
 else if(foreign())content=foreignPanel();
 else if(!user)content=form();
 else{
  content=`<p><strong>Cuenta:</strong> ${safe(user.email||'Cuenta sin correo visible')}</p>`;
  content+= linked()?`<p>${dirty()?'Hay cambios pendientes de sincronización.':'Este dispositivo está vinculado a tu cuenta.'}</p><button class="primary" type="button" onclick="RECloud.upload()">Sincronizar ahora</button><button class="secondary" type="button" onclick="RECloud.download()">Recuperar datos de la nube</button>`:
  `<p>Antes de sincronizar, elige qué datos conservar. No mezclamos dos historiales automáticamente.</p><label class="opt"><input type="checkbox" id="cloud-consent"> Quiero guardar en mi cuenta el cuestionario y los registros personales (incluidos peso, ánimo, horarios y posibles datos de salud).</label><button class="primary" type="button" onclick="RECloud.upload()">Subir mis datos actuales a esta cuenta</button><button class="secondary" type="button" onclick="RECloud.download()">Recuperar los datos de esta cuenta</button>`;
  if(conflict)content+=`<p class="warning">Se han detectado cambios diferentes en este dispositivo y en la nube. Exporta una copia JSON antes de elegir qué versión conservar.</p>`;
  if(recovery)content+=`<label for="cloud-newpass">Nueva contraseña</label><input type="password" id="cloud-newpass" minlength="8" autocomplete="new-password"><button class="primary" onclick="RECloud.updatePassword()">Actualizar contraseña</button>`;
  content+=`<button class="secondary" type="button" onclick="RECloud.deleteCloud()">Eliminar mi copia de la nube</button><button class="secondary" type="button" onclick="RECloud.signOut()">Cerrar sesión y retirar datos locales vinculados</button>`;
 }
 return `<section class="card"><h2>Cuenta y sincronización</h2><p>Cuenta opcional. Sin conexión, puedes continuar guardando registros en este dispositivo; se enviarán cuando vuelvas a conectarte.</p><p class="small">El contenido del cuestionario, los turnos, el peso y el estado de ánimo pueden incluir datos sensibles. Usa solo una cuenta propia. No se transfieren sin vincular este dispositivo.</p>${content}<p class="field-note" aria-live="polite">${safe(status)}</p><p class="small">Al usar dos dispositivos a la vez puede haber conflictos: por ahora se sincroniza una copia completa, no una fusión automática.</p></section>`;
}
async function record(){const {data,error}=await client.from('reformandome_states').select('payload,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;return data||null;}
function setLinked(row){localStorage.setItem(LINK,user.id);localStorage.setItem(META+user.id,row?.updated_at||'');localStorage.removeItem('reformandome_cloud_dirty_'+user.id);conflict=false;}
async function loadCloud({interactive=false}={}){
 if(foreign())return setStatus('Antes de recuperar datos, limpia la cuenta anterior de este dispositivo.');
 if(!user||!client)return;
 const remote=await record();
 if(!remote){setStatus('Esta cuenta todavía no tiene una copia. Pulsa «Subir mis datos actuales» para crearla.');return;}
 if(interactive){if(!confirm('Recuperar la nube sustituirá los datos guardados en este dispositivo. Exporta una copia JSON si necesitas conservarlos. ¿Continuar?'))return;}
 localStorage.setItem(KEY,JSON.stringify(remote.payload));setLinked(remote);status='Datos de la nube recuperados.';
 location.reload();
}
async function upload({auto=false}={}){
 if(foreign())return setStatus('Este dispositivo está vinculado a otra cuenta. Primero separa sus datos.');
 if(!client||!user)return setStatus('Primero inicia sesión.');
 if(busy){if(auto)queue();return;}
 if(auto&&!linked())return;
 if(!auto&&!linked()&&!document.getElementById('cloud-consent')?.checked)return setStatus('Marca la casilla de autorización antes de subir tus datos personales.');
 busy=true;
 try{
  const remote=await record();
  if(!auto){
   if(remote&&!linked()&&!confirm('Esta cuenta ya tiene datos: subir los actuales los sustituirá. Haz una copia JSON antes de continuar. ¿Subir igualmente?'))return;
   if(remote&&linked()&&remote.updated_at!==lastSync()&&!confirm('Hay una versión más reciente en la nube. Si continúas, la sobrescribirás. ¿Seguir?')){conflict=true;return;}
  }else if(remote&&remote.updated_at!==lastSync()){
   conflict=true;setStatus('Conflicto: hay cambios en otro dispositivo. Elige manualmente qué versión conservar desde Ajustes.');return;
  }
  const ver=seq,copy=JSON.parse(JSON.stringify(d));
  const {error}=await client.from('reformandome_states').upsert({user_id:user.id,payload:copy},{onConflict:'user_id'});if(error)throw error;
  // La marca de versión viene del servidor, no del reloj del dispositivo.
  const latest=await record();if(latest){localStorage.setItem(LINK,user.id);localStorage.setItem(META+user.id,latest.updated_at);}
  if(seq===ver){localStorage.removeItem('reformandome_cloud_dirty_'+user.id);status='Copia sincronizada correctamente.';}
  else {localStorage.setItem('reformandome_cloud_dirty_'+user.id,'1');status='Quedan cambios nuevos por sincronizar.';}
  conflict=false;
 }catch(e){if(linked())localStorage.setItem('reformandome_cloud_dirty_'+user.id,'1');status='No se pudo sincronizar: '+message(e);}
 finally{busy=false;repaint();if(linked()&&dirty()&&!conflict&&navigator.onLine){clearTimeout(timer);timer=setTimeout(()=>upload({auto:true}),4000)}}
}
function queue(){const uid=user?.id||localStorage.getItem(LINK);if(!uid)return;seq++;localStorage.setItem('reformandome_cloud_dirty_'+uid,'1');clearTimeout(timer);if(linked()&&navigator.onLine&&client)timer=setTimeout(()=>upload({auto:true}),2400);}
async function reconcile(){if(!user||!client)return;if(foreign()){setStatus('Este dispositivo estaba vinculado a otra cuenta. No mezclaremos sus datos.');return;}
 try{
  const remote=await record();
  if(!remote){setStatus('Cuenta conectada. No existe una copia en la nube; puedes subir los datos actuales.');return;}
  if(!linked()){conflict=false;setStatus('Cuenta conectada. Elige si quieres subir los datos de este dispositivo o recuperar los ya guardados en la nube.');return;}
  if(dirty()){
   if(remote.updated_at!==lastSync()){conflict=true;setStatus('Hay cambios locales y remotos; elige qué versión conservar.');}
   else{setStatus('Conectada. Enviando cambios locales pendientes…');queue();}
   return;
  }
  if(remote.updated_at!==lastSync()){
   // Sólo se actualiza automáticamente cuando esta cuenta estaba vinculada y no hay cambios pendientes.
   await loadCloud();return;
  }
  setStatus('Cuenta conectada y datos sincronizados.');
 }catch(e){setStatus('No se pudo comprobar el estado de la nube: '+message(e));}
}
async function refreshUser(event,session){const next=session?.user||null;if(user?.id===next?.id&&event!=='SIGNED_IN'&&event!=='INITIAL_SESSION')return;user=next;conflict=false;
 if(user){setStatus('Sesión abierta. Comprobando los datos…');await reconcile()}
 else{setStatus('Sin sesión iniciada. Tus datos locales siguen disponibles.');}
}
async function submit(){if(!client)return;const email=document.getElementById('cloud-email')?.value.trim(),password=document.getElementById('cloud-password')?.value;if(!email||!password||password.length<8)return setStatus('Indica correo y contraseña de al menos 8 caracteres.');
 try{const {data,error}=authMode==='signup'?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});if(error)throw error;if(authMode==='signup'&&!data.session)setStatus('Cuenta creada. Revisa tu correo y confirma la dirección antes de iniciar sesión.');else setStatus('Sesión iniciada correctamente.');}
 catch(e){setStatus('No se pudo acceder: '+message(e))}
}
async function resetPassword(){let email=document.getElementById('cloud-email')?.value.trim();if(!email)return setStatus('Escribe primero tu correo.');try{let {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.href.split('#')[0]});if(error)throw error;setStatus('Si ese correo corresponde a una cuenta, recibirás instrucciones para restablecer la contraseña.')}catch(e){setStatus(message(e))}}
async function updatePassword(){let password=document.getElementById('cloud-newpass')?.value;if(!password||password.length<8)return setStatus('Introduce al menos 8 caracteres.');try{let {error}=await client.auth.updateUser({password});if(error)throw error;recovery=false;setStatus('Contraseña actualizada.')}catch(e){setStatus(message(e))}}
async function deleteCloud(){if(!client||!user)return;if(!confirm('Esto borrará el historial almacenado en tu nube. Los datos de este dispositivo no se borrarán, pero dejarán de sincronizarse hasta que vuelvas a vincularlos. ¿Eliminar la copia de la nube?'))return;try{const {error}=await client.from('reformandome_states').delete().eq('user_id',user.id);if(error)throw error;localStorage.removeItem(LINK);localStorage.removeItem(META+user.id);localStorage.removeItem('reformandome_cloud_dirty_'+user.id);setStatus('Datos de la nube eliminados. La cuenta sigue existiendo y el dispositivo mantiene sus datos locales.')}catch(e){setStatus('No se han podido eliminar los datos: '+message(e))}}
async function signOut(){if(!client||!user)return;
 if(linked()&&dirty()){setStatus('Hay cambios sin sincronizar. Pulsa «Sincronizar ahora» y comprueba que termina antes de cerrar sesión.');return;}
 if(!confirm(linked()?'Cerrar sesión eliminará de este dispositivo la copia vinculada a tu cuenta. La copia de la nube seguirá guardada. ¿Continuar?':'¿Cerrar la sesión de esta cuenta?'))return;
 let oldId=user.id;try{let {error}=await client.auth.signOut();if(error)throw error;
 if(localStorage.getItem(LINK)===oldId){localStorage.removeItem(KEY);localStorage.removeItem(LINK);localStorage.removeItem(META+oldId);localStorage.removeItem('reformandome_cloud_dirty_'+oldId)}
 location.reload();
 }catch(e){setStatus(message(e))}
}
window.RECloud={panel,foreign,foreignPanel,queue,submit,resetPassword,updatePassword,signOut,deleteCloud,upload:()=>upload(),download:()=>loadCloud({interactive:true}),clearPrevious(){if(!foreign())return;if(!confirm('Se eliminarán los datos locales de la cuenta anterior. Exporta una copia JSON antes si tienes cambios pendientes. La copia de la nube de esa cuenta no se modificará. ¿Continuar?'))return;localStorage.removeItem(KEY);localStorage.removeItem(LINK);location.reload()},mode(m){authMode=m==='signup'?'signup':'signin';repaint()}};
if(!isConfigured){repaint();return;}
const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';script.crossOrigin='anonymous';
script.onload=async()=>{try{
 if(!window.supabase?.createClient)throw new Error('La biblioteca de conexión no está disponible.');
 client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 client.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY')recovery=true;setTimeout(()=>refreshUser(event,session),0)});
 const {data,error}=await client.auth.getSession();if(error)throw error;await refreshUser('INITIAL_SESSION',data?.session);
}catch(e){setStatus('No se ha podido iniciar la cuenta: '+message(e))}};
script.onerror=()=>setStatus('El servidor de inicio de sesión no responde. Puedes seguir trabajando localmente.');document.head.appendChild(script);
window.addEventListener('online',()=>{if(linked()){if(dirty())queue();else reconcile()}});
})();
