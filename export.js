// export modal state
var exportOpts={bg:'gray',size:'1x',word:'yes',date:'yes',time:'no'};
var BG_PRESETS=[
  {val:'gray',stops:['#cdd5dc','#a8b3bd']},
  {val:'white',stops:['#f5f5f5','#e8e8e8']},
  {val:'black',stops:['#1a1a1a','#0a0a0a']},
  {val:'blush',stops:['#e8d5d0','#c9b0b0']},
  {val:'midnight',stops:['#1a1a2e','#0f0f1a']},
  {val:'sage',stops:['#c8d5c0','#a8b8a0']},
  {val:'transparent',stops:null}
];

function buildBgSwatches(){var wrap=document.getElementById('bgSwatches');wrap.innerHTML='';BG_PRESETS.forEach(function(p){var el=document.createElement('div');el.className='cswatch'+(p.val===exportOpts.bg?' selected':'');el.title=p.val;if(p.stops){el.style.background='linear-gradient(135deg,'+p.stops[0]+','+p.stops[1]+')';}else{el.style.background='transparent';el.style.border='2px dashed rgba(255,255,255,0.35)';}el.onclick=function(){exportOpts.bg=p.val;document.querySelectorAll('.cswatch').forEach(function(s){s.classList.remove('selected');});el.classList.add('selected');updateExportPreview();};wrap.appendChild(el);});}
function selectOpt(el){var group=el.dataset.group;document.querySelectorAll('[data-group="'+group+'"]').forEach(function(b){b.classList.remove('selected');});el.classList.add('selected');exportOpts[group]=el.dataset.val;updateExportPreview();}
function openExport(){if(!P)return;buildBgSwatches();document.getElementById('exportOverlay').classList.add('open');updateExportPreview();}
function closeExport(){document.getElementById('exportOverlay').classList.remove('open');}

var EXPORT_FONT_FAMILY='"Avenir Next", Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif';

function setExportFont(ctx,size,weight){
  ctx.font=(weight||600)+' '+Math.round(size)+'px '+EXPORT_FONT_FAMILY;
}

function measureTrackedText(ctx,text,tracking,wordGap){
  var chars=text.split('');
  return chars.reduce(function(sum,ch,i){
    return sum+ctx.measureText(ch).width+(i?tracking:0)+(ch===' '?wordGap:0);
  },0);
}

function fitExportFont(ctx,text,maxWidth,startPx,minPx,weight,trackingRatio,wordGapRatio){
  var size=startPx;
  do{
    setExportFont(ctx,size,weight);
    var tracking=size*(trackingRatio||0);
    var wordGap=size*(wordGapRatio||0);
    if(measureTrackedText(ctx,text,tracking,wordGap)<=maxWidth||size<=minPx)break;
    size-=2;
  }while(size>minPx);
  return size;
}

function drawTrackedText(ctx,text,x,y,tracking,wordGap){
  if(!tracking){ctx.fillText(text,x,y);return;}
  var chars=text.split('');
  var width=measureTrackedText(ctx,text,tracking,wordGap||0);
  var cursor=x-width/2;
  var prevAlign=ctx.textAlign;
  ctx.textAlign='left';
  chars.forEach(function(ch,i){
    if(i)cursor+=tracking;
    ctx.fillText(ch,cursor,y);
    cursor+=ctx.measureText(ch).width+(ch===' '?(wordGap||0):0);
  });
  ctx.textAlign=prevAlign;
}

function drawCenteredExportText(ctx,text,y,maxWidth,startPx,minPx,weight,trackingRatio,wordGapRatio){
  var size=fitExportFont(ctx,text,maxWidth,startPx,minPx,weight,trackingRatio,wordGapRatio);
  drawTrackedText(ctx,text,ctx.canvas.width/2,y,size*(trackingRatio||0),size*(wordGapRatio||0));
}

function exportTextColor(alpha){
  if(exportOpts.bg==='white')return 'rgba(72,88,102,'+alpha+')';
  return 'rgba(255,255,255,'+alpha+')';
}

function exportTextShadow(){
  if(exportOpts.bg==='white'){
    return {color:'rgba(255,255,255,0.42)',blur:0};
  }
  return {color:'rgba(60,75,90,0.20)',blur:0.016};
}

function renderExportCanvas(size){
  var CS=size||S;
  var off=document.createElement('canvas');off.width=off.height=CS;
  var oc=off.getContext('2d');
  var preset=BG_PRESETS.filter(function(p){return p.val===exportOpts.bg;})[0];
  if(preset&&preset.stops){
    var bg=oc.createRadialGradient(CS/2,CS/2.1,0,CS/2,CS/2,CS*.85);
    bg.addColorStop(0,preset.stops[0]);
    bg.addColorStop(1,preset.stops[1]);
    oc.fillStyle=bg;
    oc.fillRect(0,0,CS,CS);
    oc.globalAlpha=.45;
    oc.drawImage(grn,0,0,CS,CS);
    oc.globalAlpha=1;
  }
  var scale=CS/S;
  oc.save();oc.scale(scale,scale);
  var origCtx=ctx;ctx=oc;
  drawOrb(P,af);
  drawSparks(S/2,S/2,P);
  ctx=origCtx;
  oc.restore();
  oc.textAlign='center';
  oc.textBaseline='middle';
  var textShadow=exportTextShadow();
  oc.shadowColor=textShadow.color;
  oc.shadowBlur=CS*textShadow.blur;
  if(exportOpts.word==='yes'&&currentWord){
    var wordText=currentWord.toUpperCase();
    oc.fillStyle=exportTextColor(.88);
    drawCenteredExportText(oc,wordText,CS*.105,CS*.86,CS*.056,CS*.026,500,.16,.45);
  }
  if(exportOpts.date==='yes'||(exportOpts.time==='yes'&&currentTimeStr)){
    var stamp=[];
    if(exportOpts.date==='yes')stamp.push(currentDisplayDate||todayDisplay());
    if(exportOpts.time==='yes'&&currentTimeStr)stamp.push(currentTimeStr);
    var stampText=stamp.join(' · ');
    oc.fillStyle=exportTextColor(.82);
    drawCenteredExportText(oc,stampText.toUpperCase(),CS*.89,CS*.86,CS*.041,CS*.023,500,.14,.22);
  }
  oc.shadowBlur=0;
  return off;
}

function updateExportPreview(){if(!P)return;var pc=document.getElementById('exportPreview');if(!pc)return;var pcx=pc.getContext('2d'),preview=renderExportCanvas(pc.width);pcx.clearRect(0,0,pc.width,pc.height);pcx.drawImage(preview,0,0);}

function exportFileName(){
  var safeTime=currentTimeStr?'-'+currentTimeStr.replace(':','-'):'';
  return 'aura-'+(currentDateStr||todayStr())+safeTime+(currentWord?'-'+currentWord:'')+'.png';
}

function renderDownloadCanvas(){
  var mult={'1x':1,'2x':2,'4x':4}[exportOpts.size]||1;
  return renderExportCanvas(S*mult);
}

function canvasToBlob(canvas){
  return new Promise(function(resolve){
    canvas.toBlob(function(blob){resolve(blob);},'image/png');
  });
}

function doDownload(){if(!P)return;closeExport();var off=renderDownloadCanvas();var link=document.createElement('a');link.download=exportFileName();link.href=off.toDataURL('image/png');link.click();}

async function shareImage(){
  if(!P)return;
  var off=renderDownloadCanvas();
  var blob=await canvasToBlob(off);
  if(!blob){doDownload();return;}
  var file=new File([blob],exportFileName(),{type:'image/png'});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{
      closeExport();
      await navigator.share({files:[file],title:'Aura image',text:currentWord||'Aura'});
    }catch(err){
      if(err&&err.name==='AbortError')return;
      doDownload();
    }
  }else{
    doDownload();
  }
}
