import socketIo from 'https://cdn.skypack.dev/socket.io';
import { connectionQuery, userPrefix, webUrl } from './globals.js';

export default class Socket{
    constructor(){
        this.socket = socketIo.connect(webUrl, connectionQuery);
        this.isHost = false;
        this.isMuted = false;
        this.muteAll = false;
    }

    getUserSocket(){
        return this.socket;
    }

    Kick(user){
        let userName = user.slice(userPrefix.length, user.length);

        let data = {
            user: userName
        };

        this.socket.emit('usrKick', data);
    }

    Mute(user){
        let userName = user.slice(userPrefix.length, user.length);

        let data = {
            user: userName
        };

        this.socket.emit('usrMute', data);
    }
}