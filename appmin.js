var net = require('net');
var mqtt = require('mqtt');
var tr50api = require('./tr50api.js');
var tools = require('./tools.js');
var moment = require('moment');

const FRAME_ACK_TCP_RCV_OK = [0x52, 0x43, 0x56, 0x5f, 0x4f, 0x4b, 0x0a];

var server = net.createServer(function (socket) {
    socket.on('data', function(chunk) {
        var buf = Buffer.from(chunk);

if (buf.length === 34) {
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

            var client_mqtt = mqtt.connect('mqtt://api.devicewise.com', {
                port: 1883, username: tailMacAddr, password: 'YzT7SyIkdStcOy1x', clientId: '345j6k3890kjlk2342'
            });

            client_mqtt.publish('api', JSON.stringify(tr50api.logPublish('STD_MSG; ' + ' FRM_LEN: ' + tailPacketLen +
                '; PROT_VER: ' + tailProtVer + '; MAC: ' + tailMacAddr + '; TEMP: ' + tailTemp + '; TIME: ' + tailTimeStamp +
                '; BATT: ' + tailBatt + '; BSTAT: ' + tailBattStat + '; ACT: ' + tailActLevel +
                '; GPS_LAT: ' + tailGpsLat + '; GPS_LON: ' + tailGpsLon + '; DEV_STAT: ' + tailDevStat + '; SW_VER: ' + tailSwVer)));

            client_mqtt.publish('api', JSON.stringify(tr50api.locationPublish(tailGpsLat, tailGpsLon)));
            client_mqtt.publish('api', JSON.stringify(tr50api.attributePublish('mac', tailMacAddr)));
            client_mqtt.publish('api', JSON.stringify(tr50api.attributePublish('prot_ver', tailProtVer)));
            client_mqtt.publish('api', JSON.stringify(tr50api.attributePublish('fw_ver', tailSwVer)));
            client_mqtt.publish('api', JSON.stringify(tr50api.propertyPublish('activity', tailActLevel)));
            client_mqtt.publish('api', JSON.stringify(tr50api.propertyPublish('batt_level', tailBatt)));
            client_mqtt.publish('api', JSON.stringify(tr50api.propertyPublish('temp', tailTemp)));

            client_mqtt.publish('api', JSON.stringify(tr50api.alarmPublish('batt_stat', tailBattStat, getAlarmStatMsg('batt_stat', tailBattStat))));
            client_mqtt.publish('api', JSON.stringify(tr50api.alarmPublish('dev_stat', tailDevStat, getAlarmStatMsg('dev_stat', tailDevStat))));

            socket.destroy();
            client_mqtt.end();
            }
    });
});

server.listen(1720, function () { });

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