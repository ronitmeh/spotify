//
// app.put('/add_playlist', async (req, res) => {...});
//
// Inserts a new playlist into the database, with an associated user and name


const dbConnection = require("./database.js");

exports.add_playlist = async (req, res) => {
  console.log("call to put /add_playlist...");

  try {
    var data = req.body; // data => JS object

    //checks for existence of user
    var response = await new Promise((resolve, reject) => {
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
    if (response.length == 0) {
      res.status(400).json({
        message: "no such user...",
        playlist_id: -1,
      });
      return;
    }

    //inserts new playlist into database
    var response2 = new Promise((resolve, reject) => {
      try {
        var sql = `
          Insert into user_playlists (user_id, playlist_name) values (?, ?);
          `;

        let params = [data.user_id, data.playlist_name];

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

    //returns playlist_id in res.json()
    await Promise.all([response2])
    .then((results) => {
      try {
        res.json({
          message: "inserted",
          playlist_id: results[0].insertId,
        });
      } catch (code_err) {
        res.status(400).json({
          message: code_err.message,
          playlist_id: -1,
        });
      }
    })
    .catch((err) => {
      //
      // we get here if calls to S3 or RDS failed, or we
      // failed to process the results properly:
      //
      res.status(400).json({
        message: err.message,
        playlist_id: -1,
      });
    });
    

  } catch (err) {
    //try
    console.log("**Error in call to put /add_playlist");
    console.log(err.message);

    res.status(400).json({
      message: err.message,
      playlist_id: -1,
    });
  } //catch
}; //put
