function Cursor(cursorDiv, offset){
    this.cursorHelper = cursorDiv;
    this.markerCursor = "../assets/marker.svg";
    this.eraserCursor = "../assets/marker.svg";
    this.textCursor = "../assets/text.svg";
    this.smartCursor = "../assets/smart.svg";

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
    this.coordinates.y = y - this.size.height/2 - this.offsetY;
    this.cursor.style.top = this.coordinates.y + 'px';
    this.cursor.style.left = this.coordinates.x + 'px';
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
        case 'text':
            this.cursor.setAttribute('src', this.textCursor);
            break;
        case 'smart':
            this.cursor.setAttribute('src', this.smartCursor);
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
