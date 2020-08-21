function Pen(size, color, pathEnd, canvas, socket, cursor){
    this.worldOrigin = {
        x: 0,
        y: 0
    }
    this.zoomFactor = 1;
    this.selectedDivCoords = {};

    this.socket = socket;
    this.eventId = 0;

    this.cursor = cursor;
    this.currentType = "marker";
    this.basePenFactor = 4;
    this.fontSize = size;
    this.eraserSize = size;
    this.markerSize = size;
    this.size = size;
    this.color = color
    this.pathEnd = pathEnd;

    this.drawingArray = [];
    this.currentPaths = [];
    this.currentSelect = {};

    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.lastCoord = {};

    this.fontStyle = "Arial";
    this.textArea = null;
}

Pen.prototype.OpenColors =  function(){
    let drwContainer = document.querySelector('#colors-container');
    if(drwContainer.style.display !== "flex"){
        drwContainer.style.display = "flex";
    }else{
        drwContainer.style.display = "none";
    }
}

Pen.prototype.OpenSize = function(){
    let drwContainer = document.querySelector('#size-container');
    if(drwContainer.style.display !== "flex"){
        drwContainer.style.display = "flex";
    }else{
        drwContainer.style.display = "none";
    }
}

Pen.prototype.CloseSizeColors = function(){
    document.querySelector('#size-container').style.display = "none";
    document.querySelector('#colors-container').style.display = "none";
}

Pen.prototype.ChangeSize = function(newSize){
    switch(this.currentType){
        case 'eraser':
            if(newSize <= 0 || newSize > 15){
                this.size = 1;
                this.eraserSize = 1;
            }else{
                this.size = newSize;
                this.eraserSize = newSize;
            }
            break;
        case 'marker':
            if(newSize <= 0 || newSize > 15){
                this.size = 1;
                this.markerSize = 1;
            }else{
                this.size = newSize;
                this.markerSize = newSize;
            }
            break;
        case 'text':
            if(newSize <= 0 || newSize > 15){
                this.size = 1;
                this.fontSize = 1;
            }else{
                this.size = newSize;
                this.fontSize = newSize;
            }
            break;
        default:
            break;
    }

    document.querySelector('#drawSize-container').value = event.target.value;
    this.cursor.SetSize(this.size * this.basePenFactor);
}

Pen.prototype.ChangeType = function(newType){
    this.currentType = newType;

    if(document.querySelector('#colors-container').style.display === 'flex'){
        this.OpenColors();
    }
    if(document.querySelector('#size-container').style.display === 'flex'){
        this.OpenSize();
    }

    if(document.querySelector('#selectedDiv')){
        document.querySelector('#selectedDiv').remove();
        this.currentSelect = null;
    }

    switch(newType){
        case 'eraser':
            this.size = this.eraserSize;
            this.color = "white";
            this.OpenSize();
            break;
        case 'marker':
            this.size = this.markerSize;
            this.color = "black";
            this.OpenColors();
            this.OpenSize();
            break;
        case 'text':
            this.size = this.fontSize;
            this.color = "black";
            this.OpenColors();
            this.OpenSize();
            break;
        case 'smart':
            this.size = 10;
            break;
        case 'rect':
            this.size = 5;
            this.OpenColors();
        default:
            break;
    }

    document.querySelector('#drawSize-container').value = this.size;
    document.querySelector('#drawSize-range').value = this.size;

    if(this.textArea){
        this.textArea.remove();
        this.textArea = null;
    }

    this.cursor.ChangeCursor(this.currentType, this.size * this.basePenFactor);
}

//Draw a single point
Pen.prototype.DrawRequest = function(drawPoint){
    switch(drawPoint.eventType){
        case 'eraser':
            this.drawingArray.push(drawPoint);
            for(let i = 0; i < drawPoint.drawEvent.length; i++){
                this.DrawPath(drawPoint.drawEvent[i]);
            }
            break;
        case 'marker':
            this.drawingArray.push(drawPoint);
            for(let i = 0; i < drawPoint.drawEvent.length; i++){
                this.DrawPath(drawPoint.drawEvent[i]);
            }
            break;
        case 'text':
            this.drawingArray.push(drawPoint);
            this.DrawText(drawPoint.drawEvent);
            break;
        case 'rect':
            this.drawingArray.push(drawPoint);
            this.DrawRect(drawPoint.drawEvent);
            break;
        default:
            break;
    }
}

//Client mouse draw
Pen.prototype.Draw =  function(event){
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    switch(this.currentType){
        case 'eraser':{
            const lastx = this.lastCoord.x - rect.left;
            const lasty = this.lastCoord.y - rect.top;
            this.ctx.strokeStyle = this.color;
            this.ctx.lineWidth = this.size * this.basePenFactor/this.zoomFactor;
            this.ctx.lineCap = "round";
            this.ctx.beginPath();
            this.ctx.moveTo(lastx, lasty);
            this.ctx.lineTo(x,y);
            this.ctx.stroke();
            this.ctx.closePath();

            let data = {
                x: (x * this.zoomFactor - this.worldOrigin.x),
                y:  (y * this.zoomFactor - this.worldOrigin.y),
                lastx:  (lastx * this.zoomFactor - this.worldOrigin.x),
                lasty:  (lasty * this.zoomFactor - this.worldOrigin.y),
                size:  this.size * this.basePenFactor,
                color:  this.color,
            };
            this.currentPaths.push(data);

            this.lastCoord= {x: event.clientX, y: event.clientY};
            break;
        }
        case 'marker':{
            const lastx = this.lastCoord.x - rect.left;
            const lasty = this.lastCoord.y - rect.top;
            this.ctx.strokeStyle = this.color;
            this.ctx.lineWidth = this.size * this.basePenFactor/this.zoomFactor;
            this.ctx.lineCap = "round";
            this.ctx.beginPath();
            this.ctx.moveTo(lastx, lasty);
            this.ctx.lineTo(x,y);
            this.ctx.stroke();
            this.ctx.closePath();

            let data = {
                x: (x * this.zoomFactor - this.worldOrigin.x),
                y:  (y * this.zoomFactor - this.worldOrigin.y),
                lastx:  (lastx * this.zoomFactor - this.worldOrigin.x),
                lasty:  (lasty * this.zoomFactor - this.worldOrigin.y),
                size:  this.size * this.basePenFactor,
                color:  this.color,
            };
            this.currentPaths.push(data);

            this.lastCoord= {x: event.clientX, y: event.clientY};
            break;
        }
        case 'text':
            this.CreateText(x, y);
            break;
        case 'smart':
            this.CreateRect(x, y);
            break;
        case 'rect':
            this.CreateRect(x, y);
            break;
        default:
            break;
    }
}

Pen.prototype.CreateRect = function(x,y){
    if(this.rectDiv){
        if(x < this.startX){
            this.rectDiv.style.width = Math.abs(x - this.startX) + 'px';
            this.rectDiv.style.left = x + 'px';
        }else{
            this.rectDiv.style.width = Math.abs(x - this.startX) + 'px';
        }

        if(y < this.startY){
            this.rectDiv.style.height = Math.abs(y - this.startY) + 'px';
            this.rectDiv.style.top = y + 'px';
        }else{
            this.rectDiv.style.height = Math.abs(y - this.startY) + 'px';
        }
    }else{
        this.startY = y;
        this.startX = x;
        this.rectDiv = document.createElement('div');
        this.rectDiv.id = 'rectDiv';
        this.rectDiv.style.borderColor = this.color;

        this.rectDiv.style.top = y + 'px';
        this.rectDiv.style.left = x + 'px';
        this.rectDiv.style.width = this.size;
        this.rectDiv.style.height = this.size;

        document.querySelector('main').appendChild(this.rectDiv);
    }
    
}

Pen.prototype.CreateDot = function(x,y,color){
    this.ctx.strokeStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
    this.ctx.stroke();
}

//Client draw point optimization
Pen.prototype.OptimizeDraw =  function(){
    if(this.currentType === "marker" || this.currentType === "eraser"){
        let toleranceX = 50;
        let toleranceY = 50;

        for(let i = 1; i < this.currentPaths.length - 1; i++){
            let xDist = Math.abs(this.currentPaths[i].x - this.currentPaths[i].lastx);
            let yDist = Math.abs(this.currentPaths[i].y - this.currentPaths[i].lasty);

            if(xDist < toleranceX && yDist < toleranceY){
                this.currentPaths[i+1].lastx = this.currentPaths[i-1].x;
                this.currentPaths[i+1].lasty = this.currentPaths[i-1].y;
                this.currentPaths.splice(i, 1);
            }
        }

        let data = {
            userId: this.socket.id,
            eventId: this.eventId,
            eventType: this.currentType,
            drawEvent: this.currentPaths
        }

        this.socket.emit("draw", data);
        this.drawingArray.push(data);

        this.eventId += 1;
        this.currentPaths = [];
    }else if(this.currentType === 'rect'){
        if(this.rectDiv){

            let data = {
                userId: this.socket.id,
                eventId: this.eventId,
                eventType: this.currentType,
                drawEvent: {
                    x: parseFloat(this.rectDiv.style.left) * this.zoomFactor - this.worldOrigin.x,
                    y: parseFloat(this.rectDiv.style.top) * this.zoomFactor - this.worldOrigin.y,
                    width: parseFloat(this.rectDiv.style.width) * this.zoomFactor,
                    height: parseFloat(this.rectDiv.style.height) * this.zoomFactor,
                    size:  this.size * this.basePenFactor,
                    color:  this.color
                }
            }

            this.DrawRect(data.drawEvent);
    
            this.socket.emit("draw", data);
            this.drawingArray.push(data);

            this.rectDiv.remove();
            this.rectDiv = null;

            this.eventId += 1;
        }
    }else if(this.currentType === 'smart'){
        if(this.rectDiv){
            if(document.querySelector('#selectedDiv')){
                document.querySelector('#selectedDiv').remove();
            }

            this.currentSelect = {
                userIds: [],
                eventIds: [],
                maxX: null,
                maxY: null,
                minX: null,
                minY: null
            };
            let currentCount;

            let rectX = parseFloat(this.rectDiv.style.left);
            let rectY = parseFloat(this.rectDiv.style.top);
            let rectW = parseFloat(this.rectDiv.style.width);
            let rectH = parseFloat(this.rectDiv.style.height);

            for(let i = 0; i < this.drawingArray.length; i++){
                currentCount = 0;
                switch(this.drawingArray[i].eventType){
                    case 'eraser':
                        break;
                    case 'marker':
                        {
                            for(let j = 0; j < this.drawingArray[i].drawEvent.length; j++){
                                let lastCoords = this.AdjustToLocal(this.drawingArray[i].drawEvent[j].lastx, this.drawingArray[i].drawEvent[j].lasty);
                                let newCoords = this.AdjustToLocal(this.drawingArray[i].drawEvent[j].x, this.drawingArray[i].drawEvent[j].y);
                                if(lastCoords.x >= rectX && newCoords.x <= rectX + rectW){
                                    if(lastCoords.y >= rectY && newCoords.y <= rectY + rectH){
                                        currentCount++;
                                    }
                                }
                            }
                            if(currentCount >= this.drawingArray[i].drawEvent.length/2){
                                this.currentSelect.userIds.push(this.drawingArray[i].userId);
                                this.currentSelect.eventIds.push(this.drawingArray[i].eventId);
    
                                for(let j = 0; j < this.drawingArray[i].drawEvent.length; j++){
                                    let lastCoords = this.AdjustToLocal(this.drawingArray[i].drawEvent[j].lastx, this.drawingArray[i].drawEvent[j].lasty);
                                    let newCoords = this.AdjustToLocal(this.drawingArray[i].drawEvent[j].x, this.drawingArray[i].drawEvent[j].y);
                                    this.CheckMinMax(lastCoords.x, lastCoords.y);
                                    this.CheckMinMax(newCoords.x, newCoords.y);
                                }
                            }
                        }
                        break;
                    case 'text':
                        {
                            let orgSize = this.ctx.font;
                            this.ctx.font = (this.drawingArray[i].drawEvent.size/this.zoomFactor) + "px " + this.drawingArray[i].drawEvent.font;
                            let newCoords = this.AdjustToLocal(this.drawingArray[i].drawEvent.x, this.drawingArray[i].drawEvent.y);

                            if(newCoords.x >= rectX || newCoords.x + this.ctx.measureText(this.drawingArray[i].drawEvent.value).width/this.zoomFactor <= rectX + rectW){
                                if(newCoords.y >= rectY && newCoords.y <= rectY + rectH){
                                    this.currentSelect.userIds.push(this.drawingArray[i].userId);
                                    this.currentSelect.eventIds.push(this.drawingArray[i].eventId);
                                    this.CheckMinMax(newCoords.x, newCoords.y);
                                    this.CheckMinMax(newCoords.x + this.ctx.measureText(this.drawingArray[i].drawEvent.value).width/this.zoomFactor, newCoords.y);
                                }
                            }

                            this.ctx.font = orgSize;
                        }
                        break;
                    case 'rect':
                        {
                            let newCoords = this.AdjustToLocal(this.drawingArray[i].drawEvent.x, this.drawingArray[i].drawEvent.y);

                            if(newCoords.x >= rectX && newCoords.x + this.drawingArray[i].drawEvent.width/this.zoomFactor <= rectX + rectW){
                                if(newCoords.y >= rectY && newCoords.y + this.drawingArray[i].drawEvent.height/this.zoomFactor <= rectY + rectH){
                                    this.currentSelect.userIds.push(this.drawingArray[i].userId);
                                    this.currentSelect.eventIds.push(this.drawingArray[i].eventId);
                                    
                                    this.CheckMinMax(newCoords.x, newCoords.y);
                                    this.CheckMinMax(newCoords.x + this.drawingArray[i].drawEvent.width/this.zoomFactor, newCoords.y + this.drawingArray[i].drawEvent.height/this.zoomFactor);
                                }
                            }
                        }
                        break;
                    default:
                        break;
                }
            }

            this.CreateSelectDiv();
            this.rectDiv.remove();
            this.rectDiv = null;
        }
    }
}

Pen.prototype.CheckMinMax = function(x,y){
    if(this.currentSelect.maxX === null || x > this.currentSelect.maxX){this.currentSelect.maxX = x};
    if(this.currentSelect.maxY === null || y > this.currentSelect.maxY){this.currentSelect.maxY = y};
    if(this.currentSelect.minX === null || x < this.currentSelect.minX){this.currentSelect.minX = x};
    if(this.currentSelect.minY === null || y < this.currentSelect.minY){this.currentSelect.minY = y};
}

Pen.prototype.CreateSelectDiv = function(){
    if(this.currentSelect.userIds.length > 0){
        if(document.querySelector('#selectedDiv')){
            document.querySelector('#selectedDiv').remove();
        }
    
        let selectDiv = document.createElement('div');
        selectDiv.id = "selectedDiv";
        selectDiv.style.left = this.currentSelect.minX - 50 + 'px';
        selectDiv.style.top = this.currentSelect.minY - 50 + 'px';
        selectDiv.style.width = this.currentSelect.maxX + 100 - this.currentSelect.minX + 'px';
        selectDiv.style.height = this.currentSelect.maxY  + 100 - this.currentSelect.minY + 'px';
        
        selectDiv.addEventListener('mousedown', (event) =>{
            const rect = this.canvas.getBoundingClientRect();
            this.selectedDivCoords = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            }
        });
    
        selectDiv.addEventListener('mousemove', (event) =>{
            if(event.buttons === 1){
                const rect = this.canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                let distX = (x - this.selectedDivCoords.x) * this.zoomFactor;
                let distY = (y - this.selectedDivCoords.y) * this.zoomFactor;
    
                if(distX && distY){
                    for(let i = 0; i < this.currentSelect.userIds.length; i++){
                        this.MoveElement({userId: this.currentSelect.userIds[i], eventId: this.currentSelect.eventIds[i]}, distX, distY);
                    }
    
                    let div = document.querySelector('#selectedDiv');
                    div.style.top = parseFloat(div.style.top) + distY / this.zoomFactor + 'px';
                    div.style.left = parseFloat(div.style.left) + distX / this.zoomFactor + 'px';
                }
    
                this.selectedDivCoords = {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top
                }
            }
        });
    
        selectDiv.addEventListener('mouseup', (event) =>{
            this.selectedDivCoords = {};
            for(let i = 0; i < this.currentSelect.userIds.length; i++){
                this.FinishMoveElement({userId: this.currentSelect.userIds[i], eventId: this.currentSelect.eventIds[i]});
            }
        });
    
        selectDiv.addEventListener('mouseleave', (event) => {
            if(event.buttons === 1){
                this.selectedDivCoords = {};
                for(let i = 0; i < this.currentSelect.userIds.length; i++){
                    this.FinishMoveElement({userId: this.currentSelect.userIds[i], eventId: this.currentSelect.eventIds[i]});
                }
            }
        });
    
        document.querySelector('main').appendChild(selectDiv);
    }
}

Pen.prototype.DeleteElement = function(data){
    for(let i = 0; i < this.drawingArray.length; i++){
        if(this.drawingArray[i].userId === data.userId && this.drawingArray[i].eventId === data.eventId){
            this.drawingArray.splice(i, 1);
            this.ReDraw();
            break;
        }
    }
}

Pen.prototype.MoveElement = function(data, x, y){
    for(let i = 0; i < this.drawingArray.length; i++){
        if(this.drawingArray[i].userId === data.userId && this.drawingArray[i].eventId === data.eventId){
            switch(this.drawingArray[i].eventType){
                case 'marker':
                    for(let j = 0; j < this.drawingArray[i].drawEvent.length; j++){
                        this.drawingArray[i].drawEvent[j].x += x;
                        this.drawingArray[i].drawEvent[j].lastx += x;
                        this.drawingArray[i].drawEvent[j].y += y;
                        this.drawingArray[i].drawEvent[j].lasty += y;
                    }
                    break;
                case 'text':
                    this.drawingArray[i].drawEvent.x += x;
                    this.drawingArray[i].drawEvent.y += y;
                    break;
                case 'rect':
                    this.drawingArray[i].drawEvent.x += x;
                    this.drawingArray[i].drawEvent.y += y;
                    break;
                default:
                    break;
            }
            this.ReDraw();
            break;
        }
    }
}

Pen.prototype.FinishMoveElement = function(data){
    for(let i = 0; i < this.drawingArray.length; i++){
        if(this.drawingArray[i].userId === data.userId && this.drawingArray[i].eventId === data.eventId){
            this.socket.emit("moveElement", {movedElement: this.drawingArray[i].drawEvent, userId: data.userId, eventId: data.eventId});
            this.ReDraw();
            break;
        }
    }
}

Pen.prototype.DeleteCanvas = function(){
    if(document.querySelector('#selectedDiv')){
        document.querySelector('#selectedDiv').remove();
    }

    this.drawingArray.length = 0;
    this.ReDraw();
}

Pen.prototype.AdjustToLocal = function(x,y){
    return {x: Math.round((x + this.worldOrigin.x)/this.zoomFactor), y: Math.round((y + this.worldOrigin.y)/this.zoomFactor)};
}

//Redraw whole canvas
Pen.prototype.ReDraw = function(){
    this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);

    for(let i = 0; i < this.drawingArray.length; i++){

        switch(this.drawingArray[i].eventType){

            case 'eraser':
                // for(let j = 0; j < this.drawingArray[i].drawEvent.length; j++){
                //     this.DrawPath(this.drawingArray[i].drawEvent[j]);
                // }
                this.NewDrawPath(this.drawingArray[i].drawEvent);
                break;
            case 'marker':
                // for(let j = 0; j < this.drawingArray[i].drawEvent.length; j++){
                //     this.DrawPath(this.drawingArray[i].drawEvent[j]);
                // }
                this.NewDrawPath(this.drawingArray[i].drawEvent);
                break;
            case 'text':
                this.DrawText(this.drawingArray[i].drawEvent);
                break;
            case 'rect':
                this.DrawRect(this.drawingArray[i].drawEvent);
                break;
            default:
                break;
        }
    }
}

//Draw a line
Pen.prototype.DrawPath = function(event){
    let lastCoords = this.AdjustToLocal(event.lastx, event.lasty);
    let newCoords = this.AdjustToLocal(event.x, event.y);

    this.ctx.strokeStyle = event.color;
    this.ctx.lineWidth = event.size/this.zoomFactor;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(lastCoords.x, lastCoords.y);
    this.ctx.lineTo(newCoords.x, newCoords.y);
    this.ctx.stroke();
}

Pen.prototype.NewDrawPath = function(drawEvent){
    this.ctx.beginPath();
    for(let i =0; i < drawEvent.length; i++){
        let lastCoords = this.AdjustToLocal(drawEvent[i].lastx, drawEvent[i].lasty);
        let newCoords = this.AdjustToLocal(drawEvent[i].x, drawEvent[i].y);

        this.ctx.strokeStyle = drawEvent[i].color;
        this.ctx.lineWidth = drawEvent[i].size/this.zoomFactor;
        this.ctx.lineCap = "round";

        this.ctx.moveTo(lastCoords.x, lastCoords.y);
        this.ctx.lineTo(newCoords.x, newCoords.y);
    }
    this.ctx.stroke();
}

//Draw text
Pen.prototype.DrawText = function(event){
    let localCoords = this.AdjustToLocal(event.x, event.y);

    this.ctx.font = (event.size/this.zoomFactor) + "px " + event.font;
    this.ctx.fillStyle = event.color;
    this.ctx.fillText(event.value, localCoords.x, localCoords.y)
}

//Draw a rectangle
Pen.prototype.DrawRect = function(event){
    let localCoords = this.AdjustToLocal(event.x, event.y);

    this.ctx.strokeStyle = event.color;
    this.ctx.lineWidth = event.size/this.zoomFactor;
    this.ctx.strokeRect(localCoords.x, localCoords.y, event.width/this.zoomFactor, event.height/this.zoomFactor);
}

//Client create text input
Pen.prototype.CreateText = function(x, y){
    if(!this.textArea){
        this.textArea = document.createElement('input');
        this.textArea.placeholder = "Start Typing!";
        this.textArea.id = 'textArea-input';
        this.textArea.style.fontSize = this.size * this.basePenFactor + 'px';
        this.textArea.style.height = (this.size * this.basePenFactor + 20) + 'px';
        this.textArea.style.width = 400 + 'px';
        this.textArea.style.top = (y - this.size * this.basePenFactor) + 'px';
        this.textArea.style.left = x + 'px';

        this.textArea.addEventListener('keydown' , (event) =>{
            if(event.code === "Enter"){
                let textX = parseFloat(this.textArea.style.left) || 0;
                let textY = parseFloat(this.textArea.style.top) + this.size * this.basePenFactor + 10 || 0;

                let data = {
                    userId: this.socket.id,
                    eventId: this.eventId,
                    eventType: 'text',
                    drawEvent: {
                        x: (textX * this.zoomFactor - this.worldOrigin.x),
                        y: (textY * this.zoomFactor - this.worldOrigin.y),
                        size: this.size * this.basePenFactor,
                        color: this.color,
                        font: this.fontStyle,
                        value: this.textArea.value,
                    }
                }

                this.ctx.font = this.size * this.basePenFactor + "px " + this.fontStyle;
                this.ctx.fillStyle = this.color;
                this.ctx.fillText(this.textArea.value, textX, textY);

                this.drawingArray.push(data);
                this.socket.emit('draw', data);

                this.eventId += 1;
                this.textArea.remove();
                this.textArea = null;
            }
        });

        document.querySelector('main').appendChild(this.textArea);
    }else{
        this.textArea.style.fontSize = this.size * this.basePenFactor + 'px';
        this.textArea.style.height = (this.size * this.basePenFactor + 20) + 'px';
        this.textArea.style.top = (y - this.size * this.basePenFactor)  + 'px';
        this.textArea.style.left = x + 'px';
        this.textArea.value = "";
    }
}

//Export paths in json format
Pen.prototype.DownloadPaths = function(exportName){
    if(this.drawingArray.length > 0){
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({paths: this.drawingArray}));
        let downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

//Import paths
Pen.prototype.ImportPaths = function(importBtn, isHost, isMuted, muteAll){
    if(isHost || !muteAll){
        if(!isMuted){
            let reader = new FileReader();

            reader.addEventListener('error', ()=>{
                console.log(`Error occured during reading`);
                reader.abort();
            });

            reader.onloadend = () =>{
                let jsonResult = JSON.parse(reader.result);
                this.currentSelect = {
                    userIds: [],
                    eventIds: [],
                    maxX: null,
                    maxY: null,
                    minX: null,
                    minY: null
                };

                for(let i = 0; i < jsonResult.paths.length; i++){
                    let newPath = jsonResult.paths[i];
                    newPath.userId = this.socket.id;
                    newPath.eventId = this.eventId;
                    this.eventId += 1;

                    switch(newPath.eventType){
                        case 'eraser':
                            {
                                this.currentSelect.userIds.push(newPath.userId);
                                this.currentSelect.eventIds.push(newPath.eventId);
    
                                for(let j = 0; j < newPath.drawEvent.length; j++){
                                    let lastCoords = this.AdjustToLocal(newPath.drawEvent[j].lastx, newPath.drawEvent[j].lasty);
                                    let newCoords = this.AdjustToLocal(newPath.drawEvent[j].x, newPath.drawEvent[j].y);
                                    this.CheckMinMax(lastCoords.x, lastCoords.y);
                                    this.CheckMinMax(newCoords.x, newCoords.y);
                                }
                            }
                        case 'marker':
                            {
                                this.currentSelect.userIds.push(newPath.userId);
                                this.currentSelect.eventIds.push(newPath.eventId);
    
                                for(let j = 0; j < newPath.drawEvent.length; j++){
                                    let lastCoords = this.AdjustToLocal(newPath.drawEvent[j].lastx, newPath.drawEvent[j].lasty);
                                    let newCoords = this.AdjustToLocal(newPath.drawEvent[j].x, newPath.drawEvent[j].y);
                                    this.CheckMinMax(lastCoords.x, lastCoords.y);
                                    this.CheckMinMax(newCoords.x, newCoords.y);
                                }
                            }
                            break;
                        case 'text':
                            {
                                let orgSize = this.ctx.font;
                                this.ctx.font = (newPath.drawEvent.size/this.zoomFactor) + "px " + newPath.drawEvent.font;
                                let newCoords = this.AdjustToLocal(newPath.drawEvent.x, newPath.drawEvent.y);
    
                                this.currentSelect.userIds.push(newPath.userId);
                                this.currentSelect.eventIds.push(newPath.eventId);
                                this.CheckMinMax(newCoords.x, newCoords.y);
                                this.CheckMinMax(newCoords.x + this.ctx.measureText(newPath.drawEvent.value).width/this.zoomFactor, newCoords.y);
    
                                this.ctx.font = orgSize;
                            }
                            break;
                        case 'rect':
                            {
                                let newCoords = this.AdjustToLocal(newPath.drawEvent.x, newPath.drawEvent.y);
    
                                this.currentSelect.userIds.push(newPath.userId);
                                this.currentSelect.eventIds.push(newPath.eventId);
                                
                                this.CheckMinMax(newCoords.x, newCoords.y);
                                this.CheckMinMax(newCoords.x + newPath.drawEvent.width/this.zoomFactor, newCoords.y + newPath.drawEvent.height/this.zoomFactor);
                            }
                            break;
                        default:
                            break;
                    }

                    this.DrawRequest(newPath);
                    this.socket.emit('draw', newPath);
                }

                this.CreateSelectDiv();
            }

            if(importBtn.files > 1 || importBtn.files <= 0){
                console.log("Error importing");
            }else{
                let obj = importBtn.files[0];
                reader.readAsText(obj);
            }
        }
    }
}
