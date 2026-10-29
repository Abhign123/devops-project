const statuses=["To Do","In Progress","In Review","Done"];
const $=id=>document.getElementById(id);
let tasks=[];
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function soapEnvelope(body){return `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:s="http://example.com/scrum"><soap:Body>${body}</soap:Body></soap:Envelope>`;}
function tagValue(node,tag){return node.getElementsByTagNameNS("*",tag)[0]?.textContent||"";}
function logXml(text){$("soapLog").textContent=text;}
async function soapCall(method,inner=""){
  const body=soapEnvelope(`<s:${method}>${inner}</s:${method}>`);
  const response=await fetch("/soap",{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8","SOAPAction":method},body});
  const xml=await response.text();logXml(xml);
  const doc=new DOMParser().parseFromString(xml,"text/xml");
  const fault=doc.getElementsByTagNameNS("*","Fault")[0];
  if(fault)throw new Error(tagValue(fault,"faultstring")||"SOAP service error");
  return doc;
}
async function loadTasks(){
  const doc=await soapCall("GetTasks");
  tasks=[...doc.getElementsByTagNameNS("*","task")].map(n=>({id:Number(tagValue(n,"id")),title:tagValue(n,"title"),assignee:tagValue(n,"assignee"),priority:tagValue(n,"priority"),status:tagValue(n,"status")}));
  render();$("serviceStatus").textContent="Connected · SOAP OK";
}
function render(){
  $("totalCount").textContent=tasks.length;
  $("todoCount").textContent=tasks.filter(t=>t.status==="To Do").length;
  $("progressCount").textContent=tasks.filter(t=>t.status==="In Progress").length;
  $("doneCount").textContent=tasks.filter(t=>t.status==="Done").length;
  $("boardColumns").innerHTML=statuses.map(status=>{
    const list=tasks.filter(t=>t.status===status);
    return `<div class="column"><div class="column-head"><span>${status}</span><span class="count">${list.length}</span></div>${list.length?list.map(t=>`<article class="task"><div class="task-id">SCRUM-${t.id}</div><h3>${esc(t.title)}</h3><div class="task-meta"><span>${esc(t.assignee)}</span><span class="priority ${esc(t.priority)}">${esc(t.priority)}</span></div><select aria-label="Change status for ${esc(t.title)}" data-status="${t.id}">${statuses.map(s=>`<option ${s===t.status?"selected":""}>${s}</option>`).join("")}</select><div class="task-footer"><button class="delete-task" data-delete="${t.id}">Delete task</button></div></article>`).join(""):`<div class="empty">No tasks</div>`}</div>`;
  }).join("");
}
function showToast(msg){const el=$("toast");el.textContent=msg;el.style.display="block";clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.style.display="none",2400)}
function go(view){document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));$(view).classList.remove("hidden");document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("pageTitle").textContent=({board:"Scrum Board",service:"SOAP Web Service",about:"About Project"})[view];}
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>go(b.dataset.view)));
$("addTaskBtn").addEventListener("click",()=>$("taskForm").classList.remove("hidden"));
$("cancelTask").addEventListener("click",()=>$("taskForm").classList.add("hidden"));
$("taskForm").addEventListener("submit",async e=>{e.preventDefault();try{const title=$("taskTitle").value.trim(),assignee=$("assignee").value.trim(),priority=$("priority").value;if(!title)throw new Error("Enter a task title.");const doc=await soapCall("CreateTask",`<s:title>${esc(title)}</s:title><s:assignee>${esc(assignee)}</s:assignee><s:priority>${priority}</s:priority>`);const taskNode=doc.getElementsByTagNameNS("*","task")[0];if(!taskNode)throw new Error("SOAP response did not contain the created task.");tasks.push({id:Number(tagValue(taskNode,"id")),title:tagValue(taskNode,"title"),assignee:tagValue(taskNode,"assignee"),priority:tagValue(taskNode,"priority"),status:tagValue(taskNode,"status")});render();e.target.reset();$("assignee").value="Developer";$("priority").value="Medium";e.target.classList.add("hidden");showToast("Task created through SOAP.");}catch(err){showToast(err.message);}});
$("boardColumns").addEventListener("change",async e=>{const id=e.target.dataset.status;if(!id)return;try{const doc=await soapCall("UpdateTaskStatus",`<s:id>${id}</s:id><s:status>${e.target.value}</s:status>`);const node=doc.getElementsByTagNameNS("*","task")[0];const updated={id:Number(tagValue(node,"id")),title:tagValue(node,"title"),assignee:tagValue(node,"assignee"),priority:tagValue(node,"priority"),status:tagValue(node,"status")};tasks=tasks.map(t=>t.id===updated.id?updated:t);render();showToast("Status updated through SOAP.");}catch(err){showToast(err.message);render();}});
$("boardColumns").addEventListener("click",async e=>{const id=e.target.dataset.delete;if(!id)return;if(!confirm("Delete this task?"))return;try{await soapCall("DeleteTask",`<s:id>${id}</s:id>`);tasks=tasks.filter(t=>t.id!==Number(id));render();showToast("Task deleted through SOAP.");}catch(err){showToast(err.message);}});
(async()=>{try{await loadTasks()}catch(err){$("serviceStatus").textContent="Connection failed";showToast("Could not connect to SOAP service. Run node server.js.");logXml(err.message)}})();
