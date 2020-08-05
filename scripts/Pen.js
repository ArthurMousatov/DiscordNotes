function Pen(size, color, pathEnd, canvas, socket){
    this.worldOrigin = {
        x: 0,
        y: 0
    }
    this.zoomFactor = 1;

    this.currentType = "marker";
    this.socket = socket;
    this.basePenFactor = 4;
    this.fontSize = size;
    this.eraserSize = size;
    this.markerSize = size;
    this.size = size;
    this.color = color
    this.pathEnd = pathEnd;

    this.paths = [];
    this.currentPaths = [];

    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.lastCoord = {};

    this.fontStyle = "Arial";
    this.textArea = null;
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
}

Pen.prototype.ChangeType = function(newType){
    this.currentType = newType;
    switch(newType){
        case 'eraser':
            this.size = this.eraserSize;
            break;
        case 'marker':
            this.size = this.markerSize;
            break;
        case 'text':
            this.size = this.fontSize;
            break;
        default:
            break;
    }
    if(this.textArea){
        this.textArea.remove();
    }
    
}

Pen.prototype.DrawRequest = function(drawPoint){
    switch(drawPoint.event){
        case 'eraser':
            this.paths.push(drawPoint);
            this.DrawPath(drawPoint.lastx, drawPoint.lasty, drawPoint.x, drawPoint.y, drawPoint.size, drawPoint.color);
            break;
        case 'marker':
            this.paths.push(drawPoint);
            this.DrawPath(drawPoint.lastx, drawPoint.lasty, drawPoint.x, drawPoint.y, drawPoint.size, drawPoint.color);
            break;
        case 'text':
            this.paths.push(drawPoint);
            this.DrawText(drawPoint);
            break;
        default:
            break;
    }
}

//Client draw
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
                x: (x * this.zoomFactor + this.worldOrigin.x * -1),
                y:  (y * this.zoomFactor + this.worldOrigin.y * -1),
                lastx:  (lastx * this.zoomFactor + this.worldOrigin.x * -1),
                lasty:  (lasty * this.zoomFactor + this.worldOrigin.y * -1),
                size:  this.size * this.basePenFactor,
                color:  this.color,
                event: 'eraser'
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
                x: (x * this.zoomFactor + this.worldOrigin.x * -1),
                y:  (y * this.zoomFactor + this.worldOrigin.y * -1),
                lastx:  (lastx * this.zoomFactor + this.worldOrigin.x * -1),
                lasty:  (lasty * this.zoomFactor + this.worldOrigin.y * -1),
                size:  this.size * this.basePenFactor,
                color:  this.color,
                event: 'marker'
            };
            this.currentPaths.push(data);

            this.lastCoord= {x: event.clientX, y: event.clientY};
            break;
        }
        case 'text':
            this.CreateText(x, y);
            break;
        default:
            break;
    }
}

//Client draw optimize
Pen.prototype.OptimizeDraw =  function(){
    let toleranceX = 150;
    let toleranceY = 40;

    for(let i = 1; i < this.currentPaths.length - 1; i++){
        let xDist = Math.abs(this.currentPaths[i].x - this.currentPaths[i].lastx);
        let yDist = Math.abs(this.currentPaths[i].y - this.currentPaths[i].lasty);

        //Vertical line out of place
        if(xDist < toleranceX && yDist > toleranceY){
            this.currentPaths[i+1].lastx = this.currentPaths[i-1].x;
            this.currentPaths[i+1].lasty = this.currentPaths[i-1].y;
            this.currentPaths.splice(i, 1);
        }

        //Horizontal line out of place
        if(yDist < toleranceY && xDist > toleranceX){
            this.currentPaths[i+1].lastx = this.currentPaths[i-1].x;
            this.currentPaths[i+1].lasty = this.currentPaths[i-1].y;
            this.currentPaths.splice(i, 1);
        }
    }

    for(let i = 0; i < this.currentPaths.length; i++){
        //Send data to server
        this.socket.emit("draw", this.currentPaths[i]);
        this.paths.push(this.currentPaths[i]);
    }

    this.ReDraw();
    this.currentPaths = [];
}

Pen.prototype.ReDraw = function(){
    this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
    for(let i = 0; i < this.paths.length; i++){
        switch(this.paths[i].event){
            case 'eraser':
                this.DrawPath(this.paths[i].lastx,this.paths[i].lasty,this.paths[i].x,this.paths[i].y,this.paths[i].size,this.paths[i].color);
                break;
            case 'marker':
                this.DrawPath(this.paths[i].lastx,this.paths[i].lasty,this.paths[i].x,this.paths[i].y,this.paths[i].size,this.paths[i].color);
                break;
            case 'text':
                this.DrawText(this.paths[i]);
                break;
            default:
                break;
        }
    }
}

Pen.prototype.DrawPath = function(lastx, lasty, x, y, size, color){
    let data = {
        x: x,
        y:  y,
        lastx:  lastx,
        lasty:  lasty,
        size:  size,
        color:  color
    };

    this.ctx.strokeStyle = data.color;
    this.ctx.lineWidth = data.size/this.zoomFactor;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo((data.lastx + this.worldOrigin.x)/this.zoomFactor, (data.lasty + this.worldOrigin.y)/this.zoomFactor);
    this.ctx.lineTo((data.x + this.worldOrigin.x)/this.zoomFactor, (data.y + this.worldOrigin.y)/this.zoomFactor);
    this.ctx.stroke();
    this.ctx.closePath();
}

Pen.prototype.DrawText = function(data){
    this.ctx.font = (data.size/this.zoomFactor) + "px " + data.font;
    this.ctx.fillStyle = data.color;
    this.ctx.fillText(data.value, (data.x + this.worldOrigin.x)/this.zoomFactor, (data.y + this.worldOrigin.y)/this.zoomFactor)
}

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
                    x: (textX * this.zoomFactor + this.worldOrigin.x * -1),
                    y: (textY* this.zoomFactor + this.worldOrigin.y * -1),
                    size: this.size * this.basePenFactor,
                    color: this.color,
                    font: this.fontStyle,
                    value: this.textArea.value,
                    event: 'text'
                }

                this.ctx.font = this.size * this.basePenFactor + "px " + this.fontStyle;
                this.ctx.fillStyle = this.color;
                this.ctx.fillText(this.textArea.value, textX, textY);

                this.paths.push(data);
                this.socket.emit('draw', data);

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
