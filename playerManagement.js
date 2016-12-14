/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var today = new Date('1970-09-24 8:30:16'),
        Promise = require('promise'),
        playerManagement = require('./playerManagement.js'),
        osuapi = require('osu-api'),
        dotenv = require('dotenv').config(),
        osu = new osuapi.Api(process.env.osuApi, osuapi.Modes.osu),
        scoreManagement = require('./scoreManagement.js'),
        messageManagement = require('./messageManagement.js'),
        playerFormation = require('./playerFormation.js'),
        calculations = require('./calculations.js');

    module.exports.addPlayer = function (id, message, db) {
        var newUser = {
                _id: 0,
                name: '',
                rank: 0,
                pp: 0,
                accuracy: 0,
                totalpp: 0,
                totalrank: 0,
                trackedBy: [],
                serverId: [],
                recentScore: {
                    beatmapId: undefined,
                    combo: undefined,
                    count300: undefined,
                    count100: undefined,
                    count50: undefined,
                    date: today.toISOString(),
                    mapRank: undefined,
                    mapMods: undefined
                },
                topScores: []
            };
        return new Promise(function (fullfill, reject) {
            /*global setUser*/
            playerFormation.setUser(id, message, newUser, osu, function () {
                /*global setRecentScores*/
                playerFormation.setRecentScores(id, newUser, osu, function () {
                    /*global getTopScores*/
                    playerFormation.getTopScores(id, osu)
                        .then(function (entry) {
                            newUser.topScores = entry;
                            db.collection('user').insert(newUser, function (err, result) {
                                if (err) {
                                    reject(err);
                                } else if (result) {
                                    message.sendMessage("The user **" + newUser.name + "** was added to the database!");
                                    fullfill(result);
                                }
                            });
                        });
                });
            });
        });
    };

    module.exports.returnPlayers = function (db, callback) {
        db.collection('user').find().toArray(function (err, items) {
            if (err) {
                console.log("Error while getting players " + err);
            } else if (items) {
                callback(items);
            }
        });
    };

    module.exports.findPlayerName = function (userName, db, callback) {
        db.collection('user').find({"name": { $regex : new RegExp(userName, "i") }}).toArray(function (err, items) {
            if (err) {
                console.log("Error getting the server from the database. " + err);
            } else {
                callback(items);
            }
        });
    };

    module.exports.updatePlayerStats = function (dbObj, apiObj, totalPp, totalRank, db) {
        return new Promise(function (fullfill, reject) {
            db.collection('user').updateOne(
                { "_id" : dbObj._id },
                {
                    $set: {
                        "pp": apiObj.pp_raw,
                        "accuracy": parseFloat(apiObj.accuracy).toFixed(2),
                        "rank": apiObj.pp_rank,
                        "totalpp": parseFloat(totalPp).toFixed(2),
                        "totalrank": totalRank
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

    module.exports.resetPlayerStats = function (db) {
        return new Promise(function (fullfill, reject) {
            db.collection('user').updateMany(
                { "totalpp" : { $ne: 0 } },
                {
                    $set: {
                        "totalpp": 0,
                        "totalrank": 0
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

    module.exports.removePlayer = function (playerName, channel, db) {
        return new Promise(function (fullfill, reject) {
            playerManagement.findPlayerName(playerName, function (res) {
                if (res.length !== 0) {
                    db.collection('user').deleteOne({"name": { $regex : new RegExp(playerName, "i") }}, function (err, result) {
                        if (err) {
                            reject(err);
                            //channel.sendMessage("The user could not be removed from the database!");
                        } else if (result) {
                            //channel.sendMessage("User '" + playerName + "' successfully removed from the database! ");
                            fullfill();
                        }
                    });
                } else {
                    channel.sendMessage("The user **" + playerName + "** is not in the database!");
                    //console.log("Could not remove user " + playerName + " because it does not exist in the database.");
                }
            });
        });
    };

    module.exports.printPlayerList = function (channel, db) {
        var serverGains = [], i = 0;
        return new Promise(function (fullfill, reject) {
            playerManagement.returnPlayers(db, function (items) {
                items.forEach(function (player, index) {
                    i++;
                    player.serverId.forEach(function (server, index2) {
                        if (items[index].serverId[index2] === channel.id) {
                            playerManagement.playerObjFormation(items[index].name, parseFloat(items[index].totalpp).toFixed(2), items[index].totalrank, function (res) {
                                serverGains.push(res);
                            });
                        }
                    });
                });
                if (i === items.length) {
                    fullfill(serverGains);
                } else if (serverGains.length === 0) {
                    reject();
                }
            });
        });
    };

    module.exports.playerObjFormation = function (name, totalpp, totalrank, callback) {
        var res = {
          name: name,
          value: '**PP**: ' + totalpp + '\n**Total Rank**: ' + totalrank,
          inline: true
        };
        if (res.name !== undefined) {
            callback(res);
        }
    };

    module.exports.getUserObj = function (serverId, db) {
        return new Promise(function (fullfill, reject) {
            db.collection('user').find({"serverId" : { $in : [serverId]  } }).toArray(function (err, items) {
                if (err) {
                    reject(err);
                } else if (items) {
                    fullfill(items);
                }
            });
        });
    };

    module.exports.getUserUpdate = function (mybot, userObj, db, callback) {
        var total = {
            ppGained: 0,
            rank: 0
        }, accuracyChange;
        total.ppGained = parseFloat(userObj.totalpp);
        total.rank = userObj.totalrank;
        calculations.totalRequestsIncrement();
        osu.getUser(userObj.name, 1, function (err, obj) {
            if (err) {
                console.log("Error retrieving user object " + err);
            } else if (obj) {
                /*global checkForChanges*/
                if (calculations.checkForChanges(userObj.pp, obj.pp_raw) !== 0) {
                    /*global getAccuracyChange*/
                    accuracyChange = calculations.getAccuracyChange(userObj.accuracy, obj.accuracy).toFixed(2);
                    total.ppGained += parseFloat(calculations.checkForChanges(userObj.pp, obj.pp_raw).toFixed(2));
                    total.rank += calculations.checkForChanges(obj.pp_rank, userObj.rank);
                    scoreManagement.checkTopScores(userObj, osu, function (score, index, topScores) {
                        if (score !== undefined) {
                            /*global printTopScoresUpdate*/
                            messageManagement.printTopScoresUpdate(mybot, osu, db, userObj, score, index, function () {
                                /*global updateTopScores*/
                                //scoreManagement.updateTopScores(topScores, function (topScoreArr) {
                                scoreManagement.updateTopScores(topScores)
                                    .then(function (topScoreArr) {
                                        /*global pushTopScores*/
                                        scoreManagement.pushTopScores(userObj, topScoreArr, db, function () {
                                            /*global printUpdateMessage*/
                                            messageManagement.printUpdateMessage(mybot, userObj, obj, accuracyChange, total, db, function () {
                                                /*global updatePlayerStats*/
                                                playerManagement.updatePlayerStats(userObj, obj, total.ppGained, total.rank, db)
                                                    .then(function () {
                                                        return callback();
                                                    });
                                            });
                                        });
                                    });
                              //  });
                            });
                        } else {
                            messageManagement.printUpdateMessage(mybot, userObj, obj, accuracyChange, total, db, function () {
                                playerManagement.updatePlayerStats(userObj, obj, total.ppGained, total.rank, db)
                                    .then(function () {
                                        return callback();
                                    });
                            });
                        }
                    });
                }
            }
        });
    };

    module.exports.startTrackingPlayer = function (serverId, playerName, db) {
        var found = false, i = 0;
        return new Promise(function (fullfill, reject) {
            playerManagement.findPlayerName(playerName, db, function (res) {
                if (res.length !== 0) {
                    for (i; i < res[0].trackedBy.length; i++) {
                        if (res[0].trackedBy[i] === serverId) {
                            found = true;
                        }
                    }
                    if (i === res[0].trackedBy.length && found === false) {
                        db.collection('user').update({"name": { $regex : new RegExp(playerName, "i") }}, { $push: { "trackedBy": serverId } }, function (err, result) {
                            if (err) {
                                console.log(err);
                            } else if (result) {
                                //channel.sendMessage("The user **" + playerName + "** was added to the tracking list!");
                                fullfill(res);
                            }
                        });
                    } else {
                        reject();
                        //channel.sendMessage("User already exists in the list.");
                    }
                } else {
                    console.log("Something is wrong, no one was supposed to end up here ._.");
                }
            });
        });
    };

    module.exports.stopTrackingPlayer = function (serverId, playerName, db) {
        var found = false, i = 0;
        return new Promise(function (fullfill, reject) {
            playerManagement.findPlayerName(playerName, db, function (res) {
                if (res.length !== 0) {
                    for (i; i < res[0].trackedBy.length; i++) {
                        if (res[0].trackedBy[i] === serverId) {
                            found = true;
                        }
                    }
                    if (i === res[0].trackedBy.length && found === true) {
                        db.collection('user').update({"name": { $regex : new RegExp(playerName, "i") }}, { $pull: { "trackedBy": serverId}}, function (err, result) {
                            if (err) {
                                console.log(err);
                            } else if (result) {
                                //channel.sendMessage("Player **" + playerName + "** is no longer tracked.");
                                fullfill(res);
                            }
                        });
                    } else {
                        reject();
                    //channel.sendMessage("Player **" + playerName + "** does not exist in your guild!");
                    }
                }
            });
        });
    };

}());
