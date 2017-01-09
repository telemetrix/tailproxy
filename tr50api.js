/** Adds tags array to the thing */
function thingTagAdd(tags) {
    var tr50obj = {
                "cmd": {
                    "command": "thing.tag.add",
                    "params":{
                        "tags": tags
                    }
                }
            };

            return tr50obj;
};

/** Publishes log message */
function logPublish(msg) {
    var tr50obj = {
                "1": {
                    "command": "log.publish",
                    "params":{
                        "msg": msg
                    }
                }
            };

            return tr50obj;
};

/** Publishes location */
function locationPublish(lat, lon) {
    var tr50obj = {
	            "1" : {
		            "command" : "location.publish",
		            "params" : {
			            "lat" : lat,
			            "lng" : lon,
			            "fixType" : "gps",
			            "fixAcc" : 5
		            }
	            }
            };

            return tr50obj;
};

/** Publishes property */
function propertyPublish(key, value, aggregate) {
    var tr50obj = {
	            "1" : {
		            "command" : "property.publish",
		            "params" : {
			            "key" : key,
			            "value" : value,
			            "aggregate" : aggregate
		            }
	            }
            };

            return tr50obj;
};

/** attribute.publish */
function attributePublish(key, value) {
    var tr50obj = {
	            "1" : {
		            "command" : "attribute.publish",
		            "params" : {
			            "key" : key,
			            "value" : value
		            }
	            }
            };

            return tr50obj;
};

/** alarm.publish */
function alarmPublish(key, state, msg) {
    var tr50obj = {
	            "1" : {
		            "command" : "alarm.publish",
		            "params" : {
			            "key" : key,
			            "state" : state,
                        "msg" : msg
		            }
	            }
            };

            return tr50obj;
};

exports.thingTagAdd = thingTagAdd;
exports.logPublish = logPublish;
exports.locationPublish = locationPublish;
exports.propertyPublish = propertyPublish;
exports.attributePublish = attributePublish;
exports.alarmPublish = alarmPublish;