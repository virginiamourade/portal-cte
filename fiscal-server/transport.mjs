import https from 'node:https';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
export const endpoints = Object.freeze({
 test: 'https://homologacao.nfe.fazenda.sp.gov.br/CTeWS/WS/',
 production: 'https://nfe.fazenda.sp.gov.br/CTeWS/WS/'
});
export function makeRequest(environment,operation,key){
 if(!Object.hasOwn(endpoints,environment))throw new Error('Ambiente inválido');
 const service=operation==='status'?'CTeStatusServicoV4':operation==='consult'?'CTeConsultaV4':null;
 if(!service)throw new Error('Operação inválida');
 if(operation==='consult'&&!/^[0-9A-Z]{44}$/.test(key||''))throw new Error('Chave inválida');
 const tpAmb=environment==='production'?'1':'2';
 const payload=operation==='status'?`<consStatServCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><tpAmb>${tpAmb}</tpAmb><cUF>35</cUF><xServ>STATUS</xServ></consStatServCTe>`:`<consSitCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><tpAmb>${tpAmb}</tpAmb><xServ>CONSULTAR</xServ><chCTe>${key}</chCTe></consSitCTe>`;
 const namespace=`http://www.portalfiscal.inf.br/cte/wsdl/${service}`;
 const action=`${namespace}/${operation==='status'?'cteStatusServicoCT':'cteConsultaCT'}`;
 const body=`<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><cteDadosMsg xmlns="${namespace}">${payload}</cteDadosMsg></soap12:Body></soap12:Envelope>`;
 return {url:endpoints[environment]+service+'.asmx',action,body,environment,operation};
}
export function extractResponse(xml,environment,operation){
 if(xml.length>2000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw new Error('Resposta XML inválida');
 const parser=new XMLParser({removeNSPrefix:true,parseTagValue:false});
 function find(value,name){if(!value||typeof value!=='object')return null;if(value[name])return value[name];for(const v of Object.values(value)){const found=find(v,name);if(found)return found}return null}
 let parsed=parser.parse(xml);const root=operation==='status'?'retConsStatServCTe':'retConsSitCTe';let result=find(parsed,root);
 if(!result){const message=find(parsed,'cteResultMsg');if(typeof message==='string'&&XMLValidator.validate(message)===true)result=find(parser.parse(message),root)}
 if(!result||result.tpAmb!==(environment==='production'?'1':'2')||!result.cStat)throw new Error('Resposta sem resultado no ambiente solicitado');
 return {environment,cStat:result.cStat,xMotivo:result.xMotivo||'',receivedAt:result.dhRecbto||null,operational:operation==='status'&&result.cStat==='107',protocol:operation==='consult'?result.protCTe?.infProt?.nProt||null:undefined};
}
export async function soap(request,certificate,transport=https.request){
 return new Promise((resolve,reject)=>{
 const bytes=Buffer.from(request.body);let settled=false;
 const fail=(error)=>{if(!settled){settled=true;reject(error)}};
 const req=transport(request.url,{method:'POST',pfx:certificate.pfx,passphrase:certificate.password,minVersion:'TLSv1.2',rejectUnauthorized:true,headers:{'Content-Type':`application/soap+xml; charset=utf-8; action="${request.action}"`,'Content-Length':bytes.length}},res=>{
  const chunks=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>2000000){res.destroy();fail(new Error('Resposta excede o limite'));return}chunks.push(chunk)});res.on('error',fail);res.on('end',()=>{if(settled)return;if(res.statusCode!==200){fail(new Error('SEFAZ recusou a conexão'));return}try{const value=extractResponse(Buffer.concat(chunks).toString('utf8'),request.environment,request.operation);settled=true;resolve(value)}catch(e){fail(e)}});
 });
 const deadline=setTimeout(()=>{req.destroy();fail(new Error('Tempo limite de consulta excedido'))},30000);deadline.unref();req.on('close',()=>clearTimeout(deadline));req.on('error',fail);req.end(bytes);
 });
}
