/* Owner-only feedback dashboard; all permissions are enforced by /api/service. */
const $=id=>document.getElementById(id);
const items=[];let cursor=null,loading=false;
const api=async(action,body)=>{
 const response=await fetch(`/api/service?action=${action}`,{credentials:'same-origin',method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||`Request failed (${response.status})`);return result;
};
const node=(tag,text='',cls='')=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const stageName={free:'Free Snapshot',premium:'Premium Assessment',chat:'Career Buddy Chat'};
function render(){
 $('shownCount').textContent=String(items.length);$('averageRating').textContent=items.length?(items.reduce((sum,i)=>sum+Number(i.rating||0),0)/items.length).toFixed(1)+'/5':'—';$('reviewCount').textContent=String(items.filter(i=>i.rating<=2).length);
 const root=$('feedbackRows');root.replaceChildren();let count=0;
 for(const item of items){if($('stageFilter').value!=='all'&&$('stageFilter').value!==item.stage)continue;if($('statusFilter').value==='reviewed'&&!item.reviewedAt)continue;if($('statusFilter').value==='unreviewed'&&item.reviewedAt)continue;if(['visible','hidden'].includes($('statusFilter').value)&&$('statusFilter').value!==item.status)continue;
  count++;const card=node('section','','feedback-entry');const header=node('header');header.append(node('strong',`${stageName[item.stage]||item.stage} · ${item.rating}/5 stars`),node('small',new Date(item.createdAt).toLocaleString('en-IN')));card.append(header);
  card.append(node('p',item.comment||'No written comment.'));
  card.append(node('small',`Category: ${item.category} · ${item.status||'visible'} · ${item.reviewedAt?'Reviewed':'Needs review'} · Account: ${item.email||'not recorded'}`));
  const actions=node('div','','feedback-actions');for(const op of [item.reviewedAt?'unreview':'review',item.status==='hidden'?'restore':'hide','delete']){const b=node('button',op==='delete'?'Delete permanently':op==='hide'?'Hide':op==='restore'?'Restore':op==='review'?'Mark reviewed':'Reopen',op==='delete'?'danger':'');b.onclick=()=>moderate(item,op);actions.append(b);}card.append(actions);root.append(card);
 }
 if(!count)root.append(node('p','No feedback matches these filters.'));
 $('loadMore').hidden=!cursor;
}
async function loadMore(){if(loading)return;loading=true;$('loadMore').disabled=true;$('adminStatus').textContent='Loading feedback…';try{
 const url='/api/service?action=feedbackList'+(cursor?'&cursor='+encodeURIComponent(cursor):'');
 const response=await fetch(url,{credentials:'same-origin'});const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Access denied.');
 items.push(...(result.items||[]));cursor=result.nextCursor||null;$('adminContent').hidden=false;$('adminStatus').textContent='Feedback available for administrator review.';render();
 }catch(e){$('adminStatus').textContent=e.message;}finally{loading=false;$('loadMore').disabled=false;}}
async function moderate(item,operation){
 if(operation==='delete'&&!confirm('Permanently delete this feedback? This cannot be undone.'))return;
 try{await api('feedbackModerate',{id:item.id,operation});if(operation==='delete')items.splice(items.indexOf(item),1);else if(operation==='review')item.reviewedAt=Date.now();else if(operation==='unreview')item.reviewedAt=null;else item.status=operation==='hide'?'hidden':'visible';render();$('adminStatus').textContent='Moderation saved.';}catch(e){$('adminStatus').textContent=e.message;}
}
function exportCsv(){const columns=['id','stage','rating','category','comment','createdAt','updatedAt','status','email'];const quote=v=>'"'+String(v??'').replaceAll('"','""').replace(/^[=+@\-]/,'\u0027$&')+'"';const csv=[columns.join(','),...items.map(x=>columns.map(k=>quote(x[k])).join(','))].join('\r\n');const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='career-buddy-feedback.csv';link.click();URL.revokeObjectURL(link.href);}
$('stageFilter').onchange=render;$('statusFilter').onchange=render;$('loadMore').onclick=loadMore;$('csvExport').onclick=exportCsv;loadMore();
