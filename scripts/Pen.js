function Pen(size, color, pathEnd, canvas, socket){
    this.socket = socket;
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

//Client draw
Pen.prototype.Draw =  function(event, worldOrigin, zoomFactor){
    const rect = this.canvas.getBoundingClientRect();
    const lastx = this.lastCoord.x - rect.left;
    const lasty = this.lastCoord.y - rect.top;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.size/zoomFactor;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(lastx, lasty);
    this.ctx.lineTo(x,y);
    this.ctx.stroke();
    this.ctx.closePath();

    let data = {
        x: (x * zoomFactor + worldOrigin.x * -1),
        y:  (y * zoomFactor + worldOrigin.y * -1),
        lastx:  (lastx * zoomFactor + worldOrigin.x * -1),
        lasty:  (lasty * zoomFactor + worldOrigin.y * -1),
        size:  this.size,
        color:  this.color
    };
    this.currentPaths.push(data);

    this.lastCoord= {x: event.clientX, y: event.clientY};
}

//Client draw optimize
Pen.prototype.OptimizeDraw =  function(worldOrigin, zoomFactor){
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

    this.ReDraw(worldOrigin, zoomFactor);
    this.currentPaths = [];
}

Pen.prototype.ReDraw = function(worldOrigin, zoomFactor){
    this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
    for(let i = 0; i < this.paths.length; i++){
        this.DrawPath(this.paths[i].lastx,this.paths[i].lasty,this.paths[i].x,this.paths[i].y,this.paths[i].size,this.paths[i].color, worldOrigin, zoomFactor);
    }
}

//Draw a line
Pen.prototype.DrawPath = function(lastx, lasty, x, y, size, color, worldOrigin, zoomFactor){
    let data = {
        x: x,
        y:  y,
        lastx:  lastx,
        lasty:  lasty,
        size:  size,
        color:  color
    };

    this.ctx.strokeStyle = data.color;
    this.ctx.lineWidth = data.size/zoomFactor;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo((data.lastx + worldOrigin.x)/zoomFactor, (data.lasty + worldOrigin.y)/zoomFactor);
    this.ctx.lineTo((data.x + worldOrigin.x)/zoomFactor, (data.y + worldOrigin.y)/zoomFactor);
    this.ctx.stroke();
    this.ctx.closePath();
}

Pen.prototype.DrawText = function(x, y){
    if(!this.textArea){
        this.textArea.remove();
        this.textArea = document.createElement('textarea');
        this.textArea.id = 'textArea-input';
        this.textArea.style.top = y + 'px';
        this.textArea.style.left = x + 'px';
        this.textArea.addEventListener('keydown', function(event){
            if(event.code === "Enter"){
                
            }
        });
        document.querySelector('main').appendChild(this.textArea);
    }else{
        this.textArea.style.top = y + 'px';
        this.textArea.style.left = x + 'px';
        this.textArea.value = "";
    }
}
