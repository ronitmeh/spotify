//
// app.get('/preview_playlist', async (req, res) => {...});
//
// Returns mp3 urls for songs in the playlist, which will then be chosen by client to play for 15 seconds
//
const dbConnection = require("./database.js");
var request = require('request');

exports.get_songs = async (req, res) => {
  console.log("call to get /preview_playlist...");

  try {

    data = req.body;


    //check for existence of playlist_id
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

    //if playlist doesn't exist, return with status 400
    if (response.length == 0) {
      res.status(400).json({
        message: "no such playlist...",
        data: {},
      });
      return;
    }


    //if playlist exists, get songs from playlist
     var response2 = new Promise((resolve, reject) => {
       try {
         var sql = `
           Select song_id from playlists where playlist_id = ?;
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

    //get token for Spotify API
    var response3 = new Promise((resolve, reject) => {
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


    //Promise.all which awaits for songs from playlist and token for API
  await Promise.all([response2,response3]).then((results) => {
    try {
      //gets all the song_id for the songs in the playlist
      song_ids = results[0].map(x => x.song_id).join(",")
      token = results[1]
    } catch (code_err) {
      res.status(400).json({
        message: code_err.message,
        data: {},
      });
    }
  })

    //Get mp3 urls for songs in playlist
     var response4 = await fetch("https://api.spotify.com/v1/tracks?ids=" + song_ids, {
      headers: {Authorization: 'Bearer ' + token}});

    //API return to json
      const test = await response4.json();

    //gets names and urls from API response
    const names = test.tracks.map(x => x.name)  
    const urls = test.tracks.map(x => x.preview_url)

    //check whether all the urls are none
    var x = 0;
    for (let k = 0; k < urls.length; k++) {
      if (urls[k] != null){
        x = 1;
        break;
      }
    }

    //if urls are none, return 400
    if (x == 0){
      res.status(400).json({
        message: 'no previews available',
        urls: [],
      });
    }

    //all good, send the urls
    res.json({
      message: "success",
      data: {
        names: names,
        urls: urls
      }
    })
      

  } catch (err) {
    //try
    console.log("**Error in call to get /preview_playlist");
    console.log(err.message);

    res.status(400).json({
      message: err.message,
      urls: [],
    });
  } //catch
}; //get
