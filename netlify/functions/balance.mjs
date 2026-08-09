import crypto from 'node:crypto';

export function json(data, status=200){
  return Response.json(data,{status,headers:{'cache-control':'no-store'}});
}

export function getEnv(){
  const SUPABASE_URL=process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY=process.env.SUPABASE_SECRET_KEY;
  const TELEGRAM_BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN;
  const MONETAG_POSTBACK_TOKEN=process.env.MONETAG_POSTBACK_TOKEN;
  if(!SUPABASE_URL||!SUPABASE_SECRET_KEY) throw new Error('Server configuration is incomplete.');
  return {SUPABASE_URL,SUPABASE_SECRET_KEY,TELEGRAM_BOT_TOKEN,MONETAG_POSTBACK_TOKEN};
}

export async function supabaseRpc(name, body){
  const {SUPABASE_URL,SUPABASE_SECRET_KEY}=getEnv();
  const r=await fetch(`${SUPABASE_URL.replace(/\/$/,'')}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{
      'content-type':'application/json',
      'apikey':SUPABASE_SECRET_KEY,
      'authorization':`Bearer ${SUPABASE_SECRET_KEY}`
    },
    body:JSON.stringify(body)
  });
  const text=await r.text();
  if(!r.ok){
    console.error(`Supabase RPC ${name} failed:`,r.status,text);
    throw new Error('Database request failed.');
  }
  if(!text) return null;
  try{return JSON.parse(text);}catch{return text;}
}

export function verifyTelegramInitData(initData, botToken, maxAgeSeconds=86400){
  if(!initData||!botToken) throw new Error('Missing Telegram authentication data.');
  const params=new URLSearchParams(initData);
  const receivedHash=params.get('hash');
  if(!receivedHash) throw new Error('Telegram hash is missing.');

  params.delete('hash');
  const dataCheckString=[...params.entries()]
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>`${k}=${v}`)
    .join('\n');

  const secretKey=crypto.createHmac('sha256','WebAppData').update(botToken).digest();
  const calculatedHash=crypto.createHmac('sha256',secretKey).update(dataCheckString).digest('hex');

  const a=Buffer.from(calculatedHash,'hex');
  const b=Buffer.from(receivedHash,'hex');
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) throw new Error('Invalid Telegram authentication data.');

  const authDate=Number(params.get('auth_date')||0);
  const now=Math.floor(Date.now()/1000);
  if(!authDate||authDate>now+60||now-authDate>maxAgeSeconds) throw new Error('Telegram authentication data has expired.');

  const userRaw=params.get('user');
  if(!userRaw) throw new Error('Telegram user is missing.');
  const user=JSON.parse(userRaw);
  if(!user?.id) throw new Error('Telegram user id is missing.');
  return user;
}
export const handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  };
};
