USE codeplay;

/* Chapter Data */
INSERT INTO chapter VALUES
('CH-1', 'Petualangan Dimulai', 'Banners/CH/banner_ch-1'),
('CH-2', 'Mencari Buah Ajaib', 'Banners/CH/banner_ch-2');
SELECT * FROM chapter;

/* Stage Data */
INSERT INTO stage VALUES
('CH-1-1', 'CH-1'),
('CH-1-2', 'CH-1'),
('CH-1-3', 'CH-1'),
('CH-2-1', 'CH-2'),
('CH-2-2', 'CH-2'),
('CH-2-3', 'CH-2');
SELECT * FROM stage;

/* Skin Data */
INSERT INTO skin VALUES
('SK-0', NULL, 'Default', 'Skins/skin_default'),
('SK-1', 'CH-1-1', 'Pink Glasses', 'Skins/skin_pink_glasses'),
('SK-2', 'CH-1-2', 'Farmer', 'Skins/skin_farmer'),
('SK-3', 'CH-1-3', 'Villager', 'Skins/skin_villager'),
('SK-4', 'CH-2-1', 'Summer', 'Skins/skin_summer'),
('SK-5', 'CH-2-2', 'Miner', 'Skins/skin_miner'),
('SK-6', 'CH-2-3', 'Adventurer', 'Skins/skin_adventurer');
SELECT * FROM skin;