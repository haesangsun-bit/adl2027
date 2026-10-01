const menuBtn=document.querySelector('.menu-button');
const nav=document.querySelector('.nav');
if(menuBtn&&nav){menuBtn.addEventListener('click',()=>nav.classList.toggle('open'));}

(async()=>{
  try{
    const parts=await Promise.all([0,1,2,3].map(i=>fetch(`assets/hero-${i}.txt`).then(r=>{
      if(!r.ok) throw new Error('hero chunk '+i);
      return r.text();
    })));
    const data=`data:image/jpeg;base64,${parts.join('')}`;
    const hero=document.querySelector('.hero');
    if(hero){
      hero.style.backgroundImage=`linear-gradient(90deg,rgba(13,33,55,.58) 0%,rgba(32,48,70,.38) 30%,rgba(58,55,73,.12) 56%,rgba(0,0,0,.02) 100%),url("${data}")`;
    }
    document.querySelectorAll('.page-hero').forEach(el=>{
      el.style.backgroundImage=`linear-gradient(90deg,rgba(11,42,85,.84),rgba(11,42,85,.38)),url("${data}")`;
    });
  }catch(err){
    console.warn('Hero background could not be restored',err);
  }
})();