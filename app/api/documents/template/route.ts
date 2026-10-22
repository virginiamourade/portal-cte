import {authorize} from '../../../../lib/auth';
import {templateFromXml} from '../../../../lib/documents.mjs';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const a=await authorize(req,true);if(a instanceof Response)return a;
 try{const raw=await req.text();if(Buffer.byteLength(raw)>2200000)return Response.json({error:'XML muito grande.'},{status:413});
 const body=JSON.parse(raw);return Response.json({template:templateFromXml(body.xml)},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Não foi possível preparar o modelo.'},{status:400})}
}
