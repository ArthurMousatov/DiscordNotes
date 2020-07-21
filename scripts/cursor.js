function Cursor(cursorDiv, offset){
    this.cursorHelper = cursorDiv;
    this.markerCursor = "../assets/marker.svg";
    this.eraserCursor = "../assets/marker.svg";
    this.coordinates = {
        x: 0,
        y: 0
    };
    this.size = {
        width: 50,
        height: 50
    };
    this.offsetY = offset;
    this.cursor = document.createElement('img');
    this.InitializeCursor();
};

Cursor.prototype.InitializeCursor = function(){
    this.cursor.id = "cursor-img";
    this.cursor.width = this.size.width;
    this.cursor.height = this.size.height;
    document.querySelector('main').appendChild(this.cursor);
}

Cursor.prototype.ShowCursor = function(){
    this.cursor.style.display = "block";
    document.body.style.cursor = "none";
}

Cursor.prototype.HideCursor = function(){
    this.cursor.style.display = "none";
    document.body.style.cursor = "default";
}

Cursor.prototype.SetCoordinates = function(x, y){
    this.coordinates.x = x - this.size.width/2;
    this.coordinates.y = y - this.size.height/2 - 62;
    this.cursor.style.top = this.coordinates.y + 'px';
    this.cursor.style.left = this.coordinates.x + 'px';
    //console.log(this.cursor.style.left, this.cursor.style.top);
    //console.log(x, y);
}

Cursor.prototype.SetSize = function(size){
    this.size.width = size;
    this.size.height = size;
    this.cursor.height = this.size.height;
    this.cursor.width = this.size.width;
}

Cursor.prototype.ChangeCursor = function(cursorType, size){
    switch(cursorType){
        case 'marker':
            this.cursor.setAttribute('src', this.markerCursor);
            break;
        case 'eraser':
            this.cursor.setAttribute('src', this.eraserCursor);
            break;
        default:
            this.cursor.setAttribute('src', this.markerCursor);
            break;
    }
    this.size.width = size;
    this.size.height = size;

    this.cursor.setAttribute('width', this.size.width);
    this.cursor.setAttribute('height', this.size.height);
}

// Hey Gary, great video. I really liked the animations there. 
// One thing worth mentioning is that your implementation doesn't look like it takes into consideration that the cursor is always in the way of what you would be trying to click on like a link or something. 
// Setting "pointer-events" to "none" on .cursor allows the cursor to be clicked through and would fix that issue.
