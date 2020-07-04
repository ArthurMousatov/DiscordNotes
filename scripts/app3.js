let App = {};
document.addEventListener('DOMContentLoaded', function(){
    App.whiteboard = function(){
        //const socket = io.connect('http://localhost:3000/')
        const socket = io.connect('https://discord-notes.herokuapp.com/');
        const roomCode = document.querySelector('#roomCode').innerHTML;
        let hostCode;
        if(document.querySelector('#hostCode')){
            hostCode = document.querySelector('#hostCode').innerHTML;
        }
        const errPar = document.querySelector('#error-paragraph');
        const usrList = document.querySelector('.users-list');
        const usrCont = document.querySelector('#user-clone-container');
        const optCont = document.querySelector('.options-container');
    
        //Tool element
        const toolContainer = document.querySelector('#tools-container');
        let isErasing = false;
    
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
        let currentPaths = [];
        let lastCoord;

        //User variables
        let isHost = false;
        let isMuted = false;
        let muteAll = false;
        const userPrefix = 'user-';
        
        //Client timeout
        function TimeOut(){
            socket.emit("timeOut");
        }

        //Client draw optimize
        function OptimizeDraw(canvas, ctx){
            let toleranceX = 20;
            let toleranceY = 20;

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
    
        //Client draw
        function Draw(canvas, event, color, size){
            if(!isMuted){
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
        
                let data = {
                    x: x + worldOrigin.x * -1,
                    y:  y + worldOrigin.y * -1,
                    lastx:  lastx + worldOrigin.x * -1,
                    lasty:  lasty + worldOrigin.y * -1,
                    size:  size,
                    color:  color
                };

                currentPaths.push(data);
            }
    
            lastCoord= {x: event.clientX, y: event.clientY};
    
            clearInterval(timeOutID);
            timeOutID = setInterval(TimeOut, timeOutLimit);
        }

        //Client erase
        function Erase(canvas, event){
            if(!isMuted){
                const rect = canvas.getBoundingClientRect();
                const ctx = canvas.getContext("2d");
                const x = event.clientX - rect.left + worldOrigin.x * -1;
                const y = event.clientY - rect.top + worldOrigin.y * -1;
                let tolerance = 20;
                
                for(let i = 0; i < paths.length; i++){
                    var linepoint = linepointNearestMouse(paths[i], x, y);

                    var dx = x - linepoint.x;
                    var dy = y - linepoint.y;
                    var distance = Math.abs(Math.sqrt(dx * dx + dy * dy));
    
                    if (distance < tolerance) {
                        let useX = paths[i].x;
                        let useY = paths[i].y;
                        let useLastX = paths[i].lastx;
                        let useLastY = paths[i].lasty;
                        
                        let data = {
                            x: useX,
                            y: useY,
                            lastx: useLastX,
                            lasty: useLastY
                        };
                        socket.emit('erase', data);
                        paths.splice(i, 1);
                    }
                }
                Drag(canvas, ctx);
            }
        }

        // calculate the point on the line that's 
        // nearest to the mouse position
        function linepointNearestMouse(line, x, y) {
            lerp = function(a, b, x) {
            return (a + x * (b - a));
            };
            var dx = line.x - line.lastx;
            var dy = line.y - line.lasty;
            var t = ((x - line.x) * dx + (y - line.y) * dy) / (dx * dx + dy * dy);
            var lineX = lerp(line.x, line.lastx, t);
            var lineY = lerp(line.y, line.lasty, t);
            return ({
            x: lineX,
            y: lineY
            });
        };
    
        //Server canvas init
        function InitCanvas(canvas, ctx){
            for(let i = 0; i < canvas.length; i++){
                ctx.strokeStyle = canvas[i].color;
                ctx.lineWidth = canvas[i].size;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(canvas[i].lastx + worldOrigin.x, canvas[i].lasty + worldOrigin.y);
                ctx.lineTo(canvas[i].x + worldOrigin.x,canvas[i].y + worldOrigin.y);
                ctx.stroke();
                ctx.closePath();
                paths.push(canvas[i]);
            }
        }

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
        
        //Drag function
        function ResizeCanvas(canvas, ctx){
            canvas.width = document.body.clientWidth;
            Drag(canvas, canvas.getContext('2d'));
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
            if(usrList.style.display === "none"){
                usrList.style.display = "block";
            }else{
                usrList.style.display = "none";
            }
        });
    
        //Failure joining a room
        socket.on("err", (err) => errPar.innerHTML = err);
    
        //On successfully joining a room
        socket.on("suc", (data) => {
            let drawColor = "rgb(0,0,0)";
            let drawSize = 10;
    
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext("2d");
            const rect = canvas.getBoundingClientRect();
            canvas.height = 900;
    
            //Draw the existing canvas
            if(data.canvas.length != 0){
                InitCanvas(data.canvas, ctx);
            }
            
            isHost = data.isHost;
            InitUsers(data);
    
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

            socket.on('erase', (data) =>{
                for(let i = 0; i < paths.length; i++){
                    if (paths[i].x === data.x && paths[i].y === data.y && paths[i].lastx === data.lastx && paths[i].lasty === data.lasty) {
                        paths.splice(i, 1);
                    }
                }
    
                Drag(canvas, ctx);
            })

            //Listen to when a new user joins the room
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

            socket.on("mute", () =>{
                isMuted = !isMuted;
            });
    
            canvas.addEventListener('mousedown', function(event){
                if(event.buttons === 1 && isErasing){
                    Erase(canvas, event);
                }else if(event.buttons === 1 && !isErasing){
                    //Set the first drawing coord
                    lastCoord = {x: event.clientX, y: event.clientY};
                    Draw(canvas, event, drawColor, drawSize);
                }else if(event.buttons === 2){

                    //Set the last world coord
                    lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
                }
            });

            //Drag canvas
            canvas.addEventListener('contextmenu', function(event){
                event.preventDefault();
            });

            //Draw, erase or drag while moving mouse
            canvas.addEventListener('mousemove', function(event){
                if(event.buttons === 1 && isErasing){
                    Erase(canvas, event);
                }else if(event.buttons === 1){
                    Draw(canvas, event, drawColor, drawSize);
                }else if(event.buttons === 2){
                    document.body.style.cursor = "grab";
                    worldOrigin.x = worldOrigin.x + (event.clientX - rect.left - lastWorldCoord.x);
                    worldOrigin.y = worldOrigin.y + (event.clientY - rect.top - lastWorldCoord.y);
                    Drag(canvas, ctx);
                    lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
                }
            });
    
            canvas.addEventListener('mouseup', function(event){
                if(event.button === 0 && !isErasing){
                    Draw(canvas, event, drawColor, drawSize);
                    OptimizeDraw(canvas, ctx);
                }
                document.body.style.cursor = "default";
            });
    
            window.addEventListener('resize', function(){
                ResizeCanvas(canvas, ctx);
            });
            
            //Drawing tools
            toolContainer.addEventListener('click', function(event){
                event.stopPropagation();

                //Check if hit a non-active tool
                if(event.target.className !== "active-btn" && event.target.tagName.toLowerCase() === 'button'){
                    let currentTool = document.querySelector(".active-btn");
                    currentTool.classList.remove("active-btn");
                    event.target.classList.add("active-btn");

                    //If eraser tool
                    if(event.target.value === 'eraser'){
                        isErasing = true;
                    }else{
                        isErasing = false;
                        drawColor = event.target.value;
                        drawSize = 10;
                    }
                }
            });

            //Mute, kick and mute all buttons
            usrList.addEventListener('click', function(event){
                if(event.target.id === 'kick-btn'){
                    Kick(event.target.parentNode.id);
                }
                
                if(event.target.id === 'mute-btn'){
                    Mute(event.target.parentNode.id);
                }

                if(event.target.id === 'muteAll-btn'){
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
                }
            });
    
    
            timeOutID = setInterval(TimeOut, timeOutLimit);
            document.body.querySelector('main').appendChild(canvas);
            document.body.querySelector('.menus-container').style.display = "block";
            joinForm.parentNode.removeChild(joinForm);
            ResizeCanvas(canvas);
        });
    }();
});