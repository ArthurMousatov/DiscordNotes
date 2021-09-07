const Room = require("../models/Rooms/Room");
const RoomManager = require("../models/Rooms/RoomManager");
const { WebError } = require("./ErrorController");

class BoardController{
    constructor(roomManager){
        this.roomManager = roomManager;
        this.handleCreate = this.handleCreate.bind(this);
        this.handleSelfJoin = this.handleSelfJoin.bind(this);
        this.join = this.join.bind(this);
    }

    handleCreate(req, res){
        let roomString = RoomManager.MakeId(15);
        let hostID = RoomManager.MakeId(15);
    
        //Creation of new room
        let room = new Room(roomString, hostID);
        this.roomManager.addRoom(room);
    
        //Creation of user payload
        let data = {
            roomCode: roomString,
            hostCode: hostID
        };
        
        console.log("Created room " + roomString + " with host ID " + hostID);
        res.render('board', {data: data});
    }

    handleSelfJoin(req, res){
        let roomString = req.body.roomCode ?? null;
        
        if(roomString && this.roomManager.containsRoom(roomString))
            res.render('board', {data: req.body});
        else
            throw new WebError('Web Room', "Couldn't find the room...", 404);
    }

    join(req, res){
        let roomString = req.params.id ?? null;
    
        if(!roomString)
            throw new WebError("Room Error", "No Room ID Provided!", 404);
        else{
            let data = {
                roomCode: roomString
            };
            res.render('board', {data: data});
        }
    }
}

exports.BoardController = BoardController;