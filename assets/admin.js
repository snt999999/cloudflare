const WORKERS=["Никита П","Андрей Ш","Никита К","Дмитрий П","Роман З"];
const $=id=>document.getElementById(id);
let records=[],current=null,cal=new Date(),activeSection="requests";
const els={
loginPanel:$("loginPanel"),appPanel:$("appPanel"),loginForm:$("loginForm"),passwordInput:$("passwordInput"),loginMessage:$("loginMessage"),logoutBtn:$("logoutBtn"),refreshBtn:$("refreshBtn"),
listBtn:$("listBtn"),calendarBtn:$("calendarBtn"),listView:$("listView"),calendarView:$("calendarView"),requestsBody:$("requestsBody"),calendarGrid:$("calendarGrid"),monthTitle:$("monthTitle"),prevMonth:$("prevMonth"),nextMonth:$("nextMonth"),
searchInput:$("searchInput"),statusFilter:$("statusFilter"),message:$("message"),statTotal:$("statTotal"),statNew:$("statNew"),statToday:$("statToday"),statWork:$("statWork"),dialog:$("requestDialog"),dialogTitle:$("dialogTitle"),requestInfo:$("requestInfo"),
editStatus:$("editStatus"),editM2:$("editM2"),editResponsible:$("editResponsible"),editAdminComment:$("editAdminComment"),saveRequestBtn:$("saveRequestBtn"),exportBtn:$("exportBtn"),
clientsBody:$("clientsBody"),objectsBody:$("objectsBody"),installersBody:$("installersBody"),filesBody:$("filesBody"),exportRequestsBtn:$("exportRequestsBtn"),exportPayrollBtn:$("exportPayrollBtn")
};
const key="solncanet_admin_password_real_v3";
init();

function init(){
 const saved=localStorage.getItem(key);
 if(saved) login(saved);
 els.loginForm.addEventListener("submit",e=>{e.preventDefault();login(els.passwordInput.value.trim())});
 els.logoutBtn.addEventListener("click",()=>{localStorage.removeItem(key);records=[];showLogin()});
 els.refreshBtn.addEventListener("click",load);
 els.listBtn.addEventListener("click",()=>setView("list"));
 els.calendarBtn.addEventListener("click",()=>setView("calendar"));
 els.prevMonth.addEventListener("click",()=>{cal.setMonth(cal.getMonth()-1);render()});
 els.nextMonth.addEventListener("click",()=>{cal.setMonth(cal.getMonth()+1);render()});
 els.searchInput.addEventListener("input",render);
 els.statusFilter.addEventListener("change",render);
 els.saveRequestBtn.addEventListener("click",save);
 els.exportBtn.addEventListener("click",()=>setSection("reports"));
 if(els.exportRequestsBtn) els.exportRequestsBtn.addEventListener("click",exportRequestsCsv);
 if(els.exportPayrollBtn) els.exportPayrollBtn.addEventListener("click",exportPayrollCsv);
 document.querySelectorAll("[data-section]").forEach(a=>{
   a.addEventListener("click",e=>{e.preventDefault();setSection(a.dataset.section)});
 });
}

async function login(pwd){
 els.loginMessage.textContent="";
 if(!pwd){els.loginMessage.textContent="Введите пароль";return}
 try{
   const r=await fetch("/list-zayavki",{headers:{"x-admin-password":pwd}});
   const d=await r.json();
   if(!r.ok||!d.ok){els.loginMessage.textContent=d.error||"Неверный пароль";return showLogin()}
   localStorage.setItem(key,pwd);
   records=d.records||[];
   showApp();
   renderAll();
 }catch(e){
   els.loginMessage.textContent="Ошибка входа: "+e.message;
   showLogin();
 }
}

function showApp(){
 document.body.classList.remove("logged-out");
 document.body.classList.add("logged-in");
 els.loginPanel.style.display="none";
 els.appPanel.style.display="block";
}
function showLogin(){
 document.body.classList.remove("logged-in");
 document.body.classList.add("logged-out");
 els.appPanel.style.display="none";
 els.loginPanel.style.display="block";
}
function pwd(){return localStorage.getItem(key)||""}

async function load(){
 msg("Загружаю...");
 try{
  const r=await fetch("/list-zayavki",{headers:{"x-admin-password":pwd()}});
  const d=await r.json();
  if(!r.ok||!d.ok)throw new Error(d.error||"Ошибка загрузки");
  records=d.records||[];
  renderAll();
  msg("Готово");
 }catch(e){msg(e.message)}
}

function setSection(section){
 activeSection=section;
 document.querySelectorAll("[data-section]").forEach(a=>a.classList.toggle("active",a.dataset.section===section));
 document.querySelectorAll(".workspace-section").forEach(s=>s.style.display="none");

 if(section==="calendar"){
   $("requestsSection").style.display="block";
   setView("calendar",false);
 }else if(section==="requests"){
   $("requestsSection").style.display="block";
   setView("list",false);
 }else{
   const target=$(section+"Section");
   if(target) target.style.display="block";
 }
 renderAll();
}

function setView(v,doRender=true){
 els.listView.style.display=v==="list"?"block":"none";
 els.calendarView.style.display=v==="calendar"?"block":"none";
 els.listBtn.classList.toggle("active",v==="list");
 els.calendarBtn.classList.toggle("active",v==="calendar");
 if(doRender) render();
}

function filtered(){
 const q=els.searchInput.value.toLowerCase().trim(),s=els.statusFilter.value;
 return records.filter(r=>{
   const f=r.fields||{};
   const hay=[f["Имя клиента"],f["Телефон"],f["Услуга"],f["Адрес"],f["Монтажники"],f["Статус"],f["Комментарий клиента"],f["Комментарий администратора"]].join(" ").toLowerCase();
   return(!s||f["Статус"]===s)&&(!q||hay.includes(q));
 }).sort((a,b)=>{
   const af=a.fields||{},bf=b.fields||{};
   return (String(bf["Дата записи"]||"")+" "+String(bf["Время записи"]||"")).localeCompare(String(af["Дата записи"]||"")+" "+String(af["Время записи"]||""));
 });
}

function renderAll(){
 render();
 renderClients();
 renderObjects();
 renderInstallers();
 renderFiles();
}

function render(){
 const arr=filtered();
 els.requestsBody.innerHTML=arr.map(row).join("")||'<tr><td colspan="10">Нет заявок</td></tr>';
 bindOpenButtons();
 renderCal(arr);
 stats(records);
}

function row(r){
 const f=r.fields||{};
 const status=e(f["Статус"]||"");
 return `<tr>
 <td>${e(f["Дата записи"])}</td>
 <td>${e(f["Время записи"])}</td>
 <td><b>${e(f["Имя клиента"])}</b></td>
 <td>${phoneLink(f["Телефон"])}</td>
 <td>${e(f["Услуга"])}</td>
 <td>${e(f["Адрес"])}</td>
 <td>${e(f["Итоговый м2"]||f["м2"])}</td>
 <td>${e(f["Монтажники"])}</td>
 <td class="status-cell"><span class="status" data-status="${status}">${status||"—"}</span></td>
 <td><button class="open-btn" data-open="${e(r.id)}">Открыть</button></td>
 </tr>`;
}

function renderCal(arr){
 els.monthTitle.textContent=new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric"}).format(cal);
 const y=cal.getFullYear(),m=cal.getMonth(),first=new Date(y,m,1),off=(first.getDay()+6)%7,start=new Date(y,m,1-off);
 const by={};
 arr.forEach(r=>{const d=(r.fields||{})["Дата записи"]||"";(by[d]||(by[d]=[])).push(r)});
 let html="";
 const todayStr=today();
 for(let i=0;i<42;i++){
   const d=new Date(start);d.setDate(start.getDate()+i);
   const ymd=ymdLocal(d),items=by[ymd]||[];
   html+=`<div class="day ${d.getMonth()!==m?"muted":""} ${ymd===todayStr?"today":""}">
     <b>${d.getDate()}</b>
     ${items.slice(0,5).map(r=>`<button class="event" data-open="${e(r.id)}">${e((r.fields||{})["Время записи"]||"")} ${e((r.fields||{})["Имя клиента"]||"")}<small>${e((r.fields||{})["Статус"]||"")}</small></button>`).join("")}
   </div>`;
 }
 els.calendarGrid.innerHTML=html;
 bindOpenButtons();
}

function stats(a){
 const t=today();
 els.statTotal.textContent=a.length;
 els.statNew.textContent=a.filter(r=>(r.fields||{})["Статус"]==="Новая заявка").length;
 els.statToday.textContent=a.filter(r=>(r.fields||{})["Дата записи"]===t).length;
 els.statWork.textContent=a.filter(r=>(r.fields||{})["Статус"]==="В работе").length;
}

function bindOpenButtons(){
 document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openRequest(b.dataset.open));
}

function openRequest(id){
 current=records.find(r=>String(r.id)===String(id));
 if(!current)return;
 const f=current.fields||{};
 els.dialogTitle.textContent="Заявка #"+current.id;
 els.requestInfo.innerHTML=`<b>${e(f["Имя клиента"]||"—")}</b><br>${phoneLink(f["Телефон"])}<br>${e(f["Дата записи"]||"")} ${e(f["Время записи"]||"")}<br>${e(f["Услуга"]||"")}<br>${e(f["Адрес"]||"")}<br>${e(f["Комментарий клиента"]||f["Комментарий"]||"")}`;
 els.editStatus.value=f["Статус"]||"Новая заявка";
 els.editM2.value=f["Итоговый м2"]||f["м2"]||"";
 els.editResponsible.value=f["Ответственный"]||"";
 els.editAdminComment.value=f["Комментарий администратора"]||"";
 const names=splitInstallers(f["Монтажники"]);
 document.querySelectorAll('[name="installer"]').forEach(c=>c.checked=names.includes(c.value));
 els.dialog.showModal();
}

async function save(){
 if(!current)return;
 const fields={
   "Статус":els.editStatus.value,
   "Ответственный":els.editResponsible.value.trim(),
   "Комментарий администратора":els.editAdminComment.value.trim(),
   "Монтажники":[...document.querySelectorAll('[name="installer"]:checked')].map(x=>x.value).join(", ")
 };
 if(els.editM2.value)fields["Итоговый м2"]=Number(els.editM2.value);
 try{
   const r=await fetch("/update-zayavka",{method:"POST",headers:{"Content-Type":"application/json","x-admin-password":pwd()},body:JSON.stringify({id:current.id,fields})});
   const d=await r.json();
   if(!r.ok||!d.ok)throw new Error(d.error||"Ошибка сохранения");
   els.dialog.close();
   await load();
 }catch(e){msg(e.message)}
}

function renderClients(){
 const map=new Map();
 records.forEach(r=>{
   const f=r.fields||{}, name=f["Имя клиента"]||"Без имени", phone=f["Телефон"]||"";
   const key=name+"|"+phone;
   const x=map.get(key)||{name,phone,count:0,last:"",id:r.id};
   x.count++;
   if(String(f["Дата записи"]||"")>=String(x.last||"")){x.last=f["Дата записи"]||"";x.id=r.id}
   map.set(key,x);
 });
 els.clientsBody.innerHTML=[...map.values()].map(x=>`<tr><td><b>${e(x.name)}</b></td><td>${phoneLink(x.phone)}</td><td>${x.count}</td><td>${e(x.last)}</td><td><button class="open-btn" data-open="${e(x.id)}">Открыть</button></td></tr>`).join("")||'<tr><td colspan="5">Нет клиентов</td></tr>';
 bindOpenButtons();
}

function renderObjects(){
 els.objectsBody.innerHTML=records.map(r=>{
   const f=r.fields||{};
   return `<tr><td>${e(f["Адрес"]||"—")}</td><td>${e(f["Услуга"]||"—")}</td><td>${e(f["Итоговый м2"]||f["м2"]||"")}</td><td class="status-cell"><span class="status" data-status="${e(f["Статус"]||"")}">${e(f["Статус"]||"—")}</span></td><td>${e(f["Дата записи"]||"")}</td><td><button class="open-btn" data-open="${e(r.id)}">Открыть</button></td></tr>`;
 }).join("")||'<tr><td colspan="6">Нет объектов</td></tr>';
 bindOpenButtons();
}

function renderInstallers(){
 const data=Object.fromEntries(WORKERS.map(w=>[w,{count:0,m2:0,last:""}]));
 records.forEach(r=>{
   const f=r.fields||{}, names=splitInstallers(f["Монтажники"]), m2=Number(String(f["Итоговый м2"]||f["м2"]||0).replace(",", "."))||0;
   names.forEach(n=>{if(data[n]){data[n].count++;data[n].m2+=m2;if(String(f["Дата записи"]||"")>=String(data[n].last||""))data[n].last=f["Дата записи"]||""}});
 });
 els.installersBody.innerHTML=WORKERS.map(w=>`<tr><td><b>${w}</b></td><td>${data[w].count}</td><td>${round(data[w].m2)}</td><td>${e(data[w].last||"—")}</td></tr>`).join("");
}

function renderFiles(){
 els.filesBody.innerHTML=records.map(r=>{
   const f=r.fields||{};
   return `<tr><td>#${e(r.id)}</td><td>${e(f["Имя клиента"]||"—")}</td><td>${e(f["Файлы"]||"Пока нет файлов")}</td><td class="status-cell"><span class="status" data-status="${e(f["Статус"]||"")}">${e(f["Статус"]||"—")}</span></td></tr>`;
 }).join("")||'<tr><td colspan="4">Нет заявок</td></tr>';
}

function exportRequestsCsv(){downloadCsv("solncanet_zayavki.csv", filtered(), ["Дата записи","Время записи","Имя клиента","Телефон","Услуга","Адрес","Итоговый м2","м2","Монтажники","Статус","Комментарий администратора"])}
function exportPayrollCsv(){downloadCsv("solncanet_zp.csv", filtered(), ["Дата записи","Адрес","Услуга","Итоговый м2","м2","Монтажники","Статус"])}
function exportCsv(){exportRequestsCsv()}

function downloadCsv(filename, rows, fields){
 const csv=[fields.join(";"),...rows.map(r=>{const f=r.fields||{};return fields.map(k=>csvCell(f[k])).join(";")})].join("\n");
 const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
}

function msg(t){els.message.textContent=t}
function e(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function phoneLink(v){const p=String(v||"").trim();return p?`<a href="tel:${e(p)}">${e(p)}</a>`:"—"}
function ymdLocal(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function today(){return new Date().toISOString().slice(0,10)}
function csvCell(v){return `"${String(v||"").replace(/\r?\n/g," ").replace(/"/g,'""')}"`}
function splitInstallers(v){return String(v||"").split(/[,;]+/).map(x=>x.trim()).filter(Boolean)}
function round(n){return Math.round((Number(n)||0)*100)/100}
