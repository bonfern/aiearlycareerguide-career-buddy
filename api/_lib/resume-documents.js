// Dependency-free resume document exporters. DOCX: editable Office Open XML.
// PDF: simple ATS-friendly single-column document with Helvetica fonts.
import zlib from 'node:zlib';
const t=x=>String(x??'').replace(/\s+/g,' ').trim();
const xml=x=>t(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function paragraphs(doc){
 const rows=[['Career Profile','title'],[doc.headline,'subtitle'],['Professional Summary','heading'],[doc.summary,'normal'],['Core Skills','heading'],[(doc.coreSkills||[]).join(' | '),'normal']];
 for(const role of doc.experience||[]){rows.push(['Professional Experience','heading'],[[role.role,role.employer,role.period].filter(Boolean).join(' · '),'subtitle']);for(const b of role.bullets||[])rows.push(['• '+b,'normal']);}
 if(doc.education?.length){rows.push(['Education','heading']);for(const e of doc.education)rows.push([e,'normal']);}
 if(doc.certifications?.length){rows.push(['Certifications','heading']);for(const e of doc.certifications)rows.push([e,'normal']);}
 rows.push(['Review notes — confirm before using','heading']);for(const item of doc.missingEvidence||[])rows.push(['• '+item,'normal']);return rows.filter(([x])=>t(x));
}
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let j=0;j<8;j++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}return (crc^0xffffffff)>>>0;}
function zip(files){const locals=[],central=[];let offset=0;
 for(const [name,content] of Object.entries(files)){
  const fileName=Buffer.from(name),raw=Buffer.from(content),data=zlib.deflateRawSync(raw,{level:6}),checksum=crc32(raw);
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0,6);local.writeUInt16LE(8,8);
  local.writeUInt32LE(checksum,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(fileName.length,26);
  locals.push(local,fileName,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0,8);c.writeUInt16LE(8,10);c.writeUInt32LE(checksum,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(fileName.length,28);c.writeUInt32LE(offset,42);
  central.push(c,fileName);offset+=local.length+fileName.length+data.length;
 }
 const centralBytes=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);end.writeUInt32LE(centralBytes.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,centralBytes,end]);
}
export function buildResumeDocx(doc){
 const content=paragraphs(doc).map(([value,style])=>`<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${xml(value)}</w:t></w:r></w:p>`).join('');
 const document=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${content}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="960" w:right="1030" w:bottom="940" w:left="1030"/></w:sectPr></w:body></w:document>`;
 const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="130"/></w:pPr><w:rPr><w:b/><w:color w:val="142449"/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="90"/></w:pPr><w:rPr><w:b/><w:color w:val="4E498D"/><w:sz w:val="23"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="heading"><w:name w:val="Heading"/><w:pPr><w:spacing w:before="200" w:after="90"/></w:pPr><w:rPr><w:b/><w:color w:val="3D2B85"/><w:sz w:val="25"/></w:rPr></w:style></w:styles>`;
 return zip({'[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/_rels/document.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  'word/document.xml':document,'word/styles.xml':styles});
}
const ascii=s=>t(s).replace(/[()\\]/g,c=>'\\'+c).replace(/[^\x20-\x7e]/g,c=>({'•':'-','–':'-','—':'-','’':"'"}[c]||' '));
function lines(raw,n=88){const words=t(raw).split(' '),out=[];let line='';for(const word of words){if(line&&line.length+word.length+1>n){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out;}
export function buildResumePdf(doc){const pages=[];let commands=[],y=778;
 const draw=(s,size=10,bold=false)=>{for(const line of lines(s,size>13?66:92)){if(y<70){pages.push(commands);commands=[];y=778;}commands.push(`BT /${bold?'B':'R'} ${size} Tf 0.08 0.14 0.27 rg 1 0 0 1 46 ${y} Tm (${ascii(line)}) Tj ET`);y-=size+5;}};
 for(const [value,style] of paragraphs(doc)){if(style==='heading')y-=10;draw(value,style==='title'?18:style==='heading'?12:style==='subtitle'?11:10,style!=='normal');y-=style==='heading'?5:2;}
 if(commands.length)pages.push(commands);
 const objs=[null],add=s=>(objs.push(s),objs.length-1);const catalog=add(''),root=add('');const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');const ids=[];
 for(const cmds of pages){const stream=cmds.join('\n');const content=add(`<< /Length ${Buffer.byteLength(stream,'latin1')} >>\nstream\n${stream}\nendstream`);ids.push(add(`<< /Type /Page /Parent ${root} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /R ${f1} 0 R /B ${f2} 0 R >> >> /Contents ${content} 0 R >>`));}
 objs[root]=`<< /Type /Pages /Kids [${ids.map(id=>id+' 0 R').join(' ')}] /Count ${ids.length} >>`;objs[catalog]=`<< /Type /Catalog /Pages ${root} 0 R >>`;
 const bytes=[Buffer.from('%PDF-1.4\n')],offsets=[0];let count=bytes[0].length;for(let i=1;i<objs.length;i++){offsets[i]=count;const chunk=Buffer.from(`${i} 0 obj\n${objs[i]}\nendobj\n`,'latin1');bytes.push(chunk);count+=chunk.length;}
 let trailer=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;for(let i=1;i<objs.length;i++)trailer+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;trailer+=`trailer\n<< /Size ${objs.length} /Root ${catalog} 0 R >>\nstartxref\n${count}\n%%EOF`;
 bytes.push(Buffer.from(trailer,'latin1'));return Buffer.concat(bytes);
}
