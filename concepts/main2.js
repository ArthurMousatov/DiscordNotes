const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require("socket.io")(server);

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
-   users: list of sockets
-   canvas: room's canvas
*/
drawRooms = [];

server.listen(port, () =>{
    console.log("Server is connected on: " + port);
});

//string randomizer via https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

//Search for specific value in key via https://stackoverflow.com/questions/12462318/find-a-value-in-an-array-of-objects-in-javascript 
function roomSearch(roomName, myArray){
    for (var i=0; i < myArray.length; i++) {
        if (myArray[i]['room'] === roomName) {
            return i;
        }
    }
    return null;
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
    let roomString = makeid(15);
    //Creation of new room
    let roomObj = {
        room: roomString,
        users: [],
        canvas: undefined
    };
    drawRooms.push(roomObj);
    //Creation of user payload
    let data = {
        roomCode: roomString
    };
    console.log("Created room " + roomString);
    res.render('board', {data: data});
});

app.get('/board/:id', function(req, res){
    let roomString = req.params.id;
    let data = {
        roomCode: roomString
    };
    res.render('board', {data: data});
});

let botId = "12354335asdfdserw32"
//Allows the creation of a board if the id is good
app.get('/api/create/:id', function(req, res){
    if(req.params.id === botId){
        let roomString = makeid(15);
        //Creation of new room
        let roomObj = {
            room: roomString,
            users: [],
            canvas: undefined
        };
        drawRooms.push(roomObj);
        console.log("Create room " + roomString)
        res.setHeader('Content-Type', 'application/json');
        res.json({status: "OK", roomCode: roomString});
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
    socket.on("joinRoom", (room) =>{
        //Check if room exists
        let currentRoomIndex = roomSearch(room, drawRooms);
        if(currentRoomIndex != null){
            socket.room = room;
            socket.index = currentRoomIndex;
            socket.join(room);
            drawRooms[currentRoomIndex]['users'].push(socket);
            return socket.emit("suc", drawRooms[currentRoomIndex]['canvas']);
        }else{
            return socket.emit("err", "Error, No Room named " + room);
        }
    })

    //On user canvas sending a canvas request
    socket.on("giveCanvas", () => {
        if(typeof drawRooms[socket.index]['canvas'] !== 'undefined'){
            let data = {
                canvas: drawRooms[socket.index]['canvas']
            };
            socket.emit("giveCanvas", data);
        }
    });

    //On user sending their canvas to server
    socket.on("sendCanvas", (data) =>{
        let currentRoomIndex = roomSearch(socket.room, drawRooms);
        if(currentRoomIndex != null){
            drawRooms[currentRoomIndex].emit("draw", data);
        }
    });

    //On user draw
    socket.on("draw", function(data){
        socket.to(socket.room).emit("draw", data);
        drawRooms[socket.index]['canvas'] = data.newCanvas;
        console.log("Sending canvas data to others");
    });

    //On user disconnection
    socket.on('disconnect', () => {
        let currentRoomIndex = roomSearch(socket.room, drawRooms);
        //Check if room actually exists
        if(currentRoomIndex != null){
            //Delete user's socket from the room's socket array
            let socketIndex = drawRooms[currentRoomIndex]['users'].indexOf(socket);
            drawRooms[currentRoomIndex]['users'].splice(socketIndex, 1);
            //If room doesn't have any other user, delete the room
            if(drawRooms[currentRoomIndex]['users'].length === 0){
                console.log("Room has no users, proceeding to delete");
                delete drawRooms[currentRoomIndex];
            }
        }
    });

    socket.on('timeOut', () =>{
        //Check if room actually exists
        if(drawRooms.hasOwnProperty(socket.room)){
            console.log("Room has hit timeOut, proceeding to delete");
            delete drawRooms[socket.room];
        }
    })

    console.log("Connection establised");
});
