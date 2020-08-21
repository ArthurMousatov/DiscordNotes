//Client erase
function OptimizedErase(canvas, event){
    if(!isMuted){
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext("2d");
        const tolerance = 10;
        const x = event.clientX - rect.left + worldOrigin.x * -1;
        const y = event.clientY - rect.top + worldOrigin.y * -1;
        
        for(let i = paths.length - 1; i > 0; i--){

            if(x < paths[i].lastx || x > paths[i].x){
                console.log("skipping mouse x: " + x + " | lastx: " + paths[i].lastx + " | x: " + paths[i].x);
                continue;
            }

            var linepoint = linepointNearestMouse(paths[i], x, y);
            var dx = x - linepoint.x;
            var dy = y - linepoint.y;
            var distance = Math.abs(Math.sqrt(dx * dx + dy * dy));

            if (distance < tolerance) {
                console.log(distance);
                let useX = paths[i].x;
                let useY = paths[i].y;
                let useLastX = paths[i].lastx;
                let useLastY = paths[i].lasty;
                
                let data = {
                    x: useX,
                    y: useY,
                    lastx: useLastX,
                    lasty: useLastY
                };
                socket.emit('erase', data);
                paths.splice(i, 1);
            }
        }
        Drag(canvas, ctx);
    }
}

// calculate the point on the line that's 
        // nearest to the mouse position
        function linepointNearestMouse(line, x, y) {
            lerp = function(a, b, x) {
            return (a + x * (b - a));
            };
            var dx = line.x - line.lastx;
            var dy = line.y - line.lasty;
            var t = ((x - line.lastx) * dx + (y - line.lasty) * dy) / (dx * dx + dy * dy);
            var lineX = lerp(line.lastx, line.x, t);
            var lineY = lerp(line.lasty, line.y, t);
            return ({
            x: lineX,
            y: lineY
            });
        };