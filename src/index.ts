import { 
  messagingApi,
  webhook,
} from '@line/bot-sdk'
import { ExecutionContext, Hono } from 'hono'
import HmacSHA256 from "crypto-js/hmac-sha256";
import Base64 from "crypto-js/enc-base64";
import { uploadToGyazo } from './gyazo';
import { analyzeImageBlob } from './openai';
import { white_list } from './utils';
import { handleEvent } from './handleEvent';

type Bindings = {
  CHANNEL_ACCESS_TOKEN: string,
  CHANNEL_SECRET: string,
  // WEBHOOK_URL: string,
  GYAZO_ACCESS_TOKEN: string,
  OPENAAI_API_KEY: string,
  BOT_CASH: KVNamespace,
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.text('Hello hono & line!')
})

app.post('/webhook', async (c) => {
  const body = await c.req.text() // JSONではなくテキストで取得
  const channelAccessToken = c.env.CHANNEL_ACCESS_TOKEN || ''
  const channelSecret = c.env.CHANNEL_SECRET || ''
  // const webhookURL = c.env.WEBHOOK_URL || ''
  const gyazoAccessToken = c.env.GYAZO_ACCESS_TOKEN || '';
  const openaiApiKey = c.env.OPENAAI_API_KEY || '';
  const kv = c.env.BOT_CASH || '';
  const db = c.env.DB || '';

  // シグネチャの取得
  const signature = c.req.header('x-line-signature')
  if (!signature) {
    return c.text('Missing signature', 400)
  }

  // HMACを使ってシグネチャを生成
  const hash = await generateHmac(channelSecret, body);

  // シグネチャの検証
  if (signature !== hash) {
    return c.text('Invalid signature', 403)
  }

  const events = JSON.parse(body).events
  const promises = events.map((event: webhook.Event) => handleEvent(
    event,
    channelAccessToken,
    // webhookURL,
    c.executionCtx,
    gyazoAccessToken,
    openaiApiKey,
    kv,
    db
  ))
  await Promise.all(promises)

  return c.text('OK')
})

export default app

const generateHmac = async (secret: string, message: string) => {
  const hmac = HmacSHA256(message, secret);
  return Base64.stringify(hmac);
}