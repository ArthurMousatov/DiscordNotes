const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require("socket.io")(server);
const sanitizer = require('sanitize')();

const fs = require('fs');
const bodyParser = require('body-parser');

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

/*
Array of Room objects
Each object contains:

-   room: room's name
-   host: host's id
-   users: list of sockets
-   canvas: array of objects containing x and y coordinates
*/

drawRooms = [];

server.listen(port, () =>{
    console.log("Server is connected on: " + port);
});

//string randomizer via https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function MakeId(length) {

    //Loop until the result is unique
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

//Search for specific value in key via https://stackoverflow.com/questions/12462318/find-a-value-in-an-array-of-objects-in-javascript 
function RoomSearch(roomName, myArray){
    for (var i=0; i < myArray.length; i++) {
        if (myArray[i]['room'] === roomName) {
            return i;
        }
    }
    return null;
}

function GetSocket(usr, users){
    for(let i = 0; i < users.length; i++){
        if(users[i].username === usr){
            return users[i];
        }
    }
    return null;
}

//Get a list of usernames and if they are a host from a users array
function GetNames(users){
    let names = [];
    let currentUser = {};
    for(let i = 0; i < users.length; i++){
        currentUser = {
            name: users[i].username,
            isHost: users[i].isHost
        }
        names.push(currentUser);
    }
    return names;
}

//Check if the name is already taken
function isNameFree(name, users){
    for(let i = 0; i < users.length; i++){
        if(name === users[i].username){
            return false;
        }
    }
    return true;
}

//create app/json parser
let jsonParser = bodyParser.json();

//create app/x-ww-urlencoded parser
let urlEncodedParser = bodyParser.urlencoded({extended: false});

app.set('view engine', 'ejs');
app.use('/assets', express.static('assets'));
app.use('/scripts', express.static('scripts'));

app.get('/', function(req, res){
    res.render('index');
});

app.get('/board', function(req, res){
    let roomString = MakeId(15);
    let hostID = MakeId(15);

    //Creation of new room
    let roomObj = {
        room: roomString,
        host: hostID,
        users: [],
        canvas: []
    };
    drawRooms.push(roomObj);

    //Creation of user payload
    let data = {
        roomCode: roomString,
        hostCode: hostID
    };
    console.log("Created room " + roomString + " with host ID " + hostID);
    res.render('board', {data: data});
});

app.get('/board/:id', function(req, res){
    let roomString = req.params.id;
    let data = {
        roomCode: roomString
    };
    res.render('board', {data: data});
});

let botId = "12354335asdfdserw32";

//Allows the creation of a board if the id is approved
app.get('/api/create/:id', function(req, res){
    if(req.params.id === botId){
        let roomString;
        let hostID = MakeId(15);

        do{
            roomString = MakeId(15);
        }while(RoomSearch(roomString, drawRooms) !== null)

        //Creation of new room
        let roomObj = {
            room: roomString,
            host: hostID,
            users: [],
            canvas: []
        };
        drawRooms.push(roomObj);
        console.log("Create room " + roomString);

        //Send JSON
        res.setHeader('Content-Type', 'application/json');
        res.json({status: "OK", roomCode: roomString, hostCode: hostID});
    }else{
        res.setHeader('Content-Type', 'application/json');
        res.json({status: "BAD_ID"});
    }
});

app.post('/board', urlEncodedParser, function(req, res){
    res.render('board', {data: req.body});
});

//On user connection
io.on("connection", (socket) =>{

    //Connect socket to a room
    socket.on("joinRoom", (data) =>{

        //Check if room exists
        let currentRoomIndex = RoomSearch(data.room, drawRooms);
        if(currentRoomIndex != null){
            socket.room = data.room;
            socket.isMuted = false;
            let user = sanitizer.value(data.user, 'str');

            //Check if name is not unique
            if(isNameFree(user, drawRooms[currentRoomIndex]['users'])){
                console.log("Name is free");
                socket.username = user;
            }else{
                let counter = 0;
                let name = user + String(counter);
                console.log(name);
                //While name is not unique
                while(!isNameFree(name, drawRooms[currentRoomIndex]['users'])){
                    counter++;
                    name = user + String(counter);
                }
                socket.username = name;
            }
            socket.index = currentRoomIndex;
            
            //Get the room's current users
            let users = GetNames(drawRooms[currentRoomIndex]['users']);

            //Check if user has matching host id
            if(data.host !== undefined){
                if(drawRooms[currentRoomIndex]['host'] === data.host){
                    socket.isHost = true;
                }else{
                    return socket.emit("err", "Error, wrong host ID: " + data.host);
                }
            }else{
                socket.isHost = false;
            }

            socket.join(data.room);
            drawRooms[currentRoomIndex]['users'].push(socket);

            //Send the new user info to other sockets
            let sendData = {
                user: socket.username,
                isHost: socket.isHost,
            };

            socket.to(socket.room).emit("usrJoin", sendData);

            //Send the room's current users + canvas to the new user
            sendData = {
                canvas: drawRooms[socket.index]['canvas'],
                users: users,
                isHost: socket.isHost
            };

            return socket.emit("suc", sendData);
        }else{
            return socket.emit("err", "Error, No Room with code: " + data.room);
        }
    });

    //On user draw
    /*
        Data payload:
        -x: x representing the horizontal coordinate of the pixel
        -y: y representing the vertical coordinate of the pixel
        -lastx: x representing the start of the draw
        -lasty: y representing the start of the draw
        -size: size of the pixel
        -color: color of the pixel
    */

    socket.on("draw", (data) =>{
        if(!socket.isMuted){ 
            socket.to(socket.room).emit("draw", data);

            //save the pixel data into canvas array
            drawRooms[socket.index]['canvas'].push({x: data.x, y: data.y, lastx: data.lastx, lasty: data.lasty, size: data.size, color: data.color});
        }
    });

    socket.on("erase", (data) =>{
        if(!socket.isMuted){
            for(let i = 0; i < drawRooms[socket.index]['canvas'].length; i++){
                if(drawRooms[socket.index]['canvas'][i].x === data.x && drawRooms[socket.index]['canvas'][i].y === data.y && drawRooms[socket.index]['canvas'][i].lastx === data.lastx && drawRooms[socket.index]['canvas'][i].lasty === data.lasty){
                    drawRooms[socket.index]['canvas'].splice(i, 1);
                    socket.to(socket.room).emit('erase', data);
                }
            }
        }
    });

    socket.on("usrKick", (data) => {
        //If socket is a host
        if(socket.isHost){
            console.log("Kicking " + data.user);
            let kickedSocket = GetSocket(data.user, drawRooms[socket.index]['users']);
            
            if(kickedSocket !== null){
                kickedSocket.emit('kicked');
                kickedSocket.leave(socket.room);

                // let data = {
                //     user: kickedSocket.username
                // };
                // kickedSocket.to(kickedSocket.room).emit("usrLeft", data);

                // let kickedSocketIndex = drawRooms[kickedSocket.index]['users'].indexOf(kickedSocket);
                // drawRooms[kickedSocket.index]['users'].splice(kickedSocketIndex, 1);
            }
        }
    });

    socket.on("usrMute", (data) => {
        if(socket.isHost){
            let muteSocket = GetSocket(data.user, drawRooms[socket.index]['users']);

            if(muteSocket !== null && !muteSocket.isHost){
                muteSocket.isMuted = !muteSocket.isMuted;
                muteSocket.emit("mute");
                
                let data = {
                    user: muteSocket.username
                };
                muteSocket.to(muteSocket.room).emit("usrMute", data);
            }
        }
    });

    //On user disconnection
    socket.on("disconnect", () => {
        let currentRoomIndex = RoomSearch(socket.room, drawRooms);

        //Check if room actually exists
        if(currentRoomIndex != null){

            //Delete user's socket from the room's socket array
            let socketIndex = drawRooms[currentRoomIndex]['users'].indexOf(socket);
            drawRooms[currentRoomIndex]['users'].splice(socketIndex, 1);

            //If room doesn't have any other user, delete the room
            if(drawRooms[currentRoomIndex]['users'].length === 0){
                console.log("Room has no users, proceeding to delete");
                drawRooms.splice(currentRoomIndex, 1);
            }else{
                let data = {
                    user: socket.username
                }
                socket.to(socket.room).emit("usrLeft", data);
            }
        }
    });

    socket.on('timeOut', () =>{

        //Check if room actually exists
        if(drawRooms[socket.index] !== undefined){
            console.log("Room has hit timeOut, proceeding to delete");
            drawRooms.splice(socket.index, 1);
        }
    })

    console.log("Connection establised");
});
