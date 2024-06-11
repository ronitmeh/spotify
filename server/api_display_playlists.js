//
// app.get('/display_playlists', async (req, res) => {...});
//
// Return all the playlists information from the database:
//
const dbConnection = require("./database.js");

exports.display_playlist = async (req, res) => {
  console.log("call to get /display_playlists...");

  try {
    //gets all general playlist and user information from the database
    let sql = "Select playlist_id, playlist_name, first_name, last_name, first_name, user_playlists.user_id, username From user_playlists INNER JOIN users on user_playlists.user_id = users.user_id Order By playlist_id;";

    var params = [];

    dbConnection.query(sql, params, (err, rows) => {
      if (err) {
        res.status(400).json({ message: err.message, data: [] });
        return;
      }
      res.json({ message: "success", data: rows });
    });
    
  } catch (err) {
    //try
    console.log("**Error in call to get /display_playlists");
    console.log(err.message);

    //sends back information
    res.status(400).json({
      message: err.message,
      data: [],
    });
  } //catch
}; //get
