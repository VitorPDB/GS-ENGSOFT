import type { RiskType } from './types';

export type ReportStatus='REPORTADO'|'EM_MONITORAMENTO'|'ENCERRADO'|'DESCARTADO';
export interface CommunityReport {
  id:number;requestId:string;type:RiskType;district:string;description:string;
  status:ReportStatus;createdAt:string;updatedAt:string;
}
export const reportLabels:Record<ReportStatus,string>={
  REPORTADO:'Reportado',EM_MONITORAMENTO:'Em monitoramento',ENCERRADO:'Encerrado',DESCARTADO:'Descartado'
};
export const districts=['Vila Esperança','Jardim das Flores','Centro'] as const;
export class ReportInputError extends Error {}

async function request(url:string,clientId:string,path:string,method='GET',body?:unknown):Promise<unknown> {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch(url+path,{method,signal:controller.signal,
      headers:{'Content-Type':'application/json','X-Client-Id':clientId},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(!response.ok) {
      if(response.status===409)throw new Error('Este relato foi atualizado. Recarregue a lista antes de tentar novamente.');
      if(response.status===400)throw new ReportInputError('Confira o risco, o bairro e a descrição de 10 a 500 caracteres.');
      if(response.status===429)throw new Error('Muitos registros enviados. Aguarde antes de tentar novamente.');
      throw new Error('Não foi possível concluir a solicitação. Tente novamente.');
    }
    return response.status===204?null:await response.json();
  } catch(error) {
    if(error instanceof Error&&error.name==='AbortError')throw new Error('O serviço demorou a responder. Seu rascunho foi mantido; tente novamente.');
    if(error instanceof TypeError)throw new Error('Sem resposta do serviço. Seu rascunho foi mantido; tente novamente.');
    throw error;
  } finally {clearTimeout(timer);}
}
const validStatuses=['REPORTADO','EM_MONITORAMENTO','ENCERRADO','DESCARTADO'];
function parseReport(value:unknown):CommunityReport {
  if(!value||typeof value!=='object')throw new Error('O serviço retornou um relato inválido.');
  const r=value as Record<string,unknown>;
  if(!Number.isSafeInteger(r.id)||typeof r.requestId!=='string'||!['FLOOD','HEAT','OUTAGE'].includes(String(r.type))||
     !districts.includes(r.district as typeof districts[number])||typeof r.description!=='string'||
     !validStatuses.includes(String(r.status))||typeof r.createdAt!=='string'||typeof r.updatedAt!=='string'||
     !Number.isFinite(Date.parse(r.createdAt))||!Number.isFinite(Date.parse(r.updatedAt)))throw new Error('O serviço retornou um relato inválido.');
  return r as unknown as CommunityReport;
}
export async function listReports(url:string,clientId:string):Promise<CommunityReport[]> {
  const value=await request(url,clientId,'/api/reports');
  if(!Array.isArray(value))throw new Error('O serviço retornou uma lista inválida.');
  return value.map(parseReport);
}
export async function createReport(url:string,clientId:string,body:{requestId:string;type:RiskType;district:string;description:string}):Promise<CommunityReport> {
  return parseReport(await request(url,clientId,'/api/reports','POST',body));
}
export async function updateReport(url:string,clientId:string,id:number,status:ReportStatus):Promise<CommunityReport> {
  return parseReport(await request(url,clientId,'/api/reports/'+id+'/status','PUT',{status}));
}
