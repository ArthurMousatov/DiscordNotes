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
drawRooms = {};

server.listen(port, () =>{
    console.log("Server is connected on: " + port);
})

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
    let data = {
        roomCode: roomString
    };
    drawRooms[roomString] = [];
    console.log("Create room " + roomString);
    res.render('board', {data: data});
});

app.get('/board/:id', function(req, res){
    let roomString = req.params.id;
    let data = {
        roomCode: roomString
    };
    res.render('board', {data: data});
})

let botId = "12354335asdfdserw32"
//Allows the creation of a board if the id is good
app.get('/api/create/:id', function(req, res){
    if(req.params.id === botId){
        let roomString = makeid(15);
        drawRooms[roomString] = [];
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
        if(drawRooms.hasOwnProperty(room)){
            socket.room = room;
            socket.join(room);
            drawRooms[room].push(socket);
            return socket.emit("suc", "Joined Room: " + room);
        }else{
            return socket.emit("err", "Error, No Room named " + room);
        }
    })

    //On user canvas sending a canvas request
    socket.on("giveCanvas", () => {
        drawRooms[socket.room][0].emit("giveCanvas");
        console.log("User " + drawRooms[socket.room][drawRooms[socket.room].length - 1].id + " asked for canvas from " + drawRooms[socket.room][0].id);
    });

    //On user sending their canvas to server
    socket.on("sendCanvas", (data) =>{
        drawRooms[socket.room][drawRooms[socket.room].length - 1].emit("sendCanvas", data);
    });

    //On user draw
    socket.on("draw", function(data){
        socket.to(socket.room).emit("draw", data);
    });

    //On user beggining Path
    socket.on("beginPath", () => {
        socket.to(socket.room).emit("path");
    });

    //On user disconnection
    socket.on('disconnect', () => {
        //Check if room actually exists
        if(drawRooms.hasOwnProperty(socket.room)){
            //Delete user's socket from the room's socket array
            let socketIndex = drawRooms[socket.room].indexOf(socket);
            drawRooms[socket.room].splice(socketIndex, 1);
            //If room doesn't have any other user, delete the room
            if(drawRooms[socket.room].length === 0){
                console.log("Room has no users, proceeding to delete");
                delete drawRooms[socket.room];
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
