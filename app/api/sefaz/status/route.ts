export const runtime='nodejs';
export const maxDuration=60;
import {authorize} from '../../../../lib/auth';
export async function POST(req:Request){const denied=await authorize(req,true);if(denied instanceof Response)return denied;
 if(req.headers.get('Origin')!==new URL(req.url).origin)return Response.json({error:'Origem inválida'},{status:403});
 const b=await req.json() as {environment?:string};
 if(!['test','production'].includes(b.environment||''))return Response.json({error:'Ambiente inválido'},{status:400});
 const config=process.env;const server=config.FISCAL_SERVER_URL,token=config.FISCAL_SERVER_TOKEN;
 if(!server||!token)return Response.json({error:'O servidor fiscal próprio ainda não está conectado. É necessário hospedar o serviço e configurar o certificado A1 com segurança.'},{status:503});
 try{const origin=new URL(server);if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash)throw Error('Configuração inválida');const r=await fetch(new URL('/v1/status',origin),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({environment:b.environment}),signal:AbortSignal.timeout(35000),redirect:'error'});if(!r.ok)throw Error('Consulta indisponível');const result=await r.json() as {cStat?:string;xMotivo?:string;environment?:string};if(result.environment!==b.environment||!result.cStat)throw Error('Resultado inválido');return Response.json({cStat:result.cStat,xMotivo:result.xMotivo,environment:result.environment,operational:result.cStat==='107'});
 }catch{return Response.json({error:'Não foi possível consultar a SEFAZ pelo servidor fiscal. Verifique a configuração e tente novamente.'},{status:502})}
}
