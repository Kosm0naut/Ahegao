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
            playerFormation.setUser(id, message, newUser, osu, function () {
                playerFormation.setRecentScores(id, newUser, osu, function () {
                    playerFormation.getTopScores(id, osu)
                        .then(function (entry) {
                            newUser.topScores = entry;
                            db.collection('user').insert(newUser, function (err, result) {
                                if (err) {
                                    reject(err);
                                } else if (result) {
                                    message.send("The user **" + newUser.name + "** was added to the database!");
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
        db.collection('user').find({"name": { $regex : new RegExp("^" + playerManagement.regExpEscape(userName) + "$", "i") }}).toArray(function (err, items) {
            if (err) {
                console.log("Error getting the server from the database. " + err);
            } else {
                callback(items);
            }
        });
    };

    module.exports.regExpEscape = function (literal_string) {
        //return literal_string.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&');
        return literal_string.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g, '\\$&');
    }

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

    module.exports.deleteInactivePlayers = function (db) {
        return new Promise(function (fullfill, reject) {
            db.collection('user').deleteMany(
                { "serverId" : [] 
                },
                function (err, results) {
                    if (err) {
                        reject(err);
                    } else if (results) {
                        fullfill();
                    }
                }
            )
        });
    };

    module.exports.removePlayer = function (playerName, channel, db) {
        return new Promise(function (fullfill, reject) {
            playerManagement.findPlayerName(playerName, function (res) {
                if (res.length !== 0) {
                    db.collection('user').deleteOne({"name": { $regex : new RegExp(playerManagement.regExpEscape(playerName), "i") }}, function (err, result) {
                        if (err) {
                            reject(err);
                        } else if (result) {
                            fullfill();
                        }
                    });
                } else {
                    channel.send("The user **" + playerName + "** is not in the database!");
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
          value: '```PP   :' + totalpp + '\nRank: ' + totalrank + '```',
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
        calculations.totalRequestsIncrement();
        osu.getUser(userObj.name, 1, function (err, obj) {
            if (err) {
                console.log("Error retrieving user object " + err);
            } else if (obj) {
                if (calculations.checkForChanges(userObj.pp, obj.pp_raw) !== 0) {
                    console.log("PP Changes for " + userObj.name);
                    playerManagement.calculatePPChanges(userObj, obj, function (accuracyChange, total){
                        console.log("?");
                        scoreManagement.checkTopScores(userObj, osu, function (score, index, topScores) {
                            if (score !== undefined) {
                                console.log("1.")
                                messageManagement.printTopScoresUpdate(mybot, osu, db, userObj, score, index, function () {
                                    console.log("2.")
                                    scoreManagement.updateTopScores(topScores)
                                        .then(function (topScoreArr) {
                                            console.log("3.");
                                            scoreManagement.pushTopScores(userObj, topScoreArr, db, function () {
                                                console.log("4.");
                                                messageManagement.printUpdateMessage(mybot, userObj, obj, accuracyChange, total, db, function () {
                                                    console.log("5.");
                                                    playerManagement.updatePlayerStats(userObj, obj, total.ppGained, total.rank, db)
                                                        .then(function () {
                                                            callback();
                                                        });
                                                });
                                            });
                                        });
                                });
                            } else {
                                messageManagement.printUpdateMessage(mybot, userObj, obj, accuracyChange, total, db, function () {
                                    playerManagement.updatePlayerStats(userObj, obj, total.ppGained, total.rank, db)
                                        .then(function (response) {
                                            callback();
                                        }, function (err) {
                                        console.log("Error playerManagement.js line 241: " + err);
                                        });
                                });
                            }
                        });
                    });
                }
            }
        });
    };

    module.exports.calculatePPChanges = function (userObj, obj, callback) {
        var total = {
            ppGained: parseFloat(userObj.totalpp),
            rank: userObj.totalrank
        }, accuracyChange;
        //total.ppGained = parseFloat(userObj.totalpp);
        //total.rank = userObj.totalrank;
        
        accuracyChange = calculations.getAccuracyChange(userObj.accuracy, obj.accuracy).toFixed(2);
        total.ppGained += parseFloat(calculations.checkForChanges(userObj.pp, obj.pp_raw).toFixed(2));
        total.rank += calculations.checkForChanges(obj.pp_rank, userObj.rank);

        if(total.ppGained) {
            callback(accuracyChange, total);
        }
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
                        db.collection('user').update({"name": { $regex : new RegExp("^" + playerManagement.regExpEscape(playerName) + "$", "i") }}, { $push: { "trackedBy": serverId } }, function (err, result) {
                            if (err) {
                                console.log(err);
                            } else if (result) {
                                fullfill(res);
                            }
                        });
                    } else {
                        reject();
                    }
                } else {
                    console.log("Error playerManagement.js line 275");
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
                        db.collection('user').update({"name": { $regex : new RegExp(playerManagement.regExpEscape(playerName), "i") }}, { $pull: { "trackedBy": serverId}}, function (err, result) {
                            if (err) {
                                console.log(err);
                            } else if (result) {
                                fullfill(res);
                            }
                        });
                    } else {
                        reject();
                    }
                }
            });
        });
    };

}());
