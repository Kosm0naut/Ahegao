/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
"use strict";

(function () {
    var serverManagement = require('./serverManagement.js'),
        playerManagement = require('./playerManagement.js'),
        basicCommands = require('./basicCommands.js'),
        messageManagement = require('./messageManagement.js');
        //interval;

    module.exports.onMessage = function (mybot, db) {
        var avgRequests = {
            reqInterval: undefined,
            timeRunning: 0,
            requestsTotal: 0
        };
        avgRequests.reqInterval = setInterval(function () {
            avgRequests.timeRunning++;
        }, 1000);
        mybot.on("message", function (message) {
            /*global findServer*/
            serverManagement.findServer(message.channel.id, db, function (serverStarted) {
                var splitMessage = message.content.split(" "),
                    index = message.content.indexOf(" "),  // Gets the first index where a space occours
                    text = message.content.substr(index + 1),  // Gets the text part
                    user = message.author,
                    found = false;
                    if(message.content.toLowerCase().indexOf('league') >= 0 ||
                        message.content.toLowerCase().indexOf('leaguė') >= 0 ||
                        message.content.toLowerCase().indexOf('lėague') >= 0 ||
                        message.content.toLowerCase().indexOf('lėaguė') >= 0) {
                    found = true;
                    }
                    if (found) {
                      message.channel.sendMessage(user.toString() + " can just shut up?");
                      found = false;
                    }
                try {
                    switch (splitMessage[0]) {
                    case "!user": //!user
                        /*global getUser*/
                        basicCommands.getUser(user, text, message.channel);
                        break;
                    case "!log": //!startbot
                        switch (serverStarted[0].botStarted) {
                        case false:
                            try {
                                /*global updateServer*/
                                serverManagement.updateServer(message.channel.id, true, db, function () {
                                    message.channel.sendMessage(user.toString() + " User logging was started!");
                                });
                            } catch (err) {
                                /*global sendMessage*/
                                message.channel.sendMessage(user.toString() + " The bot was not started due to an error!");
                                console.log(err);
                            }
                            break;
                        case true:
                            try {
                                serverManagement.updateServer(message.channel.id, false, db, function () {
                                    message.channel.sendMessage(user.toString() + " User logging was stopped!");
                                });
                            } catch (err) {
                                message.channel.sendMessage(user.toString() + " Error, the bot was not stopped due to an error!");
                                console.log(err);
                            }
                            break;
                        default:
                            message.channel.sendMessage(user.toString() + " Something went wrong, please message my owner about it");
                        }
                        break;
                    case "!gains": //!gains
                        if (text !== '!gains') {
                            /*global gains*/
                            basicCommands.gains(text, db, message.channel);
                        } else {
                            /*global printPlayerList*/
                            playerManagement.printPlayerList(message.channel, db)
                                .then(function (playersArr) {
                                    if (playersArr.length !== 0) {
                                        playersArr.sort((a, b) => a.name.localeCompare(b.name));
                                        messageManagement.printGainsMessage(playersArr, message.channel);
                                    }
                                }, function () {
                                    message.channel.sendMessage(user.toString() + " No users were found in the database.");
                                });
                        }
                        break;
                    case "!adduser": //!adduser
                        /*global findPlayerName*/
                        playerManagement.findPlayerName(text, db, function (response) {
                            if (response.length !== 0) {
                                serverManagement.findServer(message.channel.id, db, function (server) {
                                    if (server !== 'undefined') {
                                        /*global addServerToPlayer*/
                                        serverManagement.addServerToPlayer(message.channel.id, text, message.channel, db, function () {
                                            console.log("Player " + text + " was added to another server.");
                                        });
                                    } else {
                                        message.channel.sendMessage("The channel was not found in the database, add the channel using !log first.");
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
                    //check if server is in the database, if yes, remove it from the user object
                        try {
                            serverManagement.removeServerFromPlayer(message.channel.id, text, db)
                                .then(function (res) {
                                    message.channel.sendMessage(user.toString() + " Player **" + res[0].name + "** is no longer in the database.");
                                }, function () {
                                    message.channel.sendMessage(user.toString() + " Player **" + text + "** does not exist in this channel!");
                                })
                                .catch(function (e) {
                                    console.log(e);
                                });
                        } catch (err) {
                            message.channel.sendMessage(user.toString() + " Error occured while removing the player from the list.");
                            console.log("Error occured while removing the player from the list." + err);
                        }
                        break;
                    case "!info":
                        basicCommands.getInfo(message.channel, serverStarted[0], avgRequests);
                        break;
                    case "!bulka":
                        message.channel.sendMessage(" ", {embed: {
                            color: 3447003,
                            author: {
                                name: mybot.user.username,
                                icon_url: mybot.user.avatarURL
                            },
                            title: 'This is an embed',
                            url: 'http://google.com',
                            description: 'This is a test embed to showcase what they look like and what they can do.',
                            fields: [
                                {
                                    name: 'Fields',
                                    value: 'They can have \ndifferent fiel\nds with small headlines.'
                                },
                                {
                                    name: 'Masked links',
                                    value: 'You can put [masked links](http://google.com) inside of rich embeds.'
                                },
                                {
                                    name: 'Markdown',
                                    value: 'You can put all the *usual* **__Markdown__** inside of them.'
                                }
                            ],
                            timestamp: new Date(),
                            footer: {
                                icon_url: mybot.user.avatarURL,
                                text: '© Example'
                            }
                        }}).then(function (res) {
                            console.log(res);
                        }, function (err) {
                            console.log(err);
                        }).catch(function (err) {
                            console.log(err);
                        });
                        break;
                    case "!setMessage":
                        /*global botSetGame*/
                        basicCommands.botSetGame(message.content, mybot.user)
                            .then(function (game) {
                                message.channel.sendMessage(user.toString() + " Game set to: **" + game + "**");
                            }, function (err) {
                                message.channel.sendMessage(user.toString() + " Couldn't set the game.");
                                console.log(err);
                            });
                        break;
                    case "!addtrack":
                        serverManagement.findServer(message.channel.id, db, function (server) {
                            if (server.length !== 0) {
                                /*global startTrackingPlayer*/
                                playerManagement.startTrackingPlayer(message.channel.id, text, db)
                                    .then(function (res) {
                                        message.channel.sendMessage(user.toString() + " The user **" + res[0].name + "** was added to the tracking list!");
                                    }, function () {
                                        message.channel.sendMessage(user.toString() + " The user **" + text + "** is already being tracked!");
                                    });
                            } else {
                                message.channel.sendMessage(user.toString() + " The channel was not found in the database, add the channel using !log first.");
                            }
                        });
                        break;
                    case "!stoptrack":
                        serverManagement.findServer(message.channel.id, db, function (server) {
                            if (server.length !== 0) {
                                /*global stopTrackingPlayer*/
                                playerManagement.stopTrackingPlayer(message.channel.id, text, db)
                                    .then(function (res) {
                                        message.channel.sendMessage(user.toString() + " Player **" + res[0].name + "** is no longer tracked.");
                                    }, function () {
                                        message.channel.sendMessage(user.toString() + " Player **" + text + "** doesn't exist in the database!");
                                    }).catch(function (err) {
                                        console.log(err);
                                    });
                            } else {
                                message.channel.sendMessage(user.toString() + " The channel was not found in the database, add the channel using !log first.");
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
                                            message.channel.sendMessage(user.toString() + " Started tracking players");
                                        }, function (err) {
                                            console.log(err);
                                        });
                                    break;
                                case true:
                                    serverManagement.updateTrackInServer(message.channel.id, false, db)
                                        .then(function () {
                                            message.channel.sendMessage(user.toString() + " Stopped tracking players");
                                        }, function (err) {
                                            console(err);
                                        });
                                    break;
                                default:
                                    message.channel.sendMessage(user.toString() + " Something went wrong, please message my owner about it");
                                }
                            } else {
                                message.channel.sendMessage(user.toString() + " The channel was not found in the database, add the channel first.");
                            }
                        });
                        break;
                    case "!help":
                        message.channel.sendMessage(user.toString() + "Commands: \n**!log** - Starts logging recent pp changes (Adds the server if it's not existent in the database)\n**!adduser [user]** - Adds a user to the logged user list of the channel\n**!removeuser [user]** - Removes the user from the logged users list\n**!gains** [user] - If the parameter [user] is defined, returns the gains of the [user], otherwise, returns the gains of all users in the channel\n**!track** - Starts logging the recent plays of all users in the tracking list\n**!addtrack [user]** - Adds a user to the tracking list\n**!stoptrack [user]** - Removes the user from the tracking list\n**!info** - Returns the global\/server information about the bot\n**!help** - Displays this message");
                        break;

                    default:
                    }
                } catch (err) {
                    console.log(err);
                    if (err !== "TypeError: Cannot read property \'botStarted\' of undefined") {
                        /*global addServer*/
                        serverManagement.addServer(message, db, function () {
                            console.log(user.toString() + " New server added to the database.");
                        });
                    } else {
                        message.channel.sendMessage(user.toString() + " Error! Something went wrong.. Please message my owner with all the mean things you did to me.");
                        console.log(err);
                    }
                }
            });
        });
    };

}());
