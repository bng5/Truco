//var wsUri = "ws://echo.websocket.org/";

var websocket;
var wsUri = 'ws://'+document.location.host;
var output;

//function Jugador() {
//    this.nick = null;
//    this.reconexion_intentos = 0;
//}

var jugador = {
    nick: null,
    reconexion_intentos: 0
};

function init() {
    document.getElementById('nick').focus();
}

/**
 * @param function callback
 * @param bool reconexion
 */
function openWebSocket(callback, reconexion) {

    if(reconexion) {
        jugador.reconexion_intentos++
    }
    
    websocket = new WebSocket(wsUri, 'chat');//, 'echo-protocol');

    websocket.onopen = function(evt) {
        if(callback) {
            callback();//function(evt) {
    //        console.log(evt);
        }
    }
    
    websocket.onclose = function(evt) {
        console.log(evt);
        //alert(' code: '+evt.code+'  \n reason: '+evt.reason+' \n wasClean: '+(evt.wasClean ? 'si' : 'no'));
        if(!evt.wasClean && jugador.reconexion_intentos == 0) {
            //reconectar();
            openWebSocket(function() {
                if(jugador.nick) {
                    websocket.send(JSON.stringify({type: 'reconectar', nick: jugador.nick}));
                }
                jugador.reconexion_intentos = 0;
            }, true);
            listeners.error({desc: 'Se ha perdido la conexi\u00F3n con el servidor.'});
        }
    };
    websocket.onmessage = function(evt) {
        //console.log(evt);
        data = JSON.parse(evt.data);
console.log(data.type);
        try {
            listeners[data.type](data);
        } catch (exception) {
            listeners.error({desc: exception.message});
        }
    };
    
    websocket.onerror = function(evt) {
        console.log(evt);
        evt.stopPropagation();
        evt.preventDefault();
        jugador.reconexion_intentos = 0;
        listeners.error({desc: 'No fue posible conectar al servidor.'});
    };
}

function login(formulario) {
    var nickname = formulario.elements.namedItem('nick').value.replace(/^\s+|\s+$/g, '');
    //var nickname = formulario.elements.namedItem('nick').value;
    if(nickname == '') {
        alert("No, m'hijo.\nMet\u00E9 un nombre.");
        document.getElementById('nick').focus();
        return false;
    }
    var password = formulario.elements.namedItem('password').value.replace(/^\s+|\s+$/g, '');
    if(password == '') {
        alert("Cualquier contrase\u00F1a.\n Una f\u00E1cil, no importa.");
        document.getElementById('password').focus();
        return false;
    }
    openWebSocket(function() {
        websocket.send(JSON.stringify({type: 'login', nick: nickname, pass: password}));
        jugador.nick = nickname;
    });
    return false;
}

function signup(formulario) {
    var el;
    var data = {};
    for(var i = 0; i < formulario.elements.length; i++) {
        el = formulario.elements[i];
        if(el.name == '') {
            continue;
        }
        data[el.name] = el.value;
    }
    $.ajax({
        url: formulario.action,
        type: "POST",
        'data': JSON.stringify(data),
        dataType: 'json',
        contentType: 'application/json; charset=UTF-8',
        success: function(data, textStatus, jqXHR) {
            console.log(data, textStatus, jqXHR);
        }
    });
    return false;
}

function reconectar() {
    console.log(websocket);
}

function desconectar() {
    websocket.send(JSON.stringify({type: 'desconectar'}));
    //websocket.close();
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

function crearMesa(cantidadJugadores, privacidad) {
    websocket.send(JSON.stringify({type: 'mesa_crear', cantidad: cantidadJugadores, 'privacidad': privacidad}));
}

function entrarMesa(event) {
    var mesa_id = event.target.getAttribute('data-mesa');
    websocket.send(JSON.stringify({type: 'mesa_entrar', mesa: mesa_id}));
}

function abandonarMesa() {
    websocket.send(JSON.stringify({type: 'mesa_abandonar'}));
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
        document.getElementById('mesa').hidden = true;
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
        var mensajes = document.getElementById('mensajes');
        while(mensajes.firstChild) {
            mensajes.removeChild(mensajes.firstChild);
        }

        //document.getElementById('total_usuarios').firstChild.textContent = data.total_usuarios;

        Chat.mensajes = document.getElementById('mensajes_mesa');
        for(var i = 0; i < data.historial.length; i++) {
            this[data.historial[i].type](data.historial[i]);
        }
console.log(data.jugadores);
        var jugadores = '';
        for(var i = 0; i < data.jugadores.length; i++) {
            jugadores += '<li class="equipo '+(i%2 ? 'b' : 'a')+'">'+(data.jugadores[i] ? data.jugadores[i].nick : '<a title="Unirse a la partida" onclick="alert(\'unirse\')">_____________</a>')+'</li>';
        }
        $("#area_juego").html('<ol>'+jugadores+'</ol>');

    },
    error: function(data) {
        console.error(data);
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
    listado_mesas: function(data) {
        var lista = document.getElementById('lista_mesas');
        var li, a;
        for(var i = 0; i < data.mesas.length; i++) {
            li = lista.appendChild(document.createElement('li'));
            a = li.appendChild(document.createElement('a'));
            a.setAttribute('data-mesa', data.mesas[i].id);
            a.addEventListener('click', entrarMesa, false);
            a.appendChild(document.createTextNode(data.mesas[i]._id));
            li.appendChild(document.createTextNode(' ('+data.mesas[i].jugadores+'/'+data.mesas[i].cantidadJugadores+')'));
//            creadoTiempo 1351916419994
//            usuarios 1
        }
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



$(function() {
    $("#jugadores_radio").buttonset();
    $("#privacidad_radio").buttonset();
    $("#mesa_crear").click(function() {
        //$("#jugadores_radio1").button( { icons: {primary:'ui-icon-gear',secondary:'ui-icon-triangle-1-s'} } );
        $("#mesa_crear_dialog").dialog({
            resizable: true,
            width: 400,
            height:248,
            modal: true,
            buttons: {
                "Cancelar": function() {
                    $(this).dialog( "close" );
                },
                "Aceptar": function() {
                    $(this).dialog( "close" );
                    var formulario = document.forms.namedItem('mesa_crear_form');
                    crearMesa($('input[name=jugadores]:checked', formulario).val(), $('input[name=privacidad]:checked', formulario).val());
                }
            },
            open: function() {
                $(this).parent().find('.ui-dialog-buttonpane button:eq(1)').focus();
            }
        });
    });
});