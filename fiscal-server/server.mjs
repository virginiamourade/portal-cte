import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {createSecureContext} from 'node:tls';
import {timingSafeEqual} from 'node:crypto';
import {makeRequest,soap} from './transport.mjs';
const token=process.env.FISCAL_TOKEN;if(!token||token.length<32)throw new Error('Configure FISCAL_TOKEN com pelo menos 32 caracteres.');
const pfx=readFileSync(process.env.A1_PFX_PATH||'/run/secrets/certificado.pfx');
const password=readFileSync(process.env.A1_PASSWORD_PATH||'/run/secrets/a1_password','utf8').replace(/\r?\n$/,'');
createSecureContext({pfx,passphrase:password,minVersion:'TLSv1.2'});
function authenticated(req){const supplied=Buffer.from(req.headers.authorization||'');const expected=Buffer.from('Bearer '+token);return supplied.length===expected.length&&timingSafeEqual(supplied,expected)}
const server=createServer(async(req,res)=>{
 function json(status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
 if(!authenticated(req))return json(401,{error:'Acesso não autorizado'});
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/health')return json(200,{certificateLoaded:true,uf:'SP',capabilities:['status','consult'],emissionReady:false});
 if(req.method!=='POST'||!['/v1/status','/v1/consult'].includes(url.pathname))return json(404,{error:'Operação indisponível'});
 try{let text='';for await(const chunk of req){text+=chunk;if(text.length>10000)return json(413,{error:'Requisição muito grande'})}
 const body=JSON.parse(text);const operation=url.pathname==='/v1/status'?'status':'consult';const request=makeRequest(body.environment,operation,body.key);const result=await soap(request,{pfx,password});json(200,result);
 }catch{json(502,{error:'Consulta não concluída. Verifique certificado, ambiente e conectividade.'})}
});
server.requestTimeout=35000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||8080),process.env.HOST||'127.0.0.1',()=>console.log('Servidor fiscal de consultas iniciado. Emissão e eventos ainda indisponíveis.'));
