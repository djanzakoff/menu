// Free GitHub Actions scheduled Web Push. Never log credentials, subscriptions or diary contents.
const admin=require('firebase-admin');
const webpush=require('web-push');
const creds=JSON.parse(process.env.RHYTHM_FIREBASE_SERVICE_ACCOUNT||'null');
const privateKey=process.env.RHYTHM_VAPID_PRIVATE_KEY;
if(!creds||!privateKey){console.log('Push not configured');process.exit(0)}
admin.initializeApp({credential:admin.credential.cert(creds)});
webpush.setVapidDetails('mailto:notifications@example.org','BEVmPAsXELOt6YOzVx6ETVmwFn_8SCx6w-_c7m1Zq184FR52JL077YDHbDyE5iYn96BWF_60emmEv7sfMFGQs_g',privateKey);
const messages={food:['Питание','Не забудь записать приём пищи'],water:['Вода','Пора попить воды'],walk:['Прогулка','Время выйти на прогулку'],sleep:['Сон','Пора готовиться ко сну'],exercise:['Зарядка','Время немного размяться']};
(async()=>{
 const now=new Date(),utc=now.getTime();let sent=0;
 const users=await admin.firestore().collection('users').get();
 for(const user of users.docs){
  const ref=admin.firestore().doc('users/'+user.id+'/private/diary');
  const snap=await ref.get();if(!snap.exists)continue;
  const payload=snap.data().payload||{},push=payload.rhythmPush;
  if(!push?.subscription||!push?.settings?.enabled)continue;
  const timezone=push.settings.timezone||'Europe/Moscow';
  let hhmm,day;
  try{hhmm=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);day=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}catch{continue}
  for(const [key,msg] of Object.entries(messages)){
   const times=push.settings.times?.[key]||[];
   if(!times.some(t=>{const [h,m]=t.split(':').map(Number),[ch,cm]=hhmm.split(':').map(Number);return Number.isFinite(h)&&Math.abs((ch*60+cm)-(h*60+m))<15&&ch*60+cm>=h*60+m}))continue;
   const slot=times.find(t=>{const [h,m]=t.split(':').map(Number),[ch,cm]=hhmm.split(':').map(Number);return ch*60+cm>=h*60+m&&ch*60+cm<h*60+m+15});
   if(!slot)continue;
   const tag=day+':'+key+':'+slot;
   if(push.sent?.[key]===tag)continue;
   try{await webpush.sendNotification(push.subscription,JSON.stringify({title:'Мой ритм · '+msg[0],body:msg[1],tag}));await ref.update({['payload.rhythmPush.sent.'+key]:tag});sent++}
   catch(e){console.error('Push delivery failed',e.statusCode||e.code||'unknown')}
  }
 }
 console.log('Notifications sent:',sent);
})().catch(e=>{console.error('Push job failed:',e.message);process.exitCode=1});
