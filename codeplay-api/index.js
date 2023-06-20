const express = require('express');
const serverless = require('serverless-http');
const mysql = require('mysql');

const localPort = 8080;
const app = express();

const mysqlPool = mysql.createPool(
{
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'codeplay',
});

// Landing Page
app.get("/", async (req, res) => 
{
    res.status(200).send({ error: false, message: "Welcome to CodePlay API." });
});


// Get Players
app.get("/players", async (req, res) => 
{
    const query = "SELECT * FROM player";
    mysqlPool.query(query, (error, result) => 
    {
        if (!result) 
        {
            res.status(400).send({ error: true, message: "Failed to get list of players. Error: " + error.message });
        } 
        else 
        {
            res.status(200).send({ error: false, message: "Get list of players success.", players: result});
        }
    });
});


// Get Specific Player
app.get("/players/:player_id", async (req, res) => 
{
    const query = "SELECT * FROM player WHERE player_id = ?";
    mysqlPool.query(query, [req.params.player_id], (error, result) => 
    {
        if (!result) 
        {
            res.status(400).send({ error: true, message: "Failed to get player. Error: " + error.message });
        } else 
        {
            if (result.length < 1) 
            {
                res.status(400).send({ error: true, message: "Player not found." });
            } 
            else 
            {
                res.status(200).send({ error: false, message: "Get player success.", player: result[0] });
            }
        }
    });
});


// Set Player Information
app.post("/set_player_info", async (req, res) => 
{
    const player_id = req.query.player_id;
    const username = req.query.username;

    const query = 
        `UPDATE player
        SET username = ?
        WHERE player_id = ?;`;

    mysqlPool.query(query, [username, player_id], (error, result) => 
    {
        if (!result)
        {
            res.status(400).send({ error: true, message: "Failed to set player information for player: " + player_id + ". Error: " + error.message });
        } 
        else 
        {
            res.status(200).send({ error: false, message: "Success to set player information for player: " + player_id });
        }
    });
});


// Sign New Account
app.post("/sign", async (req, res) => 
{
    const player_id = req.query.player_id;
    const email = req.query.email;

    const query = "SELECT player_id FROM player WHERE player_id = ?";
    mysqlPool.query(query, [player_id], (error, result) => 
    {
        if (!result) 
        {
            res.status(400).send({ error: true, message: "Error to sign player. Error: " + error.message });
        } 
        else 
        {
            if (result.length < 1) 
            {
                const query2 = "INSERT INTO player (player_id, email) VALUES (?, ?)";
                mysqlPool.query(query2, [player_id, email], (error, result2) => 
                {
                    if (!result2) res.status(400).send({ error: true, message:  "Error to sign player. Error: " + error.message });
                    else res.status(200).send({ error: false, message: "Player signed in.", player_id: player_id });
                });
            } 
            else 
            {
                res.status(200).send({ error: false, message: "Player already signed in.", player_id: player_id });
            }
        }
    });
});


// Get Chapters
app.get("/chapters", async (req, res) => 
{
    const player_id = req.query.player_id;

    const query = 
    `SELECT c.chapter_id, c.title, c.banner, ct.is_solved,
    (
        SELECT COUNT(stage_id) FROM stage
        WHERE chapter_id = c.chapter_id
    ) AS total_stages,
    (
        SELECT SUM(stars) FROM stage_stat
        WHERE stage_id IN (SELECT stage_id FROM stage WHERE chapter_id = c.chapter_id)
        AND player_id = ?
    ) AS total_stars
    FROM chapter c INNER JOIN chapter_stat ct ON c.chapter_id = ct.chapter_id
    WHERE ct.player_id = ?`;

    mysqlPool.query(query, [player_id, player_id], (error, result) => 
    {
        if (!result) 
        {
            res.status(400).send({ error: true, message: "Failed to get chapters. Error: " + error.message });
        } else 
        {
            res.status(200).send({ error: false, message: "Get chapters success.", chapters: result });
        }
    });
});


app.get("/stages", async (req, res) => 
{
    const player_id = req.query.player_id;
    const chapter_id = req.query.chapter_id;

    const query = 
        `SELECT s.stage_id, s.chapter_id, st.is_solved, st.total_codes, st.stars, st.fastest_time 
        FROM stage s INNER JOIN stage_stat st ON s.stage_id = st.stage_id
        WHERE st.player_id = ?
        AND s.chapter_id = ?`;

    mysqlPool.query(query, [player_id, chapter_id], (error, result) => 
    {
        if (!result) 
        {
            res.status(400).send({ error: true, message: "Failed to get stages for player: " + player_id + " in chapter: " + chapter_id + ". Error: " + error.message });
        } else 
        {
            res.status(200).send({ error: false, message: "Get stages success.", stages: result });
        }
    });
});


// Get Stage Details Based on Player
app.get("/stage", async (req, res) => 
{
    const player_id = req.query.player_id;
    const stage_id = req.query.stage_id;

    const query = 
        `SELECT s.stage_id, s.chapter_id, st.is_solved, st.total_codes, st.stars, st.fastest_time
        FROM stage s INNER JOIN stage_stat st ON s.stage_id = st.stage_id
        WHERE st.player_id = ?
        AND s.stage_id = ?`;

    mysqlPool.query(query, [player_id, stage_id], (error, result) => 
    {
        if (!result) 
        {
            res.status(400).send({ error: true, message: "Failed to get stage statistic for player: " + player_id + ". Error: " + error.message });
        } else 
        {
            res.status(200).send({ error: false, message: "Get stage statistic success.", stage: result[0] });
        }
    });
});


// Set Stage Details Based on Player
app.post("/set_stage_stat", async (req, res) => 
{
    const player_id = req.query.player_id;
    const stage_id = req.query.stage_id;
    const is_solved = req.query.is_solved;
    const total_codes = req.query.total_codes;
    const stars = req.query.stars;
    const fastest_time = req.query.fastest_time;

    const query = 
        `INSERT INTO stage_stat VALUES (?, ?, ?, ?, ?, ?) AS new_stat ON DUPLICATE KEY UPDATE
            is_solved = new_stat.is_solved,
            stage_stat.total_codes =
                CASE WHEN new_stat.total_codes < stage_stat.total_codes OR stage_stat.total_codes < 0 
                THEN new_stat.total_codes 
                ELSE stage_stat.total_codes END,
            stage_stat.stars =
                CASE WHEN new_stat.stars > stage_stat.stars
                THEN new_stat.stars 
                ELSE stage_stat.stars END,
            stage_stat.fastest_time = 
                CASE WHEN new_stat.fastest_time < stage_stat.fastest_time OR stage_stat.fastest_time < 0 
                THEN new_stat.fastest_time 
                ELSE stage_stat.fastest_time END;`;

    mysqlPool.query(query, [player_id, stage_id, is_solved, total_codes, stars, fastest_time], (error, result) => 
    {
        if (!result)
        {
            res.status(400).send({ error: true, message: "Failed to set stage statistic for player: " + player_id + ". Error: " + error.message });
        } 
        else 
        {
            res.status(200).send({ error: false, message: "Success to set stage statistic of:" + stage_id + ", for player: " + player_id });
        }
    });
});


// Get Stage Leaderboard
app.get("/stage_leaderboard", async (req, res) => 
{
    const player_id = req.query.player_id;
    const stage_id = req.query.stage_id;
    const limit = 50;
    
    const effectiveLeaderboardQuery = 
        `(SELECT RANK() OVER (ORDER BY st.total_codes ASC, st.fastest_time ASC) AS "rank", st.player_id, p.username, st.total_codes, st.fastest_time, st.stage_id 
        FROM stage_stat st INNER JOIN player p ON st.player_id = p.player_id
        WHERE st.stage_id = ?
        AND st.total_codes >= 0
        AND st.fastest_time >= 0 LIMIT ` + limit + `)
        UNION
        (SELECT * FROM (
            SELECT RANK() OVER (ORDER BY st.total_codes ASC, st.fastest_time ASC) AS "rank", st.player_id, p.username, st.total_codes, st.fastest_time, st.stage_id 
            FROM stage_stat st INNER JOIN player p ON st.player_id = p.player_id
            WHERE st.stage_id = ?
            AND st.total_codes >= 0
            AND st.fastest_time >= 0) sub
        WHERE player_id = ?)`;

    mysqlPool.query(effectiveLeaderboardQuery, [stage_id, stage_id, player_id], (error, result) => 
    {
        if (!result)
        {
            res.status(400).send({ error: true, message: "Failed to get leaderboard of stage:" + stage_id + ". Error: " + error.message });
        } 
        else 
        {
            res.status(200).send({ error: false, message: "Success to get leaderboard of stage:" + stage_id, leaderboard: result });
        }
    });
});

// Unlock skin
app.post("/unlock_skin", async (req, res) => 
{
    const player_id = req.query.player_id;
    const stage_id = req.query.stage_id;

    const query = 
        `INSERT INTO skin_ownership (player_id, skin_id, is_owned)
        SELECT ?, skin_id, 1
        FROM skin
        WHERE stage_id = ?`;
    
    const query2 = `SELECT * FROM skin WHERE stage_id = ?;`

    mysqlPool.query(query, [player_id, stage_id], (error, result) => 
    {
        if (!result) 
        {
            res.status(400).send({ error: true, message: "Failed to unlock skin for completing stage " + stage_id + " for player: " + player_id + ". Error: " + error.message });
        } else 
        {
            mysqlPool.query(query2, [stage_id], (error2, result2) => 
            {
                if (!result) 
                {
                    res.status(400).send({ error: true, message: "Failed to unlock skin for completing stage " + stage_id + " for player: " + player_id + ". Error: " + error2.message });
                } 
                else 
                {
                    res.status(200).send({ error: false, message: "Success to unlock skin for completing stage " + stage_id + " for player: " + player_id, unlocked_skin: result2[0] });
                }
            });
        }
    });
});

// Get skins
app.get("/skins", async (req, res) => 
{
    const player_id = req.query.player_id;

    const query = 
        `SELECT s.skin_id, s.stage_id, s.skin_name, s.skin_image, COALESCE(so.is_owned, 0) AS is_owned FROM skin s
        LEFT JOIN skin_ownership so ON s.skin_id = so.skin_id AND so.player_id = ?;`;

    mysqlPool.query(query, [player_id], (error, result) => 
    {
        if (!result) 
        {
            res.status(400).send({ error: true, message: "Failed to get list of skins for player: " + player_id + ". Error: " + error.message });
        } else 
        {
            res.status(200).send({ error: false, message: "Success to get list of skins for player: " + player_id, skins: result });
        }
    });
});


// Equip Skin
app.post("/equip_skin", async (req, res) => 
{
    const player_id = req.query.player_id;
    const skin_id = req.query.skin_id;

    const query = `UPDATE player SET equiped_skin = ? WHERE player_id = ?;`;

    mysqlPool.query(query, [skin_id, player_id], (error, result) => 
    {
        if (!result) 
        {
            res.status(400).send({ error: true, message: "Failed to equip skin " + skin_id + " for player: " + player_id + ". Error: " + error.message });
        } else 
        {
            res.status(200).send({ error: false, message: "Success to equip skin " + skin_id + " for player: " + player_id });
        }
    });
});


// Initiate the API app.
if (process.env.ENVIRONMENT === 'lambda') 
{
    module.exports.handler = serverless(app);
} 
else
{
    app.listen(localPort, () => 
    {
        console.log(`Codeplay API connected on port ${localPort}`);
    });
}