/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var serverManagement = require('./serverManagement.js'),
        playerManagement = require('./playerManagement.js'),
        basicCommands = require('./basicCommands.js');
        //interval;

    module.exports.onMessage = function (mybot, db) {
        var avgRequests = {
            reqInterval: undefined,
            timeRunning: 0,
            requestsTotal: 300
        };
        avgRequests.reqInterval = setInterval(function () {
            avgRequests.timeRunning++;
        }, 1000);
        mybot.on("message", function (message) {
            /*global findServer*/
            serverManagement.findServer(message.channel.id, db, function (serverStarted) {
                var splitMessage = message.content.split(" ");
                try {
                    switch (splitMessage[0]) {
                    case "!user": //!user
                        switch (splitMessage[1]) {
                        case 'azerite':
                        case 'Azerite':
                            message.channel.sendMessage("Player Name: **" + "Azerite" + '**\nGlobal Rank: **' + "0" + '** \nPP: **' + "13337" + '**\nAccuracy: **' + Math.round(100 * 100) / 100 + " %**.");
                            break;
                        case '':
                            break;
                        default:
                            /*global getUser*/
                            basicCommands.getUser(splitMessage[1], message.channel);
                        }
                        break;
                    case "!log": //!startbot
                        switch (serverStarted[0].botStarted) {
                        case false:
                            try {
                                /*global updateServer*/
                                serverManagement.updateServer(message.channel.id, true, db, function () {
                                    message.channel.sendMessage("User logging was started!");
                                });
                            } catch (err) {
                                /*global sendMessage*/
                                message.channel.sendMessage("The bot was not started due to an error!");
                                console.log(err);
                            }
                            break;
                        case true:
                            try {
                                serverManagement.updateServer(message.channel.id, false, db, function () {
                                    message.channel.sendMessage("User logging was stopped!");
                                });
                            } catch (err) {
                                message.channel.sendMessage("Error, the bot was not stopped due to an error!");
                                console.log(err);
                            }
                            break;
                        default:
                            message.channel.sendMessage("Something went wrong, please message my owner about it");
                        }
                        break;
                    case "!gains": //!gains
                        if (splitMessage[1] !== undefined) {
                            /*global gains*/
                            basicCommands.gains(splitMessage[1], db, message.channel);
                        } else {
                            /*global printPlayerList*/
                            playerManagement.printPlayerList(message.channel, db)
                                .then(function (arr) {
                                    if (arr.length !== 0) {
                                        message.channel.sendMessage(arr);
                                    }
                                }, function () {
                                    message.channel.sendMessage("No users were found in the database.");
                                });
                        }
                        break;
                    case "!adduser": //!adduser
                        /*global findPlayerName*/
                        playerManagement.findPlayerName(splitMessage[1], db, function (response) {
                            if (response.length !== 0) {
                                serverManagement.findServer(message.channel.id, db, function (server) {
                                    if (server !== 'undefined') {
                                        /*global addServerToPlayer*/
                                        serverManagement.addServerToPlayer(message.channel.id, splitMessage[1].split("_").join(" "), message.channel, db, function () {
                                            console.log("Player " + splitMessage[1] + " was added to another server.");
                                        });
                                    } else {
                                        message.channel.sendMessage("The channel was not found in the database, add the channel using !log first.");
                                    }
                                });
                            } else if (response.length === 0) {
                                /*global addPlayer*/
                                playerManagement.addPlayer(splitMessage[1], message.channel, db)
                                    .then(function () {
                                        console.log("Player " + splitMessage[1] + " was added.");
                                    }, function (rejected) {
                                        console.log("Error, the user was not added to the database. Error: \n " + rejected);
                                    });
                            }
                        });
                        break;
                    case "!removeuser": //!removeuser
                    //check if server is in the database, if yes, remove it from the user object
                        try {
                            serverManagement.removeServerFromPlayer(message.channel.id, splitMessage[1].split("_").join(" "), db)
                                .then(function (res) {
                                    message.channel.sendMessage("Player **" + res[0].name + "** is no longer in the database.");
                                }, function () {
                                    message.channel.sendMessage("Player **" + splitMessage[1] + "** does not exist in this channel!");
                                })
                                .catch(function (e) {
                                    console.log(e);
                                });
                        } catch (err) {
                            message.channel.sendMessage("Error occured while removing the player from the list.");
                            console.log("Error occured while removing the player from the list." + err);
                        }
                        break;
                    case "!players":
                        /*global findPlayers*/
                        findPlayers(function (items) {
                            if (message.channel.id === '185849070990917632') {
                                mybot.sendMessage(items);
                            }
                        });
                        break;
                    case "!info":
                        basicCommands.getInfo(message.channel, serverStarted[0], avgRequests);
                        break;
                    case "!setMessage":
                        /*global botSetGame*/
                        botSetGame("with Seiko", mybot);
                        break;
                    case "!addtrack":
                        serverManagement.findServer(message.channel.id, db, function (server) {
                            if (server.length !== 0) {
                                /*global startTrackingPlayer*/
                                playerManagement.startTrackingPlayer(message.channel.id, splitMessage[1].split("_").join(" "), db)
                                    .then(function (res) {
                                        message.channel.sendMessage("The user **" + res[0].name + "** was added to the tracking list!");
                                    }, function () {
                                        message.channel.sendMessage("The user **" + splitMessage[1] + "** is already being tracked!");
                                    });
                            } else {
                                message.channel.sendMessage("The channel was not found in the database, add the channel using !log first.");
                            }
                        });
                        break;
                    case "!stoptrack":
                        serverManagement.findServer(message.channel.id, db, function (server) {
                            if (server.length !== 0) {
                                /*global stopTrackingPlayer*/
                                playerManagement.stopTrackingPlayer(message.channel.id, splitMessage[1].split("_").join(" "), db)
                                    .then(function (res) {
                                        message.channel.sendMessage("Player **" + res[0].name + "** is no longer tracked.");
                                    }, function () {
                                        message.channel.sendMessage("Player **" + splitMessage[1] + "** doesn't exist in the database!");
                                    }).catch(function (err) {
                                        console.log(err);
                                    });
                            } else {
                                mybot.sendMessage(message.channel.id, "The channel was not found in the database, add the channel using !log first.");
                            }
                        });
                        break;
                    case "!track":
                        serverManagement.findServer(message.channel.id, db, function (server) {
                            if (server.length !== 0) {
                                switch (serverStarted[0].trackStarted) {
                                case false:
                                    /*global updateTrackInServer*/
                                    serverManagement.updateTrackInServer(message.channel.id, true, db)
                                        .then(function () {
                                            message.channel.sendMessage("Started tracking players");
                                        }, function (err) {
                                            console.log(err);
                                        });
                                    break;
                                case true:
                                    serverManagement.updateTrackInServer(message.channel.id, false, db)
                                        .then(function () {
                                            message.channel.sendMessage("Stopped tracking players");
                                        }, function (err) {
                                            console(err);
                                        });
                                    break;
                                default:
                                    message.channel.sendMessage("Something went wrong, please message my owner about it");
                                }
                            } else {
                                message.channel.sendMessage("The channel was not found in the database, add the channel first.");
                            }
                        });
                        break;
                    case "!help":
                        message.channel.sendMessage("Commands: \n**!log** - Starts logging recent pp changes (Adds the server if it's not existent in the database)\n**!adduser [user]** - Adds a user to the logged user list of the channel\n**!removeuser [user]** - Removes the user from the logged users list\n**!gains** [user] - If the parameter [user] is defined, returns the gains of the [user], otherwise, returns the gains of all users in the channel\n**!track** - Starts logging the recent plays of all users in the tracking list\n**!addtrack [user]** - Adds a user to the tracking list\n**!stoptrack [user]** - Removes the user from the tracking list\n**!info** - Returns the global\/server information about the bot\n**!help** - Displays this message");
                        break;

                    default:
                    }
                } catch (err) {
                    console.log(err);
                    if (err !== "TypeError: Cannot read property \'botStarted\' of undefined") {
                        /*global addServer*/
                        serverManagement.addServer(message, db, function () {
                            console.log("New server added to the database.");
                        });
                    } else {
                        message.channel.sendMessage("Error! Something went wrong.. Please message my owner with all the mean things you did to me.");
                        console.log(err);
                    }
                }
            });
        });
    };

}());
