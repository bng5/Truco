#!/usr/bin/env node

var ext = {
    extTypes: {
        "css" : "text/css",
        "html" : "text/html; charset=UTF-8",
        "ico" : "image/vnd.microsoft.icon",
        "js" : "application/javascript",
        "json" : "application/json",
        "png" : "image/png"
    },
    getExt: function (path) {
        var i = path.lastIndexOf('.');
        return (i < 0) ? '' : path.substr(++i);
    },
    getContentType: function (ext) {
        return this.extTypes[ext.toLowerCase()] || 'application/octet-stream';
    }
};

var WebSocketServer = require('websocket').server;
var http = require('http');

/* **** */
var url = require("url"),
    path = require("path"),
    fs = require("fs");
    //port = process.argv[2] || 8888;
/* **** */

if(!fs.exists) {
    fs.exists = path.exists;
}

var server = http.createServer(function(request, response) {

    var uri = url.parse(request.url).pathname;
    var filename = path.join(process.cwd(), 'clientes', uri);
    if(uri == '/') {
        response.writeHead(303, {
            "Location": '/alpha/index.html'
        });
        response.end();
        return;
    }

    fs.exists(filename, function(exists) {
        var http_code = 200;
        if(exists && fs.statSync(filename).isDirectory()) {
            filename = filename.replace(/\/$/, '')+'/index.html';
            if(!fs.existsSync(filename)) {
                exists = false;
            }
        }

        if(!exists) {
            http_code = 404;
            filename = path.join(process.cwd(), 'clientes', '_error', http_code+'.html');
        }

        fs.readFile(filename, function(err, buffer) {
            if(err) {
                http_code = 500;
                console.error(err);
                filename = path.join(process.cwd(), 'clientes', '_error', '500.html');
                buffer = fs.readFileSync(filename);
            }

            response.writeHead(http_code, {
                "Content-Type": ext.getContentType(ext.getExt(filename)),
                "Content-Length": buffer.length
            });
            response.write(buffer);
            response.end();
        });
    });

});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  console.log('originIsAllowed', origin);
  return true;
}

wsServer.on('request', function(request) {

    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('chat', request.origin);//echo-protocol', request.origin);

    // TODO Enviar cantidad de usuarios y métodos de acceso (ej. nick)
    console.log((new Date()) + ' Connection accepted.');
    connection.sendUTF(JSON.stringify({type: 'conectado', version: '0.0.1', espera: 'nick'}));

    connection.on('message', function(message) {
//type: 'utf8', utf8Data
        if(message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            var data = JSON.parse(message.utf8Data);
            var respuesta;
            if(typeof mediador[data.type] == 'function') {
                try {
                    respuesta = mediador[data.type](data, this);
                } catch (exception) {
                    respuesta = {type: 'error', cod: 1, desc: 'No se pudo interpretar la orden.'};
                }
            }
            else {
                respuesta = {type: 'error', cod: 2, desc: 'Tipo de mensaje ('+data.type+') erroneo.'};
            }

            if(typeof respuesta == 'object') {
                this.sendUTF(JSON.stringify(respuesta));
            }
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            this.sendBytes(message.binaryData);
        }
    });

    connection.on('close', function(reasonCode, description) {

//        console.log(reasonCode, description);
//        WebSocketConnection.CLOSE_DESCRIPTIONS = {
//            1000: "Normal connection closure",
//            1001: "Remote peer is going away",
//            1002: "Protocol error",
//            1003: "Unprocessable input",
//            1004: "Reserved",
//            1005: "Reason not provided",
//            1006: "Abnormal closure, no further detail available",
//            1007: "Invalid data received",
//            1008: "Policy violation",
//            1009: "Message too big",
//            1010: "Extension requested by client is required",
//            1011: "Internal Server Error",
//            1015: "TLS Handshake Failed"
//        };
        if(this.ubicacion) {
            this.ubicacion.eliminarUsuario(this);
        }
        usuarios.splice(usuarios.indexOf(this), 1);
    });
//    connection.on('end', function(a,b,c) {
//        console.log('end', a,b,c);
//    });
});

var mediador = {
    nick: function(data, conexion) {
        var nickname = data.nick.trim();
//            var nickname = formulario.elements.namedItem('nick').value.replace(/^\s+|\s+$/g, '');
//console.log(nickname, nickname.length);
//        if(nickname == '') {}


        conexion.nickname = nickname;
        conexion.ubicacion = Lobby;
        usuarios.push(conexion);
        Lobby.agregarUsuario(conexion)
        return {type: 'entrada_lobby', total_mesas: mesas.length, total_usuarios: usuarios.length, historial: Lobby.mensajes};
    },
    mensaje: function(data, conexion) {
        var date = new Date();
        var time = date.getTime();
        var data = {type: 'mensaje', nick: conexion.nickname, mensaje: data.mensaje, tiempo: time};
        conexion.ubicacion.agregarMensaje(data);
        broadcast(data, conexion.ubicacion.usuarios, null);//conexion)
    },
    mesa_crear: function(data, conexion) {
        // TODO: Notifcar Lobby
        var mesa = new Mesa(data.cantidad);
        mesas.push(mesa);
        data.mesa = mesas.indexOf(mesa);
        return this.mesa_entrar(data, conexion);

    },
    mesa_entrar: function(data, conexion) {
        var mesa = mesas[data.mesa];
        conexion.ubicacion.eliminarUsuario(conexion);
        conexion.ubicacion = mesa;
        conexion.ubicacion.agregarUsuario(conexion);
        // FIXME mesa.jugadores circular data.
        var usuarios = [];
        for(var i = 0; i < mesa.usuarios.length; i++) {
            usuarios.push({nick: mesa.usuarios[i].nickname});
        }
        var jugadores = [];
        for(var i = 0; i < mesa.jugadores.length; i++) {
            jugadores.push({nick: mesa.usuarios[i].nickname});
        }
        //jugadores: mesa.jugadores, usuarios: mesa.usuarios,
        return {type: 'entrada_mesa', historial: mesa.mensajes};
    },
    mesa_abandonar: function(data, conexion) {
    }
};

function broadcast(data, usuarios, conexion_origen) {
    var str = JSON.stringify(data);
    for(var i = 0; i < usuarios.length; i++) {
        if(conexion_origen !== usuarios[i]) {
            usuarios[i].sendUTF(str);
        }
    }
}

function Jugador() {
    this.nick = null;
}

function Mesa(cantidadJugadores) {
    this.cantidadJugadores = cantidadJugadores;
    this.usuarios = [];
    this.mensajes = [];
    this.jugadores = [];
    this.muestra;
    this.enJuego = new Array();
}

Mesa.prototype = {
    eliminarUsuario: function(conexion) {
        this.usuarios.splice(this.usuarios.indexOf(conexion), 1);
        var date = new Date();
        var time = date.getTime();
        var data = {type: 'user_del', nick: conexion.nickname, tiempo: time};
        this.agregarMensaje(data);
        broadcast(data, this.usuarios, conexion);

        if(this.usuarios.length == 0) {
            mesas.splice(mesas.indexOf(this), 1);
        }

    },
    agregarMensaje: function(data) {
        this.mensajes.push(data);
        if(this.mensajes.length > 10) {
            this.mensajes.splice(0, 1)
        }
    },
    repartir: function() {

    },
    obtenerCarta: function() {
        var k;
        do {
            valida = true;
            k = Math.floor(Math.random() * cartas.length);
            for(var j = 0; j < this.enJuego.length; j++) {
                if(this.enJuego[j] == k) {
                    valida = false;
                    continue;
                }
            }
        }while(valida == false);
        this.enJuego.push(k);
        return k;
    },
    agregarUsuario: function(conexion) {
        this.usuarios.push(conexion);
        var date = new Date();
        var time = date.getTime();
        var data = {type: 'user_add', nick: conexion.nickname, tiempo: time};
        this.agregarMensaje(data);
        broadcast(data, this.usuarios, null);//conexion);
    }
};

var Lobby = new Mesa();
//var Lobby = {
//    usuarios: [],
//    mensajes: [],
//    eliminarUsuario: function(conexion) {
//        this.usuarios.splice(this.usuarios.indexOf(conexion), 1);
//        var date = new Date();
//        var time = date.getTime();
//        var data = {type: 'user_del', nick: conexion.nickname, tiempo: time};
//        this.agregarMensaje(data);
//        broadcast(data, this.usuarios, conexion);
//    },
//    agregarMensaje: function(data) {
//        this.mensajes.push(data);
//        if(this.mensajes.length > 10) {
//            this.mensajes.splice(0, 1)
//        }
//    },
//    agregarUsuario: function(conexion) {
//        this.usuarios.push(conexion);
//        var date = new Date();
//        var time = date.getTime();
//        var data = {type: 'user_add', nick: conexion.nickname, tiempo: time};
//        this.agregarMensaje(data);
//        broadcast(data, this.usuarios, conexion);
//    }
//};

var mesas = [];

var usuarios = [];