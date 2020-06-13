//const socket = io.connect('http://localhost:3000/')
const socket = io.connect('https://discord-notes.herokuapp.com/');
const roomCode = document.querySelector('#roomCode').innerHTML;

let timeOutID;
let lastCoord;
let currentCoord;
const timeOutLimit = 2700000;

function TimeOut(){
    socket.emit("timeOut");
}

//Draw on mouse down
//On mouse up, upload canvas

//Client draw
function Draw(canvas, event, color, size){
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const lastx = lastCoord.x - rect.left;
    const lasty = lastCoord.y - rect.top;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(lastx, lasty);
    ctx.lineTo(x,y);
    ctx.stroke();
    ctx.closePath();

    //Send data to server
    let data = {
        x: x,
        y: y,
        lastx: lastx,
        lasty: lasty,
        size: size,
        color: color
    };
    socket.emit("draw", data);

    lastCoord= {x: event.clientX, y: event.clientY};

    //clearInterval(timeOutID);
    //timeOutID = setInterval(TimeOut, timeOutLimit);
}

//Server canvas init
function InitCanvas(canvas, ctx){
    for(let i = 0; i < canvas.length; i++){
        ctx.strokeStyle = canvas[i].color;
        ctx.lineWidth = canvas[i].size;
        ctx.beginPath();
        ctx.moveTo(canvas[i].lastx, canvas[i].lasty);
        ctx.lineTo(canvas[i].x,canvas[i].y);
        ctx.stroke();
        ctx.closePath();
    }
}

//Join the desired room
socket.emit("joinRoom", roomCode);

//Failure joining a room
socket.on("err", (err) => console.log(err));

//On successfully joining a room
socket.on("suc", (sentCanvas) => {
    let drawColor = "rgb(0,0,0)";
    let eraseColor = "rgba(255,255,255,255)";
    let drawSize = 10;
    let eraseSize = 20;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext("2d");
    canvas.width = 1920;
    canvas.height = 1080;

    //Draw the existing canvas
    if(sentCanvas.length != 0){
        InitCanvas(sentCanvas, ctx);
    }

    //Listening to other user draws/paths
    socket.on("draw", (data) => {
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.beginPath();
        ctx.moveTo(data.lastx, data.lasty);
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
        ctx.closePath();
    });

    canvas.addEventListener('mousedown', function(event){
        //Set first coord
        lastCoord = {x: event.clientX, y: event.clientY};
    });
    //Erase
    canvas.addEventListener('contextmenu', function(event){
        event.preventDefault();
    });
    //Draw/Erase while moving mouse
    canvas.addEventListener('mousemove', function(event){
        if(event.buttons === 1){
            Draw(canvas, event, drawColor, drawSize);
        }
        if(event.buttons === 2){
            Draw(canvas, event, eraseColor, eraseSize);
        }
    });

    canvas.addEventListener('mouseup', function(event){
        if(event.buttons === 1){
            Draw(canvas, event, drawColor, drawSize);
        }
        if(event.buttons === 2){
            Draw(canvas, event, eraseColor, eraseSize);
        }
    });


    //timeOutID = setInterval(TimeOut, timeOutLimit);

    document.body.appendChild(canvas);
});