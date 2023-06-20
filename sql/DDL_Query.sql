CREATE DATABASE codeplay;
USE codeplay;

/* Chapter Table */
CREATE TABLE chapter (
	chapter_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    banner VARCHAR(255),
    PRIMARY KEY (chapter_id)
);

/* Stage Table */
CREATE TABLE stage (
	stage_id VARCHAR(255) NOT NULL,
    chapter_id VARCHAR(255),
    PRIMARY KEY (stage_id),
    FOREIGN KEY (chapter_id) REFERENCES chapter(chapter_id)
);

/* Skin Base Table */
CREATE TABLE skin (
	skin_id VARCHAR(255) NOT NULL,
    stage_id VARCHAR(255),
    skin_name VARCHAR(255),
    skin_image VARCHAR(255),
    PRIMARY KEY (skin_id),
    FOREIGN KEY (stage_id) REFERENCES stage(stage_id)
);

/* Player Table - START */
CREATE TABLE player_seq
(
	seq_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY
);

CREATE TABLE player (
	player_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL DEFAULT '0',
	email VARCHAR(255) NOT NULL,
    equiped_skin VARCHAR(255) NOT NULL DEFAULT 'SK-0',
    FOREIGN KEY (equiped_skin) REFERENCES skin(skin_id),
    PRIMARY KEY(player_id)
);
/* Player Table - END */

/* Chapter Stat Table */
CREATE TABLE chapter_stat (
	player_id VARCHAR(255) NOT NULL,
    chapter_id VARCHAR(255) NOT NULL,
    is_solved BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES chapter(chapter_id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (player_id, chapter_id)
);

/* Stage Stat Table */
CREATE TABLE stage_stat (
	player_id VARCHAR(255) NOT NULL,
    stage_id VARCHAR(255) NOT NULL,
    is_solved BOOLEAN NOT NULL DEFAULT 0,
    total_codes INT NOT NULL DEFAULT -1,
    stars INT NOT NULL DEFAULT 0,
    fastest_time INT NOT NULL DEFAULT -1,
    FOREIGN KEY (player_id) REFERENCES player(player_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES stage(stage_id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (player_id, stage_id)
);

/* Skin Stat Table */
CREATE TABLE skin_ownership (
	player_id VARCHAR(255) NOT NULL,
    skin_id VARCHAR(255) NOT NULL,
    is_owned BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES player(player_id),
    FOREIGN KEY (skin_id) REFERENCES skin(skin_id),
    PRIMARY KEY (player_id, skin_id)
);

-- Create default username when a new player entry is added.
DELIMITER $$
CREATE TRIGGER tg_default_username
BEFORE INSERT ON player
FOR EACH ROW
BEGIN
  INSERT INTO player_seq VALUES (NULL);
  SET NEW.username = CONCAT('Player#', LAST_INSERT_ID());
END$$
DELIMITER ;

-- Insert default chapter stat for every chapters when a new new player entry is added.
DELIMITER $$
CREATE TRIGGER tg_default_chapter_stat_on_new_player
AFTER INSERT
ON player FOR EACH ROW
BEGIN
	DECLARE cur_chapter_id VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR SELECT chapter_id FROM chapter;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
	read_loop: LOOP
		FETCH cur INTO cur_chapter_id;
		IF done THEN
			LEAVE read_loop;
		END IF;
		INSERT INTO chapter_stat (player_id, chapter_id) VALUES (NEW.player_id, cur_chapter_id);
	END LOOP;
	CLOSE cur;
END$$
DELIMITER ;

-- Insert default chapter stat for every players when a new chapter entry is added.
DELIMITER $$
CREATE TRIGGER tg_default_chapter_stat_on_new_chapter
AFTER INSERT
ON chapter FOR EACH ROW
BEGIN
	DECLARE cur_player_id VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR SELECT player_id FROM player;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
	read_loop: LOOP
		FETCH cur INTO cur_player_id;
		IF done THEN
			LEAVE read_loop;
		END IF;
		INSERT INTO chapter_stat (player_id, chapter_id) VALUES (cur_player_id, NEW.chapter_id);
	END LOOP;
	CLOSE cur;
END$$
DELIMITER ;

-- Insert default stage stat for every stages when a new new player entry is added.
DELIMITER $$
CREATE TRIGGER tg_default_stage_stat_on_new_player
AFTER INSERT
ON player FOR EACH ROW
BEGIN
	DECLARE cur_stage_id VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR SELECT stage_id FROM stage;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
	read_loop: LOOP
		FETCH cur INTO cur_stage_id;
		IF done THEN
			LEAVE read_loop;
		END IF;
		INSERT INTO stage_stat (player_id, stage_id) VALUES (NEW.player_id, cur_stage_id);
	END LOOP;
	CLOSE cur;
END$$
DELIMITER ;

-- Insert default stage stat for every players when a new stage entry is added.
DELIMITER $$
CREATE TRIGGER tg_default_stage_stat_on_new_stage
AFTER INSERT
ON stage FOR EACH ROW
BEGIN
	DECLARE cur_player_id VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR SELECT player_id FROM player;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
	read_loop: LOOP
		FETCH cur INTO cur_player_id;
		IF done THEN
			LEAVE read_loop;
		END IF;
		INSERT INTO stage_stat (player_id, stage_id) VALUES (cur_player_id, NEW.stage_id);
	END LOOP;
	CLOSE cur;
END$$
DELIMITER ;

-- Update chapter completion if the stages are completed and vice versa
DELIMITER $$
CREATE TRIGGER tg_update_chapter_completion_after_insert_stage
AFTER INSERT ON stage_stat
FOR EACH ROW
BEGIN
	CALL update_chapter_completion(NEW.player_id, NEW.stage_id);
END$$;
DELIMITER ;

DELIMITER $$
CREATE TRIGGER tg_update_chapter_completion_after_update_stage
AFTER UPDATE ON stage_stat
FOR EACH ROW
BEGIN
	CALL update_chapter_completion(NEW.player_id, NEW.stage_id);
END$$;
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE update_chapter_completion(IN target_player_id VARCHAR(255), IN source_stage_id VARCHAR(255))
BEGIN
	DECLARE target_chapter_id VARCHAR(255);
	SELECT DISTINCT chapter_id INTO target_chapter_id 
    FROM stage WHERE stage_id = source_stage_id;
    
	UPDATE chapter_stat
	SET is_solved = 1
    WHERE target_chapter_id IS NOT NULL
    AND chapter_id = target_chapter_id
    AND chapter_id NOT IN
	(
		SELECT DISTINCT st.chapter_id
		FROM stage st
		INNER JOIN stage_stat sts ON st.stage_id = sts.stage_id
		WHERE st.chapter_id = target_chapter_id
		AND sts.player_id = target_player_id
		AND sts.is_solved = 0
	);
END$$
DELIMITER ;

-- Insert default skin for every new new player entry.
DELIMITER $$
CREATE TRIGGER tg_default_skin_for_new_player
AFTER INSERT
ON player FOR EACH ROW
BEGIN
	INSERT INTO skin_ownership VALUES (NEW.player_id, 'SK-0', 1);
END$$
DELIMITER ;