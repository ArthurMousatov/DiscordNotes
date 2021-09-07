let App = {};
document.addEventListener('DOMContentLoaded', function(){
    App.whiteboard = function(){
        let connectQuery = {
            query: 'room=' + document.querySelector('#roomCode').innerHTML
        };
        const socket = io.connect(`${location.protocol}//${location.host}/`, connectQuery);
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

        function CreateUser(host, userName, isUserMuted){
            let currentUserCont = usrCont.cloneNode(true);
            currentUserCont.id = userPrefix + userName;
            currentUserCont.classList.add('user-container');

            //If the created user is a host
            if(host){
                currentUserCont.querySelector('#userName').innerHTML = userName + " (host)";
            }else if(isHost){
                let kickBtn = document.createElement('button');
                let muteBtn = document.createElement('button');
                kickBtn.innerHTML = "Kick";
                muteBtn.innerHTML = "Mute";
                kickBtn.id = 'kick-btn';
                muteBtn.id = 'mute-btn';

                //If server-wide mute is in effect
                if(isUserMuted){
                    muteBtn.classList.add('active-btn');
                }

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
                let deleteAllBtn = document.createElement('button');
                deleteAllBtn.innerHTML = "Reset Canvas";
                deleteAllBtn.id = "deleteAll-btn";
                muteAllBtn.innerHTML = "Mute All";
                muteAllBtn.id = "muteAll-btn";
                if(data.muteAll){
                    muteAllBtn.classList.add('active-btn');
                }
                optCont.appendChild(muteAllBtn);
                optCont.appendChild(deleteAllBtn);
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

            //Check if name contains illegal characters
            if(/^[a-z0-9]+$/i.test(username)){

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
            }else{
                errPar.innerHTML = "Username contains illegal characters"
            }
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
            window.location.href = '/error';
        });
    
        //Failure joining a room
        socket.on("err", (err) => errPar.innerHTML = err);
    
        //On successfully joining a room
        socket.on("suc", (data) => {
            const canvas = document.createElement('canvas');
            canvas.style.backgroundColor = "white";
            canvas.height = document.body.clientHeight - document.querySelector('#cursor-helper').offsetTop;

            let cursor = new Cursor(document.querySelector('#cursor-container'), document.querySelector('#cursor-helper').offsetTop);
            let currentPen = new Pen(3, "rgb(0,0,0)", "round", canvas, socket, cursor);

            isHost = data.isHost;
            isMuted = data.isMuted;


            if(isMuted){
                document.querySelector("#isMuted-heading").style.display = "block";
            }else{
                document.querySelector("#isMuted-heading").style.display = "none";
            }

            InitUsers(data);

            //Drag function
            function ResizeCanvas(){
                canvas.height = window.innerHeight - document.querySelector('#cursor-helper').offsetTop;
                canvas.width = document.body.clientWidth;
                currentPen.ReDraw();
            }

            function SnapShot(){
                let ctx = canvas.getContext("2d");

                let compositeOperation = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = "destination-over";
                ctx.fillStyle = "white";
                ctx.fillRect(0,0,canvas.width,canvas.height);

                let img = canvas.toDataURL("image/png");
                ctx.globalCompositeOperation = compositeOperation;
                currentPen.ReDraw();

                let downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", img);
                downloadAnchorNode.setAttribute("download", "snap.png");
                document.body.appendChild(downloadAnchorNode); // required for firefox
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
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

            socket.on('deleteAll', () =>{
                currentPen.DeleteCanvas();
            });

            socket.on("deleteElement", (data) =>{
                currentPen.DeleteElement(data);
            });

            socket.on("moveElement", (data) =>{
                for(let i = 0; i < currentPen.drawingArray.length; i++){
                    if(currentPen.drawingArray[i].userId === data.userId && currentPen.drawingArray[i].eventId === data.eventId){
                        currentPen.drawingArray[i].drawEvent = data.movedElement;
                        currentPen.ReDraw();
                        break;
                    }
                }
            });

            socket.on("usrJoin", (data) =>{
                CreateUser(data.isHost, data.user, data.isMuted);
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
                if(isMuted){
                    document.querySelector("#isMuted-heading").style.display = "block";
                }else{
                    document.querySelector("#isMuted-heading").style.display = "none";
                }
            });

            socket.on("usrMuteAll", (isMuteAll)=>{
                if(isHost){
                    let muteAllBtn = document.querySelector('#muteAll-btn');
                    if(muteAllBtn.classList.contains('active-btn')){
                        muteAllBtn.classList.remove('active-btn');
                    }else{
                        muteAllBtn.classList.add('active-btn');
                    }
                }else{
                    isMuted = isMuteAll;
                }

                if(isMuted){
                    document.querySelector("#isMuted-heading").style.display = "block";
                }else{
                    document.querySelector("#isMuted-heading").style.display = "none";
                }

                let usersConts = document.querySelectorAll('.user-container');
                if(isMuteAll){
                    for(let i = 1; i < usersConts.length; i++){
                        if(usersConts[i].querySelector('#mute-btn')){
                            usersConts[i].querySelector('#mute-btn').classList.add('active-btn');
                        }
                    }
                }else{
                    for(let i = 1; i < usersConts.length; i++){
                        if(usersConts[i].querySelector('#mute-btn')){
                            usersConts[i].querySelector('#mute-btn').classList.remove('active-btn');
                        }
                    }
                }
            });

            //Main canvas events
    
            canvas.addEventListener('mousedown', function(event){
                if(event.buttons === 1 && !isMuted){
                    //Set the first drawing coord
                    currentPen.lastCoord = {x: event.clientX, y: event.clientY};
                    currentPen.Draw(event);
                }else if(event.buttons === 2){
                    //Set the last world coord
                    const rect = canvas.getBoundingClientRect();
                    currentPen.cursor.HideCursor();
                    lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
                }
            });

            window.addEventListener('keyup', (event) =>{
                if(event.code === 'KeyZ' && event.ctrlKey)
                    currentPen.UndoAction();
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
                    if(document.querySelector('#selectedDiv')){
                        document.querySelector('#selectedDiv').remove();
                    }
                    const rect = canvas.getBoundingClientRect();
                    currentPen.worldOrigin.x = currentPen.worldOrigin.x + (event.clientX - rect.left - lastWorldCoord.x);
                    currentPen.worldOrigin.y = currentPen.worldOrigin.y + (event.clientY - rect.top - lastWorldCoord.y);

                    currentPen.ReDraw();
                    lastWorldCoord = {x: (event.clientX - rect.left), y: (event.clientY - rect.top)};
                }

                currentPen.cursor.SetCoordinates(event.pageX, event.pageY);
            });
    
            canvas.addEventListener('mouseup', function(event){
                if(event.button === 0 && !isMuted){
                    currentPen.OptimizeDraw();
                }else if(event.button === 2){
                    currentPen.cursor.ShowCursor();
                }
            });

            canvas.addEventListener('mouseout', function(){
                currentPen.cursor.HideCursor();
            });

            canvas.addEventListener('mouseenter', function(){
                currentPen.cursor.ShowCursor();
            })
    
            window.addEventListener('resize', function(){
                ResizeCanvas();
                currentPen.cursor.offsetY = document.querySelector('#cursor-helper').offsetTop;
            });
            
            //Drawing tools
            document.querySelector('#userActions-container').addEventListener('click', function(event){
                event.stopPropagation();

                let currentTool = document.querySelector(".active-btn");

                switch(event.target.value){
                    case 'eraser':
                        currentPen.ChangeType('eraser');

                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        break;
                    case 'marker':
                        currentPen.ChangeType('marker');

                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        break;
                    case 'text':
                        currentPen.ChangeType('text');

                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        break;
                    case 'smart':
                        currentPen.ChangeType('smart');

                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        break;
                    case 'rect':
                        currentPen.ChangeType('rect');

                        currentTool.classList.remove("active-btn");
                        event.target.classList.add("active-btn");
                        break;
                    default:
                        break;
                }
            });

            document.querySelector('#drawSize-range').addEventListener('change', (event)=>{
                event.stopPropagation();
                currentPen.ChangeSize(event.target.value);
            });

            document.querySelector('#colors-container').addEventListener('click', function(event){
                event.stopPropagation();

                if(event.target.tagName.toLowerCase() === "button"){
                    currentPen.color = event.target.value;
                    currentPen.CloseSizeColors();
                }
            });

            document.querySelector('#zoom-container').addEventListener('click', function(event){
                event.stopPropagation();

                if(document.querySelector('#selectedDiv')){
                    document.querySelector('#selectedDiv').remove();
                }

                switch(event.target.value){
                    case 'zoomOut':
                        currentPen.zoomFactor += 0.1;
                        if(currentPen.zoomFactor >= 5){
                            currentPen.zoomFactor = 5;
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

            //Mute, kick and mute all buttons
            usrList.addEventListener('click', (event)=>{

                switch(event.target.id){
                    case 'kick-btn':
                        Kick(event.target.parentNode.id);
                        break;
                    case 'mute-btn':
                        if(!muteAll){
                            Mute(event.target.parentNode.id);
                        }
                        break;
                    case 'muteAll-btn':
                        socket.emit('usrMuteAll');

                        let usersConts = document.querySelectorAll('.user-container');
                        if(!event.target.classList.contains('active-btn')){
                            for(let i = 1; i < usersConts.length; i++){
                                if(usersConts[i].querySelector('#mute-btn')){
                                    usersConts[i].querySelector('#mute-btn').classList.add('active-btn');
                                }
                            }
                        }else{
                            for(let i = 1; i < usersConts.length; i++){
                                if(usersConts[i].querySelector('#mute-btn')){
                                    usersConts[i].querySelector('#mute-btn').classList.remove('active-btn');
                                }
                            }
                        }

                        if(event.target.classList.contains('active-btn')){
                            event.target.classList.remove('active-btn');
                        }else{
                            event.target.classList.add('active-btn');
                        }

                        break;
                    case 'export-btn':
                        currentPen.DownloadPaths('discordCanvas');
                        break;
                    case 'deleteAll-btn':
                        if(isHost){
                            currentPen.DeleteCanvas();
                            socket.emit('deleteAll');
                        }
                        break;
                    default:
                        break;
                }
            });

            document.querySelector('#import-btn').addEventListener('click', function(){
                document.querySelector('#import-input').click();
            });
            importBtn.addEventListener('change', () =>{
                currentPen.ImportPaths(importBtn, isHost, isMuted, muteAll);
            });

            document.querySelector('#snap-btn').addEventListener('click', SnapShot)
            
            cursor.ChangeCursor('marker', currentPen.size * currentPen.basePenFactor);
            document.querySelector('#drawSize-container').value = currentPen.size;

            document.body.querySelector('main').appendChild(canvas);
            document.body.querySelector('.menus-container').style.display = "block";
            joinForm.parentNode.removeChild(joinForm);

            ResizeCanvas(canvas);
        });
    }();
});
