//
// app.get('/discover_daily', async (req, res) => {...});
//
//  Takes all the songs under that user's account and ranks them based on what is needed for each situation (high energy and popularity for a party, low loudness and energy for chill, etc.) The top 5 songs that have the best cumulative ranking (“points”), are then returned 
//
const dbConnection = require("./database.js");

//turns string to title case for printing
function titleCase(str) {
    str = str.toLowerCase().split(' ');
    for (let i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(' ');
}

//add "points" to a song based on its ranking of different factors. The higher the ranking a song has, the more points it gets
function calculateHighRanks(songs, property, dictionary) {
  var sortedSongs = [...songs].sort((a, b) => b[property] - a[property]);
  sortedSongs.forEach((song, index) => {
    var key = `${titleCase(song.song_name)} by ${titleCase(song.artist_name)}`;
    dictionary[key] += songs.length - index;
  });
  return dictionary;
}

//does the same as the above, except a lower ranking gets more points
function calculateLowRanks(songs, property, dictionary) {
  var sortedSongs = [...songs].sort((a, b) => a[property] - b[property]);
  sortedSongs.forEach((song, index) => {
    var key = `${titleCase(song.song_name)} by ${titleCase(song.artist_name)}`;
    dictionary[key] += songs.length - index; // Higher rank corresponds to higher number
  });
  return dictionary;
}

exports.discover_daily = async (req, res) => {
  console.log("call to get /discover_daily...");

  try {

    data = req.body;
    //checks for existence of user
    var r = await new Promise((resolve, reject) => {
      try {
        var sql = `
          Select * from users where user_id = ?;
          `;

        let params = [data.user_id];

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

    //if no user, send 400
    if (r.length == 0) {
      res.status(400).json({
        message: "no such user...",
        songs: -1,
      });
      return;
    }

    //collects all audio features for all songs associated with the user
      var response = await new Promise((resolve, reject) => {
        try {
          var sql = `
            Select song_name, artist_name, energy, danceability, loudness, instrumentalness, popularity, speechiness, duration_ms from songs INNER JOIN playlists on songs.song_id = playlists.song_id INNER JOIN user_playlists on user_playlists.playlist_id = playlists.playlist_id where user_id = ?;
            `;

          let params = [data.user_id];

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

    songs = await response;
    var songDictionary = {};

    // Populating the dictionary
    songs.forEach(song => {
      var key = `${titleCase(song.song_name)} by ${titleCase(song.artist_name)}`;
      songDictionary[key] = 0;
    });

    //different factors based on what situation the client inputted
    if (data.choice == 1) {
      // Calculate ranks for each property
      energy = calculateHighRanks(songs, 'energy', songDictionary);
      danceability = calculateHighRanks(songs, 'danceability', energy);
      final = calculateHighRanks(songs, 'popularity', danceability);
  }
    if (data.choice == 2) {
        // Calculate ranks for each property
        energy = calculateLowRanks(songs, 'energy', songDictionary);
        instrumentalness = calculateHighRanks(songs, 'instrumentalness', energy);
        final = calculateLowRanks(songs, 'speechiness', instrumentalness);
    }
    if (data.choice == 3) {
        // Calculate ranks for each property
        duration = calculateHighRanks(songs, 'duration_ms', songDictionary);
        energy = calculateLowRanks(songs, 'energy', duration);
        final = calculateLowRanks(songs, 'loudness', energy);
    }
    
//sorts all the songs by highest to lowest points
  var songArray = Object.entries(final);

  songArray.sort((a, b) => b[1] - a[1]);

//gets the 5 highest scoring songs
  if (songArray.length > 5) {
    songArray = songArray.slice(0,5);
  }

//sends back songs
  res.json({message: 'success', songs: songArray})

  } catch (err) {
    //try
    console.log("**Error in call to get /discover_daily");
    console.log(err.message);

    res.status(400).json({
      message: err.message,
      songs: [],
    });
  } //catch
}; //get
