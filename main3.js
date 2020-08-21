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

drawRooms = [];
let timeOutLimit = 1800000; //10 seconds minutes

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

//Room search
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

function TimeOut(){
    //Check if room exists
    let currentRoomIndex = RoomSearch(this.room, drawRooms);
    if(currentRoomIndex !== null){
        console.log("Room has hit timeOut, proceeding to delete");

        for(let i = 0; i < drawRooms[currentRoomIndex]['users'].length; i++){
            drawRooms[currentRoomIndex]['users'][i].emit('timeOut');
        }
        
        clearInterval(drawRooms[currentRoomIndex]['timeOut']);
        drawRooms.splice(currentRoomIndex, 1);

        //Reset the sockets' indexes
        for(let i = currentRoomIndex; i < drawRooms.length; i++){
            drawRooms[i]['users'].forEach(userSocket => {
                userSocket.index = userSocket.index - 1;
            });
        }
    }
}

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
    let roomString = MakeId(15);
    let hostID = MakeId(15);
    let timeOutInfo = {
        room: roomString
    };
    let timeOutID = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

    //Creation of new room
    let roomObj = {
        room: roomString,
        host: hostID,
        users: [],
        canvas: [],
        timeOut: timeOutID,
        muteAll: false,
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

//Allows the creation of a board if the id is approved
app.get('/api/create/:id/:muteAll', function(req, res){
    if(req.params.id === botId){
        let roomString;
        let hostID = MakeId(15);
        let timeOutInfo = {
            room: roomString
        };
        let timeOutID = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);
        let muteAll = false;
        if(req.params.muteAll === "true"){
            muteAll = true;
        }

        //Search for a non-used room string
        do{
            roomString = MakeId(15);
        }while(RoomSearch(roomString, drawRooms) !== null)

        //Creation of new room
        let roomObj = {
            room: roomString,
            host: hostID,
            users: [],
            canvas: [],
            timeOut: timeOutID,
            muteAll: muteAll,
        };
        drawRooms.push(roomObj);
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
    if(RoomSearch(req.body.roomCode, drawRooms) !== null){
        res.render('board', {data: req.body});
    }else{
        res.render('error');
    }
});

//On user connection
io.on("connection", (socket) =>{
    if(RoomSearch(socket.handshake.query.room, drawRooms) !== null){
        //Connect socket to a room
        socket.on("joinRoom", (data) =>{

            //Check if room exists
            let currentRoomIndex = RoomSearch(data.room, drawRooms);
            if(currentRoomIndex != null){
                socket.room = data.room;
                let user = sanitizer.value(data.user, 'str');

                //Check if name is not unique
                if(isNameFree(user, drawRooms[currentRoomIndex]['users'])){
                    socket.username = user;
                }else{
                    let counter = 0;
                    let name = user + String(counter);

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

                socket.isMuted = drawRooms[currentRoomIndex]['muteAll'] && !socket.isHost;

                socket.join(data.room);
                drawRooms[currentRoomIndex]['users'].push(socket);

                //Send the new user info to other sockets
                let sendData = {
                    user: socket.username,
                    isHost: socket.isHost,
                    isMuted: drawRooms[currentRoomIndex]['muteAll'] && !socket.isHost
                };

                socket.to(socket.room).emit("usrJoin", sendData);

                //Send the room's current users + canvas to the new user
                sendData = {
                    canvas: drawRooms[socket.index]['canvas'],
                    users: users,
                    isHost: socket.isHost,
                    muteAll: drawRooms[currentRoomIndex]['muteAll'],
                    isMuted: drawRooms[currentRoomIndex]['muteAll'] && !socket.isHost
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
            if(!socket.isMuted){ 
                socket.to(socket.room).emit("draw", data);
                
                if(drawRooms[socket.index] && drawRooms[socket.index]['room'] === socket.room){

                    //Reset timeOut
                    let timeOutInfo = {
                        room: drawRooms[socket.index]['room']
                    };
                    clearInterval(drawRooms[socket.index]['timeOut']);
                    drawRooms[socket.index]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                    //save the pixel data into canvas array
                    drawRooms[socket.index]['canvas'].push(data);
                }else{
                    let currentRoomIndex = RoomSearch(socket.room, drawRooms);
                    if(currentRoomIndex != null){

                        //Reset timeOut
                        let timeOutInfo = {
                            room: drawRooms[currentRoomIndex]['room']
                        };
                        clearInterval(drawRooms[currentRoomIndex]['timeOut']);
                        drawRooms[currentRoomIndex]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                        //save the pixel data into canvas array
                        drawRooms[currentRoomIndex]['canvas'].push(data);
                    }
                }
            }
        });

        socket.on("erase", (data) =>{
            if(!socket.isMuted){
                socket.to(socket.room).emit('erase', data);

                //Failsafe check
                if(drawRooms[socket.index] && drawRooms[socket.index]['room'] === socket.room){

                    //Reset timeOut
                    let timeOutInfo = {
                        room: drawRooms[socket.index]['room']
                    };
                    clearInterval(drawRooms[socket.index]['timeOut']);
                    drawRooms[socket.index]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                    //save the pixel data into canvas array
                    drawRooms[socket.index]['canvas'].push(data);
                }else{

                    let currentRoomIndex = RoomSearch(socket.room, drawRooms);
                    if(currentRoomIndex != null){

                        //Reset timeOut
                        let timeOutInfo = {
                            room: drawRooms[currentRoomIndex]['room']
                        };
                        clearInterval(drawRooms[currentRoomIndex]['timeOut']);
                        drawRooms[currentRoomIndex]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                        //save the pixel data into canvas array
                        drawRooms[currentRoomIndex]['canvas'].push(data);
                    }
                }
            
            }
        });

        socket.on("deleteAll", () =>{
            if(socket.isHost){
                socket.to(socket.room).emit("deleteAll");

                if(drawRooms[socket.index] && drawRooms[socket.index]['room'] === socket.room){
                    //Reset timeOut
                    let timeOutInfo = {
                        room: drawRooms[socket.index]['room']
                    };
                    clearInterval(drawRooms[socket.index]['timeOut']);
                    drawRooms[socket.index]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                    //save the pixel data into canvas array
                    drawRooms[socket.index]['canvas'].length = 0;
                }else{
                    let currentRoomIndex = RoomSearch(socket.room, drawRooms);
                    if(currentRoomIndex != null){

                        //Reset timeOut
                        let timeOutInfo = {
                            room: drawRooms[currentRoomIndex]['room']
                        };
                        clearInterval(drawRooms[currentRoomIndex]['timeOut']);
                        drawRooms[currentRoomIndex]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                        //delete content of canvas
                        drawRooms[currentRoomIndex]['canvas'].length = 0;
                    }
                }
            }
        });

        socket.on("deleteElement", (data) => {
            if(!socket.isMuted){
                socket.to(socket.room).emit("smartErase", data);
                
                if(drawRooms[socket.index] && drawRooms[socket.index]['room'] === socket.room){

                    //Reset timeOut
                    let timeOutInfo = {
                        room: drawRooms[socket.index]['room']
                    };
                    clearInterval(drawRooms[socket.index]['timeOut']);
                    drawRooms[socket.index]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                    for(let i = 0; i < drawRooms[socket.index]['canvas'].length; i++){
                        if(drawRooms[socket.index]['canvas'][i].userId === data.userId && drawRooms[socket.index]['canvas'][i].eventId === data.eventId){
                            drawRooms[socket.index]['canvas'].splice(i, 1);
                            break;
                        }
                    }
                }else{
                    let currentRoomIndex = RoomSearch(socket.room, drawRooms);
                    if(currentRoomIndex != null){

                        //Reset timeOut
                        let timeOutInfo = {
                            room: drawRooms[currentRoomIndex]['room']
                        };
                        clearInterval(drawRooms[currentRoomIndex]['timeOut']);
                        drawRooms[currentRoomIndex]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                        for(let i = 0; i < drawRooms[currentRoomIndex]['canvas'].length; i++){
                            if(drawRooms[currentRoomIndex]['canvas'][i].userId === data.userId && drawRooms[currentRoomIndex]['canvas'][i].eventId === data.eventId){
                                drawRooms[currentRoomIndex]['canvas'].splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
        });

        socket.on("moveElement", (data) =>{
            if(!socket.isMuted){
                socket.to(socket.room).emit("moveElement", data);
                
                if(drawRooms[socket.index] && drawRooms[socket.index]['room'] === socket.room){

                    //Reset timeOut
                    let timeOutInfo = {
                        room: drawRooms[socket.index]['room']
                    };
                    clearInterval(drawRooms[socket.index]['timeOut']);
                    drawRooms[socket.index]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                    for(let i = 0; i < drawRooms[socket.index]['canvas'].length; i++){
                        if(drawRooms[socket.index]['canvas'][i].userId === data.userId && drawRooms[socket.index]['canvas'][i].eventId === data.eventId){
                            drawRooms[socket.index]['canvas'][i].drawEvent = data.movedElement;
                        }
                    }
                }else{
                    let currentRoomIndex = RoomSearch(socket.room, drawRooms);
                    if(currentRoomIndex != null){

                        //Reset timeOut
                        let timeOutInfo = {
                            room: drawRooms[currentRoomIndex]['room']
                        };
                        clearInterval(drawRooms[currentRoomIndex]['timeOut']);
                        drawRooms[currentRoomIndex]['timeOut'] = setInterval(TimeOut.bind(timeOutInfo), timeOutLimit);

                        for(let i = 0; i < drawRooms[currentRoomIndex]['canvas'].length; i++){
                            if(drawRooms[currentRoomIndex]['canvas'][i].userId === data.userId && drawRooms[currentRoomIndex]['canvas'][i].eventId === data.eventId){
                                drawRooms[currentRoomIndex]['canvas'][i].drawEvent = data.movedElement;
                            }
                        }
                    }
                }
            }
        })

        socket.on("usrKick", (data) => {
            //If socket is a host
            if(socket.isHost){
                console.log("Kicking " + data.user);
                let kickedSocket = GetSocket(data.user, drawRooms[socket.index]['users']);
                
                if(kickedSocket !== null){
                    kickedSocket.emit('kicked');
                    kickedSocket.leave(socket.room);
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

        socket.on("usrMuteAll", () =>{
            let currentRoomIndex = RoomSearch(socket.room, drawRooms);

            drawRooms[currentRoomIndex]['muteAll'] = !drawRooms[currentRoomIndex]['muteAll'];

            for(let i = 0; i < drawRooms[currentRoomIndex]['users'].length; i++){
                drawRooms[currentRoomIndex]['users'][i].isMuted = drawRooms[currentRoomIndex]['muteAll'] && !drawRooms[currentRoomIndex]['users'][i].isHost;
            }
            socket.to(socket.room).emit("usrMuteAll", drawRooms[currentRoomIndex]['muteAll']);
        })

        //On user disconnection
        socket.on("disconnect", () => {
            let currentRoomIndex = RoomSearch(socket.room, drawRooms);

            //Check if room actually exists
            if(currentRoomIndex != null){

                //Delete user's socket from the room's socket array
                let socketIndex = drawRooms[currentRoomIndex]['users'].indexOf(socket);
                drawRooms[currentRoomIndex]['users'].splice(socketIndex, 1);
                
                let data = {
                    user: socket.username
                }
                socket.to(socket.room).emit("usrLeft", data);
            }
        });
    }else{
        socket.emit("badRoom");
    }
});
