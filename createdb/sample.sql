INSERT INTO prescriptions (
  user_name, 
  user_id, 
  prescription_image_url, 
  online_guidance_time, 
  medicine_delivery_time, 
  prescription_checked, 
  guidance_executed, 
  delivery_executed
) VALUES
  ('佐藤太郎', 'U1234567890abcdef', 'https://example.com/prescription1.png', '10:00 ~ 10:30', '14:00 ~ 16:00', 0, 0, 0),
  ('鈴木花子', 'U234567890abcdef1', 'https://example.com/prescription2.png', '10:30 ~ 11:00', '16:00 ~ 18:00', 0, 0, 0),
  ('高橋健', 'U34567890abcdef12', 'https://example.com/prescription3.png', '11:00 ~ 11:30', '18:00 ~ 20:00', 0, 0, 0),
  ('田中明美', 'U4567890abcdef123', 'https://example.com/prescription4.png', '11:30 ~ 12:00', '20:00 ~ 22:00', 0, 0, 0),
  ('伊藤大輔', 'U567890abcdef1234', 'https://example.com/prescription5.png', '12:00 ~ 12:30', '14:00 ~ 16:00', 0, 0, 0);
