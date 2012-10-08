//var wsUri = "ws://echo.websocket.org/";

var websocket;
var wsUri = 'ws://'+document.location.hostname+':8080';
//var wsUri = "ws://localhost:8080";
var output;
function init() {
    //output = document.getElementById("output");
    openWebSocket();
}

function openWebSocket() {

    websocket = new WebSocket(wsUri, 'chat');//, 'echo-protocol');

    websocket.onopen = function(evt) {
//        console.log(evt);
    };
    websocket.onclose = function(evt) {
//        console.log(evt);
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

function writeToScreen(message) {
    return;
    //var pre = document.createElement("p");
    //pre.style.wordWrap = "break-word";
    //pre.innerHTML = message;
    //output.appendChild(pre);
//        output.appendChild(document.createTextNode(message+'\n'));
    output.innerHTML += message+'\n';
}

function login(formulario) {
    var nickname = formulario.elements.namedItem('nick').value;
    if(nickname == '') {
        alert("No, m'hijo.\nMeté un nombre.");
        return false;
    }
    websocket.send(JSON.stringify({type: 'nick', nick: nickname}));
    return false;
}

function enviarMensaje(textarea) {
    var valor = textarea.value;
    textarea.value = '';
    websocket.send(JSON.stringify({type: 'mensaje', mensaje: valor}));
}

function crearMesa(cantidadJugadores) {
    websocket.send(JSON.stringify({type: 'crear_mesa', cantidad: cantidadJugadores}));
}

var listeners = {
    entrada_lobby: function(data) {
        document.getElementById('login').style.display = 'none';
        document.getElementById('lobby').style.display = 'block';
        document.getElementById('total_usuarios').firstChild.textContent = data.total_usuarios;
        document.getElementById('total_mesas').firstChild.textContent = data.total_mesas;
        for(var i = 0; i < data.historial.length; i++) {
console.log(data.historial[i].type);
            this[data.historial[i].type](data.historial[i]);
//            this.mensaje(data.historial[i]);
        }
        //console.log('Mesas: %s. Usuarios: %s', data.total_mesas, data.total_usuarios)
    },
    entrada_mesa: function(data) {
        document.getElementById('lobby').style.display = 'none';
        document.getElementById('mesa').style.display = 'block';
        //document.getElementById('total_usuarios').firstChild.textContent = data.total_usuarios;

        for(var i = 0; i < data.historial.length; i++) {
            this.mensaje(data.historial[i]);
        }
    },
    error: function(data) {
        document.getElementById('errorMensaje').innerHTML = data.desc;
        document.getElementById('error').style.display = 'block';
    },
    mensaje: function(data) {

        newExcitingAlerts(data.nick+': '+data.mensaje);
        var mensajes = document.getElementById('mensajes');
        var p = mensajes.appendChild(document.createElement('p'));
        var date = new Date();
        date.setTime(data.tiempo);
        p.appendChild(document.createTextNode('['+date.toLocaleTimeString()+'] '));
        var nick = document.createElement('span');
        nick.className = 'nickname';
        nick.appendChild(document.createTextNode(data.nick+':'));
        p.appendChild(nick);
        p.appendChild(document.createTextNode(' '+data.mensaje));
    },
    user_add: function(data) {
        var mensajes = document.getElementById('mensajes');
        var p = mensajes.appendChild(document.createElement('p'));
        var date = new Date();
        date.setTime(data.tiempo);
        p.appendChild(document.createTextNode('['+date.toLocaleTimeString()+'] '));
        p.appendChild(document.createTextNode(' '+data.nick+' ha entrado.'));
    },
    user_del: function(data) {
        var mensajes = document.getElementById('mensajes');
        var p = mensajes.appendChild(document.createElement('p'));
        var date = new Date();
        date.setTime(data.tiempo);
        p.appendChild(document.createTextNode('['+date.toLocaleTimeString()+'] '));
        p.appendChild(document.createTextNode(' '+data.nick+' se fue.'));
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
