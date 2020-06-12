const socket = io.connect('http://localhost:3000/')
//const socket = io.connect('https://discord-notes.herokuapp.com/');
const roomCode = document.querySelector('#roomCode').innerHTML;

let timeOutID;
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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineTo(x,y);
    ctx.stroke();

    //clearInterval(timeOutID);
    //timeOutID = setInterval(TimeOut, timeOutLimit);
}

//Server draw
function ServerDraw(canvas, data){
    let ctx = canvas.getContext("2d");
    console.log("OK:");
    if(data.canvas){
        let imageObj = new Image();
        imageObj.src = data.canvas;
        console.log("Drawing: " + this.src);
        ctx.drawImage(imageObj, 0, 0);
    }

    //clearInterval(timeOutID);
    //timeOutID = setInterval(TimeOut, timeOutLimit);
}

//Join the desired room
socket.emit("joinRoom", roomCode);

//Failure joining a room
socket.on("err", (err) => console.log(err));

//On successfully joining a room
socket.on("suc", (res) => {
    let drawColor = "rgb(0,0,0)";
    let eraseColor = "rgba(255,255,255,255)";
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
        console.log("Received canvas new canvas. " + data.newCanvas);
        oldImageData = ctx.getImageData(0,0, canvas.width, canvas.height);

        let pic = data.newCanvas;

        //Create a new image data and copy the information from the payload
        let idata = ctx.createImageData(data.width, data.height);
        let g = 1;
        let b = 2;
        let a = 3;
        for(let i = 0; i < idata.data.length; i++){
            if(i % 4 === 0){
                //Check if the current pixel is already drawn on
                if(pic[i] === 0 && pic[i + g] === 0 && pic[i + b] === 0){
                    //If pixel isn't white
                    if(oldImageData.data[i + a] !== 0){
                        pic[i] = oldImageData.data[i];
                        pic[i + g] = oldImageData.data[i + g];
                        pic[i + b] = oldImageData.data[i + b];
                        pic[i + a] = oldImageData.data[i + a];
                    }
                }
            }
            idata.data[i] = pic[i];
        }

        ctx.putImageData(idata, 0, 0);
    });

    //Get server's canvas
    socket.on("giveCanvas", (data) =>{
        console.log("Received canvas");
        let pic = data.canvas;

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

    canvas.addEventListener('mouseup', function(event){
        ctx.closePath();
        let lastpic =  ctx.getImageData(0,0, canvas.width, canvas.height);
        let pixels = lastpic.data
        //Due to some bullshit, program can't directly send canvas data back to the server. We must create an object
        let pic = [];
        for(let i = 0; i < pixels.length; i++){
            pic.push(pixels[i]);
        }
        let data = {
            width: canvas.width,
            height: canvas.height,
            newCanvas: pic
        };
        socket.emit("draw", data);
    });

    //timeOutID = setInterval(TimeOut, timeOutLimit);

    document.body.appendChild(canvas);
});