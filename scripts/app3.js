let App = {};
document.addEventListener('DOMContentLoaded', function(){
    App.whiteboard = function(){
        const socket = io.connect('http://localhost:3000/')
        //const socket = io.connect('https://discord-notes.herokuapp.com/');
        const roomCode = document.querySelector('#roomCode').innerHTML;
        let hostCode;
        if(document.querySelector('#hostCode')){
            hostCode = document.querySelector('#hostCode').innerHTML;
        }
        const errPar = document.querySelector('#error-paragraph');
        const usrList = document.querySelector('.users-list');
        const usrCont = document.querySelector('#user-clone-container');
        const optCont = document.querySelector('.options-container');
        const importBtn = document.querySelector('#import-input');
        
        //Path variables
        let worldOrigin = {
            x: 0,
            y: 0
        };
        let lastWorldCoord;
        let paths = [];
        let currentPaths = [];
        let lastCoord;
        let zoomFactor = 1;

        //User variables
        let isHost = false;
        let isMuted = false;
        let muteAll = false;
        const userPrefix = 'user-';

        //Kick a user
        function Kick(usr){
            let userName = usr.slice(userPrefix.length, usr.length);

            let data = {
                user: userName
            };
            socket.emit('usrKick', data);
        }

        //Mute and unmute a user
        function Mute(usr){
            let userName = usr.slice(userPrefix.length, usr.length);
            
            let data = {
                user: userName
            };
            socket.emit('usrMute', data);
        }

        function CreateUser(host, userName){
            let currentUserCont = usrCont.cloneNode(true);
            currentUserCont.id = userPrefix + userName;
            currentUserCont.classList.add('user-container');

            if(host){
                currentUserCont.querySelector('#userName').innerHTML = userName + " (host)";
            }else if(isHost){
                let kickBtn = document.createElement('button');
                let muteBtn = document.createElement('button');
                kickBtn.innerHTML = "Kick";
                muteBtn.innerHTML = "Mute";
                kickBtn.id = 'kick-btn';
                muteBtn.id = 'mute-btn';
                currentUserCont.appendChild(kickBtn);
                currentUserCont.appendChild(muteBtn);

                currentUserCont.querySelector('#userName').innerHTML = userName;
            }else{
                currentUserCont.querySelector('#userName').innerHTML = userName;
            }

            usrList.appendChild(currentUserCont);
        }

        //Users info init
        function InitUsers(data){
            for(let i = 0; i < data.users.length; i++){
                CreateUser(data.users[i].isHost, data.users[i].name);
            }
            if(isHost){
                let muteAllBtn = document.createElement('button');
                muteAllBtn.innerHTML = "Mute All";
                muteAllBtn.id = "muteAll-btn";
                optCont.appendChild(muteAllBtn);
            }
        }

        function OpenColors(){
            let drwContainer = document.querySelector('#colors-container');
            console.log(drwContainer.style.display);
            if(drwContainer.style.display !== "flex"){
                drwContainer.style.display = "flex";
            }else{
                drwContainer.style.display = "none";
            }
        }

        //Join form
        let joinForm = document.forms["joinForm"];

        //If user created the room
        if(hostCode){
            joinForm.elements.host.value = hostCode;
            $('#hostcheck').prop("checked", true);
            $('#hostID').prop("disabled", false);
        }

        //On check box click
        $("#hostcheck").click(function(event){
            if($('#hostID').prop("disabled") === false){
                $('#hostID').prop("disabled", true);
            }else{
                $('#hostID').prop("disabled", false);
            }
        });

        //On submitting the join form
        joinForm.addEventListener("submit", (event) =>{
            event.preventDefault();
            let data;
            let username = joinForm.elements.user.value.replace(/\s/g, "");

            //Join the desired room
            if($('#hostID').prop("disabled") === true || $("#hostID").value === ""){
                data = {
                    room: roomCode,
                    user: username,
                    host: undefined
                };
            }else{
                data = {
                    room: roomCode,
                    user: username,
                    host: joinForm.elements.host.value
                };
            }
            socket.emit("joinRoom", data);
        });

        //Hide and unhide the users list
        document.querySelector('#users-btn').addEventListener('click', ()=>{
            if(usrList.style.display !== "block"){
                usrList.style.display = "block";
            }else{
                usrList.style.display = "none";
            }
        });
    
        //Failure joining a room
        socket.on("err", (err) => errPar.innerHTML = err);
    
        //On successfully joining a room
        socket.on("suc", (data) => {
            let cursor = new Cursor(document.querySelector('#cursor-container'), document.querySelector('#cursor-helper').offsetTop);
            let drawColor = "rgb(0,0,0)";
            let drawSize = 15;
    
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext("2d");
            console.log(window.innerWidth, window.innerWidth -document.querySelector('#cursor-helper').offsetTop);
            canvas.height = document.body.clientHeight - document.querySelector('#cursor-helper').offsetTop;

            isHost = data.isHost;
            InitUsers(data);

            //Drawing functions

            //Client draw
            function Draw(event, color, size){
                if(!isMuted){
                    const rect = canvas.getBoundingClientRect();
                    const lastx = lastCoord.x - rect.left;
                    const lasty = lastCoord.y - rect.top;
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
            
                    ctx.strokeStyle = color;
                    ctx.lineWidth = size/zoomFactor;
                    ctx.lineCap = "round";
                    ctx.beginPath();
                    ctx.moveTo(lastx, lasty);
                    ctx.lineTo(x,y);
                    ctx.stroke();
                    ctx.closePath();
            
                    let data = {
                        x: (x * zoomFactor + worldOrigin.x * -1),
                        y:  (y * zoomFactor + worldOrigin.y * -1),
                        lastx:  (lastx * zoomFactor + worldOrigin.x * -1),
                        lasty:  (lasty * zoomFactor + worldOrigin.y * -1),
                        size:  size,
                        color:  color
                    };

                    currentPaths.push(data);
                }
        
                lastCoord= {x: event.clientX, y: event.clientY};
            }

            //Client draw optimize
            function OptimizeDraw(){
                let toleranceX = 150;
                let toleranceY = 40;

                for(let i = 1; i < currentPaths.length - 1; i++){
                    let xDist = Math.abs(currentPaths[i].x - currentPaths[i].lastx);
                    let yDist = Math.abs(currentPaths[i].y - currentPaths[i].lasty);

                    //Vertical line out of place
                    if(xDist < toleranceX && yDist > toleranceY){
                        currentPaths[i+1].lastx = currentPaths[i-1].x;
                        currentPaths[i+1].lasty = currentPaths[i-1].y;
                        currentPaths.splice(i, 1);
                    }

                    //Horizontal line out of place
                    if(yDist < toleranceY && xDist > toleranceX){
                        currentPaths[i+1].lastx = currentPaths[i-1].x;
                        currentPaths[i+1].lasty = currentPaths[i-1].y;
                        currentPaths.splice(i, 1);
                    }
                }

                for(let i = 0; i < currentPaths.length; i++){
                    //Send data to server
                    socket.emit("draw", currentPaths[i]);
                    paths.push(currentPaths[i]);
                }

                Drag(canvas, ctx);
                currentPaths = [];
            }

            //Draw a line
            function DrawPath(lastx, lasty, x, y, size, color){
                let data = {
                    x: x,
                    y:  y,
                    lastx:  lastx,
                    lasty:  lasty,
                    size:  size,
                    color:  color
                };
    
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.size/zoomFactor;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo((data.lastx + worldOrigin.x)/zoomFactor, (data.lasty + worldOrigin.y)/zoomFactor);
                ctx.lineTo((data.x + worldOrigin.x)/zoomFactor, (data.y + worldOrigin.y)/zoomFactor);
                ctx.stroke();
                ctx.closePath();
            }

            //Canvas drag
            function Drag(){
                ctx.clearRect(0,0, canvas.width, canvas.height);
                for(let i = 0; i < paths.length; i++){
                    DrawPath(paths[i].lastx,paths[i].lasty,paths[i].x,paths[i].y,paths[i].size,paths[i].color);
                }
            }

            //Server canvas init
            function InitCanvas(existingCanvas){
                for(let i = 0; i < existingCanvas.length; i++){
                    paths.push(existingCanvas[i]);
                    DrawPath(existingCanvas[i].lastx, existingCanvas[i].lasty, existingCanvas[i].x, existingCanvas[i].y, existingCanvas[i].size, existingCanvas[i].color);
                }
            }

            //Drag function
            function ResizeCanvas(){
                canvas.height = window.innerHeight - document.querySelector('#cursor-helper').offsetTop;
                canvas.width = document.body.clientWidth;
                Drag();
            }

            //Export paths in json format
            function DownloadPaths(exportObj, exportName){
                var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
                var downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href",     dataStr);
                downloadAnchorNode.setAttribute("download", exportName + ".json");
                document.body.appendChild(downloadAnchorNode); // required for firefox
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            }
            
            //Import paths
            function ImportPaths(){
                if(!isMuted){
                    let reader = new FileReader();
        
                    reader.addEventListener('error', ()=>{
                        console.log(`Error occured during reading`);
                        reader.abort();
                    });
        
                    reader.onloadend = function(){
                        let jsonResult = JSON.parse(reader.result);
                        for(let i = 0;i < jsonResult.paths.length; i++){
                            DrawPath(jsonResult.paths[i].lastx, jsonResult.paths[i].lasty, jsonResult.paths[i].x, jsonResult.paths[i].y, jsonResult.paths[i].size, jsonResult.paths[i].color);
                            paths.push(jsonResult.paths[i]);
                            socket.emit('draw', jsonResult.paths[i]);
                        }
                    }
        
                    if(importBtn.files > 1 || importBtn.files <= 0){
                        console.log("Error importing");
                    }else{
                        let obj = importBtn.files[0];
                        reader.readAsText(obj);
                    }
                }
            }
    
            //Draw the existing canvas
            if(data.canvas.length != 0){
                InitCanvas(data.canvas);
            }
    
            //Listening to other user draws/paths
            socket.on("draw", (data) => {
                paths.push(data);
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.size/zoomFactor;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo((data.lastx + worldOrigin.x)/zoomFactor, (data.lasty + worldOrigin.y)/zoomFactor);
                ctx.lineTo((data.x + worldOrigin.x)/zoomFactor, (data.y + worldOrigin.y)/zoomFactor);
                ctx.stroke();
                ctx.closePath();
            });

            socket.on('erase', (data) =>{
                paths.push(data);
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.size/zoomFactor;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo((data.lastx + worldOrigin.x)/zoomFactor, (data.lasty + worldOrigin.y)/zoomFactor);
                ctx.lineTo((data.x + worldOrigin.x)/zoomFactor, (data.y + worldOrigin.y)/zoomFactor);
                ctx.stroke();
                ctx.closePath();
            });

            //Listen to when a new user joins/leaves the room
            socket.on("usrJoin", (data) =>{
                CreateUser(data.isHost, data.user);
            });

            socket.on("usrLeft", (data) =>{
                let userCont = usrList.querySelector('#' + userPrefix + data.user);
                if(userCont){
                    usrList.removeChild(userCont);
                }
            });

            socket.on("usrMute", (data)=>{
                let userName = userPrefix + data.user
                console.log(userName);
                let mute = usrList.querySelector('#' + userName).querySelector('#mute-btn');
                console.log(mute);
                if(mute){
                    if(mute.classList.contains('active-btn')){
                        mute.classList.remove('active-btn');
                    }else{
                        mute.classList.add('active-btn');
                    }
                }
            });

            socket.on("kicked", () =>{
                socket.emit("disconnect");
                window.location.href = '/';
            });

            socket.on("timeOut", ()=>{
                window.location.href = '/';
            });

            socket.on("mute", () =>{
                isMuted = !isMuted;
            });
    
            canvas.addEventListener('mousedown', function(event){
                if(event.buttons === 1){
                    //Set the first drawing coord
                    lastCoord = {x: event.clientX, y: event.clientY};
                    Draw(event, drawColor, drawSize);
                }else if(event.buttons === 2){
                    //Set the last world coord
                    const rect = canvas.getBoundingClientRect();
                    cursor.HideCursor();
                    lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
                }
            });

            //Drag canvas
            canvas.addEventListener('contextmenu', function(event){
                event.preventDefault();
            });

            //Draw, erase or drag while moving mouse
            canvas.addEventListener('mousemove', function(event){
                if(event.buttons === 1){
                    Draw(event, drawColor, drawSize);
                }else if(event.buttons === 2){
                    const rect = canvas.getBoundingClientRect();
                    worldOrigin.x = worldOrigin.x + (event.clientX - rect.left - lastWorldCoord.x);
                    worldOrigin.y = worldOrigin.y + (event.clientY - rect.top - lastWorldCoord.y);

                    Drag();
                    lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
                }

                cursor.SetCoordinates(event.pageX, event.pageY);
            });
    
            canvas.addEventListener('mouseup', function(event){
                if(event.button === 0){
                    //Draw(canvas, event, drawColor, drawSize);
                    OptimizeDraw();
                }else if(event.button === 2){
                    cursor.ShowCursor();
                }
            });

            canvas.addEventListener('mouseout', function(){
                cursor.HideCursor();
            });

            canvas.addEventListener('mouseenter', function(){
                cursor.ShowCursor();
            })
    
            window.addEventListener('resize', function(){
                ResizeCanvas();
                cursor.offsetY = document.querySelector('#cursor-helper').offsetTop;
            });
            
            //Drawing tools
            document.querySelector('#userActions-container').addEventListener('click', function(event){
                event.stopPropagation();

                let currentTool = document.querySelector(".active-btn");

                switch(event.target.value){
                    case 'eraser':
                        drawCursor = "crosshair";
                        drawColor = "white";
                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        break;
                    case 'marker':
                        drawColor = "black";
                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        OpenColors();
                        break;
                    case 'drawAdd':
                        drawSize += 1;
                        document.querySelector('#drawSize-container').value = drawSize;
                        cursor.SetSize(drawSize);
                        break;
                    case 'drawRemove':
                        drawSize -= 1;
                        if(drawSize <= 0){
                            drawSize = 1;
                        }
                        document.querySelector('#drawSize-container').value = drawSize;
                        cursor.SetSize(drawSize);
                        break;
                    default:
                        break;
                }
            });

            document.querySelector('#colors-container').addEventListener('click', function(event){
                event.stopPropagation();
                if(event.target.tagName.toLowerCase() === "button"){
                    drawColor = event.target.value;
                    OpenColors();
                }
            });

            document.querySelector('#zoom-container').addEventListener('click', function(event){
                event.stopPropagation();

                switch(event.target.value){
                    case 'zoomOut':
                        zoomFactor += 0.1;
                        if(zoomFactor >= 2){
                            zoomFactor = 2;
                        }
                        Drag();
                        break;
                    case 'zoomIn':
                        zoomFactor -= 0.1;
                        if(zoomFactor <= 0.1){
                            zoomFactor = 0.1;
                        }
                        Drag();
                        break;
                    default:
                        break;
                }
            });

            document.querySelector('#drawSize-container').addEventListener('input', function(event){
                if(!isNaN(event.target.value) && event.target.value > 0){
                    drawSize = event.target.value;
                }else{
                    event.target.value = drawSize;
                }
                cursor.SetSize(drawSize);
            });

            //Mute, kick and mute all buttons
            usrList.addEventListener('click', function(event){

                switch(event.target.id){
                    case 'kick-btn':
                        Kick(event.target.parentNode.id);
                        break;
                    case 'mute-btn':
                        Mute(event.target.parentNode.id);
                        break;
                    case 'muteAll-btn':
                        let usersConts = document.querySelectorAll('.user-container');

                        //If everyone is already muted
                        if(muteAll){
                            for(let i=1; i < usersConts.length; i++){
                                //If user muted
                                if(usersConts[i].querySelector('#mute-btn').classList.contains('active-btn')){
                                    Mute(usersConts[i].id);
                                }
                            }
                        }else{
                            for(let i=1; i < usersConts.length; i++){
                                //If user not muted
                                if(!usersConts[i].querySelector('#mute-btn').classList.contains('active-btn')){
                                    Mute(usersConts[i].id);
                                }
                            }
                        }
    
                        muteAll = !muteAll;
                        break;
                    case 'export-btn':
                        let downloadedPaths = {
                            paths: paths
                        }
                        DownloadPaths(downloadedPaths, 'discordCanvas');
                        break;
                    default:
                        break;
                }
            });

            document.querySelector('#import-btn').addEventListener('click', function(){
                document.querySelector('#import-input').click();
            });

            importBtn.addEventListener('change', ImportPaths);
            
            cursor.ChangeCursor('marker', drawSize);
            //cursor.ShowCursor();

            document.querySelector('#drawSize-container').value = drawSize;
            document.body.querySelector('main').appendChild(canvas);
            document.body.querySelector('.menus-container').style.display = "block";
            joinForm.parentNode.removeChild(joinForm);
            ResizeCanvas(canvas);
        });
    }();
});
