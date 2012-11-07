#!/usr/bin/env node


var CAMPOS = {
    DATOS_REQUERIDOS: 1,
    TIPO_NO_VALIDO: 2,
    VALORES_INCORRECTOS: 4,

    REQUIRED: 1,
    DATATYPE_ERROR: 2,
    VALUE_ERROR: 3,
    MINLEN_ERROR: 4,
    MAXLEN_ERROR: 5
}
var CAMPOS_DESC = {
    1: 'Campo requerido',
    2: 'Tipo de dato no válido',
    3: 'Dato incorrecto',
    4: 'Campo demasiado corto',
    5: 'Campo muy largo'
}


var mongo = require('mongodb');

var server = new mongo.Server('localhost', 27017, {auto_reconnect: true});
var db = new mongo.Db('truco', server, {safe:false});


// MD5 para gravatar
/*
var data = "asdf";
var crypto = require('crypto');
crypto.createHash('md5').update(data).digest("hex");
// '912ec803b2ce49e4a541068d495ab570'
*/

//db.open(function(err, db) {
//    if(!err) {
//        db.collection('usuarios', function(err, collection) {
//            collection.find().toArray(function(err, results) {
//                console.log(err);
//                console.log(results);
//            });
//            var doc1 = {'username':'pablo', password: '1234'};
//            //        var doc2 = {'hello':'doc2'};
//            //        var lotsOfDocs = [{'hello':'doc3'}, {'hello':'doc4'}];
//
//            //        collection.insert(doc1);
//
//            //        collection.insert(doc2, {safe:true}, function(err, result) {});
//            //        collection.insert(lotsOfDocs, {safe:true}, function(err, result) {});
//        });
//    }
//});


var ext = {
    extTypes: {
        "css" : "text/css",
        "html": "text/html; charset=UTF-8",
        "ico" : "image/vnd.microsoft.icon",
        "js"  : "application/javascript",
        "json": "application/json",
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
    //port = process.argv[2] || 8080;
/* **** */

if(!fs.exists) {
    fs.exists = path.exists;
}

var server = http.createServer(function(request, response) {

    var uri = url.parse(request.url).pathname;
    var filename = path.join(process.cwd(), 'clientes', uri);
    switch(uri) {
        case '/':
            response.writeHead(303, {
            "Location": '/alpha/index.html'
            });
            response.end();
            return;
            break;
        case '/signup':
            if(request.method == 'POST') {
                //console.log('Content-Type', request.headers['content-type']);

                request.on('data', function(chunk) {
                    try {
                        var data = JSON.parse(chunk.toString());
                    } catch (err) {
                        response.writeHead(400, {
                            "Content-Type": 'text/plain; charset=UTF-8'
                        });
                        response.write('Bad Request');
                        response.end();
                        return;
                    }

                    db.collection('usuarios', function(err, collection) {
                        // TODO Crear índice nick
                        var errores = [];
                        data.username = data.username.replace(/^\s+|\s+$/g, '');
                        if(data.username == '') {
                            errores.push({campo: 'username', cod: CAMPOS.REQUIRED, desc: CAMPOS_DESC[CAMPOS.REQUIRED]});
                        }
                        else {
                            var formatoUsername = /^[a-z][-_.a-záéíóüñ0-9]{3,15}$/i;
                            if(!formatoUsername.test(data.username)) {
                                errores.push({campo: 'username', cod: CAMPOS.DATATYPE_ERROR, desc: 'Formato no válido'});
                            }
                        }
                        if(data.password1 != data.password2) {
                            errores.push({campo: 'password2', cod: CAMPOS.VALUE_ERROR, desc: 'La contraseña y su confirmación no coinciden'});
                        }
                        if(errores.length) {
                            response.write(JSON.stringify({correcto: false, 'errores': errores}));
                            response.end();
                            return;
                        }
                        

                        collection.findOne({username: data.username}, function(err, result) {
                            response.writeHead(200, {
                                "Content-Type": ext.getContentType(ext.getExt('json'))
                            });
                            if(result) {
                                response.write(JSON.stringify({correcto: false, errores: [{campo: 'username', cod: CAMPOS.VALUE_ERROR, desc: 'El nombre de usuario no está disponible.'}]}));
                                response.end();
                            }
                            else {
                                collection.insert({username: data.username, pass: data.password1, email: data.email}, function(err, result) {
                                    response.write(JSON.stringify({correcto: true}));
                                    response.end();
                                });
                            }
                        });
                    });
                });
            }
            else {
                response.writeHead(405, {
                    "Content-Type": 'text/plain; charset=UTF-8'
                });
                response.write('Method Not Allowed');
                response.end();
            }
            return;
            break;
    }
//    if(uri == '/') {
//        response.writeHead(303, {
//            "Location": '/alpha/index.html'
//        });
//        response.end();
//        return;
//    }

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
                    console.log(exception);
                    respuesta = {type: 'error', cod: 1, desc: 'No se pudo interpretar la orden.'};
                }
            }
            else {
                respuesta = {type: 'error', cod: 2, desc: 'Tipo de mensaje ('+data.type+') erroneo.'};
            }

            if(typeof respuesta == 'object') {
                console.log('Respuesta: ' + respuesta.type);
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


/* ************************************************************************** */


var mediador = {
    nick: function(data, conexion) {
        var nickname = data.nick.trim();
//            var nickname = formulario.elements.namedItem('nick').value.replace(/^\s+|\s+$/g, '');
//console.log(nickname, nickname.length);
//        if(nickname == '') {}
        conexion.nickname = nickname;
        usuarios.push(conexion);
        Lobby.agregarUsuario(conexion);
        return {type: 'entrada_lobby', total_mesas: mesas.length, total_usuarios: usuarios.length, historial: Lobby.mensajes};
    },
    login: function(data, conexion) {
        var nickname = data.nick.trim();
        var password = data.pass.trim();
//            var nickname = formulario.elements.namedItem('nick').value.replace(/^\s+|\s+$/g, '');
//console.log(nickname, nickname.length);
//        if(nickname == '') {}

        db.collection('usuarios', function(err, collection) {
            // TODO Crear índice nick
            collection.findOne({username: nickname}, function(err, result) {
                if(!result) {
                    // TODO No va más el insert
                    collection.insert({username: nickname, pass: password}, function(err, result) {
                        // Duplicado
                        conexion.nickname = nickname;
                        usuarios.push(conexion);
                        Lobby.agregarUsuario(conexion);
                        broadcast({type: 'entrada_lobby', total_mesas: mesas.length, total_usuarios: usuarios.length, historial: Lobby.mensajes}, [conexion], null);
                    });
                }
                else {
                    if(result.pass != password) {
                        // FIXME Enviar Error correcto
                        broadcast({type: 'error', desc: 'Usuario incorrecto'}, [conexion], null);
                        return;
                    }
                    // Duplicado
                    conexion.nickname = nickname;
                    usuarios.push(conexion);
                    Lobby.agregarUsuario(conexion);
                    Lobby.getHistorial(conexion, {type: 'entrada_lobby', total_mesas: mesas.length, total_usuarios: usuarios.length});
                    //broadcast({type: 'entrada_lobby', total_mesas: mesas.length, total_usuarios: usuarios.length, historial: Lobby.mensajes}, [conexion], null);
                }
            });
        });
    },
    desconectar: function(data, conexion) {
        conexion.close();
    },
    reconectar: function(data, conexion) {
        console.log(data.nick);
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
        var mesa = new Mesa(conexion, data.cantidad, data.privacidad);
        //mesas.push(mesa);
        //data.mesa = mesas.indexOf(mesa);
    },
    mesa_entrar: function(data, conexion) {
        var mesa = mesas[data.mesa];
        conexion.ubicacion.eliminarUsuario(conexion);
        conexion.ubicacion = mesa;
        conexion.ubicacion.agregarUsuario(conexion);
        // FIXME mesa.jugadores circular data.
        var i;
        var usuarios = [];
        for(i = 0; i < mesa.usuarios.length; i++) {
            usuarios.push({nick: mesa.usuarios[i].nickname});
        }
        var _jugadores = [];
        for(i = 0; i < mesa.jugadores.length; i++) {
            if(mesa.jugadores[i]) {
                _jugadores.push({nick: mesa.jugadores[i].nickname});
            }
            else {
                _jugadores.push(null);
            }
        }
        //jugadores: mesa.jugadores, usuarios: mesa.usuarios,
        mesa.getHistorial(conexion, {type: 'entrada_mesa', jugadores: _jugadores});
    },
    mesa_abandonar: function(data, conexion) {
        conexion.ubicacion.eliminarUsuario(conexion);
        conexion.ubicacion = Lobby;
        conexion.ubicacion.agregarUsuario(conexion);
        return {type: 'entrada_lobby', total_mesas: mesas.length, total_usuarios: usuarios.length, historial: Lobby.mensajes};
    },
    obtener_mesas: function(data, conexion) {
        var listado = [];
        for(var i = 0; i < mesas.length; i++) {
            listado.push({
                id: i,
                _id: mesas[i].id,
                cantidadJugadores: mesas[i].cantidadJugadores,
                usuarios: mesas[i].usuarios.length,
                jugadores: mesas[i].jugadores.length,
                creadoTiempo: mesas[i].creadoTiempo
            });
        }

        return {type: 'listado_mesas', "mesas": listado};
    },
    partida_unirse: function(data, conexion) {
        conexion.ubicacion.agregarJugador(conexion, data.pos);
    }
};

function broadcast(data, usuarios, conexion_origen) {
console.log('broadcast '+data.type);
    var str = JSON.stringify(data);
    for(var i = 0; i < usuarios.length; i++) {
        if(conexion_origen !== usuarios[i]) {
console.log('     '+usuarios[i].nickname);

            usuarios[i].sendUTF(str);
        }
    }
}

function Jugador() {
    this.nick = null;
}

function Mesa(propietario, cantidadJugadores, privacidad) {
    this.id;
    var date = new Date();
    this.creadoTiempo = date.getTime();
    this.cantidadJugadores = parseInt(cantidadJugadores);
    this.privacidad = privacidad;
    this.jugadores = new Array(this.cantidadJugadores);

    this.usuarios = [];
    this.mensajes = [];
    this.iniciado = false;
    this.muestra;
    this.enJuego = new Array();
    var self = this;

    db.collection('mesas', function(err, collection) {
        collection.insert({creadoTiempo: self.creadoTiempo, mensajes: []}, function(err, result) {
            self.id = result[0]._id;
console.log(err, self.id);
            if(propietario) {
                mesas.push(self);
                self.jugadores[0] = propietario;
                var data = {mesa: mesas.indexOf(self)}
                mediador.mesa_entrar(data, propietario);
                broadcast({type: 'mesa_agregar', mesa: {
                    id: mesas.indexOf(self),
                    _id: self.id,
                    cantidadJugadores: self.cantidadJugadores,
                    usuarios: self.usuarios.length,
                    jugadores: self.jugadores.length,
                    creadoTiempo: self.creadoTiempo
                }}, Lobby.usuarios, null);
            }
        });
    });
}

Mesa.prototype = {
    agregarUsuario: function(conexion) {
        conexion.ubicacion = this;
        this.usuarios.push(conexion);
        var date = new Date();
        var time = date.getTime();
        var data = {type: 'user_add', nick: conexion.nickname, tiempo: time};
        this.agregarMensaje(data);
        broadcast(data, this.usuarios, null);
    },
    eliminarUsuario: function(conexion) {
        this.usuarios.splice(this.usuarios.indexOf(conexion), 1);
        var date = new Date();
        var time = date.getTime();
        var data = {type: 'user_del', nick: conexion.nickname, tiempo: time};
        this.agregarMensaje(data);
        broadcast(data, this.usuarios, conexion);

        if(this.usuarios.length == 0) {
            var index = mesas.indexOf(this);
            if(index > -1) {
                mesas.splice(mesas.indexOf(this), 1);
                broadcast({type: 'mesa_eliminar', mesa: {id: index, _id: this.id}}, Lobby.usuarios, null);
            }
        }
    },
    agregarJugador: function(conexion, pos) {
        if(this.jugadores.indexOf(conexion) == -1) {
            this.jugadores[pos] = conexion;
            broadcast({type: 'jugador_agregar', jugador: conexion.nickname, 'pos': pos}, conexion.ubicacion.usuarios, null);
        }
    },
    agregarMensaje: function(data) {

        var self = this;
        db.collection('mesas', function(err, mesas) {
            mesas.update({_id: self.id}, {$push: {mensajes: data}}, function(err, result) {
                
            });
        });
//        this.mensajes.push(data);
//        if(this.mensajes.length > 10) {
//            this.mensajes.splice(0, 1)
//        }
    },
    getHistorial: function(conexion, data) {
        var self = this;
        db.collection('mesas', function(err, mesas) {
console.log('find '+self.id);
            mesas.findOne({_id: self.id}, function(err, item) {
                console.log(item);
                data.historial = item ? item.mensajes : [];
                broadcast(data, [conexion], null);
            });
        });
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
    }
};

var Lobby;
db.open(function(err, db) {
    if(err) {
        console.log("MongoDB: No estás conectado.");
    }
    Lobby = new Mesa(null, 0);
});
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

var mesas_total = 0;
var mesas = [];

var usuarios = [];