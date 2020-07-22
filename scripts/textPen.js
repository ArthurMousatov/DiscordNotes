function TextPen(size, color, font){
    this.fontSize = size;
    this.fontColor = color;
    this.fontStyle = font;
    this.textArea = null;
}

TextPen.prototype.CreateText = function(x, y){
    if(!this.textArea){
        this.textArea.remove();
        this.textArea = document.createElement('textarea');
        this.textArea.id = 'textArea-input';
        this.textArea.style.top = y + 'px';
        this.textArea.style.left = x + 'px';
        document.querySelector('main').appendChild(this.textArea);
    }
}