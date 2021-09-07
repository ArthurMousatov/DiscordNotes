const Room = require('../models/Rooms/Room');
const RoomManager = require('../models/Rooms/RoomManager');

class ApiController{
    constructor(botID, rooms){
        this.rooms = rooms;
        this.botID = botID;
    }

    handle(req, res){
        if(req.params.id === this.botID){
            let roomString;
            let hostID = RoomManager.MakeId(15);
            let muteAll = false;
            if(req.params.muteAll === "true"){
                muteAll = true;
            }
    
            //Search for a non-used room string
            do{
                roomString = RoomManager.MakeId(15);
            }while(this.rooms.containsRoom(roomString));
    
            //Creation of new room
            let roomObj = new Room(roomString, hostID);
            this.rooms.addRoom(roomObj);
            console.log("Created room " + roomString);
    
            //Send JSON
            res.setHeader('Content-Type', 'application/json');
            res.json({status: "OK", roomCode: roomString, hostCode: hostID});
        }else{
            res.setHeader('Content-Type', 'application/json');
            res.json({status: "BAD_ID"});
        }
    }
}

exports.ApiController = ApiController;