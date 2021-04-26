const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require("socket.io")(server);
const sanitizer = require('sanitize')();

const fs = require('fs');
const bodyParser = require('body-parser');
const RoomManager = require('./scripts/Rooms/RoomManager');
const Room = require('./scripts/Rooms/Room');

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

let botId = process.env.API_KEY;

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

let drawRooms = new RoomManager();
let timeOutLimit = 1800000; //milliseconds

server.listen(port, () =>{
    console.log("Server is connected on: " + port);
});

// function TimeOut(){
//     //Check if room exists
//     let currentRoomIndex = RoomSearch(this.room, drawRooms);
//     if(currentRoomIndex !== null){
//         console.log("Room has hit timeOut, proceeding to delete");

//         for(let i = 0; i < drawRooms[currentRoomIndex]['users'].length; i++){
//             drawRooms[currentRoomIndex]['users'][i].emit('timeOut');
//         }
        
//         clearInterval(drawRooms[currentRoomIndex]['timeOut']);
//         drawRooms.splice(currentRoomIndex, 1);

//         //Reset the sockets' indexes
//         for(let i = currentRoomIndex; i < drawRooms.length; i++){
//             drawRooms[i]['users'].forEach(userSocket => {
//                 userSocket.index = userSocket.index - 1;
//             });
//         }
//     }
// }

//create app/x-ww-urlencoded parser
let urlEncodedParser = bodyParser.urlencoded({extended: false});

app.set('view engine', 'ejs');
app.use('/assets', express.static('assets'));
app.use('/scripts', express.static('scripts'));

app.get('/', function(req, res){
    res.render('index');
});

app.get('/error', function(req, res){
    res.render('error');
})

app.get('/board', function(req, res){
    let roomString = RoomManager.MakeId(15);
    let hostID = RoomManager.MakeId(15);

    //Creation of new room
    let room = new Room(roomString, hostID);
    drawRooms.addRoom(room);

    //Creation of user payload
    let data = {
        roomCode: roomString,
        hostCode: hostID
    };
    
    console.log("Created room " + roomString + " with host ID " + hostID);
    res.render('board', {data: data});
});

app.get('/board/:id', function(req, res){
    let roomString = req.params.id ?? null;

    if(!roomString)
        res.redirect('/error');
    else{
        let data = {
            roomCode: roomString
        };
        res.render('board', {data: data});
    }
});

//Allows the creation of a board if the id is approved
app.get('/api/create/:id/:muteAll', function(req, res){
    if(req.params.id === botId){
        let roomString;
        let hostID = RoomManager.MakeId(15);
        let muteAll = false;
        if(req.params.muteAll === "true"){
            muteAll = true;
        }

        //Search for a non-used room string
        do{
            roomString = RoomManager.MakeId(15);
        }while(drawRooms.containsRoom(roomString));

        //Creation of new room
        let roomObj = new Room(roomString, hostID);
        drawRooms.addRoom(roomObj);
        console.log("Created room " + roomString);

        //Send JSON
        res.setHeader('Content-Type', 'application/json');
        res.json({status: "OK", roomCode: roomString, hostCode: hostID});
    }else{
        res.setHeader('Content-Type', 'application/json');
        res.json({status: "BAD_ID"});
    }
});

app.post('/board', urlEncodedParser, function(req, res){
    let roomString = req.body.roomCode ?? null;
    
    if(roomString && drawRooms.containsRoom(roomString))
        res.render('board', {data: req.body});
    else
        res.render('error');
});

//On user connection
io.on("connection", (socket) =>{
    let roomName = socket.handshake.query.room ?? null;
    if(roomName && drawRooms.containsRoom(roomName)){
        
        //Connect socket to a room
        socket.on("joinRoom", (data) =>{

            //Get the room
            let room = drawRooms.getRoom(data.room);
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
            let room = drawRooms.getRoom(socket.room);
            if(room && !socket.isMuted){
                //save the pixel data into canvas array && emit event to other sockets in the room
                room.canvas.push(data);
                socket.to(socket.room).emit("draw", data);
            }
        });

        socket.on("erase", (data) =>{
            let room = drawRooms.getRoom(socket.room);
            if(room && !socket.isMuted){
                //save the pixel data into canvas array && emit event to other sockets in the room
                room.canvas.push(data);
                socket.to(socket.room).emit("draw", data);
            }
        });

        socket.on("deleteAll", () =>{
            if(socket.isHost){
                let room = drawRooms.getRoom(socket.room);
                if(room){
                    //save the pixel data into canvas array
                    socket.to(socket.room).emit("deleteAll");
                    room.canvas.length = 0;
                }
            }
        });

        socket.on("deleteElement", (data) => {
            if(!socket.isMuted){
                let room = drawRooms.getRoom(socket.room);
                
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
                let room = drawRooms.getRoom(socket.room);
                
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
                let room = drawRooms.getRoom(socket.room);
                let kickedSocket = room ? room.getUser(data.user) : null;
                
                if(kickedSocket){
                    kickedSocket.emit('kicked');
                    kickedSocket.leave(socket.room);
                }
            }
        });

        socket.on("usrMute", (data) => {
            if(socket.isHost){
                let room = drawRooms.getRoom(socket.room);
                let muteSocket = room ? room.getUser(data.user) : null;

                if(muteSocket && !muteSocket.isHost){
                    muteSocket.isMuted = !muteSocket.isMuted;
                    muteSocket.emit("mute");
                    muteSocket.to(muteSocket.room).emit("usrMute", {user: muteSocket.username});
                }
            }
        });

        socket.on("usrMuteAll", () =>{
            let room = drawRooms.getRoom(socket.room);

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
            let room = drawRooms.getRoom(socket.room);

            if(room)
                if(room.deleteUser(socket.username))
                    socket.to(socket.room).emit("usrLeft", {user: socket.username});
        });
    }else
        socket.emit("badRoom");
});
