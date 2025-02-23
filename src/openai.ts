import { ChatCompletionResponse } from "./types";

/**
 * ArrayBuffer を Base64 エンコードするユーティリティ関数
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Blob を Base64 エンコードされた Data URL に変換する関数（Cloudflare Workers 用）
 */
async function blobToDataURL(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  // Data URL の形式を生成（MIME タイプは blob.type から取得）
  return `data:${blob.type};base64,${base64}`;
}

/**
 * 画像 Blob を直接 OpenAI の Vision API に渡して解析する例（Cloudflare Workers 用）
 * @param blob 解析対象の画像データ（Blob）
 * @param openaiApiKey OpenAI API キー
 */
export const analyzeImageBlob = async (blob: Blob, openaiApiKey: string): Promise<ChatCompletionResponse> => {
  // Blob を Data URL に変換
  const dataUrl = await blobToDataURL(blob);

  // リクエストペイロードを構築
  const payload = {
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prescriptionPrompt,
          },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
              // 必要に応じて detail パラメーターを追加可能
              detail: "high"
            },
          },
        ],
      },
    ],
    max_tokens: 300,
  };

  // OpenAI API へ POST リクエストを送信
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const json: ChatCompletionResponse =  await response.json();
  return json;
}

const prescriptionPrompt = `
<instructions>
あなたのタスクは、ユーザーが送信した処方箋の画像から薬の名称を正確に抜き出すことです。以下の手順に従ってください：

1. 画像を解析して、テキスト情報を抽出します。画像内の文字を認識するためにOCR（光学文字認識）技術を使用してください。

2. 抽出されたテキストから、薬の名称を特定します。薬の名称は通常、特定のフォーマットやキーワードに基づいて記載されています。例えば、薬の名称は大文字で始まることが多く、特定の医薬品名やブランド名が含まれます。

3. 薬の名称をリスト形式で整理し、重複を避けてください。リストは箇条書きで表示し、各薬の名称を改行して記載してください。

4. 出力にはXMLタグを含めないでください。薬の名称のみを明確に示してください。

5. 処方箋に記載されている他の情報（用量、服用方法、患者の名前など）は無視し、薬の名称のみに焦点を当ててください。

6. 処方箋が複数ページにわたる場合は、すべてのページから薬の名称を抽出し、統合してください。

7. もし薬の名称が不明瞭または判別できない場合は、その旨を明記してください。
</instructions>

<examples>
<example>
<description>処方箋の画像に記載された薬の名称を抽出する例</description>
<input>処方箋の画像には、以下の薬が記載されています：アスピリン、パラセタモール、イブプロフェン。</input>
<output>
アスピリン
パラセタモール
イブプロフェン
</output>
</example>

<example>
<description>処方箋の画像に記載された薬の名称を抽出する例</description>
<input>処方箋の画像には、以下の薬が記載されています：ロキソニン、ムコダイン。</input>
<output>
ロキソニン
ムコダイン
</output>
</example>

<example>
<description>処方箋の画像に記載された薬の名称を抽出する例</description>
<input>処方箋の画像には、以下の薬が記載されています：タミフル、リレンザ、ゾフルーザ。</input>
<output>
タミフル
リレンザ
ゾフルーザ
</output>
</example>
</examples>
`;
