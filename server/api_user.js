//
// app.put('/user', async (req, res) => {...});
//
// Inserts a new user into the database, or if the
// user already exists (based on username) then the
// user's data is updated (name).
// Returns the user's userid in the database.
//
const dbConnection = require("./database.js");

exports.put_user = async (req, res) => {
  console.log("call to put /user...");

  try {
    var data = req.body; // data => JS object

    //checks for existence of username
    var response = await new Promise((resolve, reject) => {
      try {
        var sql = `
          Select * from users where username = ?;
          `;

        let params = [data.username];

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

    //if username doesn't exist, insert new user
    if (response.length == 0) {
      console.log("user not found, inserting...");
      var insert_response = new Promise((resolve, reject) => {
        try {
          var s = `
            Insert into users(last_name, first_name, username) values(?,?,?)
            `;

          let p = [data.lastname, data.firstname, data.username];

          dbConnection.query(s, p, (err, results, _) => {
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

//returned userid when inserted
    await Promise.all([insert_response])
      .then((results) => {
        try {
          res.json({ message: "inserted", userid: results[0].insertId });
        } catch (code_err) {
          res.status(400).json({
            message: code_err.message,
            userid: -1,
          });
        }
      })
      .catch((err) => {
        res.status(400).json({
          message: err.message,
          userid: -1,
        });
      });
  } else {
      //if username in database, updates user information
    console.log('updating user...')
    var update_response = new Promise((resolve, reject) => {
      try {
        var sq = `
          update users set last_name = ?, first_name = ? where username = ?;
          select user_id from users where username = ?;
          `;

        let pa = [data.lastname, data.firstname, data.username, data.username];

        dbConnection.query(sq, pa, (err, results, _) => {
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

//returns message updated and user id
    await Promise.all([update_response])
    .then((results) => {
      try {
        res.json({
          message: "updated",
          userid: results[0][1][0].user_id,
        });
      } catch (code_err) {
        res.status(400).json({
          message: code_err.message,
          userid: -1,
        });
      }
    })
    .catch((err) => {
      res.status(400).json({
        message: err.message,
        userid: -1,
      });
    });
  }
    
  } catch (err) {
    //try
    console.log("**Error in call to put /user");
    console.log(err.message);

    res.status(400).json({
      message: err.message,
      userid: -1,
    });
  } //catch
}; //put
