//var wsUri = "ws://echo.websocket.org/";

var websocket;
var wsUri = 'ws://'+document.location.host;
var output;
function init() {
    //output = document.getElementById("output");
    openWebSocket();
    document.getElementById('nick').focus();
}

function openWebSocket() {

    websocket = new WebSocket(wsUri, 'chat');//, 'echo-protocol');

    websocket.onopen = function(evt) {
//        console.log(evt);
    };
    websocket.onclose = function(evt) {
        listeners.error({desc: 'Se ha perdido la conexi\u00F3n con el servidor.'});
    };
    websocket.onmessage = function(evt) {
        //console.log(evt);
        data = JSON.parse(evt.data);
        try {
            listeners[data.type](data);
        } catch (exception) {
            listeners.error({desc: exception.message});
        }

        //websocket.close();
    };
    
    websocket.onerror = function(evt) {
        listeners.error({desc: 'No fue posible conectar al servidor.'});
    };
}

function login(formulario) {
    var nickname = formulario.elements.namedItem('nick').value.replace(/^\s+|\s+$/g, '');
    //var nickname = formulario.elements.namedItem('nick').value;
    if(nickname == '') {
        alert("No, m'hijo.\nMeté un nombre.");
        return false;
    }
    websocket.send(JSON.stringify({type: 'nick', nick: nickname}));
    return false;
}

function capturaEnter(evento, el) {
    if(evento['which'] == 13 && !evento.shiftKey) {
        enviarMensaje(el);
        return false;
    }
    return true;
}

function enviarMensaje(textarea) {
    var valor = textarea.value;
    textarea.value = '';
    websocket.send(JSON.stringify({type: 'mensaje', mensaje: valor}));
}

function crearMesa(cantidadJugadores) {
    websocket.send(JSON.stringify({type: 'mesa_crear', cantidad: cantidadJugadores}));
}

function obtenerMesas() {
    websocket.send(JSON.stringify({type: 'obtener_mesas'}));
}

var Chat = {
    mensajes: null,
    textarea: null,
    agregarMensaje: function(tiempo, mensaje, nickname) {
        //newExcitingAlerts(data.nick+': '+data.mensaje);
        if(!this.mensajes) {
            return;
        }
        var p = this.mensajes.appendChild(document.createElement('p'));
        var date = new Date();
        date.setTime(tiempo);
        var hora = p.appendChild(document.createElement('span'));
        hora.className = 'hora';
        hora.appendChild(document.createTextNode('['+date.toLocaleTimeString()+']'));
        p.appendChild(document.createTextNode(' '));
        if(nickname) {
            var nick = document.createElement('span');
            nick.className = 'nickname';
            nick.appendChild(document.createTextNode(nickname+':'));
            p.appendChild(nick);
        }
        p.appendChild(document.createTextNode(' '+mensaje));
        this.mensajes.scrollTop = (this.mensajes.scrollHeight - this.mensajes.clientHeight);
    }
};

var listeners = {
    conectado: function(data) {
        //docdata.espera
        document.getElementById('version').firstChild.textContent = 'Versión: '+data.version;
    },
    entrada_lobby: function(data) {
        document.getElementById('login').hidden = true;
        document.getElementById('lobby').hidden = false;
        document.getElementById('total_usuarios').firstChild.textContent = data.total_usuarios;
        document.getElementById('total_mesas').firstChild.textContent = data.total_mesas;
console.log(data.total_mesas);
        if(data.total_mesas) {
            obtenerMesas();
        }
        Chat.mensajes = document.getElementById('mensajes');
        for(var i = 0; i < data.historial.length; i++) {
            this[data.historial[i].type](data.historial[i]);
//            this.mensaje(data.historial[i]);
        }
        //console.log('Mesas: %s. Usuarios: %s', data.total_mesas, data.total_usuarios)
    },
    entrada_mesa: function(data) {
        document.getElementById('lobby').hidden = true;
        document.getElementById('mesa').hidden = false;
        //document.getElementById('total_usuarios').firstChild.textContent = data.total_usuarios;

        Chat.mensajes = document.getElementById('mensajes_mesa');
        for(var i = 0; i < data.historial.length; i++) {
            this[data.historial[i].type](data.historial[i]);
        }
    },
    error: function(data) {
        document.getElementById('errorMensaje').innerHTML = data.desc;
        document.getElementById('error').hidden = false;
    },
    mensaje: function(data) {
        Chat.agregarMensaje(data.tiempo, data.mensaje, data.nick);
    },
    user_add: function(data) {
        Chat.agregarMensaje(data.tiempo, data.nick+' ha entrado.');
    },
    user_del: function(data) {
        Chat.agregarMensaje(data.tiempo, data.nick+' se fue.');
    },
    listado_mesa: function(data) {
console.log(data);
    }
};
window.addEventListener("load", init, false);




function newExcitingAlerts(msg) {
    var oldTitle = document.title;
    var timeoutId = setInterval(function() {
        document.title = document.title == msg ? ' ' : msg;
    }, 1000);
    window.onmousemove = function() {
        clearInterval(timeoutId);
        document.title = oldTitle;
        window.onmousemove = null;
    };
}
