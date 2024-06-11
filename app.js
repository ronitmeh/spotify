//
// Express js (and node.js) web service that interacts with 
// AWS S3 and RDS to provide clients data for building a 
// simple photo application for photo storage and viewing.
//
// Project 02 for CS 310.
//
// Authors:
//  Ronit
//  Prof. Joe Hummel (initial template)
//  Northwestern University
//  CS 310
//
// References:
// Node.js: 
//   https://nodejs.org/
// Express: 
//   https://expressjs.com/
// MySQL: 
//   https://expressjs.com/en/guide/database-integration.html#mysql
//   https://github.com/mysqljs/mysql
// AWS SDK with JS:
//   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html
//   https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started-nodejs.html
//   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
//   https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
//

const express = require('express');
const app = express();
const config = require('./config.js');

const dbConnection = require('./database.js')

// support larger image uploads/downloads:
app.use(express.json({ strict: false, limit: "50mb" }));

var startTime;

app.listen(config.service_port, () => {
  startTime = Date.now();
  console.log('web service running...');
  //
  // Configure AWS to use our config file:
  //
  process.env.AWS_SHARED_CREDENTIALS_FILE = config.photoapp_config;
});

app.get('/', (req, res) => {
  try {
    console.log("call to /...");
    
    var uptime = Math.round((Date.now() - startTime) / 1000);

    res.json({
      "status": "running",
      "uptime-in-secs": uptime,
      "dbConnection": dbConnection.state
    });
  }
  catch(err) {
    console.log("**Error in call to /");
    console.log(err.message);

    res.status(400).json(err.message);
  }
});

//
// service functions:
//
var gen = require('./api_genre_prediction.js');
var display = require('./api_display_playlists.js');
var add_s = require('./api_add_song.js');
var dsp = require('./api_display_singular_playlist.js');
var user = require('./api_user.js');
var add_p = require('./api_add_playlist.js');
var preview = require('./api_preview_playlist.js');
var discover = require('./api_discover_daily.js');

app.get('/display_playlists', display.display_playlist);   
app.get('/display_singular_playlist', dsp.display_play);  
app.get('/predict_genre', gen.get_genre_prediction);  
app.get('/preview_playlist', preview.get_songs);

app.put('/user', user.put_user);
app.put('/add_song', add_s.add_song);
app.put('/add_playlist', add_p.add_playlist);
app.get('/discover_daily', discover.discover_daily);

