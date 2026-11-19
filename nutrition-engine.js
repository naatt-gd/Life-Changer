/* Reformándome v30: Biblioteca de comidas orientativa, de uso educativo. Se separa del código de UI.
   Las recetas son propuestas originales, inspiradas en conceptos generales de los documentos aportados,
   no transcripciones literales ni dietas terapéuticas. Sin cantidades prescriptivas ni cálculo calórico clínico. */
(function(root){ 'use strict';
const fold = s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const DATA = String.raw`
desayuno|Avena nocturna con bebida de soja, pera y canela|avena, bebida de soja, pera, canela|vegan|8|fruta,cereal,portable,rapido,tandas
desayuno|Tostadas integrales con tomate y aceite de oliva|pan integral, tomate, aceite de oliva|vegan|6|cereal,verdura,rapido,economico
desayuno|Tostadas integrales con aguacate y huevo|pan integral, aguacate, huevo|veg|12|cereal,proteina,rapido
desayuno|Yogur natural sin lactosa con frutos rojos y avena|yogur sin lactosa, frutos rojos, avena|veg|5|proteina,fruta,cereal,rapido
desayuno|Gachas de avena con manzana y nueces|avena, manzana, nueces, bebida de avena|vegan|12|fruta,cereal,rapido
desayuno|Pan integral con hummus y pepino|pan integral, garbanzos, pepino, aceite de oliva|vegan|8|legumbre,cereal,verdura,proteina,rapido,portable
desayuno|Tortilla de espinacas con pan integral|huevo, espinacas, pan integral|veg|13|proteina,verdura,cereal,rapido
desayuno|Porridge de quinoa con plátano|quinoa, plátano, bebida de soja, canela|vegan|15|fruta,cereal,proteina
desayuno|Tortitas de avena, huevo y plátano|avena, huevo, plátano|veg|15|proteina,cereal,fruta
desayuno|Yogur de soja natural con kiwi y semillas de chía|yogur de soja, kiwi, semillas de chía|vegan|5|proteina,fruta,rapido
desayuno|Tostada de centeno con requesón y fresas|pan de centeno, requesón, fresas|veg|6|proteina,cereal,fruta,rapido
desayuno|Pera, nueces y pan integral con crema de cacahuete|pera, nueces, pan integral, crema de cacahuete|vegan|5|fruta,cereal,rapido
desayuno|Tortilla de champiñones y tostada|huevo, champiñones, pan integral|veg|14|proteina,verdura,cereal
desayuno|Tazón de muesli sin azúcar con bebida de avena y fruta|muesli sin azúcar, bebida de avena, fruta|vegan|5|cereal,fruta,rapido,portable
desayuno|Tortilla francesa y mandarina|huevo, mandarina, pan integral|veg|10|proteina,fruta,cereal,rapido
desayuno|Pan de maíz con tomate y huevo cocido|pan de maíz, tomate, huevo|veg|12|proteina,cereal,verdura,rapido
desayuno|Avena cocida con frutos rojos y almendras|avena, frutos rojos, almendras, bebida de soja|vegan|12|cereal,fruta,proteina
desayuno|Batido de plátano, bebida de soja y avena|plátano, bebida de soja, avena|vegan|5|proteina,cereal,fruta,rapido,portable
comida|Lentejas guisadas con verduras y arroz|lentejas, arroz, zanahoria, calabacín, aceite de oliva|vegan|35|legumbre,cereal,verdura,proteina,economico,tandas
comida|Arroz integral con pollo y brócoli|arroz integral, pollo, brócoli, aceite de oliva|omni|30|cereal,proteina,verdura,tandas,portable
comida|Garbanzos con pimiento asado y cuscús integral|garbanzos, pimiento, cuscús integral, aceite de oliva|vegan|20|legumbre,cereal,verdura,proteina,portable,economico
comida|Merluza al horno con patata y judías verdes|merluza, patata, judías verdes, aceite de oliva|fish|35|proteina,verdura,tuberculo
comida|Ensalada templada de alubias y boniato|alubias, boniato, espinacas, aceite de oliva|vegan|25|legumbre,verdura,proteina,economico,tandas
comida|Pasta integral con atún y calabacín|pasta integral, atún, calabacín, aceite de oliva|fish|20|cereal,proteina,verdura,portable
comida|Bol de quinoa con tofu, zanahoria y espinacas|quinoa, tofu, zanahoria, espinacas, aceite de oliva|vegan|25|cereal,proteina,verdura,portable
comida|Pavo con arroz integral y zanahoria|pavo, arroz integral, zanahoria, aceite de oliva|omni|30|proteina,cereal,verdura,tandas,portable
comida|Ensalada de garbanzos, pepino, tomate y huevo|garbanzos, pepino, tomate, huevo, aceite de oliva|veg|15|legumbre,proteina,verdura,rapido,portable,economico
comida|Patatas con acelgas y alubias blancas|patata, acelgas, alubias, aceite de oliva|vegan|30|legumbre,verdura,proteina,tuberculo,economico
comida|Arroz con verduras y revuelto de huevo|arroz, huevo, calabacín, zanahoria, aceite de oliva|veg|22|proteina,cereal,verdura,economico
comida|Pollo al horno con calabaza y patata|pollo, calabaza, patata, aceite de oliva|omni|35|proteina,verdura,tuberculo,tandas
comida|Cuscús integral con lentejas y verduras|cuscús integral, lentejas, calabacín, zanahoria, aceite de oliva|vegan|18|proteina,cereal,verdura,legumbre,portable,economico
comida|Salmón con arroz y espárragos|salmón, arroz, espárragos, aceite de oliva|fish|30|proteina,cereal,verdura
comida|Tofu salteado con arroz y judías verdes|tofu, arroz, judías verdes, aceite de oliva|vegan|20|proteina,cereal,verdura,portable
comida|Pasta de trigo integral con pavo y tomate|pasta integral, pavo, tomate, aceite de oliva|omni|22|cereal,proteina,verdura,portable
comida|Bulgur con garbanzos y berenjena asada|bulgur, garbanzos, berenjena, aceite de oliva|vegan|30|cereal,legumbre,verdura,proteina,tandas
comida|Ensalada de patata, judías verdes y atún|patata, judías verdes, atún, aceite de oliva|fish|18|proteina,verdura,tuberculo,portable,rapido
comida|Fajitas de tortilla de maíz con pollo y verduras|tortilla de maíz, pollo, pimiento, calabacín|omni|20|proteina,cereal,verdura,portable
comida|Lentejas con calabaza y huevo cocido|lentejas, calabaza, huevo, aceite de oliva|veg|30|proteina,legumbre,verdura,economico,tandas
comida|Arroz precocido con alubias, zanahoria y aceite|arroz, alubias, zanahoria, aceite de oliva|vegan|12|proteina,legumbre,cereal,verdura,rapido,portable,economico
comida|Tostadas integrales con sardinas y tomate|pan integral, sardinas, tomate, aceite de oliva|fish|10|proteina,cereal,verdura,rapido
comida|Ensalada tibia de quinoa, pollo y pepino|quinoa, pollo, pepino, aceite de oliva|omni|25|proteina,cereal,verdura,portable
comida|Garbanzos al curry suave con arroz|garbanzos, arroz, calabacín, bebida de coco, curry suave|vegan|25|proteina,legumbre,cereal,verdura,economico,tandas
comida|Bocadillo integral de tortilla y tomate|pan integral, huevo, tomate, aceite de oliva|veg|12|proteina,cereal,verdura,rapido,portable,economico
comida|Ensalada de arroz, maíz, atún y zanahoria|arroz, maíz, atún, zanahoria, aceite de oliva|fish|12|proteina,cereal,verdura,rapido,portable
comida|Pollo con patata asada y ensalada verde|pollo, patata, lechuga, pepino, aceite de oliva|omni|32|proteina,tuberculo,verdura
comida|Guiso de alubias, espinacas y arroz|alubias, espinacas, arroz, aceite de oliva|vegan|28|proteina,legumbre,cereal,verdura,tandas,economico
cena|Crema de calabaza con tortilla francesa|calabaza, zanahoria, huevo, aceite de oliva|veg|25|verdura,proteina,suave
cena|Pechuga de pollo y puré de patata con calabacín|pollo, patata, calabacín, aceite de oliva|omni|30|proteina,verdura,tuberculo,suave
cena|Sopa de verduras con garbanzos|garbanzos, zanahoria, calabacín, patata|vegan|25|legumbre,verdura,proteina,suave,economico
cena|Merluza al vapor con boniato y judías verdes|merluza, boniato, judías verdes, aceite de oliva|fish|25|proteina,tuberculo,verdura,suave
cena|Tortilla de calabacín y ensalada de canónigos|huevo, calabacín, canónigos, aceite de oliva|veg|18|proteina,verdura,rapido
cena|Salteado de tofu, arroz y zanahoria|tofu, arroz, zanahoria, aceite de oliva|vegan|20|proteina,cereal,verdura,portable
cena|Crema de lentejas rojas con espinacas|lentejas rojas, espinacas, zanahoria, aceite de oliva|vegan|25|proteina,legumbre,verdura,suave,economico
cena|Pavo a la plancha con calabaza asada|pavo, calabaza, aceite de oliva|omni|25|proteina,verdura,suave
cena|Ensalada templada de patata, garbanzos y espinacas|patata, garbanzos, espinacas, aceite de oliva|vegan|25|proteina,legumbre,tuberculo,verdura
cena|Revuelto de huevo con judías verdes y patata|huevo, judías verdes, patata, aceite de oliva|veg|20|proteina,verdura,tuberculo
cena|Sopa de arroz con pollo y zanahoria|arroz, pollo, zanahoria|omni|25|proteina,cereal,verdura,suave
cena|Berenjena al horno con alubias y tomate|berenjena, alubias, tomate, aceite de oliva|vegan|30|legumbre,verdura,proteina
cena|Trucha a la plancha con boniato y espárragos|trucha, boniato, espárragos, aceite de oliva|fish|25|proteina,tuberculo,verdura
cena|Crema suave de calabacín con huevo cocido|calabacín, patata, huevo, aceite de oliva|veg|20|proteina,verdura,suave
cena|Quinoa salteada con garbanzos y verduras|quinoa, garbanzos, calabacín, zanahoria, aceite de oliva|vegan|20|proteina,legumbre,cereal,verdura
cena|Crema de verduras con tofu desmenuzado|zanahoria, calabaza, tofu, aceite de oliva|vegan|22|proteina,verdura,suave
cena|Tortilla de champiñones y zanahoria al vapor|huevo, champiñones, zanahoria, aceite de oliva|veg|17|proteina,verdura
cena|Pescado blanco con arroz y calabacín|merluza, arroz, calabacín, aceite de oliva|fish|25|proteina,cereal,verdura,suave
cena|Salteado de pavo con verduras y cuscús|pavo, calabacín, zanahoria, cuscús integral|omni|22|proteina,cereal,verdura,portable
cena|Lentejas cocidas con calabacín y arroz|lentejas, arroz, calabacín, aceite de oliva|vegan|20|proteina,legumbre,cereal,verdura,economico
cena|Tostada integral con hummus y huevo cocido|pan integral, garbanzos, huevo, aceite de oliva|veg|12|proteina,legumbre,cereal,rapido
cena|Sopa de fideos de arroz con tofu y verduras|fideos de arroz, tofu, zanahoria, espinacas|vegan|15|proteina,cereal,verdura,rapido,suave
cena|Boniato asado con alubias y brócoli|boniato, alubias, brócoli, aceite de oliva|vegan|28|proteina,legumbre,tuberculo,verdura
cena|Puré de patata y zanahoria con pollo desmenuzado|patata, zanahoria, pollo, aceite de oliva|omni|28|proteina,verdura,tuberculo,suave
cena|Arroz integral con huevo y espinacas|arroz integral, huevo, espinacas, aceite de oliva|veg|22|proteina,cereal,verdura
cena|Ensalada templada de quinoa con tofu|quinoa, tofu, calabacín, aceite de oliva|vegan|22|proteina,cereal,verdura
cena|Merluza al horno con patata y zanahoria|merluza, patata, zanahoria, aceite de oliva|fish|30|proteina,verdura,tuberculo,suave
tentempie|Plátano y nueces|plátano, nueces|vegan|2|fruta,rapido,portable
tentempie|Yogur sin lactosa y pera|yogur sin lactosa, pera|veg|2|fruta,proteina,rapido,portable
tentempie|Manzana y semillas de calabaza|manzana, semillas de calabaza|vegan|2|fruta,rapido,portable
tentempie|Mandarina con tostada integral|mandarina, pan integral|vegan|4|fruta,cereal,rapido,portable
tentempie|Tostada integral con hummus|pan integral, garbanzos, aceite de oliva|vegan|5|proteina,legumbre,cereal,rapido,portable
tentempie|Huevo cocido y tomates cherry|huevo, tomates cherry|veg|8|proteina,verdura,rapido,portable
tentempie|Fruta de temporada y almendras|fruta, almendras|vegan|2|fruta,rapido,portable
tentempie|Yogur de soja con fresas|yogur de soja, fresas|vegan|2|fruta,proteina,rapido,portable
tentempie|Palitos de zanahoria con hummus|zanahoria, garbanzos|vegan|7|proteina,verdura,legumbre,rapido,portable
tentempie|Tostada integral con crema de cacahuete|pan integral, crema de cacahuete|vegan|4|cereal,proteina,rapido,portable
tentempie|Kiwi y pipas de girasol|kiwi, semillas de girasol|vegan|2|fruta,rapido,portable
tentempie|Mini bocadillo integral de pavo y lechuga|pan integral, pavo, lechuga|omni|6|proteina,cereal,verdura,rapido,portable
tentempie|Bol pequeño de fresas con yogur sin lactosa|fresas, yogur sin lactosa|veg|4|fruta,proteina,rapido
tentempie|Pera y galletas de avena caseras|pera, avena, huevo|veg|15|fruta,cereal,proteina,portable
tentempie|Pistachos y mandarina|pistachos, mandarina|vegan|2|fruta,rapido,portable
tentempie|Tostada de maíz con guacamole suave|tortilla de maíz, aguacate|vegan|5|cereal,rapido,portable
tentempie|Hummus con crackers de arroz|garbanzos, crackers de arroz|vegan|5|legumbre,cereal,proteina,rapido,portable
`;
const recipes=DATA.trim().split('\n').filter(Boolean).map((line,i)=>{const [slot,name,ingredients,diet,minutes,tags]=line.split('|');return {id:'r'+String(i+1).padStart(3,'0'),slot,name,ing:ingredients.split(',').map(s=>s.trim()),diet,mins:Number(minutes),tags:tags.split(',').map(s=>s.trim())}});
const GROUPS={
 leche:['leche','yogur','requeson','queso'],huevo:['huevo'],pescado:['merluza','atun','salmon','sardinas','trucha','pescado'],
 gluten:['pan integral','pan de centeno','pasta integral','cuscus','bulgur','avena','muesli'],
 trigo:['pan integral','pan de centeno','pasta integral','cuscus','bulgur','muesli'],
 soja:['soja','tofu'],frutossecos:['nueces','almendras','pistachos'],cacahuete:['cacahuete'],sesamo:['sesamo'], setas:['setas','champiñones'], cebolla:['cebolla'], ajo:['ajo'], tomate:['tomate'], platano:['platano'], avena:['avena'], lentejas:['lentejas'], garbanzos:['garbanzos'],
 crustaceos:['gamba','langostino','camaron'],moluscos:['mejillon','almeja','calamar'],
 };
const ALIAS={lacteos:'leche',lacteo:'leche',lactosa:'lactosa',celiaco:'gluten',celiaquia:'gluten','sin gluten':'gluten',gluten:'gluten',harina:'gluten',pescados:'pescado',marisco:'crustaceos',soya:'soja',nuez:'frutossecos',nueces:'frutossecos','fruto seco':'frutossecos','frutos secos':'frutossecos',mani:'cacahuete',huevos:'huevo'};
const RISK_RX=/(anafil|alergia grave|enfermedad renal|insuficiencia renal|dialisis|embaraz|lactancia|diabetes|insulina|trastorno.*conducta aliment|anorexia|bulimia|tca\b|nutricion enteral|cirugia bariatrica)/;
const tokens=s=>fold(s).split(/[,;\n|]+/).map(s=>s.trim()).filter(Boolean);
function riskFlags(p){const v=fold([p.conditions||'',p.extra||'',p.digestive||'',p.allergies||'',p.intolerances||''].join(' '));const flags=[];
 if(Number(p.age)>0&&Number(p.age)<18)flags.push('menor de edad');
 if(RISK_RX.test(v))flags.push('circunstancias que requieren valoración nutricional profesional');
 if(fold(p.allergies).includes('anafil'))flags.push('antecedente de reacción grave');
 return flags;
}
function groupsFromText(text){const s=fold(text);const found=new Set();
 for(const [k,v] of Object.entries(ALIAS))if(s.includes(k))found.add(v);
 for(const k of Object.keys(GROUPS))if(s.includes(k))found.add(k);
 return found;
}
function ingredientHits(dish,group){const arr=GROUPS[group]||[];return dish.ing.some(ing=>arr.some(w=>fold(ing).includes(w)));}
function allergyGroups(p){return groupsFromText(p.allergies)}
function dishSuitability(dish,p){const diet=fold(p.diet);if(diet==='vegana'&&dish.diet!=='vegan')return false;
 if(diet==='vegetariana'&&['omni','fish'].includes(dish.diet))return false;
 const groups=groupsFromText(p.allergies);for(const grp of groups)if(ingredientHits(dish,grp))return false;
 // Intolerancia: permite productos expresamente sin lactosa; NO permite éstos si es alergia a proteína de leche.
 const intoler=groupsFromText(p.intolerances);const lactose=fold(p.intolerances).includes('lactos');
 if(lactose&&dish.ing.some(x=>ingredientHits({ing:[x]},'leche')&&!fold(x).includes('sin lactosa')))return false;
 for(const grp of intoler)if(grp!=='lactosa'&&ingredientHits(dish,grp))return false;
 if(intoler.has('gluten')&&ingredientHits(dish,'gluten'))return false;
 const dislikes=tokens(p.dislikesfood);const dislikedGroups=groupsFromText(p.dislikesfood+' '+p.triggers);for(const grp of dislikedGroups)if(ingredientHits(dish,grp))return false;
 if(dislikes.some(w=>dish.ing.some(x=>fold(x).includes(w)||w.includes(fold(x))&&fold(x).length>4)))return false;
 // Alergias en lenguaje libre no representadas en el catálogo => no proponer menú como 'seguro'.
 const allergyText=tokens(p.allergies);if(allergyText.length&&groups.size===0)return false;
 return true;
}
function profileHash(p){const s=[p.diet,p.priority,p.experience,p.activity,p.budget,p.cook,p.likesfood,p.dislikesfood,p.meals].map(fold).join('|');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function dateIndex(day){let t=Date.parse(day+'T12:00:00Z');return Number.isFinite(t)?Math.floor(t/86400000):0}
function daysFrom(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function menuSlots(count){return count===3?['desayuno','comida','cena']:count===5?['desayuno','tentempie','comida','tentempie','cena']:['desayuno','comida','tentempie','cena']}
function mealsFor(p,shift){let raw=String(p.meals||'4');if(['3','4','5'].includes(raw))return +raw;return shift==='N'?3:4;}
function shiftStyle(shift){return ['M','A','N','T'].includes(shift)?'work':'free'}
function rank(dish,p,shift,day,slot,history,seed){let score=0;const has=k=>dish.tags.includes(k);const goal=fold((p.priority||'')+' '+(p.goals||''));const pref=tokens(p.likesfood);
 if(shiftStyle(shift)==='work'){if(has('portable'))score+=5;if(has('tandas'))score+=3;if(dish.mins<=20)score+=3}
 if(shift==='N'&&has('suave'))score+=3;
 if(p.cook==='Menos de 15 min'){if(dish.mins>15)score-=30;else score+=5}
 if(p.cook==='15–30 min'&&dish.mins<=30)score+=3;
 if(p.cook==='Cocinar por tandas'&&has('tandas'))score+=5;
 if(p.budget==='Ajustado'&&has('economico'))score+=4;
 if((goal.includes('fuerza')||goal.includes('muscul'))&&has('proteina'))score+=3;
 if((goal.includes('peso')||goal.includes('grasa'))&&has('verdura')&&has('proteina'))score+=2;
 if(goal.includes('energia')&&has('cereal')&&has('proteina'))score+=2;
 if(pref.some(t=>dish.ing.some(x=>fold(x).includes(t))))score+=3;
 if((Array.isArray(p.digestive)?p.digestive:[]).some(x=>fold(x).includes('reflujo'))||fold(p.digestive).includes('reflujo')){if(dish.ing.some(x=>['tomate','curry','pimiento'].some(t=>fold(x).includes(t))))score-=4;if(has('suave'))score+=4}
 for(const h of history){if(h.id===dish.id)score-=h.daysAgo<=2?20:10;if(h.slot===slot&&h.tags.some(tag=>dish.tags.includes(tag)&&['legumbre','cereal','tuberculo'].includes(tag)))score-=1}
 let hash=2166136261;let s=dish.id+'|'+day+'|'+seed;for(let i=0;i<s.length;i++){hash^=s.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return score+(hash>>>0)%170/100;
}
function planWeek(p,weekStart,shiftOf,swaps={}){
 const seed=profileHash(p)^((Number(p.seed)||1)>>>0),days=[],history=[];
 for(let i=0;i<7;i++){
  const date=daysFrom(weekStart,i),shift=shiftOf(date),slots=menuSlots(mealsFor(p,shift));const menu=[],todayUsed=new Set();
  slots.forEach((slot,j)=>{
   let pool=recipes.filter(x=>x.slot===slot&&dishSuitability(x,p));
   // Filtro de rapidez orientativo; si no queda ningún plato, no forzar opciones incompatibles.
   if(p.cook==='Menos de 15 min')pool=pool.filter(x=>x.mins<=15);
   if(pool.length){const noRepeat=pool.filter(x=>!todayUsed.has(x.id));if(noRepeat.length)pool=noRepeat}
   const scored=pool.map(dish=>({dish,score:rank(dish,p,shift,date,slot,history,seed)})).sort((a,b)=>b.score-a.score);
   const key=date+':'+j;let override=swaps[key];let dish=null;
   if(override){dish=scored.find(x=>x.dish.id===override)?.dish||null}
   if(!dish&&scored.length){const sample=scored.filter(x=>x.score>=scored[0].score-2).slice(0,8);const idx=(Math.abs(dateIndex(date)*23+j*59+seed)>>>0)%sample.length;dish=sample[idx].dish}
   if(dish){todayUsed.add(dish.id);history.push({...dish,daysAgo:0});}
   menu.push({slot,label:slot==='tentempie'?'Tentempié':slot==='desayuno'?'Desayuno':slot==='comida'?'Comida':'Cena',dish,index:j});
  });
  days.push({date,shift,menu});history.forEach(x=>x.daysAgo++);while(history.length>35)history.shift();
 }
 return days;
}
function replaceOptions(p,date,slot,exclude,shift){return recipes.filter(d=>d.slot===slot&&d.id!==exclude&&dishSuitability(d,p)&&!(p.cook==='Menos de 15 min'&&d.mins>15)).sort((a,b)=>rank(b,p,shift,date,slot,[],0)-rank(a,p,shift,date,slot,[],0));}
function warnings(p){const notes=[];const flags=riskFlags(p);
 if(flags.length)notes.push('Circunstancias especiales ('+flags.join(', ')+'): estas propuestas son generales y no sustituyen una pauta individual de dietista-nutricionista o equipo sanitario.');
 if(String(p.allergies||'').trim())notes.push('ALERGIAS: comprueba etiquetas, ingredientes ocultos y contaminación cruzada; la aplicación no certifica que un plato sea seguro.');
 if(groupsFromText(p.allergies).size===0&&String(p.allergies||'').trim())notes.push('Alergia no reconocida automáticamente: no se generan platos hasta revisar las preferencias.');
 if(fold(p.intolerances).includes('celia')||fold(p.intolerances).includes('gluten'))notes.push('Con celiaquía, exige productos certificados, utensilios y elaboración sin contaminación cruzada.');
 if(fold(p.diet)==='vegana')notes.push('En alimentación vegana, la vitamina B12 precisa suplementación adecuada y puede ser necesario revisar otros nutrientes con un profesional.');
 if(p.triggers&&fold(p.triggers).includes('picante'))notes.push('Si indicas picante como desencadenante, revisa condimentos comerciales y no asumas que un plato es inocuo.');
 if(!p.diet)notes.push('Indica el tipo de alimentación en Actualizar plan para adaptar mejor las propuestas.');
 if(String(p.triggers||'').trim())notes.push('La lista de desencadenantes digestivos debe revisarse: no todos los ingredientes se detectan en el texto libre.');
 return notes;
}
root.NUTRI={recipes,fold,allergyGroups,dishSuitability,planWeek,replaceOptions,warnings,profileHash,daysFrom,mealsFor};
})(typeof window!=='undefined'?window:globalThis);
