//
// app.get('/display_singular_playlists', async (req, res) => {...});
//
// Return a playlists information (name, artist, song length, playlist length, song_count)

const dbConnection = require("./database.js");

exports.display_play = async (req, res) => {
  console.log("call to get /display_singular_playlist...");

  try {
    
    data = req.body;

    //checks for existence of playlist
    var response = await new Promise((resolve, reject) => {
      try {
        var sql = `
          Select * from user_playlists where playlist_id = ?;
          `;

        let params = [data.play_id];

        dbConnection.query(sql, params, (err, results, _) => {
          try {
            if (err) {
              reject(err);
              return;
            }

            resolve(results);
          } catch (code_err) {
            reject(code_err);
          }
        });
      } catch (code_err) {
        reject(code_err);
      }
    });

    //if playlist doesn't exist, send back status 400
    if (response.length == 0) {
      res.status(400).json({
        message: "no such playlist...",
        data: [],
      });
      return;
    }

    //get all information about the playlist from database
    let s = "select playlist_name from user_playlists where playlist_id = ?; select song_name, artist_name, duration_ms, danceability, popularity, energy from songs INNER JOIN playlists on songs.song_id = playlists.song_id where playlist_id = ?; select sum(duration_ms), count(distinct(artist_name)) from songs INNER JOIN playlists on songs.song_id = playlists.song_id where playlist_id = ?;";

    var p = [data.play_id, data.play_id, data.play_id];

    dbConnection.query(s, p, (err, rows) => {
      if (err) {
        res.status(400).json({ message: err.message, data: [] });
        return;
      }


      

      //turns millisecond duration for each song into the form (minutes:seconds)
      function formatMilliseconds(milliseconds) {
        var totalSeconds = Math.floor(milliseconds / 1000);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;
        var formattedSeconds = (seconds < 10 ? '0' : '') + seconds;
        return minutes + ':' + formattedSeconds;
      }

      for (let i = 0; i < rows[1].length; i++) {
        rows[1][i].duration_ms = formatMilliseconds(rows[1][i].duration_ms);
      }


      

      //turns sum of duration_ms for playlist into a total with the form X hours Y minutes
      var total_seconds = Math.floor(rows[2][0]["sum(duration_ms)"] / 1000);
      var total_hours = Math.floor(total_seconds / 3600);
      total_seconds = total_seconds % 3600;
      
      var total_minutes = Math.floor(total_seconds / 60);

      rows[2][0]["sum(duration_ms)"] = [total_hours, total_minutes]


      const danceWeights = 0.3;
      const energyWeights = 0.3;
      //less diversity with more popularity
      const popWeights = -0.7;
      let diversityIndex = 0;

      // Calculate the diversity index for each song
      for (let i = 0; i < rows[1].length; i++) {
        diversityIndex += danceWeights * rows[1][i].danceability + energyWeights * rows[1][i].energy + popWeights * (rows[1][i].popularity / 10)
      }

      //much more weight on amount of different artists
      diversityIndex /= rows[1].length;
      diversityIndex += (rows[2][0]["count(distinct(artist_name))"] * 25) / rows[1].length;


      
      //send data to client
      res.json({ message: "success", data: rows, dI: diversityIndex.toFixed(2)});
    }); 
    
  } catch (err) {
    //try
    console.log("**Error in call to get /display_singular_playlist");
    console.log(err.message);

    res.status(400).json({
      message: err.message,
      data: [],
    });
  } //catch
}; //get
