var net = require('net');
var tools = require('../tools.js');

var isConnected = false;

var buf_START = Buffer.alloc(2);        // -> 0-1
var buf_LEN = Buffer.alloc(1);          // -> 2
var buf_MAC = Buffer.alloc(6);          // -> 3-8
var buf_PROT_VER = Buffer.alloc(1);     // -> 9
var buf_TEMP = Buffer.alloc(2);         // -> 10-11
var buf_TIME = Buffer.alloc(4);         // -> 12-15
var buf_BATT_LVL = Buffer.alloc(1);     // -> 16 
var buf_BATT_CHARG = Buffer.alloc(1);   // -> 17
var buf_ACTIVE = Buffer.alloc(4);       // -> 18-21
var buf_GPS_LAT = Buffer.alloc(4);      // -> 22-25
var buf_GPS_LON = Buffer.alloc(4);      // -> 26-29
var buf_DEV_STAT = Buffer.alloc(1);     // -> 30
var buf_SW_VER = Buffer.alloc(1);       // -> 31
var buf_STOP = Buffer.alloc(2);         // -> 32-33

buf_START = Buffer.from([0xAA, 0xBB]);
buf_LEN = Buffer.from([0x1D]);
buf_MAC = Buffer.from([0x12, 0x12, 0x12, 0x12, 0x12, 0x12]);
buf_PROT_VER = Buffer.from([0x01]);
buf_TEMP = Buffer.from([0x01, 0x60]);
buf_TIME = Buffer.from([0x58, 0x45, 0xCD, 0xA6]);
buf_BATT_LVL = Buffer.from([0x32]);
buf_BATT_CHARG = Buffer.from([0x01]);
buf_ACTIVE = Buffer.from([0x00, 0x00, 0xFF, 0xFF]);
buf_GPS_LAT = Buffer.from([0x02, 0xFB, 0xD3, 0xA0]);
buf_GPS_LON = Buffer.from([0x01, 0x2A, 0xA7, 0xF5]);
buf_DEV_STAT = Buffer.from([0x04]);
buf_SW_VER = Buffer.from([0x02]);
buf_STOP = Buffer.from([0xCC, 0xDD]);

var buf_MESSAGE = Buffer.concat([buf_START, buf_LEN, buf_MAC, buf_PROT_VER, buf_TEMP,
        buf_TIME, buf_BATT_LVL, buf_BATT_CHARG, buf_ACTIVE, buf_GPS_LAT, buf_GPS_LON, buf_DEV_STAT, 
        buf_SW_VER, buf_STOP], 34);

var client_socket = net.connect({port:5000, host:'localhost'});

client_socket.on('connect', function() {
    console.log('Connected to the server!')
    isConnected = true;
    
    client_socket.on('data', function(chunk) {
        var buf = Buffer.from(chunk);
        switch(buf.length) {
            case 7:
                console.log('ACK received');
        }
    }
)
});

setInterval(function() {
    if (isConnected) {
        client_socket.write(buf_MESSAGE, function() {
            console.log('buf_MESSAGE sent to to the proxy');
        });
    }
}, 10000);

