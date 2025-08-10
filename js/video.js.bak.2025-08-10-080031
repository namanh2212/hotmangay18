
const params=new URLSearchParams(location.search);
const id=parseInt(params.get('id'),10);
const titleEl=document.getElementById('title');
const viewsEl=document.getElementById('views');
const durationEl=document.getElementById('duration');
const descEl=document.getElementById('description');
const tagsEl=document.getElementById('tags');
const relatedEl=document.getElementById('related');

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

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
function hasOverlap(a=[], b=[]){ const sa=new Set(a.map(x=>String(x).toLowerCase())); return b.some(x=>sa.has(String(x).toLowerCase())); }
function pickRelated(list, current){
  const tags = current.tags || [];
  const others = list.filter(v=>v.id!==current.id);
  const same = others.filter(v=>hasOverlap(v.tags||[], tags));
  const pool = same.length ? same : others;
  return shuffle(pool).slice(0, 12);
}

loadVideos().then(list=>{
  const video=list.find(v=>v.id===id)||list[0];
  if(!video){ titleEl.textContent='Không tìm thấy video'; return; }
  renderVideo(video); incrementView(video);
  const rel = pickRelated(list, video);
  renderRelated(rel);
}).catch(err=>{ console.error(err); titleEl.textContent='Lỗi tải dữ liệu'; });

function renderVideo(v){
  document.title = v.title+' - Hotmangay18';
  titleEl.textContent=v.title;
  viewsEl.textContent=formatViews(v.views)+' lượt xem';
  durationEl.textContent='Thời lượng '+v.duration;
  descEl.textContent=v.description;
  tagsEl.innerHTML=(v.tags||[]).map(t=>`<span class="tag">#${escapeHTML(t)}</span>`).join('');
  document.getElementById('player').innerHTML = `<iframe src="${v.embedUrl}" title="${escapeHTML(v.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width:100%;height:100%"></iframe>`;
}
function renderRelated(items){
  relatedEl.innerHTML = items.map(v=>`
    <article class="card" data-id="${v.id}" tabindex="0" role="button" aria-label="${escapeHTML(v.title)}">
      <div class="thumb"><img src="${v.thumbnail}" alt="Thumbnail: ${escapeHTML(v.title)}" loading="lazy"/><span class="badge-duration">${v.duration}</span></div>
      <div class="meta"><h3 class="title">${escapeHTML(v.title)}</h3><div class="row"><span>${formatViews(v.views)} lượt xem</span></div></div>
    </article>`).join('');
  relatedEl.querySelectorAll('.card').forEach(card=>card.addEventListener('click',()=>{ location.href=`video.html?id=${card.getAttribute('data-id')}`; }));
}
function formatViews(n){ if(n<1e3) return n.toString(); if(n<1e6) return (n/1e3).toFixed(1).replace(/\.0$/,'')+'K'; if(n<1e9) return (n/1e6).toFixed(1).replace(/\.0$/,'')+'M'; return (n/1e9).toFixed(1).replace(/\.0$/,'')+'B'; }
function escapeHTML(s){ return s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

function incrementView(v){
  fetch(`/api/videos/${v.id}/view`, {method:'POST'})
    .then(r=>r.ok?r.json():null)
    .then(data=>{ if(data && data.views!=null){ viewsEl.textContent = formatViews(data.views) + ' lượt xem'; } })
    .catch(()=>{});
}
