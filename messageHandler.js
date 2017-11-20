/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var serverManagement = require('./serverManagement.js'),
        playerManagement = require('./playerManagement.js'),
        basicCommands = require('./basicCommands.js'),
        messageManagement = require('./messageManagement.js');

    module.exports.onMessage = function (mybot, db) {
        var avgRequests = {
            reqInterval: undefined,
            timeRunning: 0,
            requestsTotal: 0,
            timesDisconnected: 0
        };
        avgRequests.reqInterval = setInterval(function () {
            avgRequests.timeRunning++;
        }, 1000);
        mybot.on("message", function (message) {
            /*global findServer*/
            serverManagement.findServer(message.channel.id, db, function (serverStarted) {
                var splitMessage = message.content.split(" "),
                    index = message.content.indexOf(" "),  // Gets the first index where a space occurs
                    text = message.content.substr(index + 1),  // Gets the text part
                    user = message.author;
                try {
                    switch (splitMessage[0]) {
                    case "!user": //!user
                        basicCommands.getUser(user, text, message.channel);
                        break;
                    case "!log": //!startbot
                        switch (serverStarted[0].botStarted) {
                        case false:
                            try {
                                serverManagement.updateServer(message.channel.id, true, db, function () {
                                    message.channel.send(user.toString() + " User logging was started!");
                                });
                            } catch (err) {
                                /*global send*/
                                message.channel.send(user.toString() + " The bot was not started due to an error!");
                                console.log(err);
                            }
                            break;
                        case true:
                            try {
                                serverManagement.updateServer(message.channel.id, false, db, function () {
                                    message.channel.send(user.toString() + " User logging was stopped!");
                                });
                            } catch (err) {
                                message.channel.send(user.toString() + " Error, the bot was not stopped due to an error!");
                                console.log(err);
                            }
                            break;
                        default:
                            message.channel.send(user.toString() + " Something went wrong, please message my owner about it");
                        }
                        break;
                    case "!gains": //!gains
                        if (text !== '!gains') {
                            basicCommands.gains(text, db, message.channel);
                        } else {
                            playerManagement.printPlayerList(message.channel, db)
                                .then(function (playersArr) {
                                    if (playersArr.length !== 0) {
                                        playersArr.sort((a, b) => a.name.localeCompare(b.name));
                                        messageManagement.printGainsMessage(playersArr, message.channel);
                                    }
                                }, function () {
                                    message.channel.send(user.toString() + " No users were found in the database.");
                                });
                        }
                        break;
                    case "!adduser": //!adduser
                        playerManagement.findPlayerName(text, db, function (response) {
                            if (response.length !== 0) {
                                serverManagement.findServer(message.channel.id, db, function (server) {
                                    if (server !== 'undefined') {
                                        serverManagement.addServerToPlayer(message.channel.id, text, message.channel, db, function () {
                                            console.log("Player " + text + " was added to another server.");
                                        });
                                    } else {
                                        message.channel.send("The channel was not found in the database, add the channel using !log first.");
                                    }
                                });
                            } else if (response.length === 0) {
                                /*global addPlayer*/
                                playerManagement.addPlayer(text, message.channel, db)
                                    .then(function () {
                                        console.log("Player " + text + " was added.");
                                    }, function (rejected) {
                                        console.log("Error, the user was not added to the database. Error: \n " + rejected);
                                    });
                            }
                        });
                        break;
                    case "!removeuser": //!removeuser
                        try {
                            serverManagement.removeServerFromPlayer(message.channel.id, text, db)
                                .then(function (res) {
                                    message.channel.send(user.toString() + " Player **" + res[0].name + "** is no longer in the database.");
                                }, function () {
                                    message.channel.send(user.toString() + " Player **" + text + "** does not exist in this channel!");
                                })
                                .catch(function (e) {
                                    console.log(e);
                                });
                        } catch (err) {
                            message.channel.send(user.toString() + " Error occured while removing the player from the list.");
                            console.log("Error occured while removing the player from the list." + err);
                        }
                        break;
                    case "!info":
                        basicCommands.getInfo(message.channel, serverStarted[0], avgRequests);
                        break;
                    case "!setMessage":
                        basicCommands.botSetGame(message.content, mybot.user)
                            .then(function (game) {
                                message.channel.send(user.toString() + " Game set to: **" + game + "**");
                            }, function (err) {
                                message.channel.send(user.toString() + " Couldn't set the game.");
                                console.log(err);
                            });
                        break;
                    case "!addtrack":
                        serverManagement.findServer(message.channel.id, db, function (server) {
                            if (server.length !== 0) {
                                playerManagement.startTrackingPlayer(message.channel.id, text, db)
                                    .then(function (res) {
                                        message.channel.send(user.toString() + " The user **" + res[0].name + "** was added to the tracking list!");
                                    }, function () {
                                        message.channel.send(user.toString() + " The user **" + text + "** is already being tracked!");
                                    });
                            } else {
                                message.channel.send(user.toString() + " The channel was not found in the database, add the channel using !log first.");
                            }
                        });
                        break;
                    case "!stoptrack":
                        serverManagement.findServer(message.channel.id, db, function (server) {
                            if (server.length !== 0) {
                                playerManagement.stopTrackingPlayer(message.channel.id, text, db)
                                    .then(function (res) {
                                        message.channel.send(user.toString() + " Player **" + res[0].name + "** is no longer tracked.");
                                    }, function () {
                                        message.channel.send(user.toString() + " Player **" + text + "** doesn't exist in the database!");
                                    }).catch(function (err) {
                                        console.log(err);
                                    });
                            } else {
                                message.channel.send(user.toString() + " The channel was not found in the database, add the channel using !log first.");
                            }
                        });
                        break;
                    case "!track":
                        serverManagement.findServer(message.channel.id, db, function (server) {
                            if (server.length !== 0) {
                                switch (serverStarted[0].trackStarted) {
                                case false:
                                    serverManagement.updateTrackInServer(message.channel.id, true, db)
                                        .then(function () {
                                            message.channel.send(user.toString() + " Started tracking players");
                                        }, function (err) {
                                            console.log(err);
                                        });
                                    break;
                                case true:
                                    serverManagement.updateTrackInServer(message.channel.id, false, db)
                                        .then(function () {
                                            message.channel.send(user.toString() + " Stopped tracking players");
                                        }, function (err) {
                                            console.log(err);
                                        });
                                    break;
                                default:
                                    message.channel.send(user.toString() + " Something went wrong, please message my owner about it");
                                }
                            } else {
                                message.channel.send(user.toString() + " The channel was not found in the database, add the channel first.");
                            }
                        });
                        break;
                    case "!help":
                        message.channel.send(user.toString() + "Commands: \n**!log** - Starts logging recent pp changes (Adds the server if it's not existent in the database)\n**!adduser [user]** - Adds a user to the logged user list of the channel\n**!removeuser [user]** - Removes the user from the logged users list\n**!gains** [user] - If the parameter [user] is defined, returns the gains of the [user], otherwise, returns the gains of all users in the channel\n**!track** - Starts logging the recent plays of all users in the tracking list\n**!addtrack [user]** - Adds a user to the tracking list\n**!stoptrack [user]** - Removes the user from the tracking list\n**!info** - Returns the global\/server information about the bot\n**!help** - Displays this message");
                        break;
                    case "!clean":
                        playerManagement.deleteInactivePlayers(db)
                            .then(function () {
                                message.channel.send("Done");
                            }, function (err) {
                                console.log(err);
                            })
                    default:
                    }
                } catch (err) {
                    console.log(err);
                    if (err !== "TypeError: Cannot read property \'botStarted\' of undefined") {
                        serverManagement.addServer(message, db, function () {
                            console.log(user.toString() + " New server added to the database.");
                        });
                    } else {
                        message.channel.send(user.toString() + " Error! Something went wrong.. Please message my owner with all the mean things you did to me.");
                        console.log(err);
                    }
                }
            });
        });
    };

}());
