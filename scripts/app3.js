let App = {};
document.addEventListener('DOMContentLoaded', function(){
    App.whiteboard = function(){
        let connectQuery = {
            query: 'room=' + document.querySelector('#roomCode').innerHTML
        };
        //const socket = io.connect('http://localhost:3000/', connectQuery);
        const socket = io.connect('https://discord-notes.herokuapp.com/', connectQuery);
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
        let lastWorldCoord;

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

        //If connected room doesn't exist
        socket.on("badRoom", () => {
            window.location.href = '/';
        });
    
        //Failure joining a room
        socket.on("err", (err) => errPar.innerHTML = err);
    
        //On successfully joining a room
        socket.on("suc", (data) => {
            const canvas = document.createElement('canvas');
            canvas.height = document.body.clientHeight - document.querySelector('#cursor-helper').offsetTop;

            let cursor = new Cursor(document.querySelector('#cursor-container'), document.querySelector('#cursor-helper').offsetTop);
            let currentPen = new Pen(15, "rgb(0,0,0)", "round", canvas, socket);

            isHost = data.isHost;
            InitUsers(data);

            //Drag function
            function ResizeCanvas(){
                canvas.height = window.innerHeight - document.querySelector('#cursor-helper').offsetTop;
                canvas.width = document.body.clientWidth;
                currentPen.ReDraw();
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
                            currentPen.DrawPath(jsonResult.paths[i].lastx, jsonResult.paths[i].lasty, jsonResult.paths[i].x, jsonResult.paths[i].y, jsonResult.paths[i].size, jsonResult.paths[i].color);
                            currentPen.paths.push(jsonResult.paths[i]);
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
                for(let i = 0; i < data.canvas.length; i++){
                    currentPen.DrawRequest(data.canvas[i]);
                }
            }

            //Socket requests
            socket.on("draw", (data) => {
                currentPen.DrawRequest(data);
            });

            socket.on('erase', (data) =>{
                currentPen.DrawRequest(data);
            });

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
                let mute = usrList.querySelector('#' + userName).querySelector('#mute-btn');
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
                if(event.buttons === 1 && !isMuted){
                    //Set the first drawing coord
                    currentPen.lastCoord = {x: event.clientX, y: event.clientY};
                    currentPen.Draw(event);
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
                if(event.buttons === 1 && !isMuted){
                    currentPen.Draw(event);
                }else if(event.buttons === 2){
                    const rect = canvas.getBoundingClientRect();
                    currentPen.worldOrigin.x = currentPen.worldOrigin.x + (event.clientX - rect.left - lastWorldCoord.x);
                    currentPen.worldOrigin.y = currentPen.worldOrigin.y + (event.clientY - rect.top - lastWorldCoord.y);

                    currentPen.ReDraw();
                    lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
                }

                cursor.SetCoordinates(event.pageX, event.pageY);
            });
    
            canvas.addEventListener('mouseup', function(event){
                if(event.button === 0 && !isMuted){
                    currentPen.OptimizeDraw();
                }else if(event.button === 2){
                    cursor.ShowCursor();
                }
0            });

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
                        currentPen.ChangeType('path');
                        drawCursor = "crosshair";
                        currentPen.color = "white";
                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        break;
                    case 'marker':
                        currentPen.ChangeType('path');
                        currentPen.color = "black";
                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        OpenColors();
                        break;
                    case 'text':
                        currentPen.ChangeType('text');
                        currentPen.color = "black";
                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        OpenColors();
                        break;
                    case 'drawAdd':
                        currentPen.size += 1;
                        document.querySelector('#drawSize-container').value = currentPen.size;
                        cursor.SetSize(currentPen.size);
                        break;
                    case 'drawRemove':
                        currentPen.size -= 1;
                        if(currentPen.size <= 0){
                            currentPen.size = 1;
                        }
                        document.querySelector('#drawSize-container').value = currentPen.size;
                        cursor.SetSize(currentPen.size);
                        break;
                    default:
                        break;
                }
            });

            document.querySelector('#colors-container').addEventListener('click', function(event){
                event.stopPropagation();
                if(event.target.tagName.toLowerCase() === "button"){
                    currentPen.color = event.target.value;
                    OpenColors();
                }
            });

            document.querySelector('#zoom-container').addEventListener('click', function(event){
                event.stopPropagation();

                switch(event.target.value){
                    case 'zoomOut':
                        currentPen.zoomFactor += 0.1;
                        if(currentPen.zoomFactor >= 2){
                            currentPen.zoomFactor = 2;
                        }
                        currentPen.ReDraw();
                        break;
                    case 'zoomIn':
                        currentPen.zoomFactor -= 0.1;
                        if(currentPen.zoomFactor <= 0.1){
                            currentPen.zoomFactor = 0.1;
                        }
                        currentPen.ReDraw();
                        break;
                    default:
                        break;
                }
            });

            document.querySelector('#drawSize-container').addEventListener('input', function(event){
                if(!isNaN(event.target.value) && event.target.value > 0){
                    currentPen.size = event.target.value;
                }else{
                    event.target.value = currentPen.size;
                }
                cursor.SetSize(currentPen.size);
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
                            paths: currentPen.paths
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
            
            cursor.ChangeCursor('marker', currentPen.size);
            //cursor.ShowCursor();

            document.querySelector('#drawSize-container').value = currentPen.size;
            document.body.querySelector('main').appendChild(canvas);
            document.body.querySelector('.menus-container').style.display = "block";
            joinForm.parentNode.removeChild(joinForm);

            ResizeCanvas(canvas);
        });
    }();
});
