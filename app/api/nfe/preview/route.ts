import {authorize} from '../../../../lib/auth';
import {fromNfe} from '../../../../lib/nfe.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const a=await authorize(req,true);if(a instanceof Response)return a;
 try{const raw=await req.text();if(Buffer.byteLength(raw)>2200000)return Response.json({error:'Arquivo muito grande.'},{status:413});const body=JSON.parse(raw);return Response.json(fromNfe(body.xml),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Não foi possível ler a NF-e.'},{status:400,headers:{'Cache-Control':'no-store'}})}
}
