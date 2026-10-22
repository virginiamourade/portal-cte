import {XMLParser,XMLValidator} from 'fast-xml-parser';
export function imported(xml){if(typeof xml!=='string'||Buffer.byteLength(xml,'utf8')>2000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('XML inválido ou maior que 2 MB.');const x=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false}).parse(xml);const proc=x.cteProc,inf=proc?.CTe?.infCte,prot=proc?.protCTe?.infProt;const key=prot?.chCTe;if(!inf||!prot||!/^\d{44}$/.test(key||'')||!['100','150'].includes(prot.cStat)||!['1','2'].includes(inf.ide?.tpAmb)||prot.tpAmb!==inf.ide.tpAmb||key!==String(inf['@_Id']||'').replace(/^CTe/,''))throw Error('Importe um cteProc com protocolo, chave e ambiente correspondentes.');return {number:inf.ide.nCT,series:inf.ide.serie,date:inf.ide.dhEmi?.slice(0,10),environment:inf.ide.tpAmb==='1'?'production':'test',status:'imported',recipient:inf.dest?.xNome||'',sender:inf.rem?.xNome||'',origin:inf.ide.xMunIni||'',destination:inf.ide.xMunFim||'',value:inf.vPrest?.vTPrest||'0',cfop:inf.ide.CFOP||'',key,protocol:prot.nProt,notes:inf.compl?.xObs||'',ibsCbs:!!inf.imp?.IBSCBS,issuer:inf.emit?.CNPJ||inf.emit?.CPF||''};}
export function draft(data){if(!data||!['production','test'].includes(data.environment)||typeof data.recipient!=='string'||!data.recipient.trim()||!Number.isFinite(Number(data.value))||Number(data.value)<0)throw Error('Preencha destinatário e valor válido.');const result={...data,status:'draft'};delete result.key;delete result.protocol;delete result.id;return result;}

// Extract only operation data. Authorization and numbering never carry over.
export function templateFromXml(xml){
 imported(xml);
 const parsed=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false}).parse(xml);
 const inf=parsed.cteProc.CTe.infCte,ide=inf.ide;
 const data={environment:'test',status:'draft',number:'',series:ide.serie||'1',date:new Date().toISOString().slice(0,10),type:'Normal',modal:'Rodoviário',cfop:ide.CFOP||'',nature:ide.natOp||'',serviceType:ide.tpServ||'0',origin:ide.xMunIni||'',originCode:ide.cMunIni||'',originUF:ide.UFIni||'',destination:ide.xMunFim||'',destinationCode:ide.cMunFim||'',destinationUF:ide.UFFim||'',dispatchCity:ide.xMunEnv||'',dispatchCode:ide.cMunEnv||'',dispatchUF:ide.UFEnv||'',withdrawal:ide.retira||'1',withdrawalDetails:ide.xDetRetira||'',takerIndicator:ide.indIEToma||'',taker:['Remetente','Expedidor','Recebedor','Destinatário'][Number(ide.toma3?.toma)]||'Outros',value:'',receivable:'',cargoValue:'',product:inf.infCTeNorm?.infCarga?.proPred||'',cargoCategory:inf.infCTeNorm?.infCarga?.xOutCat||'',weight:'',nfe:'',notes:'',icmsCst:inf.imp?.ICMS?.ICMSSN?.CST||'',simpleNationalIndicator:inf.imp?.ICMS?.ICMSSN?.indSN||'',rntrc:inf.infCTeNorm?.infModal?.rodo?.RNTRC||''};
 if(ide.modal!=='01'||ide.tpCTe!=='0'||ide.tpServ!=='0')throw Error('O modelo de preenchimento aceita CT-e rodoviário normal com serviço normal.');
 for(const [tag,prefix,addressTag]of [['rem','sender','enderReme'],['dest','recipient','enderDest'],['exped','dispatcher','enderExped'],['receb','receiver','enderReceb'],['ide.toma4','taker','enderToma']]){
  const person=tag==='ide.toma4'?ide.toma4:inf[tag];if(!person)continue;
  data[prefix==='taker'?'takerName':prefix]=person.xNome||'';data[prefix+'Id']=person.CNPJ||person.CPF||'';data[prefix+'IE']=person.IE||'';data[prefix+'Phone']=person.fone||'';data[prefix+'Email']=person.email||'';
  const address=person[addressTag]||{};
  for(const [target,source]of [['Street','xLgr'],['Number','nro'],['Complement','xCpl'],['District','xBairro'],['City','xMun'],['CityCode','cMun'],['UF','UF'],['Zip','CEP']])data[prefix+target]=address[source]||'';
 }
 return data;
}
