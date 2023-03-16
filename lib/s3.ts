import {parse} from "url"
import {request} from "https"
import {Writable ,Transform, TransformCallback} from "stream"

export class TransportStream extends Transform {
    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
        callback(null, chunk)
    }
}

class LogWriter extends Writable {
    _write(chunk: any, encoding: BufferEncoding, callback: (error?: (Error | null)) => void) {
        console.log(chunk.toString())
    }
}

export class SelectelStorage {
    private token = ""
    private expire_token = 0
    private storage_url = ""
    private storage_url_host = ""
    private storage_utl_path = ""

    constructor(
        private readonly user: string,
        private readonly password: string
    ){}

    public async uploadFile(remote_path: string, stream: NodeJS.ReadableStream): Promise<void>{
        if(!this.isAuth()) await this.auth()
        return new Promise((resolve, reject)=>{
            const req = request({
                method: "PUT",
                host: this.storage_url_host,
                path: this.storage_utl_path + "/" + remote_path,
                headers: {"X-Auth-Token": this.token}
            })
            stream.pipe(req)
            req.on("response",response => {
                response.resume()
                response.on("end",() => resolve())
            })
            req.on("error",err => reject(err))
        })
    }

    public async downloadFile(remote_path: string): Promise<NodeJS.ReadableStream>{
        if(!this.isAuth()) await this.auth()
        return new Promise((resolve, reject) => {
            const req = request({
                method: "GET",
                host: this.storage_url_host,
                path: this.storage_utl_path + "/" + remote_path,
                headers: {
                    "X-Auth-Token": this.token
                }
            })
            const stream = new TransportStream()
            req.on("response",response => {
                response.pipe(stream)
                resolve(stream)
            })
            req.on("error",err => reject(err))
            req.end()
        })
    }

    private isAuth(): boolean{
        return this.token.length != 0
        && Date.now() < this.expire_token
        && this.storage_url.length != 0
        && this.storage_url_host.length != 0
        && this.storage_utl_path.length != 0
    }

    private auth(){
        return new Promise<void>((resolve, reject)=>{
            const req = request({
                method: "GET",
                host: 'api.selcdn.ru',
                path: '/auth/v1.0',
                headers: {
                    "X-Auth-User": this.user,
                    "X-Auth-Key": this.password
                }
            })
            req.on("response",response => {
                const token = response.headers["x-auth-token"] as string
                const expire_token = response.headers["x-expire-auth-token"] as string
                const storage_url = response.headers["x-storage-url"] as string
                if(response.statusCode == 204 && token && expire_token && storage_url){
                    const storage_parse = parse(storage_url)
                    const storage_url_host = storage_parse.host
                    const storage_url_path = storage_parse.path
                    if(!storage_url_host || !storage_url_path)
                        throw new Error("ERROR AUTH")

                    this.token = token
                    this.expire_token = Date.now() + parseInt(expire_token) * 1000
                    this.storage_url = storage_url
                    this.storage_url_host = storage_url_host
                    this.storage_utl_path = storage_url_path
                }else{
                    throw new Error("ERROR AUTH")
                }
                resolve()
            })
            req.on("error",err => reject(err))
            req.on("timeout",() => reject(new Error("timeout")))
            req.on("close",() => reject(new Error("close")))
            req.end()
        })
    }
}