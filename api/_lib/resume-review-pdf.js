// A4, self-contained PDF for an AI-generated review, not a rewritten resume.
// Deliberately excludes the submitted resume text and contact information.
import {REPORT_BRAND_LOGO} from './report-brand.js';
const sanitize=s=>String(s||'').replace(/\s+/g,' ').replace(/[\r\n]/g,' ').trim();
const ascii=s=>sanitize(s).replace(/[^\x20-\x7e]/g,c=>({'–':'-','—':'-','’':"'",'‘':"'",'₹':'INR ','•':'-','…':'...'}[c]||' '));
const pdfEsc=s=>ascii(s).replace(/[\\()]/g,'\\$&');
const wrap=(value,size=95)=>{
 const result=[];let row='';
 for(const word of ascii(value).split(' ')){
  if(row&&row.length+word.length+1>size){result.push(row);row=word;}else row+=(row?' ':'')+word;
 }if(row)result.push(row);return result;
};
export function buildResumeReviewPdf(review,role=''){
 if(!review||typeof review.headline!=='string')throw Error('A saved resume review is required.');
 const pages=[];let commands=[],y=735;
 const ensure=n=>{if(y<n+62){pages.push(commands);commands=[];y=735;}};
 const line=(text,{size=10,bold=false,color='0.11 0.18 0.33',leading=15,indent=0}={})=>{
  for(const item of wrap(text,Math.max(65,Math.floor(103-size/2)-indent/5))){ensure(leading);commands.push(`BT /${bold?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${48+indent} ${y} Tm (${pdfEsc(item)}) Tj ET`);y-=leading;}
 };
 const section=(label,items)=>{ensure(45);y-=14;line(label,{size:12,bold:true,color:'0.03 0.45 0.46',leading:20});for(const item of items||[])line('- '+item,{indent:10});};
 line('AYESHA - YOUR CAREER BUDDY',{size:18,bold:true,leading:28});
 line('Resume Review and Improvement Priorities',{size:13,bold:true,color:'0.03 0.45 0.46',leading:22});
 if(role)line('Target role: '+role,{size:10,leading:18});
 line(review.headline,{size:11,bold:true,leading:17});
 section('What is working',review.strengths);
 section('Information and evidence to add',review.missingDetails);
 section('Corrections and ATS improvements',review.corrections);
 section('Example of clearer wording',[review.exampleImprovement]);
 section('Your next actions',review.nextActions);
 ensure(55);y-=20;line('Based on supplied resume text only. Verify all facts and examples before use.',{size:9,color:'0.3 0.35 0.44'});
 pages.push(commands);
 const objects=[null],add=body=>{objects.push(Buffer.isBuffer(body)?body:Buffer.from(body,'latin1'));return objects.length-1;};
 const catalog=add(''),root=add(''),fontRegular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),fontBold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const logo=Buffer.from(REPORT_BRAND_LOGO.jpegBase64,'base64');
 const image=add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${REPORT_BRAND_LOGO.width} /Height ${REPORT_BRAND_LOGO.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`,'latin1'),logo,Buffer.from('\nendstream','latin1')]));
 const refs=[];
 pages.forEach((content,i)=>{
  const stream=`q 0.055 0.1 0.23 rg 0 785 595 57 re f Q\nq 85 0 0 33 46 796 cm /Logo Do Q\n${content.join('\n')}\nBT /F1 8 Tf 0.4 0.45 0.5 rg 1 0 0 1 47 37 Tm (Ayesha - AI Early Career Guide | Page ${i+1} of ${pages.length}) Tj ET`;
  const bytes=Buffer.from(stream,'latin1');const contentId=add(Buffer.concat([Buffer.from(`<< /Length ${bytes.length} >>\nstream\n`),bytes,Buffer.from('\nendstream')]));
  refs.push(add(`<< /Type /Page /Parent ${root} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> /XObject << /Logo ${image} 0 R >> >> /Contents ${contentId} 0 R >>`));
 });
 objects[root]=Buffer.from(`<< /Type /Pages /Count ${refs.length} /Kids [${refs.map(i=>i+' 0 R').join(' ')}] >>`,'latin1');
 objects[catalog]=Buffer.from(`<< /Type /Catalog /Pages ${root} 0 R >>`,'latin1');
 const parts=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=[0];
 for(let i=1;i<objects.length;i++){offsets.push(Buffer.concat(parts).length);parts.push(Buffer.from(`${i} 0 obj\n`),objects[i],Buffer.from('\nendobj\n'));}
 const position=Buffer.concat(parts).length;
 parts.push(Buffer.from(`xref\n0 ${objects.length}\n0000000000 65535 f \n`));
 for(let i=1;i<objects.length;i++)parts.push(Buffer.from(String(offsets[i]).padStart(10,'0')+' 00000 n \n'));
 parts.push(Buffer.from(`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${position}\n%%EOF`));
 return Buffer.concat(parts);
}
