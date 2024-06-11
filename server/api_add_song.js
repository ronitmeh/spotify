//
// app.put('/add_song', async (req, res) => {...});
//
// Inserts a requested song and its information into the playlist and songs databases through Spotify API calls
//


const dbConnection = require("./database.js");
var request = require('request');

exports.add_song = async (req, res) => {
  console.log("call to /add_song");

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
    
//if playlist doesn't exist, sends back status 400
    if (response.length == 0) {
      res.status(400).json({
        message: "no such playlist...",
        song_id: -1,
      });
      return;
    }

    //turns title and artist into form to be placed into API call
    let title = data.song_title.replace(/ /g, '%2B');
    let artist = data.artist.replace(/ /g, '%2B')

    //gets the token through API call to Spotify
    var response2 = new Promise((resolve, reject) => {
      try {
    var client_id = '';
    var client_secret = '';

    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: {
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
    },
      form: {
      grant_type: 'client_credentials'
    },
      json: true
  };

  request.post(authOptions, function(error, response, body) {
    try {
      if (error) {
        reject(error);
        return;
      }

      resolve(body.access_token);
    } catch (code_err) {
      reject(code_err);
    }
  });

      } catch (code_err) {
        reject(code_err);
      }
    });

  token = await response2;

    //gets the track from Spotify API call
  var response3 = await fetch("https://api.spotify.com/v1/search?q=" + title + "&" + artist + "&type=track&limit=1", {
  headers: {Authorization: 'Bearer ' + token}});

  const test = await response3.json();
  
  //if the returned track doesn't match information provided by client, return 400 (Spotify API may not be able to find song with provided information)
  if (test['tracks']['items'][0]['artists'][0]["name"].toLowerCase() != data.artist.toLowerCase()) {
    res.status(400).json({
               message: "Song cannot be found through the API. Please select a different one.",
               song_id: -1,})
    return;
  }
  
    
  //gets song_id and popularity from Spotify API call  
  let song_id = test["tracks"]["items"][0]["id"];
  let popularity = test["tracks"]["items"][0]["popularity"];
  let real_song_name = test['tracks']['items'][0]['name'].toLowerCase()
  let real_song_artist = test['tracks']['items'][0]['artists'][0]["name"].toLowerCase()

    //inserts song_id into playlists database
    var response4 = new Promise((resolve, reject) => {
      try {
        var sql = `
          Insert into playlists(playlist_id, song_id) values(?, ?)`;

        let params = [data.play_id, song_id];

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

    //gets audio features from Spotify API call
    var response5 = fetch("https://api.spotify.com/v1/audio-features/" + song_id, {
  headers: {Authorization: 'Bearer ' + token}});

    //Promise.all audio features and playlist insert
    await Promise.all([response4, response5])
    .then((results) => {
      try {
        total_info = results[1].json()
      } catch (code_err) {
        res.status(400).json({
          message: code_err.message,
          song_id: -1,
        });
      }
    })
    .catch((err) => {

      res.status(400).json({
        message: err.message,
        song_id: -1,
      });
    });
  
  //gets the audio info from second API call
  song_stats = await total_info;

    //inserts song information into songs_database
    var response6 = new Promise((resolve, reject) => {
      try {
        var sql = `
          Insert into songs(song_id, song_name, artist_name, duration_ms, acousticness, danceability, energy, instrumentalness, loudness, popularity, pitch, speechiness) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

        let params = [song_id, real_song_name, real_song_artist, song_stats["duration_ms"], song_stats["acousticness"], song_stats["danceability"],song_stats["energy"], song_stats["instrumentalness"], song_stats["loudness"], popularity, song_stats['key'], song_stats['speechiness']];

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

    //returns success if worked, otherwise 400
    await Promise.all([response6])
    .then((results) => {
      try {
        res.json({
          message: "updated successfully",
          song_id: song_id
        })
      } catch (code_err) {
        res.status(400).json({
          message: code_err.message,
          song_id: -1,
        });
      }
    })
    .catch((err) => {
      res.status(400).json({
        message: err.message,
        song_id: -1,
      });
    });
    
  } catch (err) {
    //try
    console.log("**Error in call to PUT /add_song");
    console.log(err.message);

    res.status(400).json({
      message: err.message,
      song_id: -1,
    });
  } //catch
}; //post
