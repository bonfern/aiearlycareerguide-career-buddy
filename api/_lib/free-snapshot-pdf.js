/* Career Buddy free snapshot: lightweight, A4, downloadable, content-safe PDF. */
function clean(x){return String(x??'').replace(/\s+/g,' ').trim().replace(/[^\x20-\x7E]/g,c=>({'–':'-','—':'-','•':'-','’':"'",'₹':'INR'}[c]||' ')).replace(/[()\\]/g,c=>'\\'+c);}
function lines(str,max=93){const out=[];let line='';for(const word of clean(str).split(' ')){if(line&&line.length+word.length+1>max){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out;}
export function buildFreeSnapshotPdf(snapshot={}){
 let y=780;let current=[],pages=[];
 const footer=()=>{current.push('0.84 0.88 0.92 RG 46 65 m 549 65 l S',`BT /R 8 Tf 0.42 0.46 0.56 rg 1 0 0 1 48 50 Tm (AI Early Career Guide | Career Buddy | Free Career Snapshot) Tj ET`);};
 const newPage=()=>{if(current.length){footer();pages.push(current);}current=[];y=780;if(pages.length){current.push('BT /B 9 Tf 0.06 0.42 0.29 rg 1 0 0 1 48 783 Tm (AI EARLY CAREER GUIDE | Free Career Snapshot continued) Tj ET');y=752;}};
 const draw=(text,opts={})=>{const {size=10.5,bold=false,color='0.08 0.16 0.31',max=92}=opts;for(const line of lines(text,max)){if(y<92)newPage();current.push(`BT /${bold?'B':'R'} ${size} Tf ${color} rg 1 0 0 1 48 ${y} Tm (${line}) Tj ET`);y-=size+6;}};
 draw('AI EARLY CAREER GUIDE',{size:12,bold:true,color:'0.06 0.42 0.29'});y-=9;draw('Your Free Career Snapshot',{size:21,bold:true,max:55});y-=7;draw('A preliminary starting point for your professional journey',{size:10,color:'0.45 0.5 0.6'});y-=22;
 const section=(name,arr,list=false)=>{
  if(y<155)newPage();draw(name,{size:13,bold:true});y-=7;
  for(const item of arr){
   if(item&&typeof item==='object'&&Array.isArray(item.bullets)){
    if(y<155)newPage();draw(item.title||item.name||'Career priority',{size:10.4,bold:true,max:88});y-=2;
    for(const bullet of item.bullets.slice(0,2)){draw('    - '+bullet,{size:9.4,max:102});y-=2;}
    y-=6;
   }else{draw(list?'- '+item:item,{max:90,size:10});y-=5;}
  }
  y-=11;
 };
 if(snapshot.version>=5){
  section('1. Your career goal and starting point',[snapshot.profileSummary||'Your goal and starting point.']);
  section('Skills important for your target role',snapshot.targetCompetencies||[],true);
  section('Strengths you selected',snapshot.reportedStrengths?.length?snapshot.reportedStrengths:['No strengths selected yet.'],true);
  section('Tools or examples you mentioned',snapshot.reportedExposure?.length?snapshot.reportedExposure:['No specific tools or work examples provided.'],true);
  section('2. Your transferable advantage',[snapshot.transferableAdvantage||'Further examples would help make a more specific connection.']);
  if(snapshot.careerOpportunities?.length)section('3. Career opportunities worth exploring',snapshot.careerOpportunities,true);
  section('4. Your career alignment',[snapshot.careerAlignment||'Your responses give an initial picture of how your skills connect with your goal.']);
  section('5. Your next best moves',snapshot.nextBestMoves||[],true);
  section('6. What a deeper assessment could reveal',snapshot.furtherAssessment||[],true);
  draw('This free snapshot interprets your own answers. It is not a verified competency score.',{size:9,max:100});
  draw('Further scenario-based evaluation is optional and available through Premium.',{size:9,max:100});
 }else{
  section('1. Your professional profile',[snapshot.profileSummary||'No profile summary was generated.']);
  section('2. Skills the target role needs',snapshot.targetCompetencies||[],true);
  const checks=[...(snapshot.furtherAssessment||[])];
  if(checks.length<=4)for(const step of (snapshot.nextSteps||[]).slice(0,2)){if(step?.title&&step?.bullets?.[1])checks.push(`Preparation example: ${step.title} - ${step.bullets[1]}`.slice(0,185));}
  section('3. What we need to check next - optional paid assessment',checks,true);
  draw('These checks are not included in the free snapshot. A paid assessment is optional.',{size:9,max:100});
 }
 footer();pages.push(current);
 const objects=[null],add=s=>(objects.push(s),objects.length-1),root=add(''),kidsRoot=add('');const regular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');const kids=[];
 for(const cmds of pages){const stream=cmds.join('\n');const content=add(`<< /Length ${Buffer.byteLength(stream,'latin1')} >>\nstream\n${stream}\nendstream`);kids.push(add(`<< /Type /Page /Parent ${kidsRoot} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /R ${regular} 0 R /B ${bold} 0 R >> >> /Contents ${content} 0 R >>`));}
 objects[kidsRoot]=`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`;objects[root]=`<< /Type /Catalog /Pages ${kidsRoot} 0 R >>`;
 const buffers=[Buffer.from('%PDF-1.4\n')],offsets=[0];let n=buffers[0].length;for(let i=1;i<objects.length;i++){offsets[i]=n;const b=Buffer.from(`${i} 0 obj\n${objects[i]}\nendobj\n`,'latin1');buffers.push(b);n+=b.length;}
 let last=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)last+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;last+=`trailer\n<< /Size ${objects.length} /Root ${root} 0 R >>\nstartxref\n${n}\n%%EOF`;buffers.push(Buffer.from(last,'latin1'));return Buffer.concat(buffers);
}
