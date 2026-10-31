/* test23 — v1.15.0
   Guardado optimista · Vacaciones · Gina fuera de gastos · atajos por hueco
   · combos · buscador · y un test de contrato de los helpers batcheados. */
const fs=require('fs');const vm=require('vm');const {JSDOM}=require('jsdom');
const HOY='2026-07-25';
const AYER='2026-07-24';
const D=n=>{const d=new Date(2026,6,25);d.setDate(d.getDate()-n);
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

const CAT=[
 {id:'c1',nombre:'Lentejas',categoria:'plato',ingredientes:'',kcal:600,proteinas_g:30,
  carbohidratos_g:60,grasas_g:15,fibra_g:12,grupos:'legumbres',creado_por:'nico',veces_usado:4,activo:true},
 {id:'c2',nombre:'Café con leche',categoria:'bebida',ingredientes:'',kcal:90,proteinas_g:5,
  carbohidratos_g:8,grasas_g:4,fibra_g:0,grupos:'',creado_por:'nico',veces_usado:9,activo:true},
 {id:'c3',nombre:'Galletas',categoria:'snack',ingredientes:'',kcal:180,proteinas_g:3,
  carbohidratos_g:26,grasas_g:7,fibra_g:1,grupos:'ultraprocesado',creado_por:'nico',veces_usado:7,activo:true}];

/* Un desayuno repetido 3 veces (café + galletas) y una cena una sola vez:
   los atajos deben coger los dos primeros y descartar el de una vez. */
const COM=[];
[1,2,3].forEach(function(k){
  COM.push({id:'r'+k+'a',grupo_id:'g'+k,username:'nico',fecha:D(k),hora:'08:30',tipo_comida:'desayuno',
    categoria:'bebida',nombre:'Café con leche',kcal:90,proteinas_g:5,carbohidratos_g:8,grasas_g:4,
    fibra_g:0,grupos:'',catalogo_id:'c2',lugar:''});
  COM.push({id:'r'+k+'b',grupo_id:'g'+k,username:'nico',fecha:D(k),hora:'08:30',tipo_comida:'desayuno',
    categoria:'snack',nombre:'Galletas',kcal:180,proteinas_g:3,carbohidratos_g:26,grasas_g:7,
    fibra_g:1,grupos:'ultraprocesado',catalogo_id:'c3',lugar:''});
});
COM.push({id:'rx',grupo_id:'gx',username:'nico',fecha:D(2),hora:'21:00',tipo_comida:'cena',
  categoria:'plato',nombre:'Tortilla suelta',kcal:400,proteinas_g:20,carbohidratos_g:5,grasas_g:28,
  fibra_g:1,grupos:'',catalogo_id:'',lugar:''});
/* Dos días de la ventana con comida, para que el semanal exista */
COM.push({id:'rh',grupo_id:'gh',username:'nico',fecha:HOY,hora:'13:30',tipo_comida:'comida',
  categoria:'plato',nombre:'Lentejas',kcal:600,proteinas_g:30,carbohidratos_g:60,grasas_g:15,
  fibra_g:12,grupos:'legumbres',catalogo_id:'c1',lugar:''});

const BOOT={ok:true,data:{hoy:HOY,
 usuarios:[{username:'nico',nombre:'Nico',color:'#2E8B57'},
           {username:'ana',nombre:'Ana',color:'#5B8DEF'},
           {username:'gina',nombre:'Gina',color:'#F5A623',en_gastos:false}],
 objetivos:[{username:'nico',tipo_dia:'normal',kcal:2000,proteinas_g:140,carbohidratos_g:200,grasas_g:65,fibra_g:30},
            {username:'nico',tipo_dia:'entreno',kcal:2400,proteinas_g:160,carbohidratos_g:260,grasas_g:70,fibra_g:32}],
 objetivos_grupos:[{username:'nico',grupo:'verduras',objetivo:14,margen:0,peso:20},
                   {username:'nico',grupo:'legumbres',objetivo:3,margen:0,peso:10}],
 lugares:[],equipamiento:[],medidas:[],tags:[{id:'restaurante',nombre:'Restaurante',icono:'🍽️',activo:true}],
 /* gasto histórico con gina dentro: dinero que no debe evaporarse */
 gastos:[{id:'x1',fecha:D(1),tag:'restaurante',descripcion:'Menú',importe:30,
          pagado_por:'nico',participantes:'nico,ana,gina',comida_grupo_id:'',creado_por:'nico'}],
 dias:[{username:'nico',fecha:D(2),tipos:'vacaciones',dia_entreno:false,nota:''}],
 catalogo:CAT,comidas:COM,grupos:[],
 categorias:['plato','bebida','fruta','acompanante','postre','snack','comprada']}};

let posts=[],gets=[],fallar=null;
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{runScripts:'dangerously',url:'https://x.test/',
 pretendToBeVisual:true,
 beforeParse(w){
  w.fetch=(u,o)=>{
   let ACT='',body=null;
   if(o&&o.method==='POST'){ try{body=JSON.parse(o.body);posts.push(body);ACT=body.action||'';}catch(e){} }
   else { gets.push(decodeURIComponent((String(u).match(/action=([^&]+)/)||[,''])[1])); }
   if(ACT&&ACT===fallar)
     return Promise.resolve({status:200,text:()=>Promise.resolve(JSON.stringify({ok:false,error:'el Sheet dijo no'}))});
   let r={ok:true,data:{}};
   if(!ACT) r=BOOT;
   else if(ACT==='saveComidaGrupo'){
     /* El backend devuelve las filas escritas. Aquí se devuelven con el nombre
        en mayúsculas para poder comprobar que el frontend se queda con LAS
        SUYAS y no con las que pintó de forma optimista. */
     const p=body.payload||{};
     r={ok:true,data:{grupo_id:p.grupo_id,filas:(p.items||[]).length,
       rows:(p.items||[]).map((it,i)=>({id:'srv'+i,grupo_id:p.grupo_id,username:p.username,
         fecha:p.fecha,hora:p.hora,tipo_comida:p.tipo_comida,categoria:it.categoria,
         nombre:String(it.nombre).toUpperCase(),ingredientes:'',porcion:'',kcal:it.kcal,
         proteinas_g:it.proteinas_g,carbohidratos_g:it.carbohidratos_g,grasas_g:it.grasas_g,
         fibra_g:it.fibra_g,grupos:it.grupos||'',catalogo_id:it.catalogo_id||'',lugar:p.lugar||''})),
       gasto:null}};
   }
   else if(ACT==='saveCatalogo'){
     const p=body.payload||{};
     /* El backend hace obj.id = obj.id || getUuid(), así que el id nunca llega
        vacío. El payload trae id:'' al crear, por eso va ANTES. */
     r={ok:true,data:Object.assign({veces_usado:0,activo:true},p,{id:p.id||'cNuevo'})};
   }
   return Promise.resolve({status:200,text:()=>Promise.resolve(JSON.stringify(r))});};
  w.scrollTo=()=>{};w.confirm=()=>true;
  Object.defineProperty(w.navigator,'serviceWorker',{value:undefined,configurable:true});
  w.localStorage.setItem('gosari_user','nico');}});

const w=dom.window,d=w.document;
const click=el=>el.dispatchEvent(new w.Event('click',{bubbles:true}));
const POST=a=>posts.filter(x=>x.action===a).pop();
const A=[];const ok=(n,c,x='')=>A.push([!!c,n,c?'':String(x)]);
const T=s=>{const e=d.querySelector(s);return e?e.textContent.trim():'(null)';};
const espera=ms=>new Promise(r=>setTimeout(r,ms));

setTimeout(async()=>{

 /* ================= 1. VACACIONES ================= */
 ok('el toggle de vacaciones existe', !!d.querySelector('[data-tipodia="vacaciones"]'),
    [...d.querySelectorAll('[data-tipodia]')].map(e=>e.dataset.tipodia).join());
 ok('sale sin fila en Objetivos', w.tiposDia().includes('vacaciones'), w.tiposDia().join());
 ok('va al final de la lista', w.tiposDia()[w.tiposDia().length-1]==='vacaciones', w.tiposDia().join());
 ok('detecta el día marcado', w.esVacaciones(D(2))===true);
 ok('y no marca los demás', w.esVacaciones(D(1))===false);

 /* El objetivo NO puede salir de un tipo que no tiene fila en Objetivos:
    si 'vacaciones' ganara el bucle, el objetivo sería 0 kcal. */
 ok('vacaciones no fija objetivos', w.num(w.objetivoDe(D(2)).kcal)===2000, w.objetivoDe(D(2)).kcal);

 ok('el día de viaje no puntúa', w.scoreDiario(D(2))===null, w.scoreDiario(D(2)));
 ok('un día normal sí', typeof w.scoreDiario(D(1))==='number', w.scoreDiario(D(1)));

 /* La ventana se estira hacia atrás: 7 días reales, nunca el de viaje */
 const v7=w.ventana7();
 ok('la ventana tiene 7 días', v7.length===7, v7.length);
 ok('sin el día de vacaciones', !v7.includes(D(2)), v7.join());
 ok('y se estira un día más atrás', v7.includes(D(7)), v7.join());
 ok('en orden cronológico', v7.join()===v7.slice().sort().join(), v7.join());

 /* Las raciones no cuentan lo comido de viaje */
 ok('las raciones ignoran el viaje', w.racionesGrupo('ultraprocesado',[D(2)])===0);
 ok('pero cuentan fuera de él', w.racionesGrupo('ultraprocesado',[D(1)])===1,
    w.racionesGrupo('ultraprocesado',[D(1)]));

 /* En pantalla: ni número, ni juicio, ni consejos */
 w.state.diaVer=D(2); w.render();
 ok('el score del día sale vacío', T('#scoreNum')==='–', T('#scoreNum'));
 ok('el mensaje habla de vacaciones', T('#scoreMsg').toLowerCase().includes('vacaciones'), T('#scoreMsg'));
 ok('no se le juzga nada', d.querySelectorAll('#fact .fact-c').length===0,
    d.querySelectorAll('#fact .fact-c').length);
 ok('sin palabras de culpa', !/compens|recuper|retoma|mal |fatal/i.test(T('#scoreMsg')), T('#scoreMsg'));
 ok('el mensaje es estable el mismo día', w.mensajeVacaciones(D(2)).t===w.mensajeVacaciones(D(2)).t);
 ok('y cambia de un día a otro',
    w.mensajeVacaciones('2026-07-01').t!==w.mensajeVacaciones('2026-07-02').t);
 w.state.diaVer=HOY; w.render();

 /* El semanal sigue existiendo y no se hunde por el día fuera */
 ok('el semanal se calcula', w.scoreSemanal()!==null);

 /* ================= 2. GINA FUERA DE GASTOS ================= */
 const g=BOOT.data.gastos[0];
 ok('gina no entra en el reparto', w.partesDe(g).join()==='nico,ana', w.partesDe(g).join());
 ok('el dinero se reparte entre 2', (30/w.partesDe(g).length)===15, 30/w.partesDe(g).length);
 ok('no aparece en los usuarios de gastos',
    !w.usuariosGastos().some(u=>u.username==='gina'),
    w.usuariosGastos().map(u=>u.username).join());
 ok('si solo queda ella, se queda quien pagó',
    w.partesDe({participantes:'gina',pagado_por:'nico'}).join()==='nico',
    w.partesDe({participantes:'gina',pagado_por:'nico'}).join());
 ok('y si ni eso, nadie', w.partesDe({participantes:'gina',pagado_por:'gina'}).length===0);

 /* Y no puede ni registrar un gasto desde el formulario */
 click(d.querySelector('#btnAdd'));
 ok('a nico sí se le ofrece el gasto', d.querySelector('#fuera').style.display!=='none');
 w.state.user='gina'; w.renderFuera();
 ok('a gina no', d.querySelector('#fuera').style.display==='none');
 ok('y el borrador queda sin gasto', w.draft.fuera===false&&w.draft.gasto==='');
 ok('tampoco lo generaría el backend local',
    w.gastoLocal({username:'gina',fuera_de_casa:true,gasto:20,items:[]},'gz')===null);
 w.state.user='nico';

 /* ================= 3. ATAJOS POR HUECO ================= */
 click(d.querySelector('[data-nav="s-home"]'));
 click(d.querySelector('#btnAdd'));
 w.draft.tipo_comida='desayuno'; w.draft.items=[]; w.renderAdd();
 const atj=[...d.querySelectorAll('#atajosR .atj')];
 ok('salen los atajos del desayuno', atj.length===2, atj.length);
 ok('visibles', d.querySelector('#atajos').style.display!=='none');
 ok('ordenados por repetición', atj[0].textContent.includes('Café con leche'), atj[0].textContent);
 ok('dicen cuántas veces', /3 veces/.test(atj[0].textContent), atj[0].textContent);
 ok('el título nombra el hueco', T('#atajosT').toLowerCase().includes('desayuno'), T('#atajosT'));

 /* Lo de una sola vez no es un hábito */
 w.draft.tipo_comida='cena'; w.renderAdd();
 ok('una sola vez no genera atajo', d.querySelector('#atajos').style.display==='none',
    d.querySelectorAll('#atajosR .atj').length);

 w.draft.tipo_comida='desayuno'; w.renderAdd();
 click(d.querySelector('#atajosR .atj'));
 ok('un toque lo añade', w.draft.items.length===1, w.draft.items.length);
 ok('con sus macros', w.draft.items[0].kcal===90, w.draft.items[0].kcal);
 ok('y su catalogo_id', w.draft.items[0].catalogo_id==='c2', w.draft.items[0].catalogo_id);
 ok('no se puede añadir dos veces', d.querySelector('#atajosR .atj').disabled===true);
 ok('el otro sigue disponible', [...d.querySelectorAll('#atajosR .atj')][1].disabled===false);

 /* ================= 4. COMBOS ================= */
 ok('con un ítem no hay combo', d.querySelector('#btnCombo').style.display==='none');
 click([...d.querySelectorAll('#atajosR .atj')][1]);
 ok('con dos sí', d.querySelector('#btnCombo').style.display==='block');
 const cb=w.comboDeDraft();
 ok('suma las kcal', cb.kcal===270, cb.kcal);
 ok('suma la proteína', cb.proteinas_g===8, cb.proteinas_g);
 ok('une los grupos', cb.grupos==='ultraprocesado', cb.grupos);
 ok('propone un nombre', cb.nombre==='Café con leche + Galletas', cb.nombre);
 ok('el botón lo adelanta', T('#btnComboD').includes('Café'), T('#btnComboD'));

 click(d.querySelector('#btnCombo'));
 ok('abre el formulario de siempre', d.querySelector('#shForm').classList.contains('on'));
 ok('en modo catálogo', w.form.modo==='catalogo', w.form.modo);
 ok('con el nombre editable', d.querySelector('#fNombre').value==='Café con leche + Galletas',
    d.querySelector('#fNombre').value);
 ok('y las kcal sumadas', String(d.querySelector('#fKcal').value)==='270',
    d.querySelector('#fKcal').value);
 d.querySelector('#fNombre').value='Desayuno de siempre';
 const nCat=w.state.data.catalogo.length;
 click(d.querySelector('#fOk'));
 await espera(120);
 const pc=POST('saveCatalogo');
 ok('se guarda en el catálogo', !!pc&&pc.payload.nombre==='Desayuno de siempre',
    pc&&pc.payload.nombre);
 ok('como plato', pc&&pc.payload.categoria==='plato', pc&&pc.payload.categoria);
 ok('entra en local sin recargar', w.state.data.catalogo.length===nCat+1,
    nCat+' → '+w.state.data.catalogo.length);
 /* El bootstrap va por GET, así que `posts` no lo vería: hay que contar gets. */
 ok('y no se pidió un bootstrap', gets.filter(a=>a==='getBootstrap').length===1,
    gets.filter(a=>a==='getBootstrap').length+' (solo el del arranque)');

 /* ================= 5. GUARDADO OPTIMISTA ================= */
 click(d.querySelector('[data-nav="s-home"]'));
 click(d.querySelector('#btnAdd'));
 w.draft.tipo_comida='comida'; w.draft.hora='13:45';
 w.draft.items=[{nombre:'Lentejas',categoria:'plato',kcal:600,proteinas_g:30,
   carbohidratos_g:60,grasas_g:15,fibra_g:12,grupos:'legumbres',catalogo_id:'c1'}];
 w.renderAdd();
 const antes=w.state.data.comidas.length;
 click(d.querySelector('#btnGuardar'));

 ok('vuelve a la home sin esperar', d.querySelector('#s-home').classList.contains('on'));
 ok('sin pantalla de espera', !d.querySelector('#busy').classList.contains('on'));
 ok('la fila ya está en local', w.state.data.comidas.length===antes+1,
    antes+' → '+w.state.data.comidas.length);
 const nueva=w.state.data.comidas[w.state.data.comidas.length-1];
 ok('con la hora normalizada', nueva.hora==='13:45', nueva.hora);
 ok('con grupo_id propio', !!nueva.grupo_id&&nueva.grupo_id.length>=16, nueva.grupo_id);
 ok('el id no lleva pinta de temporal', !/^tmp/.test(nueva.grupo_id), nueva.grupo_id);
 ok('y se ve en la lista del día', T('#meals').includes('Lentejas'));

 await espera(150);
 const ps=POST('saveComidaGrupo');
 ok('la petición salió', !!ps);
 ok('con el mismo grupo_id', ps.payload.grupo_id===nueva.grupo_id, ps.payload.grupo_id);
 ok('mandan las filas del backend', w.state.data.comidas.some(c=>c.nombre==='LENTEJAS'),
    w.state.data.comidas.map(c=>c.nombre).slice(-2).join());
 ok('sin duplicar la comida', w.state.data.comidas.filter(c=>c.grupo_id===nueva.grupo_id).length===1,
    w.state.data.comidas.filter(c=>c.grupo_id===nueva.grupo_id).length);
 ok('y sin recargar todo', gets.filter(a=>a==='getBootstrap').length===1,
    gets.filter(a=>a==='getBootstrap').length+' bootstraps');

 /* ---- si falla, se deshace y te devuelve el formulario ---- */
 fallar='saveComidaGrupo';
 click(d.querySelector('#btnAdd'));
 w.draft.tipo_comida='cena'; w.draft.hora='21:30';
 w.draft.items=[{nombre:'Pescado al horno',categoria:'plato',kcal:450,proteinas_g:40,
   carbohidratos_g:10,grasas_g:18,fibra_g:2,grupos:'pescado',catalogo_id:''}];
 w.renderAdd();
 const antes2=w.state.data.comidas.length;
 click(d.querySelector('#btnGuardar'));
 ok('se pinta igualmente al momento', w.state.data.comidas.length===antes2+1);
 await espera(400);
 ok('al fallar se deshace', w.state.data.comidas.length===antes2,
    antes2+' → '+w.state.data.comidas.length);
 ok('no queda rastro de la comida', !w.state.data.comidas.some(c=>c.nombre==='Pescado al horno'));
 ok('te devuelve al formulario', d.querySelector('#s-add').classList.contains('on'));
 ok('con el borrador intacto', w.draft.items.length===1&&w.draft.items[0].nombre==='Pescado al horno',
    JSON.stringify(w.draft.items.map(i=>i.nombre)));
 ok('y la hora que habías puesto', w.draft.hora==='21:30', w.draft.hora);
 ok('el botón vuelve a estar activo', d.querySelector('#btnGuardar').disabled===false);
 ok('y avisa de lo que pasó', T('#toast').toLowerCase().includes('no se guardó'), T('#toast'));
 fallar=null;

 /* ================= 6. BUSCADOR ================= */
 click(d.querySelector('#btnBuscar'));
 const cuerpo=d.querySelector('#shPick .sheet-b');
 cuerpo.scrollTop=400;
 w.pick.q='lent'; w.renderPickRes();
 ok('al filtrar vuelve arriba', cuerpo.scrollTop===0, cuerpo.scrollTop);
 ok('y filtra de verdad', d.querySelectorAll('#pickRes .res').length===1,
    d.querySelectorAll('#pickRes .res').length);
 w.pick.q=''; w.renderPickRes();
 ok('sin texto los lista todos', d.querySelectorAll('#pickRes .res').length>=1);
 const css=fs.readFileSync('index.html','utf8');
 ok('el sheet usa dvh con el teclado', /max-height:\s*88dvh/.test(css));

 /* ================= 7. CONTRATO CON EL BACKEND ================= */
 contrato();

 console.log(A.map(([p,n,x])=>`${p?'✓':'✗'} ${n}${x?'  → '+x:''}`).join('\n'));
 console.log('\n'+A.filter(a=>a[0]).length+'/'+A.length+' OK');
 process.exit(A.some(a=>!a[0])?1:0);
},500);

/* ───────────────────────────────────────────────────────────────
   Code.gs de verdad contra un Sheet simulado que CUENTA LLAMADAS.
   Es la única forma de demostrar que el guardado dejó de ser lento:
   el tiempo se iba en viajes al Sheet, no en la red.
   ─────────────────────────────────────────────────────────────── */
let LLAMADAS=0;
function hoja(headers){
 const rows=[headers.slice()];
 const sh={
  getSheetName:()=>sh._n,
  getLastRow:()=>rows.length,
  getLastColumn:()=>rows[0].length,
  getMaxRows:()=>Math.max(rows.length,100),
  setFrozenRows:()=>sh,
  appendRow:r=>{LLAMADAS++;rows.push(r.slice());return sh;},
  deleteRow:i=>{LLAMADAS++;rows.splice(i-1,1);return sh;},
  deleteRows:(i,n)=>{LLAMADAS++;rows.splice(i-1,n);return sh;},
  getDataRange:()=>({getValues:()=>{LLAMADAS++;return rows.map(r=>r.slice());}}),
  getRange:(r,c,nr,nc)=>({
   getValues:()=>{LLAMADAS++;const out=[];
    for(let i=0;i<(nr||1);i++){const f=rows[r-1+i]||[],t=[];
     for(let j=0;j<(nc||1);j++)t.push(f[c-1+j]===undefined?'':f[c-1+j]);out.push(t);}
    return out;},
   getValue:()=>{LLAMADAS++;return (rows[r-1]||[])[c-1];},
   setValues:v=>{LLAMADAS++;v.forEach((f,i)=>{if(!rows[r-1+i])rows[r-1+i]=[];
     f.forEach((x,j)=>{rows[r-1+i][c-1+j]=x;});});return sh;},
   setValue:v=>{LLAMADAS++;if(!rows[r-1])rows[r-1]=[];rows[r-1][c-1]=v;return sh;},
   setFontWeight:()=>sh,setNumberFormat:()=>sh}),
  _rows:rows};
 return sh;
}

function contrato(){
 const H={
  Usuarios:['username','nombre','avatar','color','frase','objetivo','nacimiento','ciudad','en_gastos','restricciones'],
  Catalogo_Comidas:['id','nombre','categoria','ingredientes','porcion','kcal','proteinas_g',
                    'carbohidratos_g','grasas_g','fibra_g','grupos','imagen','veces_usado','activo','creado_por'],
  /* A propósito en otro orden que HEADERS: si algo escribe por posición, salta */
  Comidas_Registradas:['id','username','fecha','grupo_id','nombre','hora','kcal','tipo_comida',
                       'categoria','ingredientes','porcion','proteinas_g','carbohidratos_g','grasas_g',
                       'fibra_g','grupos','catalogo_id','lugar','fuera_de_casa','gasto','pagado_por','timestamp'],
  Gastos:['id','fecha','tag','descripcion','importe','pagado_por','participantes',
          'comida_grupo_id','creado_por','timestamp'],
  Dias:['username','fecha','dia_entreno','tipos','nota']};
 const hojas={};
 Object.keys(H).forEach(k=>{hojas[k]=hoja(H[k]);hojas[k]._n=k;});
 hojas.Usuarios._rows.push(['nico','Nico','','#2E8B57','','','','','',''] );
 hojas.Usuarios._rows.push(['gina','Gina','','#F5A623','','','','',false,'']);
 /* 400 filas de catálogo: con el código viejo, cada ítem releía las 400 */
 for(let i=0;i<400;i++) hojas.Catalogo_Comidas._rows.push(
   ['cat'+i,'Comida '+i,'plato','','',300,20,30,10,5,'','',0,true,'nico']);
 hojas.Catalogo_Comidas._rows.push(['c1','Lentejas','plato','','',600,30,60,15,12,'legumbres','',4,true,'nico']);

 const ctx={console,
  SpreadsheetApp:(()=>{const ss={getSpreadsheetTimeZone:()=>'Europe/Madrid',
   getSheetByName:n=>hojas[n]||null,insertSheet:n=>{hojas[n]=hoja([]);hojas[n]._n=n;return hojas[n];},
   deleteSheet:()=>{}};
   return {openById:()=>ss,getActiveSpreadsheet:()=>ss};})(),
  ContentService:{MimeType:{JSON:'json'},
   createTextOutput:t=>({setMimeType:()=>({getContent:()=>t})})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>null,setProperty(){}})},
  UrlFetchApp:{fetch:()=>{throw new Error('sin red');}},
  Logger:{log:()=>{}},
  Utilities:{getUuid:()=>'u'+Math.random().toString(36).slice(2,14),
   formatDate:(dt,tz,f)=>{const p=x=>String(x).padStart(2,'0');
    if(f==='HH:mm')return p(dt.getHours())+':'+p(dt.getMinutes());
    const b=dt.getFullYear()+'-'+p(dt.getMonth()+1)+'-'+p(dt.getDate());
    return f.indexOf('HH')>0?b+' '+p(dt.getHours())+':'+p(dt.getMinutes())+':'+p(dt.getSeconds()):b;}}};
 ctx.globalThis=ctx;
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('Code.gs','utf8'),ctx);
 const llamar=b=>JSON.parse(ctx._despachar(b).getContent());

 /* El POST real que mandó el frontend hace un momento */
 const real=posts.filter(x=>x.action==='saveComidaGrupo')[0];
 LLAMADAS=0;
 const r1=llamar(real);
 const coste1=LLAMADAS;
 ok('CONTRATO: el backend acepta el POST del frontend', r1.ok===true, r1.error);
 ok('CONTRATO: devuelve las filas escritas', Array.isArray(r1.data.rows)&&r1.data.rows.length===1,
    JSON.stringify(r1.data&&r1.data.rows&&r1.data.rows.length));

 const fil=hojas.Comidas_Registradas._rows, hh=fil[0], f1=fil[1];
 const V=k=>f1[hh.indexOf(k)];
 ok('CONTRATO: username en su columna', V('username')==='nico', V('username'));
 ok('CONTRATO: nombre en su columna', V('nombre')==='Lentejas', V('nombre'));
 ok('CONTRATO: hora como texto', V('hora')==='13:45', V('hora'));
 ok('CONTRATO: kcal numérico', V('kcal')===600, V('kcal'));

 /* 3 ítems no deben costar 3 veces más que 1: eso era el bug de lentitud */
 const tres=JSON.parse(JSON.stringify(real));
 tres.payload.grupo_id='';
 tres.payload.items=[0,1,2].map(i=>Object.assign({},real.payload.items[0],
   {nombre:'It'+i,catalogo_id:'cat'+i}));
 LLAMADAS=0;
 const r3=llamar(tres);
 const coste3=LLAMADAS;
 ok('CONTRATO: guarda los 3 ítems', r3.ok===true&&r3.data.filas===3, r3.error||r3.data.filas);
 ok('CONTRATO: 3 ítems cuestan como 1 (±3 llamadas)', Math.abs(coste3-coste1)<=3,
    coste1+' vs '+coste3+' llamadas');
 ok('CONTRATO: y son pocas en total', coste3<=14, coste3+' llamadas');

 /* Los usos se suman en bloque, no uno por uno */
 const cat=hojas.Catalogo_Comidas._rows, ch=cat[0];
 const usoDe=id=>{const f=cat.find(r=>r[ch.indexOf('id')]===id);return f?f[ch.indexOf('veces_usado')]:null;};
 ok('CONTRATO: suma los usos de cada ítem', usoDe('cat0')===1&&usoDe('cat2')===1,
    usoDe('cat0')+','+usoDe('cat2'));
 ok('CONTRATO: y no toca los demás', usoDe('cat5')===0, usoDe('cat5'));

 /* Reescribir el mismo grupo reemplaza, con las filas contiguas en un borrado */
 const n3=hojas.Comidas_Registradas._rows.length;
 llamar({action:'saveComidaGrupo',payload:Object.assign({},tres.payload,{grupo_id:r3.data.grupo_id})});
 ok('CONTRATO: reguardar no duplica', hojas.Comidas_Registradas._rows.length===n3,
    n3+' → '+hojas.Comidas_Registradas._rows.length);

 /* Gastos: gina nunca entra */
 const conGina=Object.assign({},real.payload,{grupo_id:'',fuera_de_casa:true,gasto:30,
   pagado_por:'nico',participantes:'nico,gina',tag_gasto:'restaurante'});
 const rg=llamar({action:'saveComidaGrupo',payload:conGina});
 ok('CONTRATO: crea el gasto', !!rg.data.gasto, JSON.stringify(rg.data.gasto));
 ok('CONTRATO: sin gina en los participantes', rg.data.gasto.participantes==='nico',
    rg.data.gasto.participantes);

 const deGina=Object.assign({},real.payload,{grupo_id:'',username:'gina',fuera_de_casa:true,
   gasto:12,pagado_por:'gina',participantes:'gina'});
 const rg2=llamar({action:'saveComidaGrupo',payload:deGina});
 ok('CONTRATO: gina registra comida', rg2.ok===true, rg2.error);
 ok('CONTRATO: pero no genera gasto', rg2.data.gasto===null, JSON.stringify(rg2.data.gasto));

 /* Vacaciones se guardan como un tipo de día más */
 const rv=llamar({action:'setDiaEntreno',username:'nico',fecha:'2026-07-23',
   tipos:'vacaciones',dia_entreno:false});
 ok('CONTRATO: guarda el día de vacaciones', rv.ok===true, rv.error);
 const dd=hojas.Dias._rows, dh=dd[0];
 ok('CONTRATO: en la columna tipos', dd[1][dh.indexOf('tipos')]==='vacaciones',
    dd[1]&&dd[1][dh.indexOf('tipos')]);

 /* La semilla de equipamiento va por nombre de cabecera, no por posición */
 hojas.Equipamiento=hoja(['username','nombre','id','icono','activo','orden']);  // orden distinto
 hojas.Equipamiento._n='Equipamiento';
 /* SEED es un const del script: no queda en el contexto como propiedad,
    así que hay que evaluar la expresión dentro del propio contexto. */
 const SEED=vm.runInContext('SEED',ctx);
 SEED.Equipamiento.forEach(r=>ctx._append(hojas.Equipamiento,r));
 const eq=hojas.Equipamiento._rows, eh=eq[0];
 ok('CONTRATO: airfryer en su columna', eq[1][eh.indexOf('nombre')]==='Airfryer',
    eq[1][eh.indexOf('nombre')]);
 ok('CONTRATO: minipimer también', eq[2][eh.indexOf('nombre')]==='Minipimer',
    eq[2][eh.indexOf('nombre')]);
 ok('CONTRATO: y su id donde toca', eq[1][eh.indexOf('id')]==='airfryer', eq[1][eh.indexOf('id')]);
}
