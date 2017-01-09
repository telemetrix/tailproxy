
/** Function returns number of bytes from integer */
function checkIntByte(int) {
        var bylength = Math.ceil((Math.log(int)/Math.log(2))/8);
        return bylength;
};

/** Function converts bytes to integer */
function getIntFromBytes(buf, start, offset) {
        return buf.readUIntBE(start, offset);
};

/** Function copy one buffer to another and returns new buffer */
function copyBufToBuf(bufsrc, bufdst, index) {
        bufsrc.copy(bufdst, index);
        return bufdst;
};


/** Function returns buffer from integer */
function getBufferFromInt(int) {
        
        var integer = int;
        var length = checkIntByte(integer);
        var buffer = new Buffer(length);
        var arr = [];

        while (integer > 0) {
                var temp = integer % 2;
                arr.push(temp);
                integer = Math.floor(integer/2)
        }

        var counter = 0;
        var total = 0;

        for (var i = 0, j = arr.length; i < j; i++) {

                if (counter % 8 == 0 && counter > 0) {  // do we have a byte full ?
                        buffer[length - 1] = total;
                        total = 0;
                        counter = 0;
                        length--;
                }

                if (arr[i] == 1) {
                        total += Math.pow(2, counter);
                }
                counter++;
        }

        buffer[0] = total;
        return buffer;
};

/** Function returns position offset */
function getDeltaPosition(lat, lon, dy, dx) {

        var new_lat = lat + (dy / 6378) * (180 / Math.PI);
        var new_lon = lon + (dx / 6378) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

        return {
                'lat': new_lat,
                'lon': new_lon
        }
}

exports.getBufferFromInt = getBufferFromInt;
exports.checkIntByte = checkIntByte;
exports.getIntFromBytes = getIntFromBytes;
exports.copyBufToBuf = copyBufToBuf;
exports.getDeltaPosition = getDeltaPosition;