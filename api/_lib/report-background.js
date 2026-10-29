/* Long-running premium reports are started once and polled over short requests.
 * Uses OpenAI Responses background mode with store:false; provider retains
 * response state temporarily for retrieval, not as a permanent transcript.
 */
export function responseIsPending(response){return ['queued','in_progress'].includes(response?.status);}
export function extractCompletedJson(response){
 if(response?.status!=='completed')throw Error(`Report generation ended with status ${response?.status||'unknown'}.`);
 const raw=(response.output||[]).filter(x=>x.type==='message')
  .flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('');
 if(!raw.trim())throw Error('Report generation returned no content.');
 try{return JSON.parse(raw);}catch{throw Error('Report generation returned incomplete structured content.');}
}
export function reportUsage(response){return {result:extractCompletedJson(response),model:response.model||'',usage:{prompt_tokens:response.usage?.input_tokens||0,completion_tokens:response.usage?.output_tokens||0}};}
export function reportStatusLabel(stage){return stage==='interview'?'Preparing role-specific interview topics…':stage==='queued'?'Your detailed report has been queued…':stage==='in_progress'?'Writing your competency-based report…':'Preparing your report…';}
