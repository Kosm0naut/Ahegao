/*jslint devel: true, node: true, plusplus: true, nomen: true, bitwise: true*/
'use strict';

(function () {
    var playerManagement = require('./playerManagement.js'),
        dotenv = require('dotenv').config(),
        scoreManagement = require('./scoreManagement.js'),
        calculations = require('./calculations.js'),
        osuapi = require('osu-api'),
        osu = new osuapi.Api(process.env.osuApi, osuapi.Modes.osu),
        Promise = require('promise');

    module.exports.gains = function (name, db, channel) {
        playerManagement.findPlayerName(name, db, function (items) {
            if (items.length !== 0) {
                channel.sendMessage(" ", {embed: {
                    color: 3447003,
                    author: {
                        name: 'PP gains for ' + items[0].name,
                        url: 'https://osu.ppy.sh/u/' + items[0]._id,
                        icon_url: 'http://s.ppy.sh/a/' + items[0]._id
                    },
                    thumbnail: {
                        url: 'http://s.ppy.sh/a/' + items[0]._id
                    },
                    fields: [
                        {
                            name: items[0].name.toString(),
                            value: '**PP**: ' + items[0].totalpp.toString() + '\n**Total Rank**: ' + items[0].totalrank.toString(),
                            inline: true
                        }
                    ]
                }})
                    .then()
                    .catch(function (e) {
                        console.log(e);
                    });
            } else {
                channel.sendMessage("User was not found in the database");
            }
        });
    };

    module.exports.getUser = function (author, user, channel) {
        calculations.totalRequestsIncrement();
        osu.getUser(user, 1, function (err, obj) {
            if (err) {
                console.log("Error retrieving user object: " + err);
            } else if (obj) {
                channel.sendMessage(author.toString(), {embed: {
                    color: 3447003,
                    author: {
                        name: obj.username,
                        url: 'https://osu.ppy.sh/u/' + obj.user_id,
                        icon_url: 'https://s.ppy.sh/images/flags/' + obj.country.toLowerCase() + '.gif'
                    },
                    thumbnail: {
                        url: 'http://s.ppy.sh/a/' + obj.user_id
                    },
                    fields: [
                        {
                            name: 'Global Rank',
                            value: calculations.getPageInGlobal(obj),
                            inline: true
                        },
                        {
                            name: 'Country Rank',
                            value: '[#' + obj.pp_country_rank + '](https://osu.ppy.sh/p/pp?s=3&o=1&c=' + obj.country + '&find=' + obj.username + '&m=0#jumpto)',
                            inline: true
                        },
                        {
                            name: 'Total PP',
                            value: obj.pp_raw,
                            inline: true
                        },
                        {
                            name: 'Accuracy',
                            value: Math.round(obj.accuracy * 100) / 100 + " %",
                            inline: true
                        },
                        {
                            name: 'Play Count',
                            value: calculations.thousandOperator(obj.playcount),
                            inline: true
                        },
                        {
                            name: 'Hit Count',
                            value: calculations.getHitCount(obj.count300, obj.count100, obj.count50),
                            inline: true
                        }
                    ]
                }});
            }
        });
    };

    module.exports.botSetGame = function (game, bot) {
        var index = game.indexOf(" "),  // Gets the first index where a space occurs
            text = game.substr(index + 1);  // Gets the text part
        return new Promise(function (fullfill, reject) {
            bot.setGame(text)
                .then(fullfill(text))
                .catch(function (e) {
                    reject(e);
                });
        });
    };

    module.exports.botStart = function () {
        console.log("Starting the bot..");
        interval = setInterval(function () {
            playerManagement.findPlayers(function (items) {
                items.forEach(function (entry) {
                    scoreManagement.retrieveMostRecent(entry, function () {
                        playerManagement.getUserUpdate(entry, function () {
                            //console.log("Done updating user " + entry.name);
                        });
                    });
                });
            });
        }, 30000);
    };

    module.exports.getInfo = function (channel, server, avgRequests) {
        /*global toHHMMSS*/
        avgRequests.requestsTotal = calculations.getTotalRequests();
        channel.sendMessage("**Global:** ```\nRequests per minute: " + parseFloat((avgRequests.requestsTotal / avgRequests.timeRunning) * 60).toFixed(2) + "\nTime running: " + calculations.toHHMMSS(avgRequests.timeRunning) + "\nRequests: " + avgRequests.requestsTotal + "```\n**Server:**\n```Is currently logging: " + server.botStarted + "\nIs currently tracking: " + server.trackStarted + "```");
    };

}());
