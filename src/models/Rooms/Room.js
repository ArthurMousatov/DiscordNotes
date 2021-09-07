class Room{
    static TimeOutLimit = 100000;

    constructor(id, host){
        this.Id = id;
        this.host = host;
        this.muteAll = false;
        this.users = new Map();
        this.canvas = [];
    }

    /**
     * Adds a user socket to the room.
     * @param {object} user A user socket.
     */
    addUser(user){
        this.users.set(user.username, user);
    }

    /**
     * Gets the user socket matching the provided username.
     * @param {string} username Username of the user.
     * @returns User socket matching the username, null otherwise.
     */
    getUser(username){
        return this.users.get(username);
    }

    /**
     * Deletes a user from the room.
     * @param {string} username Name of the user to delete.
     * @returns If the user was deleted or not.
     */
    deleteUser(username){
        return this.users.delete(username);
    }

    /**
     * Checks if the user is in the room.
     * @param {string} username The username of the user.
     * @returns True if the rooms contains this user, false otherwise.
     */
    containsUser(username){
        return this.users.has(username);
    }

    /**
     * Gets an array of all usernames + if they are hosts.
     * @returns An array of objects containing the username + if he's a host or not.
     */
    getUserNames(){
        let names = [];
        
        for(let user in this.users)
            names.push({name: this.users.get(user).name, isHost: this.users.get(user).isHost });

        return names;
    }
}

module.exports = Room;