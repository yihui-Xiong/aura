// Firebase cloud sync for Aura.
// Uses the browser/CDN "compat" SDK loaded from index.html.
var auraCloud=(function(){
  var firebaseConfig={
    apiKey:"AIzaSyBkE0G9gNkx64qIvJEMADL7ZUhjASdzAJs",
    authDomain:"aura-f4d43.firebaseapp.com",
    projectId:"aura-f4d43",
    storageBucket:"aura-f4d43.firebasestorage.app",
    messagingSenderId:"101035138440",
    appId:"1:101035138440:web:a5c152648c1d83ff716e3d",
    measurementId:"G-8R8990H030"
  };

  var auth=null,db=null,currentUser=null,unsubscribe=null;
  var syncReady=false,applyingCloudSnapshot=false,syncTimer=null;
  var emailAuthMode='signIn';

  function hasFirebase(){
    return typeof firebase!=='undefined'&&firebase.initializeApp&&firebase.auth&&firebase.firestore;
  }

  function setStatus(text){
    var status=document.getElementById('syncStatus');
    var menu=document.getElementById('syncMenuStatus');
    if(status)status.textContent=text;
    if(menu)menu.textContent=text;
  }

  function setButtonText(){
    var label='continue with Google';
    var profileBtn=document.getElementById('syncButton');
    var menuBtn=document.getElementById('syncMenuButton');
    var emailBtn=document.getElementById('emailSyncButton');
    var emailMenuBtn=document.getElementById('emailSyncMenuButton');
    var cloudSignOut=document.getElementById('cloudSignOutButton');
    var guestReset=document.getElementById('guestResetButton');
    var guestMode=accountMode()==='guest';
    if(profileBtn)profileBtn.textContent=label;
    if(menuBtn)menuBtn.textContent=currentUser?'cloud sign out':'sync with Google';
    if(emailBtn)emailBtn.classList.toggle('hidden',!!currentUser);
    if(emailMenuBtn)emailMenuBtn.classList.toggle('hidden',!!currentUser||guestMode);
    if(menuBtn)menuBtn.classList.toggle('hidden',!currentUser&&guestMode);
    document.body.classList.toggle('cloud-signed-in',!!currentUser);
    if(cloudSignOut)cloudSignOut.classList.toggle('hidden',!currentUser);
    if(guestReset)guestReset.classList.toggle('hidden',!guestMode||!!currentUser);
  }

  function stateDoc(){
    return db.collection('users').doc(currentUser.uid).collection('app').doc('state');
  }

  function normalizeEntry(entry){
    return JSON.parse(JSON.stringify(entry||{}));
  }

  function sortEntries(entries){
    return entries.sort(function(a,b){
      var av=(a.date||'')+' '+(a.time||'');
      var bv=(b.date||'')+' '+(b.time||'');
      return bv.localeCompare(av);
    });
  }

  function mergeEntries(localEntries,cloudEntries){
    var map={};
    (localEntries||[]).forEach(function(entry){
      map[entryKey(entry)]=normalizeEntry(entry);
    });
    (cloudEntries||[]).forEach(function(entry){
      var key=entryKey(entry);
      if(map[key]){
        map[key]=Object.assign({},map[key],normalizeEntry(entry),{fav:!!(map[key].fav||entry.fav)});
      }else{
        map[key]=normalizeEntry(entry);
      }
    });
    return sortEntries(Object.keys(map).map(function(key){return map[key];})).slice(0,MAX_HISTORY);
  }

  function getLocalEntries(profileName){
    try{return JSON.parse(localStorage.getItem(profileStorageKeyFor(profileName)))||[];}
    catch(e){return[];}
  }

  function buildLocalSnapshot(){
    var profiles=loadProfiles();
    var data={};
    profiles.forEach(function(name){
      data[name]=getLocalEntries(name);
    });
    return {
      version:2,
      profiles:profiles,
      activeProfile:activeProfile||'',
      data:data,
      clientUpdatedAt:Date.now()
    };
  }

  function applyCloudSnapshot(snapshot){
    if(!snapshot||!snapshot.data)return;
    applyingCloudSnapshot=true;
    try{
      var profiles=loadProfiles();
      (snapshot.profiles||Object.keys(snapshot.data)||[]).forEach(function(name){
        if(name&&profiles.indexOf(name)<0)profiles.push(name);
      });
      localStorage.setItem(PROFILE_LIST_KEY,JSON.stringify(profiles));
      Object.keys(snapshot.data).forEach(function(name){
        var merged=mergeEntries(getLocalEntries(name),snapshot.data[name]||[]);
        localStorage.setItem(profileStorageKeyFor(name),JSON.stringify(merged));
      });
      if(!activeProfile&&snapshot.activeProfile&&profiles.indexOf(snapshot.activeProfile)>=0){
        activeProfile=snapshot.activeProfile;
        localStorage.setItem(ACTIVE_PROFILE_KEY,activeProfile);
      }
    }catch(e){
      console.error('[aura] cloud merge failed',e);
    }finally{
      applyingCloudSnapshot=false;
    }
  }

  function refreshViews(){
    if(activeProfile)updateProfileChip();
    if(!document.getElementById('viewProfile').classList.contains('hidden')){
      renderProfileScreen(loadProfiles(),activeProfile);
    }
    if(!document.getElementById('viewCal').classList.contains('hidden'))renderCalendar();
    if(!document.getElementById('viewFav').classList.contains('hidden'))renderFavourites();
    updateFavBtn();
  }

  async function pushNow(){
    if(!currentUser)return;
    clearTimeout(syncTimer);
    syncTimer=null;
    try{
      setStatus('syncing...');
      var snapshot=buildLocalSnapshot();
      snapshot.updatedAt=firebase.firestore.FieldValue.serverTimestamp();
      await stateDoc().set(snapshot);
      setStatus('synced as '+(currentUser.displayName||currentUser.email||'Google'));
    }catch(e){
      console.error('[aura] cloud upload failed',e);
      setStatus('sync failed');
    }
  }

  async function flush(){
    if(!currentUser)return;
    await pushNow();
  }

  function schedule(){
    if(applyingCloudSnapshot||!currentUser||!syncReady)return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(pushNow,600);
  }

  async function initialSync(){
    syncReady=false;
    setStatus('loading cloud data...');
    try{
      var doc=await stateDoc().get();
      if(doc.exists){
        applyCloudSnapshot(doc.data());
        refreshViews();
      }
      syncReady=true;
      if(typeof openSavedProfileIfAny==='function'&&!openSavedProfileIfAny()){
        renderProfileScreen(loadProfiles(),activeProfile);
      }
      pushNow();
      if(unsubscribe)unsubscribe();
      unsubscribe=stateDoc().onSnapshot(function(snap){
        if(!snap.exists||snap.metadata.hasPendingWrites)return;
        applyCloudSnapshot(snap.data());
        refreshViews();
        setStatus('synced as '+(currentUser.displayName||currentUser.email||'Google'));
      },function(e){
        console.error('[aura] cloud listener failed',e);
        setStatus('sync listener failed');
      });
    }catch(e){
      console.error('[aura] cloud sync failed',e);
      syncReady=false;
      setStatus('sync failed');
    }
  }

  function signIn(){
    if(!auth)return;
    var provider=new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider).catch(function(e){
      if(e&&/popup|blocked|closed/i.test(e.code||e.message||'')){
        return auth.signInWithRedirect(provider).catch(function(err){
          console.error('[aura] redirect sign-in failed',err);
          setStatus(authErrorMessage(err));
        });
      }
      console.error('[aura] sign-in failed',e);
      setStatus(authErrorMessage(e));
    });
  }

  function authErrorMessage(error){
    var code=(error&&error.code)||'';
    if(code==='auth/configuration-not-found')return 'enable this sign-in provider in Firebase';
    if(code==='auth/unauthorized-domain')return 'add localhost to authorized domains';
    if(code==='auth/popup-closed-by-user')return 'sign-in canceled';
    return 'sign-in failed';
  }

  function signOut(){
    try{if(!arguments[0])localStorage.removeItem(AUTH_MODE_KEY);}catch(e){}
    if(!auth){showAuthScreen();return;}
    return auth.signOut();
  }

  function emailErrorMessage(error){
    var code=(error&&error.code)||'';
    if(code==='auth/email-already-in-use')return 'that email already has an account';
    if(code==='auth/invalid-email')return 'enter a valid email';
    if(code==='auth/missing-password')return 'enter a password';
    if(code==='auth/weak-password')return 'password needs at least 6 characters';
    if(code==='auth/user-not-found'||code==='auth/wrong-password'||code==='auth/invalid-credential')return 'email or password is incorrect';
    if(code==='auth/too-many-requests')return 'too many attempts. try later';
    return 'email sign-in failed';
  }

  function setEmailAuthMode(mode){
    emailAuthMode=mode==='create'?'create':'signIn';
    var overlay=document.getElementById('emailAuthOverlay');
    var signInTab=document.getElementById('emailSignInTab');
    var createTab=document.getElementById('emailCreateTab');
    var confirm=document.getElementById('emailAuthPasswordConfirm');
    var submit=document.getElementById('emailAuthSubmit');
    if(overlay)overlay.setAttribute('data-email-mode',emailAuthMode);
    if(signInTab)signInTab.classList.toggle('selected',emailAuthMode==='signIn');
    if(createTab)createTab.classList.toggle('selected',emailAuthMode==='create');
    if(confirm)confirm.value='';
    if(submit)submit.textContent=emailAuthMode==='create'?'create account':'sign in';
    setEmailNote('');
  }

  function setEmailNote(text){
    var note=document.getElementById('emailAuthNote');
    if(note)note.textContent=text||'';
  }

  function openEmailAuth(){
    if(currentUser){
      setStatus('sign out first to switch account');
      return;
    }
    var overlay=document.getElementById('emailAuthOverlay');
    var email=document.getElementById('emailAuthEmail');
    var pass=document.getElementById('emailAuthPassword');
    var confirm=document.getElementById('emailAuthPasswordConfirm');
    if(!overlay||!email||!pass)return;
    setEmailNote('');
    setEmailAuthMode('signIn');
    pass.value='';
    if(confirm)confirm.value='';
    overlay.classList.add('open');
    setTimeout(function(){email.focus();},80);
  }

  function closeEmailAuth(){
    var overlay=document.getElementById('emailAuthOverlay');
    if(overlay)overlay.classList.remove('open');
    setEmailNote('');
  }

  function emailCreds(){
    var emailEl=document.getElementById('emailAuthEmail');
    var passEl=document.getElementById('emailAuthPassword');
    var confirmEl=document.getElementById('emailAuthPasswordConfirm');
    var email=(emailEl&&emailEl.value||'').trim();
    var password=(passEl&&passEl.value||'');
    var confirm=(confirmEl&&confirmEl.value||'');
    if(!email){setEmailNote('enter your email');return null;}
    if(!password){setEmailNote('enter your password');return null;}
    if(password.length<6){setEmailNote('password needs at least 6 characters');return null;}
    return {email:email,password:password,confirm:confirm};
  }

  function submitEmailAuth(mode){
    mode=mode||emailAuthMode;
    if(!auth){setEmailNote('cloud sync unavailable');return;}
    var creds=emailCreds();
    if(!creds)return;
    if(mode==='create'&&creds.password!==creds.confirm){
      setEmailNote('passwords do not match');
      return;
    }
    setEmailNote(mode==='create'?'creating account...':'signing in...');
    setStatus('signing in...');
    var op=mode==='create'
      ? auth.createUserWithEmailAndPassword(creds.email,creds.password)
      : auth.signInWithEmailAndPassword(creds.email,creds.password);
    return op.then(function(){
      closeEmailAuth();
    }).catch(function(e){
      console.error('[aura] email auth failed',e);
      if(mode==='signIn'&&e&&e.code==='auth/user-not-found'){
        setEmailAuthMode('create');
        setEmailNote('no account found. create a new account');
        return;
      }
      var msg=emailErrorMessage(e);
      setEmailNote(msg);
      setStatus(msg);
    });
  }

  function toggleSignIn(){
    return currentUser?signOut():signIn();
  }

  function init(){
    if(!hasFirebase()){
      setStatus('cloud sync unavailable');
      setButtonText();
      return;
    }
    if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
    auth=firebase.auth();
    db=firebase.firestore();
    auth.onAuthStateChanged(function(user){
      currentUser=user||null;
      setButtonText();
      if(unsubscribe){unsubscribe();unsubscribe=null;}
      if(currentUser){
        try{localStorage.setItem(AUTH_MODE_KEY,'cloud');}catch(e){}
        setAccountReady('cloud',{deferView:true});
        initialSync();
      }else{
        syncReady=false;
        if(accountMode()==='guest'){
          var profiles=loadProfiles();
          var last='';try{last=localStorage.getItem(ACTIVE_PROFILE_KEY)||'';}catch(e){}
          setAccountReady('guest',last&&profiles.indexOf(last)>=0?{deferView:true}:null);
          setStatus('guest mode - local only');
          if(typeof openSavedProfileIfAny==='function'&&!openSavedProfileIfAny()){
            renderProfileScreen(loadProfiles(),activeProfile);
          }
        }else{
          setAccountReady('');
          setStatus('choose how to continue');
        }
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();

  return {
    schedule:schedule,
    flush:flush,
    signIn:signIn,
    signOut:signOut,
    toggleSignIn:toggleSignIn,
    openEmailAuth:openEmailAuth,
    closeEmailAuth:closeEmailAuth,
    setEmailAuthMode:setEmailAuthMode,
    submitEmailAuth:submitEmailAuth
  };
})();

function scheduleCloudSync(){auraCloud.schedule();}
function flushCloudSync(){return auraCloud.flush();}
function signInWithGoogle(){return auraCloud.signIn();}
function doCloudSignOut(keepChoice){return auraCloud.signOut(keepChoice);}
function toggleCloudSignIn(){return auraCloud.toggleSignIn();}
function openEmailAuth(){return auraCloud.openEmailAuth();}
function closeEmailAuth(){return auraCloud.closeEmailAuth();}
function setEmailAuthMode(mode){return auraCloud.setEmailAuthMode(mode);}
function submitEmailAuth(mode){return auraCloud.submitEmailAuth(mode);}
