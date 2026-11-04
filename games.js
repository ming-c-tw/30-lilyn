/* =========================================================
   生日列車：五個 App 小遊戲
   用法：MiniGames.<名稱>(容器, 設定, 贏了的回呼) → 回傳清除函式
   名稱：song 猜歌名、mario 超級莉莉、memory 翻翻牌、volley 排球對決
   （拼圖寫在 app.html 的麟光關）
   ========================================================= */
(function(){
const css = `
.mg-wrap{display:flex;flex-direction:column;gap:14px}
.mg-wrap>div:empty{display:none}
.mg-wrap .nes-btn.btn,.mg-wrap .nes-input{margin:0}   /* 區塊間距一律 14，跟 App 任務頁一樣 */
.mg-canvas{display:block;width:100%;height:auto;image-rendering:pixelated;border:4px solid #000;background:#000;touch-action:none}
.mg-pad{display:flex;justify-content:space-between;align-items:center;gap:10px;user-select:none;-webkit-user-select:none;touch-action:none}
.mg-pad .grp{display:flex;gap:10px}
.mg-key{width:64px;height:64px;border:4px solid #000;background:#fff;box-shadow:4px 4px 0 #9a9a9a;font-size:22px;display:flex;align-items:center;justify-content:center;font-family:inherit;color:#212529;touch-action:none;-webkit-tap-highlight-color:transparent}
.mg-key.on{transform:translate(2px,2px);box-shadow:2px 2px 0 #9a9a9a;background:#ffe066}
.mg-key.red{background:#e76e8a;color:#fff}
.mg-key.red.on{background:#c94b69}
.mg-hud{display:flex;justify-content:space-between;font-size:15px}
.mg-mem{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.mg-card{aspect-ratio:1;perspective:600px;cursor:pointer}
.mg-card .in{position:relative;width:100%;height:100%;transition:transform .35s steps(5);transform-style:preserve-3d}
.mg-card.open .in,.mg-card.done .in{transform:rotateY(180deg)}
.mg-card .f,.mg-card .b{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:4px solid #000;display:flex;align-items:center;justify-content:center}
.mg-card .f{background:#209cee;background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.15) 0 6px,transparent 6px 12px)}
.mg-card .f::after{content:"?";color:#fff;font-size:26px}
.mg-card .b{background:#fdf6e3;transform:rotateY(180deg);font-size:30px}
.mg-card .b img{width:80%;height:80%;object-fit:contain;image-rendering:pixelated}
.mg-card.done .b{background:#d3f9d8}
.mg-lyric{background:#fff9db;border:4px solid #000;padding:14px;font-size:18px;line-height:1.8;text-align:center}
.mg-yt{position:relative;width:100%;aspect-ratio:16/9;border:4px solid #000;background:#000}
.mg-yt iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.mg-dots{display:flex;gap:6px;justify-content:center}
.mg-dots i{width:16px;height:16px;border:3px solid #000;background:#fff}
.mg-dots i.ok{background:#92cc41}.mg-dots i.now{background:#f7d51d}
@keyframes mg-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.mg-shake{animation:mg-shake .25s 2}
.mg-stage{position:relative}
.mg-banner{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);background:rgba(20,22,50,.82);color:#ffe066;text-align:center;font-size:20px;line-height:1.5;padding:12px 8px;z-index:5;animation:mg-in .3s steps(3)}
@keyframes mg-in{from{opacity:0}to{opacity:1}}
`;
if(!document.getElementById('mg-style')){ const st=document.createElement('style'); st.id='mg-style'; st.textContent=css; document.head.appendChild(st); }

const banner=(host,text)=>{ host.classList.add('mg-stage'); const b=document.createElement('div'); b.className='mg-banner'; b.textContent=text; host.appendChild(b); };
const h=(html)=>{ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; };

/* 觸控按鍵：按住才算，可多指同時按 */
function makePad(parent, keys, zKey){
  const st={}; const pad=h('<div class="mg-pad"><div class="grp L"></div><div class="grp R"></div></div>');
  keys.forEach(k=>{
    st[k.id]=false;
    const b=h(`<button class="mg-key ${k.red?'red':''}" aria-label="${k.label}">${k.label}</button>`);
    const on=e=>{ e.preventDefault(); st[k.id]=true; b.classList.add('on'); try{b.setPointerCapture(e.pointerId);}catch(_){} };
    const off=e=>{ st[k.id]=false; b.classList.remove('on'); };
    b.addEventListener('pointerdown',on); b.addEventListener('pointerup',off); b.addEventListener('pointercancel',off); b.addEventListener('lostpointercapture',off);
    b.addEventListener('contextmenu',e=>e.preventDefault());
    pad.querySelector(k.side==='R'?'.R':'.L').appendChild(b);
  });
  parent.appendChild(pad);
  // 電腦鍵盤也能玩
  // 電腦：方向鍵移動、↑ 跳，Z 是動作鍵（每個遊戲自己決定 Z 是跳還是殺球）
  const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',' ':'jump',z:zKey||'jump',Z:zKey||'jump'};
  const kd=e=>{ const id=map[e.key]; if(id && id in st){ st[id]=true; e.preventDefault(); } };
  const ku=e=>{ const id=map[e.key]; if(id && id in st){ st[id]=false; } };
  window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);
  st._cleanup=()=>{ window.removeEventListener('keydown',kd); window.removeEventListener('keyup',ku); };
  return st;
}

/* 像素圖：字串陣列＋色票 → 離屏 canvas */
function sprite(rows, pal){
  const c=document.createElement('canvas'); c.width=rows[0].length; c.height=rows.length; const g=c.getContext('2d');
  rows.forEach((r,y)=>[...r].forEach((ch,x)=>{ if(ch!=='.' && pal[ch]){ g.fillStyle=pal[ch]; g.fillRect(x,y,1,1); } }));
  return c;
}
function flip(src){ const c=document.createElement('canvas'); c.width=src.width; c.height=src.height; const g=c.getContext('2d'); g.translate(src.width,0); g.scale(-1,1); g.drawImage(src,0,0); return c; }

/* 莉莉：黑長髮平瀏海、黑色露肩上衣、窄裙、長靴（12×16） */
const LILY_PAL={K:'#111',H:'#e63946',S:'#f6d2b5',E:'#222',R:'#e05a6b',D:'#1e1e1e',W:'#f6d2b5',B:'#111',P:'#f4a3c0',Y:'#fff',C:'#4cc9f0'};   // 2026-11-04 Ming 用像素編輯器重畫（含腮紅、帽子色）
const LILY=[
  '...KKKKKK...',
  '..KKKKKKKB..',
  '.KKBBBBBBBK.',
  '.KKBSBBSBKB.',
  '.KKSESSESKK.',
  '.BKPSSSSPBB.',
  '.BKSSRRSSBB.',
  '.BKKBSSBKB..',
  '.BKWDDDDWB..',
  '..KDDDDDDB..',
  '...DDDDDD...',
  '...WDDDDW...',
  '....W..W....',
  '....B..B....',
  '....BB.BB...',
  '....BB.BB...'];   // 站姿（Ming 2026-11-04 v3，領口高一點）
const LILY_RUN=[
  '...KKKKKK...',
  '..KKKKKKKB..',
  '.BKBBBBBBBB.',
  '.BKBBWBBSKB.',
  '.BKSWESSDKB.',
  '.BKWPSSSSBB.',
  '.BKBSWRRSBB.',
  '.BKKBWSBKB..',
  '..BBWDDDWB..',
  '..BBDDDDDW..',
  '...BWDDD....',
  '.....DDDWW..',
  '..BBBWW..B..',
  '..BB.....BB.',
  '.........BB.',
  '............'];   // 跑步幀 v6（Ming 2026-11-04）
const LILY_MID=[
  '...KKKKKK...',
  '..KKKKKKKB..',
  '.KKBBBBBBBK.',
  '.KKBBWBBWKB.',
  '.KKSWDSWDKK.',
  '.BKWPSSWWBB.',
  '.BBBSWRRSBB.',
  '.BKKBSSBKB..',
  '.BKWDDDDWB..',
  '..KDDDDDDB..',
  '...DDDDDD...',
  '...WDDDDW...',
  '....W...W...',
  '....B...B...',
  '....BB..BB..',
  '....BB..BB..'];   // 過渡幀（Ming 2026-11-04 自己點）；站→過渡→跑→過渡
const LILY_FULL=[
  '......CC......',
  '......HH......',
  '.....YYYY.....',
  '.....HHHH.....',
  '....YYYYYY....',
  '....HHHHHH....',
  '...YYYYYYYY...',
  '...HHHHHHHH...',
  '...KKKKKKKB...',
  '..KKBBBBBBBK..',
  '..KKBSBBSBKB..',
  '..KKSESSESKK..',
  '..BKPSSSSPBB..',
  '..BKSSRRSSBB..',
  '..BKKBSSBKB...',
  '..BKWDDDDWB...',
  '...KDDDDDDB...',
  '....DDDDDD....',
  '....WDDDDW....',
  '.....W..W.....',
  '.....B..B.....',
  '.....BB.BB....',
  '.....BB.BB....'];   // 帽子版（Ming 2026-11-04 自己點；圖示、拍貼用）
/* LILY_FULL：戴生日帽的全身版（拍貼、圖示用），14×24 */
/* 墨墨：兩側推短、頭頂全黑微翹、平瀏海、細長眼、淡笑，小麥膚色、全黑（12×16） */
const MOMO_PAL={K:'#111',H:'#111',G:'#5a4a40',S:'#dcb48e',E:'#222',M:'#8a5a44',D:'#1e1e1e',B:'#111'};
const MOMO=[
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBBBBBBBBB.',
  '.GBBBBBBBBG.',
  '.GSBBBBBBSG.',
  '.SSSSSSSSSS.',
  '.MSEESSEESM.',
  '..SSSSSSSS..',
  '...SSMMSS...',
  '..BBBBBBBB..',
  '.BBBBBBBBBB.',
  '.BBBBBBBBBB.',
  '.BBBBBBBBBB.',
  '.SBBBBBBBBS.',
  '..BBB..BBB..',
  '.BBBB..BBBB.',
  '.BBBB..BBBB.'];   // 12×17（Ming 2026-11-04 定版）；畫的時候以腳底對齊
/* 墨墨（車長帽版）：台鐵式白色大盤帽＋橘帶金線＋金徽＋黑帽簷（Ming 2026-11-04 照實物），給開頭邀請函用（16×22） */
const MOMO_CAP_PAL={...MOMO_PAL, W:'#f4f4f4', A:'#b8b8b8', O:'#f39c2b', Y:'#f7b500', V:'#3d3d3d'};   // W 帽白、A 帽邊灰、O 橘帶、Y 金線／金徽、V 帽簷（比頭髮亮才分得出）
const MOMO_CAP=['.....AAAAAA.....', '...AAWWWWWWAA...', '..AWWWWWWWWWWA..', '.AWWWWWWWWWWWWA.', '.AWWWWKYYKWWWWA.', '.AWWWWYYYYWWWWA.', '..OOOOOYYOOOOO..', '..OVVVVVVVVVVO..', '...GBVVVVVVBG...', '...GSBBBBBBSG...', '...SSSSSSSSSS...', '...MSEESSEESM...', '....SSSSSSSS....', '.....SSMMSS.....', '....BBBBBBBB....', '...BBBBBBBBBB...', '...BBBBBBBBBB...', '...BBBBBBBBBB...', '...SBBBBBBBBS...', '....BBB..BBB....', '...BBBB..BBBB...', '...BBBB..BBBB...'];   // Ming 2026-11-04 用編輯器調過
const MOMO_JUMP=[
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBBBBBBBBB.',
  '.GBBBBBBBBG.',
  '.GSBBBBBBSG.',
  '.SSSSSSSSSS.',
  '.MSEESSEESM.',
  'SSSSSSSSSS..',
  'KK.SMMMMS...',
  'KKBBBBBBBBKK',
  'KBBBBBBBBBBK',
  '...BBBBBB.KK',
  '...BBBBBB.SS',
  '.KBBBKKBB...',
  '.KBBBKKBBBKK',
  'KKK...KBBBBK',
  'KKK.......KK'];   // 墨墨跳起來（排球用；Ming 2026-11-04 自己點；遊戲裡左右翻）
/* 通勤怪（超級莉莉的敵人，12×12） */
const GOON=[
  '....GGGG....',
  '..GGGGGGGG..',
  '.GGGGGGGGGG.',
  'GGWWGGGGWWGG',
  'GGWKGGGGKWGG',
  'GGGGGGGGGGGG',
  'GGGGKKKKGGGG',
  '.GGGGGGGGGG.',
  '..SSSSSSSS..',
  '..SSSSSSSS..',
  '.KKK....KKK.',
  'KKKK....KKKK'];
const GOON_PAL={G:'#8b5a2b',W:'#fff',K:'#111',S:'#f2d3a0'};

/* 翻翻牌像素圖示（16×16）：男主角、莉莉、排球、酒杯、橘貓、甜甜圈 */
const ICON_ART={
  man:{pal:{K:'#111',H:'#111',G:'#5a4a40',S:'#dcb48e',E:'#222',M:'#8a5a44',D:'#1e1e1e'},rows:[
    '....KKKKKKKK....',
    '...KKKKKKKKKK...',
    '..KKKKKKKKKKKK..',
    '..KKKKKKKKKKKK..',
    '..GKKKKKKKKKKG..',
    '..GSKKKKKKKKSG..',
    '..SSSSSSSSSSSS..',
    '..SSEESSSSEESS..',
    '..MSSSSSSSSSSM..',
    '...SSSSMMSSSS...',
    '....SSSSSSSS....',
    '...KKKKKKKKKK...',
    '..KKKKKKKKKKKK..',
    '..SKKKKKKKKKKS..',
    '...KKKKKKKKKK...',
    '..KKKKK..KKKKK..']},
  lily:{pal:{K:'#111',S:'#f6d2b5',E:'#222',R:'#e05a6b',P:'#f4a3a8',D:'#1e1e1e',B:'#111'},rows:[
    '....KKKKKKKK....',
    '...KKKKKKKKKK...',
    '..KKKKKKKKKKKK..',
    '..KKBSBBBBSBKK..',
    '..KKSESSSSESKK..',
    '..KKSPSSSSPSKK..',
    '..KKSSSRRSSSKK..',
    '..KKKSSSSSSKKK..',
    '..KKSSDDDDSSKK..',
    '..KKDDDDDDDDKK..',
    '..KKDDDDDDDDKK..',
    '...KDDDDDDDDK...',
    '....SDDDDDDS....',
    '.....S....S.....',
    '....BB....BB....',
    '....BB....BB....']},
  // 排球：照 Ming 給的黃藍漩渦球（6 片風車色塊，公式算出來的像素，不放商標）
  ball:{pal:{K:'#1b2a5e',Y:'#f5c400',B:'#1f3d9c'},rows:['................','.....KKKKKK.....','....KKBBBBKK....','...KBBBBBBYYK...','..KYYYYBBBYYYK..','.KKYYYYYBBYYYKK.','.KYYYYYYBBYYYYK.','.KYYBBBBBYYYYBK.','.KYBBBBBBYYYBBK.','.KBBBBYYBBBBBBK.','.KKBBBYYBBBBBKK.','..KBBBYYYBBBBK..','...KBBYYYYYYK...','....KKYYYYKK....','.....KKKKKK.....','................']},
  wine:{pal:{K:'#111',G:'#dfe8ef',R:'#a3123a',L:'#d6466a'},rows:[
    '................','...KKKKKKKKKK...','...KGGGGGGGGK...','...KGGGGGGGGK...','...KLLLLLLLLK...','...KRRRRRRRRK...','....KRRRRRRK....','....KRRRRRRK....',
    '.....KRRRRK.....','......KKKK......','.......KK.......','.......KK.......','.......KK.......','.......KK.......','....KKKKKKKK....','................']},
  // 橘貓：照 Ming 給的插畫，正臉、額頭深橘條紋、白口鼻、大圓眼帶反光、粉鼻
  cat:{pal:{K:'#3a2412',O:'#f0953a',D:'#c9621a',W:'#fff',P:'#f4a3a8',E:'#2b1a10',N:'#e8828f',M:'#8a5a44'},rows:[
    '.KK..........KK.',
    '.KOK........KOK.',
    '.KPOK......KOPK.',
    '.KPPOKKKKKKOPPK.',
    '.KOOODODDODOOOK.',
    'KOOOOODOODOOOOOK',
    'KOOOOOOOOOOOOOOK',
    'KDDOWEOOOOWEODDK',
    'KDOOEEOOOOEEOODK',
    'KOOOOOWWWOOOOOOK',
    'KDOOOWNNNWWOOODK',
    '.KOOWWWNWWWWOOK.',
    '.KOWWMWMWMWWWOK.',
    '..KWWMMMMMWWWK..',
    '...KKWWWWWWKK...',
    '.....KKKKKK.....']},   // Ming 2026-11-04 自己點
  donut:{pal:{K:'#5a3a1a',T:'#e3a35c',P:'#f48fb1',H:'#ffc6dc',C:'#fff',Y:'#f7d51d',B:'#4fc3f7'},rows:[
    '................','.....KKKKKK.....','...KKPPPPPPKK...','..KPPHPPYPPPPK..','.KPPPPPPPPBPPPK.','.KPYPPKKKKPPHPK.','KPPPPK....KPPPPK','KPBPK......KPPYK',
    'KPPPK......KBPPK','KTPPPK....KPPPTK','.KTPPPKKKKPPPTK.','.KTTTPPYPPPTTTK.','..KTTTTTTTTTTK..','...KKTTTTTTKK...','.....KKKKKK.....','................']},
};
const ICON_URL={};
function iconUrl(name){ if(ICON_URL[name]) return ICON_URL[name]; const a=ICON_ART[name]; if(!a) return null; const src=sprite(a.rows,a.pal); const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); g.imageSmoothingEnabled=false; g.drawImage(src,0,0,64,64); return ICON_URL[name]=c.toDataURL(); }

/* =========================================================
   1. 猜歌名
   ========================================================= */
function song(el, cfg, onWin){
  const songs=cfg.songs; let i=0; let done=false;
  window.__MG_WIN=()=>{ i=songs.length; draw(); };                         // 控制者「小遊戲通關」：走正常通關畫面
  const norm=s=>(s||'').toLowerCase().replace(/[\s\-—_~～'’"“”「」『』《》〈〉.,，。!！?？:：、]/g,'');
  const draw=()=>{
    if(i>=songs.length){ if(!done){ done=true; el.innerHTML='<div class="mg-lyric" style="min-height:140px"></div>'; banner(el.firstChild,'全部答對！'); setTimeout(onWin,1400); } return; }
    const s=songs[i];
    el.innerHTML='';
    const w=h(`<div class="mg-wrap">
      <div class="mg-dots">${songs.map((_,k)=>`<i class="${k<i?'ok':k===i?'now':''}"></i>`).join('')}</div>
      <p style="margin:0">第 ${i+1} 首，這句歌詞是哪首歌？</p>
      <div class="mg-lyric">${s.lyric}${s.hint?`<div class="tag" style="margin-top:6px">${s.hint}</div>`:''}${s.artist?`<div class="tag" style="margin-top:6px">歌手：${s.artist}</div>`:''}</div>
      <div id="mgyt"></div>
      ${s.audio?'<button class="nes-btn btn" id="mgplay">▶ 播放這一句</button>':''}
      <input class="nes-input" type="text" id="mgans" placeholder="歌名" style="letter-spacing:.05em">
      <div id="mgres"></div>
      <button class="nes-btn is-primary btn" id="mgchk">確認</button>
    </div>`);
    el.appendChild(w);
    const play=w.querySelector('#mgplay');
    // 只播本機音檔（clip:true＝已剪好的片段從頭播；否則照 start／end 播）
    let au=null;
    if(play) play.onclick=()=>{
      if(s.audio){
        if(!au){ au=new Audio(s.audio); au.preload='auto';
          au.onerror=()=>{ w.querySelector('#mgyt').innerHTML='<p class="msg nes-text is-warning">… 音檔還沒放：'+s.audio+'</p>'; };
        }
        const st=s.clip?0:(s.start||0), en=s.clip?null:s.end;
        au.currentTime=st; au.play().catch(()=>{});
        play.textContent='▶ 再聽一次';
        if(en){ clearInterval(au._t); au._t=setInterval(()=>{ if(au.currentTime>=en){ au.pause(); clearInterval(au._t); } },100); }
      }
    };
    const chk=()=>{ const v=norm(w.querySelector('#mgans').value); if(s.answers.some(a=>norm(a)===v)){ i++; draw(); } else { const r=w.querySelector('#mgres'); r.innerHTML='<p class="msg nes-text is-error">✕ 不是這首，再想想。</p>'; const inp=w.querySelector('#mgans'); inp.classList.remove('mg-shake'); void inp.offsetWidth; inp.classList.add('mg-shake'); } };
    w.querySelector('#mgchk').onclick=chk; w.querySelector('#mgans').onkeydown=e=>{ if(e.key==='Enter') chk(); };
  };
  draw();
  return ()=>{ document.querySelectorAll('audio').forEach(a=>a.pause()); el.innerHTML=''; };
}

/* =========================================================
   2. 翻翻牌：4×4、8 對；翻錯會蓋回去
   ========================================================= */
function memory(el, cfg, onWin){
  const keys=(cfg.icons&&cfg.icons.length?cfg.icons:['man','lily','ball','wine','cat','donut']);
  const NAMES={man:'墨墨',lily:'莉莉',ball:'排球！',wine:'喝酒囉',cat:'NONO',donut:'甜甜圈'};   // 翻到時 HUD 顯示的名字
  const icons=keys.map(v=>ICON_ART[v]?iconUrl(v):v), nameOf=v=>NAMES[keys[icons.indexOf(v)]]||'';
  const cols=icons.length*2%4===0?4:3;
  const deck=[...icons,...icons].map((v,k)=>({v,k})).sort(()=>Math.random()-.5);
  let open=[], lock=false, moves=0, matched=0, done=false;
  el.innerHTML='';
  const w=h(`<div class="mg-wrap"><div class="mg-hud"><span id="mgname">　</span><span id="mgmv">步數 0</span></div><div class="mg-mem" style="grid-template-columns:repeat(${cols},1fr)"></div></div>`);
  el.appendChild(w); const grid=w.querySelector('.mg-mem');
  window.__MG_WIN=()=>{ if(done) return; done=true; grid.querySelectorAll('.mg-card').forEach(c=>c.classList.add('open','done')); setTimeout(()=>{ banner(grid,'全部翻開了！'); setTimeout(onWin,1400); },400); };   // 控制者「小遊戲通關」
  const face=v=>/^data:image|\.(png|jpe?g|gif|svg|webp)$/i.test(v)?`<img src="${v}" alt="">`:v;
  deck.forEach(c=>{
    const d=h(`<div class="mg-card"><div class="in"><div class="f"></div><div class="b">${face(c.v)}</div></div></div>`);
    c.el=d;
    d.onclick=()=>{
      if(lock || d.classList.contains('open') || d.classList.contains('done')) return;
      d.classList.add('open'); open.push(c); w.querySelector('#mgname').textContent=nameOf(c.v);
      if(open.length===2){
        moves++; w.querySelector('#mgmv').textContent='步數 '+moves;
        const [a,b]=open;
        if(a.v===b.v){ a.el.classList.add('done'); b.el.classList.add('done'); open=[]; matched++;
          if(matched===icons.length && !done){ done=true; setTimeout(()=>{ banner(grid,'全部翻開了！'); setTimeout(onWin,1400); },400); } }
        else { lock=true; setTimeout(()=>{ a.el.classList.remove('open'); b.el.classList.remove('open'); open=[]; lock=false; },750); }
      }
    };
    grid.appendChild(d);
  });
  return ()=>{ el.innerHTML=''; };
}

/* =========================================================
   3. 超級莉莉：致敬 1-1 的簡易橫向闖關，自繪像素圖；碰到貓咪會停下來摸貓，終點是男主角
   ========================================================= */
function mario(el, cfg, onWin){
  const T=16, VW=16, VH=15, W=VW*T, H=VH*T;
  // 關卡：x 欄位置參照經典第一關的配置（簡化）
  const LEN=212; const map=Array.from({length:VH},()=>Array(LEN).fill('.'));
  const set=(x,y,c)=>{ if(x>=0&&x<LEN&&y>=0&&y<VH) map[y][x]=c; };
  for(let x=0;x<LEN;x++){ set(x,13,'G'); set(x,14,'G'); }
  [[69,70],[86,88],[153,154]].forEach(([a,b])=>{ for(let x=a;x<=b;x++){ set(x,13,'.'); set(x,14,'.'); } });
  set(16,9,'?'); [20,22,24].forEach(x=>set(x,9,'B')); [21,23].forEach(x=>set(x,9,'?')); set(22,5,'?');
  const pipe=(x,hgt)=>{ for(let y=13-hgt;y<13;y++){ set(x,y,y===13-hgt?'p':'P'); set(x+1,y,y===13-hgt?'q':'Q'); } };
  pipe(28,2); pipe(38,3); pipe(46,4); pipe(57,4);
  set(77,9,'B'); set(78,9,'?'); set(79,9,'B'); for(let x=80;x<=87;x++) set(x,5,'B');
  for(let x=91;x<=93;x++) set(x,5,'B'); set(94,5,'?'); set(94,9,'B');
  set(100,9,'B'); set(101,9,'B'); set(106,9,'?'); set(109,9,'?'); set(109,5,'?'); set(112,9,'?');
  set(118,9,'B'); for(let x=121;x<=123;x++) set(x,5,'B'); set(128,5,'B'); set(129,5,'?'); set(130,5,'?'); set(131,5,'B'); set(129,9,'B'); set(130,9,'B');
  const stair=(x0,dir,n)=>{ for(let k=0;k<n;k++){ const x=x0+k; const hgt=dir>0?k+1:n-k; for(let y=13-hgt;y<13;y++) set(x,y,'S'); } };
  stair(134,1,4); stair(140,-1,4); stair(148,1,4); for(let y=9;y<13;y++) set(152,y,'S');
  stair(155,-1,4); pipe(163,2); set(168,9,'B'); set(169,9,'B'); set(170,9,'?'); set(171,9,'B'); pipe(179,2);
  stair(181,1,8); for(let y=5;y<13;y++) set(189,y,'S');
  const BOY_X=198*T;                                   // 終點：男主角站的位置
  const solid=c=>'GB?bSPpQq'.includes(c);

  // 各種貓咪（取代原本的香菇怪），碰到就停下來摸貓
  const CAT_ROWS=[
    '.K.....K....',
    'KBK...KBK...',
    'KBBKKKBBK...',
    'KBBBBBBBK..K',
    'KBEBBBEBK.KB',
    'KBBBPBBBK.KB',
    '.KBBBBBK..KB',
    '.KBBBBBBKKB.',
    'KBBBBBBBBBK.',
    'KBBBBBBBBBK.',
    'KBKBK.KBKBK.',
    'KK.KK.KK.KK.'];
  const CAT_PALS=[
    {K:'#3a2412',B:'#f0953a',E:'#111',P:'#f4a3a8'},   // 橘貓
    {K:'#000',B:'#333',E:'#c8e04a',P:'#f4a3a8'},      // 黑貓
    {K:'#555',B:'#f7f7f7',E:'#3b82c4',P:'#f4a3a8'},   // 白貓
    {K:'#333',B:'#9aa0a6',E:'#111',P:'#f4a3a8'},      // 灰貓
    {K:'#5a3a1a',B:'#f2d3a0',E:'#111',P:'#f4a3a8'},   // 奶茶貓
  ];
  const catImgs=CAT_PALS.map(p=>{ const s=sprite(CAT_ROWS,p); return {L:s,R:flip(s)}; });
  const catsInit=[22,40,51,53,80,82,97,99,107,109,114,116,124,126,128,130,174,176].map((x,k)=>({x:x*T,y:12*T-12,vx:-0.45,alive:true,petted:false,w:12,h:12,kind:k%CAT_PALS.length}));
  catsInit[4].y=4*T-12; catsInit[5].y=4*T-12;

  el.innerHTML='';
  const w=h(`<div class="mg-wrap"><div class="mg-hud"><span id="mgcoin">摸了 0 隻貓</span><span>去找他！</span></div><canvas class="mg-canvas" width="${W}" height="${H}"></canvas></div>`);
  el.appendChild(w);
  const cv=w.querySelector('canvas'), g=cv.getContext('2d'); g.imageSmoothingEnabled=false;
  const pad=makePad(w,[{id:'left',label:'◀',side:'L'},{id:'right',label:'▶',side:'L'},{id:'jump',label:'跳',side:'R',red:true}],'jump');
  const sp=sprite(LILY,LILY_PAL), spR=sprite(LILY_RUN,LILY_PAL), spM=sprite(LILY_MID,LILY_PAL), spL=flip(sp), spRL=flip(spR), spML=flip(spM);
  const boy=sprite(MOMO,MOMO_PAL), boyL=flip(boy);

  let P, cats, cam, petCount=0, bumps=[], hearts=[], won=0, dead=0, petting=0, petCat=null, raf, lastT=0, acc=0, frame=0;
  let safeX=3*T;                                       // 掉下去就從最後站穩的地方重來
  const reset=()=>{ P={x:safeX,y:12*T-16,vx:0,vy:0,w:10,h:16,on:false,face:1,jumpHeld:false}; cam=Math.max(0,safeX-5*T); if(!cats) cats=catsInit.map(c=>({...c})); dead=0; petting=0; };
  reset();
  const tileAt=(px,py)=>{ const x=Math.floor(px/T), y=Math.floor(py/T); if(y<0||y>=VH) return '.'; if(x<0||x>=LEN) return 'G'; return map[y][x]; };
  window.__MG_WIN=()=>{ if(won) return; P.x=BOY_X-P.w; P.y=12*T-16; P.vy=0; cam=Math.max(0,P.x-6*T); };   // 傳送到墨墨面前，下一幀就觸發通關
  if(window.__MG_DEBUG) window.__MG_DEBUG.mario={ warp:(tx)=>{ P.x=tx*T; P.y=12*T-16; P.vy=0; cam=Math.max(0,P.x-6*T); } };   // 只給自動測試用
  const collideX=(o)=>{ const top=o.y+1, bot=o.y+o.h-1;
    if(o.vx>0){ const ex=o.x+o.w; for(const yy of [top,(top+bot)/2,bot]) if(solid(tileAt(ex,yy))){ o.x=Math.floor(ex/T)*T-o.w-0.01; return true; } }
    else if(o.vx<0){ for(const yy of [top,(top+bot)/2,bot]) if(solid(tileAt(o.x,yy))){ o.x=(Math.floor(o.x/T)+1)*T+0.01; return true; } }
    return false; };
  const collideY=(o,isP)=>{ o.on=false; const l=o.x+1, r=o.x+o.w-1;
    if(o.vy>0){ const ey=o.y+o.h; for(const xx of [l,r]) if(solid(tileAt(xx,ey))){ o.y=Math.floor(ey/T)*T-o.h; o.vy=0; o.on=true; return; } }
    else if(o.vy<0){ for(const xx of [l,(l+r)/2,r]) if(solid(tileAt(xx,o.y))){ const tx=Math.floor(xx/T), ty=Math.floor(o.y/T); o.y=(ty+1)*T; o.vy=0;
        if(isP){ if(map[ty][tx]==='?'){ map[ty][tx]='b'; bumps.push({x:tx,y:ty,t:0,heart:true}); } else if(map[ty][tx]==='B'){ bumps.push({x:tx,y:ty,t:0}); } }
        return; } } };
  const addHearts=(x,y,n)=>{ for(let k=0;k<n;k++) hearts.push({x:x+(Math.random()*16-8),y:y-k*6,t:0,vx:(Math.random()-.5)*0.4}); };

  const step=()=>{
    frame++;
    hearts.forEach(hh=>{ hh.t++; hh.y-=0.6; hh.x+=hh.vx; }); hearts=hearts.filter(hh=>hh.t<60);
    bumps.forEach(b=>b.t++); bumps=bumps.filter(b=>b.t<24);
    if(won){ won++; P.vx=0; P.vy=Math.min(P.vy+0.25,5); P.y+=P.vy; collideY(P,false);     // 先落地再牽手
      if(won%20===0) addHearts(BOY_X, 12*T-20, 2); if(won===150) onWin(); return; }
    if(dead){ dead++; P.vy+=0.25; P.y+=P.vy; if(dead>70) reset(); return; }
    // 摸貓中：停下來，貓坐下冒愛心
    if(petting){ petting--; P.vx=0; if(petting%15===0) addHearts(petCat.x+6, petCat.y-4, 1); if(!petting){ petCat.petted=true; petCat=null; } return; }
    const acc_=0.12, max=1.6;
    if(pad.left){ P.vx=Math.max(P.vx-acc_,-max); P.face=-1; } else if(pad.right){ P.vx=Math.min(P.vx+acc_,max); P.face=1; } else { P.vx*=0.8; if(Math.abs(P.vx)<0.05) P.vx=0; }
    if(pad.jump && P.on && !P.jumpHeld){ P.vy=-6.3; P.jumpHeld=true; }      // 跳得過 4 格高的水管
    if(!pad.jump){ P.jumpHeld=false; if(P.vy<-2.5) P.vy=-2.5; }
    P.vy=Math.min(P.vy+0.25,5);
    P.x+=P.vx; if(P.x<cam){ P.x=cam; P.vx=0; } if(collideX(P)) P.vx=0;
    P.y+=P.vy; collideY(P,true);
    if(P.on && P.y>=12*T-16 && solid(tileAt(P.x-T,13*T+1)) && solid(tileAt(P.x+P.w+T,13*T+1))) safeX=P.x;
    if(P.y>H+20){ dead=1; P.vy=-4; }
    cam=Math.max(cam, Math.min(P.x-6*T, (LEN-VW)*T));
    cats.forEach(c=>{
      if(c.x>cam+W+2*T || c.x<cam-3*T) return;
      if(!c.petted){
        c.vy=Math.min((c.vy||0)+0.25,5); c.x+=c.vx; if(collideX(c)) c.vx=-c.vx;
        // 走到邊緣會轉頭，不會掉下去
        const ahead=c.vx<0?c.x-1:c.x+c.w+1; if(!solid(tileAt(ahead,c.y+c.h+2)) && c.on) { c.vx=-c.vx; }
        c.y+=c.vy; collideY(c,false); if(c.y>H+40){ c.petted=true; c.gone=true; }
      }
      if(!c.petted && !c.gone && Math.abs((P.x+P.w/2)-(c.x+6))<11 && Math.abs((P.y+P.h/2)-(c.y+6))<13){
        petting=75; petCat=c; c.vx=0; petCount++; w.querySelector('#mgcoin').textContent=`摸了 ${petCount} 隻貓`;
        P.face = c.x>P.x?1:-1; if(P.vy<0) P.vy=0; addHearts(c.x+6,c.y-4,2);
      }
    });
    // 碰到男主角就過關
    if(P.x+P.w>=BOY_X-1 && !won){ won=1; P.x=BOY_X-11; P.vx=0; if(P.vy<0) P.vy=0; P.face=1; addHearts(BOY_X,12*T-20,4); }
  };

  const heart=(x,y,c)=>{ g.fillStyle=c||'#e76e8a'; g.fillRect(x,y,2,2); g.fillRect(x+3,y,2,2); g.fillRect(x-1,y+1,7,2); g.fillRect(x,y+3,5,1); g.fillRect(x+1,y+4,3,1); g.fillRect(x+2,y+5,1,1); };
  const drawTile=(c,x,y)=>{
    const X=x*T-Math.round(cam), Y=y*T;
    const bump=bumps.find(b=>b.x===x&&b.y===y); const dy=bump?-Math.round(Math.sin(Math.min(bump.t,20)/20*Math.PI)*4):0;
    if(c==='G'){ g.fillStyle='#c84c0c'; g.fillRect(X,Y,T,T); g.fillStyle='#000'; g.fillRect(X,Y+T-1,T,1); g.fillRect(X+T-1,Y,1,T); g.fillStyle='#fcbcb0'; g.fillRect(X,Y,T-1,1); g.fillRect(X,Y,1,T-1); }
    else if(c==='B'){ g.fillStyle='#c84c0c'; g.fillRect(X,Y+dy,T,T); g.fillStyle='#000'; g.fillRect(X,Y+dy+T-1,T,1); g.fillRect(X,Y+dy+7,T,1); g.fillRect(X+7,Y+dy,1,7); g.fillRect(X+3,Y+dy+8,1,7); g.fillRect(X+11,Y+dy+8,1,7); }
    else if(c==='?'||c==='b'){ g.fillStyle=c==='?'?'#f8b800':'#a0522d'; g.fillRect(X,Y+dy,T,T); g.fillStyle='#000'; g.fillRect(X,Y+dy+T-1,T,1); g.fillRect(X+T-1,Y+dy,1,T);
      if(c==='?'){ g.fillStyle='#fff'; g.fillRect(X+5,Y+dy+3,6,2); g.fillRect(X+9,Y+dy+5,2,3); g.fillRect(X+7,Y+dy+8,2,2); g.fillRect(X+7,Y+dy+11,2,2); } }
    else if(c==='S'){ g.fillStyle='#c84c0c'; g.fillRect(X,Y,T,T); g.fillStyle='#fcbcb0'; g.fillRect(X,Y,T,2); g.fillRect(X,Y,2,T); g.fillStyle='#000'; g.fillRect(X,Y+T-2,T,2); g.fillRect(X+T-2,Y,2,T); }
    else if('PpQq'.includes(c)){ const top=c==='p'||c==='q'; const left=c==='P'||c==='p'; g.fillStyle='#00a800'; g.fillRect(X+(top?0:(left?2:0)),Y,top?T:T-2,T); g.fillStyle='#80d010'; if(left) g.fillRect(X+(top?3:5),Y,3,T); g.fillStyle='#000'; if(top) g.fillRect(X,Y+T-1,T,1); }
  };
  const draw=()=>{
    g.fillStyle='#5c94fc'; g.fillRect(0,0,W,H);
    // 背景：每 16 格一朵雲、一座小山
    for(let x=0;x<LEN;x+=16){ const X=x*T-Math.round(cam); if(X>-96&&X<W+96){
      const cy=2*T+((x/16)%2?10:0); g.fillStyle='#fff'; g.fillRect(X+40,cy,40,10); g.fillRect(X+48,cy-6,24,6);
      g.fillStyle='#00a800'; g.beginPath(); g.moveTo(X,13*T); g.lineTo(X+40,13*T-28); g.lineTo(X+80,13*T); g.fill(); } }
    const x0=Math.floor(cam/T), x1=x0+VW+1;
    for(let y=0;y<VH;y++) for(let x=x0;x<=x1&&x<LEN;x++){ const c=map[y][x]; if(c!=='.') drawTile(c,x,y); }
    bumps.filter(b=>b.heart).forEach(b=>heart(b.x*T-Math.round(cam)+5, b.y*T-10-b.t));
    // 貓咪
    cats.forEach(c=>{ if(c.gone) return; const X=Math.round(c.x-cam), Y=Math.round(c.y); if(X<-16||X>W+16) return;
      const im=catImgs[c.kind]; const bob=(!c.petted && Math.floor(frame/10)%2)?1:0;
      g.drawImage(c.vx>0?im.R:im.L, X, Y+bob);
      if(c.petted && Math.floor(frame/30)%2) heart(X+4, Y-8, '#f4a3a8'); });
    // 男主角（終點）
    const BX=Math.round(BOY_X-cam);
    if(BX>-16 && BX<W+16){ g.drawImage(boy, BX, 13*T-boy.height); if(!won && Math.floor(frame/40)%2) heart(BX+3, 13*T-26); }
    // 莉莉
    let img; if(won){ img=sp; }
    else { const moving=Math.abs(P.vx)>0.2 && P.on, f2=Math.floor(frame/6)%2; img=!moving?(P.face>0?sp:spL):(P.face>0?(f2?spR:spM):(f2?spRL:spML)); }   // 站著＝站姿；跑動＝跑步幀與過渡幀交替，不回站姿
    g.drawImage(img, won&&P.on?BX-9:Math.round(P.x-cam)-1, Math.round(P.y));   // 通關：兩人靠在一起
    // 摸貓的手
    if(petting && petCat){ const hx=Math.round((P.face>0?P.x+P.w:P.x-3)-cam), hy=Math.round(P.y+10); g.fillStyle='#f6d2b5'; g.fillRect(hx, hy+((frame>>3)%2), 3, 2); }
    hearts.forEach(hh=>heart(Math.round(hh.x-cam), Math.round(hh.y)));
    if(won>30){ g.fillStyle='rgba(0,0,0,.55)'; g.fillRect(0,H/2-34,W,34); g.fillStyle='#ffe066'; g.font='18px "Fusion Pixel 12px Proportional TC",sans-serif'; g.textAlign='center'; g.fillText('成功通關！',W/2,H/2-11); g.textAlign='start'; }
  };
  const loop=(t)=>{ if(!lastT) lastT=t; acc+=Math.min(100,t-lastT); lastT=t; while(acc>=1000/60){ step(); acc-=1000/60; } draw(); raf=requestAnimationFrame(loop); };
  raf=requestAnimationFrame(loop);
  return ()=>{ cancelAnimationFrame(raf); pad._cleanup(); el.innerHTML=''; };
}

/* =========================================================
   4. 排球對決：致敬皮卡丘排球，莉莉 vs 墨墨
   ========================================================= */
function volley(el, cfg, onWin){
  const W=432, H=304, GROUND=272, NETX=216, NETTOP=176, NETW=6, PR=20, BR=12, TARGET=cfg.target||5;
  el.innerHTML='';
  const w=h(`<div class="mg-wrap"><div class="mg-hud"><span>莉莉 <b id="mgs1">0</b></span><span>先拿 ${TARGET} 分</span><span><b id="mgs2">0</b> 墨墨</span></div><div style="position:relative"><canvas class="mg-canvas" width="${W}" height="${H}"></canvas><div id="mgstart" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(20,22,50,.45)"><button class="nes-btn is-primary" style="font-size:22px;padding:10px 36px">開始</button></div></div><div id="mgmsg"></div></div>`);
  el.appendChild(w);
  let started=false; const startBox=w.querySelector('#mgstart'); startBox.querySelector('button').onclick=()=>{ started=true; startBox.remove(); };   // 按開始才開打
  const cv=w.querySelector('canvas'), g=cv.getContext('2d'); g.imageSmoothingEnabled=false;
  const pad=makePad(w,[{id:'left',label:'◀',side:'L'},{id:'right',label:'▶',side:'L'},{id:'jump',label:'跳',side:'R'},{id:'hit',label:'殺',side:'R',red:true}],'hit');
  const sL=sprite(LILY,LILY_PAL), sLJ=sprite(LILY_RUN,LILY_PAL), sM=flip(sprite(MOMO,MOMO_PAL)), sMJ=flip(sprite(MOMO_JUMP,MOMO_PAL));   // 跟站姿一樣左右翻（Ming 確認這個方向才對）   // 跳起來時換圖
  const ballImg=sprite(ICON_ART.ball.rows, ICON_ART.ball.pal); let spin=0;
  let me, ai, ball, s1=0, s2=0, pause=60, serve=0, over=false, overText=null, noteText=null, raf, lastT=0, acc=0, hitCD=0, fault=null;
  const mercy=()=>s2>=TARGET-1;
  window.__MG_WIN=()=>{ if(over) return; started=true; const sb=w.querySelector('#mgstart'); if(sb) sb.remove(); s1=TARGET-1; score(true); };                                    // 墨墨拿到 10 分就開始放水
  const newRally=(toLeft)=>{ me={x:100,y:GROUND-PR,vy:0}; ai={x:W-100,y:GROUND-PR,vy:0,react:0}; ball={x:toLeft?100:W-100,y:60,vx:0,vy:0}; pause=50; };
  newRally(true);
  const score=(leftWins)=>{ if(leftWins) s1++; else s2++; w.querySelector('#mgs1').textContent=s1; w.querySelector('#mgs2').textContent=s2;
    if(s1>=TARGET){ over=true; overText=mercy()?['為了讓莉莉過關，','墨墨放水了！']:['莉莉贏了！']; setTimeout(onWin,2500); return; }
    // 墨墨先拿到分數也算通關
    if(s2>=TARGET){ over=true; overText=['妳輸了','但墨墨愛妳','所以妳贏了','♥']; setTimeout(onWin,3500); return; }
    newRally(leftWins); };
  const bounce=(p,isMe,spiking)=>{
    const dx=ball.x-p.x, dy=ball.y-p.y, d=Math.hypot(dx,dy); if(d>=PR+BR || d===0) return;
    const nx=dx/d, ny=dy/d; ball.x=p.x+nx*(PR+BR); ball.y=p.y+ny*(PR+BR);
    if(!isMe && mercy()){ ball.vx=1.5+Math.random(); ball.vy=-4; return; }   // 放水：輕輕往自己後面撥，球落在自己這邊
    if(!isMe){                                                        // 墨墨：每一球都殺，算好角度剛好擦過網上再往下砸
      const vx=-(6.5+Math.random()*1.5), t=Math.max(1,(ball.x-NETX)/-vx), aimY=NETTOP-BR-18-Math.random()*24;   // 球速放慢，留一點接球的機會
      ball.vx=vx; ball.vy=Math.max(-11, Math.min(4, (aimY-ball.y-0.13*t*t)/t)); return; }
    if(spiking){ ball.vx=11; ball.vy= ball.y<NETTOP? 3 : -3; }
    else { const sp=Math.max(7, Math.hypot(ball.vx,ball.vy)*0.9); ball.vx=nx*sp*0.8 + (isMe?1.2:-1.2); ball.vy=Math.min(ny*sp - 2, -5); }
  };
  const movePlayer=(p,l,r,j,minX,maxX)=>{ if(l) p.x-=3.2; if(r) p.x+=3.2; p.x=Math.max(minX,Math.min(maxX,p.x)); if(j && p.y>=GROUND-PR-0.1) p.vy=-9; p.vy+=0.45; p.y+=p.vy; if(p.y>GROUND-PR){ p.y=GROUND-PR; p.vy=0; } };
  const step=()=>{
    if(over || !started) return;
    if(fault){ faultStep(); return; }
    if(pause>0){ pause--; return; }
    // 玩家
    movePlayer(me,pad.left,pad.right,pad.jump,PR,NETX-NETW/2-PR);
    const spiking=pad.hit && me.y<GROUND-PR-20 && hitCD<=0;
    // 電腦：看球落點、球在自己這邊才追
    // 電腦（墨墨）超強：預判落點、跑得快，球到他那邊一定接得到，有機會就殺球
    let tx=W-110;
    if(ball.x>NETX-40){ let px=ball.x, py=ball.y, vx=ball.vx, vy=ball.vy; for(let k=0;k<120 && py<GROUND-PR-BR;k++){ vy+=0.26; px+=vx; py+=vy; if(px>W-BR){px=W-BR; vx=-Math.abs(vx);} } tx=Math.max(NETX+NETW/2+PR, Math.min(W-PR, px+6)); }
    if(mercy()){                                            // 放水：不追球，在場上慢慢晃來晃去（甩態）
      if(!ai.wander || ai.wander.t<=0) ai.wander={dir:Math.random()<0.5?-1:1, t:60+Math.random()*90};
      ai.wander.t--; ai.x+=ai.wander.dir*0.7;
      if(ai.x<NETX+NETW/2+PR+30){ ai.x=NETX+NETW/2+PR+30; ai.wander.dir=1; } if(ai.x>W-PR-20){ ai.x=W-PR-20; ai.wander.dir=-1; }
    }
    const aiL = !mercy() && ai.x>tx+2, aiR = !mercy() && ai.x<tx-2;              // 跟莉莉一樣只能用跑的（速度相同），靠預判提早跑位
    const aiJ = !mercy() && ball.x>NETX-30 && Math.abs(ball.x-ai.x)<40 && ball.y<ai.y-30 && ball.y>ai.y-170;   // 能跳就跳，在空中殺
    movePlayer(ai,aiL,aiR,aiJ,NETX+NETW/2+PR,W-PR);
    const aiSpike = ai.y<GROUND-PR-25 && ball.y<NETTOP-10 && Math.abs(ball.x-ai.x)<PR+BR+6;   // 只在網子以上殺球
    // 球
    ball.vy+=0.26; ball.x+=ball.vx; ball.y+=ball.vy;
    if(ball.x<BR){ ball.x=BR; ball.vx=Math.abs(ball.vx); } if(ball.x>W-BR){ ball.x=W-BR; ball.vx=-Math.abs(ball.vx); }
    if(ball.y<BR){ ball.y=BR; ball.vy=Math.abs(ball.vy); }
    // 網子
    if(ball.y+BR>NETTOP && Math.abs(ball.x-NETX)<NETW/2+BR){
      if(ball.y<NETTOP+4 && ball.vy>0){ ball.y=NETTOP-BR; ball.vy=-Math.abs(ball.vy)*0.8; }
      else { ball.vx = ball.x<NETX ? -Math.abs(ball.vx)-0.5 : Math.abs(ball.vx)+0.5; ball.x = ball.x<NETX ? NETX-NETW/2-BR : NETX+NETW/2+BR; }
    }
    const before=ball.vx;
    bounce(me,true,spiking); if(spiking && before!==ball.vx) hitCD=20; hitCD--;
    bounce(ai,false,aiSpike);
    if(ball.y+BR>=GROUND){
      if(ball.x<NETX && mercy()){ fault={t:0}; ball.y=GROUND-BR; ball.vx=0; ball.vy=0; return; }   // 放水中莉莉還是失分 → 墨墨跑去觸網
      score(ball.x>NETX); }
  };
  // 觸網橋段：墨墨跑到網邊 → 顯示「墨墨觸網 莉莉得分」→ 莉莉加 1 分
  const faultStep=()=>{
    fault.t++;
    if(ai.x>NETX+NETW/2+PR) ai.x=Math.max(NETX+NETW/2+PR, ai.x-3.2);
    else if(!noteText){ noteText=['墨墨觸網','莉莉得分']; fault.t=0; }
    if(noteText && fault.t>110){ noteText=null; fault=null; score(true); }
  };
  const draw=()=>{
    g.fillStyle='#87ceeb'; g.fillRect(0,0,W,H);
    g.fillStyle='#fff'; for(let k=0;k<6;k++){ g.fillRect((k*83+20)%W, 30+(k%3)*20, 30, 8); }
    g.fillStyle='#f4d58d'; g.fillRect(0,GROUND,W,H-GROUND); g.fillStyle='#d9b45f'; for(let x=0;x<W;x+=8) g.fillRect(x,GROUND+((x/8)%2?6:14),4,2);
    g.fillStyle='#fff'; g.fillRect(NETX-NETW/2,NETTOP,NETW,GROUND-NETTOP); g.fillStyle='#555'; for(let y=NETTOP;y<GROUND;y+=8) g.fillRect(NETX-NETW/2,y,NETW,2);
    g.fillStyle='#e76e8a'; g.fillRect(NETX-NETW/2-1,NETTOP-4,NETW+2,6);
    // 人物（12×16 放大 3 倍）
    const drawP=(img,p)=>{ g.drawImage(img, Math.round(p.x-18), Math.round(p.y-PR-6)-(img.height-16)*3, img.width*3, img.height*3); };   // 腳底對齊，墨墨比較高也不會被壓扁
    const air=p=>p.y<GROUND-PR-1; drawP(air(me)?sLJ:sL,me); drawP(air(ai)?sMJ:sM,ai);
    // 影子與球
    g.fillStyle='rgba(0,0,0,.2)'; g.fillRect(Math.round(ball.x-BR),GROUND+2,BR*2,4);
    spin+=ball.vx*0.04;
    g.save(); g.translate(Math.round(ball.x),Math.round(ball.y)); g.rotate(Math.round(spin*8)/8); g.drawImage(ballImg,-BR-2,-BR-2,(BR+2)*2,(BR+2)*2); g.restore();
    const box=overText||noteText;
    if(box){ const lh=26, pad=16, bh=box.length*lh+pad*2, bt=Math.round(H/2-70-bh/2);   // 上下留白一樣
      g.fillStyle='rgba(20,22,50,.82)'; g.fillRect(0,bt,W,bh); g.fillStyle='#ffe066'; g.font='20px "Fusion Pixel 12px Proportional TC",sans-serif'; g.textAlign='center'; g.textBaseline='middle';
      box.forEach((t,k)=>g.fillText(t,W/2,bt+pad+lh*(k+0.5))); g.textAlign='start'; g.textBaseline='alphabetic'; }
    if(pause>0 && !over && started){ g.fillStyle='rgba(0,0,0,.45)'; g.fillRect(0,H/2-50,W,34); g.fillStyle='#ffe066'; g.font='18px "Fusion Pixel 12px Proportional TC",sans-serif'; g.textAlign='center'; g.fillText(s1+s2===0?'開始！':`${s1} : ${s2}`,W/2,H/2-26); g.textAlign='start'; }
  };
  const loop=(t)=>{ if(!lastT) lastT=t; acc+=Math.min(100,t-lastT); lastT=t; while(acc>=1000/60){ step(); acc-=1000/60; } draw(); raf=requestAnimationFrame(loop); };
  raf=requestAnimationFrame(loop);
  if(window.__MG_DEBUG) window.__MG_DEBUG.volley={ set:(a,b)=>{ s1=a; s2=b; w.querySelector('#mgs1').textContent=s1; w.querySelector('#mgs2').textContent=s2; }, get:()=>({s1,s2,fault:!!fault,note:noteText,over:overText}) };   // 只給自動測試用
  return ()=>{ cancelAnimationFrame(raf); pad._cleanup(); el.innerHTML=''; };
}

/* =========================================================
   5. 拼圖：n×n 點兩格交換（app.html 麟光關用自己的版本，這份給試玩頁）
   ========================================================= */
function puzzle(el, cfg, onWin){
  const n=cfg.grid||6, img=cfg.image||'img/s0_puzzle_pixel.png', lockOK=cfg.lock!==false;
  let order=[...Array(n*n).keys()].sort(()=>Math.random()-.5), sel=-1, done=false;
  if(order.every((v,i)=>v===i)) [order[0],order[1]]=[order[1],order[0]];
  const locked=()=>order.map((t,i)=>lockOK && t===i);
  el.innerHTML='';
  const w=h(`<div class="mg-wrap"><div class="mg-hud"><span class="tag">${lockOK?'拼對的格子會鎖住。':''}</span><span class="tag" id="mgleft"></span></div><div class="grid" style="display:grid;grid-template-columns:repeat(${n},1fr);gap:2px;aspect-ratio:1;background:#000;border:4px solid #000"></div></div>`);
  el.appendChild(w); const g=w.querySelector('.grid'); const pct=100/(n-1); g.parentElement.style.position='relative';
  const finish=()=>{ done=true; g.style.gap='0'; draw(); banner(g.parentElement,'拼好了！'); setTimeout(()=>{ const b=g.parentElement.querySelector('.mg-banner'); if(b) b.remove(); onWin(); },1400); };   // 拼好：去分隔線與鎖定框、字幕 1.4 秒後收掉，讓她看整張圖
  window.__MG_WIN=()=>{ if(done) return; order=[...Array(n*n).keys()]; finish(); };
  const draw=()=>{ const lk=locked(); const left=order.filter((t,i)=>t!==i).length; w.querySelector('#mgleft').textContent=left?`還差 ${left} 格`:''; g.innerHTML=''; order.forEach((t,pos)=>{ const d=document.createElement('div');
    d.style.cssText=`background-image:url(${img});background-size:${n*100}% ${n*100}%;background-position:${(t%n)*pct}% ${Math.floor(t/n)*pct}%;cursor:${lk[pos]?'default':'pointer'};${sel===pos?'outline:4px solid #f7d51d;outline-offset:-4px;':''}${lk[pos]&&!done?'box-shadow:inset 0 0 0 2px #92cc41;':''}`;
    d.onclick=()=>{ if(done || lk[pos]) return; if(sel<0) sel=pos; else if(sel===pos) sel=-1; else { [order[sel],order[pos]]=[order[pos],order[sel]]; sel=-1; if(order.every((v,i)=>v===i)){ finish(); return; } } draw(); };
    g.appendChild(d); }); };
  draw();
  return ()=>{ el.innerHTML=''; };
}

window.MiniGames={ song, memory, mario, volley, puzzle };
window.MG_SPRITES={ LILY, LILY_PAL, LILY_RUN, LILY_MID, LILY_FULL, MOMO, MOMO_JUMP, MOMO_PAL, MOMO_CAP, MOMO_CAP_PAL, ICON_ART };   // 給 app.html 的拍貼畫人物用
})();
