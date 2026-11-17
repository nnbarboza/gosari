/* test24 — v1.16.0
   TU SALUD (episodios, niveles, medicamentos, optimista, sin tocar el score)
   + hora automática por hueco. Con contrato contra el Code.gs real. */
const fs=require('fs');const vm=require('vm');const {JSDOM}=require('jsdom');
const HOY='2026-11-16';
const AYER='2026-11-15';

const BOOT={ok:true,data:{hoy:HOY,
 usuarios:[{username:'nico',nombre:'Nico',color:'#2E8B57'},
           {username:'gina',nombre:'Gina',color:'#F5A623',en_gastos:false}],
 objetivos:[{username:'nico',tipo_dia:'normal',kcal:2000,proteinas_g:140,
             carbohidratos_g:200,grasas_g:65,fibra_g:30}],
 objetivos_grupos:[],lugares:[],equipamiento:[],medidas:[],gastos:[],tags:[],dias:[],
 medicamentos:[{username:'nico',id:'almax',nombre:'Almax',icono:'🥛',orden:1,activo:true},
               {username:'nico',id:'omeprazol',nombre:'Omeprazol',icono:'💊',orden:2,activo:true},
               {username:'gina',id:'apiretal',nombre:'Apiretal',icono:'🍼',orden:1,activo:true}],
 salud:[{id:'sm',username:'nico',fecha:AYER,hora:'23:50',tipo:'medicacion',deposiciones:'',
         dolor:'',hinchazon:'',vomitos:'',estrenimiento:'',comentario:'',medicamentos:'Melatonina'},
        /* s1 y s2 SIN columna tipo a propósito: las filas anteriores a esta
           versión tienen que seguir contando como episodio. */
        {id:'s1',username:'nico',fecha:AYER,hora:'22:10',deposiciones:'',dolor:'media',
         hinchazon:'alta',vomitos:'',estrenimiento:'',comentario:'Después de la pizza',
         medicamentos:'Almax,infusión de menta'},
        {id:'s2',username:'nico',fecha:'2026-11-01',hora:'09:00',deposiciones:'alta',
         dolor:'',hinchazon:'',vomitos:'',estrenimiento:'',comentario:'',medicamentos:''},
        {id:'s0',username:'gina',fecha:AYER,hora:'18:00',deposiciones:'',dolor:'baja',
         hinchazon:'',vomitos:'',estrenimiento:'',comentario:'de la niña',medicamentos:''}],
 catalogo:[{id:'c1',nombre:'Lentejas',categoria:'plato',ingredientes:'',kcal:600,proteinas_g:30,
            carbohidratos_g:60,grasas_g:15,fibra_g:12,grupos:'legumbres',creado_por:'nico',
            veces_usado:3,activo:true}],
 comidas:[{id:'r1',grupo_id:'g1',username:'nico',fecha:HOY,hora:'08:00',tipo_comida:'desayuno',
           categoria:'plato',nombre:'Tostadas',kcal:300,proteinas_g:10,carbohidratos_g:40,
           grasas_g:9,fibra_g:4,grupos:'',catalogo_id:'',lugar:''}],
 grupos:[],categorias:['plato','bebida','fruta','acompanante','postre','snack','comprada']}};

let posts=[],gets=[],fallar=null;
const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{runScripts:'dangerously',
 url:'https://x.test/',pretendToBeVisual:true,
 beforeParse(w){
  w.fetch=(u,o)=>{
   let ACT='',body=null;
   if(o&&o.method==='POST'){ try{body=JSON.parse(o.body);posts.push(body);ACT=body.action||'';}catch(e){} }
   else { gets.push(decodeURIComponent((String(u).match(/action=([^&]+)/)||[,''])[1])); }
   if(ACT&&ACT===fallar)
     return Promise.resolve({status:200,text:()=>Promise.resolve(
       JSON.stringify({ok:false,error:'el Sheet dijo no'}))});
   let r={ok:true,data:{}};
   if(!ACT) r=BOOT;
   else if(ACT==='saveSalud'){
     /* El backend devuelve la fila ya normalizada. Se marca el comentario para
        poder comprobar que el frontend se queda con LA SUYA, no con la local. */
     const p=body.payload||{};
     r={ok:true,data:Object.assign({},p,{comentario:String(p.comentario||'')+' [srv]',
        timestamp:'2026-11-16T00:00:00Z'})};
   }
   return Promise.resolve({status:200,text:()=>Promise.resolve(JSON.stringify(r))});};
  w.scrollTo=()=>{};w.confirm=()=>true;
  Object.defineProperty(w.navigator,'serviceWorker',{value:undefined,configurable:true});
  w.localStorage.setItem('gosari_user','nico');}});

const w=dom.window,d=w.document;
const click=el=>el.dispatchEvent(new w.Event('click',{bubbles:true}));
const inputEv=el=>el.dispatchEvent(new w.Event('input',{bubbles:true}));
const POST=a=>posts.filter(x=>x.action===a).pop();
const A=[];const ok=(n,c,x='')=>A.push([!!c,n,c?'':String(x)]);
const T=s=>{const e=d.querySelector(s);return e?e.textContent.trim():'(null)';};
const espera=ms=>new Promise(r=>setTimeout(r,ms));

setTimeout(async()=>{

 /* ================= 1. LA CARD, Y DÓNDE ESTÁ ================= */
 ok('existe el bloque de salud', !!d.querySelector('#salLista'));
 ok('con el CTA de episodio', !!d.querySelector('#btnSalud'));
 ok('y el de medicación', !!d.querySelector('#btnMedic'));
 ok('los dos son de icono',
    !!d.querySelector('#salCiEp img')&&!!d.querySelector('#salCiMed img'));
 ok('cruz para el episodio', d.querySelector('#salCiEp img').dataset.fb==='🏥',
    d.querySelector('#salCiEp img').dataset.fb);
 ok('pastilla para la medicación', d.querySelector('#salCiMed img').dataset.fb==='💊',
    d.querySelector('#salCiMed img').dataset.fb);
 ok('con su icono de stats arriba a la derecha', !!d.querySelector('#btnSalStats'));
 ok('igual que el de la semana',
    d.querySelector('#btnSalStats').className===d.querySelector('#btnStats').className,
    d.querySelector('#btnSalStats').className);
 const wk=d.querySelector('#s-home .wk').closest('.card');
 const salCard=d.querySelector('#salLista').closest('.card');
 ok('el título es Tu salud', salCard.querySelector('.card-t').textContent.trim().startsWith('Tu salud'),
    salCard.querySelector('.card-t').textContent.trim());
 ok('va después de Tu semana',
    wk.compareDocumentPosition(salCard)&w.Node.DOCUMENT_POSITION_FOLLOWING);
 ok('y antes del pie',
    salCard.compareDocumentPosition(d.querySelector('#s-home .pie'))
      &w.Node.DOCUMENT_POSITION_FOLLOWING);

 /* ================= 2. COLAPSADO ================= */
 ok('arranca colapsado', d.querySelector('#salLista').style.display==='none',
    d.querySelector('#salLista').style.display);
 ok('y sin pintar nada dentro', d.querySelector('#salLista').innerHTML==='',
    d.querySelector('#salLista').innerHTML.slice(0,40));
 ok('hay un desplegable', d.querySelector('#salMas').style.display!=='none');
 ok('que dice cuántos hay', T('#salMasTx')==='Ver mis registros (3)', T('#salMasTx'));
 click(d.querySelector('#salMas'));
 ok('al tocarlo se abre', d.querySelector('#salLista').style.display!=='none');
 ok('y cambia el texto', T('#salMasTx')==='Ver menos', T('#salMasTx'));
 ok('con la flecha girada', d.querySelector('#salMas').classList.contains('abierto'));
 click(d.querySelector('#salMas'));
 ok('y vuelve a cerrarse', d.querySelector('#salLista').style.display==='none');
 click(d.querySelector('#salMas'));

 /* ================= 2b. LISTADO ================= */
 const filas=[...d.querySelectorAll('#salLista .sal-r')];
 ok('lista los registros de nico', filas.length===3, filas.length);
 ok('sin los de gina', !T('#salLista').includes('de la niña'), T('#salLista'));
 /* La toma de medicación es de las 23:50, más tarde que el episodio */
 ok('la toma suelta va primera', filas[0].textContent.includes('Melatonina'), filas[0].textContent);
 ok('y se pinta con la pastilla', filas[0].querySelector('.sal-e img').dataset.fb==='💊',
    filas[0].querySelector('.sal-e img').dataset.fb);
 ok('sin hablar de síntomas', !filas[0].textContent.includes('intensidad'), filas[0].textContent);
 filas.shift();   // a partir de aquí, los episodios
 ok('el episodio más reciente después', filas[0].textContent.includes('Hinchazón'),
    filas[0].textContent);
 ok('nombra los dos síntomas',
    filas[0].textContent.includes('Dolor de panza')&&filas[0].textContent.includes('Hinchazón'),
    filas[0].textContent);
 ok('dice la intensidad máxima', filas[0].textContent.includes('intensidad alta'), filas[0].textContent);
 ok('muestra la hora', filas[0].textContent.includes('22:10'), filas[0].textContent);
 ok('y los medicamentos', filas[0].textContent.includes('Almax'), filas[0].textContent);
 ok('y el comentario', filas[0].textContent.includes('pizza'), filas[0].textContent);
 ok('un icono por síntoma', filas[0].querySelectorAll('.sal-e .ico').length===2,
    filas[0].querySelectorAll('.sal-e .ico').length);
 ok('cada fila se puede abrir', filas.every(f=>!!f.querySelector('[data-saled]')));

 ok('episodios() ordena por fecha y hora',
    w.episodios().map(e=>e.id).join()==='sm,s1,s2', w.episodios().map(e=>e.id).join());
 ok('una fila sin tipo cuenta como episodio',
    w.tipoSalud({id:'s1'})==='episodio', w.tipoSalud({id:'s1'}));
 ok('y la marcada, como medicación',
    w.tipoSalud({tipo:'medicacion'})==='medicacion', w.tipoSalud({tipo:'medicacion'}));
 ok('un tipo inventado cae en episodio',
    w.tipoSalud({tipo:'loquesea'})==='episodio', w.tipoSalud({tipo:'loquesea'}));
 ok('sintomasDe saca nivel y definición',
    w.sintomasDe(BOOT.data.salud[1]).map(x=>x.def.key+':'+x.nivel).join()==='dolor:media,hinchazon:alta',
    w.sintomasDe(BOOT.data.salud[1]).map(x=>x.def.key+':'+x.nivel).join());
 ok('y nada si no hay síntomas', w.sintomasDe({})
    .length===0);

 /* ================= 3. NO TOCA EL SCORE ================= */
 const scAntes=w.scoreDiario(HOY), semAntes=w.scoreSemanal();
 ok('el score del día existe', typeof scAntes==='number', scAntes);
 /* Un episodio brutal el mismo día no puede mover la nota */
 w.state.data.salud.push({id:'sx',username:'nico',fecha:HOY,hora:'14:00',deposiciones:'alta',
   dolor:'alta',hinchazon:'alta',vomitos:'alta',estrenimiento:'alta',comentario:'',medicamentos:''});
 ok('el score diario no se mueve', w.scoreDiario(HOY)===scAntes, w.scoreDiario(HOY)+' vs '+scAntes);
 ok('ni el semanal', JSON.stringify(w.scoreSemanal())===JSON.stringify(semAntes));
 w.state.data.salud=w.state.data.salud.filter(x=>x.id!=='sx');
 w.render();

 /* ================= 4. EL POPUP ================= */
 click(d.querySelector('#btnSalud'));
 ok('se abre', d.querySelector('#shSalud').classList.contains('on'));
 ok('dice que es nuevo', T('#salT').includes('Nuevo'), T('#salT'));
 ok('sin botón de borrar', d.querySelector('#salBorrar').style.display==='none');
 ok('el día por defecto es el que miras', d.querySelector('#salFecha').value===HOY,
    d.querySelector('#salFecha').value);
 ok('no deja apuntar en el futuro', d.querySelector('#salFecha').max===HOY,
    d.querySelector('#salFecha').max);
 ok('la hora viene puesta', /^\d{2}:\d{2}$/.test(d.querySelector('#salHora').value),
    d.querySelector('#salHora').value);

 const sn=[...d.querySelectorAll('#salSintomas .sn-r')];
 ok('los cinco síntomas', sn.length===5, sn.length);
 const labels=sn.map(r=>r.querySelector('.sn-n').textContent);
 ok('con los nombres que pidió',
    labels.join()==='Deposiciones,Dolor de panza,Hinchazón,Vómitos,Estreñimiento', labels.join());
 ok('la caquita es la primera', sn[0].querySelector('img').dataset.fb==='💩',
    sn[0].querySelector('img').dataset.fb);
 ok('tres niveles en cada uno', sn.every(r=>r.querySelectorAll('.sn-b').length===3));
 ok('baja, media y alta',
    [...sn[2].querySelectorAll('.sn-b')].map(b=>b.textContent).join()==='Baja,Media,Alta',
    [...sn[2].querySelectorAll('.sn-b')].map(b=>b.textContent).join());
 ok('ninguno marcado al abrir', d.querySelectorAll('#salSintomas .sn-b.on').length===0);
 ok('hay comentarios', !!d.querySelector('#salComent'));
 ok('y campo de medicamentos libre', !!d.querySelector('#salMedsExtra'));

 /* chips de medicamentos, solo los suyos */
 const meds=[...d.querySelectorAll('#salMeds [data-smed]')].map(b=>b.dataset.smed);
 ok('chips de sus medicamentos', meds.join()==='Almax,Omeprazol', meds.join());
 ok('sin los de gina', !meds.includes('Apiretal'), meds.join());
 ok('el popup se abrió como episodio', w.sal.tipo==='episodio', w.sal.tipo);
 ok('con el bloque de síntomas visible', d.querySelector('#salSintomas').style.display!=='none');

 /* marcar, cambiar y desmarcar un nivel */
 click(d.querySelector('[data-sn="hinchazon"][data-nv="media"]'));
 ok('marca el nivel', w.sal.niveles.hinchazon==='media', w.sal.niveles.hinchazon);
 ok('se ve marcado', d.querySelector('[data-sn="hinchazon"][data-nv="media"]').classList.contains('on'));
 ok('la fila se resalta', d.querySelector('[data-sn="hinchazon"]').closest('.sn-r').classList.contains('on'));
 click(d.querySelector('[data-sn="hinchazon"][data-nv="alta"]'));
 ok('cambia de nivel', w.sal.niveles.hinchazon==='alta', w.sal.niveles.hinchazon);
 ok('solo uno activo por síntoma',
    d.querySelector('[data-sn="hinchazon"]').closest('.sn-r').querySelectorAll('.sn-b.on').length===1);
 click(d.querySelector('[data-sn="hinchazon"][data-nv="alta"]'));
 ok('volver a tocarlo lo quita', !w.sal.niveles.hinchazon, w.sal.niveles.hinchazon);

 /* no se guarda nada vacío */
 click(d.querySelector('#salOk'));
 ok('vacío no se guarda', !POST('saveSalud'));
 ok('y te lo dice', T('#toast').toLowerCase().includes('síntoma'), T('#toast'));
 ok('el popup sigue abierto', d.querySelector('#shSalud').classList.contains('on'));

 /* ================= 5. GUARDADO OPTIMISTA ================= */
 click(d.querySelector('[data-sn="vomitos"][data-nv="alta"]'));
 click(d.querySelector('[data-sn="dolor"][data-nv="baja"]'));
 click(d.querySelector('[data-smed="Almax"]'));
 ok('el medicamento queda marcado', w.sal.meds.join()==='Almax', w.sal.meds.join());
 d.querySelector('#salMedsExtra').value='Buscapina, 1 comprimido';
 d.querySelector('#salComent').value='Me pasó cenando fuera';
 d.querySelector('#salHora').value='23:15';

 const nAntes=w.state.data.salud.length;
 click(d.querySelector('#salOk'));

 ok('el popup se cierra al momento', !d.querySelector('#shSalud').classList.contains('on'));
 ok('sin pantalla de espera', !d.querySelector('#busy').classList.contains('on'));
 ok('el episodio ya está en local', w.state.data.salud.length===nAntes+1,
    nAntes+' → '+w.state.data.salud.length);
 ok('y se ve en la card', T('#salLista').includes('Vómitos'), T('#salLista'));
 ok('con la hora que puso', T('#salLista').includes('23:15'), T('#salLista'));

 await espera(160);
 const ps=POST('saveSalud');
 ok('la petición salió', !!ps);
 ok('manda username', ps.payload.username==='nico', ps.payload.username);
 ok('y el tipo episodio', ps.payload.tipo==='episodio', ps.payload.tipo);
 ok('una clave por síntoma',
    ['deposiciones','dolor','hinchazon','vomitos','estrenimiento']
      .every(k=>k in ps.payload), Object.keys(ps.payload).join());
 ok('vómitos en alta', ps.payload.vomitos==='alta', ps.payload.vomitos);
 ok('dolor en baja', ps.payload.dolor==='baja', ps.payload.dolor);
 ok('lo no marcado va vacío', ps.payload.hinchazon==='', JSON.stringify(ps.payload.hinchazon));
 ok('junta chips y texto libre',
    ps.payload.medicamentos==='Almax,Buscapina,1 comprimido', ps.payload.medicamentos);
 ok('manda el comentario', ps.payload.comentario==='Me pasó cenando fuera', ps.payload.comentario);
 ok('va por POST', !!ps.action&&!gets.includes('saveSalud'));
 ok('manda la fila del backend', w.state.data.salud.some(e=>/\[srv\]$/.test(e.comentario||'')),
    w.state.data.salud.map(e=>e.comentario).join(' | '));
 ok('sin duplicar el episodio', w.state.data.salud.length===nAntes+1,
    w.state.data.salud.length);
 ok('y sin recargar todo', gets.filter(a=>a==='getBootstrap').length===1,
    gets.filter(a=>a==='getBootstrap').length);

 /* ================= 6. EDITAR Y BORRAR ================= */
 click(d.querySelector('[data-saled="s1"]'));
 ok('abre en modo edición', T('#salT').includes('Editar'), T('#salT'));
 ok('con botón de borrar', d.querySelector('#salBorrar').style.display!=='none');
 ok('recupera los niveles',
    d.querySelector('[data-sn="hinchazon"][data-nv="alta"]').classList.contains('on')&&
    d.querySelector('[data-sn="dolor"][data-nv="media"]').classList.contains('on'));
 ok('recupera la fecha', d.querySelector('#salFecha').value===AYER, d.querySelector('#salFecha').value);
 ok('recupera la hora', d.querySelector('#salHora').value==='22:10', d.querySelector('#salHora').value);
 ok('recupera el comentario', d.querySelector('#salComent').value==='Después de la pizza',
    d.querySelector('#salComent').value);
 /* El medicamento conocido va de chip; lo escrito a mano, al campo libre */
 ok('el chip conocido se marca', d.querySelector('[data-smed="Almax"]').classList.contains('on'));
 ok('lo escrito a mano se conserva',
    d.querySelector('#salMedsExtra').value==='infusión de menta',
    d.querySelector('#salMedsExtra').value);

 const nBorrar=w.state.data.salud.length;
 click(d.querySelector('#salBorrar'));
 ok('borra al momento', w.state.data.salud.length===nBorrar-1,
    nBorrar+' → '+w.state.data.salud.length);
 ok('ya no está en la lista', !w.state.data.salud.some(e=>e.id==='s1'));
 await espera(120);
 ok('lo pidió al backend', !!POST('deleteSalud')&&POST('deleteSalud').id==='s1',
    JSON.stringify(POST('deleteSalud')));

 /* ---- si el guardado falla, se deshace ---- */
 fallar='saveSalud';
 click(d.querySelector('#btnSalud'));
 click(d.querySelector('[data-sn="estrenimiento"][data-nv="media"]'));
 const nFallo=w.state.data.salud.length;
 click(d.querySelector('#salOk'));
 ok('se pinta igualmente', w.state.data.salud.length===nFallo+1);
 await espera(400);
 ok('al fallar se deshace', w.state.data.salud.length===nFallo,
    nFallo+' → '+w.state.data.salud.length);
 ok('y avisa', T('#toast').toLowerCase().includes('no se guardó'), T('#toast'));
 fallar=null;

 /* ================= 6b. CTA DE MEDICACIÓN ================= */
 click(d.querySelector('#btnMedic'));
 ok('abre el popup', d.querySelector('#shSalud').classList.contains('on'));
 ok('en modo medicación', w.sal.tipo==='medicacion', w.sal.tipo);
 ok('con su título', T('#salT').toLowerCase().includes('medicación'), T('#salT'));
 ok('el botón lo dice', T('#salOk').toLowerCase().includes('medicación'), T('#salOk'));
 /* Una toma no tiene síntomas: ese bloque no pinta nada aquí */
 ok('sin bloque de síntomas', d.querySelector('#salSintomas').style.display==='none',
    d.querySelector('#salSintomas').style.display);
 ok('ni su etiqueta', d.querySelector('#salSintT').style.display==='none');
 ok('pero sí fecha y hora',
    !!d.querySelector('#salFecha').value&&!!d.querySelector('#salHora').value);
 ok('y los chips de medicamentos', d.querySelectorAll('#salMeds [data-smed]').length===2,
    d.querySelectorAll('#salMeds [data-smed]').length);

 /* sin elegir nada no se guarda */
 const nPost=posts.filter(x=>x.action==='saveSalud').length;
 click(d.querySelector('#salOk'));
 ok('vacía no se guarda', posts.filter(x=>x.action==='saveSalud').length===nPost);
 ok('y te lo dice', T('#toast').toLowerCase().includes('medicamento'), T('#toast'));

 click(d.querySelector('[data-smed="Omeprazol"]'));
 d.querySelector('#salHora').value='23:00';
 const nMed=w.state.data.salud.length;
 click(d.querySelector('#salOk'));
 await espera(160);
 const pm=POST('saveSalud');
 ok('se guarda la toma', w.state.data.salud.length===nMed+1,
    nMed+' → '+w.state.data.salud.length);
 ok('con tipo medicacion', pm.payload.tipo==='medicacion', pm.payload.tipo);
 ok('con el medicamento', pm.payload.medicamentos==='Omeprazol', pm.payload.medicamentos);
 ok('y sin ningún síntoma',
    ['deposiciones','dolor','hinchazon','vomitos','estrenimiento']
      .every(k=>pm.payload[k]===''), JSON.stringify(pm.payload));
 ok('al guardar se despliega la lista', d.querySelector('#salLista').style.display!=='none');
 ok('y se ve en la card', T('#salLista').includes('Omeprazol'), T('#salLista'));

 /* reabrirla vuelve en modo medicación */
 const idMed=pm.payload.id;
 click(d.querySelector('[data-saled="'+idMed+'"]'));
 ok('reabre como medicación', w.sal.tipo==='medicacion', w.sal.tipo);
 ok('sin síntomas otra vez', d.querySelector('#salSintomas').style.display==='none');
 d.querySelector('#shSalud').classList.remove('on');

 /* ================= 6c. STATS DE SALUD ================= */
 click(d.querySelector('#btnSalStats'));
 ok('abre el modal de stats', d.querySelector('#shSalStats').classList.contains('on'));
 const kpis=[...d.querySelectorAll('#ssBody .sal-k')];
 ok('tres números arriba', kpis.length===3, kpis.length);
 ok('días sin episodios', kpis[0].textContent.includes('días sin episodios'), kpis[0].textContent);
 ok('mejor racha', kpis[1].textContent.includes('mejor racha'), kpis[1].textContent);
 ok('total de episodios', kpis[2].textContent.includes('episodios en total'), kpis[2].textContent);
 /* En el bloque 5 se guardó un episodio de HOY, así que el contador está a 0 */
 ok('cuenta bien los días', kpis[0].querySelector('b').textContent==='0',
    kpis[0].querySelector('b').textContent);
 ok('y lo dice con palabras', T('#ssBody').includes('Hoy has tenido uno'), T('#ssBody').slice(0,200));
 ok('y solo cuenta episodios', kpis[2].querySelector('b').textContent==='2',
    kpis[2].querySelector('b').textContent);

 ok('hay barras por mes', T('#ssBody').includes('Episodios por mes'), T('#ssBody').slice(0,60));
 ok('pintadas en SVG', d.querySelectorAll('#ssBody svg').length>=1);
 ok('seis meses', (T('#ssBody').match(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/g)||[]).length>=6,
    (T('#ssBody').match(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/g)||[]).join());

 const rank=[...d.querySelectorAll('#ssBody .sal-rank')];
 ok('ranking de medicamentos', rank.length>=2, rank.length);
 ok('cuenta las veces', rank[0].textContent.includes('vez')||rank[0].textContent.includes('veces'),
    rank[0].textContent);
 ok('suma los de episodios y los sueltos',
    T('#ssBody').includes('Melatonina')&&T('#ssBody').includes('Almax'), T('#ssBody'));
 ok('incluye lo escrito a mano', T('#ssBody').includes('Buscapina'), T('#ssBody'));
 /* «Buscapina, 1 comprimido» se parte por la coma; la dosis no es un fármaco */
 ok('pero no la dosis', !T('#ssBody').includes('1 comprimido'), T('#ssBody'));

 /* diasEntre y la racha, en seco */
 ok('diasEntre cuenta bien', w.diasEntre('2026-11-01','2026-11-16')===15,
    w.diasEntre('2026-11-01','2026-11-16'));
 ok('cruza meses', w.diasEntre('2026-10-30','2026-11-02')===3, w.diasEntre('2026-10-30','2026-11-02'));
 ok('la racha mira también hasta hoy',
    w.rachaSinEpisodios(['2026-11-01','2026-11-05'])===11,
    w.rachaSinEpisodios(['2026-11-01','2026-11-05']));
 ok('y coge el hueco mayor',
    w.rachaSinEpisodios(['2026-01-01','2026-06-01','2026-11-16'])===167,
    w.rachaSinEpisodios(['2026-01-01','2026-06-01','2026-11-16']));
 ok('sin episodios, racha cero', w.rachaSinEpisodios([])===0);
 d.querySelector('#shSalStats').classList.remove('on');

 /* ================= 7. GINA TAMBIÉN TIENE EL BLOQUE ================= */
 w.state.user='gina'; w.render();
 ok('gina tiene bloque de salud', !!d.querySelector('#btnSalud'));
 ok('y su CTA de medicación', !!d.querySelector('#btnMedic'));
 ok('con su propio episodio', T('#salLista').includes('de la niña'), T('#salLista'));
 ok('y no los de nico', !T('#salLista').includes('pizza'), T('#salLista'));
 /* Venimos de guardar, así que la lista está abierta: se cierra para leer
    el contador del desplegable. */
 click(d.querySelector('#salMas'));
 ok('su contador es el suyo', T('#salMasTx')==='Ver mis registros (1)', T('#salMasTx'));
 click(d.querySelector('#salMas'));
 click(d.querySelector('#btnSalud'));
 const medsG=[...d.querySelectorAll('#salMeds [data-smed]')].map(b=>b.dataset.smed);
 ok('y sus propios medicamentos', medsG.join()==='Apiretal', medsG.join());
 d.querySelector('#shSalud').classList.remove('on');
 w.state.user='nico'; w.render();

 /* ================= 8. HORA AUTOMÁTICA ================= */
 ok('la hora sale del hueco', w.horaDeHueco('desayuno')==='08:00', w.horaDeHueco('desayuno'));
 ok('cada hueco la suya', w.horaDeHueco('cena')==='20:30', w.horaDeHueco('cena'));
 ok('las extra usan el reloj', /^\d{2}:\d{2}$/.test(w.horaDeHueco('extra'))&&
    w.horaDeHueco('extra')!=='', w.horaDeHueco('extra'));

 click(d.querySelector('[data-nav="s-home"]'));
 w.abrirAdd('cena');
 ok('el borrador arranca con la del hueco', w.draft.hora==='20:30', w.draft.hora);
 ok('y no cuenta como tocada a mano', w.draft.horaManual===false, w.draft.horaManual);
 ok('se ve en el botón, no en un campo',
    d.querySelector('#btnHora').style.display!=='none'&&
    d.querySelector('#inHora').style.display==='none',
    d.querySelector('#btnHora').style.display+' / '+d.querySelector('#inHora').style.display);
 ok('el botón dice la hora', T('#horaTx')==='20:30', T('#horaTx'));

 /* cambiar de hueco arrastra la hora */
 click(d.querySelector('[data-tipo="desayuno"]'));
 ok('al cambiar de hueco la hora sigue', w.draft.hora==='08:00', w.draft.hora);
 ok('y el botón se actualiza', T('#horaTx')==='08:00', T('#horaTx'));

 /* ...salvo que la pongas tú */
 click(d.querySelector('#btnHora'));
 ok('al tocarlo aparece el campo', d.querySelector('#inHora').style.display!=='none');
 ok('y se marca como manual', w.draft.horaManual===true);
 d.querySelector('#inHora').value='09:45';
 inputEv(d.querySelector('#inHora'));
 ok('recoge lo que escribes', w.draft.hora==='09:45', w.draft.hora);
 click(d.querySelector('[data-tipo="cena"]'));
 ok('y ahora el hueco NO la pisa', w.draft.hora==='09:45', w.draft.hora);

 /* un día pasado se comporta igual que hoy */
 w.state.diaVer=AYER;
 w.abrirAdd('comida');
 ok('en días pasados también', w.draft.hora==='14:00', w.draft.hora);
 ok('y con la fecha de ese día', w.draft.fecha===AYER, w.draft.fecha);
 w.state.diaVer=HOY;

 /* ================= 9. CONTRATO ================= */
 contrato();

 console.log(A.map(([p,n,x])=>`${p?'✓':'✗'} ${n}${x?'  → '+x:''}`).join('\n'));
 console.log('\n'+A.filter(a=>a[0]).length+'/'+A.length+' OK');
 process.exit(A.some(a=>!a[0])?1:0);
},500);

/* ───────── Code.gs real contra un Sheet simulado ───────── */
function hoja(headers){
 const rows=[headers.slice()];
 const sh={
  getSheetName:()=>sh._n,getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,
  getMaxRows:()=>Math.max(rows.length,100),setFrozenRows:()=>sh,
  appendRow:r=>{rows.push(r.slice());return sh;},
  deleteRow:i=>{rows.splice(i-1,1);return sh;},
  deleteRows:(i,n)=>{rows.splice(i-1,n);return sh;},
  getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())}),
  getRange:(r,c,nr,nc)=>({
   getValues:()=>{const out=[];
    for(let i=0;i<(nr||1);i++){const f=rows[r-1+i]||[],t=[];
     for(let j=0;j<(nc||1);j++)t.push(f[c-1+j]===undefined?'':f[c-1+j]);out.push(t);}
    return out;},
   getValue:()=>(rows[r-1]||[])[c-1],
   setValues:v=>{v.forEach((f,i)=>{if(!rows[r-1+i])rows[r-1+i]=[];
     f.forEach((x,j)=>{rows[r-1+i][c-1+j]=x;});});return sh;},
   setValue:v=>{if(!rows[r-1])rows[r-1]=[];rows[r-1][c-1]=v;return sh;},
   setFontWeight:()=>sh,setNumberFormat:()=>sh}),
  _rows:rows};
 return sh;
}

function contrato(){
 /* A propósito en otro orden que HEADERS: si algo escribiera por posición,
    los síntomas acabarían en columnas ajenas y estos tests lo cantarían. */
 const H={
  Usuarios:['username','nombre','avatar','color','frase','objetivo','nacimiento','ciudad',
            'en_gastos','restricciones'],
  Salud:['id','fecha','username','comentario','hora','hinchazon','deposiciones','dolor',
         'vomitos','estrenimiento','medicamentos','timestamp'],
  Medicamentos:['username','nombre','id','icono','activo','orden']};
 const hojas={};
 Object.keys(H).forEach(k=>{hojas[k]=hoja(H[k]);hojas[k]._n=k;});
 hojas.Usuarios._rows.push(['nico','Nico','','','','','','','','']);

 const ctx={console,
  SpreadsheetApp:(()=>{const ss={getSpreadsheetTimeZone:()=>'Europe/Madrid',
   getSheetByName:n=>hojas[n]||null,
   insertSheet:n=>{hojas[n]=hoja([]);hojas[n]._n=n;return hojas[n];},deleteSheet:()=>{}};
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

 /* El POST real que mandó el frontend */
 const real=posts.filter(x=>x.action==='saveSalud')[0];
 const r1=llamar(real);
 ok('CONTRATO: el backend acepta el POST', r1.ok===true, r1.error);

 const f=hojas.Salud._rows, hh=f[0], f1=f[1];
 const V=k=>f1[hh.indexOf(k)];
 ok('CONTRATO: una fila escrita', f.length===2, f.length);
 ok('CONTRATO: username en su columna', V('username')==='nico', V('username'));
 ok('CONTRATO: vómitos en su columna', V('vomitos')==='alta', V('vomitos'));
 ok('CONTRATO: dolor en la suya', V('dolor')==='baja', V('dolor'));
 ok('CONTRATO: hinchazón vacía', V('hinchazon')==='', JSON.stringify(V('hinchazon')));
 ok('CONTRATO: hora como texto', V('hora')==='23:15', V('hora'));
 ok('CONTRATO: comentario entero', V('comentario')==='Me pasó cenando fuera', V('comentario'));
 ok('CONTRATO: medicamentos en CSV',
    V('medicamentos')==='Almax,Buscapina,1 comprimido', V('medicamentos'));
 ok('CONTRATO: con id', String(V('id')).length>5, V('id'));

 /* Un nivel inventado no entra: una fila tecleada a mano no rompe nada */
 const raro=llamar({action:'saveSalud',payload:{username:'nico',fecha:'2026-11-10',
   hora:'10:00',dolor:'brutal',hinchazon:'ALTA',comentario:''}});
 ok('CONTRATO: nivel inválido se descarta', raro.data.dolor==='', JSON.stringify(raro.data.dolor));
 ok('CONTRATO: y las mayúsculas se normalizan', raro.data.hinchazon==='alta', raro.data.hinchazon);

 /* Vacío de verdad se rechaza, con mensaje */
 const vacio=llamar({action:'saveSalud',payload:{username:'nico',fecha:'2026-11-10',hora:'10:00'}});
 ok('CONTRATO: sin nada no se guarda', vacio.ok===false, JSON.stringify(vacio));
 ok('CONTRATO: con un mensaje útil', /síntoma|comentario/i.test(vacio.error), vacio.error);

 /* Un comentario solo, sin síntomas, sí vale */
 const soloCom=llamar({action:'saveSalud',payload:{username:'nico',fecha:'2026-11-10',
   hora:'10:00',comentario:'raro pero sin nada claro'}});
 ok('CONTRATO: un comentario solo vale', soloCom.ok===true, soloCom.error);

 /* Reeditar el mismo id actualiza, no duplica */
 const n0=hojas.Salud._rows.length;
 const edit=llamar({action:'saveSalud',payload:Object.assign({},real.payload,
   {id:r1.data.id,comentario:'corregido'})});
 ok('CONTRATO: reeditar no duplica', hojas.Salud._rows.length===n0, n0+' → '+hojas.Salud._rows.length);
 ok('CONTRATO: y actualiza el texto', edit.data.comentario==='corregido', edit.data.comentario);

 /* Borrado */
 const del=llamar({action:'deleteSalud',id:r1.data.id});
 ok('CONTRATO: borra', del.ok===true&&del.data.borradas===1, JSON.stringify(del));
 ok('CONTRATO: una fila menos', hojas.Salud._rows.length===n0-1, hojas.Salud._rows.length);
 ok('CONTRATO: sin id avisa', llamar({action:'deleteSalud'}).ok===false);
 ok('CONTRATO: sin username avisa',
    llamar({action:'saveSalud',payload:{dolor:'alta'}}).ok===false);

 /* Guardar salud es escritura: tiene que ir con candado */
 const ESCR=vm.runInContext('ESCRITURAS',ctx);
 ok('CONTRATO: saveSalud lleva candado', ESCR.indexOf('saveSalud')>=0, ESCR.join());
 ok('CONTRATO: deleteSalud también', ESCR.indexOf('deleteSalud')>=0);

 /* Semillas de medicamentos, por nombre de cabecera */
 const SEED=vm.runInContext('SEED',ctx);
 SEED.Medicamentos.forEach(r=>ctx._append(hojas.Medicamentos,r));
 const m=hojas.Medicamentos._rows, mh=m[0];
 ok('CONTRATO: el primer medicamento en su columna',
    m[1][mh.indexOf('nombre')]==='Stress', m[1][mh.indexOf('nombre')]);
 ok('CONTRATO: y su id donde toca', m[1][mh.indexOf('id')]==='stress', m[1][mh.indexOf('id')]);
 ok('CONTRATO: las seis semillas', m.length===7, m.length-1);
 ok('CONTRATO: y son las que pidió',
    m.slice(1).map(r=>r[mh.indexOf('nombre')]).join()===
      'Stress,Melatonina,Vitamina,Ibuprofeno,Paracetamol,Suero',
    m.slice(1).map(r=>r[mh.indexOf('nombre')]).join());

 /* El bootstrap devuelve las dos tablas nuevas */
 const boot=JSON.parse(ctx.handleGetBootstrap({username:'nico'}).getContent());
 ok('CONTRATO: el bootstrap trae salud', Array.isArray(boot.data.salud));
 ok('CONTRATO: y los medicamentos', Array.isArray(boot.data.medicamentos));
 ok('CONTRATO: solo los activos',
    boot.data.medicamentos.every(x=>x.activo===''||x.activo===undefined||x.activo===true),
    JSON.stringify(boot.data.medicamentos.map(x=>x.activo)));

 /* Y el frontend sobrevive si el backend va por detrás y no las manda */
 const n=w.normalizar({});
 ok('BLINDAJE: salud nunca es undefined', Array.isArray(n.salud));
 ok('BLINDAJE: medicamentos tampoco', Array.isArray(n.medicamentos));
}
