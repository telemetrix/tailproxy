var net = require('net');
var mqtt = require('mqtt');
var tr50api = require('./tr50api.js');
var tools = require('./tools.js');
var moment = require('moment');

const FRAME_ACK_TCP_RCV_OK = [0x52, 0x43, 0x56, 0x5f, 0x4f, 0x4b, 0x0a]; // ACK message

var sockets = []; // TCP clients array -> connected to the Proxy
var mqtt_clients = []; // MQTT clients array -> connected to deviceWISE M2M service

var port = 1720; // Proxy TCP port
var mqtt_connection; // Main Proxy MQTT client object -> connected to deviceWISE M2M service

var mqtt_client_id = 0;
var session_id = 0;

var bytesRead = 0;
var bytesWritten = 0;

const PROXY_APP_TOKEN = '7btJ5FKG3wRGJgmz';
const PROXY_USERNAME_ID = 'nodejs_telemetrix_proxy_dev';
const PROXY_PORT = 1883;

const DEVICE_APP_TOKEN = 'YzT7SyIkdStcOy1x';

/** Creates TCP server and sets certain event handlers */
var server = net.createServer(function (socket) {
    setSocketEvents(socket);
});


/** Function deletes TCP and MQTT sockets from session arrays */
function removeSocket(socket) {
    sockets.splice(sockets.indexOf(socket), 1);
    console.log('DELETING socket_id = ' + socket.session_id);

    for (idx in mqtt_clients) {
        console.log('checking mqtt_client_id = ' + mqtt_clients[idx].session_id);
        if (mqtt_clients[idx].session_id === socket.session_id) {
            console.log('ending mqtt_client_id = ' + mqtt_clients[idx].session_id);

            mqtt_clients[idx].end();
            mqtt_clients.splice(idx, 1);

            console.log('ARRAY length: ' + mqtt_clients.length);
            break;
        }
    }
};

/** Function sets TCP socket events for proxy server */
function setSocketEvents(socket) {

    /** Closes TCP socket if doesn't receive any data from the endpoint for Timoeut value */
    socket.setTimeout(15000, function () {
        socket.end();
    });

    socket.isMac = false;
    socket.mac_id = null;

    socket.name = socket.remoteAddress + ":" + socket.remotePort;
    socket.session_id = session_id;
    sockets.push(socket);

    socket.on('close', function () {
        removeSocket(socket);
        mqtt_connection.sendClientsNumber(sockets.length);
    });

    socket.on('data', function (chunk) {

        bytesRead += socket.bytesRead;
        bytesWritten += socket.bytesWritten;
        mqtt_connection.sendBytesReadWritten(bytesRead, bytesWritten);

        var buf = Buffer.from(chunk);

        /** Checking the message type */
        switch (buf.length) {
            case 34:

                socket.write(Buffer.from(FRAME_ACK_TCP_RCV_OK), function () { });

                var tailPacketLen = tools.getIntFromBytes(buf, 2, 1);
                var tailMacAddr = buf.toString('hex', 3, 9);
                var tailProtVer = tools.getIntFromBytes(buf, 9, 1);
                var tailTemp = tools.getIntFromBytes(buf, 10, 2) / 10;
                var tailTimeStamp = moment(tools.getIntFromBytes(buf, 12, 4) * 1000).format();
                var tailTimeStampRaw = tools.getIntFromBytes(buf, 12, 4);
                var tailBatt = tools.getIntFromBytes(buf, 16, 1);
                var tailBattStat = tools.getIntFromBytes(buf, 17, 1);
                var tailActLevel = tools.getIntFromBytes(buf, 18, 4);

                var tailGpsLat = GetLatLon(buf.readInt32BE(22));
                var tailGpsLon = GetLatLon(buf.readInt32BE(26));

                var tailDevStat = tools.getIntFromBytes(buf, 30, 1);
                var tailSwVer = tools.getIntFromBytes(buf, 31, 1);

                /** Tutaj przenieść cały proces tworzenia nowego połączenia MQTT */
                if (!socket.isMac) { // Checks if MAC is set
                    socket.setTimeout(0);   // Clear socket timeout

                    for (ipx in sockets) {
                        if (sockets[ipx].mac_id === tailMacAddr) {
                            
                            sockets[ipx].end();
                            sockets.splice(ipx, 1);
                            
                            mqtt_clients[ipx].end();
                            mqtt_clients.splice(ipx, 1);
                            break;
                        }
                    }

                    socket.mac_id = tailMacAddr;
                    createNewMqttClientConn(socket, tailMacAddr);
                    socket.isMac = true;
                }

                console.log('MSG: STD; ' + tailMacAddr + '; TIME: ' + tailTimeStampRaw + ' ' + tailTimeStamp + '; SOCKET.MAC_ID: ' + socket.mac_id);

                for (idx in mqtt_clients) { // Looping over mqtt clients array
                    if (socket.session_id === mqtt_clients[idx].session_id) {

                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.logPublish('STD_MSG; ' + ' FRM_LEN: ' + tailPacketLen +
                            '; PROT_VER: ' + tailProtVer + '; MAC: ' + tailMacAddr + '; TEMP: ' + tailTemp + '; TIME: ' + tailTimeStamp +
                            '; BATT: ' + tailBatt + '; BSTAT: ' + tailBattStat + '; ACT: ' + tailActLevel +
                            '; GPS_LAT: ' + tailGpsLat + '; GPS_LON: ' + tailGpsLon + '; DEV_STAT: ' + tailDevStat + '; SW_VER: ' + tailSwVer)));

                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.locationPublish(tailGpsLat, tailGpsLon)));
                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.attributePublish('mac', tailMacAddr)));
                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.attributePublish('prot_ver', tailProtVer)));
                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.attributePublish('fw_ver', tailSwVer)));
                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.propertyPublish('activity', tailActLevel)));
                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.propertyPublish('batt_level', tailBatt)));
                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.propertyPublish('temp', tailTemp)));

                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.alarmPublish('batt_stat', tailBattStat, getAlarmStatMsg('batt_stat', tailBattStat))));
                        mqtt_clients[idx].publish('api', JSON.stringify(tr50api.alarmPublish('dev_stat', tailDevStat, getAlarmStatMsg('dev_stat', tailDevStat))));
                    };
                };

                break;
            case 40:
                console.log('EXT Tail Message');
                break;
            default:
                console.log('UNKNOWN Message');
        };

    });

    socket.on('end', function () {
        removeSocket(socket);
        mqtt_connection.sendClientsNumber(sockets.length);
    });

    socket.on('error', function (error) {
        console.log('Error: ' + error);
    });
};


/** Runs proxy server */
server.listen(port, function () {
    console.log('Server listening at localhost: ' + port);
    createProxyMqttConnection();
});

/** Creates main proxy MQTT connection */
function createProxyMqttConnection() {

    var options = {
        port: PROXY_PORT,
        username: PROXY_USERNAME_ID,
        password: PROXY_APP_TOKEN,
        clientId: '345j6k3l5k6j3l4j5k6'
    }

    mqtt_connection = mqtt.connect('mqtt://api.devicewise.com', options);

    mqtt_connection.on('connect', function () {
        console.log('Proxy connected to the server by MQTT protocol.');
    });


    mqtt_connection.sendClientsNumber = function (value) {

        var tr50json = {
            "1": {
                "command": "property.publish",
                "params": {
                    "key": "clients_connected",
                    "value": value
                }
            }
        };

        this.publish('api', JSON.stringify(tr50json));
    };

    mqtt_connection.sendBytesReadWritten = function (read, written) {
        this.publish('api', JSON.stringify(tr50api.attributePublish('readBytes', read)));
        this.publish('api', JSON.stringify(tr50api.attributePublish('wrtittenBytes', written)));
    };
};


function createNewMqttClientConn(socket, tailMacAddr) {
    /** Creates new MQTT client connection */
    var options = {
        port: 1883,
        username: tailMacAddr,
        // username: 'client_'+ mqtt_client_id++, // Sets the client ID and increments for the next one
        password: DEVICE_APP_TOKEN, // Sets DW App Token
        clientId: '345j6k3l5k6j3l4j5k6' + mqtt_client_id
    }

    var mqtt_client = mqtt.connect('mqtt://api.devicewise.com', options);

    mqtt_client.publish('api', JSON.stringify(tr50api.thingTagAdd(['test', 'tomasz', 'telemetrix']))); // Calls DW API and sets tag for the thing

    mqtt_client.session_id = socket.session_id;
    session_id++;
    mqtt_clients.push(mqtt_client)

    console.log('socket.session_id = ' + socket.session_id + ' --- mqtt_client.session_id = ' + mqtt_client.session_id);
    mqtt_connection.sendClientsNumber(sockets.length);
}

function getAlarmStatMsg(key, status) {
    if (key == 'batt_stat') {
        switch (status) {
            case 0:
                return 'battery is charged';
            case 1:
                return 'battery is charging';
            case 2:
                return 'battery is discharging';
        }
    } else if (key == 'dev_stat') {
        switch (status) {
            case 0:
                return 'device before production tests';
            case 1:
                return 'device in production tests';
            case 2:
                return 'device tested';
        }
    }
};

function GetLatLon(value) {

    val_temp = value;
    var1 = Math.floor(value / 1000000);
    var2 = Math.floor((val_temp - (var1 * 1000000)) / 10000) / 60;
    var3 = ((val_temp - (Math.floor(val_temp / 10000) * 10000)) / 100) / 3600;

    var number = new Number(var1 + var2 + var3);
    return number.toPrecision(7);
};
