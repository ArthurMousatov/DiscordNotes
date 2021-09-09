import Cursor from "./Cursor.js";
import Pen from "./Pen.js";
import Socket from "./Socket.js";

export const roomCode = document.querySelector('#roomCode').innerHTML;
export const hostCode = document.querySelector('#hostCode') ? document.querySelector('#hostCode').innerHTML : null;
export const connectionQuery = {
    query: 'room=' + roomCode,
    secure: true
}
export const webUrl = `${location.protocol}//${location.host}/`;
export const userPrefix = 'user-';
export const socket = new Socket();
export const canvas = document.createElement('canvas');

export const CreateUser = (isUserHost, userName, isUserMuted) => {
    let newUserContainer = userContainer.cloneNode(true);
    newUserContainer.id = userPrefix + userName;
    newUserContainer.classList.add('user-container');

    //If the created user is a host
    if(isUserHost){
        newUserContainer.querySelector('#userName').innerHTML = userName + " (host)";
    }else if(socket.getUserSocket().isHost){
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

        newUserContainer.appendChild(kickBtn);
        newUserContainer.appendChild(muteBtn);

        newUserContainer.querySelector('#userName').innerHTML = userName;
    }else{
        newUserContainer.querySelector('#userName').innerHTML = userName;
    }

    userList.appendChild(newUserContainer);
}
export const InitUsers = (users, isHost, muteAll) => {

    for(let i = 0; i <users.length; i++){
        CreateUser(users[i].isHost, users[i].name);
    }
    
    if(isHost){
        let muteAllBtn = document.createElement('button');
        let deleteAllBtn = document.createElement('button');

        deleteAllBtn.innerHTML = "Reset Canvas";
        deleteAllBtn.id = "deleteAll-btn";
        muteAllBtn.innerHTML = "Mute All";
        muteAllBtn.id = "muteAll-btn";

        if(muteAll){
            muteAllBtn.classList.add('active-btn');
        }

        optionContainer.appendChild(muteAllBtn);
        optionContainer.appendChild(deleteAllBtn);
    }
}
export let cursor;
export let pen;

const errorParagraph = document.querySelector('#error-paragraph');
const joinForm = document.forms["#joinForm"];
const userContainer = document.querySelector('#user-clone-container');
const optionContainer = document.querySelector('.options-container');
const importButton = document.querySelector('#import-input');
const userList = document.querySelector('.users-list');

joinForm.addEventListener('submit', (event)=>{
    event.preventDefault();
    let data;
    let username = joinForm.elements.user.value.replace(/\s/g, "");
    const hostIdInput = joinForm.querySelector('#hostID');

    //Check if name contains illegal characters
    if(/^[a-z0-9]+$/i.test(username)){

        //Join the desired room
        if(hostIdInput.disabled === true || hostIdInput.value === ""){
            data = {
                room: roomCode,
                user: username,
                host: undefined
            };
        }else{
            data = {
                room: roomCode,
                user: username,
                host: joinForm.elements["host"].value
            };
        }
        socket.getUserSocket().emit("joinRoom", data);
    }else{
        errorParagraph.innerHTML = "Username contains illegal characters"
    }
});
joinForm.elements["hostCheck"].addEventListener('click', ()=>{
    joinForm["hostID"].disabled = !joinForm["hostID"].disabled;
})
document.querySelector('#users-btn').addEventListener('click', ()=>{
    userList.style.display = userList.style.display !== "block" ? "block" : "none";
});

if(hostCode){
    joinForm.elements["host"].value = hostCode;
    joinForm.elements["hostID"].disabled = false;
    joinForm.elements["hostCheck"].checked = true;
}

let lastWorldCoord;

socket.getUserSocket().on("err", (error) => errorParagraph.innerHTML = error);

socket.getUserSocket().on("suc", (data) =>{
    canvas.style.backgroundColor = "white";
    canvas.height = document.body.clientHeight - document.querySelector('#cursor-helper').offsetTop;

    cursor = new Cursor(document.querySelector('#cursor-container'), document.querySelector('#cursor-helper').offsetTop);
    pen = new Pen(3, "rgb(0,0,0)", "round", canvas, socket.getUserSocket(), cursor);

    socket.isHost = data.isHost;
    socket.isMuted = data.isMuted;

    document.querySelector("#isMuted-heading").style.display = socket.isMuted ? "block" : "none";
    InitUsers(data);

    //Draw the existing canvas
    if(data.canvas.length != 0){
        for(let i = 0; i < data.canvas.length; i++){
            pen.DrawRequest(data.canvas[i]);
        }
    }

    //Drag function
    function ResizeCanvas(){
        canvas.height = window.innerHeight - document.querySelector('#cursor-helper').offsetTop;
        canvas.width = document.body.clientWidth;
        pen.ReDraw();
    }

    function SnapShot(){
        let ctx = canvas.getContext("2d");

        let compositeOperation = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "white";
        ctx.fillRect(0,0,canvas.width,canvas.height);

        let img = canvas.toDataURL("image/png");
        ctx.globalCompositeOperation = compositeOperation;
        pen.ReDraw();

        let downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", img);
        downloadAnchorNode.setAttribute("download", "snap.png");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    //Socket requests
    socket.getUserSocket().on("draw", (data) => {
        pen.DrawRequest(data);
    });

    socket.getUserSocket().on('erase', (data) =>{
        pen.DrawRequest(data);
    });

    socket.getUserSocket().on('deleteAll', () =>{
        pen.DeleteCanvas();
    });

    socket.getUserSocket().on("deleteElement", (data) =>{
        pen.DeleteElement(data);
    });

    socket.getUserSocket().on("moveElement", (data) =>{
        for(let i = 0; i < pen.drawingArray.length; i++){
            if(pen.drawingArray[i].userId === data.userId && pen.drawingArray[i].eventId === data.eventId){
                pen.drawingArray[i].drawEvent = data.movedElement;
                pen.ReDraw();
                break;
            }
        }
    });

    socket.getUserSocket().on("usrJoin", (data) =>{
        CreateUser(data.isHost, data.user, data.isMuted);
    });

    socket.getUserSocket().on("usrLeft", (data) =>{
        let userCont = userList.querySelector('#' + userPrefix + data.user);
        if(userCont){
            userList.removeChild(userCont);
        }
    });

    socket.getUserSocket().on("usrMute", (data)=>{
        let userName = userPrefix + data.user;
        let mute = userList.querySelector('#' + userName).querySelector('#mute-btn');
        if(mute){
            if(mute.classList.contains('active-btn')){
                mute.classList.remove('active-btn');
            }else{
                mute.classList.add('active-btn');
            }
        }
    });

    socket.getUserSocket().on("kicked", () =>{
        socket.getUserSocket().emit("disconnect");
        window.location.href = '/';
    });

    socket.getUserSocket().on("timeOut", ()=>{
        window.location.href = '/';
    });

    socket.getUserSocket().on("mute", () =>{
        socket.isMuted = !socket.isMuted;
        document.querySelector("#isMuted-heading").style.display = socket.isMuted ?  "block" : "none";
    });

    socket.getUserSocket().on("usrMuteAll", (isMuteAll)=>{
        if(socket.isHost){
            let muteAllBtn = document.querySelector('#muteAll-btn');

            if(muteAllBtn.classList.contains('active-btn')){
                muteAllBtn.classList.remove('active-btn');
            }else{
                muteAllBtn.classList.add('active-btn');
            }
        }else{
            socket.isMuted = isMuteAll;
        }

        if(socket.isMuted){
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
        if(event.buttons === 1 && !socket.isMuted){
            //Set the first drawing coord
            pen.lastCoord = {x: event.clientX, y: event.clientY};
            pen.Draw(event);
        }else if(event.buttons === 2){
            //Set the last world coord
            const rect = canvas.getBoundingClientRect();
            pen.cursor.HideCursor();
            lastWorldCoord = {x: event.clientX - rect.left, y: event.clientY - rect.top};
        }
    });

    window.addEventListener('keyup', (event) =>{
        if(event.code === 'KeyZ' && event.ctrlKey)
            pen.UndoAction();
    });

    //Drag canvas
    canvas.addEventListener('contextmenu', function(event){
        event.preventDefault();
    });

    //Draw, erase or drag while moving mouse
    canvas.addEventListener('mousemove', function(event){
        if(event.buttons === 1 && !socket.isMuted){
            pen.Draw(event);
        }else if(event.buttons === 2){
            if(document.querySelector('#selectedDiv')){
                document.querySelector('#selectedDiv').remove();
            }
            const rect = canvas.getBoundingClientRect();
            pen.worldOrigin.x = pen.worldOrigin.x + (event.clientX - rect.left - lastWorldCoord.x);
            pen.worldOrigin.y = pen.worldOrigin.y + (event.clientY - rect.top - lastWorldCoord.y);

            pen.ReDraw();
            lastWorldCoord = {x: (event.clientX - rect.left), y: (event.clientY - rect.top)};
        }

        pen.cursor.SetCoordinates(event.pageX, event.pageY);
    });

    canvas.addEventListener('mouseup', function(event){
        if(event.button === 0 && !socket.isMuted){
            pen.OptimizeDraw();
        }else if(event.button === 2){
            pen.cursor.ShowCursor();
        }
    });

    canvas.addEventListener('mouseout', function(){
        pen.cursor.HideCursor();
    });

    canvas.addEventListener('mouseenter', function(){
        pen.cursor.ShowCursor();
    })

    window.addEventListener('resize', function(){
        ResizeCanvas();
        pen.cursor.offsetY = document.querySelector('#cursor-helper').offsetTop;
    });

    //Drawing tools
    document.querySelector('#userActions-container').addEventListener('click', function(event){
        event.stopPropagation();

        let currentTool = document.querySelector(".active-btn");

        switch(event.target.value){
            case 'eraser':
                pen.ChangeType('eraser');

                currentTool.classList.remove("active-btn");
                event.target.classList.add("active-btn");
                break;
            case 'marker':
                pen.ChangeType('marker');

                currentTool.classList.remove("active-btn");
                event.target.classList.add("active-btn");
                break;
            case 'text':
                pen.ChangeType('text');

                currentTool.classList.remove("active-btn");
                event.target.classList.add("active-btn");
                break;
            case 'smart':
                pen.ChangeType('smart');

                currentTool.classList.remove("active-btn");
                event.target.classList.add("active-btn");
                break;
            case 'rect':
                pen.ChangeType('rect');

                currentTool.classList.remove("active-btn");
                event.target.classList.add("active-btn");
                break;
            default:
                break;
        }
    });

    document.querySelector('#drawSize-range').addEventListener('change', (event)=>{
        event.stopPropagation();
        pen.ChangeSize(event.target.value);
    });

    document.querySelector('#colors-container').addEventListener('click', function(event){
        event.stopPropagation();

        if(event.target.tagName.toLowerCase() === "button"){
            pen.color = event.target.value;
            pen.CloseSizeColors();
        }
    });

    document.querySelector('#zoom-container').addEventListener('click', function(event){
        event.stopPropagation();

        if(document.querySelector('#selectedDiv')){
            document.querySelector('#selectedDiv').remove();
        }

        switch(event.target.value){
            case 'zoomOut':
                pen.zoomFactor += 0.1;
                if(pen.zoomFactor >= 5){
                    pen.zoomFactor = 5;
                }
                pen.ReDraw();
                break;
            case 'zoomIn':
                pen.zoomFactor -= 0.1;
                if(pen.zoomFactor <= 0.1){
                    pen.zoomFactor = 0.1;
                }
                pen.ReDraw();
                break;
            default:
                break;
        }
    });

    //Mute, kick and mute all buttons
    userList.addEventListener('click', (event)=>{

        switch(event.target.id){
            case 'kick-btn':
                socket.Kick(event.target.parentNode.id);
                break;
            case 'mute-btn':
                if(!socket.muteAll){
                    socket.Mute(event.target.parentNode.id);
                }
                break;
            case 'muteAll-btn':
                socket.getUserSocket().emit('usrMuteAll');

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
                pen.DownloadPaths('discordCanvas');
                break;
            case 'deleteAll-btn':
                if(socket.isHost){
                    pen.DeleteCanvas();
                    socket.getUserSocket().emit('deleteAll');
                }
                break;
            default:
                break;
        }
    });

    document.querySelector('#import-btn').addEventListener('click', function(){
        document.querySelector('#import-input').click();
    });
    importButton.addEventListener('change', () =>{
        pen.ImportPaths(importButton, socket.isHost, socket.isMuted, socket.muteAll);
    });

    document.querySelector('#snap-btn').addEventListener('click', SnapShot)
    
    cursor.ChangeCursor('marker', pen.size * pen.basePenFactor);
    document.querySelector('#drawSize-container').value = pen.size;

    document.body.querySelector('main').appendChild(canvas);
    document.body.querySelector('.menus-container').style.display = "block";
    joinForm.parentNode.removeChild(joinForm);

    ResizeCanvas();
})