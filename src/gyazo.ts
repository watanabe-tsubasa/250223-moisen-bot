import { GyazoUploadResponse } from "./types";

export const uploadToGyazo = async (
  accessToken: string,
  imageBlob: Blob,
  filename: string
): Promise<string> => {
  // FormData を作成し、必要なパラメーターを設定
  const formData = new FormData();
  formData.append("access_token", accessToken);
  // Blob を File オブジェクトに変換し、filename を指定
  const file = new File([imageBlob], filename, { type: imageBlob.type });
  formData.append("imagedata", file);
  // オプションパラメーター。必要に応じて追加してください。
  formData.append("access_policy", "anyone"); // 画像の公開範囲。デフォルトは anyone
  formData.append("metadata_is_public", "true"); // メタデータを公開する場合

  // Gyazo アップロードAPIにPOSTリクエスト
  const response = await fetch("https://upload.gyazo.com/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Gyazo upload failed: ${response.status}`);
  }

  const json: GyazoUploadResponse = await response.json();

  // レスポンス例にある url を返す
  return json.url;
}
