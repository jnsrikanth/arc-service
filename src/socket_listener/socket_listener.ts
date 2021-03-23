import { emit } from "process"

export class SocketListners {

    static VIDEO_EMIT_SUCCESS_KEY: string = "VIDEO_EMIT_SUCCESS_KEY"
    static VIDEO_EMIT_ERROR_KEY: string = "VIDEO_EMIT_FAILURE_KEY"
    static VIDEO_EMIT_PROGESS_KEY: string = "VIDEO_EMIT_PROGRESS_KEY"
    server: any = undefined
    io: any = undefined
    lunatic_current_ip: any = '';

    constructor(server: any) {
        this.io = require('socket.io')(server);
        this.io.origins('*:*')
    }

    setUpListeners = () => {
        const { io } = this
        io.on('connection', (socket: any) => {
            console.log('A client is connected');
            socket.on('disconnect', () => { console.log('a lunatic client disconnected') });
        });
    }

    emitMessageToClient = (emitMsg: string, reciver: string) => {
        console.log(reciver + "-" + SocketListners.VIDEO_EMIT_PROGESS_KEY + "\n" + emitMsg + "\n\n")
        this.io.sockets.emit(reciver + "-" + SocketListners.VIDEO_EMIT_PROGESS_KEY, emitMsg)
    }

    emitErrorToClient = (emitMsg: string, reciver: string) => {
        console.log(reciver + "-" + SocketListners.VIDEO_EMIT_ERROR_KEY + "\n" + emitMsg + "\n\n")
        this.io.sockets.emit(reciver + "-" + SocketListners.VIDEO_EMIT_ERROR_KEY, emitMsg)
    }

    emitSuccessToClient = (emitMsg: string, reciver: string) => {
        console.log(reciver + "-" + SocketListners.VIDEO_EMIT_SUCCESS_KEY + "\n" + emitMsg + "\n\n")
        this.io.sockets.emit(reciver + "-" + SocketListners.VIDEO_EMIT_SUCCESS_KEY, emitMsg)
    }
}