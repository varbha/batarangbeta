// DEPENDENCIES
var r = require('rethinkdb');
var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var morgan = require('morgan');
var compression = require('compression');
var device = require('express-device');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/userdb');
var request = require('request');
var lang_code = require('./lang_codes.js');
const adminP = require('./adminpasswords');



// MIDDLEWARE
app.use(compression());
app.use(morgan('dev'));
app.use(device.capture());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

//---------------------------------------------------------------------------------------------
// Setup MongoDB connection
var Schema = mongoose.Schema;

var userSchema = new Schema({
  user: { type: String, required: true, unique: true },
  emailid: String,
  password: { type: String, required: true },
  rooms: [String]
});
// Creating the user model (collection: users)
var User = mongoose.model('User', userSchema);
//------------------------------------------------------------------------------------------------

var roomSchema = new Schema({
  roomNo: { type: String, required: true, unique: true },
  lastModifiedBy: String,
  roomDesc: String,
  admin: String,
  access: String,
  commit1: String,
  commit2: String,
  commit3: String
});
// Creating room model (for keeping track of active rooms)
var Room = mongoose.model('Room', roomSchema);
//-------------------------------------------------------------------------------------------------
/*var dummyRoom = new Room({
  rooms : []
});*/
/*dummyRoom.save(function(err){
  if(err)console.log(err);
  else{
    console.log("DUMMY ROOM CREATED");
  }
});*/
//----------------------------------------------------------------------------------------------

// Setup RethinkDB Database
// ALL OPERATIONS REQUIRING RETHINKDB TO BE ADDED IN THIS BLOCK
//-----------------------------------------------------------------------------------------------
r.connect({ host: 'localhost', port: 28015 }, function (err, conn) {
  if (err) throw err;
  r.db('test').tableList().run(conn, function (err, response) {
    if (response.indexOf('edit') > -1) {
      console.log('GENERATING DATA FROM EXISTING TABLE');
      console.log('TABLE - ' + response);
    } else {

      console.log('CREATING NEW TABLE');
      r.db('test').tableCreate('edit').run(conn);
    }
  }); // table instantiated: table is now live and running

  //-------------------------------------------------------------------------------------
  // Socket (within RethinkDB instantiation)
  io.on('connection', function (socket) {
    console.log('NEW USER - CONNECTED');
    socket.on('disconnect', function () {
      console.log('USER DISCONNECTED');
    });

    // socket emits even 'document-update' from client, this method handles it
    socket.on('document-update', function (msg) {
      console.log(msg);
      // TEST CODE FOR LAST EDIT BY:
      Room.findOneAndUpdate({
        roomNo: msg.id
      },
        {
          lastModifiedBy: msg.user
        }).then(modifiedRoom => {
          if (!modifiedRoom) {
            console.log("CANT FIND ROOM TO UPDATE");
          }
          else {
            console.log("ROOM LASTMODIFIEDBY VALUE UPDATED WITH USER " + msg.user);
          }
        }).catch(error => {
          console.log("DB ERROR IN UPDATING LAST MODIFIED BY VALUE");
        });
      // insert data into the table (conflict:update is for new entries)
      r.table('edit').insert({ id: msg.id, value: msg.value, user: msg.user }, { conflict: "update" }).run(conn, function (err, res) {
        if (err) throw err;
      }); // table edited
    }); // socket function ends

    socket.on('global-compile', function(roomNumber){
      console.log("GLOBAL COMPILE");
      io.emit('compile-now', roomNumber);
      console.log("EMITTED");
    });

    r.table('edit').changes().run(conn, function (err, cursor) {
      if (err) throw err;
      cursor.each(function (err, row) {
        if (err) throw err;
        io.emit('doc', row); // sends data back to the client; each row of the cursor
      }); // database querying ends
    }); // database changes() function ends

  }); // main io (socket) connection ends.
  //-----------------------------------------------------------------------------------

  //-----------------------------------------------------------------------------------
  // main API for fetching data to populate the room when logged in
  app.get('/getData/:id', function (req, res, next) {
    // open database get() function
    r.table('edit').get(req.params.id).
      run(conn, function (err, result) {
        if (err) throw err;
        res.send(result);
        //return next(result);
      });
  }); // app.get() ends
  //----------------------------------------------------------------------------------

}); // rethinkdb block ends (cant access rethinkdb outside this block)
//-----------------------------------------------------------------------------------------------------


// HTML static pages
// DASHBOARD
/*io.on('connection', function(socket){
      console.log("IO.CONNECTION INNER");
      socket.on('disconnect', function(){
        console.log('USER DISCONNECTED INNER INNER');
    });
      /*console.log("SENDING EVENT UPDATEROOM LIST")
      io.emit('updateRoomList', {reply: 'NR'});
      console.log("SENT EVENT UPDATEROOM LIST")
});*/


app.get('/dashboard', function (req, res) {
  var name = req.query.name;
  res.sendFile(__dirname + '/satejDashboard.html');
  console.log("---------------------------------------------");
  console.log("USER NAME:" + name + "\nDASHBOARD DISPLAYED");
  console.log("---------------------------------------------");
});

// FOR GETTING DETAILS OF A PARTICULAR USER
app.post('/user', function (req, res) {
  var u = req.body.url;
  var i = u.indexOf('=');
  var user_name = u.substr(i + 1);
  console.log("---------------------------------------------");
  console.log("RECIEVED /USER AJAX GET REQUEST FOR USER:" + user_name);
  console.log("RETRIEVING FROM MONGODB");
  User.find({ user: user_name }, 'rooms emailid user', function (err, result) {
    if (err) console.log(err);
    else if (result) {res.send(result); console.log(result)}
    else if (!result) res.redirect('/');
  });
  console.log("---------------------------------------------");
});

// CREATE ROOM (NEW LOGIC)
app.post('/testCreateRoom', function (req, res) {

  Room.findOne({
    roomNo: req.body.room
  }).then(roomResult => {
    if (!roomResult) {
      console.log("-------------------------------------------");
      console.log("COULD NOT FIND EXISTING ROOM WITH ROOMNO: " + req.body.room);
      console.log("EXTRACTING USERNAME");
      var u = req.body.url;
      var i = u.indexOf('=');
      var user_name = u.substr(i + 1);
      User.findOne({
        user: user_name
      }).then(userResult => {
        if (!userResult) {
          res.json({ sucess: false, reply: "USER NOT EXIST" });
          return;
        }
        else {
          User.findOneAndUpdate({
            user: user_name
          },
            {
              $push: { rooms: req.body.room }
            }).then(updatedUser => {
              if (updatedUser != null) {
                console.log("---------------------------------------------");
                console.log("ADDED NEW ROOM: " + req.body.room + " TO USER: " + user_name);
                var newRoom = new Room({
                  roomNo: req.body.room,
                  lastModifiedBy: '',
                  roomDesc: req.body.roomDesc,
                  access: req.body.access,
                  admin: user_name,
                  commit1: null,
                  commit2: null,
                  commit3: null
                });
                newRoom.save(function (err) {
                  if (err) console.log(err);
                  else {
                    console.log("NEW ROOMNO: " + req.body.room + " ADDED TO ROOMS");
                    res.json({ success: true, reply: "DONE", roomNo: req.body.room });
                    return;
                  }
                });
              }
            }).catch(error => {
              console.log("DB ERROR IN USER-FIND ONE AND UPDATE");
            });
        }
      }).catch(error => {
        console.log("DB ERROR IN CHECKING USER EXISTENCE");
      });
    }
    else {
      console.log("-------------------------------------------");
      console.log("ALEADY HAVE EXISTING ROOM WITH ROOMNO: " + req.body.room);
      res.json({ sucess: false, reply: "EXISTING ROOM" });
      return;
    }
  }).catch(error => {
    console.log("DB ERROR IN FINDING EXISTING ROOM");
  });
});

// JOIN ROOM LOGIC
app.post('/testJoinRoom', (req, res) => {
  console.log("---------------------------------------------");
  console.log("REQUEST TO JOIN ROOM:" + req.body.room);
  Room.findOne({
    roomNo: req.body.room
  }).then(roomFound => {
    if (!roomFound) {
      console.log("---------------------------------------------");
      console.log("REQUESTED ROOM TO JOIN DOES NOT EXIST");
      res.json({ success: false, reply: "INVALID ROOM" });
      return;
    }
    else {
      console.log("---------------------------------------------");
      console.log("VALID ROOM REQUESTED");
      User.findOneAndUpdate({
        user: req.body.username
      },
        {
          $push: { rooms: req.body.room }
        }).then(userUpdated => {
          if (!userUpdated) {
            console.log("---------------------------------------------");
            console.log("USER COULD NOT BE FOUND");
            console.log("USER NAME PASSED: " + req.body.username);
          }
          else {
            console.log("---------------------------------------------");
            console.log("USER: " + req.body.username + " ROOMS ARRAY UPDATED WITH ROOMNO: " + req.body.room);
            res.json({ success: true, reply: "UPDATED", room: req.body.room });
            return;
          }
        }).catch(error => {
          console.log("DB ERROR WHILE FETCHING AND UPDATING USER");
        });
    }
  }).catch(error => {
    console.log("DB ERROR IN FINDING ROOM TO JOIN");
  });
});


// EXIT ROOM LOGIC
app.post('/exitRoom', (req, res) => {
  User.findOneAndUpdate({
    user: req.body.user
  },
    {
      $pull: { rooms: req.body.roomNo }
    }).then(result => {
      if (result) {
        console.log("REMOVED ROOM NO: " + req.body.roomNo + " FROM USER: " + req.body.user);
        res.json({ success: true, reply: "DONE" });
        // now check is anyone else is a part of the room
        User.find({
          rooms: req.body.roomNo
        }).then(isThereAnyUser => {
          console.log(isThereAnyUser.length);
          if (isThereAnyUser.length == 0) {

            Room.findOne({
              roomNo: req.body.roomNo
            }).then(returnedRooms => {
              console.log(returnedRooms);

              if (returnedRooms) {
                console.log("ROOM NO: " + req.body.roomNo + "NEEDS TO BE DELETED");
                Room.remove({
                  roomNo: req.body.roomNo
                }).then(deletedRoom => {
                  console.log(deletedRoom);
                  if (deletedRoom) {
                    console.log("ROOM HAS BEEN DELETED");
                    r.connect({ host: 'localhost', port: 28015 }, function (err, conn) {
                      if (err) throw err;
                      r.table('edit').filter({ id: req.body.roomNo }).delete().run(conn, function (err, res) {
                        console.log("AFFECTED RETHINKDB DATA");
                      }).catch(err => {
                        console.log("ERROR ACCESSING RETHINKDB");
                      });
                    });

                  }
                  else {
                    console.log("ROOM COULD NOT BE DELETED");
                  }
                });
              }
            });
          }
          else {
            console.log("THERE ARE OTHER USERS WITH THIS ROOM: " + req.body.roomNo);
            //console.log(r);
          }
        });

      }
    });
});

app.post('/clearCommit', (req, res) => {
  let roomNoToUpdate = req.body.roomNo;
  let index = req.body.index;
  let commit_index = 'commit' + index;
  Room.findOneAndUpdate({
    roomNo: roomNoToUpdate
  },
    {
      [commit_index]: null
    }).then(modifiedRoom => {
      if (modifiedRoom) {
        console.log("ROOM MODIFIED");
        console.log(modifiedRoom);
        res.json({ "reply": "success" });
      }
      else {
        console.log("ROOM NOT MODIFED");
        res.json({ "reply": "fail" });
      }

    });
});


app.post('/getUsersOfRoom', (req, res) => {
  console.log("-------------------------------------------");
  console.log("ACCESSING USERS FOR ROOM NO: ", req.body.roomNo);

  User.find(
    {},
    { _id: 0, rooms: 1, user: 1 }
  ).then(returnedUser => {
    if (returnedUser) {
      console.log("SENDING USER DATA");
      console.log(returnedUser);
      res.json({ "reply": "success", "userdata": returnedUser });

    }
  }).catch(err => {
    console.log("DB ERROR IN ACCESSING USER DATA");
    res.json({ "reply": "fail" });
  });
});


// SIGNUP AND REGISTERATION LOGIC
app.post('/signup', (req, res) => {
  console.log("---------------------------------------------");
  console.log("ENTERING USER DETAILS IN MONGODB");
  var newUser = new User({
    user: req.body.username,
    emailid: req.body.email,
    password: req.body.password,
    rooms: []
  });

  newUser.save(function (err) {
    console.log("---------------------------------------------");
    if (err) { console.log(err); res.redirect('/'); }
    else {
      console.log("USER CREATED: " + newUser.user);
      redirection = '/dashboard?name=' + req.body.username;
      res.redirect(redirection);
    }
    console.log("---------------------------------------------");
  });
});
//----------------------------------------------

// SIGN IN LOGIC
app.post('/signinCheck', function (req, res) {

  console.log(req.body);

  User.count({ user: req.body.username, password: req.body.password }, function (err, count) {
    console.log("---------------------------------------------");
    if (err) console.log(err);
    else {
      if (count == 1) {

        console.log("---------------------------------------------");
        console.log("VALIDATION APPROVED FOR: " + req.body.username)
        redirection = '/dashboard?name=' + req.body.username;
        res.redirect(redirection);

      }
      else {
        res.redirect('/');
      }
    }
  });
});



// COMPILATION
app.post('/compile', function (req, res) {
  console.log("---------------------------------------------");
  console.log("recieved compilation request")
  console.log(req.body)
  console.log("---------------------------------------------");
  var code = req.body.code;
  var lang = req.body.lang;
  var stdin = req.body.stdin;
  let id;
  var x;

  for (x in lang_code) {

    if (lang == x) {
      id = lang_code[x];
      break;
    }
  }
  console.log(id);

  //console.log(code);
  //#################################################################
  // TODO:
  //NEED LOGIC TO MAKE " INTO \"
  //let esc_code = code.replace(new RegExp('"','g'),"\"");
  //res.send("thanks for code")

  var data_compile = {
    "source_code": req.body.code,
    "language_id": id,
    "number_of_runs": "1",
    "stdin": req.body.stdin,
    "expected_output": null,
    "cpu_time_limit": "2",
    "cpu_extra_time": "0.5",
    "wall_time_limit": "5",
    "memory_limit": "128000",
    "stack_limit": "64000",
    "max_processes_and_or_threads": "30",
    "enable_per_process_and_thread_time_limit": false,
    "enable_per_process_and_thread_memory_limit": true,
    "max_file_size": "1024"
  };
  console.log("Data packed into:", data_compile);
  console.log("----------------------------------------------");
  const options = {
    uri: ' https://api.judge0.com/submissions',
    qs: {
      wait: true
    },
    method: 'POST',
    body: data_compile,
    json: true
  };
  request(options, function (err, resp, body) {
    //console.log(resp);
    console.log("Response body from Judge0", resp.body);
    res.send(resp.body);

  });
  console.log("Testing async here");
  console.log("------------------------------------------------");

});

app.post('/commitCode', (req, res) => {
  console.log("------------------------------------------------");
  console.log("RECIEVED COMMIT REQEUEST");
  Room.findOne({
    roomNo: req.body.room
  },
    {
      _id: 0,
      commit1: 1,
      commit2: 1,
      commit3: 1
    }).then(ret_room => {
      if (ret_room) {
        console.log(ret_room);
        let commit_to_check = 'commit' + req.body.commit;
        console.log(commit_to_check);
        var iter = { commit1: 'commit1', commit2: 'commit2', commit3: 'commit3' };
        for (commit in iter) {
          if (commit_to_check == commit) {
            Room.findOneAndUpdate({
              roomNo: req.body.room
            },
              {
                [commit_to_check]: req.body.code
              },
              { returnNewDocument: true }
            ).then(succ => {
              if (succ) {
                console.log("UPDATED COMMIT");
                //console.log(succ);
                res.json({ reply: "success", data: succ });
              };
            });
            break;
          }
        }
      }
      else {
        console.log(ret_room);
        res.json({ reply: "invalid" });
      }
    });

});


app.post('/getCommits', (req, res) => {
  console.log("-------------------------------------------");
  console.log("COMMIT HISTORY PATH");
  Room.findOne({
    roomNo: req.body.room
  },
    {
      _id: 0,
      commit1: 1,
      commit2: 1,
      commit3: 1
    }).then(commits => {
      if (commits) {
        console.log(commits);
        res.json({ "reply": commits });
      }
      else {
        res.json({ "reply": "Invalid" })
      }
    }).catch(err => {
      console.log(err);
      res.json({ "reply": "FAIL" });
    });
});
//----------------------------------------------

// HOMEPAGE
app.get('/', function (req, res) {
  if (req.device.type === 'phone') {
    console.log("---------------------------------------------");
    console.log("phone");
    console.log("---------------------------------------------");
    // MOBILE HOME PAGE
    res.sendFile(__dirname + '/mobile-home.html');
  }
  else {
    console.log("---------------------------------------------");
    console.log("desktop");
    console.log("---------------------------------------------");
    // DESKTOP HOME PAGE
    res.sendFile(__dirname + '/home-page.html');
  }

}); //app.get('/') ends
//----------------------------------------------

// CODE EDITING PAGE
app.get('/edit', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});
//----------------------------------------------

// REGISTERATION PAGE
app.get('/register', function (req, res) {
  res.sendFile(__dirname + '/register.html');
});
//---------------------------------------------

// SIGNIN PAGE
app.get('/signin', function (req, res) {
  res.sendFile(__dirname + '/signin.html');
});
//----------------------------------------------



/*
*****************************
*****************************
*****************************
*/





// EASTER EGG PAGE
app.get('/secret', function (req, res) {
  res.sendFile(__dirname + '/secret.html');
});
//----------------------------------------------
app.post('/query/', function (req, res) {
  console.log("---------------------------------------------");
  console.log(req.body);
  console.log("---------------------------------------------");
  res.send("thanks for the query");
});

app.post('/getRooms', (req, res) => {
  Room.find({}).then(returnedData => {
    res.json(returnedData);
  });
});


app.post('/getRethink', (req, res) => {

  r.connect({ host: 'localhost', port: 28015 }, function (err, conn) {
    if (err) throw err;
    r.table('edit').run(conn, function (err, cursor) {
      if (err) throw err;
      cursor.toArray(function (err, result) {
        if (err) throw err;
        console.log(JSON.stringify(result, null, 2));
      });
    });
  });

});

app.post('/deleteRoomData', (req, res) => {

  r.connect({ host: 'localhost', port: 28015 }, function (err, conn) {
    if (err) throw err;
    r.table('edit').delete().run(conn, function (err, res) {
      console.log("DELETED RETHINKDB DATA");
      //res.send({"reply":"done"});
    }).catch(err => {
      console.log("ERROR ACCESSING RETHINKDB");
    });
  });

});
// ---------------------------------------------------------------------------------
//----------------------------------------------------------------------------------

//admin functions

app.post('/admin/:pass/deleteRoom/:roomNo', (req,res)=>{
  let pass = req.params.pass;
  console.log("admin request recieved");
  if (pass == adminP.p01 || pass == adminP.p02){
    //res.send("correct password");
    console.log("Admin access allowed");
    res.sendFile(__dirname + '/adminPage.html');
  }
  else{
    res.send("incorrect password");
  }


});
app.use('/bower_components', express.static('bower_components'));

// Setup Express Listener
http.listen(9000, '0.0.0.0', function () {
  console.log('listening on: 0.0.0.0:9000');
});
