const express = require('express');
const cors = require('cors');
const app = express();
const server = require('http').createServer(app);
const io = require("socket.io")(server);
const sanitizer = require('sanitize')();

const path = require('path');
const bodyParser = require('body-parser');

const RoomManager = require('./src/models/Rooms/RoomManager');
const Room = require('./src/models/Rooms/Room');
const {WebError, errorHandler} = require('./src/controllers/ErrorController');
const { ApiController } = require('./src/controllers/BotController');
const { HomeController } = require('./src/controllers/HomeController');
const { BoardController } = require('./src/controllers/BoardController');

const botId = process.env.API_KEY;
let port = process.env.PORT;
if (port == null || port == "") {
  port = "8000";
}

/*
Array of Room objects
Each object contains:

-   room: room's name
-   host: host's id
-   users: list of sockets
-   canvas: array of objects containing x and y coordinates
-   timeOut: the timeoutID
-   muteAll: specifies if room is muted
*/

let roomManager = new RoomManager();
let apiHandler = new ApiController(botId, roomManager);
let homeHandler = new HomeController();
let boardHandler = new BoardController(roomManager);

server.listen(port, () =>{
    console.log("Server is connected on: " + port);
});

//create app/x-ww-urlencoded parser
let urlEncodedParser = bodyParser.urlencoded({extended: false});

app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './src/views'))
app.use('/assets', express.static('assets'));
app.use('/scripts', express.static('./src/views/js'));
app.use(function(req,  res, next){
    res.header("Access-COntrol-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', homeHandler.handle);

app.get('/error', (req, res)=>{
    throw new WebError("What Happenned?", "No Clue!", 400);
})

app.get('/board', boardHandler.handleCreate);

app.get('/board/:id', boardHandler.join);

//Allows the creation of a board if the id is approved
app.get('/api/create/:id/:muteAll', apiHandler.handle);

app.post('/board', urlEncodedParser, boardHandler.handleSelfJoin);

app.get('*', function(req, res, next){
    next(new WebError("Invalid Path", "How'd you get here?", 404))
});

app.use(errorHandler);

//On user connection
io.on("connection", (socket) =>{
    let roomName = socket.handshake.query.room ?? null;
    if(roomName && roomManager.containsRoom(roomName)){
        
        //Connect socket to a room
        socket.on("joinRoom", (data) =>{

            //Get the room
            let room = roomManager.getRoom(data.room);
            if(room){
                socket.room = room.Id;
                let user = sanitizer.value(data.user, 'str');

                //Check if name is not unique
                if(!room.containsUser(user))
                    socket.username = user;
                else
                    return socket.emit("err", "Error, this username is taken.");

                //Check if user has matching host id
                if(data.host !== undefined){
                    if(room.host === data.host)
                        socket.isHost = true;
                    else
                        return socket.emit("err", "Error, wrong host ID: " + data.host);
                }else
                    socket.isHost = false;

                socket.isMuted = room.muteAll && !socket.isHost;

                socket.join(data.room);
                room.addUser(socket);

                //Send the new user info to other sockets
                let sendData = {
                    user: socket.username,
                    isHost: socket.isHost,
                    isMuted: room.muteAll && !socket.isHost
                };

                socket.to(socket.room).emit("usrJoin", sendData);

                //Send the room's current users + canvas to the new user
                sendData = {
                    canvas: room.canvas,
                    users: room.getUserNames(),
                    isHost: socket.isHost,
                    muteAll: room.muteAll,
                    isMuted: room.muteAll && !socket.isHost
                };

                return socket.emit("suc", sendData);
            }else{
                return socket.emit("err", "Error, No Room with code: " + data.room);
            }
        });

        //On user draw
        /*
            Data payload:
            -userID: user's socket id
            -eventID: event's individual id
            -drawEvent:
                -type: specifies the type of drawing (path, text)
                -x: x representing the horizontal coordinate of the pixel
                -y: y representing the vertical coordinate of the pixel
                -lastx: x representing the start of the draw
                -lasty: y representing the start of the draw
                -size: size of the pixel
                -color: color of the pixel
        */

        socket.on("draw", (data) =>{
            let room = roomManager.getRoom(socket.room);
            if(room && !socket.isMuted){
                //save the pixel data into canvas array && emit event to other sockets in the room
                room.canvas.push(data);
                socket.to(socket.room).emit("draw", data);
            }
        });

        socket.on("erase", (data) =>{
            let room = roomManager.getRoom(socket.room);
            if(room && !socket.isMuted){
                //save the pixel data into canvas array && emit event to other sockets in the room
                room.canvas.push(data);
                socket.to(socket.room).emit("draw", data);
            }
        });

        socket.on("deleteAll", () =>{
            if(socket.isHost){
                let room = roomManager.getRoom(socket.room);
                if(room){
                    //save the pixel data into canvas array
                    socket.to(socket.room).emit("deleteAll");
                    room.canvas.length = 0;
                }
            }
        });

        socket.on("deleteElement", (data) => {
            if(!socket.isMuted){
                let room = roomManager.getRoom(socket.room);
                
                if(room){
                    for(let i = 0; i < room.canvas.length; i++){
                        if(room.canvas[i].userId === data.userId && room.canvas[i].eventId === data.eventId){
                            room.canvas.splice(i, 1);
                            socket.to(socket.room).emit("deleteElement", data);
                            break;
                        }
                    }
                }
            }
        });

        socket.on("moveElement", (data) =>{
            if(!socket.isMuted){
                let room = roomManager.getRoom(socket.room);
                
                if(room){
                    for(let i = 0; i < room.canvas.length; i++){
                        if(room.canvas[i].userId === data.userId && room.canvas[i].eventId === data.eventId){
                            room.canvas[i].drawEvent = data.movedElement;
                            socket.to(socket.room).emit("moveElement", data);
                            break;
                        }
                    }
                }
            }
        })

        socket.on("usrKick", (data) => {
            if(socket.isHost){
                console.log("Kicking " + data.user);
                let room = roomManager.getRoom(socket.room);
                let kickedSocket = room ? room.getUser(data.user) : null;
                
                if(kickedSocket){
                    kickedSocket.emit('kicked');
                    kickedSocket.leave(socket.room);
                }
            }
        });

        socket.on("usrMute", (data) => {
            if(socket.isHost){
                let room = roomManager.getRoom(socket.room);
                let muteSocket = room ? room.getUser(data.user) : null;

                if(muteSocket && !muteSocket.isHost){
                    muteSocket.isMuted = !muteSocket.isMuted;
                    muteSocket.emit("mute");
                    muteSocket.to(muteSocket.room).emit("usrMute", {user: muteSocket.username});
                }
            }
        });

        socket.on("usrMuteAll", () =>{
            let room = roomManager.getRoom(socket.room);

            if(room){
                room.muteAll = !room.muteAll;
            
                for(let user in room.users){
                    room.getUser(user).isMuted = room.muteAll && !room.getUser(user).isHost;
                }

                socket.to(socket.room).emit("usrMuteAll",  room.muteAll);
            }
        })

        //On user disconnection
        socket.on("disconnect", () => {
            let room = roomManager.getRoom(socket.room);

            if(room)
                if(room.deleteUser(socket.username))
                    socket.to(socket.room).emit("usrLeft", {user: socket.username});
        });
    }else
        socket.emit("badRoom");
});
