const socket = io.connect('http://localhost:3000');
const roomCode = document.querySelector('#roomCode').innerHTML;

let timeOutID;
const timeOutLimit = 10000;

function TimeOut(){
    socket.emit("timeOut");
}

//Client draw
function Draw(canvas, event, color, size){
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineTo(x,y);
    ctx.stroke();

    console.log("x: " + x + " y: " + y);
    socket.emit("draw", {x: x, y: y, color: color, size: size});
    clearInterval(timeOutID);
    timeOutID = setInterval(TimeOut, timeOutLimit);
}

//Server draw
function ServerDraw(canvas, x, y, color, size){
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineTo(x,y);
    ctx.stroke();

    clearInterval(timeOutID);
    timeOutID = setInterval(TimeOut, timeOutLimit);
}

//Join the desired room
socket.emit("joinRoom", roomCode);

//Failure joining a room
socket.on("err", (err) => console.log(err));

//On successfully joining a room
socket.on("suc", (res) => {
    let drawColor = "rgb(0,0,0)";
    let eraseColor = "rgb(255,255,255)";
    let drawSize = 5;
    let eraseSize = 20;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext("2d");
    canvas.width = 1920;
    canvas.height = 1080;

    //Request latest canvas
    socket.emit("giveCanvas");

    //Listening to other user draws/paths
    socket.on("draw", (data) => {
        ServerDraw(canvas, data.x, data.y, data.color, data.size)
    });
    socket.on("path", () => ctx.beginPath());

    //Send user's canvas on request
    socket.on("giveCanvas", () =>{
        let lastpic =  ctx.getImageData(0,0, canvas.width, canvas.height);
        //Due to some bullshit, program can't directly send canvas data back to the server. We must create an object
        let pic = [];
        for(let i = 0; i < lastpic.data.length;i++){
            pic.push(lastpic.data[i]);
        }
        let data = {
            width: canvas.width,
            height: canvas.height,
            newCanvas: pic
        };
        socket.emit("sendCanvas", data);
    });

    //Receive server's canvas
    socket.on("sendCanvas", (data) =>{
        console.log("Received canvas: " + data.height + "\n" + data.width + "\n" + data.newCanvas[0]);
        let pic = data.newCanvas;

        //Create a new image data and copy the information from the payload
        let idata = ctx.createImageData(data.width, data.height);
        for(let i = 0; i < idata.data.length; i++){
            idata.data[i] = pic[i];
        }

        ctx.putImageData(idata, 0, 0);
    });

    //Draw
    canvas.addEventListener('mousedown', function(event){
        ctx.beginPath();
        socket.emit("beginPath");
    });
    //Erase
    canvas.addEventListener('contextmenu', function(event){
        event.preventDefault();
        ctx.beginPath();
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

    timeOutID = setInterval(TimeOut, timeOutLimit);

    document.body.appendChild(canvas);
});