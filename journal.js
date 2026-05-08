// calendar navigation state
var calY=new Date().getFullYear(),calM=new Date().getMonth(),selectedDate=null;
var activeSwipeEntry=null;

// localStorage keys
var HISTORY_KEY='aura_history',MAX_HISTORY=365;
var PROFILE_LIST_KEY='aura_profiles',ACTIVE_PROFILE_KEY='aura_active_profile',activeProfile='';
var AUTH_MODE_KEY='aura_auth_mode';
var LEGACY_PROFILE_NAME='me',PENDING_HISTORY_KEY='aura_pending_history';

function profileInitial(name){return(name||'?').trim().charAt(0).toUpperCase();}
function profileStorageKeyFor(name){return HISTORY_KEY+'_'+encodeURIComponent(name);}
function profileStorageKey(){return profileStorageKeyFor(activeProfile);}
function loadProfiles(){try{return JSON.parse(localStorage.getItem(PROFILE_LIST_KEY))||[];}catch(e){return[];}}
function loadProfileEntries(name){try{return JSON.parse(localStorage.getItem(profileStorageKeyFor(name)))||[];}catch(e){return[];}}
function loadPendingEntries(){try{return JSON.parse(localStorage.getItem(PENDING_HISTORY_KEY))||[];}catch(e){return[];}}
function savePendingEntries(entries){try{if(entries&&entries.length)localStorage.setItem(PENDING_HISTORY_KEY,JSON.stringify(entries));else localStorage.removeItem(PENDING_HISTORY_KEY);}catch(e){}}
function profileIsLegacyDefault(name){return(name||'').trim().toLowerCase()===LEGACY_PROFILE_NAME;}
function mergeEntryLists(base,incoming){
  var map={};
  function add(entry){
    if(!entry)return;
    var key=entryKey(entry);
    if(map[key])map[key]=Object.assign({},map[key],entry,{fav:!!(map[key].fav||entry.fav)});
    else map[key]=entry;
  }
  (base||[]).forEach(add);
  (incoming||[]).forEach(add);
  return Object.keys(map).map(function(key){return map[key];}).sort(function(a,b){
    var av=(a.date||'')+' '+(a.time||'');
    var bv=(b.date||'')+' '+(b.time||'');
    return bv.localeCompare(av);
  }).slice(0,MAX_HISTORY);
}
function stashPendingEntries(entries){savePendingEntries(mergeEntryLists(loadPendingEntries(),entries||[]));}
function takePendingEntries(){var entries=loadPendingEntries();savePendingEntries([]);return entries;}
function mergeEntriesIntoProfile(name,entries){
  if(!entries||!entries.length)return;
  try{
    localStorage.setItem(profileStorageKeyFor(name),JSON.stringify(mergeEntryLists(loadProfileEntries(name),entries)));
    markDataChanged();
  }catch(e){}
}
function cleanupLegacyProfiles(){
  var profiles=loadProfiles(),next=[],changed=false;
  profiles.forEach(function(name){
    if(profileIsLegacyDefault(name)){
      stashPendingEntries(loadProfileEntries(name));
      try{localStorage.removeItem(profileStorageKeyFor(name));}catch(e){}
      changed=true;
      return;
    }
    if(next.indexOf(name)<0)next.push(name);
  });
  if(changed){
    try{localStorage.setItem(PROFILE_LIST_KEY,JSON.stringify(next));}catch(e){}
    if(profileIsLegacyDefault(activeProfile))activeProfile='';
    try{if(profileIsLegacyDefault(localStorage.getItem(ACTIVE_PROFILE_KEY)||''))localStorage.removeItem(ACTIVE_PROFILE_KEY);}catch(e){}
    setProfileActiveFlag();
    markDataChanged();
  }
  return changed;
}
function hasPendingProfileSetup(){return loadPendingEntries().length>0;}
function accountMode(){try{return localStorage.getItem(AUTH_MODE_KEY)||'';}catch(e){return'';}}
function isAccountReady(){return document.body.classList.contains('account-ready');}
function showAuthScreen(){
  closeDaySlide();closeProfileMenu();closeRename();closeLogout();
  document.body.classList.add('auth-screen-active');
  document.body.classList.remove('account-ready','guest-mode','cloud-signed-in','profile-screen-active');
  setProfileActiveFlag();
  setMobileTab('auth');
  document.getElementById('viewAuth').classList.remove('hidden');
  document.getElementById('viewProfile').classList.add('hidden');
  document.getElementById('viewMain').classList.add('hidden');
  document.getElementById('viewCal').classList.add('hidden');
  document.getElementById('viewFav').classList.add('hidden');
}
function setAccountReady(mode,opts){
  opts=opts||{};
  var ready=!!mode;
  document.body.classList.toggle('account-ready',ready);
  document.body.classList.toggle('guest-mode',mode==='guest');
  document.body.classList.toggle('auth-screen-active',!ready);
  if(!ready){
    showAuthScreen();
    return;
  }
  if(opts.deferView){
    document.getElementById('viewAuth').classList.add('hidden');
    return;
  }
  document.getElementById('viewAuth').classList.add('hidden');
  document.body.classList.add('profile-screen-active');
  document.getElementById('viewProfile').classList.remove('hidden');
  document.getElementById('viewMain').classList.add('hidden');
  document.getElementById('viewCal').classList.add('hidden');
  document.getElementById('viewFav').classList.add('hidden');
  if(ready){
    setTimeout(function(){
      var firstRun=loadProfiles().length===0;
      var inp=document.getElementById('profileNewInput');
      if(firstRun&&inp)inp.focus();
    },80);
  }
}
async function continueAsGuest(){
  try{localStorage.setItem(AUTH_MODE_KEY,'guest');}catch(e){}
  if(typeof doCloudSignOut==='function')await doCloudSignOut(true);
  var profiles=loadProfiles();
  var last='';try{last=localStorage.getItem(ACTIVE_PROFILE_KEY)||'';}catch(e){}
  setAccountReady('guest',last&&profiles.indexOf(last)>=0?{deferView:true}:null);
  var s=document.getElementById('syncStatus');
  if(s)s.textContent='guest mode - local only';
  if(openSavedProfileIfAny())return;
  renderProfileScreen(loadProfiles(),activeProfile);
}
function resetAccountChoice(){
  try{localStorage.removeItem(AUTH_MODE_KEY);}catch(e){}
  activeProfile='';
  try{localStorage.removeItem(ACTIVE_PROFILE_KEY);}catch(e){}
  setAccountReady('');
  setProfileActiveFlag();
  setMobileTab('main');
  var s=document.getElementById('syncStatus');
  if(s)s.textContent='choose how to continue';
  renderProfileScreen(loadProfiles(),'');
}
function markDataChanged(){if(typeof scheduleCloudSync==='function')scheduleCloudSync();}
function saveProfiles(profiles){try{localStorage.setItem(PROFILE_LIST_KEY,JSON.stringify(profiles));markDataChanged();}catch(e){}}
function setProfileActiveFlag(){document.body.classList.toggle('profile-active',!!activeProfile);}
function setMobileTab(tab){document.body.setAttribute('data-mobile-tab',tab||'main');}
function openSavedProfileIfAny(){
  var profiles=loadProfiles();
  var last='';try{last=localStorage.getItem(ACTIVE_PROFILE_KEY)||'';}catch(e){}
  if(profileIsLegacyDefault(last)){
    try{localStorage.removeItem(ACTIVE_PROFILE_KEY);}catch(e){}
    return false;
  }
  if(isAccountReady()&&last&&profiles.indexOf(last)>=0){
    selectProfile(last);
    return true;
  }
  return false;
}
function flashSaveFeedback(){
  var btn=document.getElementById('saveBtn');
  if(btn){
    btn.classList.add('saved-feedback');
    btn.setAttribute('aria-label','saved to journal');
    btn.title='saved to journal';
    setTimeout(function(){
      btn.classList.remove('saved-feedback');
      btn.setAttribute('aria-label','save to journal');
      btn.title='save to journal';
    },1600);
  }
  showToast('saved to journal');
}

// ── Profile init & screen ──────────────────────────────────────────────────

// Migrate data from the old single-profile storage (key='aura_history')
// into a pending buffer. It gets attached to the first real profile name.
function migrateOldData(){
  try{
    var oldData=localStorage.getItem(HISTORY_KEY);
    if(!oldData)return; // nothing to migrate
    var oldEntries=JSON.parse(oldData);
    if(!Array.isArray(oldEntries)||oldEntries.length===0)return;
    stashPendingEntries(oldEntries);
    // remove the old bare key so we don't migrate again
    localStorage.removeItem(HISTORY_KEY);
    console.log('[aura] moved '+oldEntries.length+' old entries into pending profile setup.');
  }catch(e){
    console.warn('[aura] migration failed:',e);
  }
}

function initProfiles(){
  migrateOldData(); // restore old data before anything else
  cleanupLegacyProfiles();
  var profiles=loadProfiles();
  var last='';try{last=localStorage.getItem(ACTIVE_PROFILE_KEY)||'';}catch(e){}
  if(accountMode()==='guest')setAccountReady('guest',last&&profiles.indexOf(last)>=0?{deferView:true}:null);
  if(openSavedProfileIfAny())return;
  renderProfileScreen(profiles,last);
}
function renderProfileScreen(profiles,highlightName){
  if(!isAccountReady()){showAuthScreen();return;}
  setProfileActiveFlag();
  setMobileTab(activeProfile?'profile':'main');
  var list=document.getElementById('profileList');
  list.innerHTML='';
  var firstRun=profiles.length===0;
  var hasPending=hasPendingProfileSetup();
  profiles.forEach(function(name){
    var card=document.createElement('button');
    card.className='profile-card'+(name===highlightName?' recent':'');
    card.type='button';
    var av=document.createElement('div');av.className='profile-card-avatar';av.textContent=profileInitial(name);
    var nm=document.createElement('div');nm.className='profile-card-name';nm.textContent=name;
    card.appendChild(av);card.appendChild(nm);
    card.addEventListener('click',function(){selectProfile(name);});
    list.appendChild(card);
  });
  var row=document.getElementById('profileNewInputRow');
  var btn=document.querySelector('.profile-new-btn');
  var prompt=document.getElementById('profilePrompt');
  var inp=document.getElementById('profileNewInput');
  if(prompt)prompt.textContent=firstRun?'enter your name to begin':(hasPending?'choose a profile or enter your name':'choose or create a profile');
  if(inp)inp.placeholder=(firstRun||hasPending)?'enter your name':'your name';
  if(btn)btn.classList.toggle('hidden',firstRun||hasPending);
  if(row)row.classList.toggle('hidden',!(firstRun||hasPending));
  document.body.classList.add('profile-screen-active');
  document.getElementById('viewProfile').classList.remove('hidden');
  document.getElementById('viewMain').classList.add('hidden');
  document.getElementById('viewCal').classList.add('hidden');
  document.getElementById('viewFav').classList.add('hidden');
  if(firstRun&&isAccountReady()){
    setTimeout(function(){
      var inp=document.getElementById('profileNewInput');
      if(inp)inp.focus();
    },80);
  }
}
function openProfileScreen(){selectedDate=null;closeDaySlide();closeProfileMenu();renderProfileScreen(loadProfiles(),activeProfile);}

function showMainView(){
  selectedDate=null;closeDaySlide();closeProfileMenu();closeRename();closeLogout();
  document.body.classList.remove('profile-screen-active');
  document.getElementById('viewAuth').classList.add('hidden');
  document.getElementById('viewProfile').classList.add('hidden');
  document.getElementById('viewCal').classList.add('hidden');
  document.getElementById('viewFav').classList.add('hidden');
  document.getElementById('viewMain').classList.remove('hidden');
  setMobileTab('main');
}

// ── Profile chip menu ──────────────────────────────────────────────────────
function toggleProfileMenu(){
  var menu=document.getElementById('profileMenu');
  var isOpen=menu.classList.contains('open');
  if(isOpen){menu.classList.remove('open');}else{menu.classList.add('open');}
}
function closeProfileMenu(){
  var menu=document.getElementById('profileMenu');
  if(menu)menu.classList.remove('open');
}
// close menu when clicking outside
document.addEventListener('click',function(e){
  var chip=document.getElementById('profileChip');
  var menu=document.getElementById('profileMenu');
  if(menu&&menu.classList.contains('open')&&!chip.contains(e.target)&&!menu.contains(e.target)){
    menu.classList.remove('open');
  }
});
function selectProfile(name){
  if(profileIsLegacyDefault(name))return;
  mergeEntriesIntoProfile(name,takePendingEntries());
  activeProfile=name;
  try{localStorage.setItem(ACTIVE_PROFILE_KEY,name);}catch(e){}
  setProfileActiveFlag();
  setMobileTab('main');
  document.body.classList.remove('profile-screen-active');
  updateProfileChip();
  document.getElementById('viewAuth').classList.add('hidden');
  document.getElementById('viewProfile').classList.add('hidden');
  document.getElementById('viewMain').classList.remove('hidden');
  gen();
}
function updateProfileChip(){
  var av=document.getElementById('profileChipAvatar');
  var nm=document.getElementById('profileChipName');
  if(av)av.textContent=profileInitial(activeProfile);
  if(nm)nm.textContent=activeProfile;
}
function showNewProfileInput(){
  var row=document.getElementById('profileNewInputRow');
  row.classList.remove('hidden');
  var inp=document.getElementById('profileNewInput');inp.value='';inp.focus();
}
function confirmNewProfile(){
  var inp=document.getElementById('profileNewInput');
  var name=(inp.value||'').trim();if(!name)return;
  if(profileIsLegacyDefault(name)){showToast('enter your name');return;}
  var profiles=loadProfiles();
  if(profiles.indexOf(name)<0){profiles.push(name);saveProfiles(profiles);}
  mergeEntriesIntoProfile(name,takePendingEntries());
  selectProfile(name);
}
document.addEventListener('DOMContentLoaded',function(){
  var inp=document.getElementById('profileNewInput');
  if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter')confirmNewProfile();});
  var rename=document.getElementById('renameInput');
  if(rename)rename.addEventListener('keydown',function(e){if(e.key==='Enter')confirmRename();});
});

// ── Rename profile ─────────────────────────────────────────────────────────
function openRename(){
  var overlay=document.getElementById('renameOverlay');
  var inp=document.getElementById('renameInput');
  var note=document.getElementById('renameNote');
  if(!overlay||!inp)return;
  if(note)note.textContent='';
  inp.value=activeProfile||'';
  overlay.classList.add('open');
  setTimeout(function(){inp.focus();inp.select();},80);
}
function closeRename(){
  var overlay=document.getElementById('renameOverlay');
  if(overlay)overlay.classList.remove('open');
}
function confirmRename(){
  var inp=document.getElementById('renameInput');
  var note=document.getElementById('renameNote');
  if(!inp)return;
  var oldName=activeProfile;
  var newName=(inp.value||'').trim();
  if(!newName){if(note)note.textContent='enter a name';return;}
  if(profileIsLegacyDefault(newName)){if(note)note.textContent='enter your name';return;}
  if(newName===oldName){closeRename();return;}
  var profiles=loadProfiles();
  if(profiles.indexOf(newName)>=0){if(note)note.textContent='that name already exists';return;}
  var oldKey=profileStorageKeyFor(oldName);
  var newKey=profileStorageKeyFor(newName);
  try{
    var data=localStorage.getItem(oldKey);
    if(data!==null)localStorage.setItem(newKey,data);
    localStorage.removeItem(oldKey);
  }catch(e){}
  profiles=profiles.map(function(name){return name===oldName?newName:name;});
  if(profiles.indexOf(newName)<0)profiles.push(newName);
  saveProfiles(profiles);
  activeProfile=newName;
  try{localStorage.setItem(ACTIVE_PROFILE_KEY,newName);}catch(e){}
  updateProfileChip();
  closeRename();
  showToast('name updated');
}

// ── Delete profile ─────────────────────────────────────────────────────────
function openDeleteProfile(){
  document.getElementById('deleteProfileName').textContent=activeProfile;
  document.getElementById('deleteProfileOverlay').classList.add('open');
}
function closeDeleteProfile(){document.getElementById('deleteProfileOverlay').classList.remove('open');}
async function confirmDeleteProfile(){
  var name=activeProfile;
  if(!name){closeDeleteProfile();return;}
  closeDeleteProfile();
  try{localStorage.removeItem(profileStorageKeyFor(name));}catch(e){}
  var profiles=loadProfiles().filter(function(n){return n!==name;});
  saveProfiles(profiles);
  try{localStorage.removeItem(ACTIVE_PROFILE_KEY);}catch(e){}
  activeProfile='';selectedDate=null;closeDaySlide();setProfileActiveFlag();setMobileTab('profile');
  document.getElementById('viewMain').classList.add('hidden');
  document.getElementById('viewCal').classList.add('hidden');
  document.getElementById('viewFav').classList.add('hidden');
  if(typeof flushCloudSync==='function')await flushCloudSync();
  renderProfileScreen(loadProfiles(),'');
  showToast('profile deleted');
}

// ── Logout ─────────────────────────────────────────────────────────────────
function openLogout(){document.getElementById('logoutName').textContent=activeProfile;document.getElementById('logoutOverlay').classList.add('open');}
function closeLogout(){document.getElementById('logoutOverlay').classList.remove('open');}
async function doLogout(deleteData){
  closeLogout();
  if(deleteData){
    try{localStorage.removeItem(profileStorageKey());}catch(e){}
    var profiles=loadProfiles().filter(function(n){return n!==activeProfile;});
    saveProfiles(profiles);
  }
  try{localStorage.removeItem(ACTIVE_PROFILE_KEY);}catch(e){}
  activeProfile='';selectedDate=null;closeDaySlide();setProfileActiveFlag();setMobileTab('main');
  if(deleteData&&typeof flushCloudSync==='function')await flushCloudSync();
  try{localStorage.removeItem(AUTH_MODE_KEY);}catch(e){}
  document.getElementById('viewMain').classList.add('hidden');
  document.getElementById('viewCal').classList.add('hidden');
  document.getElementById('viewFav').classList.add('hidden');
  if(typeof doCloudSignOut==='function')doCloudSignOut();
  else showAuthScreen();
}

// ── History helpers ────────────────────────────────────────────────────────
function entryKey(e){return(e.date||'')+'|'+(e.time||'')+'|'+(e.word||'');}
function entryStamp(e){return(e.display||e.date||'')+(e.time?' · '+e.time:'');}
function entryTitle(e){return e.word||(e.time?'moment '+e.time:'this moment');}

function saveToHistory(word,dateStr,displayDate,timeStr,params,fav){
  var h=loadHistory();
  var key=entryKey({word:word,date:dateStr,time:timeStr});
  var existing=null;
  h=h.filter(function(e){if(entryKey(e)===key){existing=e;return false;}return true;});
  var entry={word:word,date:dateStr,display:displayDate,time:timeStr,params:params,fav:fav||false};
  if(existing&&fav===undefined)entry.fav=existing.fav||false; // preserve fav if not explicitly set
  h.unshift(entry);
  if(h.length>MAX_HISTORY)h=h.slice(0,MAX_HISTORY);
  try{localStorage.setItem(profileStorageKey(),JSON.stringify(h));markDataChanged();}catch(e){}
  return entry;
}
function loadHistory(){
  try{return(JSON.parse(localStorage.getItem(profileStorageKey()))||[]).map(function(e){if(e.display)e.display=titleDate(e.display);return e;});}catch(e){return[];}
}
function persistHistory(h){try{localStorage.setItem(profileStorageKey(),JSON.stringify(h));markDataChanged();}catch(e){}}

function removeFromHistory(entry,evt){
  if(evt)evt.stopPropagation();if(!entry)return;
  var key=entryKey(entry);
  var h=loadHistory().filter(function(e){return entryKey(e)!==key;});
  persistHistory(h);
  if(selectedDate===entry.date)selectedDate=null;
  renderCalendar();
  if(document.getElementById('viewFav').classList.contains('hidden')===false)renderFavourites();
  if(document.getElementById('daySlide').classList.contains('open')){
    var remaining=loadHistory().filter(function(e){return e.date===entry.date;});
    if(remaining.length)openDaySlide(entry.date,remaining,remaining[0].display);
    else closeDaySlide();
  }
}
function removeInlineEntry(entry,evt){
  if(evt)evt.stopPropagation();if(!entry)return;
  var key=entryKey(entry);
  var h=loadHistory().filter(function(e){return entryKey(e)!==key;});
  persistHistory(h);
  selectedDate=h.some(function(e){return e.date===entry.date;})?entry.date:null;
  renderCalendar();
  renderFavourites();
  updateFavBtn();
  showToast('entry removed');
}

// ── Favourites ─────────────────────────────────────────────────────────────
function loadFavourites(){return loadHistory().filter(function(e){return e.fav;});}

function setFav(entry,isFav){
  var key=entryKey(entry);
  var h=loadHistory().map(function(e){if(entryKey(e)===key)e.fav=isFav;return e;});
  persistHistory(h);
}

// Toggle fav from home screen: saves to journal first if needed, then favs
function toggleFavFromHome(){
  if(!P)return;
  var word=currentWord;
  var dateStr=currentDateStr||todayStr();
  var displayDate=currentDisplayDate||todayDisplay();
  var timeStr=currentTimeStr||'';
  var key=entryKey({word:word,date:dateStr,time:timeStr});
  var h=loadHistory();
  var existing=h.filter(function(e){return entryKey(e)===key;})[0];
  if(existing&&existing.fav){
    // un-fav
    setFav(existing,false);
  }else{
    // save+fav
    saveToHistory(word,dateStr,displayDate,timeStr,P,true);
    flashSaveFeedback();
  }
  updateFavBtn();
  if(!document.getElementById('viewFav').classList.contains('hidden'))renderFavourites();
}

// Update the star button state on the home screen
function updateFavBtn(){
  var star=document.getElementById('favStar');
  var btn=document.getElementById('favBtn');
  if(!star||!btn)return;
  var key=entryKey({word:currentWord,date:currentDateStr||todayStr(),time:currentTimeStr||''});
  var existing=loadHistory().filter(function(e){return entryKey(e)===key;})[0];
  var isFav=existing&&existing.fav;
  star.textContent=isFav?'★':'☆';
  btn.classList.toggle('fav-act-active',!!isFav);
}

// Toggle fav from calendar/day-slide
function toggleFavEntry(entry,starEl,btnEl){
  var newFav=!entry.fav;
  setFav(entry,newFav);
  entry.fav=newFav;
  if(starEl)starEl.textContent=newFav?'★':'☆';
  if(btnEl)btnEl.classList.toggle('fav-act-active',newFav);
  if(!document.getElementById('viewFav').classList.contains('hidden'))renderFavourites();
  updateFavBtn();
}

// ── Favourites view ────────────────────────────────────────────────────────
function showFav(){
  renderFavourites();
  closeDaySlide();closeProfileMenu();
  document.body.classList.remove('profile-screen-active');
  document.getElementById('viewAuth').classList.add('hidden');
  document.getElementById('viewProfile').classList.add('hidden');
  document.getElementById('viewCal').classList.add('hidden');
  document.getElementById('viewMain').classList.add('hidden');
  document.getElementById('viewFav').classList.remove('hidden');
  setMobileTab('faves');
}
function hideFav(){
  document.getElementById('viewFav').classList.add('hidden');
  document.getElementById('viewMain').classList.remove('hidden');
  setMobileTab('main');
}
function renderFavourites(){
  var favs=loadFavourites();
  var grid=document.getElementById('favGrid');
  var empty=document.getElementById('favEmpty');
  grid.innerHTML='';
  if(!favs.length){empty.classList.remove('hidden');return;}
  empty.classList.add('hidden');
  favs.forEach(function(entry){
    var card=document.createElement('div');card.className='fav-card';
    // orb
    var orbWrap=document.createElement('div');orbWrap.className='fav-orb-wrap';
    var sc=makeSwatchCanvas(entry.params,80);orbWrap.appendChild(sc);
    // un-fav button (star)
    var starBtn=document.createElement('button');
    starBtn.className='fav-card-star fav-act-active';starBtn.type='button';starBtn.title='remove from favourites';
    starBtn.textContent='★';
    starBtn.addEventListener('click',function(e){e.stopPropagation();toggleFavEntry(entry,starBtn,starBtn);card.style.opacity='0';card.style.transform='scale(.92)';setTimeout(function(){renderFavourites();},300);});
    orbWrap.appendChild(starBtn);
    card.appendChild(orbWrap);
    // info
    var info=document.createElement('div');info.className='fav-card-info';
    var wl=document.createElement('div');wl.className='fav-card-word';wl.textContent=entryTitle(entry);
    var dl=document.createElement('div');dl.className='fav-card-date';dl.textContent=entryStamp(entry);
    info.appendChild(wl);info.appendChild(dl);
    card.appendChild(info);
    card.addEventListener('click',function(){loadEntryToMain(entry);});
    grid.appendChild(card);
  });
}

// ── Export / Import ──────────────────────────────────────────────────────────
function exportData(){
  // export all profiles and their entries
  var payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles: loadProfiles(),
    activeProfile: activeProfile,
    data: {}
  };
  var profiles = loadProfiles();
  profiles.forEach(function(name){
    var key = HISTORY_KEY + '_' + encodeURIComponent(name);
    try { payload.data[name] = JSON.parse(localStorage.getItem(key)) || []; }
    catch(e) { payload.data[name] = []; }
  });
  var blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'aura-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('data exported ✓');
}

function importData(evt){
  var file = evt.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e){
    try {
      var payload = JSON.parse(e.target.result);
      if (!payload.data) throw new Error('invalid file');
      // merge profiles
      var existing = loadProfiles();
      Object.keys(payload.data).forEach(function(name){
        if(profileIsLegacyDefault(name)){
          stashPendingEntries(payload.data[name]||[]);
          return;
        }
        if (existing.indexOf(name) < 0) existing.push(name);
        // merge entries, no duplicates
        var key = HISTORY_KEY + '_' + encodeURIComponent(name);
        var current = [];
        try { current = JSON.parse(localStorage.getItem(key)) || []; } catch(e2){}
        var seenKeys = {};
        current.forEach(function(en){ seenKeys[en.date+'|'+(en.time||'')+'|'+(en.word||'')] = true; });
        var incoming = payload.data[name] || [];
        incoming.forEach(function(en){
          var k = en.date+'|'+(en.time||'')+'|'+(en.word||'');
          if (!seenKeys[k]) { current.push(en); seenKeys[k] = true; }
        });
        // sort newest first
        current.sort(function(a,b){ return (b.date+b.time) < (a.date+a.time) ? -1 : 1; });
        localStorage.setItem(key, JSON.stringify(current));
      });
      saveProfiles(existing);
      showToast('data imported ✓ — ' + Object.keys(payload.data).length + ' profile(s)');
      markDataChanged();
      // refresh if we're viewing the current profile
      if (payload.data[activeProfile]) renderCalendar();
    } catch(err) {
      showToast('import failed: invalid file');
    }
    evt.target.value = '';
  };
  reader.readAsText(file);
}

function showToast(msg){
  var t = document.getElementById('importToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 3000);
}

// ── View switching ─────────────────────────────────────────────────────────
function showCal(){
  renderCalendar();closeProfileMenu();
  document.body.classList.remove('profile-screen-active');
  document.getElementById('viewAuth').classList.add('hidden');
  document.getElementById('viewProfile').classList.add('hidden');
  document.getElementById('viewFav').classList.add('hidden');
  document.getElementById('viewMain').classList.add('hidden');
  document.getElementById('viewCal').classList.remove('hidden');
  setMobileTab('journal');
}
function hideCal(){
  document.getElementById('viewCal').classList.add('hidden');
  document.getElementById('viewMain').classList.remove('hidden');
  setMobileTab('main');
}
function calPrev(){calM--;if(calM<0){calM=11;calY--;}selectedDate=null;closeDaySlide();renderCalendar();}
function calNext(){calM++;if(calM>11){calM=0;calY++;}selectedDate=null;closeDaySlide();renderCalendar();}
function jumpToToday(){var d=new Date();calY=d.getFullYear();calM=d.getMonth();selectedDate=todayStr();closeDaySlide();renderCalendar();}

// ── Save to journal ────────────────────────────────────────────────────────
function saveEntry(){
  if(!P)return;
  saveToHistory(currentWord,currentDateStr||todayStr(),currentDisplayDate||todayDisplay(),currentTimeStr||'',P);
  flashSaveFeedback();
  updateFavBtn();
}

// ── Calendar grid ──────────────────────────────────────────────────────────
function renderCalendar(){
  var history=loadHistory();
  var byDate={};
  history.forEach(function(e){if(!byDate[e.date])byDate[e.date]=[];byDate[e.date].push(e);});
  var months=['january','february','march','april','may','june','july','august','september','october','november','december'];
  document.getElementById('calMonthLabel').textContent=months[calM]+' '+calY;
  var grid=document.getElementById('calGrid');
  var detailPanel=document.getElementById('calDetailPanel');
  grid.innerHTML='';
  var firstDay=new Date(calY,calM,1).getDay();
  var daysInMonth=new Date(calY,calM+1,0).getDate();
  var td=new Date(),tds=td.getFullYear()+'-'+(td.getMonth()+1)+'-'+td.getDate();
  if(selectedDate){var sp=selectedDate.split('-');if(!byDate[selectedDate]||+sp[0]!==calY||(+sp[1]-1)!==calM)selectedDate=null;}
  for(var i=0;i<firstDay;i++){var el=document.createElement('div');el.className='cal-cell empty';grid.appendChild(el);}
  for(var day=1;day<=daysInMonth;day++){
    var ds=calY+'-'+(calM+1)+'-'+day;
    var entries=byDate[ds]||null;
    var cell=document.createElement('div');
    cell.className='cal-cell'+(entries?' has-entry':'')+(ds===tds?' today':'')+(ds===selectedDate?' selected':'');
    var num=document.createElement('div');num.className='cal-num';num.textContent=day;
    cell.appendChild(num);
    if(entries){
      var wrap=document.createElement('div');wrap.className='cal-orb-wrap';
      var sc=makeSwatchCanvas(entries[0].params,36);wrap.appendChild(sc);
      if(entries.some(function(e){return e.fav;})){}
      // (fav indicator shown in detail panel, not on calendar dot)
      cell.appendChild(wrap);
      (function(dateKey,c){
        c.addEventListener('click',function(){selectedDate=selectedDate===dateKey?null:dateKey;renderCalendar();});
      })(ds,cell);
    }
    grid.appendChild(cell);
  }
  renderInlineDetail(detailPanel,selectedDate,byDate[selectedDate]||null);
}

function closeSwipeEntry(wrapper){
  if(!wrapper)return;
  var track=wrapper.querySelector('.swipe-track');
  wrapper.classList.remove('swipe-open','swipe-active');
  if(track){
    track.style.transition='';
    track.style.transform='';
  }
  if(activeSwipeEntry===wrapper)activeSwipeEntry=null;
}

function openSwipeEntry(wrapper){
  if(activeSwipeEntry&&activeSwipeEntry!==wrapper)closeSwipeEntry(activeSwipeEntry);
  var track=wrapper.querySelector('.swipe-track');
  wrapper.classList.add('swipe-open','swipe-active');
  if(track){
    track.style.transition='';
    track.style.transform='translate3d(-132px,0,0)';
  }
  activeSwipeEntry=wrapper;
}

function bindSwipeEntry(wrapper,onTap){
  var track=wrapper.querySelector('.swipe-track');
  var startX=0,startY=0,dragging=false,pointerDown=false,offset=0;
  var wheelDelta=0,wheelTimer=null,rafId=0,pendingX=0;
  var reveal=132;
  if(!track)return;
  function setTrackX(x,immediate){
    pendingX=x;
    if(immediate){
      if(rafId){cancelAnimationFrame(rafId);rafId=0;}
      track.style.transform='translate3d('+pendingX+'px,0,0)';
      return;
    }
    if(rafId)return;
    rafId=requestAnimationFrame(function(){
      rafId=0;
      track.style.transform='translate3d('+pendingX+'px,0,0)';
    });
  }
  function getTrackX(){
    var matrix=window.getComputedStyle(track).transform;
    if(!matrix||matrix==='none')return 0;
    if(window.DOMMatrixReadOnly)return new DOMMatrixReadOnly(matrix).m41;
    if(window.WebKitCSSMatrix)return new WebKitCSSMatrix(matrix).m41;
    var parts=matrix.split(',');
    return parseFloat(parts.length>=16?parts[12]:parts[4])||0;
  }
  var desktopSwipe=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(desktopSwipe){
    wrapper.addEventListener('wheel',function(e){
      if(e.target.closest('button'))return;
      if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)||Math.abs(e.deltaX)<3)return;
      e.preventDefault();
      if(activeSwipeEntry&&activeSwipeEntry!==wrapper)closeSwipeEntry(activeSwipeEntry);
      wrapper.classList.add('swipe-active');
      wheelDelta+=e.deltaX;
      clearTimeout(wheelTimer);
      wheelTimer=setTimeout(function(){
        wrapper.classList.remove('swipe-active');
        wheelDelta=0;
      },180);
      if(wheelDelta>28){
        openSwipeEntry(wrapper);
        wheelDelta=0;
      }else if(wheelDelta<-28){
        closeSwipeEntry(wrapper);
        wheelDelta=0;
      }
    },{passive:false});
  }
  wrapper.addEventListener('pointerdown',function(e){
    if(e.target.closest('button'))return;
    pointerDown=true;dragging=false;
    startX=e.clientX;startY=e.clientY;
    offset=wrapper.classList.contains('swipe-open')?-reveal:0;
    track.style.transition='none';
    try{wrapper.setPointerCapture(e.pointerId);}catch(err){}
  });
  wrapper.addEventListener('pointermove',function(e){
    if(!pointerDown)return;
    var dx=e.clientX-startX;
    var dy=e.clientY-startY;
    if(!dragging){
      if(Math.abs(dx)<6&&Math.abs(dy)<6)return;
      if(Math.abs(dx)<=Math.abs(dy)){
        pointerDown=false;
        track.style.transition='';
        return;
      }
      dragging=true;
      wrapper.classList.add('swipe-active');
      if(activeSwipeEntry&&activeSwipeEntry!==wrapper)closeSwipeEntry(activeSwipeEntry);
    }
    e.preventDefault();
    setTrackX(Math.min(0,Math.max(-reveal,offset+dx)));
  });
  function endSwipe(e){
    if(!pointerDown)return;
    pointerDown=false;
    try{wrapper.releasePointerCapture(e.pointerId);}catch(err){}
    track.style.transition='';
    if(dragging){
      if(rafId){cancelAnimationFrame(rafId);rafId=0;setTrackX(pendingX,true);}
      var current=getTrackX();
      if(current<-reveal/2)openSwipeEntry(wrapper);
      else closeSwipeEntry(wrapper);
      dragging=false;
      return;
    }
    if(wrapper.classList.contains('swipe-open'))closeSwipeEntry(wrapper);
    else onTap();
  }
  wrapper.addEventListener('pointerup',endSwipe);
  wrapper.addEventListener('pointercancel',function(e){
    if(!pointerDown)return;
    pointerDown=false;dragging=false;track.style.transition='';
    if(wrapper.classList.contains('swipe-open'))openSwipeEntry(wrapper);
    else closeSwipeEntry(wrapper);
    try{wrapper.releasePointerCapture(e.pointerId);}catch(err){}
  });
}

function makeSwipeInlineEntry(entry){
  var wrapper=document.createElement('div');
  wrapper.className='swipe-entry'+(entry.fav?' swipe-entry-fav':'');

  var actions=document.createElement('div');
  actions.className='swipe-actions';
  var star=document.createElement('button');
  star.className='swipe-action swipe-star'+(entry.fav?' fav-act-active':'');
  star.type='button';
  star.textContent=entry.fav?'★':'☆';
  star.setAttribute('aria-label',entry.fav?'remove from favourites':'add to favourites');
  star.addEventListener('click',function(e){
    e.stopPropagation();
    toggleFavEntry(entry,star,star);
    star.textContent=entry.fav?'★':'☆';
    star.setAttribute('aria-label',entry.fav?'remove from favourites':'add to favourites');
    track.classList.toggle('inline-entry-fav',entry.fav);
    wrapper.classList.toggle('swipe-entry-fav',entry.fav);
    closeSwipeEntry(wrapper);
  });
  var del=document.createElement('button');
  del.className='swipe-action swipe-delete';
  del.type='button';
  del.textContent='delete';
  del.setAttribute('aria-label','delete entry');
  del.addEventListener('click',function(e){
    e.stopPropagation();
    if(del.classList.contains('confirm')){
      removeInlineEntry(entry,e);
      return;
    }
    del.classList.add('confirm');
    del.textContent='sure?';
    setTimeout(function(){
      if(del.isConnected){
        del.classList.remove('confirm');
        del.textContent='delete';
      }
    },2200);
  });
  actions.appendChild(star);actions.appendChild(del);

  var track=document.createElement('div');
  track.className='inline-entry swipe-track'+(entry.fav?' inline-entry-fav':'');
  var isc=makeSwatchCanvas(entry.params,28);track.appendChild(isc);
  var wl=document.createElement('div');wl.className='inline-word';wl.textContent=entryTitle(entry);track.appendChild(wl);
  wrapper.appendChild(actions);wrapper.appendChild(track);
  bindSwipeEntry(wrapper,function(){loadEntryToMain(entry);});
  return wrapper;
}

function renderInlineDetail(panel,dateStr,entries){
  panel.innerHTML='';panel.classList.toggle('open',!!entries);
  activeSwipeEntry=null;
  if(!entries)return;
  var head=document.createElement('div');head.className='cal-detail-head';
  var date=document.createElement('div');date.className='cal-detail-date';date.textContent=entries[0].display||dateStr;
  var meta=document.createElement('div');meta.className='cal-detail-meta';
  var count=document.createElement('div');count.className='cal-detail-count';count.textContent=entries.length+' '+(entries.length===1?'entry':'entries');
  var detailBtn=document.createElement('button');detailBtn.className='cal-detail-action';detailBtn.type='button';detailBtn.textContent='detail';
  detailBtn.addEventListener('click',function(){selectedDate=null;renderCalendar();openDaySlide(dateStr,entries,entries[0].display);});
  meta.appendChild(count);meta.appendChild(detailBtn);head.appendChild(date);head.appendChild(meta);panel.appendChild(head);
  var list=document.createElement('div');list.className='cal-detail-list';
  entries.forEach(function(entry){
    list.appendChild(makeSwipeInlineEntry(entry));
  });
  panel.appendChild(list);
}

// ── Load entry back to main ────────────────────────────────────────────────
function loadEntryToMain(entry){
  hideCal();hideFav();
  currentWord=entry.word||'';
  currentDateStr=entry.date||todayStr();
  currentDisplayDate=entry.display||todayDisplay();
  currentTimeStr=entry.time||'';
  document.getElementById('w').value=entry.word||'';
  document.getElementById('lbl').textContent=entry.word?entry.word.toUpperCase():'';
  document.getElementById('dlbl').textContent=entry.display;
  if(aid)cancelAnimationFrame(aid);P=entry.params;fadeAlpha=0;af=0;frame();
  updateFavBtn();
}

// ── Day slide ──────────────────────────────────────────────────────────────
function openDaySlide(dateStr,entries,displayDate){
  document.getElementById('daySlideDate').textContent=displayDate||dateStr;
  var list=document.getElementById('daySlideEntries');list.innerHTML='';
  entries.forEach(function(entry){
    var row=document.createElement('div');row.className='slide-entry'+(entry.fav?' slide-entry-fav':'');
    var sc=makeSwatchCanvas(entry.params,112);sc.style.width='112px';sc.style.height='112px';row.appendChild(sc);
    var info=document.createElement('div');info.className='slide-entry-info';
    var wl=document.createElement('div');wl.className='slide-entry-word';wl.textContent=entryTitle(entry);
    var dl=document.createElement('div');dl.className='slide-entry-date';dl.textContent=entryStamp(entry);
    info.appendChild(wl);info.appendChild(dl);row.appendChild(info);
    // actions group: fav + remove side by side
    var actions=document.createElement('div');actions.className='slide-entry-actions';
    var favB=document.createElement('button');favB.className='entry-fav-btn slide-fav-btn'+(entry.fav?' fav-act-active':'');favB.type='button';
    favB.textContent=entry.fav?'★':'☆';favB.title=entry.fav?'remove from favourites':'add to favourites';
    favB.addEventListener('click',function(e){e.stopPropagation();toggleFavEntry(entry,favB,favB);row.classList.toggle('slide-entry-fav',entry.fav);});
    var rm=document.createElement('button');rm.className='remove-entry';rm.type='button';rm.textContent='remove';
    rm.addEventListener('click',function(e){e.stopPropagation();showRemoveConfirm(rm,entry);});
    actions.appendChild(favB);actions.appendChild(rm);
    row.appendChild(actions);
    row.addEventListener('click',function(){closeDaySlide();loadEntryToMain(entry);});
    list.appendChild(row);
  });
  document.getElementById('daySlide').classList.add('open');
}
function closeDaySlide(){document.getElementById('daySlide').classList.remove('open');}

function showRemoveConfirm(btn,entry){
  var row=btn.parentElement;btn.style.display='none';
  var wrap=document.createElement('div');wrap.className='remove-confirm';
  var txt=document.createElement('span');txt.className='remove-confirm-text';txt.textContent='remove?';
  var yes=document.createElement('button');yes.className='remove-confirm-yes';yes.type='button';yes.textContent='yes';
  var no=document.createElement('button');no.className='remove-confirm-no';no.type='button';no.textContent='no';
  yes.addEventListener('click',function(e){e.stopPropagation();wrap.remove();removeFromHistory(entry,e);});
  no.addEventListener('click',function(e){e.stopPropagation();wrap.remove();btn.style.display='';});
  wrap.appendChild(txt);wrap.appendChild(yes);wrap.appendChild(no);
  row.appendChild(wrap);
}
