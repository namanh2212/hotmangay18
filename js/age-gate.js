
(function(){
  try{
    if(localStorage.getItem('age_ok')==='1') return;
    const overlay = document.createElement('div');
    overlay.className = 'age-overlay';
    overlay.innerHTML = `
      <div class="age-card" role="dialog" aria-modal="true" aria-labelledby="age-title">
        <h1 id="age-title">Cảnh báo 18+</h1>
        <p>Trang web này chứa nội dung chỉ phù hợp với người từ <b>18 tuổi</b> trở lên. Vui lòng xác nhận để tiếp tục.</p>
        <div class="age-actions">
          <button id="ageEnter" class="btn primary">Tôi đã đủ 18 tuổi (Enter)</button>
          <button id="ageLeave" class="btn">Rời trang</button>
        </div>
        <div class="notice">Bằng cách tiếp tục, bạn xác nhận bạn đủ điều kiện theo pháp luật nơi bạn cư trú.</div>
      </div>`;
    document.body.appendChild(overlay);
    function accept(){ localStorage.setItem('age_ok','1'); overlay.remove(); }
    function leave(){ window.location.href = 'https://www.google.com'; }
    overlay.querySelector('#ageEnter').addEventListener('click', accept);
    overlay.querySelector('#ageLeave').addEventListener('click', leave);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Enter') accept(); });
  }catch(e){}
})();
