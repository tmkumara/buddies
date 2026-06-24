-- ============================================================
-- Data migration: buddiescraft_db (Spring Boot) → new schema
-- Source backup: buddiescraft_db_backup_2026-06-24_21-14.sql
--
-- Prerequisites:
--   1. New schema already applied via Prisma (prisma migrate dev
--      or prisma db push) — tables must already exist.
--   2. Run this script once on the target database.
--
-- This script:
--   • Clears any seed/placeholder data first
--   • Inserts all production data with schema transformations:
--       - users.must_change_password = FALSE (preserve real pwd hash)
--       - material.current_stock_level = 0.00 (new column)
--       - order_item.design_name / design_code backfilled from box_design
--   • order_seq and order_status_history are left empty (fresh start)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Clear in reverse-dependency order so seed data doesn't cause conflicts
TRUNCATE TABLE order_status_history;
TRUNCATE TABLE order_item;
TRUNCATE TABLE customer_order;
TRUNCATE TABLE order_seq;
TRUNCATE TABLE box_design;
TRUNCATE TABLE customer;
TRUNCATE TABLE design_type;
TRUNCATE TABLE material;
TRUNCATE TABLE users;

-- ── 1. USERS ─────────────────────────────────────────────────
-- Preserves the real bcrypt password hash from production.
-- must_change_password set to FALSE — admin already knows their password.
INSERT INTO users (id, username, password_hash, role, is_active, must_change_password, created_at, updated_at) VALUES
(1, 'admin', '$2a$10$W.Hnw8pTVR/IKVzYFJ66pem9aXxPUTkog3tsj1lIj58qErdnne892', 'ADMIN', TRUE, FALSE, '2026-01-14 04:44:16', '2026-01-14 04:44:16');

ALTER TABLE users AUTO_INCREMENT = 2;

-- ── 2. DESIGN TYPE ───────────────────────────────────────────
-- Direct copy — no structural changes.
-- IDs are non-sequential (1,2,8-16,18-21); INSERT preserves original IDs.
INSERT INTO design_type (id, code, name, description, image_url, is_active, created_at, updated_at) VALUES
(1,  '101',  'Bottle Box',                    'Normal',                    '', TRUE, '2026-01-16 17:08:05', '2026-01-16 17:08:05'),
(2,  '102',  'Gift Mailer Box',               'Normal',                    '', TRUE, '2026-02-25 07:49:54', '2026-02-25 07:54:57'),
(8,  '103',  'Packing Box with Lid',          'Add window and partition',  '', TRUE, '2026-02-25 08:19:38', '2026-02-25 08:19:38'),
(9,  '104',  'Packing Tuck End Box',          'Add window',                '', TRUE, '2026-02-25 08:38:31', '2026-02-25 08:38:31'),
(10, '105',  'Packing Mailer Box',            'Add window',                '', TRUE, '2026-02-25 09:15:49', '2026-02-25 09:15:49'),
(11, '106',  'Packing Mailer Box',            'Normal',                    '', TRUE, '2026-02-25 09:41:17', '2026-02-25 09:41:17'),
(12, '107',  'Frame Box with Lid',            'Add partition',             '', TRUE, '2026-02-25 10:41:06', '2026-02-25 10:45:42'),
(13, '108',  'Frame Box with Lid',            'Normal',                    '', TRUE, '2026-02-25 10:56:12', '2026-02-25 10:56:12'),
(14, '109',  'Packing Auto Lock Box with lid','Add window',                '', TRUE, '2026-02-25 13:15:28', '2026-02-25 13:15:28'),
(15, '1010', 'Packing Box with Lid',          'Normal',                    '', TRUE, '2026-02-25 14:22:50', '2026-02-25 14:22:50'),
(16, '1011', 'Packing Tuck End Box',          'Normal',                    '', TRUE, '2026-02-25 15:07:33', '2026-02-25 15:07:33'),
(18, '1012', 'Envelop',                       'Normal',                    '', TRUE, '2026-02-25 15:24:42', '2026-02-25 15:24:42'),
(19, '1013', 'Activities',                    'Round Shapes',              '', TRUE, '2026-02-25 15:39:20', '2026-02-25 15:39:20'),
(20, '1014', 'Packing Box with Lid',          '',                          '', TRUE, '2026-03-17 08:17:57', '2026-03-17 08:17:57'),
(21, '1015', 'Bottle Box',                    '',                          '', TRUE, '2026-03-17 09:15:49', '2026-03-17 09:15:49');

ALTER TABLE design_type AUTO_INCREMENT = 22;

-- ── 3. MATERIAL ──────────────────────────────────────────────
-- New column: current_stock_level — set to 0.00 (unknown at migration time).
INSERT INTO material (id, code, name, gsm, sheet_length_cm, sheet_width_cm, cost_per_sheet, min_stock_level, current_stock_level, is_active, created_at, updated_at) VALUES
(1, '250 - W/B', 'White box board (white back)', 250, 43.00, 31.00,  85.00,  5.00, 0.00, TRUE, '2026-01-16 16:55:43', '2026-02-25 07:47:12'),
(2, '350 - G/B', 'White box board (gray back)',  350, 43.00, 31.00, 100.00, 10.00, 0.00, TRUE, '2026-02-25 07:46:23', '2026-02-25 07:46:23'),
(3, '350 - W/B', 'White box board (white back)', 350, 43.00, 31.00, 115.00, 10.00, 0.00, TRUE, '2026-02-25 08:17:24', '2026-02-25 08:17:24'),
(4, '250 - C/S', 'Colour Shining Board',         250, 43.00, 31.00, 230.00,  3.00, 0.00, TRUE, '2026-02-25 08:33:40', '2026-02-25 08:33:40'),
(5, '400 - B/K', 'Brown Kraft Board',            400, 43.00, 31.00, 230.00,  5.00, 0.00, TRUE, '2026-03-17 08:15:13', '2026-03-17 08:15:13');

ALTER TABLE material AUTO_INCREMENT = 6;

-- ── 4. BOX DESIGN ────────────────────────────────────────────
-- Direct copy — no structural changes.
INSERT INTO box_design (id, code, name, design_type_id, material_id, length_cm, width_cm, height_cm, cut_length_cm, cut_width_cm, raw_area_sq_cm, unit_price, design_file_path, is_custom, is_active, created_at, updated_at) VALUES
(1,  '1001',  'Normal',                     1,  1,  3.80,  1.20, 1.20,  7.50,  5.50,  41.25,  13.00, NULL, TRUE,  TRUE, '2026-01-16 17:15:45', '2026-02-25 07:59:00'),
(2,  '1002',  'Normal',                     2,  2, 11.00,  9.00, 3.00, 27.00, 23.00, 621.00, 165.00, NULL, FALSE, TRUE, '2026-02-25 07:58:27', '2026-02-25 07:58:27'),
(3,  '1003',  'Add window and partition',   8,  3, 15.00, 11.00, 2.00, 29.00, 20.00, 580.00, 200.00, NULL, TRUE,  TRUE, '2026-02-25 08:22:07', '2026-02-25 08:57:07'),
(4,  '1004',  'Add window',                 9,  4,  9.50,  4.50, 1.00, 12.00, 12.00, 144.00, 106.00, NULL, TRUE,  TRUE, '2026-02-25 08:41:36', '2026-02-25 08:41:36'),
(5,  '1005',  'Add window and partition',   8,  3, 10.00, 10.00, 2.00, 32.00, 16.00, 512.00, 145.00, NULL, TRUE,  TRUE, '2026-02-25 08:55:10', '2026-02-25 08:55:10'),
(6,  '1006',  'Add window',                10,  3,  6.50,  4.50, 1.50, 13.00,  9.50, 123.50,  50.00, NULL, TRUE,  TRUE, '2026-02-25 09:18:58', '2026-02-25 09:18:58'),
(7,  '1007',  'Normal',                    11,  3,  9.00,  9.00, 2.00, 23.00, 13.00, 299.00,  90.00, NULL, TRUE,  TRUE, '2026-02-25 09:44:37', '2026-02-25 09:44:37'),
(8,  '1008',  'Add partition',             12,  3,  8.00,  6.00, 1.00, 22.00, 17.00, 374.00,  95.00, NULL, TRUE,  TRUE, '2026-02-25 10:48:01', '2026-02-25 10:48:01'),
(9,  '1009',  'Add partition',             12,  3,  8.00,  8.00, 1.00, 26.00, 19.00, 494.00, 110.00, NULL, TRUE,  TRUE, '2026-02-25 10:51:25', '2026-02-25 10:51:25'),
(10, '10010', 'Normal',                    13,  3,  8.00,  6.00, 1.00, 22.00, 17.00, 374.00,  85.00, NULL, TRUE,  TRUE, '2026-02-25 10:58:16', '2026-02-25 10:58:16'),
(11, '10011', 'Add partition',             12,  3,  6.00,  6.00, 1.00, 22.00, 15.00, 330.00,  85.00, NULL, TRUE,  TRUE, '2026-02-25 11:26:55', '2026-02-25 11:26:55'),
(12, '10012', 'Add partition',             12,  3,  9.00,  4.50, 1.00, 19.00, 16.00, 304.00,  95.00, NULL, TRUE,  TRUE, '2026-02-25 12:39:12', '2026-02-25 12:39:12'),
(13, '10013', 'Normal',                    13,  3,  8.00,  4.00, 1.00, 18.00, 15.00, 270.00,  75.00, NULL, TRUE,  TRUE, '2026-02-25 12:41:33', '2026-02-25 12:41:33'),
(14, '10014', 'Add partition',             12,  3, 10.00,  2.00, 1.00, 17.00, 14.00, 238.00,  85.00, NULL, TRUE,  TRUE, '2026-02-25 12:43:13', '2026-02-25 12:43:13'),
(15, '10015', 'Add partition',             12,  3, 12.00, 10.00, 1.00, 26.00, 19.00, 494.00, 155.00, NULL, TRUE,  TRUE, '2026-02-25 12:48:13', '2026-02-25 12:48:13'),
(16, '10016', 'Add window',               14,  3,  4.00,  4.00, 5.00, 17.00, 16.50, 280.50, 110.00, NULL, TRUE,  TRUE, '2026-02-25 13:18:12', '2026-02-25 13:18:12'),
(17, '10017', 'Add window and partition',  8,  3, 12.00,  4.00, 2.00, 17.00, 15.00, 255.00, 115.00, NULL, TRUE,  TRUE, '2026-02-25 14:01:51', '2026-02-25 14:01:51'),
(18, '10018', 'Normal',                   15,  2,  4.00,  4.00, 2.00, 18.00, 10.00, 180.00,  30.00, NULL, FALSE, TRUE, '2026-02-25 14:28:06', '2026-02-25 14:28:06'),
(19, '10019', 'Normal',                   16,  3, 12.00,  9.00, 0.63, 20.00, 14.50, 290.00,  65.00, NULL, TRUE,  TRUE, '2026-02-25 15:15:55', '2026-02-26 02:29:38'),
(20, '10020', 'Normal',                   18,  2, 12.00,  9.00, 0.01, 19.00, 15.00, 285.00,  39.00, NULL, TRUE,  TRUE, '2026-02-25 15:34:23', '2026-03-02 07:04:58'),
(21, '10021', 'Normal',                   16,  2, 12.00,  9.00, 0.63, 20.00, 14.50, 290.00,  43.00, NULL, TRUE,  TRUE, '2026-02-25 15:37:08', '2026-02-25 15:37:08'),
(22, '10022', 'Round Shapes',             19,  3,  8.00,  8.00, 0.01,  8.00,  8.00,  64.00,  14.00, NULL, TRUE,  TRUE, '2026-02-25 15:44:29', '2026-02-25 15:44:29'),
(23, '10023', 'Add window',               10,  2,  8.00,  8.00, 3.00, 23.00, 14.00, 322.00, 105.00, NULL, FALSE, TRUE, '2026-03-02 06:42:57', '2026-03-02 06:42:57'),
(24, '10024', 'Normal',                   15,  5,  5.00,  4.00, 1.50, 14.60,  9.50, 138.70,  64.00, NULL, TRUE,  TRUE, '2026-03-17 08:58:53', '2026-03-17 08:58:53'),
(25, '10025', 'Normal',                   15,  5,  7.00,  4.00, 1.50, 14.60, 11.50, 167.90,  81.00, NULL, TRUE,  TRUE, '2026-03-17 09:01:34', '2026-03-17 09:01:34'),
(26, '10026', 'Normal',                    1,  4,  7.50,  2.00, 2.00, 12.00,  9.00, 108.00,  81.00, NULL, TRUE,  TRUE, '2026-03-17 09:40:45', '2026-03-17 09:40:45'),
(27, '10027', 'Normal',                   16,  3,  5.90,  2.95, 0.78,  9.00,  8.50,  76.50,  27.00, NULL, TRUE,  TRUE, '2026-04-21 11:23:34', '2026-04-21 11:23:34');

ALTER TABLE box_design AUTO_INCREMENT = 28;

-- ── 5. CUSTOMER ──────────────────────────────────────────────
-- Direct copy — no structural changes. Customer 14 is inactive.
INSERT INTO customer (id, name, phone, email, address_line, notes, is_active, created_at, updated_at) VALUES
(1,  'Tharuneth Malaviarachchi', '0772257704', 'tharunethmalaviarachchi@gmail.com', 'Samagi traders, Diddaliya, Meetiyagoda, Ambalangoda', '',                               TRUE,  '2026-01-16 16:44:57', '2026-01-16 16:48:07'),
(2,  'Samadhi Upeksha',          '0703749108', 'samadhiupeksha1996@gmail.com',      '148/A, Mullegama, Ambathenna, Katugasthota',             '',                               TRUE,  '2026-02-25 08:02:30', '2026-02-25 08:02:30'),
(3,  'Shyama Kumuduni',          '0715577555', '',                                  'No 161/C, Welivita, Kaduwela',                           'Business WhatsApp Chat no 0742654558', TRUE, '2026-02-25 08:14:52', '2026-02-25 08:14:52'),
(4,  'A.M. Dewmi Sathya',        '0764469239', '',                                  'No 7/45, Parakrama Mawatha, Kanthale',                   '',                               TRUE,  '2026-02-25 08:28:31', '2026-02-25 08:28:31'),
(5,  'Lashini Wickramasinghe',   '0710973896', 'd19106@dental.pdn.ac.lk',           'Faculty of dental sciences, University of Peradeniya, Peradeniya', '',                   TRUE,  '2026-02-25 09:12:29', '2026-02-25 09:12:29'),
(6,  'M.D. Jacobs',              '0779476840', 'dominique.naruto@gmail.com',        '72/1, Nugathalawa Junction, Welimada',                   'FB profile name Mitchum',        TRUE,  '2026-02-25 09:32:17', '2026-02-25 09:32:17'),
(7,  'Janani Chandula',          '0773437179', 'jananicrathnayaka89@gmail.com',     '149/01, Kandy Road, Pasyala',                            '',                               TRUE,  '2026-02-25 09:55:21', '2026-02-25 09:55:21'),
(8,  'Chamani Perera',           '0772587696', 'cmee.dp.83@gmail.com',             'Sirisara, 160 B, Temple Road, Walgama, Bandaragama',     '',                               TRUE,  '2026-02-25 14:17:40', '2026-02-25 14:17:40'),
(9,  'D.P.I. Niroshan',          '0704835493', '',                                  '58/25/E, Galwala Road, 2nd Lane, Malapalla, Homagama',   'FB profile name Iranga',         TRUE,  '2026-02-25 15:02:43', '2026-02-25 15:03:44'),
(10, 'Sripalee De Silva',        '0774398386', 'sripalee92@gmail.com',             '70A/1, Sooriyamal Mawatha, Divulpitiya, Boralasgamuwa, Nugegoda', '',                   TRUE,  '2026-02-26 02:54:56', '2026-02-26 02:54:56'),
(11, 'EDI',                      '0713749305', 'Edileathercraft@gmail.com',        'Belgodakanda, Kosgolla, Kurunegala',                     '',                               TRUE,  '2026-03-17 07:44:42', '2026-03-17 07:44:42'),
(12, 'S.A. Chesara Chamari',     '0764088747', 'chamarichesara07@gmail.com',       'No K.P.A. 44, 01st Avenue, Nawagampura, Ampara',        '0779001707',                     TRUE,  '2026-03-17 09:13:01', '2026-03-17 09:13:38'),
(13, 'Kisal Gamlath',            '0720358976', 'Kisalidusaragamlath@gmail.com',    'Matale road, Dodamgaslande, Kurunegala',                 'FB Profile - Kisal',             TRUE,  '2026-04-21 11:09:18', '2026-04-21 11:12:23'),
(14, 'Kisal Gamlath',            '0720358976', 'Kisal',                            '',                                                       '',                               FALSE, '2026-04-21 11:09:20', '2026-04-21 11:13:23');

ALTER TABLE customer AUTO_INCREMENT = 15;

-- ── 6. CUSTOMER ORDER ────────────────────────────────────────
-- Direct copy — status enum values are identical between old and new schema.
-- discount_amount is stored as an absolute amount (not a percentage) in both systems.
-- Remarks with embedded newlines (\r\n) are preserved as-is.
INSERT INTO customer_order (id, order_no, customer_id, order_date, delivery_date, status, total_amount, discount_amount, net_amount, remarks, created_at, updated_at) VALUES
(1,  'ORD-20260116',   1,  '2026-01-11', '2026-01-13', 'DELIVERED',     1950.00,    195.00,  1755.00, 'Oil Bottle',                                        '2026-01-16 17:22:10', '2026-01-16 17:24:23'),
(2,  'ORD-20260225',   2,  '2026-01-16', '2026-02-03', 'DELIVERED',      825.00,      0.00,   825.00, 'Shine Bright FB Page',                              '2026-02-25 08:07:30', '2026-02-25 08:46:47'),
(3,  'ORD-20260225-1', 3,  '2026-01-16', '2026-01-17', 'DELIVERED',      200.00,      0.00,   200.00, 'Sample box for nuts packaging\r\nRichkey Spot Shop', '2026-02-25 08:25:00', '2026-02-25 08:48:12'),
(4,  'ORD-20260225-2', 4,  '2026-01-17', '2026-02-16', 'DELIVERED',     2120.00,    106.00,  2014.00, 'Chocolate Box Pink Colour',                         '2026-02-25 08:45:18', '2026-02-25 08:45:31'),
(5,  'ORD-20260225-3', 3,  '2026-01-27', '2026-02-05', 'DELIVERED',     8625.00,    603.75,  8021.25, 'Richkey Spot Shop',                                 '2026-02-25 09:01:38', '2026-02-25 09:01:57'),
(6,  'ORD-20260225-4', 5,  '2026-02-01', '2026-02-06', 'DELIVERED',     3250.00,    227.50,  3022.50, '',                                                  '2026-02-25 09:24:38', '2026-02-25 09:26:09'),
(7,  'ORD-20260225-5', 6,  '2026-02-02', '2026-02-09', 'DELIVERED',     2700.00,    135.00,  2565.00, 'Cake Box',                                          '2026-02-25 09:47:26', '2026-02-25 09:48:33'),
(8,  'ORD-20260225-6', 7,  '2026-02-06', '2026-02-11', 'DELIVERED',    11175.00,   1117.50, 10057.50, 'Chocolate Box',                                     '2026-02-25 13:04:01', '2026-02-25 13:04:23'),
(9,  'ORD-20260225-7', 3,  '2026-02-07', '2026-02-26', 'DELIVERED',     5625.00,    393.75,  5231.25, 'Richkey Spot Shop',                                 '2026-02-25 14:09:41', '2026-02-28 07:07:32'),
(10, 'ORD-20260225-8', 8,  '2026-02-10', '2026-02-16', 'DELIVERED',      750.00,     37.50,   712.50, '',                                                  '2026-02-25 14:31:15', '2026-02-25 14:31:39'),
(11, 'ORD-20260226',   9,  '2026-02-17', '2026-02-24', 'DELIVERED',     6620.00,    662.00,  5958.00, 'Tute Box\r\nTute Envelop\r\nActivity Round Shapes', '2026-02-26 02:40:03', '2026-02-26 02:40:16'),
(12, 'ORD-20260302',   10, '2026-02-17', '2026-02-24', 'DELIVERED',     2100.00,    105.00,  1995.00, '',                                                  '2026-03-02 06:45:21', '2026-03-02 06:45:36'),
(13, 'ORD-20260302-1', 9,  '2026-02-25', '2026-03-01', 'DELIVERED',     3900.00,    390.00,  3510.00, 'Tute Envelop',                                      '2026-03-02 07:06:03', '2026-03-02 07:06:12'),
(14, 'ORD-20260317',   9,  '2026-03-09', '2026-03-17', 'READY',         3900.00,    390.00,  3510.00, 'Tute Envelop',                                      '2026-03-17 07:40:49', '2026-03-17 07:41:09'),
(15, 'ORD-20260317-1', 11, '2026-03-12', '2026-03-19', 'IN_PRODUCTION', 1450.00,     72.50,  1377.50, 'Wallet Box',                                        '2026-03-17 09:07:30', '2026-03-17 09:07:54'),
(16, 'ORD-20260317-2', 12, '2026-03-15', '2026-03-23', 'IN_PRODUCTION', 8100.00,    810.00,  7290.00, 'Oil Bottle\r\nBlack Shining',                       '2026-03-17 09:43:55', '2026-03-17 09:44:10'),
(17, 'ORD-20260421',   13, '2026-04-21', '2026-04-30', 'DRAFT',        27000.00,   2700.00, 24300.00, 'For USB cable',                                     '2026-04-21 11:27:14', '2026-04-21 11:27:14');

ALTER TABLE customer_order AUTO_INCREMENT = 18;

-- ── 7. ORDER ITEM ────────────────────────────────────────────
-- New columns: design_name and design_code (NOT NULL).
-- Backfilled from box_design at migration time — this is the correct
-- snapshot value since designs haven't been renamed in the old system.
INSERT INTO order_item (id, order_id, box_design_id, design_name, design_code, quantity, unit_price, line_total) VALUES
(1,  1,  1,  'Normal',                    '1001',  150,  13.00,  1950.00),
(2,  2,  2,  'Normal',                    '1002',    5, 165.00,   825.00),
(3,  3,  3,  'Add window and partition',  '1003',    1, 200.00,   200.00),
(4,  4,  4,  'Add window',               '1004',   20, 106.00,  2120.00),
(5,  5,  3,  'Add window and partition',  '1003',   25, 200.00,  5000.00),
(6,  5,  5,  'Add window and partition',  '1005',   25, 145.00,  3625.00),
(7,  6,  6,  'Add window',               '1006',   65,  50.00,  3250.00),
(8,  7,  7,  'Normal',                    '1007',   30,  90.00,  2700.00),
(9,  8,  8,  'Add partition',            '1008',   10,  95.00,   950.00),
(10, 8,  9,  'Add partition',            '1009',   15, 110.00,  1650.00),
(11, 8,  10, 'Normal',                    '10010',  10,  85.00,   850.00),
(12, 8,  11, 'Add partition',            '10011',   5,  85.00,   425.00),
(13, 8,  11, 'Add partition',            '10011',  10,  85.00,   850.00),
(14, 8,  8,  'Add partition',            '1008',   10,  95.00,   950.00),
(15, 8,  12, 'Add partition',            '10012',   5,  95.00,   475.00),
(16, 8,  12, 'Add partition',            '10012',  10,  95.00,   950.00),
(17, 8,  13, 'Normal',                    '10013',  10,  75.00,   750.00),
(18, 8,  14, 'Add partition',            '10014',  30,  85.00,  2550.00),
(19, 8,  15, 'Add partition',            '10015',   5, 155.00,   775.00),
(20, 9,  16, 'Add window',               '10016',  25, 110.00,  2750.00),
(21, 9,  17, 'Add window and partition',  '10017',  25, 115.00,  2875.00),
(22, 10, 18, 'Normal',                    '10018',  25,  30.00,   750.00),
(23, 11, 19, 'Normal',                    '10019', 100,  65.00,  6500.00),
(24, 11, 21, 'Normal',                    '10021',   1,  43.00,    43.00),
(25, 11, 20, 'Normal',                    '10020',   1,  35.00,    35.00),
(26, 11, 22, 'Round Shapes',             '10022',   3,  14.00,    42.00),
(27, 12, 23, 'Add window',               '10023',  20, 105.00,  2100.00),
(28, 13, 20, 'Normal',                    '10020', 100,  39.00,  3900.00),
(29, 14, 20, 'Normal',                    '10020', 100,  39.00,  3900.00),
(30, 15, 24, 'Normal',                    '10024',  10,  64.00,   640.00),
(31, 15, 25, 'Normal',                    '10025',  10,  81.00,   810.00),
(32, 16, 26, 'Normal',                    '10026', 100,  81.00,  8100.00),
(33, 17, 27, 'Normal',                    '10027', 1000, 27.00, 27000.00);

ALTER TABLE order_item AUTO_INCREMENT = 34;

-- ── 8. ORDER SEQ & STATUS HISTORY ───────────────────────────
-- Both tables start empty.
-- order_seq: all migrated orders are historical (Jan–Apr 2026).
--   New orders today (Jun 2026) will start fresh with no sequence conflicts.
-- order_status_history: no history data in old system — starts clean.

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Verification queries (run manually after import to confirm):
--
--   SELECT COUNT(*) FROM users;           -- expect 1
--   SELECT COUNT(*) FROM design_type;     -- expect 15
--   SELECT COUNT(*) FROM material;        -- expect 5
--   SELECT COUNT(*) FROM box_design;      -- expect 27
--   SELECT COUNT(*) FROM customer;        -- expect 14
--   SELECT COUNT(*) FROM customer_order;  -- expect 17
--   SELECT COUNT(*) FROM order_item;      -- expect 33
-- ============================================================
