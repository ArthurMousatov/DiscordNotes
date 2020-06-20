let App = {};
App.whiteboard = function(){
    //const socket = io.connect('http://localhost:3000/')
    const socket = io.connect('https://discord-notes.herokuapp.com/');
    const roomCode = document.querySelector('#roomCode').innerHTML;

    //Tool elements
    const toolContainer = document.querySelector('#tools-container');
    const blackMarker = document.querySelector('#blackMarker');
    const greenMarker = document.querySelector('#greenMarker');
    const redMarker = document.querySelector('#redMarker');
    const blueMarker = document.querySelector('#blueMarker');
    const eraser = document.querySelector('#eraser');

    //Timeout variables
    let timeOutID;
    const timeOutLimit = 2700000; //45 minutes
    
    //Path variables
    let worldOrigin = {
        x: 0,
        y: 0
    };
    let lastWorldCoord;
    let paths = [];
    let lastCoord;

    function TimeOut(){
        socket.emit("timeOut");
    }

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
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(lastx, lasty);
        ctx.lineTo(x,y);
        ctx.stroke();
        ctx.closePath();

        //Send data to server
        let data = {
            x: x + worldOrigin.x * -1,
            y: y + worldOrigin.y * -1,
            lastx: lastx + worldOrigin.x * -1,
            lasty: lasty + worldOrigin.y * -1,
            size: size,
            color: color
        };
        socket.emit("draw", data);
        paths.push(data);

        lastCoord= {x: event.clientX, y: event.clientY};

        clearInterval(timeOutID);
        timeOutID = setInterval(TimeOut, timeOutLimit);
    }

    //Server canvas init
    function InitCanvas(canvas, ctx){
        for(let i = 0; i < canvas.length; i++){
            ctx.strokeStyle = canvas[i].color;
            ctx.lineWidth = canvas[i].size;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(canvas[i].lastx, canvas[i].lasty);
            ctx.lineTo(canvas[i].x,canvas[i].y);
            ctx.stroke();
            ctx.closePath();
            paths.push(canvas[i]);
        }
        ResizeCanvas(canvas);
    }

    //Canvas drag
    function Drag(canvas, ctx){
        ctx.clearRect(0,0, canvas.width, canvas.height);
        for(let i = 0; i < paths.length; i++){
            ctx.strokeStyle = paths[i].color;
            ctx.lineWidth = paths[i].size;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(paths[i].lastx + worldOrigin.x, paths[i].lasty + worldOrigin.y);
            ctx.lineTo(paths[i].x + worldOrigin.x, paths[i].y + worldOrigin.y);
            ctx.stroke();
            ctx.closePath();
        }
    }

    function ResizeCanvas(canvas, ctx){
        canvas.width = document.body.clientWidth;
        Drag(canvas, canvas.getContext('2d'));
    }

    //Join the desired room
    socket.emit("joinRoom", roomCode);

    //Failure joining a room
    socket.on("err", (err) => console.log(err));

    //On successfully joining a room
    socket.on("suc", (sentCanvas) => {
        let drawColor = "rgb(0,0,0)";
        let drawSize = 10;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        canvas.height = 900;

        //Draw the existing canvas
        if(sentCanvas.length != 0){
            InitCanvas(sentCanvas, ctx);
        }

        //Listening to other user draws/paths
        socket.on("draw", (data) => {
            paths.push(data);
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.size;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(data.lastx + worldOrigin.x, data.lasty + worldOrigin.y);
            ctx.lineTo(data.x + worldOrigin.x, data.y + worldOrigin.y);
            ctx.stroke();
            ctx.closePath();
        });

        canvas.addEventListener('mousedown', function(event){
            //Set first coord
            if(event.buttons === 1){
                lastCoord = {x: event.clientX, y: event.clientY};
            }else if(event.buttons === 2){
                lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
            }
        });
        //Erase
        canvas.addEventListener('contextmenu', function(event){
            event.preventDefault();
        });
        //Draw/Erase while moving mouse
        canvas.addEventListener('mousemove', function(event){
            if(event.buttons === 1){
                Draw(canvas, event, drawColor, drawSize);
            }else if(event.buttons === 2){
                worldOrigin.x = worldOrigin.x + (event.clientX - lastWorldCoord.x);
                worldOrigin.y = worldOrigin.y + (event.clientY - lastWorldCoord.y);
                console.log(worldOrigin);
                Drag(canvas, ctx);
                lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
            }
        });

        canvas.addEventListener('mouseup', function(event){
            if(event.buttons === 1){
                Draw(canvas, event, drawColor, drawSize);
            }
        });

        window.addEventListener('resize', function(){
            ResizeCanvas(canvas, ctx);
        });

        toolContainer.addEventListener('mousedown', function(event){
            event.stopPropagation();
            console.log(event.target);
            if(event.target.className !== "active-btn" && event.target.tagName.toLowerCase() === 'button'){
                let currentTool = document.querySelector(".active-btn");
                currentTool.classList.remove("active-btn");
                event.target.classList.add("active-btn");
                drawColor = event.target.value;
                if(event.target.value === 'white'){
                    drawSize = 40;
                }else{
                    drawSize = 10;
                }
            }
        });


        timeOutID = setInterval(TimeOut, timeOutLimit);
        document.body.querySelector('main').appendChild(canvas);
    });
}();