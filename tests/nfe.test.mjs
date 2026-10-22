import test from 'node:test';
import assert from 'node:assert/strict';
import {fromNfe} from '../lib/nfe.mjs';
const key='1'.repeat(44);
const address='<xLgr>Rua exemplo</xLgr><nro>1</nro><xBairro>Centro</xBairro><cMun>3106200</cMun><xMun>Cidade</xMun><UF>MG</UF><cPais>1058</cPais>';
const party=tag=>`<${tag}><CNPJ>12345678000195</CNPJ><xNome>Empresa exemplo</xNome><ender${tag==='emit'?'Emit':'Dest'}>${address}</ender${tag==='emit'?'Emit':'Dest'}></${tag}>`;
const xml=()=>`<nfeProc versao="4.00"><NFe><infNFe versao="4.00" Id="NFe${key}"><ide><mod>55</mod><tpAmb>1</tpAmb><tpNF>1</tpNF><nNF>7</nNF><serie>1</serie></ide>${party('emit')}${party('dest')}<det><prod><xProd>Mercadoria</xProd><CFOP>6102</CFOP></prod></det><total><ICMSTot><vNF>10.20</vNF><vFrete>99.99</vFrete></ICMSTot></total><transp><modFrete>1</modFrete><vol><pesoB>1.100</pesoB><qVol>2</qVol></vol><vol><pesoB>2.200</pesoB><qVol>3</qVol></vol></transp></infNFe></NFe><protNFe><infProt><chNFe>${key}</chNFe><nProt>123</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;
test('NF-e preenche carga e participantes sem importar frete, CFOP ou autorização de CT-e',()=>{
 const {data}=fromNfe(xml());assert.equal(data.sender,'Empresa exemplo');assert.equal(data.senderCityCode,'3106200');assert.equal(data.cargoValue,'10.20');assert.equal(data.weight,'3.300');assert.equal(data.volumes,'5');assert.equal(data.nfe,key);assert.equal(data.environment,'test');
 for(const name of ['value','receivable','cfop','taker','icmsCst'])assert.equal(data[name],'');for(const name of ['key','protocol','id'])assert.equal(data[name],undefined);
});
test('NF-e rejeita documentos incompatíveis, protocolo divergente e XML inseguro',()=>{
 for(const source of [xml().replace('<mod>55</mod>','<mod>57</mod>'),xml().replace('<cStat>100</cStat>','<cStat>101</cStat>'),xml().replace(`Id="NFe${key}"`,'Id="NFe123"'),xml().replace('<tpNF>1</tpNF>','<tpNF>0</tpNF>'),'<!DOCTYPE foo>'+xml(),'x'.repeat(2000001)])assert.throws(()=>fromNfe(source));
});
test('NF-e usa retirada/entrega e não soma peso parcialmente informado',()=>{
 const source=xml().replace('<pesoB>2.200</pesoB>','').replace('</infNFe>','<entrega><xMun>Local entrega</xMun><cMun>4106902</cMun><UF>PR</UF></entrega></infNFe>');
 const result=fromNfe(source);assert.equal(result.data.destination,'Local entrega');assert.equal(result.data.destinationUF,'PR');assert.equal(result.data.weight,'');assert.ok(result.warnings.some(w=>w.includes('Peso bruto')));
});
