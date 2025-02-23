import { 
  messagingApi,
  webhook,
} from '@line/bot-sdk'
import { ExecutionContext } from 'hono'
import { uploadToGyazo } from './gyazo';
import { analyzeImageBlob } from './openai';
import { white_list } from './utils';

export const handleEvent = async (
  event: webhook.Event,
  accessToken: string,
  // webhookURL: string,
  ctx: ExecutionContext,
  gyazoAccessToken: string,
  openaiApiKey: string,
  kv: KVNamespace,
  db: D1Database
) => {
  if (event.type === 'postback') {
    await handlePostback(event as webhook.PostbackEvent, accessToken, ctx, kv, db);
    return;
  }

  if (event.type !== 'message' || event.message.type !== 'text' && event.message.type !== 'image') return;

  if (event.message.type === 'image' ) {
    try {
      fetch('https://api.line.me/v2/bot/chat/loading/start', {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ "chatId": event.source?.userId })
      })
    
      ctx.waitUntil(
        (async () => {
          const messageId = event.message.id
          const endPoint = `https://api-data.line.me/v2/bot/message/${messageId}/content`
          const res = await fetch(endPoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          })
    
          const imageBlob = await res.blob();
          const filename = `${event.message.id}-${event.timestamp}.png`;
          const [imageURL, analyzeResponse] = await Promise.all([
            uploadToGyazo(gyazoAccessToken, imageBlob, filename),
            analyzeImageBlob(imageBlob, openaiApiKey)
          ]);
          
          if (!event.source?.userId) return;
          await kv.put(event.source.userId, JSON.stringify({"imageURL": imageURL}));
          const medicines = analyzeResponse.choices[0].message.content;
          console.log(imageURL, medicines);
          
          if (!event.replyToken) return;
    
          // // ホワイトリストによるチェック（※必要に応じて利用）
          const isValid = white_list.some(item => medicines.includes(item));
          // // ※ここでは処方箋の解析結果にかかわらず、時間選択のFlex Messageを送信します。
          const replyText = isValid ?
          `${medicines}を受け付けました。` :
          `${medicines}はオンライン服薬指導対象外の可能性があります。詳細は薬剤師より連絡します。`

          const timeIntervals = [
            "10:00 ~ 10:30",
            "10:30 ~ 11:00",
            "11:00 ~ 11:30",
            "11:30 ~ 12:00",
            "12:00 ~ 12:30",
            "12:30 ~ 13:00",
            "13:00 ~ 13:30",
            "13:30 ~ 14:00"
          ];
          const flexMessage = generateFlexMessage(
            '時間を選択してください',
            'ご希望の診療時間を選択してください',
            generateTimeButtons(timeIntervals)
          )
    
          // 返信メッセージとしてFlex Messageを設定
          const responseBody: messagingApi.ReplyMessageRequest = {
            replyToken: event.replyToken,
            messages: [
              {"type": "text", "text": replyText},
              flexMessage
            ]
          };
          
          return fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(responseBody)
          });
        })()
      )
    } catch (error) {
      console.error(error);
    }    
  } else if (event.message.type === 'text') {
    try {
      fetch('https://api.line.me/v2/bot/chat/loading/start', {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({"chatId": event.source?.userId})
      })
  
      const { text } = event.message;
      ctx.waitUntil(
        (async () => {
          if(!event.replyToken) return
          const responseBody: messagingApi.ReplyMessageRequest = {
            replyToken: event.replyToken,
            messages: [
              {'type': 'text', 'text': text}
            ] 
          }
          
          return fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(responseBody)
          }) 
        })()
      )
    } catch (error) {
      console.error(error);
    }
  }
}

// postbackイベントを処理する関数
export const handlePostback = async (
  event: webhook.PostbackEvent,
  accessToken: string,
  ctx: ExecutionContext,
  kv: KVNamespace,
  db: D1Database
): Promise<void> => {
  if(!event.source?.userId) return
  const { userId } = event.source;

  const kvString = await kv.get(userId);
  if(!kvString) return;
  const kvData = JSON.parse(kvString);
  
  if (!kvData.guidanceTime) {
    const postbackData = event.postback.data; // 例: "time=10:00 ~ 10:30"
    // 必要に応じてデータをパース
    const selectedTime = postbackData.replace("time=", "");
    const replyText = `あなたが選択した時間は ${selectedTime} です。`;
    await kv.put(userId, JSON.stringify({
      "imageURL": kvData.imageURL,
      "guidanceTime": selectedTime
    }))
  
    if (!event.replyToken) return
  
    const timeIntervals = [
      "14:00 ~ 16:00",
      "16:00 ~ 18:00",
      "18:00 ~ 20:00",
      "20:00 ~ 22:00",
    ];
    const flexMessage = generateFlexMessage(
      '時間を選択してください',
      'ご希望の配送時間を選択してください',
      generateTimeButtons(timeIntervals)
    )
  
    const responseBody: messagingApi.ReplyMessageRequest = {
      replyToken: event.replyToken,
      messages: [
        { type: 'text', text: replyText },
        flexMessage
      ]
    };
  
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(responseBody)
    });
  } else {
    const postbackData = event.postback.data; // 例: "time=10:00 ~ 10:30"
    // 必要に応じてデータをパース
    const selectedTime = postbackData.replace("time=", "");
    const replyText = `服薬指導時間：${kvData.guidanceTime}
配送時間：${selectedTime}
で受け付けました。

薬剤師からの連絡をお待ちください。`;
    kv.delete(userId);
  
    if (!event.replyToken) return
  
    const responseBody: messagingApi.ReplyMessageRequest = {
      replyToken: event.replyToken,
      messages: [
        { type: 'text', text: replyText },
      ]
    };
  
    fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(responseBody)
    });

    const userProfile = await getUserProfile(userId, accessToken);
    await insertPrescription(
      db,
      userProfile.displayName,
      userId,
      kvData.imageURL,
      kvData.guidanceTime,
      selectedTime
    )
  }
};

const generateTimeButtons = (timeIntervals: string[]) => {
  const buttons: messagingApi.FlexButton[] = timeIntervals.map(interval => ({
    type: "button" as const,
    action: {
      type: "postback" as const,
      label: interval,
      data: `time=${interval}`
    },
    style: "primary" as const,
    margin: "md" as const,
  }));
  return buttons
}

// Flex Messageの生成
const generateFlexMessage = (
  altText: string,
  contentsText: string,
  buttons: messagingApi.FlexButton[]
) => {
  const flexMessage: messagingApi.FlexMessage = {
    type: "flex",
    altText: altText,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: contentsText,
            weight: "bold",
            size: "md"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: buttons
          }
        ]
      }
    }
  };
  return flexMessage
}

// ユーザープロフィールの型定義
interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;     // プロフィール画像のURL（存在する場合）
  statusMessage?: string;  // ステータスメッセージ（存在する場合）
}

async function getUserProfile(userId: string, accessToken: string): Promise<UserProfile> {
  const endpoint = `https://api.line.me/v2/bot/profile/${userId}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.status}`);
  }

  const data: UserProfile = await response.json();
  return data;
}

// 例: prescriptions テーブルにデータを挿入する関数
async function insertPrescription(
  db: D1Database, 
  displayName: string, 
  userId: string, 
  prescriptionImageUrl: string, 
  onlineGuidanceTime: string, 
  medicineDeliveryTime: string
): Promise<void> {
  const sql = `
    INSERT INTO prescriptions (
      user_name, 
      user_id, 
      prescription_image_url, 
      online_guidance_time, 
      medicine_delivery_time, 
      prescription_checked, 
      guidance_executed, 
      delivery_executed
    ) VALUES (?, ?, ?, ?, ?, 0, 0, 0)
  `;
  
  const result = await db.prepare(sql)
    .bind(displayName, userId, prescriptionImageUrl, onlineGuidanceTime, medicineDeliveryTime)
    .run();
  console.log(result);
}
