DROP TABLE IF EXISTS prescriptions;

CREATE TABLE prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  prescription_image_url TEXT NOT NULL,
  online_guidance_time TEXT,       -- オンライン服薬指導の希望時間（例："10:00 ~ 10:30"）
  medicine_delivery_time TEXT,      -- 薬の配送希望時間（例："14:00 ~ 16:00"）
  prescription_checked BOOLEAN NOT NULL DEFAULT 0,  -- 処方箋を確認したか（0:未確認, 1:確認済み）
  guidance_executed BOOLEAN NOT NULL DEFAULT 0,     -- 服薬指導を実行したか（0:未実施, 1:実施済み）
  delivery_executed BOOLEAN NOT NULL DEFAULT 0,     -- 薬の配送を実施したか（0:未実施, 1:実施済み）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
