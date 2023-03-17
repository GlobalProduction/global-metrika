import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser";
import http from'http';
import https from 'https';
import { credentials } from "@/@types/server";

class Server {

    private application?: express.Application   = undefined;
    private credentials?: credentials           = undefined;
    private httpServer?: http.Server            = undefined;
    private httpsServer?: https.Server          = undefined;

    constructor() {
        this.application = express()

        this.application.use(cors())
        this.application.use(bodyParser.urlencoded({ extended: false }))
        this.application.use(bodyParser.json())
    }

    async init() {
        this.httpServer = http.createServer(this.application);
        if(this.credentials) this.httpsServer = https.createServer(Object.assign(this.credentials, {}), this.application);
    }

    async use(smth: any) {
        if(!this.application) return;
        this.application.use(smth)
    }

    async start(port1: number, port2: number, host: string, onStart1: Function, onStart2: Function) {
        if(!this.application) return;
        if(!this.httpServer) return;
        if(!this.httpsServer) return;

        this.httpServer.listen(port1, host, () => onStart1())
        this.httpsServer.listen(port2, host, () => onStart2())
    }

    async verifySsl(privateKey: string | Buffer, certificate: string | Buffer) {
        this.credentials = {key: privateKey, cert: certificate};
    }

}

export default new Server()