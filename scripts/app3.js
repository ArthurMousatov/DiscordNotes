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
        let CurrentUserName;
        let isHost = false;
        let isMuted = false;
        let muteAll = false;
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
    
            toolContainer.addEventListener('click', function(event){
                event.stopPropagation();

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