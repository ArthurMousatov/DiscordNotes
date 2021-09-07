class RoomManager{
    constructor(){
        this.rooms = new Map();
    }

    /**
     * Adds a room.
     * @param {object} room The room to add.
     */
    addRoom(room){
        this.rooms.set(room.Id, room);
    }

    /**
     * Gets a room based on its index in the rooms array.
     * @param {string} Id The Id of the room.
     * @returns A room object.
     */
    getRoom(Id){
        return this.rooms.get(Id);
    }

    /**
     * Checks if a room exists.
     * @param {string} roomId The Id of the room to search.
     * @returns True if the room exists, false if it doesn't
     */
    containsRoom(roomId){
        return this.rooms.has(roomId);
    }

    /**
     * Gets a randomized string based on a given size.
     * @param {number} length The length of the randomized string.
     * @returns A randomized string.
     */
    static MakeId(length) {
        //string randomizer via https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
        
        //Loop until the result is unique
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
}

module.exports = RoomManager;