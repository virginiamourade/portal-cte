import {authorize} from '../../../../lib/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const a=await authorize(req);if(a instanceof Response)return a;
 const headers={'Cache-Control':'no-store'};
 const server=process.env.FISCAL_SERVER_URL,token=process.env.FISCAL_SERVER_TOKEN;
 if(!server||!token)return Response.json({error:'Configure o endereço e o token do servidor fiscal na hospedagem.'},{status:503,headers});
 try{
  const url=new URL(server);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error();
  const res=await fetch(new URL('/health',url),{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw Error();
  const data=await res.json();
  if(typeof data.certificateLoaded!=='boolean'||data.uf!=='SP')throw Error();
  return Response.json({connected:true,certificateLoaded:data.certificateLoaded,uf:data.uf,emissionReady:false},{headers});
 }catch{return Response.json({error:'Não foi possível verificar o servidor fiscal. Tente testar a conexão novamente.'},{status:502,headers})}
}
