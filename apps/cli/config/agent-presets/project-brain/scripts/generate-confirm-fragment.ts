#!/usr/bin/env node --import tsx
/**
 * Generate a complete HTML fragment for the project plan confirmation card.
 * Reads demo-data.json and outputs the fragment to stdout.
 * Usage: npx tsx generate-confirm-fragment.ts --input <demo-data.json>
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

interface ProjectData {
  projectName: string
  projectCode?: string
  status?: string
  startDate?: string
  endDate?: string
  budget?: number
  objectives?: string[]
  phases?: { name: string; start: string; end: string; deliverables?: string[] }[]
  tasks?: { id: string; name: string; assignee: string; estimate: number; dependencies?: string[] }[]
  risks?: { id: string; type: string; description: string; level: string; mitigation: string }[]
  team?: { role: string; name: string; department: string }[]
}

function parseArgs(): { input: string } {
  const args = process.argv.slice(2)
  const i = args.indexOf('--input')
  const input = i !== -1 && i + 1 < args.length ? args[i + 1] : undefined
  if (!input) {
    console.error('用法: npx tsx generate-confirm-fragment.ts --input <path>')
    process.exit(1)
  }
  return { input: resolve(input) }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function generateFragment(data: ProjectData): string {
  const dataJson = JSON.stringify(data)
  return `<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--a:#1F4E79;--al:#e8f0f8;--d:#e53e3e;--s:#38a169;--t:#2d3748;--ts:#718096;--b:#e2e8f0;--bg:#f7fafc;--c:#fff;--r:8px;--sh:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06)}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;font-size:13px;color:var(--t);background:transparent;padding:12px}
.split{display:flex;gap:12px}
.panel{flex:1;background:var(--c);border:1px solid var(--b);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden;min-width:0}
.ph{background:var(--a);color:#fff;padding:10px 14px;font-size:14px;font-weight:600}
.pb{padding:14px;max-height:520px;overflow-y:auto}
.pb::-webkit-scrollbar{width:4px}
.pb::-webkit-scrollbar-thumb{background:var(--b);border-radius:2px}
.pi{margin-bottom:10px}
.pi .l{font-size:11px;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.pi .v{font-size:13px;color:var(--t);font-weight:500}
.pt{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
.pt th{background:var(--al);color:var(--a);padding:5px 8px;text-align:left;font-weight:600;border-bottom:1px solid var(--b)}
.pt td{padding:4px 8px;border-bottom:1px solid var(--b);vertical-align:top}
.fg{margin-bottom:12px}
.fg label{display:block;font-size:12px;font-weight:600;color:var(--t);margin-bottom:4px}
.fg input,.fg select{width:100%;padding:7px 10px;border:1px solid var(--b);border-radius:6px;font-size:13px;color:var(--t);background:var(--bg);transition:border-color .2s,box-shadow .2s}
.fg input:focus,.fg select:focus{border-color:var(--a);box-shadow:0 0 0 3px rgba(31,78,121,.12);outline:none}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.st{font-size:13px;font-weight:700;color:var(--a);margin:16px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--al);display:flex;align-items:center;justify-content:space-between}
.et{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
.et th{background:var(--a);color:#fff;padding:6px 8px;text-align:left;font-weight:600;font-size:11px}
.et td{padding:4px 6px;border-bottom:1px solid var(--b)}
.et td input,.et td select{width:100%;padding:5px 6px;border:1px solid transparent;border-radius:4px;font-size:12px;background:transparent;color:var(--t);transition:all .15s}
.et td input:focus,.et td select:focus{border-color:var(--a);background:#fff;box-shadow:0 0 0 2px rgba(31,78,121,.08);outline:none}
.et tr:hover td{background:var(--al)}
.btn{display:inline-flex;align-items:center;gap:4px;padding:8px 18px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.btn-p{background:var(--a);color:#fff;box-shadow:0 1px 2px rgba(31,78,121,.3)}
.btn-p:hover{background:#163d5e;box-shadow:0 2px 6px rgba(31,78,121,.4);transform:translateY(-1px)}
.btn-s{background:var(--bg);color:var(--t);border:1px solid var(--b)}
.btn-s:hover{background:var(--b)}
.btn-d{background:none;color:var(--d);font-size:11px;padding:3px 8px;border:1px solid var(--d);border-radius:4px;cursor:pointer}
.btn-d:hover{background:var(--d);color:#fff}
.btn-sm{padding:3px 10px;font-size:11px}
.br{display:flex;gap:10px;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--b)}
.ab{color:var(--a);cursor:pointer;font-size:12px;font-weight:600}
.ab:hover{opacity:.8}
.mo{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center}
.mo.a{display:flex}
.mb{background:#fff;border-radius:12px;padding:24px;max-width:560px;width:90%;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.mb h3{font-size:16px;color:var(--s);margin-bottom:12px}
.mb pre{background:#f7fafc;border:1px solid var(--b);border-radius:6px;padding:12px;font-size:11px;max-height:300px;overflow:auto;white-space:pre-wrap;word-break:break-all}
.mb .br{justify-content:center;margin-top:16px;border:none;padding:0}
.to{position:fixed;bottom:20px;right:20px;background:var(--s);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:2000;opacity:0;transform:translateY(10px);transition:all .3s}
.to.show{opacity:1;transform:translateY(0)}
@media(max-width:800px){.split{flex-direction:column}}
</style>
<div class="split">
<div class="panel"><div class="ph">📋 方案预览</div><div class="pb">
<div class="pi"><div class="l">项目名称</div><div class="v" id="pv-name"></div></div>
<div class="pi"><div class="l">项目编号</div><div class="v" id="pv-code"></div></div>
<div class="pi"><div class="l">项目周期</div><div class="v" id="pv-period"></div></div>
<div class="pi"><div class="l">总投资</div><div class="v" id="pv-budget"></div></div>
<div class="pi"><div class="l">项目状态</div><div class="v" id="pv-status"></div></div>
<div style="margin-top:12px"><div class="l" style="font-size:11px;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">项目目标</div><div id="pv-obj"></div></div>
<div style="margin-top:12px"><div class="l" style="font-size:11px;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">阶段规划</div><table class="pt"><thead><tr><th>阶段</th><th>开始</th><th>结束</th><th>交付物</th></tr></thead><tbody id="pv-ph"></tbody></table></div>
<div style="margin-top:12px"><div class="l" style="font-size:11px;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">任务分解</div><table class="pt"><thead><tr><th>编号</th><th>任务</th><th>负责人</th><th>工期</th></tr></thead><tbody id="pv-tk"></tbody></table></div>
<div style="margin-top:12px"><div class="l" style="font-size:11px;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">风险识别</div><table class="pt"><thead><tr><th>编号</th><th>类型</th><th>描述</th><th>等级</th></tr></thead><tbody id="pv-rk"></tbody></table></div>
</div></div>
<div class="panel"><div class="ph">✏️ 编辑确认</div><div class="pb">
<div class="fg2">
<div class="fg"><label>项目名称</label><input id="ed-name"></div>
<div class="fg"><label>项目编号</label><input id="ed-code"></div>
<div class="fg"><label>开始日期</label><input type="date" id="ed-start"></div>
<div class="fg"><label>结束日期</label><input type="date" id="ed-end"></div>
<div class="fg"><label>总投资（万元）</label><input type="number" id="ed-budget"></div>
<div class="fg"><label>项目状态</label><select id="ed-status"><option value="initiated">已启动</option><option value="planning">规划中</option><option value="executing">执行中</option><option value="completed">已完成</option></select></div>
</div>
<div class="st">🎯 项目目标 <span class="ab" onclick="addObj()">+ 添加</span></div>
<div id="ed-obj"></div>
<div class="st">📊 阶段规划 <span class="ab" onclick="addPhase()">+ 添加</span></div>
<table class="et"><thead><tr><th>阶段名称</th><th>开始</th><th>结束</th><th>交付物</th><th></th></tr></thead><tbody id="ed-ph"></tbody></table>
<div class="st">📝 任务分解 <span class="ab" onclick="addTask()">+ 添加</span></div>
<table class="et"><thead><tr><th>编号</th><th>任务名称</th><th>负责人</th><th>工期</th><th>前置</th><th></th></tr></thead><tbody id="ed-tk"></tbody></table>
<div class="st">⚠️ 风险识别 <span class="ab" onclick="addRisk()">+ 添加</span></div>
<table class="et"><thead><tr><th>编号</th><th>类型</th><th>描述</th><th>等级</th><th>应对措施</th><th></th></tr></thead><tbody id="ed-rk"></tbody></table>
<div class="br"><button class="btn btn-s" onclick="location.reload()">取消</button><button class="btn btn-p" onclick="submitForm()">确认提交</button></div>
</div></div>
</div>
<div class="mo" id="modal"><div class="mb"><h3>✅ 方案已确认</h3><pre id="mjson"></pre><div class="br"><button class="btn btn-s" onclick="dl()">下载JSON</button><button class="btn btn-p" onclick="cp()">复制到剪贴板</button></div></div></div>
<script>
var D=${dataJson};
function sync(){var f=function(id){return document.getElementById(id).value||'-'};
document.getElementById('pv-name').textContent=f('ed-name');
document.getElementById('pv-code').textContent=f('ed-code');
document.getElementById('pv-period').textContent=f('ed-start')+' ~ '+f('ed-end');
document.getElementById('pv-budget').textContent=f('ed-budget')!='-'?'¥'+Number(f('ed-budget')).toLocaleString():'-';
document.getElementById('pv-status').textContent=f('ed-status');
var oh='';document.querySelectorAll('#ed-obj input').forEach(function(i){if(i.value.trim())oh+='<div style="margin-bottom:2px">• '+esc(i.value)+'</div>'});document.getElementById('pv-obj').innerHTML=oh||'<span style="color:var(--ts)">-</span>';
var ph='';document.querySelectorAll('#ed-ph tr').forEach(function(r){var c=r.querySelectorAll('input');if(c[0]&&c[0].value.trim())ph+='<tr><td>'+esc(c[0].value)+'</td><td>'+esc(c[1].value)+'</td><td>'+esc(c[2].value)+'</td><td>'+esc(c[3].value)+'</td></tr>'});document.getElementById('pv-ph').innerHTML=ph||'<tr><td colspan="4" style="color:var(--ts)">-</td></tr>';
var th='';document.querySelectorAll('#ed-tk tr').forEach(function(r){var c=r.querySelectorAll('input');if(c[0]&&c[0].value.trim())th+='<tr><td>'+esc(c[0].value)+'</td><td>'+esc(c[1].value)+'</td><td>'+esc(c[2].value)+'</td><td>'+esc(c[3].value)+'</td></tr>'});document.getElementById('pv-tk').innerHTML=th||'<tr><td colspan="4" style="color:var(--ts)">-</td></tr>';
var rh='';document.querySelectorAll('#ed-rk tr').forEach(function(r){var c=r.querySelectorAll('input');if(c[0]&&c[0].value.trim())rh+='<tr><td>'+esc(c[0].value)+'</td><td>'+esc(c[1].value)+'</td><td>'+esc(c[2].value)+'</td><td>'+esc(c[3].value)+'</td></tr>'});document.getElementById('pv-rk').innerHTML=rh||'<tr><td colspan="4" style="color:var(--ts)">-</td></tr>'}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function li(el){el.addEventListener('input',sync)}
function addObj(v){var d=document.createElement('div');d.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:6px';d.innerHTML='<input value="'+esc(v||'')+'" style="flex:1;padding:7px 10px;border:1px solid var(--b);border-radius:6px;font-size:13px;background:var(--bg)"><button class="btn btn-d btn-sm" onclick="this.parentElement.remove();sync()">删除</button>';document.getElementById('ed-obj').appendChild(d);li(d.querySelector('input'))}
function addPhase(p){var r=document.getElementById('ed-ph').insertRow();r.innerHTML='<td><input value="'+esc(p&&p.name||'')+'"></td><td><input type="date" value="'+esc(p&&p.start||'')+'"></td><td><input type="date" value="'+esc(p&&p.end||'')+'"></td><td><input value="'+esc(p&&p.deliverables?p.deliverables.join('、'):'')+'"></td><td><button class="btn btn-d btn-sm" onclick="this.parentElement.parentElement.remove();sync()">删除</button></td>';r.querySelectorAll('input').forEach(li)}
function addTask(t){var r=document.getElementById('ed-tk').insertRow();r.innerHTML='<td><input value="'+esc(t&&t.id||'')+'" style="width:80px"></td><td><input value="'+esc(t&&t.name||'')+'"></td><td><input value="'+esc(t&&t.assignee||'')+'" style="width:80px"></td><td><input type="number" value="'+esc(t&&t.estimate||'')+'" style="width:60px"></td><td><input value="'+esc(t&&t.dependencies?t.dependencies.join('、'):'')+'" style="width:80px"></td><td><button class="btn btn-d btn-sm" onclick="this.parentElement.parentElement.remove();sync()">删除</button></td>';r.querySelectorAll('input').forEach(li)}
function addRisk(r){var row=document.getElementById('ed-rk').insertRow();var lv='<select style="width:70px"><option value="高"'+(r&&r.level==='高'?' selected':'')+'>高</option><option value="中"'+(r&&r.level==='中'?' selected':'')+'>中</option><option value="低"'+(r&&r.level==='低'?' selected':'')+'>低</option></select>';row.innerHTML='<td><input value="'+esc(r&&r.id||'')+'" style="width:90px"></td><td><input value="'+esc(r&&r.type||'')+'" style="width:70px"></td><td><input value="'+esc(r&&r.description||'')+'"></td><td>'+lv+'</td><td><input value="'+esc(r&&r.mitigation||'')+'"></td><td><button class="btn btn-d btn-sm" onclick="this.parentElement.parentElement.remove();sync()">删除</button></td>';row.querySelectorAll('input,select').forEach(li)}
function collect(){return{projectName:document.getElementById('ed-name').value,projectCode:document.getElementById('ed-code').value,startDate:document.getElementById('ed-start').value,endDate:document.getElementById('ed-end').value,budget:Number(document.getElementById('ed-budget').value)*10000||0,status:document.getElementById('ed-status').value,objectives:[].map.call(document.querySelectorAll('#ed-obj input'),function(i){return i.value}).filter(Boolean),phases:[].map.call(document.querySelectorAll('#ed-ph tr'),function(r){var c=r.querySelectorAll('input');return{name:c[0].value,start:c[1].value,end:c[2].value,deliverables:c[3].value.split(/[,，、]/).filter(Boolean)}}),tasks:[].map.call(document.querySelectorAll('#ed-tk tr'),function(r){var c=r.querySelectorAll('input');return{id:c[0].value,name:c[1].value,assignee:c[2].value,estimate:parseInt(c[3].value)||0,dependencies:c[4].value.split(/[,，、]/).filter(Boolean)}}),risks:[].map.call(document.querySelectorAll('#ed-rk tr'),function(r){var c=r.querySelectorAll('input');var s=r.querySelector('select');return{id:c[0].value,type:c[1].value,description:c[2].value,level:s?s.value:'',mitigation:c[4].value}})}}
function submitForm(){var d=collect();var j=JSON.stringify(d,null,2);document.getElementById('mjson').textContent=j;document.getElementById('modal').classList.add('a');window.parent.postMessage({type:'plan-confirmed',data:d},'*')}
function cp(){var j=JSON.stringify(collect(),null,2);var t=document.createElement('textarea');t.value=j;t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);document.getElementById('modal').classList.remove('a');toast('✅ 已复制到剪贴板')}
function dl(){var j=JSON.stringify(collect(),null,2);var b=new Blob([j],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='confirmed-plan.json';a.click();document.getElementById('modal').classList.remove('a');toast('✅ 文件已下载')}
function toast(m){var t=document.createElement('div');t.className='to';t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.classList.add('show')},10);setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove()},300)},2500)}
document.getElementById('ed-name').value=D.projectName||'';
document.getElementById('ed-code').value=D.projectCode||'';
document.getElementById('ed-start').value=D.startDate||'';
document.getElementById('ed-end').value=D.endDate||'';
document.getElementById('ed-budget').value=D.budget?(D.budget/10000):'';
document.getElementById('ed-status').value=D.status||'initiated';
(D.objectives||[]).forEach(addObj);
(D.phases||[]).forEach(addPhase);
(D.tasks||[]).forEach(addTask);
(D.risks||[]).forEach(addRisk);
document.querySelectorAll('.pb input,.pb select').forEach(li);
sync();
</script>`
}

function main() {
  const { input } = parseArgs()
  const raw = readFileSync(input, 'utf-8')
  const data = JSON.parse(raw) as ProjectData
  const fragment = generateFragment(data)
  process.stdout.write(fragment)
}

main()