// wire up prompt input and generate button
function gen(){
  var word=document.getElementById('w').value.trim();
  currentWord=word;currentDateStr=todayStr();currentDisplayDate=todayDisplay();currentTimeStr=minuteTimeStr();
  document.getElementById('lbl').textContent=word?word.toUpperCase():'';
  document.getElementById('dlbl').textContent=currentDisplayDate;
  if(aid)cancelAnimationFrame(aid);
  P=build(word,currentDateStr,currentTimeStr);fadeAlpha=0;af=0;frame();
  updateFavBtn();
}
function clearPrompt(){document.getElementById('w').value='';currentWord='';document.getElementById('lbl').textContent='';document.getElementById('w').focus();updateFavBtn();}

// global keyboard shortcuts
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeExport();closeDaySlide();closeLogout();closeDeleteProfile();closeRename();closeEmailAuth();}});
document.getElementById('w').addEventListener('keydown',function(e){if(e.key==='Enter')gen();});
document.addEventListener('wheel',function(e){
  var desktopSwipe=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(!desktopSwipe)return;
  if(Math.abs(e.deltaX)>Math.abs(e.deltaY)&&Math.abs(e.deltaX)>3)e.preventDefault();
},{passive:false});
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').catch(function(err){
      console.warn('[aura] service worker registration failed',err);
    });
  });
}

// load keyword→mood map, then show profile screen
fetch('words.json')
  .then(function(r){return r.json();})
  .then(function(data){WORDS=data;})
  .catch(function(){WORDS={};})
  .finally(function(){initProfiles();});
