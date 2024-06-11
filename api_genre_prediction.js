//
// app.get('/predict_genre', async (req, res) => {...});
//
// Predicts which genre a playlist is, based on a brain.js neural network algorithm and training data from the training_songs database
//



const brain = require('brain.js');
const dbConnection = require("./database.js");

//helper function to get the final genre prediction from list of probabilities returned from brain.js
function findMaxCategory(probabilities) {
genres = {rap: 0 , pop: 0, rock:0, 'r&b' :0, country:0}
 //find the genre with the highest probability
    for (let i = 0; i < probabilities.length; i++) {
      num = 0;
      val = '';
      for (const [key, value] of Object.entries(probabilities[i])) {
          if (value > num) {
              num = value;
              val = key;
          }
         }
      genres[val] += 1;
   }
    //find the genre with the highest count of predictions
    n = 0;
    fin = '';
      for (const [key, value] of Object.entries(genres)) {
          if (value > n) {
              n = value;
              fin = key;
          }
         }
    return fin;
}
          

exports.get_genre_prediction = async (req, res) => {
    console.log('call to get /predict_genre...');
    try {
        const data = req.body;

        //checks for existence of playlist
        const playlists = await new Promise((resolve, reject) => {
            const sql = `Select * from user_playlists where playlist_id = ?;`;
            const params = [data.play_id];
            dbConnection.query(sql, params, (err, results, _) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        //if playlist does not exist, return with status 400
        if (playlists.length === 0) {
            return res.status(400).json({
                message: "No such playlist...",
                data: [],
            });
        }

        //gets the song information for songs from the training_songs database
        const songs = new Promise((resolve, reject) => {
            const sql = "Select round(acousticness,3), round(danceability,3), round(energy,3), round(instrumentalness,3), abs(round(loudness,3)), round(popularity,3), round(speechiness,3), round(duration_ms,3), pitch, genre from training_songs where genre != 'pop';";
            dbConnection.query(sql, (err, results, _) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        //get the song_information for songs from songs
        const playlistSongs = new Promise((resolve, reject) => {
            const sql = `Select round(acousticness,3), round(danceability,3), round(energy,3), round(instrumentalness,3), abs(round(loudness,3)), round(popularity,3), round(speechiness,3), round(duration_ms,3), pitch from songs Inner Join playlists on songs.song_id = playlists.song_id where playlist_id = ?;`;
            const params = [data.play_id];
            dbConnection.query(sql, params, (err, results, _) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        //Promise.all to get all the song information
        await Promise.all([songs, playlistSongs]).then((results) => {
            const songs2 = results[0];
            const playlistSongs2 = results[1];

            const trainingData = [];

            //creates training data for brain.js from training_songs
            for (let i = 0; i < (Math.floor(songs2.length / 30)); i++){
                trainingData.push({input: 
{acousticness: songs2[i]["round(acousticness,3)"], 
danceability: songs2[i]["round(danceability,3)"], 
energy: songs2[i]["round(energy,3)"],
instrumentalness: songs2[i]["round(instrumentalness,3)"],
loudness: songs2[i]["abs(round(loudness,3))"] / 100,
popularity: songs2[i]["round(popularity,3)"] / 10,
speechiness: songs2[i]["round(speechiness,3)"],  
pitch: songs2[i]["pitch"] / 100}, 
output: {[songs2[i]["genre"]]: 1}})
            }

            //create neural network with brain.js
            const net = new brain.NeuralNetwork({learningRate: 0.1, activation: 'sigmoid',});
            net.train(trainingData);
            const output_data = [];

            //runs algorithm on song information from playlist
            for (let j = 0; j < playlistSongs2.length; j++) {
                output_data.push(net.run(
{acousticness: playlistSongs2[j]["round(acousticness,3)"], 
 danceability: playlistSongs2[j]["round(danceability,3)"], 
 energy: playlistSongs2[j]["round(energy,3)"],
 instrumentalness: playlistSongs2[j]["round(instrumentalness,3)"],
 loudness: playlistSongs2[j]["abs(round(loudness,3))"] / 100,
 popularity: playlistSongs2[j]["round(popularity,3)"] / 10,
 speechiness: playlistSongs2[j]["round(speechiness,3)"], 
 pitch: playlistSongs2[j]["pitch"] / 100}))
            }

            //finds the final genre prediction
            res.status(200).json({
                message: "success",
                data: findMaxCategory(output_data)
            })
        });

        
    } catch (err) {
        console.error("Error in call to get /predict_genre:", err.message);
        res.status(400).json({
            message: err.message,
            prediction: [],
        });
    }
};
