export {};
type Json = Record<string, unknown>;
type Session = { token: string; tenant: string; scopes: string[]; expires: number };
let session: Session | null = null;
let tenantOffset = 0;
let newBusinessOutcomeUncertain = false;

let fiscalRows: Json[]=[];
const owner=()=>session?.scopes.includes('platform:admin')??false;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
const element = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const value = document.getElementById(id);
  if (!value) throw new Error('Panel incompleto');
  return value as T;
};
const origin = element('admin-app').dataset.apiOrigin!;
if (origin !== 'https://api-emitta.nexorf.dev') throw new Error('Origen de API no autorizado');
const value = (id: string) => element<HTMLInputElement>(id).value.trim();
const uuid = (input: string) => {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input)) throw new Error('Falta un identificador válido. Completa el paso anterior o indica el registro existente.');
  return input;
};
function notice(message: string, kind = 'info') { element('notice').textContent = message; element('notice').dataset.kind=kind; }
const readableStatus: Record<string,string> = {ACTIVE:'Activo',REVOKED:'Desactivado',QUEUED:'Guardado, pendiente de procesamiento',GENERATING:'Generando XML',SIGNED:'Firmado',AUTHORIZED:'Autorizado por el SRI',NOT_AUTHORIZED:'No autorizado por el SRI',TEST:'Pruebas',COMPLETED:'Completado',PENDING:'Pendiente'};
function result(body: unknown) {
  element('operation-result').textContent = JSON.stringify(body, null, 2);
  const container=element('result-summary');container.textContent='';
  const labels: Record<string,string> = {id:'Identificador',name:'Nombre',ruc:'RUC',legalName:'Razón social',tradeName:'Nombre comercial',code:'Código',status:'Estado',state:'Estado',environment:'Ambiente',sequential:'Secuencial',accessKey:'Clave de acceso',validUntil:'Válido hasta',fingerprint:'Huella del certificado',attempts:'Intentos',nextAttemptAt:'Próximo intento',failureCategory:'Resultado del proceso'};
  const records=Array.isArray(body)?body:[body];
  if(!records.length)row(container,'Todavía no hay registros para esta consulta.');
  for(const record of records) if(record && typeof record==='object') {
    for(const [key,label] of Object.entries(labels)) {
      const raw=(record as Json)[key];if(raw===null||raw===undefined)continue;
      const entry=document.createElement('div');entry.className='result-entry';
      const title=document.createElement('span');title.textContent=label;
      const content=document.createElement('span');content.textContent=readableStatus[String(raw)]??String(raw);entry.append(title,content);container.append(entry);
    }
  }
  element('result-section').hidden = false;
}
function credentials(body: {clientId?:string;clientSecret?:string}) {
  element('new-credentials').textContent = `Identificador de acceso\n${body.clientId??''}\n\nClave de acceso (se muestra una sola vez)\n${body.clientSecret??''}`;
  element('credentials-section').hidden = false;
}
function selectedOrganisation(id:string,name:string) {
  element('new-credentials').textContent='';element('credentials-section').hidden=true;
  element('client-list').textContent='';element('internal-client-list').textContent='';
  element<HTMLInputElement>('selected-tenant').value=id;
  element('selected-tenant-name').textContent=name;
  element('workspace-title').textContent=name;
  element('organisation-workspace').hidden=false;
  fiscalRows=[];
  for(const id of ['fiscal-overview','certificate-overview','fiscal-taxpayer-choice'])element(id).textContent='';
  showView('detail');showDetail('access');
}
function logout() {
  session = null; clearTimeout(expiryTimer);
  for (const id of ['operations-view','account-view','session-section','platform-section','credentials-section','result-section','organisation-workspace','customer-tools']) element(id).hidden = true;
  for (const id of ['new-credentials','operation-result','tenant-list','client-list','internal-client-list','session-description','selected-tenant-name','result-summary','tenant-count']) element(id).textContent = '';
  document.querySelectorAll<HTMLFormElement>('form').forEach(form => form.reset());
  element('login-section').hidden = false;
  element<HTMLInputElement>('selected-tenant').value=''; tenantOffset=0;
  fiscalRows=[];
  for(const id of ['fiscal-overview','certificate-overview','fiscal-taxpayer-choice'])element(id).textContent='';
  notice('Sesión cerrada.');
}
async function request(path: string, options: RequestInit = {}, authenticated = true): Promise<Response> {
  if (authenticated && (!session || session.expires <= Date.now())) { logout(); throw new Error('La sesión venció.'); }
  const requestSession=session?.token;
  const headers = new Headers(options.headers);
  if (authenticated) headers.set('Authorization', 'Bearer ' + session!.token);
  let response: Response;
  try { response = await fetch(origin + path, { ...options, headers, credentials:'omit', redirect:'error', cache:'no-store', signal:AbortSignal.timeout(30000) }); }
  catch { throw new Error(options.method === 'POST' ? 'Resultado de red desconocido. No repitas el POST; verifica lo persistido con el operador.' : 'No se pudo conectar con la API. Tu sesión sigue disponible; vuelve a consultar cuando se restablezca la conexión.'); }
  if(authenticated && session?.token!==requestSession)throw new Error('La sesión cambió. El resultado no se mostrará en otra sesión; comprueba si la operación se guardó.');
  if (!response.ok) {
    if (response.status === 401 && authenticated) logout();
    const retry = response.headers.get('Retry-After');
    const messages: Record<number,string> = {400:'Revisa los datos del formulario.',401:authenticated?'Tu sesión venció. Vuelve a entrar.':'No se pudo iniciar sesión. Revisa tus credenciales; si hubo varios intentos fallidos, espera 15 minutos.',403:'Este acceso no permite realizar la operación. Utiliza el acceso administrativo correspondiente.',404:'No se encontró el registro o archivo solicitado.',409:'Ya existe un registro o la operación no es válida en su estado actual. Comprueba lo existente antes de repetir.',422:'No se pudo validar la información. Revisa los datos o el certificado.',429:'Demasiadas solicitudes. Espera antes de continuar.',503:'El servicio no está disponible temporalmente. No vuelvas a crear un registro sin comprobar si se guardó.'};
    throw new Error((messages[response.status]??'No se pudo completar la operación.')+(retry?' Espera '+retry+' segundos.':'')+` (HTTP ${response.status})`);
  }
  return response;
}
async function post(path: string, body: unknown, authenticated = true) {
  const response = await request(path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) },authenticated);
  return response.status===204 ? {status:'Completado'} : response.json();
}
function bindForm(id: string, operation: (form: HTMLFormElement) => Promise<void>) {
  element<HTMLFormElement>(id).addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement;
    const button = form.querySelector<HTMLButtonElement>('button')!; button.disabled = true;
    try { await operation(form); notice(form.dataset.successMessage??'Operación completada.'); }
    catch (error) { notice(error instanceof Error ? error.message : 'No se completó la operación.','error'); }
    finally { button.disabled = false; }
  });
}
function onClick(id: string, operation: () => Promise<void>) {
  element<HTMLButtonElement>(id).addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement; button.disabled=true;
    try { await operation(); } catch(error) { notice(error instanceof Error?error.message:'Error de operación.','error'); }
    finally {button.disabled=false;}
  });
}
const fields = (form: HTMLFormElement): Json => Object.fromEntries(new FormData(form).entries());
async function login(form: HTMLFormElement, path: string) {
  const body = fields(form);
  try {
    const response = await post(path,body,false);
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(response.accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
    // Claims only drive display; backend validates signature, active client, tenant and scopes on every operation.
    session={token:response.accessToken,tenant:claims.tenant_id,scopes:Array.isArray(claims.scope)?claims.scope:String(claims.scope??'').split(' '),expires:claims.exp*1000};
    const platform=session.scopes.includes('platform:admin');
    element('login-section').hidden=true; element('session-section').hidden=false;
    element('platform-section').hidden=!platform;
    if(!platform){logout();throw new Error('Este panel es exclusivo del dueño de Emitta. Usa tus credenciales de cliente desde la API.');}
    element('session-description').textContent=platform ? 'Responsable de Emitta · Gestión de organizaciones y accesos' : 'Administración de la organización · Datos fiscales y certificados';
    expiryTimer=setTimeout(logout,Math.max(0,session.expires-Date.now()));
    if(platform) await listTenants();
    showView('clients');
    form.dataset.successMessage=platform?'Elige un cliente para continuar.':'Sesión iniciada.';
  } finally { form.reset(); body.clientSecret=null; body.password=null; }
}
bindForm('login-form', form=>login(form,'/api/v1/auth/token'));
bindForm('personal-login-form', form=>login(form,'/api/v1/operator/token'));
bindForm('personal-setup-form', async form=>{
  const body=fields(form);
  try {
    if(body.password!==body.confirmPassword)throw new Error('Las contraseñas no coinciden.');
    delete body.confirmPassword;
    await post('/api/v1/operator/personal-access',body);
    form.dataset.successMessage='Tu entrada personal está configurada. Puedes cerrar sesión y entrar con tu correo y contraseña.';
  } finally {form.reset();body.password=null;}
});
function row(container: HTMLElement, label: string, action?: {label:string;run:()=>Promise<void>}) {
  const div=document.createElement('div');div.className='resource-row';
  const text=document.createElement('span');text.textContent=label;div.append(text);
  if(action){const button=document.createElement('button');button.textContent=action.label;button.className='secondary';button.addEventListener('click',async()=>{button.disabled=true;try{await action.run();}catch(e){notice(e instanceof Error?e.message:'Error','error');}finally{button.disabled=false;}});div.append(button);}
  container.append(div);return div;
}
async function listTenants() {
  const response=await request(`/api/v1/tenants?limit=25&offset=${tenantOffset}`);
  const list=await response.json() as Array<{id:string;name:string;status:string}>;
  const container=element('tenant-list');container.textContent='';
  element('tenant-count').textContent=list.length?`${list.length} negocios en esta página`:'Todavía no hay negocios. Usa «Añadir un negocio» para comenzar.';
  const visible=list.filter(t=>t.id!==session?.tenant && (element<HTMLInputElement>('show-inactive').checked || t.status==='ACTIVE'));
  element('tenant-count').textContent=`${visible.length} clientes visibles en esta página`;
  visible.forEach(t=>{const item=row(container,`${t.name} · ${readableStatus[t.status]??t.status}`,{label:'Abrir cliente →',run:async()=>{selectedOrganisation(t.id,t.name);await listClients();await loadFiscalOverview();notice('Estás gestionando: '+t.name);element('organisation-workspace').scrollIntoView?.({behavior:'smooth',block:'start'});}});item.setAttribute('aria-current',String(value('selected-tenant')===t.id));});
  element<HTMLButtonElement>('previous-tenants').disabled=tenantOffset===0;
  element<HTMLButtonElement>('next-tenants').disabled=list.length<25;
}
async function listClients() {
  if(!value('selected-tenant'))throw new Error('Elige primero una organización.');
  const tenant=uuid(value('selected-tenant'));const response=await request(`/api/v1/tenants/${tenant}/api-clients?limit=100`);
  const list=await response.json() as Array<{id:string;clientId:string;name:string;status:string;scopes:string[]}>;
  if(value('selected-tenant')!==tenant)return; // Do not display another client's late response.
  const container=element('client-list');container.textContent='';
  const internal=element('internal-client-list');internal.textContent='';
  if(!list.some(c=>c.scopes.includes('invoices:write')))row(container,'Todavía no hay conexión para la aplicación de este cliente. Usa «Crear identificador y clave».');
  list.forEach(c=>{
    const isInternal=!c.scopes.includes('invoices:write');
    const div=row(isInternal?internal:container,`${c.name} · ${readableStatus[c.status]??c.status}`);
    if(!isInternal){row(div,'Identificador para su aplicación: '+c.clientId);row(div,c.scopes.includes('certificates:write')?'Puede preparar sus datos y certificado por la API':'Sólo facturación y descarga; crea un acceso completo si necesita gestionar su negocio');}
    row(div,'Permisos: '+c.scopes.join(', '));
    if(c.status==='ACTIVE') for(const action of ['rotate-secret','revoke']) row(div,'',{label:action==='revoke'?'Desactivar acceso':'Cambiar clave',run:async()=>{
      if(!confirm(action==='revoke'?'¿Desactivar este acceso? La aplicación dejará de poder usar la API.':'¿Generar una clave nueva? Tendrás que actualizarla en la aplicación del cliente. Los tokens actuales conservan su vigencia hasta expirar.'))throw new Error('Operación cancelada.');
      const body=await post(`/api/v1/tenants/${tenant}/api-clients/${uuid(c.id)}/${action}`,{});
      if(action==='rotate-secret')credentials(body);else result(body);await listClients();
    }});
  });
}
bindForm('tenant-form',async form=>{
  if(newBusinessOutcomeUncertain)throw new Error('Hay un alta pendiente de comprobar. Actualiza el listado y revisa ese negocio antes de crear otro.');
  let created: {id:string;name:string}|undefined;
  newBusinessOutcomeUncertain=true;
  try {
    const data=fields(form);
    created=await post('/api/v1/tenants',{name:data.name});
    selectedOrganisation(uuid(created!.id),created!.name);
    const access=await post(`/api/v1/tenants/${uuid(created!.id)}/api-clients`,{name:'Aplicación del cliente',scopes:accessProfiles['self-managed']});
    credentials(access);newBusinessOutcomeUncertain=false;form.reset();
    form.dataset.successMessage='Cliente creado. Guarda el identificador y la clave que aparecen abajo. La configuración fiscal se prepara después.';
  } catch(error) {
    throw new Error(created?'El negocio se guardó, pero no se confirmó la generación de su clave. No lo crees otra vez: abre este cliente y actualiza sus conexiones antes de generar otra.':'No se pudo confirmar el alta. Actualiza el listado para comprobar si el negocio se guardó antes de repetir.');
  }
  // A refresh failure must not hide successfully created credentials or repeat either POST.
  try { await listTenants();await listClients(); } catch { form.dataset.successMessage='Cliente y clave creados. Guárdalos; el listado no se pudo actualizar.'; }
});
const accessProfiles: Record<string,string[]> = {
  integration:['invoices:write','documents:read','artifacts:read'],
  administration:['taxpayers:write','establishments:write','points-of-issue:write','certificates:write','certificates:read'],
  'self-managed':['invoices:write','documents:read','artifacts:read','taxpayers:write','establishments:write','points-of-issue:write','certificates:write','certificates:read'],
};
bindForm('client-form',async form=>{
  if(!value('selected-tenant'))throw new Error('Selecciona o crea primero una organización.');
  const tenant=uuid(value('selected-tenant'));const data=new FormData(form);
  const scopes=accessProfiles[String(data.get('profile'))];if(!scopes)throw new Error('Selecciona un tipo de acceso válido.');
  credentials(await post(`/api/v1/tenants/${tenant}/api-clients`,{name:data.get('name'),scopes}));await listClients();form.dataset.successMessage='Acceso creado. Guarda las credenciales que aparecen debajo; la clave no se puede recuperar después.';
});
onClick('refresh-tenants',async()=>{await listTenants();newBusinessOutcomeUncertain=false;notice('Listado actualizado. Comprueba si el negocio ya existe antes de crear uno nuevo.');});onClick('refresh-clients',listClients);
onClick('previous-tenants',async()=>{tenantOffset=Math.max(0,tenantOffset-25);await listTenants();});onClick('next-tenants',async()=>{tenantOffset+=25;await listTenants();});
element('logout').addEventListener('click',logout);
element('hide-credentials').addEventListener('click',()=>{element('new-credentials').textContent='';element('credentials-section').hidden=true;});
window.addEventListener('pagehide',logout);

function fiscalPath(){return owner()?`/api/v1/tenants/${uuid(value('selected-tenant'))}/fiscal-configuration`:'/api/v1/fiscal-configuration';}
async function loadFiscalOverview(){
  const tenant=value('selected-tenant');if(!tenant)return;
  const response=await request(fiscalPath()+'?limit=100');
  const rows=await response.json() as Json[];if(value('selected-tenant')!==tenant)return;
  fiscalRows=rows;const container=element('fiscal-overview');container.textContent='';
  const choice=element<HTMLSelectElement>('fiscal-taxpayer-choice');choice.textContent='';
  const taxpayers=new Map<string,Json>();
  for(const entry of rows){taxpayers.set(String(entry.taxpayerId),entry);
    row(container,`${entry.legalName} · RUC ${entry.ruc} · ${entry.establishmentCode??'Sin establecimiento'}-${entry.pointOfIssueCode??'Sin punto'}`);
    if(entry.pointOfIssueId)row(container,'pointOfIssueId: '+entry.pointOfIssueId,{label:'Copiar UUID',run:async()=>{await navigator.clipboard.writeText(String(entry.pointOfIssueId));notice('UUID del punto copiado.');}});
  }
  for(const [id,entry] of taxpayers){const option=document.createElement('option');option.value=id;option.textContent=String(entry.legalName)+' · '+entry.ruc;choice.append(option);}
  if(!rows.length)row(container,'Todavía no hay datos fiscales. Regístralos con el formulario o permite que el cliente los prepare por la API.');
  if(rows.length===100)row(container,'Se muestran las primeras 100 configuraciones. Hay más registros disponibles mediante la consulta paginada de la API.');
  choice.value=taxpayers.keys().next().value??'';
  selectFiscalTaxpayer();
}
function selectFiscalTaxpayer(){
  const id=value('fiscal-taxpayer-choice');const entry=fiscalRows.find(row=>row.taxpayerId===id);
  const summary=element('certificate-overview');summary.textContent='';
  row(summary,entry?.certificateId?`Certificado ${readableStatus[String(entry.certificateStatus)]??entry.certificateStatus} · Vigencia hasta ${entry.certificateValidUntil??'No disponible'}`:'Certificado pendiente de importación.');

}
bindForm('fiscal-setup-form',async form=>{
  const tenant=value('selected-tenant');
  const data=fields(form);const optional=(key:string)=>String(data[key]??'').trim()||null;
  const configured=await post(fiscalPath(),{taxpayer:{ruc:data.ruc,legalName:data.legalName,tradeName:optional('tradeName'),mainAddress:data.mainAddress},
    establishment:{code:data.establishmentCode,address:optional('establishmentAddress')},pointOfIssue:{code:data.pointOfIssueCode}});
  if(value('selected-tenant')!==tenant)throw new Error('La configuración se guardó en el cliente anterior. Ábrelo para consultar el resultado; no repitas el alta.');
  result(configured);await loadFiscalOverview();form.dataset.successMessage='Configuración guardada. Utiliza el pointOfIssueId devuelto para facturar. El certificado se importa por separado.';
});
element('fiscal-taxpayer-choice').addEventListener('change',selectFiscalTaxpayer);
onClick('refresh-fiscal',loadFiscalOverview);

type View = 'clients'|'detail'|'account'|'operations';
function showView(view:View){
  for(const [id,visible] of [['client-directory',view==='clients'],['organisation-workspace',view==='detail'],['customer-tools',view==='detail'],['account-view',view==='account'],['operations-view',view==='operations']] as const)element(id).hidden=!visible;
  for(const id of ['clients','account','operations'])element('nav-'+id).setAttribute('aria-current',String(view===id || (id==='clients'&&view==='detail')));
  element('credentials-section').hidden=true;element('new-credentials').textContent='';
  element('result-section').hidden=true;
}
for(const view of ['clients','account','operations'] as const)onClick('nav-'+view,async()=>{showView(view);if(view==='operations')await loadOperations();});
onClick('back-clients',async()=>showView('clients'));

function showDetail(tab:'access'|'business'){
 element('access-detail').hidden=tab!=='access';element('customer-tools').hidden=tab!=='business';
 element('tab-access').setAttribute('aria-current',String(tab==='access'));element('tab-business').setAttribute('aria-current',String(tab==='business'));
}
onClick('tab-access',async()=>showDetail('access'));
onClick('tab-business',async()=>showDetail('business'));

async function loadOperations(){
 const metrics=element('operations-metrics');metrics.textContent='Cargando medidas…';element('operations-activity').textContent='';
 try {
  const data=await (await request('/api/v1/operator/overview')).json();
  metrics.textContent='';element('operations-time').textContent='Consulta: '+data.observedAt;
  row(metrics,'Solicitudes HTTP desde el inicio: '+data.httpRequestsSinceStartup);
  row(metrics,'Respuestas HTTP 4xx/5xx desde el inicio: '+data.httpErrorsSinceStartup);
  const labels:Record<string,string>={'emitta.outbox.pending':'Eventos Outbox pendientes','emitta.ride.pending':'PDF pendientes','emitta.processing.oldest.pending.seconds':'Trabajo pendiente más antiguo (segundos)','emitta.database.available':'PostgreSQL disponible (1 sí / 0 no)','emitta.redis.probe.available':'Redis disponible (1 sí / 0 no)','hikaricp.connections.active':'Conexiones PostgreSQL ocupadas','hikaricp.connections.pending':'Solicitudes esperando conexión'};
  for(const [key,label] of Object.entries(labels))row(metrics,label+': '+(data.gauges[key]??'Sin medición'));
  const sampled=data.gauges['emitta.observability.sample.timestamp.seconds'];
  row(metrics,sampled>0?'Última muestra de infraestructura: '+new Date(sampled*1000).toISOString():'Infraestructura: todavía no hay muestra; no interpretes los ceros como disponibilidad.');
  const activity=element('operations-activity');
  for(const entry of data.recentActivity)row(activity,entry.at+' · '+entry.action);
  if(!data.recentActivity.length)row(activity,'Sin actividad administrativa registrada.');
 }catch(error){metrics.textContent='No se pudo obtener la supervisión. No se muestran valores estimados.';throw error;}
}
onClick('refresh-operations',loadOperations);

element('show-inactive').addEventListener('change',()=>{listTenants().catch(error=>notice(error.message,'error'));});
