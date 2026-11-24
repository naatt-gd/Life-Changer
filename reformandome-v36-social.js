'use strict';
/* Reformándome v36 · retos privados. Cargar después de reformandome-v36.js.
 * Requiere SQL 02_Supabase/01_retos_sociales_opcional.sql para funcionar.
 */
(() => {
  if (!window.RE36?.open || !window.RECloud?.getClient) return;
  const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client=()=>window.RECloud?.getClient?.();
  const user=()=>window.RECloud?.getUser?.();
  const T='reformandome_v36_challenges',M='reformandome_v36_members';
  const cache={rows:[],members:{},error:'',loading:false,loadedAt:0};
  const cats=[['pasos','Pasos (introducción manual)'],['minutos','Minutos de caminata'],['entrenamientos','Entrenamientos'],['habitos','Hábitos completados']];
  let busy=false;
  const valid=()=>Boolean(client()&&user()&&window.RECloud?.isReady?.());
  function feedback(txt){cache.error=String(txt||'');window.RE36?.open?.('social');}
  async function refresh(force=false,show=true){
    if(!valid())return;
    if(cache.loading || (!force && Date.now()-cache.loadedAt<12000))return;
    cache.loading=true;cache.error='';
    try{
      const {data,error}=await client().from(T).select('id,creator_id,invite_code,title,kind,target,days,team_mode,starts_on').order('starts_on',{ascending:false}).limit(40);
      if(error)throw error;
      cache.rows=data||[];cache.members={};
      // Consultas pequeñas dentro de reto privado; RLS oculta miembros ajenos.
      for(const row of cache.rows){const r=await client().from(M).select('user_id,alias,progress').eq('challenge_id',row.id).order('progress',{ascending:false}).limit(100);if(!r.error)cache.members[row.id]=r.data||[];}
      cache.loadedAt=Date.now();
    }catch(err){cache.error='No se han podido cargar los retos. Comprueba el SQL social: '+(err.message||String(err));}
    finally{cache.loading=false;if(show)window.RE36?.open?.('social');}
  }
  function randomCode(){
    if(!window.crypto?.getRandomValues)throw new Error('Se necesita una conexión segura HTTPS para crear invitaciones.');
    const arr=new Uint8Array(12);crypto.getRandomValues(arr);return [...arr].map(n=>n.toString(16).padStart(2,'0')).join('');
  }
  async function create(){if(!valid()||busy)return;
    const title=prompt('Nombre del reto compartido (3–80 caracteres)');if(title===null)return;
    if(title.trim().length<3||title.length>80)return alert('Pon un título de 3 a 80 caracteres.');
    const kind=prompt('Tipo: pasos, minutos, entrenamientos o habitos','minutos');if(kind===null)return;
    const category=String(kind).trim().toLowerCase();if(!cats.some(([id])=>id===category))return alert('Elige uno de los tipos indicados.');
    const goal=Number(prompt('Objetivo numérico (1–1.000.000)',100));if(!Number.isInteger(goal)||goal<1||goal>1000000)return alert('Objetivo no válido.');
    const days=Number(prompt('Duración en días (1–66)',7));if(!Number.isInteger(days)||days<1||days>66)return alert('Duración no válida.');
    const team=confirm('¿Quieres que sea un reto cooperativo de gremio? Aceptar = sumar avances del equipo; Cancelar = clasificación individual.');
    busy=true;try{
      const payload={creator_id:user().id,invite_code:randomCode(),title:title.trim(),kind:category,target:goal,days,team_mode:team};
      const {error}=await client().from(T).insert(payload);
      if(error)throw error;
      cache.loadedAt=0;await refresh(true);
      alert('Reto creado. Copia y comparte su código de invitación desde la pestaña Amigos.');
    }catch(err){feedback('No se pudo crear el reto: '+(err.message||String(err)));}
    finally{busy=false;}
  }
  async function join(){if(!valid()||busy)return;
    const code=prompt('Pega el código privado de invitación (24 caracteres hexadecimales)');if(code===null)return;
    if(!/^[a-f0-9]{24,64}$/.test(code.trim().toLowerCase()))return alert('El código no tiene el formato correcto.');
    const alias=prompt('Alias que verán los demás participantes (2–24 caracteres)',String(user().user_metadata?.character_name||'Aventurero').slice(0,24));if(alias===null)return;
    if(alias.trim().length<2||alias.length>24)return alert('El alias debe tener entre 2 y 24 caracteres.');
    busy=true;try{
      const {error}=await client().rpc('re36_join_challenge',{p_code:code.trim().toLowerCase(),p_alias:alias.trim()});
      if(error)throw error;cache.loadedAt=0;await refresh(true);
    }catch(e){feedback('No se pudo unir al reto: '+(e.message||String(e)));}finally{busy=false;}
  }
  async function progress(id){if(!valid()||busy)return;
    const ch=cache.rows.find(x=>x.id===id),own=cache.members[id]?.find(x=>x.user_id===user().id);if(!ch||!own)return;
    const amount=Number(prompt('Tu progreso TOTAL acumulado (no sumes la cantidad dos veces)',String(own.progress)));
    if(!Number.isInteger(amount)||amount<0||amount>1000000)return alert('Introduce un número entre 0 y 1.000.000.');
    busy=true;try{
      const {error}=await client().from(M).update({progress:amount}).eq('challenge_id',id).eq('user_id',user().id);
      if(error)throw error;cache.loadedAt=0;await refresh(true);
    }catch(e){feedback('No se pudo actualizar el progreso: '+(e.message||String(e)));}finally{busy=false;}
  }
  async function setAlias(id){if(!valid())return;
    const own=cache.members[id]?.find(x=>x.user_id===user().id),alias=prompt('Alias visible en este reto (2–24 caracteres)',own?.alias||'');if(alias===null)return;
    if(alias.trim().length<2||alias.length>24)return alert('Alias no válido.');
    const {error}=await client().from(M).update({alias:alias.trim()}).eq('challenge_id',id).eq('user_id',user().id);
    if(error)return feedback(error.message);cache.loadedAt=0;await refresh(true);
  }
  function share(code){if(!/^[a-f0-9]{24,64}$/.test(code))return;
    navigator.clipboard?.writeText(code).then(()=>alert('Código copiado. Compártelo solo con quien quieras invitar.'),()=>prompt('Copia este código:',code))||prompt('Copia este código:',code);
  }
  function card(){if(!valid())return '<p>Inicia sesión para participar en retos privados.</p>';
    if(!cache.loadedAt && !cache.loading && !cache.error) Promise.resolve().then(()=>refresh(true,true));
    const rows=cache.rows;
    return `<div class="re36-row"><button class="primary" onclick="RE36Social.create()">Crear reto privado</button><button class="secondary" onclick="RE36Social.join()">Unirme con código</button><button class="secondary" onclick="RE36Social.refresh(true)">Actualizar</button></div>
      ${cache.error?`<p role="alert">${safe(cache.error)}</p>`:''}
      ${!rows.length?'<p>Aún no tienes retos visibles. Puedes crear uno e invitar a otras personas.</p>':''}
      ${rows.map(ch=>{
        const all=cache.members[ch.id]||[],self=all.find(m=>m.user_id===user().id),progressSum=all.reduce((a,m)=>a+Number(m.progress),0),value=ch.team_mode?progressSum:self?.progress||0;
        return `<details class="re36-social-item"><summary><strong>${safe(ch.title)}</strong> · ${ch.team_mode?'Gremio':'Individual'} · ${Math.min(ch.target,value)}/${ch.target}</summary>
          <p>${safe(cats.find(([id])=>id===ch.kind)?.[1]||ch.kind)} · ${ch.days} días · Inicio ${safe(ch.starts_on)}</p>
          <div class="re36-meter"><i style="width:${Math.min(100,100*value/ch.target)}%"></i></div>
          ${ch.creator_id===user().id?`<p>Código privado: <code>${safe(ch.invite_code)}</code> <button class="secondary" onclick="RE36Social.share('${ch.invite_code}')">Copiar</button></p>`:''}
          <p>Participantes:</p><ol>${all.map(m=>`<li>${safe(m.alias)} · ${m.progress}</li>`).join('')}</ol>
          ${self?`<button class="secondary" onclick="RE36Social.progress('${ch.id}')">Actualizar mi progreso</button><button class="secondary" onclick="RE36Social.setAlias('${ch.id}')">Cambiar mi alias</button>`:''}</details>`;
      }).join('')}`;
  }
  window.RE36Social={card,refresh,create,join,progress,setAlias,share};
  window.addEventListener('reformandome:account-state',e=>{
    if(e.detail?.state==='ready'){cache.loadedAt=0;cache.error='';}
    if(e.detail?.state==='welcome'){cache.rows=[];cache.members={};cache.loadedAt=0;}
  });
  // La consulta se inicia cuando el usuario abre Amigos; nunca interrumpe el inicio de sesión.
})();
