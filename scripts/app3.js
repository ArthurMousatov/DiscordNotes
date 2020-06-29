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
    
        //Tool element
        const toolContainer = document.querySelector('#tools-container');
    
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

        //User variables
        let isHost = false;
        let isMuted = false;
        const userPrefix = 'user-';
        
        //Client timeout
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
        }

        //Kick a user
        function Kick(usr){
            let userName = usr.slice(userPrefix.length, usr.length);

            let data = {
                user: userName
            };
            socket.emit('usrKick', data);
        }

        //Mute a user
        function Mute(usr){
            let userName = usr.slice(userPrefix.length, usr.length);
            
            let data = {
                user: userName
            };
            socket.emit('usrMute', data);
        }

        //Users info init
        function InitUsers(data){
            let currentUserCont = usrCont.cloneNode(true);
            let hostUserCont = usrCont.cloneNode(true);
            hostUserCont.classList.add('user-container');
            currentUserCont.classList.add('user-container');

            //Check if the user is a host
            if(isHost === true){
                let kickBtn = document.createElement('button');
                let muteBtn = document.createElement('button');
                kickBtn.innerHTML = "Kick";
                muteBtn.innerHTML = "Mute";
                kickBtn.id = 'kick-btn';
                muteBtn.id = 'mute-btn';
                currentUserCont.appendChild(kickBtn);
                currentUserCont.appendChild(muteBtn);
            }

            for(let i = 0; i < data.users.length; i++){
                if(data.users[i].isHost){
                    hostUserCont.querySelector('#userName').innerHTML = data.users[i].name + " (host)";
                    hostUserCont.id = data.users[i].name;
                    usrList.appendChild(hostUserCont);
                }else{
                    currentUserCont.querySelector('#userName').innerHTML = data.users[i].name;
                    currentUserCont.id = userPrefix + data.users[i].name;
                    usrList.appendChild(currentUserCont);
                }
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
        joinForm.addEventListener("submit", function(event){
            event.preventDefault();
            let data;

            //Join the desired room
            if($('#hostID').prop("disabled") === true || $("#hostID").value === ""){
                data = {
                    room: roomCode,
                    user: joinForm.elements.user.value,
                    host: undefined
                };
            }else{
                data = {
                    room: roomCode,
                    user: joinForm.elements.user.value,
                    host: joinForm.elements.host.value
                };
            }
            socket.emit("joinRoom", data);
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
            console.log(isHost);
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

            //Listen to when a new user joins the room
            socket.on("usrJoin", (data) =>{
                let currentUserCont = usrCont.cloneNode(true);

                if(data.isHost){
                    currentUserCont.querySelector('#userName').innerHTML = data.user + " (host)";
                }else if(isHost){
                    let kickBtn = document.createElement('button');
                    let muteBtn = document.createElement('button');
                    kickBtn.innerHTML = "Kick";
                    muteBtn.innerHTML = "Mute";
                    kickBtn.id = 'kick-btn';
                    muteBtn.id = 'mute-btn';
                    currentUserCont.appendChild(kickBtn);
                    currentUserCont.appendChild(muteBtn);
                    currentUserCont.querySelector('#userName').innerHTML = data.user;
                }else{
                    currentUserCont.querySelector('#userName').innerHTML = data.user;
                }
                currentUserCont.id = userPrefix + data.user;
                currentUserCont.classList.add('user-container');
                usrList.appendChild(currentUserCont);
            });

            socket.on("usrLeft", (data) =>{
                let userCont = usrList.querySelector('#' + userPrefix + data.user);
                if(userCont){
                    usrList.removeChild(userCont);
                }
            });

            socket.on("kicked", () =>{
                socket.emit("disconnect");
                window.location.href = '/';
            });

            socket.on("muted", () =>{
                isMuted = !isMuted;
            });
    
            canvas.addEventListener('mousedown', function(event){
                if(!isMuted){
                    if(event.buttons === 1){

                        //Set the first drawing coord
                        lastCoord = {x: event.clientX, y: event.clientY};
                    }else if(event.buttons === 2){
    
                        //Set the last world coord
                        lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
                    }
                }
            });

            //Erase
            canvas.addEventListener('contextmenu', function(event){
                event.preventDefault();
            });

            //Draw or drag while moving mouse
            canvas.addEventListener('mousemove', function(event){
                if(!isMuted){
                    if(event.buttons === 1){
                        Draw(canvas, event, drawColor, drawSize);
                    }else if(event.buttons === 2){
                        document.body.style.cursor = "grab";
                        worldOrigin.x = worldOrigin.x + (event.clientX - lastWorldCoord.x);
                        worldOrigin.y = worldOrigin.y + (event.clientY - lastWorldCoord.y);
                        Drag(canvas, ctx);
                        lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
                    }
                }
            });
    
            canvas.addEventListener('mouseup', function(event){
                if(!isMuted){
                    if(event.buttons === 1){
                        Draw(canvas, event, drawColor, drawSize);
                    }
                }
                document.body.style.cursor = "default";
            });
    
            window.addEventListener('resize', function(){
                ResizeCanvas(canvas, ctx);
            });
    
            toolContainer.addEventListener('mousedown', function(event){
                event.stopPropagation();
                console.log(event.target);

                //Check if hit a non-active tool
                if(event.target.className !== "active-btn" && event.target.tagName.toLowerCase() === 'button'){
                    let currentTool = document.querySelector(".active-btn");
                    currentTool.classList.remove("active-btn");
                    event.target.classList.add("active-btn");
                    drawColor = event.target.value;

                    //If eraser tool
                    if(event.target.value === 'white'){
                        drawSize = 40;
                    }else{
                        drawSize = 10;
                    }
                }
            });

            usrList.addEventListener('mousedown', function(event){
                if(event.target.id === 'kick-btn'){
                    Kick(event.target.parentNode.id);
                }
                
                if(event.target.id === 'mute-btn'){
                    Mute(event.target.parentNode.id);

                    if(event.target.classList.contains("active-btn")){
                        event.target.classList.remove("active-btn");
                    }else{
                        event.target.classList.add("active-btn");
                    }
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