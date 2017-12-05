/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var Promise = require('promise'),
        playerManagement = require('./playerManagement.js');

    module.exports.addServer = function (message, db, callback) {
        var server = {
            _id: 0,
            botStarted: true,
            trackStarted: false
        };
        server._id = message.channel.id;
        db.collection("server").insert(server, function (err, result) {
            if (err) {
                console.log("Error pushing data :" + err);
            } else if (result) {
                message.channel.send("Server instance was not found, so " +  message.channel + " was added to the database!");
                callback();
            }
        });
    };

    module.exports.findServer = function (channelId, db, callback) {
        db.collection('server').find({"_id": channelId}).toArray(function (err, items) {
            if (err) {
                console.log("Error getting the server from the database. " + err);
            } else if (items) {
                callback(items);
            }
        });
    };

    module.exports.findServers = function (db, callback) {
        db.collection('server').find({}).toArray(function (err, items) {
            if (err) {
                console.log("Error getting the server from the database " + err);
            } else if (items) {
                callback(items);
            }
        });
    };

    module.exports.updateServer = function (id, botStarted, db, callback) {
        db.collection('server').updateOne(
            { "_id" : id },
            {
                $set: {
                    "botStarted": botStarted
                },
            },
            function (err, results) {
                if (err) {
                    console.log("Error occured while updating Server info " + err);
                } else if (results) {
                    callback(results);
                }
            }
        );
    };

    module.exports.removeServerFromPlayer = function (channelId, playerName, db) {
        var i = 0, found = false, foundServerId;
        return new Promise(function (fullfill, reject) {
            playerManagement.findPlayerName(playerName, db, function (res) {
                if (res.length !== 0) {
                    for (i; i < res[0].serverId.length; i++) {
                        found = true;
                        foundServerId = res[0].serverId[i];
                    }
                    if (foundServerId === channelId) {
                        db.collection('user').update({"name": { $regex : new RegExp(playerManagement.regExpEscape(playerName), "i") }}, { $pull: { "serverId": channelId}}, function (err, result) {
                            if (err) {
                                console.log("Error occured while deleting a server from the user. " + err);
                            } else if (result) {
                                fullfill(res);
                            }
                        });
                    } else if (i === res[0].serverId.length && !found) {
                        reject();
                    }
                } else {
                    reject();
                }
            });
        });
    };

    module.exports.removeServerTrackFromPlayer = function (serverId, playerName, db) {
        return new Promise(function (fullfill, reject) {
            playerManagement.findPlayerName(playerName, function (res) {
                if (res.length !== 0) {
                    db.collection('user').update({"name": { $regex : new RegExp(playerManagement.regExpEscape(playerName), "i") }}, { $pull: { "trackedBy": serverId}}, function (err, result) {
                        if (err) {
                            reject(err);
                        } else if (result) {
                            serverId.send("Player **" + playerName + "** is no longer tracked.");
                            fullfill(result);
                        }
                    });
                } else {
                    serverId.send("Player **" + playerName + "** does not exist in your guild!");
                }
            });
        });
    };

    module.exports.updateTrackInServer = function (id, isTracking, db) {
        return new Promise(function (fullfill, reject) {
            db.collection('server').updateOne(
                { "_id" : id },
                {
                    $set: {
                        "trackStarted": isTracking
                    },
                },
                function (err, results) {
                    if (err) {
                        reject(err);
                    } else if (results) {
                        fullfill();
                    }
                }
            );
        });
    };

    module.exports.addServerToPlayer = function (serverId, playerName, channel, db, callback) {
        var found = false, i = 0;
        playerManagement.findPlayerName(playerName, db, function (res) {
            if (res.length !== 0) {
                for (i; i < res[0].serverId.length; i++) {
                    if (res[0].serverId[i] === serverId) {
                        found = true;
                    }
                }
                if (i === res[0].serverId.length && found === false) {
                    db.collection('user').update({"name": { $regex : new RegExp("^" + playerManagement.regExpEscape(playerName) + "$", "i") }}, { $push: { "serverId": serverId } }, function (err, result) {
                        if (err) {
                            console.log("Error adding server to the user obj. " + err);
                        } else if (result) {
                            channel.send("The user **" + playerName + "** was added to the database!");
                            callback();
                        }
                    });
                } else {
                    channel.send("User already exists.");
                }
            } else {
                channel.send("User doesn't exist in the database");
            }
        });
    };

    module.exports.setBot = function (db) {
        db.collection('server').updateMany({"botStarted": true}, {$set: { "botStarted": false}}, function (err, res) {
            if (err) {
                console.log("Error stopping all running bots on start " + err);
            } else if (res) {
                console.log("Stopped all running bots.");
            }
        });
    };

}());
