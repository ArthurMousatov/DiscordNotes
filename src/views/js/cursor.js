export default class Cursor{
    constructor(cursorDiv, offset){
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
    }
    
    InitializeCursor(){
        this.cursor.id = "cursor-img";
        this.cursor.width = this.size.width;
        this.cursor.height = this.size.height;
        document.querySelector('main').appendChild(this.cursor);
    }

    ShowCursor(){
        this.cursor.style.display = "block";
        document.body.style.cursor = "none";
    }

    HideCursor(){
        this.cursor.style.display = "none";
        document.body.style.cursor = "default";
    }

    SetCoordinates(x, y){
        this.coordinates.x = x - this.size.width/2;
        this.coordinates.y = y - this.size.height/2 - this.offsetY;
        this.cursor.style.top = this.coordinates.y + 'px';
        this.cursor.style.left = this.coordinates.x + 'px';
    }

    SetSize(size){
        this.size.width = size;
        this.size.height = size;
        this.cursor.height = this.size.height;
        this.cursor.width = this.size.width;
    }

    ChangeCursor(cursorType, size){
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
    
        this.cursor.setAttribute('width', this.size.width.toString());
        this.cursor.setAttribute('height', this.size.height.toString());
    }
}
