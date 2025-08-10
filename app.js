
let ITEMS_PER_PAGE = 16;
const state = { all: [], filtered: [], page: 1 };
const grid = document.getElementById('videoGrid');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');

function computeColumns(){
  const cs = window.getComputedStyle(grid);
  let cols = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
  if(!cols || cols>50){
    let minW = 160;
    if (window.matchMedia('(min-width: 900px)').matches) minW = 260;
    else if (window.matchMedia('(min-width: 480px)').matches) minW = 200;
    cols = Math.max(1, Math.floor(grid.clientWidth / minW));
  }
  return Math.max(1, cols);
}
function computePerPage(){
  const cols = computeColumns();
  const MIN=12, MAX=20;
  let rows = Math.floor(MAX / cols);
  while(rows>0 && cols*rows < MIN){ rows++; if(cols*rows>MAX) break; }
  let per = cols * Math.max(1, rows);
  if(per < MIN) per = MIN;
  if(per > MAX) per = MAX - (MAX % cols);
  if(per < cols) per = cols;
  return per;
}

async function loadVideos(){
  try{
    const r = await fetch('/api/videos', {credentials:'same-origin'});
    if(!r.ok) throw new Error('no api');
    return await r.json();
  }catch(_){
    const r = await fetch('data/videos.json');
    return await r.json();
  }
}
function sortVideos(list){
  return list.slice().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0) || (b.id||0)-(a.id||0));
}

function render(){ renderGrid(); renderPagination(); }
function renderGrid(){
  ITEMS_PER_PAGE = computePerPage();
  const start=(state.page-1)*ITEMS_PER_PAGE;
  const items=state.filtered.slice(start, start+ITEMS_PER_PAGE);
  if(!items.length){ grid.innerHTML='<p>Không có video nào.</p>'; return; }
  grid.innerHTML = items.map(v => `
    <article class="card" data-id="${v.id}" tabindex="0" role="button" aria-label="${escapeHTML(v.title)}">
      <div class="thumb">
        <img src="${v.thumbnail}" alt="Thumbnail: ${escapeHTML(v.title)}" loading="lazy"/>
        <span class="badge-duration">${v.duration}</span>
      </div>
      <div class="meta"><h3 class="title">${escapeHTML(v.title)}</h3><div class="row"><span>${formatViews(v.views)} lượt xem</span></div></div>
    </article>`).join('');
  grid.querySelectorAll('.card').forEach(card => card.addEventListener('click', ()=>{ location.href = `video.html?id=${card.getAttribute('data-id')}`; }));
}
function renderPagination(){
  const total = Math.ceil(state.filtered.length / ITEMS_PER_PAGE);
  if(total<=1){ pagination.innerHTML=''; return; }
  let html=''; for(let i=1;i<=total;i++){ html += `<button class="page-btn ${i===state.page?'active':''}" data-page="${i}" aria-label="Trang ${i}">${i}</button>`; }
  pagination.innerHTML = html;
  pagination.querySelectorAll('.page-btn').forEach(btn => btn.addEventListener('click', ()=>{ state.page=parseInt(btn.dataset.page,10); window.scrollTo({top:0,behavior:'smooth'}); renderGrid(); pagination.querySelectorAll('.page-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }));
}
function formatViews(n){ if(n<1e3) return n.toString(); if(n<1e6) return (n/1e3).toFixed(1).replace(/\.0$/,'')+'K'; if(n<1e9) return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M'; return (n/1e9).toFixed(1).replace(/\.0$/,'')+'B'; }
function escapeHTML(s){ return s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

searchInput.addEventListener('input', ()=>{ const q=searchInput.value.trim().toLowerCase(); state.filtered = q ? state.all.filter(v=>v.title.toLowerCase().includes(q)) : state.all; state.page=1; render(); });
window.addEventListener('resize', ()=>{ const old=ITEMS_PER_PAGE; const next=computePerPage(); if(next!==old){ state.page=1; render(); } });

loadVideos().then(list=>{
  const sorted = sortVideos(list);
  state.all = sorted; state.filtered = sorted; render();
}).catch(err=>{
  console.error(err);
  grid.innerHTML = '<p>Lỗi tải dữ liệu.</p>';
});
