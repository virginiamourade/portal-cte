import {XMLParser,XMLValidator} from 'fast-xml-parser';
const text=value=>typeof value==='string'?value:'';
const many=value=>value===undefined?[]:Array.isArray(value)?value:[value];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
function amount(value,places){const s=text(value);if(!new RegExp(places?'^\\d+(?:\\.\\d{1,'+places+'})?$':'^\\d+$').test(s))return null;const [whole,frac='']=s.split('.');return BigInt(whole)*10n**BigInt(places)+BigInt(frac.padEnd(places,'0'));}
function sum(values,places){const parsed=values.map(v=>amount(v,places));if(!values.length||parsed.some(v=>v===null))return '';const value=parsed.reduce((a,b)=>a+b,0n).toString().padStart(places+1,'0');return places?value.slice(0,-places)+'.'+value.slice(-places):value;}
export function fromNfe(xml){
 if(typeof xml!=='string'||Buffer.byteLength(xml)>2000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('Envie um XML válido de NF-e com até 2 MB.');
 const parsed=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false}).parse(xml);
 const proc=parsed.nfeProc,inf=proc?.NFe?.infNFe,prot=proc?.protNFe?.infProt,ide=inf?.ide;
 if(!object(proc)||!object(inf)||!object(prot)||!object(ide)||proc['@_versao']!=='4.00'||inf['@_versao']!=='4.00'||ide.mod!=='55'||!['1','2'].includes(ide.tpAmb)||!['100','150'].includes(prot.cStat))throw Error('Envie uma NF-e modelo 55, versão 4.00, com protocolo de autorização no arquivo (nfeProc).');
 const key=text(prot.chNFe);
 if(!/^\d{44}$/.test(key)||inf['@_Id']!=='NFe'+key||!text(prot.nProt)||(prot.tpAmb&&prot.tpAmb!==ide.tpAmb))throw Error('A chave ou o ambiente da NF-e não corresponde ao protocolo.');
 if(ide.tpNF!=='1')throw Error('A importação automática aceita notas de saída. Notas de entrada precisam de análise dos participantes.');
 const data={environment:'test',type:'Normal',modal:'Rodoviário',serviceType:'0',nfe:key,taker:'',takerIndicator:'',value:'',receivable:'',cfop:'',icmsCst:'',icmsRate:'',cst:'',classification:'',base:'',ibsUF:'',ibsCity:'',cbs:'',taxNotes:''};
 const warnings=['Revise os participantes e o trajeto real do transporte.','Informe o tomador, o valor do frete, o CFOP e a tributação do CT-e. A modalidade de frete da NF-e não define o tomador automaticamente.','O protocolo foi lido do arquivo; autenticidade, assinatura e situação atual não foram consultadas na SEFAZ.'];
 for(const [tag,prefix,addressTag]of [['emit','sender','enderEmit'],['dest','recipient','enderDest']]){
  const person=inf[tag],address=person?.[addressTag];
  if(!object(person)||!object(address)||!text(person.xNome)||!text(person.CNPJ||person.CPF))throw Error('A NF-e precisa conter emitente e destinatário com identificação e endereço.');
  if(address.cPais&&address.cPais!=='1058')throw Error('Operações com participante no exterior ainda não têm preenchimento automático.');
  data[prefix]=text(person.xNome);data[prefix+'Id']=text(person.CNPJ||person.CPF);data[prefix+'IE']=text(person.IE);data[prefix+'Phone']=text(address.fone);data[prefix+'Email']=text(person.email);
  for(const [target,source]of [['Street','xLgr'],['Number','nro'],['Complement','xCpl'],['District','xBairro'],['City','xMun'],['CityCode','cMun'],['UF','UF'],['Zip','CEP']])data[prefix+target]=text(address[source]);
 }
 for(const [tag,prefix,fallback]of [['retirada','origin','enderEmit'],['entrega','destination','enderDest']]){
  const address=inf[tag]||(fallback==='enderEmit'?inf.emit.enderEmit:inf.dest.enderDest);
  data[prefix]=text(address.xMun);data[prefix+'Code']=text(address.cMun);data[prefix+'UF']=text(address.UF);
  if(inf[tag])warnings.push(`Local de ${tag==='retirada'?'retirada':'entrega'} informado na NF-e: confira o trajeto sugerido.`);
 }
 const total=inf.total?.ICMSTot?.vNF;
 data.cargoValue=amount(total,2)!==null?text(total):'';
 if(!data.cargoValue)warnings.push('Valor total da NF-e ausente ou inválido: informe o valor da carga.');
 const volumes=many(inf.transp?.vol);data.weight=sum(volumes.map(v=>v.pesoB),3);data.volumes=sum(volumes.map(v=>v.qVol),0);data.cargoCategory=[...new Set(volumes.map(v=>text(v.esp)).filter(Boolean))].join(', ');
 if(!data.weight)warnings.push('Peso bruto não informado para todos os volumes: preencha o peso.');
 if(!data.volumes)warnings.push('Quantidade de volumes ausente ou incompleta.');
 const products=[...new Set(many(inf.det).map(d=>text(d.prod?.xProd)).filter(Boolean))];data.product=products.length===1?products[0]:'';
 if(products.length!==1)warnings.push('Há vários produtos ou descrição ausente. Informe o produto predominante da carga.');
 return {data,source:{number:text(ide.nNF),series:text(ide.serie),environment:ide.tpAmb==='1'?'production':'test',products},warnings};
}
